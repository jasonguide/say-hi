import { Router } from "express";
import { db } from "../db.js";

const r = Router();

r.get("/", (req, res) => {
  const words = db.prepare(`SELECT w.*, r.viewed_at FROM words w JOIN recents r ON r.ref_id=w.id AND r.kind='word' ORDER BY r.viewed_at DESC LIMIT 30`).all();
  const sentences = db.prepare(`SELECT s.*, r.viewed_at FROM sentences s JOIN recents r ON r.ref_id=s.id AND r.kind='sentence' ORDER BY r.viewed_at DESC LIMIT 30`).all();
  res.json({ words, sentences });
});

export const recentsRouter = r;
