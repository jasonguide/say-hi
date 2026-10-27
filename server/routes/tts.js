import { Router } from "express";
import { mkdirSync, existsSync, statSync, writeFileSync, unlinkSync, readdirSync } from "node:fs";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// 缓存跟着 DATA_DIR 走：容器里挂载 /data，重启换镜像也不丢缓存
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, "..", "..", "data");
const CACHE_DIR = path.join(DATA_DIR, "tts-cache");
mkdirSync(CACHE_DIR, { recursive: true });

const execFileAsync = promisify(execFile);

// 语音映射：英音（GB）为准，可切美音（US）；粤语固定 HK
const VOICES = {
  en: { gb: "en-GB-SoniaNeural", us: "en-US-JennyNeural" },
  yue: { gb: "zh-HK-HiuGaaiNeural", us: "zh-HK-HiuGaaiNeural" }
};

// 解释器探测：Linux 容器是 python3，Windows 开发机通常是 python
const PYTHON_CANDIDATES = [process.env.TTS_PYTHON, "python3", "python"].filter(Boolean);
let pythonBin = null;
let pythonChecked = false;

async function ensurePython() {
  if (pythonChecked) return pythonBin;
  pythonChecked = true;
  for (const bin of PYTHON_CANDIDATES) {
    try {
      await execFileAsync(bin, ["-c", "import edge_tts"], { timeout: 15000, windowsHide: true });
      pythonBin = bin;
      return pythonBin;
    } catch { /* 试下一个 */ }
  }
  return null;
}

// 简单并发队列：同时最多 2 个合成任务
let active = 0;
const queue = [];
async function withQueue(fn) {
  if (active >= 2) await new Promise((r) => queue.push(r));
  active++;
  try { return await fn(); }
  finally { active--; if (queue.length) queue.shift()(); }
}

function cachePath(lang, text, rate, accent) {
  const key = crypto.createHash("sha1").update([lang, text, rate, accent].join("|")).digest("hex");
  return path.join(CACHE_DIR, key + ".mp3");
}

function rateToStr(rate) {
  if (rate === 1) return "+0%";
  return (rate < 1 ? "-" : "+") + Math.round(Math.abs(rate - 1) * 100) + "%";
}

const r = Router();

r.get("/status", async (req, res) => {
  const bin = await ensurePython();
  res.json({
    enabled: !!bin,
    engine: "edge-tts (python)",
    python: bin || null,
    voices: VOICES
  });
});

// 合成接口：/api/tts/speak?text=...&lang=en&rate=1&accent=gb
r.get("/speak", async (req, res) => {
  const text = String(req.query.text || "").slice(0, 1000);
  const lang = req.query.lang === "yue" ? "yue" : "en";
  const accent = req.query.accent === "us" ? "us" : "gb";
  const rate = Number(req.query.rate) || 1;
  if (!text) return res.status(400).json({ error: "text 必填" });

  const rateStr = rateToStr(rate);
  const file = cachePath(lang, text, rateStr, accent);
  const failMark = file + ".fail";

  if (!existsSync(file) || statSync(file).size === 0) {
    // 之前失败过就不反复重试（长请求会拖垮页面）
    if (existsSync(failMark)) return res.status(502).json({ error: "TTS 合成失败（已跳过重试）" });

    const bin = await ensurePython();
    if (!bin) return res.status(502).json({ error: "服务器未安装 edge-tts（需要 python3 与 edge-tts）" });

    try {
      await withQueue(() => execFileAsync(bin, [
        "-m", "edge_tts",
        "--voice=" + VOICES[lang][accent],
        "--rate=" + rateStr,
        "--text=" + text,
        "--write-media=" + file
      ], { timeout: 30000, windowsHide: true }));
    } catch (e) {
      try { writeFileSync(failMark, String(e.message || "fail")); } catch {}
      return res.status(502).json({ error: "TTS 合成失败: " + e.message });
    }
    if (existsSync(failMark)) { try { unlinkSync(failMark); } catch {} }
  }

  if (!existsSync(file) || statSync(file).size === 0) {
    return res.status(502).json({ error: "TTS 合成失败" });
  }
  res.setHeader("Content-Type", "audio/mpeg");
  res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
  res.sendFile(file);
});

// 缓存统计：给「我的」页显示真实数字，不编造
r.get("/cache", (req, res) => {
  let count = 0, bytes = 0;
  try {
    for (const name of readdirSync(CACHE_DIR)) {
      if (!name.endsWith(".mp3")) continue;
      const st = statSync(path.join(CACHE_DIR, name));
      if (st.isFile()) { count++; bytes += st.size; }
    }
  } catch { /* 目录不可读就报 0 */ }
  res.json({ count, bytes, dir: CACHE_DIR });
});

// 语音列表（调试用）
r.get("/voices", async (req, res) => {
  const bin = await ensurePython();
  if (!bin) return res.status(502).json({ error: "服务器未安装 edge-tts" });
  try {
    const { stdout } = await execFileAsync(bin, ["-m", "edge_tts", "--list-voices"], { timeout: 20000, windowsHide: true });
    const lines = stdout.split("\n").filter((l) => l.includes("zh-HK") || l.includes("en-GB") || l.includes("en-US"));
    res.json({ voices: lines.map((l) => l.trim()) });
  } catch (e) {
    res.status(502).json({ error: e.message });
  }
});

export const ttsRouter = r;
