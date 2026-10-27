import { DatabaseSync } from "node:sqlite";
import { mkdirSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, "..", "data");
mkdirSync(DATA_DIR, { recursive: true });

/* 数据库文件名：新库用 say-hi.db；
   但如果你之前已经跑过旧版（hearsay.db），自动沿用旧文件，避免数据「消失」。
   迁移方式：把 data/hearsay.db 改名为 data/say-hi.db 即可切换。 */
const DB_NAME = process.env.DB_NAME || "say-hi.db";
const DB_OLD = "hearsay.db";
const newPath = path.join(DATA_DIR, DB_NAME);
const oldPath = path.join(DATA_DIR, DB_OLD);
const dbPath = (!existsSync(newPath) && existsSync(oldPath)) ? oldPath : newPath;
if (dbPath === oldPath) {
  console.log("[say-hi] 检测到旧数据库 " + DB_OLD + "，继续沿用（改名即可切换为 " + DB_NAME + "）");
}

export const db = new DatabaseSync(dbPath);

db.exec(`
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;
PRAGMA busy_timeout = 5000;

CREATE TABLE IF NOT EXISTS topics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  lang TEXT NOT NULL CHECK (lang IN ('en','yue')),
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  title_native TEXT NOT NULL,
  description TEXT DEFAULT '',
  icon TEXT DEFAULT '',
  sort_order INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS words (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  lang TEXT NOT NULL CHECK (lang IN ('en','yue')),
  text TEXT NOT NULL,
  phonetic TEXT DEFAULT '',
  meaning TEXT NOT NULL DEFAULT '',
  level INTEGER DEFAULT 1,
  source TEXT DEFAULT 'seed',
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_words_lang ON words(lang);

CREATE TABLE IF NOT EXISTS word_topic (
  word_id INTEGER NOT NULL REFERENCES words(id) ON DELETE CASCADE,
  topic_id INTEGER NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
  PRIMARY KEY (word_id, topic_id)
);

CREATE TABLE IF NOT EXISTS sentences (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  lang TEXT NOT NULL CHECK (lang IN ('en','yue')),
  text TEXT NOT NULL,
  phonetic TEXT DEFAULT '',
  translation TEXT NOT NULL DEFAULT '',
  source TEXT DEFAULT 'seed',
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_sentences_lang ON sentences(lang);

CREATE TABLE IF NOT EXISTS sentence_topic (
  sentence_id INTEGER NOT NULL REFERENCES sentences(id) ON DELETE CASCADE,
  topic_id INTEGER NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
  PRIMARY KEY (sentence_id, topic_id)
);

CREATE TABLE IF NOT EXISTS bookmarks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  kind TEXT NOT NULL CHECK (kind IN ('word','sentence')),
  ref_id INTEGER NOT NULL,
  note TEXT DEFAULT '',
  created_at TEXT DEFAULT (datetime('now')),
  UNIQUE (kind, ref_id)
);

CREATE TABLE IF NOT EXISTS recents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  kind TEXT NOT NULL CHECK (kind IN ('word','sentence')),
  ref_id INTEGER NOT NULL,
  viewed_at TEXT DEFAULT (datetime('now')),
  UNIQUE (kind, ref_id)
);

/* ============ v2 新增：规则掌握度 ============ */
CREATE TABLE IF NOT EXISTS rule_stats (
  rule_id TEXT PRIMARY KEY,
  seen INTEGER NOT NULL DEFAULT 0,
  right INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT DEFAULT (datetime('now'))
);

/* ============ v2 新增：答题明细（今日统计与错题本） ============ */
CREATE TABLE IF NOT EXISTS attempts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  day TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  rule_id TEXT,
  word TEXT,
  kind TEXT NOT NULL,
  picked TEXT,
  expected TEXT,
  correct INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_attempts_day ON attempts(day);
CREATE INDEX IF NOT EXISTS idx_attempts_correct ON attempts(correct, day);

/* ============ v2 新增：连续天数与配置 ============ */
CREATE TABLE IF NOT EXISTS profile (
  key TEXT PRIMARY KEY,
  value TEXT
);

/* ============ v2 新增：间隔重复 ============ */
CREATE TABLE IF NOT EXISTS srs (
  word TEXT PRIMARY KEY,
  box INTEGER NOT NULL DEFAULT 0,
  seen INTEGER NOT NULL DEFAULT 0,
  last_result TEXT,
  due_at TEXT,
  updated_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_srs_due ON srs(due_at);
`);

export function touchRecent(kind, refId) {
  db.prepare(`INSERT INTO recents (kind, ref_id, viewed_at) VALUES (?, ?, datetime('now'))
    ON CONFLICT(kind, ref_id) DO UPDATE SET viewed_at = datetime('now')`).run(kind, refId);
}

