import { Router } from "express";
import { db } from "../db.js";

const r = Router();

r.get("/stats", (req, res) => {
  const enWords = db.prepare("SELECT COUNT(*) c FROM words WHERE lang='en'").get().c;
  const yueWords = db.prepare("SELECT COUNT(*) c FROM words WHERE lang='yue'").get().c;
  const enSent = db.prepare("SELECT COUNT(*) c FROM sentences WHERE lang='en'").get().c;
  const yueSent = db.prepare("SELECT COUNT(*) c FROM sentences WHERE lang='yue'").get().c;
  res.json({ enWords, yueWords, enSentences: enSent, yueSentences: yueSent });
});

export const metaRouter = r;
