import { Router } from "express";
import { db, touchRecent, isBookmarked } from "../db.js";

const r = Router();

function decorate(rows) {
  return rows.map((s) => ({ ...s, bookmarked: isBookmarked("sentence", s.id) }));
}

r.get("/", (req, res) => {
  const { lang, topic, offset = 0, limit = 100 } = req.query;
  const args = [];
  let sql = "SELECT s.* FROM sentences s";
  if (topic) {
    sql += " JOIN sentence_topic st ON s.id=st.sentence_id JOIN topics t ON t.id=st.topic_id WHERE t.slug=?";
    args.push(topic);
    if (lang) { sql += " AND s.lang=?"; args.push(lang); }
  } else if (lang) {
    sql += " WHERE s.lang=?";
    args.push(lang);
  }
  sql += " ORDER BY s.id LIMIT ? OFFSET ?";
  const rows = db.prepare(sql).all(...args, Number(limit), Number(offset));
  res.json({ items: decorate(rows), total: rows.length });
});

r.get("/:id", (req, res) => {
  const s = db.prepare("SELECT * FROM sentences WHERE id=?").get(req.params.id);
  if (!s) return res.status(404).json({ error: "not found" });
  const topics = db.prepare(`SELECT t.* FROM topics t JOIN sentence_topic st ON t.id=st.topic_id WHERE st.sentence_id=?`).all(s.id);
  touchRecent("sentence", s.id);
  res.json({ ...s, bookmarked: isBookmarked("sentence", s.id), topics });
});

r.post("/", (req, res) => {
  const { lang, text, phonetic = "", translation = "", topicSlug } = req.body || {};
  if (!lang || !text) return res.status(400).json({ error: "lang 和 text 必填" });
  const info = db.prepare(`INSERT INTO sentences (lang, text, phonetic, translation, source) VALUES (?,?,?,?,'user')`).run(lang, text, phonetic, translation);
  const id = Number(info.lastInsertRowid);
  if (topicSlug) {
    const t = db.prepare("SELECT id FROM topics WHERE slug=?").get(topicSlug);
    if (t) db.prepare("INSERT OR IGNORE INTO sentence_topic VALUES (?,?)").run(id, t.id);
  }
  res.status(201).json({ id });
});

r.delete("/:id", (req, res) => {
  const info = db.prepare("DELETE FROM sentences WHERE id=?").run(req.params.id);
  if (info.changes === 0) return res.status(404).json({ error: "not found" });
  res.json({ ok: true });
});

export const sentencesRouter = r;
