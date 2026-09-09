# Nexura Hospital OS — production image (Next.js standalone)
FROM oven/bun:1 AS deps
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

FROM oven/bun:1 AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NODE_ENV=production
# Prisma client generation for the target platform
RUN bunx prisma generate
# DATABASE_URL is required at build-time only for typegen — a dummy is fine
ENV DATABASE_URL=file:/tmp/build.db
# Fail the image build when the app build fails — no silent fallback that can
# pull a different toolchain mid-build and mask a broken bun pipeline.
RUN bun run build

FROM node:24-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
# non-root user
RUN groupadd -g 1001 nodejs && useradd -u 1001 -g nodejs -m nextjs
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/prisma ./prisma
# runtime data volume for SQLite
RUN mkdir -p /app/db && chown -R nextjs:nodejs /app
USER nextjs
VOLUME ["/app/db"]
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "server.js"]