export function isBookmarked(kind, refId) {
  return !!db.prepare("SELECT 1 FROM bookmarks WHERE kind=? AND ref_id=?").get(kind, refId);
}

/* ---------- 日期与小工具（统一用本地日，避免跨时区错位） ---------- */
const pad = (n) => String(n).padStart(2, "0");
const ymd = (d) => d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());

export function today() {
  return ymd(new Date());
}

export function dayOffset(off) {
  return ymd(new Date(Date.now() - off * 86400000));
}

export function getProfile(key, fallback) {
  const row = db.prepare("SELECT value FROM profile WHERE key=?").get(key);
  return row ? row.value : fallback;
}

export function setProfile(key, value) {
  db.prepare(`INSERT INTO profile (key, value) VALUES (?, ?)
    ON CONFLICT(key) DO UPDATE SET value=excluded.value`).run(key, String(value));
}

/* ---------- 规则掌握度 ---------- */
export function ruleMastery(ruleId) {
  const r = db.prepare("SELECT seen, right FROM rule_stats WHERE rule_id=?").get(ruleId);
  const seen = r ? r.seen : 0;
  const right = r ? r.right : 0;
  const pct = seen ? right / seen : null;
  const band = pct == null ? "none" : pct >= 0.8 ? "strong" : pct >= 0.6 ? "fair" : "weak";
  return { seen, right, pct, band };
}

export function recordRule(ruleId, correct) {
  if (!ruleId) return;
  db.prepare(`INSERT INTO rule_stats (rule_id, seen, right, updated_at) VALUES (?, 1, ?, datetime('now'))
    ON CONFLICT(rule_id) DO UPDATE SET seen = seen + 1, right = right + ?, updated_at = datetime('now')`)
    .run(ruleId, correct ? 1 : 0, correct ? 1 : 0);
}

/* ---------- 答题记录 ---------- */
export function recordAttempt(a) {
  db.prepare(`INSERT INTO attempts (day, rule_id, word, kind, picked, expected, correct)
    VALUES (?, ?, ?, ?, ?, ?, ?)`)
    .run(today(), a.ruleId || null, a.word || null, a.kind,
         a.picked == null ? null : String(a.picked),
         a.expected == null ? null : String(a.expected),
         a.correct ? 1 : 0);
}

export function todayStats() {
  const r = db.prepare("SELECT COUNT(*) c, COALESCE(SUM(correct),0) ok FROM attempts WHERE day=?").get(today());
  return { answered: r.c, right: r.ok };
}

export function totalStats() {
  const r = db.prepare("SELECT COUNT(*) c, COALESCE(SUM(correct),0) ok FROM attempts").get();
  return { answered: r.c, right: r.ok, pct: r.c ? r.ok / r.c : null };
}

export function touchStreak() {
  const d = today();
  const last = getProfile("streak_last", "");
  let days = Number(getProfile("streak_days", "0")) || 0;
  if (last !== d) {
    days = last === dayOffset(1) ? days + 1 : 1;
    setProfile("streak_days", days);
    setProfile("streak_last", d);
  } else if (days === 0) {
    days = 1;
    setProfile("streak_days", 1);
  }
  return { days, lastDay: d };
}

export const DAILY_TARGET = Number(process.env.DAILY_TARGET || 10);

/* ---------- 间隔重复 ---------- */
const BOX_DAYS = [0, 1, 3, 7, 16, 40];

export function srsCounts(totalWords) {
  const due = db.prepare("SELECT COUNT(*) c FROM srs WHERE due_at IS NOT NULL AND due_at <= datetime('now')").get().c;
  const learned = db.prepare("SELECT COUNT(*) c FROM srs WHERE box >= 3").get().c;
  const seen = db.prepare("SELECT COUNT(*) c FROM srs").get().c;
  return { due, new: Math.max(0, (totalWords || 0) - seen), learned, total: totalWords || 0 };
}

export function srsGrade(word, result) {
  const cur = db.prepare("SELECT box, seen FROM srs WHERE word=?").get(word);
  let box = cur ? cur.box : 0;
  const seen = cur ? cur.seen : 0;
  if (result === "known") box = Math.min(box + 1, BOX_DAYS.length - 1);
  else if (result === "fuzzy") box = Math.max(1, box);
  else box = 1;
  const days = BOX_DAYS[box] || 1;
  const due = new Date(Date.now() + days * 86400000).toISOString();
  db.prepare(`INSERT INTO srs (word, box, seen, last_result, due_at, updated_at)
    VALUES (?, ?, ?, ?, ?, datetime('now'))
    ON CONFLICT(word) DO UPDATE SET box=excluded.box, seen=excluded.seen,
      last_result=excluded.last_result, due_at=excluded.due_at, updated_at=datetime('now')`)
    .run(word, box, seen + 1, result, due);
  return { box, dueAt: due };
}
