# ══════════════════════════════════════════════════════
# Say Hi v1.0.0 —— 单体镜像
# 镜像名：say-hi:1.0.0（docker compose 会自动构建）
# 运行时需要 Python + edge-tts 做服务端发音合成，
# 所以基础镜像用装了 python3 的 node:22-slim。
# ══════════════════════════════════════════════════════

# ---- 依赖阶段：只装生产依赖 ----
FROM node:22-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

# ---- 运行阶段 ----
FROM node:22-slim
ENV NODE_ENV=production \
    PORT=3000 \
    DATA_DIR=/data \
    DEBIAN_FRONTEND=noninteractive \
    PYTHONUNBUFFERED=1

LABEL org.opencontainers.image.title="Say Hi" \
      org.opencontainers.image.description="自用的英语 + 粤语口语练习工具" \
      org.opencontainers.image.version="1.0.0"

# 发音依赖：edge-tts 通过 python 命令行调用（服务端合成 mp3，浏览器只负责播放）
# tzdata 让容器内 TZ 生效（影响「今日统计」与连续天数）
RUN apt-get update \
 && apt-get install -y --no-install-recommends \
      python3 \
      python3-pip \
      tzdata \
      ca-certificates \
 && pip3 install --no-cache-dir --break-system-packages "edge-tts>=7,<8" \
 && apt-get purge -y --auto-remove python3-pip \
 && apt-get clean \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY package.json ./
COPY server ./server
COPY public ./public

# 数据目录：SQLite 与发音缓存都落在这里，由 compose 挂到宿主
RUN mkdir -p /data && chown -R node:node /data /app

USER node
VOLUME ["/data"]
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/tts/status').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "server/index.js"]
