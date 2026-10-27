import { Router } from "express";
import { db, isBookmarked } from "../db.js";

const r = Router();

// 全库搜索：词 + 句混合结果
r.get("/", (req, res) => {
  const { q, lang } = req.query;
  if (!q) return res.json({ words: [], sentences: [] });
  const like = `%${q}%`;

  const wArgs = [like, like];
  let wSql = `SELECT w.* FROM words w WHERE w.text LIKE ? OR w.meaning LIKE ?`;
  const sArgs = [like, like];
  let sSql = `SELECT s.* FROM sentences s WHERE s.text LIKE ? OR s.translation LIKE ?`;

  if (lang) {
    wSql += " AND w.lang=?";
    wArgs.push(lang);
    sSql += " AND s.lang=?";
    sArgs.push(lang);
  }
  wSql += " ORDER BY w.level, w.id LIMIT 30";
  sSql += " ORDER BY s.id LIMIT 30";

  const words = db.prepare(wSql).all(...wArgs).map((w) => ({ ...w, bookmarked: isBookmarked("word", w.id) }));
  const sentences = db.prepare(sSql).all(...sArgs).map((s) => ({ ...s, bookmarked: isBookmarked("sentence", s.id) }));
  res.json({ words, sentences });
});

export const searchRouter = r;
