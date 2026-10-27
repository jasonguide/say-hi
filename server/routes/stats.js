import { Router } from "express";
import {
  db, recordRule, recordAttempt, todayStats, totalStats, touchStreak,
  ruleMastery, getProfile, DAILY_TARGET, srsCounts, dayOffset
} from "../db.js";
import { RULES, RULE_INDEX } from "../lexicon/rules.js";
import { LEXICON } from "../lexicon/data.js";

const r = Router();

function weakRules(limit) {
  return RULES.map((rule) => ({ rule, m: ruleMastery(rule.id) }))
    .filter((x) => x.m.seen >= 3)
    .sort((a, b) => a.m.pct - b.m.pct)
    .slice(0, limit)
    .map((x) => ({ id: x.rule.id, title: x.rule.title, pct: x.m.pct, band: x.m.band }));
}

function stageProgress() {
  const lv3 = RULES.filter((x) => x.level === 3)
    .map((x) => ruleMastery(x.id).pct)
    .filter((p) => p != null);
  const phonics = lv3.length ? lv3.reduce((a, b) => a + b, 0) / lv3.length : 0;
  const c = srsCounts(LEXICON.length);
  return { phonics, scenario: c.total ? c.learned / c.total : 0 };
}

r.get("/summary", (req, res) => {
  const t = todayStats();
  const tot = totalStats();
  const streak = touchStreak();
  res.json({
    today: { answered: t.answered, right: t.right, target: DAILY_TARGET },
    streak,
    totals: tot,
    weakRules: weakRules(3),
    stages: stageProgress(),
    counts: { lexicon: LEXICON.length, rules: RULES.length }
  });
});

r.get("/mini", (req, res) => {
  const t = todayStats();
  res.json({
    answered: t.answered,
    right: t.right,
    target: DAILY_TARGET,
    streakDays: Number(getProfile("streak_days", "0")) || 0
  });
});

r.post("/attempt", (req, res) => {
  const b = req.body || {};
  if (typeof b.correct !== "boolean") return res.status(400).json({ error: "correct 必须为布尔值" });
  const kind = ["ipa", "stress", "meaning", "recall"].includes(b.kind) ? b.kind : "ipa";
  recordAttempt({
    ruleId: b.ruleId || null,
    word: b.word || null,
    kind,
    picked: b.picked,
    expected: b.expected,
    correct: b.correct
  });
  if (b.ruleId && kind !== "recall") recordRule(b.ruleId, b.correct);
  const streak = touchStreak();
  const t = todayStats();
  res.json({
    ok: true,
    today: { answered: t.answered, right: t.right, target: DAILY_TARGET },
    streakDays: streak.days
  });
});

r.get("/mistakes", (req, res) => {
  const limit = Math.max(1, Math.min(100, Number(req.query.limit) || 30));
  const rows = db.prepare(`SELECT word, kind, rule_id, picked, expected, created_at
    FROM attempts WHERE correct = 0 ORDER BY id DESC LIMIT ?`).all(limit);
  const seen = new Set();
  const items = [];
  for (const row of rows) {
    const key = row.word + "|" + row.kind;
    if (seen.has(key)) continue;
    seen.add(key);
    items.push({
      word: row.word,
      kind: row.kind,
      ruleId: row.rule_id,
      ruleTitle: row.rule_id ? (RULE_INDEX.get(row.rule_id) || { title: row.rule_id }).title : null,
      picked: row.picked,
      expected: row.expected,
      at: row.created_at
    });
  }
  res.json({ items });
});

r.get("/attribution", (req, res) => {
  // 用 day 字段（本地日）而不是 created_at（UTC）筛选，否则跨零点会偏一天
  const rows = db.prepare(`SELECT kind, COUNT(*) c FROM attempts
    WHERE correct = 0 AND day >= ? GROUP BY kind`).all(dayOffset(30));
  const buckets = { phonics: 0, meaning: 0, spelling: 0 };
  for (const row of rows) {
    if (row.kind === "ipa" || row.kind === "stress") buckets.phonics += row.c;
    else if (row.kind === "meaning" || row.kind === "recall") buckets.meaning += row.c;
    else buckets.spelling += row.c;
  }
  res.json({
    items: [
      { label: "拼读规则（读音猜错）", count: buckets.phonics, bucket: "phonics" },
      { label: "词义记不住", count: buckets.meaning, bucket: "meaning" },
      { label: "拼写记不住", count: buckets.spelling, bucket: "spelling" }
    ],
    buckets
  });
});

export const statsRouter = r;
