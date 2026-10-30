#!/usr/bin/env node
/**
 * 一次性启用「提交时清洗 package-lock 内网源」的 git filter。
 * 换机器 / 重新克隆后跑一次即可：  node scripts/setup-git-filter.mjs
 */
import { execFileSync } from "node:child_process";

const run = (args) => execFileSync("git", args, { stdio: "inherit" });

// clean：工作区 → 仓库（提交前清洗）
run(["config", "filter.npmregistry.clean", "node scripts/normalize-lock.mjs"]);
// smudge 不做任何事：从仓库取出时原样写回，避免污染本地工作区
run(["config", "filter.npmregistry.smudge", "cat"]);
run(["config", "filter.npmregistry.required", "false"]);

console.log("已启用：package-lock.json 提交时自动把内网镜像地址改写为官方源");
console.log("本地工作区文件保持不变，npm install 仍走你配置的 registry。");
