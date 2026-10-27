import { Router } from "express";
import { rulesByLevel, RULE_INDEX } from "../lexicon/rules.js";
import { ruleMastery } from "../db.js";

const r = Router();

function shape(rule) {
  return {
    id: rule.id,
    level: rule.level,
    title: rule.title,
    pattern: rule.pattern,
    summary: rule.summary,
    examples: rule.examples,
    exceptions: rule.exceptions,
    mastery: ruleMastery(rule.id)
  };
}

r.get("/", (req, res) => {
  res.json({ items: rulesByLevel(req.query.level).map(shape) });
});

r.get("/:id", (req, res) => {
  const rule = RULE_INDEX.get(req.params.id);
  if (!rule) return res.status(404).json({ error: "规则不存在" });
  res.json(shape(rule));
});

export const rulesRouter = r;
