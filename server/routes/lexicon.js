import { Router } from "express";
import { lookup, search } from "../lexicon/data.js";
import { RULE_INDEX } from "../lexicon/rules.js";

const r = Router();

function shape(w) {
  // 用到的规则：去重，按首次出现顺序；basic 与不发音块不算「学到的规则」
  const seen = new Map();
  for (const b of w.blocks) {
    if (!b.ruleId || b.ruleId === "basic" || b.kind === "s") continue;
    if (!seen.has(b.ruleId)) seen.set(b.ruleId, []);
    const arr = seen.get(b.ruleId);
    if (!arr.includes(b.letters)) arr.push(b.letters);
  }
  if (w.stress >= 0 && w.syllables.length > 1) {
    seen.set("stress", [w.syllables[w.stress]]);
  }
  const rules = [...seen.entries()].map(([id, letters]) => ({
    id, title: (RULE_INDEX.get(id) || { title: id }).title, letters
  }));
  return {
    found: true,
    word: w.word,
    syllables: w.syllables,
    stress: w.stress,
    ipaGb: w.ipaGb,
    ipaUs: w.ipaUs,
    meaning: w.meaning,
    topic: w.topic,
    blocks: w.blocks,
    rules
  };
}

// 解码单个词
r.get("/:word", (req, res) => {
  const raw = String(req.params.word || "").trim().toLowerCase();
  const w = lookup(raw);
  if (!w) {
    if (!/^[a-z]{1,32}$/.test(raw)) {
      return res.status(400).json({ error: "只支持 1–32 个字母的英文单词" });
    }
    return res.json({ found: false, word: raw });
  }
  res.json(shape(w));
});

export const lexiconRouter = r;

// 搜索单独挂一条，避免与 /:word 冲突
export const lexiconSearchRouter = Router();
lexiconSearchRouter.get("/", (req, res) => {
  const items = search(req.query.q, req.query.limit).map((w) => ({
    word: w.word,
    ipaGb: w.ipaGb,
    meaning: w.meaning,
    syllableCount: w.syllables.length
  }));
  res.json({ items });
});
