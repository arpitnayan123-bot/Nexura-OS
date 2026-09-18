"use client";
import dynamic from "next/dynamic";
const KnowYourHealthApp = dynamic(() => import("./app").then((m) => m.KnowYourHealthApp), {
  ssr: false,
  loading: () => (
    <div className="grid min-h-screen place-items-center bg-[#FAF7F2]">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#C9962E] border-t-[#9DB89E]" />
        <p className="text-xs text-[#9A8F84]">Loading AI health tools…</p>
      </div>
    </div>
  ),
});
export function LazyKnowYourHealth() {
  return <KnowYourHealthApp />;
}
