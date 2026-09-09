import ZAI from "z-ai-web-dev-sdk";
import fs from "fs";
import path from "path";

/* ============================================================
   NEXURA OS — VIDEO NARRATION SCRIPT
   Generates professional English voiceover for each feature.
   Uses z-ai TTS with 'jam' voice (English gentleman accent).
   ============================================================ */

const VOICE = "jam"; // English gentleman accent
const SPEED = 0.95; // Slightly slower for clarity
const OUTPUT_DIR = "/home/z/my-project/video-narration";

// Narration script — broken into scenes (< 1024 chars each)
const SCENES = [
  {
    id: "01-intro",
    text: "This is Nexura OS. The healthcare operating system built for India. Seven products. One ecosystem. Built by Arpit Nayan, a student from Bihar who walked into a hospital and saw a system failing — not because people didn't care, but because the tools were from another century. This is what he built.",
  },
  {
    id: "02-homepage",
    text: "The homepage introduces the entire ecosystem. Every feature is accessible from one place. Hospital OS for multi-specialty hospitals. Clinic OS for solo practitioners. Pharmacia for retail pharmacies. Patient Portal for patients. Connect for doctor-patient communication. Know Your Health with fifteen AI health tools. And Nexura Global for medical tourism. One command palette. Press Command K to search and jump anywhere.",
  },
  {
    id: "03-hospital",
    text: "Hospital OS is the flagship. Eighteen modules covering every hospital workflow. Dashboard with live KPIs, bed occupancy, and revenue trends. OPD with SOAP consultation and appointment queue. IPD with bed floor plan and patient monitoring. Emergency triage with ESI levels. Nursing station with NEWS2 scoring and electronic medication records. Laboratory and radiology order tracking. OT scheduling with surgery timelines. Billing with GST and insurance claims. EHR with longitudinal patient records. Plus an AI clinical assistant powered by GLM-4-Plus.",
  },
  {
    id: "04-clinic",
    text: "Clinic OS brings HealthPlix-style EMR to Indian clinics. Today's queue with token-based patient flow. SOAP consultation with drug autocomplete from fifty-four Indian medicines. ABHA registry integration for Ayushman Bharat. Public booking page so patients can book online. Auto-invoicing after every consultation. Simple, fast, and built for the doctor on the ground.",
  },
  {
    id: "05-pharmacy",
    text: "Pharmacia is an AI-powered pharmacy point of sale. Voice-to-bill in Hindi and English. Prescription OCR that reads doctor handwriting. GST e-invoice generation with IRN-ready JSON. Schedule H drug register for CDSCO compliance. Predictive analytics for dump stock and reordering. Salt finder for generic alternatives. Eight modules covering billing, inventory, purchases, suppliers, customers, compliance, reports, and settings.",
  },
  {
    id: "06-portal",
    text: "The Patient Portal unifies everything. One login. All your health records. Book a blood test at home. A trained phlebotomist visits your address. Collects the sample. The report is delivered on the portal within twenty-four hours. And then, AI interprets your lab values — explaining what each result means in plain language, with actionable recommendations. No competitor in India offers AI lab report interpretation at home.",
  },
  {
    id: "07-connect",
    text: "Nexura Connect bridges the gap between doctors and patients. Chat, voice, and video — all in one. When a consultation ends, the patient is automatically connected to their doctor for follow-up. When the symptom checker flags urgency, a real doctor is one tap away. Prescriptions sync directly to the pharmacy. It is communication designed for Indian healthcare.",
  },
  {
    id: "08-kyh",
    text: "Know Your Health offers fifteen AI-powered health tools. Symptom checker with urgency triage. Lab report analyzer. Derma scan for skin conditions. X-ray reader using vision AI. Diet planner. Mental wellness counselor. Blood pressure analyzer. Diabetes care. Women's health. Ayurveda recommendations. And more. All powered by GLM-4-Plus and vision language models.",
  },
  {
    id: "09-investors",
    text: "Nexura OS is raising eight million dollars in seed funding. The market is three hundred seventy-two billion dollars. The ABDM mandate is forcing every hospital to digitize by twenty twenty-six. Six hundred eighty million ABHA IDs have already been created. The unit economics work — thirteen point three times LTV to CAC ratio. The compliance moat is real — ABDM, DPDP, NABH, CDSCO, IRDAI, and GST, all built in from day one.",
  },
  {
    id: "10-founder",
    text: "And behind all of this is one person. Arpit Nayan. A student from Bihar. A self-taught builder. He didn't start with funding or a team. He started with an observation. Three months in hospital corridors in Patna. Listening to patients. Watching nurses. Shadowing doctors. He didn't see a lack of care. He saw fragmentation. And he decided to build the connective tissue. This is Nexura OS. Not software. A promise.",
  },
];

async function generateNarration() {
  console.log("🎬 Generating Nexura OS video narration...\n");

  // Create output directory
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const zai = await ZAI.create();
  const results: { id: string; path: string; duration: number }[] = [];

  for (const scene of SCENES) {
    try {
      console.log(`  Generating: ${scene.id} (${scene.text.length} chars)`);

      const response = await zai.audio.tts.create({
        input: scene.text,
        voice: VOICE,
        speed: SPEED,
        response_format: "wav",
        stream: false,
      });

      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(new Uint8Array(arrayBuffer));

      const outputPath = path.join(OUTPUT_DIR, `${scene.id}.wav`);
      fs.writeFileSync(outputPath, buffer);

      // Get duration using ffprobe
      const { execSync } = await import("child_process");
      const durationStr = execSync(
        `ffprobe -i "${outputPath}" -show_entries format=duration -v quiet -of csv="p=0"`
      ).toString().trim();
      const duration = parseFloat(durationStr);

      results.push({ id: scene.id, path: outputPath, duration });
      console.log(`    ✓ ${scene.id}.wav (${duration.toFixed(1)}s, ${(buffer.length / 1024).toFixed(0)} KB)`);

      // Small delay between requests
      await new Promise((r) => setTimeout(r, 500));
    } catch (e: any) {
      console.error(`    ✗ Failed: ${scene.id} — ${e.message}`);
    }
  }

  // Write manifest
  const manifest = {
    voice: VOICE,
    speed: SPEED,
    totalScenes: results.length,
    totalDuration: results.reduce((s, r) => s + r.duration, 0),
    scenes: results,
  };
  fs.writeFileSync(
    path.join(OUTPUT_DIR, "manifest.json"),
    JSON.stringify(manifest, null, 2)
  );

  console.log(`\n✅ Narration complete!`);
  console.log(`   ${results.length} scenes`);
  console.log(`   Total duration: ${manifest.totalDuration.toFixed(1)}s`);
  console.log(`   Output: ${OUTPUT_DIR}/`);

  return manifest;
}

generateNarration().catch(console.error);
