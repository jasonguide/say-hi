import { Router } from "express";
import { db } from "../db.js";

const r = Router();

r.get("/", (req, res) => {
  const words = db.prepare(`SELECT w.*, b.created_at AS saved_at, b.note FROM words w JOIN bookmarks b ON b.ref_id=w.id AND b.kind='word' ORDER BY b.created_at DESC LIMIT 200`).all();
  const sentences = db.prepare(`SELECT s.*, b.created_at AS saved_at, b.note FROM sentences s JOIN bookmarks b ON b.ref_id=s.id AND b.kind='sentence' ORDER BY b.created_at DESC LIMIT 200`).all();
  res.json({ words, sentences });
});

r.put("/:kind/:id", (req, res) => {
  const { kind, id } = req.params;
  const { note = "" } = req.body || {};
  if (!["word", "sentence"].includes(kind)) return res.status(400).json({ error: "kind 无效" });
  db.prepare(`INSERT OR IGNORE INTO bookmarks (kind, ref_id, note) VALUES (?,?,?)`).run(kind, Number(id), note);
  res.json({ ok: true });
});

r.delete("/:kind/:id", (req, res) => {
  db.prepare("DELETE FROM bookmarks WHERE kind=? AND ref_id=?").run(req.params.kind, Number(req.params.id));
  res.json({ ok: true });
});

export const bookmarksRouter = r;
