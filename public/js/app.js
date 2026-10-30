/* Say Hi v2 · 共享前端工具（Lead 维护，其他成员只读）
   约定见 docs/API.md 第 7 节。所有页面必须用它发请求与朗读。 */
(function () {
  "use strict";

  // 主导航：今日 / 拼读 / 音标 / 场景 / 复习 / 我的
  // 注意：音标页挂在「拼读」这一阶段下，但用户要求顶栏能直接进，所以单独列一项。
  const TABS = [
    { href: "/index.html",    ic: "🌤", label: "今日", key: "today" },
    { href: "/phonics.html",  ic: "🔤", label: "拼读", key: "phonics" },
    { href: "/scenario.html", ic: "📚", label: "场景", key: "scenario" },
    { href: "/review.html",   ic: "🎯", label: "复习", key: "review" },
    { href: "/ipa.html",      ic: "📖", label: "音标", key: "ipa" },
    { href: "/me.html",       ic: "⚙️", label: "我的", key: "me" }
  ];

  /* ══════════ 主题（全站统一） ══════════
     三种状态：跟随系统 / 深色 / 浅色。存 localStorage 的 heard_theme。
     必须在渲染前就应用，否则会先闪一下浅色。 */
  const THEME_KEY = "heard_theme";

  function themePref() {
    try {
      const v = localStorage.getItem(THEME_KEY);
      return v === "dark" || v === "light" ? v : "auto";
    } catch (e) { return "auto"; }
  }

  function applyTheme(pref) {
    const root = document.documentElement;
    if (pref === "dark" || pref === "light") root.setAttribute("data-theme", pref);
    else root.removeAttribute("data-theme");      // 交给 prefers-color-scheme
  }

  function setThemePref(pref) {
    try { localStorage.setItem(THEME_KEY, pref); } catch (e) {}
    applyTheme(pref);
    document.dispatchEvent(new CustomEvent("themechange", { detail: { pref } }));
  }

  // 立即执行（<head> 之后的脚本，赶在首屏绘制前）
  applyTheme(themePref());

  // 跟随系统时，系统换肤要实时生效
  try {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => { if (themePref() === "auto") applyTheme("auto"); };
    if (mq.addEventListener) mq.addEventListener("change", onChange);
    else if (mq.addListener) mq.addListener(onChange);
  } catch (e) {}

  const qs = (sel, root) => (root || document).querySelector(sel);
  const qsa = (sel, root) => Array.prototype.slice.call((root || document).querySelectorAll(sel));

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[c]));
  }

  async function api(path, opts) {
    const o = Object.assign({ headers: {} }, opts || {});
    if (o.body !== undefined && typeof o.body !== "string") {
      o.headers["Content-Type"] = "application/json";
      o.body = JSON.stringify(o.body);
    }
    let res;
    try {
      res = await fetch(path, o);
    } catch (e) {
      throw new Error("网络请求失败：" + e.message);
    }
    const text = await res.text();
    let data = null;
    if (text) { try { data = JSON.parse(text); } catch (e) { data = null; } }
    if (!res.ok) {
      const msg = (data && data.error) || ("HTTP " + res.status);
      // 未登录 / 密码失效：直接回登录页，而不是让每个页面各自报「加载失败」
      if (res.status === 401 && !location.pathname.endsWith("/login.html")) {
        const next = encodeURIComponent(location.pathname + location.search);
        location.href = "/login.html?next=" + next;
        return new Promise(() => {});       // 保持 promise 挂起，避免后续报错刷屏
      }
      throw new Error(msg);
    }
    return data;
  }

  /* ---------- toast ---------- */
  let toastEl = null, toastTimer = null;
  function toast(msg) {
    if (!toastEl) {
      toastEl = document.createElement("div");
      toastEl.className = "toast";
      toastEl.setAttribute("role", "status");
      toastEl.setAttribute("aria-live", "polite");
      document.body.appendChild(toastEl);
    }
    toastEl.textContent = msg;
    toastEl.classList.add("on");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove("on"), 2400);
  }

  /* ---------- 发音 ---------- */
  let audio = null, ttsOk = null;

  function stopSpeak() {
    if (audio) { try { audio.pause(); } catch (e) {} audio = null; }
    if (window.speechSynthesis) window.speechSynthesis.cancel();
  }

  function browserSpeak(text, lang, rate, accent) {
    if (!("speechSynthesis" in window)) { toast("这个浏览器不支持语音朗读"); return false; }
    const u = new SpeechSynthesisUtterance(text);
    const want = lang === "yue" ? "zh-HK" : (accent === "us" ? "en-US" : "en-GB");
    u.lang = want;
    u.rate = rate || 0.95;
    const voices = window.speechSynthesis.getVoices() || [];
    const v = voices.find((x) => x.lang === want)
           || voices.find((x) => x.lang.replace("_", "-").indexOf(want) === 0);
    if (v) u.voice = v;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
    return true;
  }

  /**
   * speak("hello", {lang:"en", rate:0.95, onState:"start"|"end"|"error"})
   * 服务端 edge-tts 优先，失败或超时降级浏览器语音。
   */
  /* 用户偏好：口音与语速（在「我的」里设置，全站生效） */
  function prefAccent() {
    try {
      const v = localStorage.getItem("heard_accent");
      return v === "us" || v === "en-US" ? "us" : "gb";
    } catch (e) { return "gb"; }
  }

  function prefRate() {
    try {
      const v = Number(localStorage.getItem("heard_rate"));
      return v > 0.4 && v < 1.6 ? v : 1;
    } catch (e) { return 1; }
  }

  async function speak(text, opts) {
    const o = opts || {};
    const lang = o.lang || "en";
    // 显式传入的 rate 优先（如「慢速 0.5×」按钮），否则用用户偏好
    const rate = o.rate || prefRate();
    const accent = o.accent || prefAccent();
    const state = (s) => { if (typeof o.onState === "function") o.onState(s); };
    stopSpeak();
    if (!text) return;
    try {
      if (ttsOk === null) {
        const st = await api("/api/tts/status");
        ttsOk = !!(st && st.enabled);
      }
    } catch (e) { ttsOk = false; }

    if (ttsOk) {
      const url = "/api/tts/speak?text=" + encodeURIComponent(text) +
        "&lang=" + (lang === "yue" ? "yue" : "en") + "&rate=" + rate +
        "&accent=" + accent;
      const a = new Audio(url);
      audio = a;
      a.addEventListener("play", () => state("start"));
      a.addEventListener("ended", () => state("end"));
      a.addEventListener("error", () => {
        state("error");
        browserSpeak(text, lang, rate, accent);
        state("end");
      });
      try { await a.play(); return; } catch (e) { /* 自动播放被拦 → 降级 */ }
    }
    if (browserSpeak(text, lang, rate, accent)) { state("start"); setTimeout(() => state("end"), 1200); }
    else state("error");
  }

  /* ---------- chrome ---------- */
  // 底部 Tab 保持 5 个（移动端窄，6 个会挤）；音标从拼读页内和顶栏进入
  const BOTTOM_KEYS = ["today", "phonics", "scenario", "review", "me"];

  function tabbar(active) {
    const list = TABS.filter((t) => BOTTOM_KEYS.includes(t.key));
    return '<nav class="tabbar" aria-label="主导航">' + list.map((t) =>
      '<a href="' + t.href + '"' + (t.key === active ? ' aria-current="page"' : "") + '>' +
      '<span class="ic" aria-hidden="true">' + t.ic + '</span>' + t.label + "</a>"
    ).join("") + "</nav>";
  }

  function appbar(o) {
    const c = o || {};
    return '<header class="appbar' + (c.back ? " has-back" : "") + '">' +
      (c.back ? '<a class="back" href="' + esc(c.back) + '" aria-label="返回">‹</a>'
              : '<span class="logo" aria-hidden="true">' + esc(c.icon || "Hi") + "</span>") +
      '<span class="t">' + esc(c.title || "Say Hi") + "</span>" +
      '<span class="grow"></span>' + (c.right || "") +
      "</header>";
  }

  /* 宽屏唯一顶栏：品牌 + 主导航 + 语言徽标。
     移动端隐藏（用页面内 appbar + 底部 tabbar），宽屏隐藏底部 tabbar，
     保证任何尺寸下都只有一条导航栏，不会出现两条重复栏。 */
  function sitebar(active) {
    return '<header class="sitebar"><div class="sitebar-in">' +
      '<a class="brand" href="/index.html">' +
        '<span class="logo" aria-hidden="true">Hi</span>' +
        '<span class="brand-t">Say Hi</span>' +
      '</a>' +
      '<nav class="sitebar-nav" aria-label="主导航">' +
        TABS.map((t) =>
          '<a href="' + t.href + '"' + (t.key === active ? ' aria-current="page"' : "") + '>' +
          '<span class="ic" aria-hidden="true">' + t.ic + '</span>' + t.label + "</a>"
        ).join("") +
      '</nav>' +
      langSwitchHtml() +
      '</div></header>';
  }

  /* ══════════ 语言偏好（英 GB / 粤 HK） ══════════
     设计原则：语言是一个「偏好」，不是「跳转」。
     - 顶栏切换只写入偏好并广播 langchange，由当前页面自己决定怎么响应；
     - 页面不响应时（没有语言维度）才回退到刷新，保证状态一致；
     - 粤语速查/声调练习是「场景」页里的一个入口，不再和语言切换混为一谈。 */
  function langPref() {
    try {
      var v = localStorage.getItem("heard_lang") === "yue" ? "yue" : "en";
      // 本页不支持粤语时，按英语呈现，避免顶栏高亮与实际内容不符
      if (v === "yue" && typeof pageSupportsLang === "function" && !pageSupportsLang("yue")) return "en";
      return v;
    } catch (e) { return "en"; }
  }

  /* 哪些页面真正支持粤语：目前只有「场景」页（它自己监听 langchange 就地切换）。
     其他页面点「粤 HK」只给一句提示，不改偏好、不刷新，避免出现一半英语一半粤语的错位状态。 */
  const LANG_CAPABLE_PATHS = ["/scenario.html", "/topic.html", "/yue.html"];

  function pageSupportsLang(l) {
    if (l === "en") return true;            // 英语是默认，任何页面都支持
    return LANG_CAPABLE_PATHS.includes(location.pathname);
  }

  function setLangPref(l) {
    const next = l === "yue" ? "yue" : "en";
    // 当前页不支持该语言：只提示，不写偏好、不刷新
    if (!pageSupportsLang(next)) {
      toast("本页暂不支持粤语模式，请到「场景」页切换");
      return false;
    }
    try { localStorage.setItem("heard_lang", next); } catch (e) {}
    // 广播：页面若自己处理（如场景页就地换语言），就由它决定，不跳转
    const ev = new CustomEvent("langchange", { detail: { lang: next }, cancelable: true });
    document.dispatchEvent(ev);
    syncLangButtons();
    if (ev.defaultPrevented) return true;
    // 页面不处理语言 → 刷新让页面按新偏好重渲染（不跳走，保持当前位置）
    location.reload();
    return true;
  }

  function syncLangButtons() {
    const cur = langPref();
    qsa("[data-lang-go]").forEach((b) => {
      b.setAttribute("aria-pressed", String(b.dataset.langGo === cur));
    });
  }

  document.addEventListener("click", (e) => {
    const b = e.target.closest("[data-lang-go]");
    if (!b) return;
    e.preventDefault();
    if (b.dataset.langGo === langPref()) return;
    setLangPref(b.dataset.langGo);
  });

  function langSwitchHtml() {
    return '<div class="lang-switch" role="group" aria-label="语言">' +
      '<button type="button" data-lang-go="en" aria-pressed="' + (langPref() === "en") + '">英 GB</button>' +
      '<button type="button" data-lang-go="yue" aria-pressed="' + (langPref() === "yue") + '">粤 HK</button>' +
      '</div>';
  }

  const VERSION = "1.0.1";
  /* 全站页脚：只显示版本号，灰色无底色 */
  function versionFooter() {
    return '<footer class="app-version">当前版本：' + VERSION + "</footer>";
  }

  function mountChrome() {
    const page = qs("body").dataset.page || "";
    if (!qs(".sitebar")) qs("body").insertAdjacentHTML("afterbegin", sitebar(page));
    // 移动端一级页没有页内 appbar，把语言切换固定注入到页面顶部，保证手机上也能切 GB/HK
    if (!qs(".appbar") && !qs(".mobile-lang")) {
      const bar = document.createElement("div");
      bar.className = "mobile-lang";
      bar.innerHTML = '<span class="mobile-lang-t">Say Hi</span>' + langSwitchHtml();
      qs("body").insertAdjacentHTML("afterbegin", '<div class="mobile-lang-wrap"></div>');
      qs(".mobile-lang-wrap").appendChild(bar);
    }
    // 移动端：页内 appbar 没有语言入口，这里补一个（宽屏由 sitebar 承担，CSS 里隐藏）
    const bar = qs(".appbar");
    if (bar && !bar.querySelector(".lang-switch")) {
      const holder = document.createElement("div");
      holder.className = "appbar-lang";
      holder.innerHTML = langSwitchHtml();
      bar.appendChild(holder);
    }
    if (!qs(".app-version")) {
      const page = qs(".page");
      const html = versionFooter();
      if (page) page.insertAdjacentHTML("afterend", html);
      else qs("body").insertAdjacentHTML("beforeend", html);
    }
    if (!qs(".tabbar")) {
      const holder = qs("[data-tabbar]");
      const html = tabbar(page);
      if (holder) holder.innerHTML = html;
      else qs("body").insertAdjacentHTML("beforeend", html);
    }
  }

  /* ---------- 展示工具 ---------- */
  const fmtPct = (n) => (n == null || isNaN(n) ? "—" : Math.round(n * 100) + "%");

  function bandLabel(band) {
    return ({
      strong: { text: "已掌握", cls: "good" },
      fair:   { text: "一般",   cls: "warn" },
      weak:   { text: "薄弱",   cls: "bad" },
      none:   { text: "未练",   cls: "plain" }
    })[band] || { text: "未练", cls: "plain" };
  }

  function elapsed(iso) {
    const t = Date.parse(iso);
    if (!t) return "";
    const d = Math.floor((Date.now() - t) / 86400000);
    if (d <= 0) return "今天";
    if (d === 1) return "昨天";
    if (d < 30) return d + " 天前";
    return Math.floor(d / 30) + " 个月前";
  }

  /** 解码结果 → 字母块 HTML（strip / syl / blk 样式见 app.css） */
  function blocks(analysis, opts) {
    const o = opts || {};
    const syls = (analysis.syllables || []).map((_, i) =>
      (analysis.blocks || []).filter((b) => b.syl === i));
    if (!syls.length) return "";
    return '<div class="strip">' + syls.map((bs, i) => {
      const stressed = analysis.stress === i && syls.length > 1;
      const attrs = o.interactive ? ' data-act="block"' : "";
      return '<div class="syl' + (stressed ? " stressed" : "") + '">' +
        (stressed ? '<span class="stl">重音</span>' : "") +
        '<div class="blks">' + bs.map((b) => {
          const hidden = o.hideSound ? "hide-sound" : "";
          return '<span class="blk k-' + esc(b.kind) + ' ' + hidden + '"' + attrs +
            ' data-rule="' + esc(b.ruleId || "") + '"' +
            ' data-letters="' + esc(b.letters) + '"' +
            ' data-sound="' + esc(b.sound || "") + '">' +
            '<span class="lt">' + esc(b.letters) + "</span>" +
            '<span class="ph">' + (b.kind === "s" ? "∅" : esc(b.sound || "")) + "</span></span>";
        }).join("") + "</div></div>";
    }).join("") + "</div>";
  }

  function legend() {
    return '<div class="legend">' +
      '<span><i style="background:var(--accent-soft)"></i>元音</span>' +
      '<span><i style="background:var(--con-soft)"></i>辅音</span>' +
      '<span><i style="border:1.5px dashed var(--silent)"></i>不发音</span>' +
      '<span><i style="background:var(--accent)"></i>重读音节</span></div>';
  }

  function bar(pct, cls) {
    const p = Math.max(0, Math.min(1, pct == null || isNaN(pct) ? 0 : pct));
    return '<div class="bar ' + (cls || "") + '" aria-hidden="true"><i style="width:' +
      (p * 100).toFixed(1) + '%"></i></div>';
  }

  function pill(text, cls) {
    return '<span class="pill ' + (cls || "") + '">' + esc(text) + "</span>";
  }

  const loading = (t) => '<div class="loading">' + esc(t || "加载中…") + "</div>";
  const emptyState = (big, text) =>
    '<div class="empty"><span class="big">' + big + "</span>" + esc(text) + "</div>";

  const sayBtn = (text, opts) => {
    const o = opts || {};
    return '<button type="button" class="say ' + (o.solid ? "solid" : "") + '" data-say="' +
      esc(text) + '" data-lang="' + esc(o.lang || "en") + '"' +
      (o.rate ? ' data-rate="' + o.rate + '"' : "") +
      ' aria-label="朗读 ' + esc(text) + '">🔊</button>';
  };

  /* 一次性委托：任何 [data-say] 点击都触发朗读 */
  document.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-say]");
    if (!btn) return;
    e.preventDefault();
    speak(btn.dataset.say, {
      lang: btn.dataset.lang || "en",
      rate: btn.dataset.rate ? Number(btn.dataset.rate) : 0,
      accent: btn.dataset.accent || ""
    });
  });

  document.addEventListener("DOMContentLoaded", mountChrome);

  window.Heardsay = {
    qs, qsa, esc, api, toast,
    speak, stopSpeak,
    tabbar, appbar, sitebar, mountChrome,
    fmtPct, bandLabel, elapsed, blocks, legend, bar, pill,
    themePref, applyTheme, setThemePref, THEME_KEY, VERSION, versionFooter, langPref, setLangPref, syncLangButtons,
    loading, emptyState, sayBtn
  };
})();
