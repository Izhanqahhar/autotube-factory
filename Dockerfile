# ── Stage 1: Install dependencies ─────────────────────────────────────────────
FROM node:20-alpine AS deps
WORKDIR /app

RUN apk add --no-cache openssl

COPY package.json package-lock.json ./
RUN npm ci

# ── Stage 2: Build the Next.js app ────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

RUN apk add --no-cache openssl

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build Next.js (standalone output)
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ── Stage 3: Production runtime ───────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

# openssl for Prisma + Python3 + pip for TTS (edge-tts, gtts)
# fontconfig + fonts for sharp SVG text rendering (thumbnails)
RUN apk add --no-cache openssl python3 py3-pip fontconfig ttf-freefont font-noto && \
    pip3 install --no-cache-dir --break-system-packages edge-tts gtts && \
    fc-cache -f

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3001
ENV HOSTNAME=0.0.0.0

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# ── Copy Next.js standalone server ────────────────────────────────────────────
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# ── Copy Prisma (schema + migrations + CLI + engines) ─────────────────────────
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/prisma ./node_modules/prisma

RUN chown -R nextjs:nodejs /app

USER nextjs

EXPOSE 3001

# At startup:
# 1. Create all generated subdirs (volume mount overlays the image layer)
# 2. Run DB migrations
# 3. Start the Next.js server
CMD ["sh", "-c", "\
  mkdir -p /app/public/generated/images \
            /app/public/generated/thumbnails \
            /app/public/generated/subtitles \
            /app/public/generated/audio \
            /app/data && \
  node node_modules/prisma/build/index.js migrate deploy && \
  node server.js"]
