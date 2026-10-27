/* Say Hi v2 · 拼读练习（task-4 交付物）
   页面只需留一个空容器 <div id="practice-panel"></div>，本文件自己挂载。
   对外暴露 window.Practice = { mount, start }，不覆盖 Heardsay。
   请求一律走 Heardsay.api，发音一律走 data-say（app.js 统一委托给 Heardsay.speak）。 */
(function () {
  "use strict";

  var TOTAL = 10;              // 每组题数
  var root = null;             // 挂载容器 #practice-panel
  var pool = [];               // 候选词（/api/lexicon/search）
  var cache = new Map();       // word -> 解码结果
  var mini = null;             // /api/stats/mini
  var round = null;            // 本轮状态
  var token = 0;               // 防止旧请求覆盖新一轮
  var bound = false;           // 事件只绑一次
  var lastWeak = null;         // 上一组最弱的规则 id，用于「再练一组」偏向

  // 共享工具（app.js 可能后加载，用取值函数而非快照，避免 undefined）
  function HS() { return window.Heardsay || {}; }

  function esc(s) { return window.Heardsay.esc(s); }
  var RULE_TITLES = {
    "basic": "基础辅音", "closed": "闭音节：元音读短音", "magic-e": "魔法 e：元音读字母名",
    "digraph": "辅音组合：两个字母一个音", "rcontrol": "r 控制元音", "team": "元音组合",
    "open": "开音节：元音读字母名", "soft": "c 和 g 的软读与硬读", "suffix": "固定词尾",
    "quirk": "字母的特殊读法", "silent": "不发音的字母", "schwa": "弱读 /ə/：不重读的元音",
    "stress": "重音在哪里", "gb-bath": "英音特色：bath 类词的 a"
  };
  function ruleTitle(id) { return RULE_TITLES[id] || ""; }
  function api(p, o) { return window.Heardsay.api(p, o); }
  function toast(m) { window.Heardsay.toast(m); }

  /* 小工具 */
  function shuffle(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  function sylIpa(a, i) {
    return (a.blocks || []).filter(function (b) { return b.syl === i && b.kind !== "s"; })
      .map(function (b) { return b.sound || ""; }).join("");
  }

  /* 取词条解码结果；失败或未收录时给一个可兜底的空壳 */
  function ensureAnalysis(word, item) {
    if (cache.has(word)) return Promise.resolve(cache.get(word));
    return api("/api/lexicon/" + encodeURIComponent(word)).then(function (d) {
      var a = d && d.found ? d : null;
      if (a) cache.set(word, a);
      return a;
    }).catch(function () {
      return null;
    });
  }

  function shell(item) {
    return {
      word: item.word, ipaGb: item.ipaGb, meaning: item.meaning || "",
      syllables: [], stress: -1, blocks: [], rules: []
    };
  }

  /* 干扰项：只差一个音素的最小对偶 */
  /* 按音素类别建替换表：只在同类里换，改完只差一个音，而且读起来仍像真词。
     例：gym /dʒɪm/ → /dʒɪn/ /dʒɪp/ /tʃɪm/ /dʒʌm/，而不是拿 bath /bɑːθ/ 来凑。 */
  var SHORT_V = ["ɪ", "e", "æ", "ʌ", "ɒ", "ʊ", "ə"];
  var LONG_V = ["iː", "ɑː", "ɔː", "uː", "ɜː"];
  var DIPH_V = ["eɪ", "aɪ", "ɔɪ", "aʊ", "əʊ", "ɪə", "eə", "ʊə"];
  var SINGLE_C = ["p", "b", "t", "d", "k", "ɡ", "g", "f", "v", "θ", "ð",
    "s", "z", "ʃ", "ʒ", "h", "m", "n", "ŋ", "l", "r", "w", "j"];
  var AFFRIC_C = ["tʃ", "dʒ"];

  var ALL_UNITS = SHORT_V.concat(LONG_V, DIPH_V, SINGLE_C, AFFRIC_C)
    .sort(function (a, b) { return b.length - a.length; });

  function unitClass(u) {
    var s = String(u || "");
    if (LONG_V.indexOf(s) >= 0) return "longV";
    if (DIPH_V.indexOf(s) >= 0) return "diphV";
    if (SHORT_V.indexOf(s) >= 0) return "shortV";
    if (AFFRIC_C.indexOf(s) >= 0) return "affric";
    if (SINGLE_C.indexOf(s) >= 0) return "singleC";
    return "";                                     // 不认识的音素不拿来替换
  }

  function bankOf(cls) {
    if (cls === "longV") return LONG_V;
    if (cls === "diphV") return DIPH_V;
    if (cls === "shortV") return SHORT_V;
    if (cls === "affric") return AFFRIC_C;
    if (cls === "singleC") return SINGLE_C;
    return [];
  }

  /* IPA 串 → 音素数组：重音符号丢掉，长音符号并到前一个音素上 */
  function tokenize(ipa) {
    var s = String(ipa || ""), out = [], i = 0;
    while (i < s.length) {
      var c = s.charAt(i);
      if (c === "ˈ" || c === "ˌ") { i++; continue; }
      if (c === "ː") { if (out.length) out[out.length - 1] += "ː"; i++; continue; }
      var hit = "";
      for (var a = 0; a < ALL_UNITS.length; a++) {
        if (s.indexOf(ALL_UNITS[a], i) === i) { hit = ALL_UNITS[a]; break; }
      }
      if (!hit) hit = c;
      out.push(hit);
      i += hit.length;
    }
    return out;
  }

  /* 随机换掉一个元音或一个辅音 → 与正确读音只差一个音 */
  function mutateOnce(ipa) {
    var toks = tokenize(ipa);
    if (!toks.length) return null;

    var slots = [];                               // [{i, cls}]
    toks.forEach(function (t, i) {
      var cls = unitClass(t);
      if (cls) slots.push({ i: i, cls: cls });
    });
    if (!slots.length) return null;

    for (var attempt = 0; attempt < 16; attempt++) {
      var slot = slots[Math.floor(Math.random() * slots.length)];
      var bank = bankOf(slot.cls);
      var next = bank[Math.floor(Math.random() * bank.length)];
      if (!next || next === toks[slot.i]) continue;
      var out = toks.slice();
      out[slot.i] = next;
      return out.join("");
    }
    return null;
  }

  /* 出题 */
  function buildIpaQ(a) {
    var correct = "/" + a.ipaGb + "/";
    var seen = {}; seen[a.ipaGb] = true;
    var distract = [];

    // 主路：全部用「只差一个音素」的最小改动，四个选项才像、才需要真的按规则判断
    var guard = 0;
    while (distract.length < 3 && guard++ < 200) {
      var m = mutateOnce(a.ipaGb);
      if (m && !seen[m]) { seen[m] = true; distract.push(m); }
    }
    // 兜底：极短词实在造不满 3 个时，才拿别的词的读音补（正常不会走到）
    if (distract.length < 3) {
      var others = shuffle(pool.map(function (w) { return w.ipaGb; })
        .filter(function (x) { return x && !seen[x]; }));
      for (var j = 0; j < others.length && distract.length < 3; j++) {
        seen[others[j]] = true;
        distract.push(others[j]);
      }
    }

    var display = shuffle([a.ipaGb].concat(distract).map(function (x) { return "/" + x + "/"; }));
    var first = (a.rules && a.rules[0]) || null;
    return {
      kind: "ipa", word: a.word, prompt: "选出正确读音",
      ipaGb: a.ipaGb, meaning: a.meaning, analysis: a,
      options: display.map(function (t) { return { main: t, sub: "", raw: t.replace(/\//g, "") }; }),
      answerIndex: display.indexOf(correct),
      expected: a.ipaGb,
      ruleId: first ? first.id : null,
      ruleTitle: first ? first.title : "拼读规则"
    };
  }

  function buildStressQ(a) {
    var opts = shuffle(a.syllables.map(function (s, i) {
      return { main: s.toUpperCase(), sub: sylIpa(a, i), raw: s, syl: i };
    }));
    return {
      kind: "stress", word: a.word, prompt: "选出重读的音节",
      ipaGb: a.ipaGb, meaning: a.meaning, analysis: a,
      options: opts,
      answerIndex: opts.map(function (o) { return o.syl; }).indexOf(a.stress),
      answerSyl: a.stress,                 // 正确音节的下标（选项顺序被打乱，不能拿 answerIndex 当音节号）
      expected: a.syllables[a.stress],
      ruleId: "stress",
      ruleTitle: "重音在哪里"
    };
  }

  /* 拆词：先定题型，再逐题生成选项 */
  function buildQuestions(chosen) {
    var qs = [];
    for (var i = 0; i < chosen.length; i++) {
      var c = chosen[i];
      var a = cache.get(c.w.word) || shell(c.w);
      var kind = c.kind;
      // 音节能用才出重音题；字母组合有重复会导致选项歧义，也退回选读音
      var letters = (a.syllables || []).map(function (s) { return s.toUpperCase(); });
      var uniq = {}; var dup = false;
      letters.forEach(function (s) { if (uniq[s]) dup = true; uniq[s] = true; });
      if (kind === "stress" && (a.syllables.length < 2 || a.stress < 0 || dup)) kind = "ipa";
      qs.push(kind === "stress" ? buildStressQ(a) : buildIpaQ(a));
    }
    return qs;
  }

  /* 选 10 个词：尽量 5 题重音 + 5 题读音；preferRuleId 时优先这类词的词 */
  function pickWords(preferRuleId) {
    var cands = pool.slice();
    if (preferRuleId) {
      var hit = [], rest = [];
      cands.forEach(function (w) {
        var a = cache.get(w.word);
        var on = a && (a.rules || []).some(function (r) { return r.id === preferRuleId; });
        (on ? hit : rest).push(w);
      });
      if (hit.length) cands = hit.concat(rest);
    }
    var shuffled = shuffle(cands);
    var multi = shuffled.filter(function (w) { return w.syllableCount >= 2; });
    // 两音节词的重音题只有两个选项，尽量优先三音节及以上（题量不够时再退回两音节）
    var rich = multi.filter(function (w) { return w.syllableCount >= 3; });
    if (rich.length >= 5) multi = rich.concat(multi.filter(function (w) { return w.syllableCount < 3; }));
    var stressCount = Math.min(5, multi.length);
    var chosenStress = multi.slice(0, stressCount);
    var used = {};
    chosenStress.forEach(function (w) { used[w.word] = true; });
    var chosenIpa = shuffled.filter(function (w) { return !used[w.word]; }).slice(0, TOTAL - stressCount);
    return shuffle(chosenStress.map(function (w) { return { w: w, kind: "stress" }; })
      .concat(chosenIpa.map(function (w) { return { w: w, kind: "ipa" }; })));
  }

  /* 渲染 */
  function headHtml() {
    var q = round.questions[round.idx];
    var frac = round.questions.length ? (round.idx + (q && q.answered ? 1 : 0)) / round.questions.length : 0;
    var score = Math.round(round.answered ? round.right / round.answered * 100 : 0) + "%";
    var m = mini || { answered: 0, right: 0, target: TOTAL, streakDays: 0 };
    return '<div class="qhead"><span>' + Math.min(round.idx + 1, round.questions.length) + " / " + round.questions.length +
      '</span><div class="bar"><i style="width:' + (frac * 100).toFixed(1) + '%"></i></div><span>' + score + "</span></div>" +
      '<p class="sub">今日已答 <b>' + m.answered + "</b> 题" +
      (m.answered >= m.target ? "（目标 " + m.target + " 已达标）" : "（目标 " + m.target + "）") +
      " · 答对 <b>" + m.right + "</b> 题 · 连续 <b>" + m.streakDays + "</b> 天</p>";
  }

  function optionsHtml(q) {
    var isStress = q.kind === "stress";
    var list = q.options.map(function (o, i) {
      var cls = "opt", tag = "";
      if (q.answered) {
        if (i === q.answerIndex) { cls += " ok"; tag = '<span class="tag">正确</span>'; }
        else if (i === q.pickedIndex) { cls += " no"; tag = '<span class="tag">你选的</span>'; }
        else { cls += " dim"; }
      }
      var body = isStress
        ? '<span class="w">' + esc(o.main) + '</span><span class="sub ipa">' + esc(o.sub) + "</span>"
        : "<kbd>" + (i + 1) + '</kbd><span class="ipa">' + esc(o.main) + "</span>";
      return '<button type="button" class="' + cls + '" data-i="' + i + '"' +
        (q.answered ? " disabled" : "") + ">" + body + tag + "</button>";
    }).join("");
    return '<div class="' + (isStress ? "sylopts" : "opts") + '">' + list + "</div>";
  }

  function whyText(q) {
    var a = q.analysis;
    var parts = [];
    if (q.kind === "stress") {
      parts.push("重音落在第 " + (a.stress + 1) + " 个音节（" + a.syllables[a.stress] + "，读 /" + sylIpa(a, a.stress) + "/）");
    } else {
      var n = (a.syllables || []).length;
      if (n) parts.push("切成 " + n + " 个音节：" + a.syllables.join(" · "));
      if (a.stress >= 0 && n > 1) parts.push("重音在第 " + (a.stress + 1) + " 个音节");
    }
    var rules = (a.rules || []).map(function (r) { return r.title; });
    if (rules.length) parts.push("用到的规则：" + rules.join("、"));
    parts.push("这个音可以先用 /" + q.ipaGb + "/ 记住，再看规则解释为什么");
    return parts.join("；") + "。";
  }

  function feedbackHtml(q) {
    var ok = q.pickedIndex === q.answerIndex;
    var main;
    if (q.kind === "stress") {
      main = ok ? "重音就是第 " + (q.answerSyl + 1) + " 个音节。"
        : "重音应该在第 " + (q.answerSyl + 1) + " 个音节（" + q.expected.toUpperCase() + "）。";
    } else {
      main = ok ? "对，" + q.word + " 读 /" + q.ipaGb + "/。"
        : "应该是 /" + q.ipaGb + "/，你选的是 " + q.options[q.pickedIndex].main + "。";
    }
    var say = esc(q.word);
    // 答题后给完整依据：结论 → 为什么 → 整词音标 + 字母块拆解 → 用到的规则 → 下一题
    var analysis = q.analysis || null;
    var blocks = "";
    if (analysis && analysis.blocks && analysis.blocks.length && HS().blocks) {
      blocks = HS().blocks(analysis) +
        '<p class="sub" data-blk-tip style="margin-top:6px">点任意字母块，看它为什么这样读。</p>' +
        '<div class="ipabar" style="margin-top:4px">' +
          '<span class="ipa big">/' + esc(analysis.ipaGb) + "/</span>" +
          '<button type="button" class="say" data-say="' + say + '" data-lang="en">🔊</button>' +
          '<button type="button" class="btn soft sm" style="min-height:44px" data-say="' + say + '" data-lang="en" data-rate="0.6">慢速</button>' +
        "</div>";
    }
    var ruleLink = q.ruleId
      ? '<p class="sub" style="margin-top:2px">用到的规则：<a href="/phonics.html#rules" data-rule="' + esc(q.ruleId) + '">' +
        esc(q.ruleTitle || q.ruleId) + "</a></p>"
      : "";
    return '<div class="fb' + (ok ? "" : " bad") + '"><b>' + esc(ok ? "答对了" : "再想想") + "</b>" +
      '<p style="margin-top:4px">' + esc(main) + "</p>" +
      '<p class="sub">' + esc(whyText(q)) + "</p>" +
      blocks +
      ruleLink +
      "</div>";
  }

  function render() {
    if (!root) return;
    if (!round) return;                       // 还没出题（或正在重新出题）时不动内容
    if (round.done) return renderDone();
    var q = round.questions[round.idx];
    if (!q) return renderDone();
    var last = round.idx + 1 >= round.questions.length;
    root.innerHTML =
      headHtml() +
      '<div class="card">' +
      '<span class="pill plain">' + esc(q.prompt) + "</span>" +
      '<p class="qword"' + (q.kind === "stress" ? ' style="font-size:30px"' : "") + ">" + esc(q.word) + "</p>" +
      optionsHtml(q) +
      (q.answered ? feedbackHtml(q) : "") +
      (q.answered ? '<div class="actions" style="margin-top:10px"><button type="button" class="btn" id="p-next">' +
        (last ? "看成绩 ›" : "下一题 ›") + "</button></div>" : "") +
      "</div>";
  }

  function renderDone() {
    var total = round ? round.questions.length : 0;
    var right = round ? round.right : 0;
    var pct = total ? Math.round(right / total * 100) : 0;
    var weak = weakest();
    lastWeak = weak ? weak.id : null;
    // 按规则聚合本组结果（图3 的表）：正确率低的排前面
    var rows = Object.keys(round.stats).map(function (id) {
      var s = round.stats[id];
      return { id: id, title: s.title || id, right: s.right, seen: s.seen };
    }).filter(function (r) { return r.seen > 0; });
    rows.sort(function (a, b) { return (a.right / a.seen) - (b.right / b.seen); });

    var tableRows = rows.map(function (r) {
      var p = r.right / r.seen;
      var cls = p >= 0.8 ? "good" : p >= 0.5 ? "warn" : "bad";
      return '<li><a class="plain" href="/phonics.html#rules" data-rule="' + esc(r.id) + '">' + esc(r.title) + "</a>" +
        '<span class="pill ' + cls + '">' + r.right + " / " + r.seen + "</span></li>";
    }).join("");

    var tip = weak
      ? "这一组最弱的是「" + weak.title + "」（" + weak.right + "/" + weak.seen + " 题对）。再练一组会多出这类词。"
      : "这一组没有明显短板，继续保持。";

    root.innerHTML =
      '<div><p class="eyebrow">本组完成</p>' +
      '<h1 style="margin-top:4px">答对 ' + right + " / " + total + "</h1></div>" +
      '<div class="card">' +
      "<h2>按规则看结果</h2>" +
      (tableRows
        ? '<ul class="ruleslist" style="margin-top:8px">' + tableRows + "</ul>"
        : '<p class="sub">这一组没有可用于归因的规则记录。</p>') +
      "</div>" +
      '<div class="card">' +
      '<p class="sub">' + esc(tip) + "</p>" +
      '<div class="actions" style="margin-top:8px">' +
      '<button type="button" class="btn" id="p-again">再来一组</button>' +
      '<a class="btn ghost" href="/phonics.html#rules">查看规则</a>' +
      "</div></div>";
  }

  function renderError(msg) {
    if (!root) return;
    root.innerHTML = '<div class="card"><div class="err">题目加载失败：' + esc(msg) +
      '</div><div class="actions"><button type="button" class="btn" id="p-again">重试</button></div></div>';
  }

  /* 答题 */
  function cur() { return round && !round.done ? round.questions[round.idx] : null; }

  function answer(i) {
    var q = cur();
    if (!q || q.answered || i < 0 || i >= q.options.length) return;
    q.answered = true;
    q.pickedIndex = i;
    var ok = i === q.answerIndex;
    if (ok) round.right++;
    round.answered++;
    var s = round.stats[q.ruleId] || (round.stats[q.ruleId] = { title: q.ruleTitle, seen: 0, right: 0 });
    s.seen++; if (ok) s.right++;
    render();
    // 对错都记录一次（kind 用 ipa / stress）
    api("/api/stats/attempt", {
      method: "POST",
      body: {
        ruleId: q.ruleId, word: q.word, kind: q.kind,
        picked: q.options[i].raw, expected: q.expected, correct: ok
      }
    }).then(function (r) {
      if (r && r.today) {
        mini = { answered: r.today.answered, right: r.today.right, target: r.today.target, streakDays: r.streakDays };
        if (cur() === q) render();
      }
    }).catch(function (e) {
      toast("答题记录没存上：" + e.message);
    });
  }

  function next() {
    if (!round) return;
    round.idx++;
    if (round.idx >= round.questions.length) { round.done = true; return renderDone(); }
    render();
  }

  function weakest() {
    if (!round) return null;
    var best = null;
    Object.keys(round.stats).forEach(function (id) {
      var s = round.stats[id];
      if (!s.seen) return;
      var p = s.right / s.seen;
      if (!best || p < best.pct) best = { id: id, title: s.title, pct: p, seen: s.seen, right: s.right };
    });
    return best;
  }

  /* 启动 */
  function loadMini() {
    return api("/api/stats/mini").then(function (m) {
      mini = m; render();
    }).catch(function () { /* 头部统计拿不到不影响答题 */ });
  }

  function start(preferRuleId) {
    if (!root) return;
    var t = ++token;
    round = null;
    root.innerHTML = window.Heardsay.loading("正在准备题目…");
    api("/api/lexicon/search?limit=30").then(function (d) {
      if (t !== token) return;
      pool = ((d && d.items) || []).filter(function (w) { return w && w.ipaGb; });
      if (pool.length < 4) throw new Error("词库里的词太少，没法出题");
      var chosen = pickWords(preferRuleId);
      return Promise.all(chosen.map(function (c) { return ensureAnalysis(c.w.word, c.w); }))
        .then(function () {
          if (t !== token) return;
          round = { questions: buildQuestions(chosen), idx: 0, right: 0, answered: 0, stats: {}, done: false };
          render();
        });
    }).catch(function (e) {
      if (t !== token) return;
      renderError(e.message || "未知错误");
    });
  }

  /* 事件 */
  function onKey(e) {
    if (!root || !round || round.done) return;
    if (/^[1-4]$/.test(e.key)) {
      var q = cur();
      var i = Number(e.key) - 1;
      if (q && !q.answered && i < q.options.length) { e.preventDefault(); answer(i); }
    } else if (e.key === "Enter") {
      var c = cur();
      if (c && c.answered) { e.preventDefault(); next(); }
    }
  }

  function bind() {
    if (bound) return;
    bound = true;
    root.addEventListener("click", function (e) {
      var opt = e.target.closest(".opt");
      if (opt && root.contains(opt) && !opt.disabled) {
        var i = Number(opt.dataset.i);
        if (!isNaN(i)) answer(i);
        return;
      }
      var blk = e.target.closest(".blk[data-letters]");
      if (blk && root.contains(blk)) {
        var host = blk.closest(".fb");
        if (host) {
          var tip = host.querySelector("[data-blk-tip]");
          if (tip) {
            var l = blk.dataset.letters, sound = blk.dataset.sound || "";
            var rule = blk.dataset.rule || "";
            tip.innerHTML = "<b>" + esc(l) + "</b> 读 " +
              (sound ? "<b>/" + esc(sound) + "/</b>" : "（不发音）") +
              (rule ? '　规则：<a href="/phonics.html#rules" data-rule="' + esc(rule) + '">' +
                esc((ruleTitle(rule) || rule)) + "</a>" : "");
          }
        }
        return;
      }
      if (e.target.closest("#p-start")) return start(null);
      if (e.target.closest("#p-next")) return next();
      if (e.target.closest("#p-again")) return start(lastWeak);
    });
    document.addEventListener("keydown", onKey);
  }

  /* 说明页：默认进入先讲清楚规则，点「开始」才出题（不做成自动开始） */
  function renderIntro() {
    if (!root) return;
    var m = mini || { answered: 0, right: 0, target: TOTAL };
    root.innerHTML =
      '<div><p class="eyebrow">练习</p>' +
      '<h1 style="margin-top:4px">10 题，约 5 分钟</h1></div>' +
      '<p class="lead">两种题：给一个词，选出读音；给一个多音节词，选出重读的音节。' +
      "部分题用的是造出来的词，专门训练把规则用到没见过的词上。</p>" +
      '<div class="card" style="gap:12px">' +
      '<p class="sub">答完每题会显示用到的规则，并朗读这个词。键盘数字键 1 到 4 可以直接选，回车进入下一题。</p>' +
      '<p class="sub">今日已答 <b>' + m.answered + "</b> 题" +
      (m.answered >= m.target ? "（目标已达标，想练可以继续）" : "（目标 " + m.target + " 题）") + "</p>" +
      '<div class="actions"><button type="button" class="btn" id="p-start">开始</button></div>' +
      "</div>";
  }

  function mount() {
    var el = document.querySelector("#practice-panel");
    if (!el) return false;          // 页面没留容器 → 静默退出
    root = el;
    bind();
    loadMini();
    // 不自动出题：没有进行中的一轮时显示说明页
    if (!round) renderIntro();
    return true;
  }

  window.Practice = { mount: mount, start: start };

  // 页面上已经有容器就自动挂载
  function auto() { if (document.querySelector("#practice-panel")) mount(); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", auto);
  else auto();
  // 从锚点进入练习 Tab 时兜底挂载（重复调用安全）
  window.addEventListener("hashchange", function () {
    if (location.hash === "#practice") auto();
  });
})();