#!/usr/bin/env node
/**
 * 访问密码回归测试（需要独立实例）。
 *
 * 用法：
 *   ACCESS_PASSWORD=test123 PORT=3200 node server/index.js   # 另开一个终端
 *   BASE=http://127.0.0.1:3200 node scripts/test-auth.mjs
 *
 * 覆盖两种历史故障：
 *   1. 静态中间件排在鉴权之前 → 未登录也能拿到首页（本站曾经的真实 bug）
 *   2. 登录页被一起拦住 → 用户无法输入密码，形成死锁
 */
const BASE = process.env.BASE || "http://127.0.0.1:3200";
const PASSWORD = process.env.ACCESS_PASSWORD || "test123";

let pass = 0, fail = 0;
const out = [];
const check = (name, ok, extra) => {
  if (ok) { pass++; out.push("  ok   " + name); }
  else { fail++; out.push("  FAIL " + name + (extra !== undefined ? "  → " + extra : "")); }
};

const raw = (path, opts = {}) => fetch(BASE + path, { redirect: "manual", ...opts });

// 1) 未登录：页面必须 302 到登录页，不能直接给首页
for (const p of ["/", "/index.html", "/phonics.html", "/scenario.html", "/ipa.html"]) {
  const r = await raw(p);
  check(p + " 未登录应重定向", r.status === 302, r.status);
  if (r.status === 302) {
    check(p + " 重定向到 /login.html", r.headers.get("location") === "/login.html", r.headers.get("location"));
  }
}

// 2) 登录页及其依赖必须可达（否则死锁）
for (const p of ["/login.html", "/css/app.css", "/js/app.js", "/icon.svg", "/manifest.json", "/sw.js"]) {
  const r = await raw(p);
  check(p + " 未登录也应可达", r.status === 200, r.status);
}

// 3) 未登录 API 必须 401
for (const p of ["/api/rules", "/api/stats/summary", "/api/lexicon/transformer"]) {
  const r = await raw(p);
  check(p + " 未登录应 401", r.status === 401, r.status);
}

// 4) 错误密码
const bad = await raw("/api/auth/login", {
  method: "POST", headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ password: "definitely-wrong" })
});
check("错误密码返回 403", bad.status === 403, bad.status);

// 5) 正确密码 → 拿到 cookie → 页面与 API 放行
const good = await raw("/api/auth/login", {
  method: "POST", headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ password: PASSWORD })
});
check("正确密码返回 200", good.status === 200, good.status);
const setCookie = good.headers.get("set-cookie") || "";
check("下发登录 cookie", setCookie.includes("sayhi_auth="), setCookie.slice(0, 40));
const cookie = setCookie.split(";")[0];

const home = await raw("/", { headers: { cookie } });
check("登录后首页 200", home.status === 200, home.status);

const rules = await raw("/api/rules", { headers: { cookie } });
check("登录后 API 200", rules.status === 200, rules.status);
if (rules.status === 200) {
  const j = await rules.json();
  check("登录后能取到规则", Array.isArray(j.items) && j.items.length === 14, j.items && j.items.length);
}

const status = await raw("/api/auth/status", { headers: { cookie } });
check("status 报告已登录", (await status.json()).authed === true);

console.log(out.join("\n"));
console.log("\n通过 " + pass + " / 失败 " + fail);
process.exit(fail ? 1 : 0);
