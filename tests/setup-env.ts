import { config } from "dotenv";
import path from "path";

/* ============================================================
   HERMETIC TEST ENVIRONMENT
   The host environment (sandbox boot chain, CI/cache layers) can
   inject a stale DATABASE_URL into every process, and process env
   beats Prisma's .env resolution. The workspace .env is the source
   of truth for local/test runs, so it OVERRIDES inherited values
   here. In CI (no .env file) dotenv no-ops and the workflow's
   explicit env (Postgres service) applies untouched.
   ============================================================ */
config({ path: path.resolve(__dirname, "../.env"), override: true });
