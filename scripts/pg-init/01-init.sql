-- Nexura Hospital OS — Postgres bootstrap (HaaS profile)
CREATE EXTENSION IF NOT EXISTS pg_trgm;   -- fast fuzzy patient search
CREATE EXTENSION IF NOT EXISTS pgcrypto;  -- column-level hashing helpers
