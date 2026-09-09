"use client";

import dynamic from "next/dynamic";

const ConnectApp = dynamic(
  () => import("./connect-app").then((m) => m.ConnectApp),
  {
    ssr: false,
    loading: () => (
      <div className="grid min-h-screen place-items-center bg-[#1F1B17]">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-white/20 border-t-[#D98B6E]" />
      </div>
    ),
  }
);

export function LazyConnectApp() {
  return <ConnectApp />;
}
