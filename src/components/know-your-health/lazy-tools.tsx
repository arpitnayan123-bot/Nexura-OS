"use client";
import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";
import type { ComponentType } from "react";

const loaders: Record<string, ComponentType<any>> = {
  "symptoms-checker": dynamic(() => import("./tools/symptoms-checker").then((m) => ({ default: m.SymptomsChecker }))),
  "lab-analyzer": dynamic(() => import("./tools/lab-analyzer").then((m) => ({ default: m.LabAnalyzer }))),
  "disease-risk": dynamic(() => import("./tools/disease-risk").then((m) => ({ default: m.DiseaseRisk }))),
  "derma-scan": dynamic(() => import("./tools/derma-scan").then((m) => ({ default: m.DermaScan }))),
  "xray-reader": dynamic(() => import("./tools/xray-reader").then((m) => ({ default: m.XrayReader }))),
  "food-scan": dynamic(() => import("./tools/food-scan").then((m) => ({ default: m.FoodScan }))),
  "diet-planner": dynamic(() => import("./tools/diet-planner").then((m) => ({ default: m.DietPlanner }))),
  "diabetes-care": dynamic(() => import("./tools/diabetes-care").then((m) => ({ default: m.DiabetesCare }))),
  "womens-care": dynamic(() => import("./tools/womens-care").then((m) => ({ default: m.WomensCare }))),
  "ayurveda": dynamic(() => import("./tools/ayurveda").then((m) => ({ default: m.Ayurveda }))),
  "health-quiz": dynamic(() => import("./tools/health-quiz").then((m) => ({ default: m.HealthQuiz }))),
  "mental-wellness": dynamic(() => import("./tools/mental-wellness").then((m) => ({ default: m.MentalWellness }))),
  "bp-analyzer": dynamic(() => import("./tools/bp-analyzer").then((m) => ({ default: m.BpAnalyzer }))),
  "sleep-quality": dynamic(() => import("./tools/sleep-quality").then((m) => ({ default: m.SleepQuality }))),
  "med-interaction": dynamic(() => import("./tools/med-interaction").then((m) => ({ default: m.MedInteraction }))),
};

export function LazyTool({ toolId }: { toolId: string }) {
  const Comp = loaders[toolId];
  if (!Comp) return <div className="grid h-40 place-items-center text-sm text-[#9A8F84]">Tool "{toolId}" not found.</div>;
  return (
    <div className="relative">
      <div className="absolute inset-0 -z-10 grid place-items-center"><Loader2 className="h-5 w-5 animate-spin text-[#9DB89E] opacity-30" /></div>
      <Comp />
    </div>
  );
}
