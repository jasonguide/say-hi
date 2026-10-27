# Say Hi v1.0.0 接口契约（唯一事实来源）

所有成员必须严格按本文件实现与调用。字段名、结构、状态码不得自行更改；确需改动先找 Lead。

基线：`npm start` → http://localhost:3000 。JSON 一律 UTF-8，响应 `Content-Type: application/json`。
错误统一为 `{ "error": "中文提示" }`，配合 4xx/5xx。

---

## 1. 词条与解码 /api/lexicon

### GET /api/lexicon/:word
大小写不敏感，仅字母，长度 1..32。用于「解码器」。

命中 200：
```json
{
  "found": true,
  "word": "transformer",
  "syllables": ["trans", "for", "mer"],
  "stress": 1,
  "ipaGb": "trænsˈfɔːmə",
  "ipaUs": "trænsˈfɔːrmər",
  "blocks": [
    { "letters": "tr", "sound": "tr", "kind": "c", "ruleId": "basic", "syl": 0 },
    { "letters": "a",  "sound": "æ",  "kind": "v", "ruleId": "closed", "syl": 0 },
    { "letters": "ns", "sound": "ns", "kind": "c", "ruleId": "basic", "syl": 0 },
    { "letters": "f",  "sound": "f",  "kind": "c", "ruleId": "basic", "syl": 1 },
    { "letters": "or", "sound": "ɔː", "kind": "v", "ruleId": "rcontrol", "syl": 1 },
    { "letters": "m",  "sound": "m",  "kind": "c", "ruleId": "basic", "syl": 1 },
    { "letters": "er", "sound": "ə",  "kind": "v", "ruleId": "schwa", "syl": 2 }
  ],
  "rules": [
    { "id": "closed",   "title": "闭音节：元音读短音", "letters": ["a"] },
    { "id": "rcontrol", "title": "r 控制元音",        "letters": ["or"] }
  ]
}
```
- `kind`：`v` 元音 / `c` 辅音 / `s` 不发音（不发音块 `sound` 为空字符串）。
- `stress`：重读音节下标，`-1` 表示单音节词不标。
- `rules`：本词用到的规则（去重，按首次出现顺序），`letters` 是该规则作用到的字母组合。
- `ipaUs` 可为 null（粤语词或未收录美音）。

未收录 200（**不是错误**，前端显示「未收录，稍后扩充」）：
```json
{ "found": false, "word": "zzzz" }
```

### GET /api/lexicon/search?q=&limit=20
模糊匹配 `word` 前缀或包含。200：`{ "items": [ { "word": "transformer", "ipaGb": "…", "syllableCount": 3 } ] }`

---

## 2. 规则库 /api/rules

### GET /api/rules?level=1|2|3
省略 `level` 返回全部。200：
```json
{ "items": [
  { "id": "magic-e", "level": 1, "title": "魔法 e：元音读字母名",
    "pattern": "元音 + 辅音 + e",
    "summary": "词尾的 e 不发音，但让前面的元音读它的字母名。",
    "examples": [ { "word": "make", "ipa": "meɪk", "highlight": ["a", "e"] } ],
    "exceptions": ["have /hæv/、give /ɡɪv/、come /kʌm/ 不遵守这条。"],
    "mastery": { "seen": 12, "right": 7, "pct": 0.58, "band": "weak" } } ] }
```
- `band`：`strong`（pct ≥ 0.8）/ `fair`（≥ 0.6）/ `weak`（< 0.6）。无记录时 `seen=0`、`right=0`、`pct=null`、`band="none"`。
- `highlight` 是词里该规则作用的字母（小写）。

### GET /api/rules/:id
200 单条规则，结构同上（无 `items` 包装）。未找到 404。

---

## 3. 练习与统计 /api/stats

### GET /api/stats/summary
200：
```json
{ "today": { "answered": 4, "right": 3, "target": 10 },
  "streak": { "days": 12, "lastDay": "2026-10-27" },
  "totals": { "answered": 348, "right": 271, "pct": 0.78 },
  "weakRules": [ { "id": "magic-e", "title": "魔法 e：元音读字母名", "pct": 0.52, "band": "weak" } ],
  "stages": { "phonics": 0.62, "scenario": 0.28 },
  "counts": { "lexicon": 60, "rules": 14 } }
```
- `stages.phonics`：3 条 3 级规则的平均掌握度，没有记录时按已有规则的平均值；全无记录为 0。
- `stages.scenario`：`SRS 已掌握词数 / 词表总数`。

### GET /api/stats/mini
练习页头部用。200：`{ "answered": 4, "right": 3, "target": 10, "streakDays": 12 }`

