"use client";

import { useEffect } from "react";

/** Registers the offline-first service worker + links the PWA manifest. */
export function PWARegister() {
  useEffect(() => {
    // link manifest
    if (!document.querySelector('link[rel="manifest"]')) {
      const link = document.createElement("link");
      link.rel = "manifest";
      link.href = "/manifest.json";
      document.head.appendChild(link);
    }
    // theme color
    if (!document.querySelector('meta[name="theme-color"]')) {
      const m = document.createElement("meta");
      m.name = "theme-color";
      m.content = "#D98B6E";
      document.head.appendChild(m);
    }
    // register SW
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    } else if ("serviceWorker" in navigator) {
      // also register in dev so the offline capability is demonstrable
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);
  return null;
}
