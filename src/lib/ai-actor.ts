import { AsyncLocalStorage } from "node:async_hooks";

/* ============================================================
   NEXURA — AI ACTOR CONTEXT (per-request identity attribution)
   guard() (staff routes) and the portal session resolver set the
   authenticated actor for the remainder of the request's async
   chain; every AI call the request makes is then attributed to
   that identity in the AiUsageLog ledger — without threading an
   extra parameter through all 24 call sites.

   Honesty rules:
   - Identity is only captured from a VERIFIED session/token. No
     session (cron jobs, system paths, boot work) means the ledger
     row carries null identity — honestly unattributed, never a
     guess.
   - enterWith() scopes to the current async execution chain, so
     concurrent requests cannot see each other's actor.
   ============================================================ */

export interface AiActor {
  userId: string;
  role: string;
}

const storage = new AsyncLocalStorage<AiActor>();

/** Set the actor for the remainder of the current async chain.
 *  Call from session resolvers (guard(), portal session) right
 *  after the session is verified. */
export function setAiActor(actor: AiActor): void {
  storage.enterWith(actor);
}

/** The verified actor for the current request — null when the AI
 *  call did not originate from an authenticated session. */
export function getAiActor(): AiActor | null {
  return storage.getStore() ?? null;
}
