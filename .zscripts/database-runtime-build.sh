#!/bin/bash

set -euo pipefail

PROJECT_DIR="${PROJECT_DIR:-/home/z/my-project}"
BUILD_DIR="${BUILD_DIR:?BUILD_DIR is required}"
SCHEMA="$PROJECT_DIR/prisma/schema.prisma"
SOURCE_DB_DIR="$PROJECT_DIR/db"
SOURCE_DB_PATH="$SOURCE_DB_DIR/custom.db"
TARGET_DB_DIR="$BUILD_DIR/db"
TARGET_DB_PATH="$TARGET_DB_DIR/custom.db"

mkdir -p "$TARGET_DB_DIR"

# Extract the DATASOURCE provider (not the generator's — schema.prisma has
# two provider lines: generator "prisma-client-js" + datasource "postgresql").
PROVIDER="$(awk '/^datasource /,/^\}/' "$SCHEMA" | grep -E '^\s*provider\s*=' | head -1 | sed 's/.*"\([^"]*\)".*/\1/')"
echo "🗄️  Prisma datasource provider: $PROVIDER"

if [ "$PROVIDER" != "postgresql" ]; then
    # ------------------------------------------------------------------
    # PLATFORM TEMPLATE PATH (SQLite-native projects) — unchanged behavior:
    # copy the preview DB when present, otherwise push the schema into a
    # fresh package DB. The generated client already matches the schema.
    # ------------------------------------------------------------------
    if [ -f "$SOURCE_DB_PATH" ]; then
        echo "🗄️  复制 Preview 数据库到构建产物..."
        cp -a "$SOURCE_DB_DIR/." "$TARGET_DB_DIR/"
    else
        echo "ℹ️  未找到 Preview 数据库 db/custom.db，将初始化空的生产数据库"
    fi

    echo "🗄️  同步构建产物中的数据库结构..."
    (
        cd "$PROJECT_DIR"
        DATABASE_URL="file:$TARGET_DB_PATH" bun run db:push
    )

    if [ ! -f "$TARGET_DB_PATH" ]; then
        echo "❌ 数据库初始化命令执行成功，但未生成 $TARGET_DB_PATH"
        exit 1
    fi

    echo "✅ 构建产物数据库已准备完成"
    ls -lah "$TARGET_DB_DIR"
    exit 0
fi

# ------------------------------------------------------------------
# POSTGRES-PROJECT PATH (e.g. Nexura OS) — the sandbox runs a real
# Postgres, but the deployed FC package has no Postgres/Redis service.
# The publish contract is a SELF-CONTAINED package, so:
#   1. derive a SQLite deploy schema from the project schema (provider
#      + url swap — the schema must stay enum/scalar-list-free),
#   2. push it into the package DB,
#   3. generate the CLIENT from the deploy schema so `next build`
#      bundles a SQLite-capable client (the client is provider-locked
#      at generate time),
#   4. seed the package DB with the demo dataset.
# The sandbox keeps its Postgres client: every sandbox entry point
# (`build`, guardian rebuild) re-runs `prisma generate` from
# schema.prisma, restoring it automatically.
# ------------------------------------------------------------------
DEPLOY_SCHEMA="$PROJECT_DIR/prisma/schema.deploy.prisma"
echo "🧬 生成 SQLite 部署 schema -> $DEPLOY_SCHEMA"
# - provider swap: postgresql -> sqlite
# - strip named constraints (`map: "..."`) — SQLite has no named FKs; the
#   remaining @relation/@@unique syntax is identical on both dialects.
sed -e 's/provider = "postgresql"/provider = "sqlite"/' \
    -E -e 's/,[[:space:]]*map:[[:space:]]*"[^"]*"//g' \
    -e 's|url[[:space:]]*=[[:space:]]*env("DATABASE_URL")|url = env("DATABASE_URL")|' \
    "$SCHEMA" > "$DEPLOY_SCHEMA"
grep -q 'provider = "sqlite"' "$DEPLOY_SCHEMA" || {
    echo "❌ 部署 schema 生成失败（provider 未切换）"
    exit 1
}

echo "🗄️  初始化部署包 SQLite 数据库 (prisma db push)..."
(
    cd "$PROJECT_DIR"
    DATABASE_URL="file:$TARGET_DB_PATH" bunx prisma db push \
        --schema="$DEPLOY_SCHEMA" --accept-data-loss --skip-generate
)

if [ ! -f "$TARGET_DB_PATH" ]; then
    echo "❌ 部署数据库初始化成功但未生成 $TARGET_DB_PATH"
    exit 1
fi

echo "🧬 生成 SQLite Prisma client（供 next build 打包）..."
(
    cd "$PROJECT_DIR"
    bunx prisma generate --schema="$DEPLOY_SCHEMA"
)

echo "🌱 为部署包数据库播种演示数据（DEMO_MODE）..."
(
    cd "$PROJECT_DIR"
    export DATABASE_URL="file:$TARGET_DB_PATH"
    export DEMO_MODE=true
    export NEXURA_PACKAGED=1
    export JWT_SECRET="${JWT_SECRET:-nexura-packaged-demo-jwt-secret-0123456789}"
    export EMAIL_TRANSPORT=console
    export NEXURA_JOBS=off
    # Core demo dataset — hospital OS, pharmacy, clinic, portal, connect,
    # tourism. Heavy telemetry seeds (PIE/chronic) are skipped to keep the
    # publish build inside the platform's time budget.
    bun scripts/legacy/seed-hospital.ts
    bun scripts/seed-nx.ts
    bun scripts/seed-nx-v4.ts
    bun scripts/seed-hospital-bootstrap.ts
    bun scripts/legacy/seed-pharmacy.ts
    bun scripts/seed-pharmacy-compliance.ts
    bun scripts/seed-clinic-drugs.ts
    bun scripts/legacy/seed-clinic.ts
    bun scripts/seed-connect.ts
    bun scripts/seed-portal.ts
    bun scripts/seed-tourism.ts
)

echo "✅ 构建产物数据库已准备完成（含演示数据）"
ls -lah "$TARGET_DB_DIR"
# Keep the tree clean — the deploy schema is a build-time artifact.
rm -f "$DEPLOY_SCHEMA"
