import { Router } from "express";
import { db } from "../db.js";

const r = Router();

// JSON 导入（词/句均可）
r.post("/", (req, res) => {
  const { words = [], sentences = [] } = req.body || {};
  let w = 0, s = 0;
  for (const item of words) {
    if (!item.lang || !item.text) continue;
    db.prepare(`INSERT INTO words (lang, text, phonetic, meaning, level, source) VALUES (?,?,?,?,?,'user')`).run(item.lang, item.text, item.phonetic || "", item.meaning || "", item.level || 1);
    w++;
  }
  for (const item of sentences) {
    if (!item.lang || !item.text) continue;
    db.prepare(`INSERT INTO sentences (lang, text, phonetic, translation, source) VALUES (?,?,?,?,'user')`).run(item.lang, item.text, item.phonetic || "", item.translation || "");
    s++;
  }
  res.json({ importedWords: w, importedSentences: s });
});

// JSON 导出
r.get("/export", (req, res) => {
  const words = db.prepare("SELECT lang, text, phonetic, meaning, level FROM words ORDER BY lang, level, id").all();
  const sentences = db.prepare("SELECT lang, text, phonetic, translation FROM sentences ORDER BY lang, id").all();
  res.setHeader("Content-Disposition", "attachment; filename=say-hi-backup.json");
  res.json({ exportedAt: new Date().toISOString(), words, sentences });
});

export const importRouter = r;
