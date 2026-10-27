import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { db } from "./db.js";
import { loadSeed } from "./seed/load.js";
import { authMiddleware, loginRoutes } from "./auth.js";
import { topicsRouter } from "./routes/topics.js";
import { wordsRouter } from "./routes/words.js";
import { sentencesRouter } from "./routes/sentences.js";
import { searchRouter } from "./routes/search.js";
import { bookmarksRouter } from "./routes/bookmarks.js";
import { recentsRouter } from "./routes/recents.js";
import { metaRouter } from "./routes/meta.js";
import { importRouter } from "./routes/importExport.js";
import { ttsRouter } from "./routes/tts.js";
import { lexiconRouter, lexiconSearchRouter } from "./routes/lexicon.js";
import { rulesRouter } from "./routes/rules.js";
import { statsRouter } from "./routes/stats.js";
import { srsRouter } from "./routes/srs.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: "20mb" }));
app.use(express.static(path.join(__dirname, "..", "public")));

// 访问密码（可选，公网部署建议开启）
app.use(authMiddleware);

app.use("/api/topics", topicsRouter);
app.use("/api/words", wordsRouter);
app.use("/api/sentences", sentencesRouter);
app.use("/api/search", searchRouter);
app.use("/api/bookmarks", bookmarksRouter);
app.use("/api/recents", recentsRouter);
app.use("/api/meta", metaRouter);
app.use("/api/import", importRouter);
app.use("/api/tts", ttsRouter);

// v2：拼读、规则、统计、间隔重复
app.use("/api/lexicon/search", lexiconSearchRouter);
app.use("/api/lexicon", lexiconRouter);
app.use("/api/rules", rulesRouter);
app.use("/api/stats", statsRouter);
app.use("/api/srs", srsRouter);

loginRoutes(app);

// 兜底：只有「页面导航」才回首页。
// 带扩展名的静态资源（.js/.css/.png…）缺失时必须真 404，
// 否则浏览器会把 HTML 当脚本解析，报错信息极具误导性。
app.get("*", (req, res) => {
  if (path.extname(req.path)) return res.status(404).type("txt").send("Not found");
  res.sendFile(path.join(__dirname, "..", "public", "index.html"));
});

loadSeed();

// 供测试与并发运行使用：PORT=0 时由系统分配端口
const server = app.listen(PORT, () => {
  const actual = server.address().port;
  console.log(`say-hi listening on http://0.0.0.0:${actual}`);
});

export { app, server };
