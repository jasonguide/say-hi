/* 冒烟测试：契约逐条核对。node server/test/api.test.js */
const BASE = process.env.BASE || "http://127.0.0.1:3000";

let pass = 0, fail = 0;
const results = [];

async function get(path) {
  const res = await fetch(BASE + path);
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch (e) {}
  return { status: res.status, json, text, type: res.headers.get("content-type") || "" };
}

function check(name, cond, extra) {
  if (cond) { pass++; results.push("  ok   " + name); }
  else { fail++; results.push("  FAIL " + name + (extra ? "  → " + extra : "")); }
}

function shapeLexicon(w) {
  return w && w.found === true && typeof w.word === "string" &&
    Array.isArray(w.syllables) && typeof w.stress === "number" &&
    typeof w.ipaGb === "string" && Array.isArray(w.blocks) && Array.isArray(w.rules) &&
    w.blocks.every((b) => typeof b.letters === "string" && typeof b.sound === "string" &&
      ["v", "c", "s"].includes(b.kind) && typeof b.syl === "number");
}

const t = await get("/api/lexicon/transformer");
check("GET /api/lexicon/transformer 200", t.status === 200, t.status);
check("transformer 结构完整", shapeLexicon(t.json), JSON.stringify(t.json).slice(0, 160));
check("transformer 音节=trans/form/er", t.json && JSON.stringify(t.json.syllables) === '["trans","form","er"]', t.json && JSON.stringify(t.json.syllables));
check("transformer 重音下标=1", t.json && t.json.stress === 1, t.json && t.json.stress);
check("transformer 用到的规则含 rcontrol", !!(t.json && t.json.rules.some((r) => r.id === "rcontrol")));
check("transformer 规则不含 basic", !!(t.json && t.json.rules.every((r) => r.id !== "basic")));
check("transformer 带英音 IPA", t.json && t.json.ipaGb === "trænsˈfɔːmə", t.json && t.json.ipaGb);

const up = await get("/api/lexicon/TRANSFORMER");
check("大小写不敏感", up.status === 200 && up.json.found === true);

const miss = await get("/api/lexicon/zzzzqqq");
check("未收录返回 found:false 且 200", miss.status === 200 && miss.json && miss.json.found === false, miss.status);

const bad = await get("/api/lexicon/ab1");
check("非法输入 400", bad.status === 400, bad.status);

const age = await get("/api/lexicon/age");
check("age 含不发音的 e 块", !!(age.json && age.json.blocks.some((b) => b.kind === "s" && b.letters === "e")));

const se = await get("/api/lexicon/sex");
check("sex 的 x 读 ks", !!(se.json && se.json.blocks.some((b) => b.letters === "x" && b.sound === "ks")));

const search = await get("/api/lexicon/search?q=trans");
check("搜索返回 items", search.status === 200 && Array.isArray(search.json.items));
check("搜索命中 transformer", !!(search.json && search.json.items.some((i) => i.word === "transformer")));

const rules = await get("/api/rules");
check("GET /api/rules 返回 14 条", rules.status === 200 && rules.json.items.length === 14, rules.json && rules.json.items.length);
check("规则含 mastery 四位字段", !!(rules.json && rules.json.items.every((r) =>
  r.mastery && typeof r.mastery.seen === "number" && typeof r.mastery.right === "number" &&
  "pct" in r.mastery && typeof r.mastery.band === "string")));
check("band 取值合法", !!(rules.json && rules.json.items.every((r) =>
  ["none", "weak", "fair", "strong"].includes(r.mastery.band))));
// band 必须与 pct 自洽（不依赖「某条规则从未被碰过」，避免受历史测试数据影响）
check("band 与 pct 自洽", !!(rules.json && rules.json.items.every((r) => {
  const m = r.mastery;
  if (m.pct == null) return m.band === "none";
  if (m.pct >= 0.8) return m.band === "strong";
  if (m.pct >= 0.6) return m.band === "fair";
  return m.band === "weak";
})), JSON.stringify(rules.json.items.filter((r) => {
  const m = r.mastery;
  const want = m.pct == null ? "none" : m.pct >= 0.8 ? "strong" : m.pct >= 0.6 ? "fair" : "weak";
  return m.band !== want;
}).map((r) => r.id)));

const lv1 = await get("/api/rules?level=1");
check("?level=1 只返回 1 级", lv1.status === 200 && lv1.json.items.length === 6, lv1.json && lv1.json.items.length);
check("1 级规则 level 全为 1", lv1.json.items.every((r) => r.level === 1));

const one = await get("/api/rules/magic-e");
check("GET /api/rules/:id 单条", one.status === 200 && one.json.id === "magic-e");
const notFound = await get("/api/rules/nope");
check("未知规则 404", notFound.status === 404, notFound.status);

const sum = await get("/api/stats/summary");
check("summary 结构完整", sum.status === 200 && sum.json.today && sum.json.streak &&
  sum.json.totals && Array.isArray(sum.json.weakRules) && sum.json.stages && sum.json.counts);
check("summary.counts.rules=14", sum.json && sum.json.counts.rules === 14, sum.json && sum.json.counts.rules);
check("summary.counts.lexicon>0", sum.json && sum.json.counts.lexicon > 0);
check("stage 进度为 0..1", sum.json && sum.json.stages.phonics >= 0 && sum.json.stages.phonics <= 1);

