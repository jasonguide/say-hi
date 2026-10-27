import { Router } from "express";
import { db, touchRecent, isBookmarked } from "../db.js";

const r = Router();

function decorate(rows) {
  return rows.map((w) => ({ ...w, bookmarked: isBookmarked("word", w.id) }));
}

// 列表：?lang=&level=&q=&topic=&limit=&offset=
r.get("/", (req, res) => {
  const { lang, level, topic, offset = 0, limit = 100 } = req.query;
  const conds = [];
  const args = [];
  if (lang) { conds.push("w.lang=?"); args.push(lang); }
  if (level) { conds.push("w.level=?"); args.push(Number(level)); }
  if (topic) {
    args.push(topic);
    const rows = db.prepare(`SELECT w.* FROM words w JOIN word_topic wt ON w.id=wt.word_id JOIN topics t ON t.id=wt.topic_id WHERE t.slug=? ${conds.length ? "AND " + conds.join(" AND ") : ""} ORDER BY w.level, w.id LIMIT ? OFFSET ?`).all(...args, Number(limit), Number(offset));
    return res.json({ items: decorate(rows), total: rows.length });
  }
  if (req.query.q) {
    const q = `%${req.query.q}%`;
    const rows = db.prepare(`SELECT w.* FROM words w WHERE w.text LIKE ? OR w.meaning LIKE ? ORDER BY w.level, w.id LIMIT ? OFFSET ?`).all(q, q, Number(limit), Number(offset));
    return res.json({ items: decorate(rows), total: rows.length });
  }
  const rows = db.prepare(`SELECT w.* FROM words w ${conds.length ? "WHERE " + conds.join(" AND ") : ""} ORDER BY w.level, w.id LIMIT ? OFFSET ?`).all(...args, Number(limit), Number(offset));
  const total = db.prepare(`SELECT COUNT(*) c FROM words w ${conds.length ? "WHERE " + conds.join(" AND ") : ""}`).all(...args)[0].c;
  res.json({ items: decorate(rows), total });
});

// 单个
r.get("/:id", (req, res) => {
  const w = db.prepare("SELECT * FROM words WHERE id=?").get(req.params.id);
  if (!w) return res.status(404).json({ error: "not found" });
  const topics = db.prepare(`SELECT t.* FROM topics t JOIN word_topic wt ON t.id=wt.topic_id WHERE wt.word_id=?`).all(w.id);
  touchRecent("word", w.id);
  res.json({ ...w, bookmarked: isBookmarked("word", w.id), topics });
});

// 新增
r.post("/", (req, res) => {
  const { lang, text, phonetic = "", meaning = "", level = 1, topicSlug } = req.body || {};
  if (!lang || !text) return res.status(400).json({ error: "lang 和 text 必填" });
  const info = db.prepare(`INSERT INTO words (lang, text, phonetic, meaning, level, source) VALUES (?,?,?,?,?,'user')`).run(lang, text, phonetic, meaning, level);
  const id = Number(info.lastInsertRowid);
  if (topicSlug) {
    const t = db.prepare("SELECT id FROM topics WHERE slug=?").get(topicSlug);
    if (t) db.prepare("INSERT OR IGNORE INTO word_topic VALUES (?,?)").run(id, t.id);
  }
  res.status(201).json({ id });
});

// 删除
r.delete("/:id", (req, res) => {
  const info = db.prepare("DELETE FROM words WHERE id=?").run(req.params.id);
  if (info.changes === 0) return res.status(404).json({ error: "not found" });
  res.json({ ok: true });
});

export const wordsRouter = r;
