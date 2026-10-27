import { Router } from "express";
import { db } from "../db.js";

const r = Router();

// 列表
r.get("/", (req, res) => {
  const lang = req.query.lang;
  const rows = lang
    ? db.prepare("SELECT * FROM topics WHERE lang=? ORDER BY sort_order, id").all(lang)
    : db.prepare("SELECT * FROM topics ORDER BY lang, sort_order, id").all();
  res.json(rows);
});

// 详情 + 词句计数
r.get("/:slug", (req, res) => {
  const t = db.prepare("SELECT * FROM topics WHERE slug=?").get(req.params.slug);
  if (!t) return res.status(404).json({ error: "topic not found" });
  const wc = db.prepare(`SELECT COUNT(*) c FROM word_topic WHERE topic_id=?`).get(t.id).c;
  const sc = db.prepare(`SELECT COUNT(*) c FROM sentence_topic WHERE topic_id=?`).get(t.id).c;
  res.json({ ...t, word_count: wc, sentence_count: sc });
});

export const topicsRouter = r;
