import { Router } from "express";
import { db, srsCounts, srsGrade, touchStreak, getProfile } from "../db.js";
import { LEXICON, WORD_INDEX } from "../lexicon/data.js";

const r = Router();

function decorate(w, row) {
  return {
    word: w.word,
    ipaGb: w.ipaGb,
    meaning: w.meaning,
    topicSlug: w.topic,
    topicTitle: w.topic,
    seen: row ? row.seen : 0,
    box: row ? row.box : 0,
    lastResult: row ? row.last_result : null
  };
}

// 今日队列：到期优先，不足补新词
r.get("/due", (req, res) => {
  const limit = Math.max(1, Math.min(100, Number(req.query.limit) || 20));
  const dueRows = db.prepare(`SELECT word, box, seen, last_result FROM srs
    WHERE due_at IS NOT NULL AND due_at <= datetime('now')
    ORDER BY due_at LIMIT ?`).all(limit);

  const items = [];
  const taken = new Set();
  for (const row of dueRows) {
    const w = WORD_INDEX.get(row.word);
    if (!w || taken.has(row.word)) continue;
    taken.add(row.word);
    items.push(decorate(w, row));
  }

  if (items.length < limit) {
    for (const row of db.prepare("SELECT word FROM srs").all()) taken.add(row.word);
    for (const w of LEXICON) {
      if (items.length >= limit) break;
      if (taken.has(w.word)) continue;
      taken.add(w.word);
      items.push(decorate(w, null));
    }
  }
  res.json({ items, counts: srsCounts(LEXICON.length) });
});

r.post("/grade", (req, res) => {
  const b = req.body || {};
  const word = String(b.word || "").trim().toLowerCase();
  const result = b.result;
  if (!WORD_INDEX.has(word)) return res.status(404).json({ error: "词条未收录" });
  if (!["forgot", "fuzzy", "known"].includes(result)) {
    return res.status(400).json({ error: "result 取值须为 forgot / fuzzy / known" });
  }
  const g = srsGrade(word, result);
  touchStreak();
  res.json({ ok: true, box: g.box, dueAt: g.dueAt, counts: srsCounts(LEXICON.length) });
});

r.get("/stats", (req, res) => {
  res.json({
    counts: srsCounts(LEXICON.length),
    streakDays: Number(getProfile("streak_days", "0")) || 0
  });
});

export const srsRouter = r;