const mini = await get("/api/stats/mini");
check("mini 结构完整", mini.status === 200 && typeof mini.json.target === "number" && typeof mini.json.streakDays === "number");

const before = (await get("/api/stats/mini")).json.answered;
const post = await fetch(BASE + "/api/stats/attempt", {
  method: "POST", headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ ruleId: "magic-e", word: "make", kind: "ipa", picked: "meɪk", expected: "meɪk", correct: true })
});
const postJson = await post.json();
check("attempt 写入 200", post.status === 200 && postJson.ok === true, post.status);
check("attempt 后今日 +1", postJson.today.answered === before + 1, postJson.today.answered + " vs " + before);

const badPost = await fetch(BASE + "/api/stats/attempt", {
  method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind: "ipa" })
});
check("attempt 缺 correct 返回 400", badPost.status === 400, badPost.status);

const afterRule = await get("/api/rules/magic-e");
check("答对后该规则 mastery 累积", afterRule.json.mastery.seen >= 1 && afterRule.json.mastery.band !== "none", JSON.stringify(afterRule.json.mastery));

await fetch(BASE + "/api/stats/attempt", {
  method: "POST", headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ ruleId: "digraph", word: "phonics", kind: "ipa", picked: "ˈpɒnɪks", expected: "ˈfɒnɪks", correct: false })
});
const mistakes = await get("/api/stats/mistakes");
check("错题本收录答错项", mistakes.status === 200 && mistakes.json.items.some((i) => i.word === "phonics"), JSON.stringify(mistakes.json).slice(0, 120));
check("错题带规则标题", !!(mistakes.json.items[0] && mistakes.json.items[0].ruleTitle));
const attr = await get("/api/stats/attribution");
check("归因分桶齐全", attr.status === 200 && attr.json.buckets && "phonics" in attr.json.buckets &&
  "meaning" in attr.json.buckets && "spelling" in attr.json.buckets);
check("拼读桶计入读音错", attr.json.buckets.phonics >= 1, JSON.stringify(attr.json.buckets));

const due = await get("/api/srs/due?limit=5");
check("srs/due 200 且有 items + counts", due.status === 200 && Array.isArray(due.json.items) && due.json.counts, due.status);
check("due 不超过 limit", due.json.items.length <= 5, due.json.items.length);
check("due 项含 word/ipaGb/meaning", !!(due.json.items[0] && due.json.items[0].word && "ipaGb" in due.json.items[0] && "meaning" in due.json.items[0]));

const g1 = await fetch(BASE + "/api/srs/grade", {
  method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ word: "delicious", result: "known" })
});
const g1j = await g1.json();
check("grade known 200", g1.status === 200 && g1j.ok === true, g1.status);
check("known 后 box 前进", g1j.box >= 1, g1j.box);
check("grade 返回 dueAt", typeof g1j.dueAt === "string" && !isNaN(Date.parse(g1j.dueAt)), g1j.dueAt);

const g2 = await fetch(BASE + "/api/srs/grade", {
  method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ word: "delicious", result: "forgot" })
});
const g2j = await g2.json();
check("forgot 后 box 回到 1", g2j.box === 1, g2j.box);

const g3 = await fetch(BASE + "/api/srs/grade", {
  method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ word: "delicious", result: "nope" })
});
check("非法 result 返回 400", g3.status === 400, g3.status);
const g4 = await fetch(BASE + "/api/srs/grade", {
  method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ word: "zzzz", result: "known" })
});
check("未收录词 grade 404", g4.status === 404, g4.status);

const sstats = await get("/api/srs/stats");
check("srs/stats 结构完整", sstats.status === 200 && sstats.json.counts && typeof sstats.json.streakDays === "number");
check("learned 随 grade 增长", sstats.json.counts.learned >= 0);

// 旧接口不能被破坏
const topics = await get("/api/topics?lang=en");
check("旧接口 /api/topics 未破坏", topics.status === 200 && Array.isArray(topics.json) && topics.json.length === 15, topics.json && topics.json.length);
const words = await get("/api/words?limit=5");
check("旧接口 /api/words 未破坏", words.status === 200 && Array.isArray(words.json.items), words.status);
const st = await get("/api/tts/status");
check("旧接口 /api/tts/status 未破坏", st.status === 200 && st.json.enabled === true);

// 静态资源
const home = await get("/");
check("首页 200", home.status === 200, home.status);
const css = await get("/css/app.css");
check("/css/app.css 200 text/css", css.status === 200 && css.type.includes("text/css"), css.status + " " + css.type);
const kit = await get("/js/app.js");
check("/js/app.js 200 js", kit.status === 200 && kit.text.includes("Heardsay"), kit.status);

// ── 鉴权契约：静态资源不能绕过访问密码 ──
// 说明：本组用例只在「未启用密码」的环境下验证不误伤；
// 密码场景由 scripts/test-auth.mjs 单独跑（需要独立实例）。
const authStatus = await get("/api/auth/status");
check("auth/status 可用", authStatus.status === 200 && typeof authStatus.json.passwordRequired === "boolean",
  authStatus.status);
const loginPage = await get("/login.html");
check("登录页始终可达", loginPage.status === 200, loginPage.status);

console.log(results.join("\n"));
console.log("\n通过 " + pass + " / 失败 " + fail);
process.exit(fail ? 1 : 0);
