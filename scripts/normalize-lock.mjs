#!/usr/bin/env node
/**
 * 提交时把 package-lock.json 里的内网 npm 镜像地址改写为官方源。
 *
 * 用法：由 git clean filter 自动调用（见 .gitattributes 与 scripts/setup-hooks)
 *   git config filter.npmregistry.clean "node scripts/normalize-lock.mjs"
 *
 * 设计要点：
 * - 只替换 resolved 里的 URL 前缀，版本号与 integrity 一字不动；
 * - 从 stdin 读、往 stdout 写，符合 git filter 协议；
 * - 不改工作区文件，所以本地 npm install 仍然用内网源、速度快。
 */
import { stdin, stdout } from "node:process";

// 内网 / 私有镜像前缀 → 官方源
const REPLACEMENTS = [
  [/https?:\/\/[^/"\s]*maven\.utpf\.cn\/repository\/npm-public\//g, "https://registry.npmjs.org/"],
  [/https?:\/\/[^/"\s]*utpf\.cn\/[^/"\s]*\/npm[^/"\s]*\//g, "https://registry.npmjs.org/"],
  [/https?:\/\/registry\.npmmirror\.com\//g, "https://registry.npmjs.org/"],
  [/https?:\/\/registry\.npm\.taobao\.org\//g, "https://registry.npmjs.org/"],
  [/https?:\/\/[^/"\s]*utapp\.cn\/[^"\s]*?\.tgz/g, (m) => "https://registry.npmjs.org/" + m.split("/").pop()]
];

let chunks = [];
stdin.on("data", (c) => chunks.push(c));
stdin.on("end", () => {
  let text = Buffer.concat(chunks).toString("utf8");
  for (const [re, to] of REPLACEMENTS) text = text.replace(re, to);
  stdout.write(text);
});
