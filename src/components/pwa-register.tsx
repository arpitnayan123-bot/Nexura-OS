"use client";

import { useEffect } from "react";

/** PWA registration — installs the offline app shell + read-only cache.
 *  Writes are NEVER cached here; the IndexedDB offline buffer handles
 *  them via /api/nx/offline/sync when connectivity returns. */
export function PwaRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);
  return null;
}
