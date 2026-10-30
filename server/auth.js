import crypto from "node:crypto";
import express from "express";

const PASSWORD = process.env.ACCESS_PASSWORD || "";
const COOKIE = "sayhi_auth";
const HASH = PASSWORD ? crypto.createHash("sha256").update(PASSWORD).digest("hex") : "";

/* 不需要登录就能访问的路径（否则用户永远进不了登录页，会死锁）：
   - 登录页本身与它的静态依赖
   - 登录/登出接口
   - PWA 清单、Service Worker、图标（浏览器在未登录时也会请求）
   - 发音接口：登录页的"试听"以及浏览器预取音频时不该被拦（可选放开） */
const PUBLIC_PATHS = new Set([
  "/login.html", "/login", "/manifest.json", "/sw.js", "/icon.svg", "/favicon.ico"
]);
const PUBLIC_PREFIXES = ["/api/auth/", "/css/", "/js/"];

function isPublic(req) {
  const p = req.path;
  if (PUBLIC_PATHS.has(p)) return true;
  return PUBLIC_PREFIXES.some((pre) => p.startsWith(pre));
}

function readCookie(req, name) {
  const raw = req.headers.cookie || "";
  for (const part of raw.split(";")) {
    const [k, ...v] = part.trim().split("=");
    if (k === name) return v.join("=");
  }
  return "";
}

/**
 * 访问密码中间件。
 * 必须在 express.static 之前注册，否则静态文件会绕过鉴权直接返回首页。
 */
export function authMiddleware(req, res, next) {
  if (!PASSWORD) return next();              // 未设置密码：不启用
  if (isPublic(req)) return next();          // 登录页与基础资源放行
  if (readCookie(req, COOKIE) === HASH) return next();   // 已登录

  // 未登录：API 返回 401，页面跳登录页
  if (req.path.startsWith("/api/")) {
    return res.status(401).json({ error: "unauthorized" });
  }
  return res.redirect("/login.html");
}

export function loginRoutes(app) {
  app.use(express.urlencoded({ extended: false }));

  app.post("/api/auth/login", (req, res) => {
    if (!PASSWORD) return res.json({ ok: true });
    const given = String(req.body?.password ?? "");
    const a = Buffer.from(given);
    const b = Buffer.from(PASSWORD);
    const ok = a.length === b.length && crypto.timingSafeEqual(a, b);
    if (!ok) return res.status(403).json({ ok: false, error: "密码错误" });
    res.setHeader("Set-Cookie", `${COOKIE}=${HASH}; Path=/; HttpOnly; Max-Age=2592000; SameSite=Lax`);
    return res.json({ ok: true });
  });

  app.post("/api/auth/logout", (req, res) => {
    res.setHeader("Set-Cookie", `${COOKIE}=; Path=/; Max-Age=0`);
    res.json({ ok: true });
  });

  // 供前端判断是否已登录 / 是否需要密码
  app.get("/api/auth/status", (req, res) => {
    const authed = !PASSWORD || readCookie(req, COOKIE) === HASH;
    res.json({ passwordRequired: !!PASSWORD, authed });
  });
}
