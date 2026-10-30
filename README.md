# Say Hi

自用的英语 + 粤语口语练习工具。部署在自己的服务器 / NAS 上，主要在手机浏览器里用。

> 名字的意思：别怕开口，先打个招呼。

## 它解决什么

看到一个陌生的英文词（transformer、age、sex…），即使不知道意思，也能**大致猜出怎么读**。
这是一个「拼写 → 读音」的解码能力，不是查音标。

分两个阶段，一个工具走完：

**阶段一 · 拼读（学会猜读音）**
- **规则库**：14 条规则分 3 级（拼写对应 / 上下文 / 重音与英音），每条都带例外提醒。
- **解码器**：输入任意词 → 切成音节 → 标重音 → 每个字母块对应一个音，点一下告诉你「为什么这样读」。
- **练习**：选读音、选重读音节；答完给完整拆解，错题直接连回对应规则。
- **音标速查**：44 个音素，元音四边形 + 谐音标注 + 例词朗读，可放教学视频。

**阶段二 · 场景（按场景记词句）**
- **主题**：英语 15 个 / 粤语 15 个场景主题，词句带 IPA / 粤拼。
- **记忆卡**：三档自评（忘了 / 模糊 / 记得）的间隔重复。
- **跟读**：浏览器录音回放对比，只在本地回放、不上传。

**汇合点**：复习页把「拼读错题」和「词汇错题」放进同一条队列。

> 粤语目前只在「场景」页有内容；其他页面点顶部「粤 HK」会提示暂不支持。

## 快速开始（本地开发）

```bash
npm install
npm start          # http://localhost:3000
npm test           # 接口冒烟测试（需服务已在 3000 运行）
```

数据保存在 `./data/say-hi.db`（SQLite，首次启动自动导入种子词库；沿用旧库文件名 `hearsay.db` 以兼容既有数据）。
发音缓存保存在 `./data/tts-cache`（跟随 `DATA_DIR`，换容器不丢）。

## 部署到服务器（Docker）

镜像名 **`say-hi:1.0.0`**，由 `docker compose` 自动构建，不需要单独执行 `docker build`。

```bash
cp .env.example .env     # 改掉 ACCESS_PASSWORD 和 TZ
docker compose up -d --build
docker compose logs -f   # 看到 listening 即可访问 http://<服务器IP>:3000
```

日常运维：

| 操作 | 命令 |
|---|---|
| 停止 | `docker compose down` |
| 重启 | `docker compose restart` |
| 升级后重建 | `docker compose up -d --build` |
| 看日志 | `docker compose logs -f` |
| 备份数据 | 直接拷走 `./data` 整个目录 |

镜像内已装 Python + edge-tts，开箱即可发音，不需要额外配环境。

`.env` 里有这几个开关：

| 变量 | 说明 |
|---|---|
| `ACCESS_PASSWORD` | 访问密码，留空则不校验；公网部署务必设置 |
| `PORT` | 宿主端口，默认 3000 |
| `TZ` | 时区，影响「今日统计」和连续天数，默认 `Asia/Shanghai` |
| `DAILY_TARGET` | 每日拼读题量目标，默认 10 |

## 发音（TTS）

服务端用 **edge-tts** 合成 mp3 并缓存，浏览器播放；服务端不可用时自动降级为浏览器自带语音。

- 英音（默认）：`en-GB-SoniaNeural`
- 美音：`/api/tts/speak?...&accent=us` → `en-US-JennyNeural`
- 粤语：`zh-HK-HiuGaaiNeural`

## 接口

见 [docs/API.md](docs/API.md)。所有前后端字段以该文件为准。

主要接口：
- `/api/lexicon/:word` 解码单个词（音节、重音、字母块、用到的规则）
- `/api/rules` 规则库（含每条掌握度）
- `/api/stats/*` 今日统计、答题上报、错题本、易错归因
- `/api/srs/*` 间隔重复（到期队列、评分、统计）
- `/api/tts/*` 发音合成与缓存

## 数据说明

- **词条数据目前是 mock**：`server/lexicon/data.js` 收录约 85 个演示词，每条手工标了音节切分、重音位置与字母块对应关系。
- 后续计划换成离线词典（CMUdict 美音 / Britfone 英音），先覆盖常用 3000 词；**不追求全部词都能拆**——未收录的词明确提示「还没收录」，而不是给出错误拆解。
- 规则库 `server/lexicon/rules.js` 是手写内容，可随时扩充。

## 技术栈

- 后端：Node.js（>=22.5，内置 `node:sqlite`，零原生编译）+ Express
- 数据库：SQLite（WAL，单文件）
- 前端：原生 HTML/CSS/JS，无框架、无 CDN 依赖，可完全离线
- 部署：Docker Compose 单体应用

## 页面

| 路径 | 说明 |
|---|---|
| `/index.html` | 今日：阶段进度、今日 10 题、今日一词、薄弱规则 |
| `/phonics.html` | 拼读：规则库 / 解码器 / 练习 |
| `/ipa.html` | 音标：元音图、44 个音素、谐音、教学视频位 |
| `/scenario.html` | 场景：主题网格（英/粤切换） |
| `/topic.html?slug=` | 主题详情：词句 + 跟读录音 |
| `/flashcards.html` | 记忆卡 |
| `/review.html` | 复习：到期队列、易错归因、错题本 |
| `/me.html` | 我的：进度、发音、练习、外观设置 |
| `/yue.html` | 粤语：声调速查、主题、听音选词 |

主导航：今日 · 拼读 · 场景 · 复习 · 音标 · 我的。


## 关于依赖源（重要）

本项目作者本地使用公司内网 npm 镜像（速度快），但公开仓库里不能出现任何内网地址。

处理方式：**git clean filter**，在 `package-lock.json` 写入提交对象时自动把内网镜像地址改写为官方源，本地工作区文件保持不动。

- 提交内容永远是 `https://registry.npmjs.org/...`，可放心公开；
- 本地 `npm install` 仍走你自己配置的 registry，不受影响；
- 只改 URL 前缀，版本号与 `integrity` 哈希不动，安装结果完全一致。

**新克隆 / 换机器后需要启用一次**（每台机器每条克隆执行一次即可）：

```bash
node scripts/setup-git-filter.mjs
```

不启用也能正常开发，只是提交时内网地址不会被自动清洗——**启用前请确认你的提交里没有内网地址**：

```bash
git diff --cached | findstr utpf
```

相关文件：`scripts/normalize-lock.mjs`（清洗逻辑）、`.gitattributes`（把 filter 绑到该文件）。

## 版本

当前版本 **1.0.0**，页面底部统一显示。
