import crypto from "node:crypto";
import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PASSWORD = process.env.ACCESS_PASSWORD || "";
const COOKIE = "sayhi_auth";
const HASH = PASSWORD ? crypto.createHash("sha256").update(PASSWORD).digest("hex") : "";

export function authMiddleware(req, res, next) {
  // 静态资源与登录接口放行
  if (
    req.path.startsWith("/api/auth") ||
    req.path.startsWith("/login") ||
    req.path.includes(".") // 静态文件
  ) {
    return next();
  }
  if (!PASSWORD) return next(); // 未设密码则不启用
  if (req.cookies?.[COOKIE] === HASH) return next();
  // 简单读取 cookie（避免引入 cookie-parser）
  const raw = req.headers.cookie || "";
  if (raw.split("; ").some((c) => c === `${COOKIE}=${HASH}`)) return next();
  if (req.path.startsWith("/api/")) {
    return res.status(401).json({ error: "unauthorized" });
  }
  return res.redirect("/login.html");
}

export function loginRoutes(app) {
  app.use(express.urlencoded({ extended: false }));

  app.post("/api/auth/login", (req, res) => {
    if (!PASSWORD) return res.json({ ok: true });
    if (req.body?.password === PASSWORD) {
      res.setHeader("Set-Cookie", `${COOKIE}=${HASH}; Path=/; HttpOnly; Max-Age=2592000; SameSite=Lax`);
      return res.json({ ok: true });
    }
    return res.status(403).json({ ok: false, error: "密码错误" });
  });

  app.post("/api/auth/logout", (req, res) => {
    res.setHeader("Set-Cookie", `${COOKIE}=; Path=/; Max-Age=0`);
    res.json({ ok: true });
  });
}