### POST /api/stats/attempt
答题记录。请求：
```json
{ "ruleId": "magic-e", "word": "phonics", "kind": "ipa", "picked": "ˈpɒnɪks", "correct": true }
```
- `kind`：`ipa`（选读音）/ `stress`（选重读音节）/ `meaning`（词义）/ `recall`（记忆卡自评）。
- `ruleId` 可为 null。`correct` 必填 boolean。
200：`{ "ok": true, "today": { "answered": 5, "right": 4, "target": 10 }, "streakDays": 12 }`

### GET /api/stats/mistakes?limit=30
错题本。200：
```json
{ "items": [ { "word": "phonics", "kind": "ipa", "ruleId": "digraph",
    "ruleTitle": "辅音组合", "picked": "ˈpɒnɪks", "expected": "ˈfɒnɪks", "at": "2026-10-27T05:00:00Z" } ] }
```

### GET /api/stats/attribution
易错归因。200：
```json
{ "items": [ { "label": "拼读规则（读音猜错）", "count": 8, "bucket": "phonics" } ],
  "buckets": { "phonics": 8, "meaning": 5, "spelling": 3 } }
```
`bucket` 取值：`phonics` / `meaning` / `spelling`。

---

## 4. 间隔重复 /api/srs

### GET /api/srs/due?limit=20
200：
```json
{ "items": [ { "word": "delicious", "ipaGb": "dɪˈlɪʃəs", "meaning": "好吃的",
    "topicSlug": "en-food", "topicTitle": "饮食与点餐", "seen": 3, "box": 1, "lastResult": "fuzzy" } ],
  "counts": { "due": 14, "new": 6, "learned": 212, "total": 60 } }
```

### POST /api/srs/grade
`{ "word": "delicious", "result": "forgot" | "fuzzy" | "known" }`
200：`{ "ok": true, "box": 2, "dueAt": "2026-11-02T00:00:00Z", "counts": { "due": 13, "new": 6, "learned": 1, "total": 60 } }`

### GET /api/srs/stats
`{ "counts": { "due": 14, "new": 6, "learned": 212, "total": 60 }, "streakDays": 12 }`

---

## 5. 词库（现有，沿用） /api/topics /api/words /api/sentences /api/recents /api/bookmarks /api/import

沿用现有实现与字段；**不要改这些接口的结构**。各页如需新字段，走上面的新接口。

---

## 6. 页面路由约定

| 文件 | 说明 |
|---|---|
| `/index.html` | 今日 |
| `/phonics.html` | 拼读（规则 / 解码 / 练习三个 Tab，锚点 `#rules` `#decode` `#practice`） |
| `/scenario.html` | 场景首页（主题网格） |
| `/topic.html?slug=` | 主题详情（沿用旧文件，重写为 v2 版式） |
| `/flashcards.html` | 记忆卡 |
| `/review.html` | 复习 |
| `/me.html` | 我的 |
| `/yue.html` | 粤语 |

底部 5 Tab 顺序固定：今日 /index.html · 拼读 /phonics.html · 场景 /scenario.html · 复习 /review.html · 我的 /me.html。
`/yue.html`、`/flashcards.html`、`/topic.html` 从页内进入，不占 Tab。
所有页面必须：引入 `/css/app.css` 与 `/js/app.js`；`<body class="app">`；内容包在 `.page` 里。
`data-page` 属性写在 `<body>` 上，取值 `today|phonics|scenario|review|me`，用于高亮当前 Tab。

---

## 7. 共享前端工具 /js/app.js（由 Lead 维护，其他人只读）

```js
Heardsay.qs(sel)                 // document.querySelector
Heardsay.api(path, opts)         // fetch + JSON + 错误抛出；返回解析后的对象
Heardsay.esc(str)                // HTML 转义
Heardsay.toast(msg)              // 底部提示
Heardsay.speak(text, {lang, rate, onState})  // 发音：服务端 /api/tts/speak 优先，失败降级浏览器语音
Heardsay.stopSpeak()
Heardsay.tabbar(active)          // 返回底部 5 Tab 的 HTML 字符串
Heardsay.appbar({title, icon, back})  // 返回顶栏 HTML 字符串
Heardsay.mountChrome()           // 自动注入 appbar/tabbar（页面不给就跳过）
Heardsay.fmtPct(n)               // 0.58 → "58%"
Heardsay.bandLabel(band)         // "weak" → {text:"薄弱", cls:"bad"}
Heardsay.blocks(analysis)        // 解码结果 → 字母块 HTML
Heardsay.elapsed(iso)
```
发音语言：`en-GB` 为默认；粤语用 `yue`。**所有朗读必须走 Heardsay.speak**，不要自己 new Audio。
