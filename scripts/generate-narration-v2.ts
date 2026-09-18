import ZAI from "z-ai-web-dev-sdk";
import fs from "fs";
import path from "path";

/* ============================================================
   NEXURA OS — ADVANCED VIDEO NARRATION
   Indian English voice, professional product demo script.
   ============================================================ */

const VOICE = "kazi"; // Clear, standard accent
const SPEED = 0.9; // Slower for clarity
const OUTPUT_DIR = "/home/z/my-project/video-narration-v2";

const SCENES = [
  {
    id: "01-hook",
    text: "This is Nexura OS. The healthcare operating system built for India. Seven products. One ecosystem. Built by a student from Bihar who walked into a hospital and saw a system failing. Not because people didn't care. But because the tools were from another century.",
  },
  {
    id: "02-homepage",
    text: "Every feature lives in one place. The homepage showcases seven products. From hospital management to AI health tools. Press Command K anywhere to open the command palette. Search, navigate, and jump to any product instantly.",
  },
  {
    id: "03-hospital-dash",
    text: "Hospital OS is the flagship. Eighteen modules covering every hospital workflow. The dashboard shows live K P I s. Bed occupancy, patients today, revenue collected, and critical alerts. Ward occupancy updates in real time. The revenue trend chart tracks the last seven days. And the live activity feed shows every event across the hospital as it happens.",
  },
  {
    id: "04-hospital-er-opd",
    text: "The Emergency module handles triage with E S I levels one through five. E R beds are color coded. Green for available, red for occupied. Ambulance fleet is tracked in real time. In O P D, the patient queue is token based. Click any patient to open the S O A P consultation workspace. Vitals, notes, prescriptions, and billing, all in one screen.",
  },
  {
    id: "05-clinic",
    text: "Clinic OS brings HealthPlix style E M R to Indian clinics. Today's queue is token based. Start a consultation with S O A P. Subjective, Objective, Assessment, Plan. The drug autocomplete pulls from fifty four Indian medicines. Type dolo and it suggests Dolo six fifty with salt composition and company. When the consultation ends, an invoice is auto generated.",
  },
  {
    id: "06-pharmacy",
    text: "Pharmacia is an A I powered pharmacy point of sale. Search any medicine by name, salt, or H S N code. The cart calculates C G S T and S G S T separately. When you add a Schedule H drug, a mandatory compliance popup appears. Requiring patient name, doctor name, and prescription details before the sale can proceed. This is C D S C O compliance built into the workflow.",
  },
  {
    id: "07-portal",
    text: "The Patient Portal unifies everything for the patient. One login shows all your health records. But the standout feature is Blood Checkup at Home. Book a test. A phlebotomist visits your address. The six step tracker shows progress. Booked, assigned, en route, sample collected, at lab, report ready. And then, A I interprets your lab values. It explains what each result means in plain language, with dietary and lifestyle recommendations. No competitor in India offers this.",
  },
  {
    id: "08-connect-kyh",
    text: "Nexura Connect bridges doctors and patients. Chat, voice, and video in one place. Prescriptions sync directly to the pharmacy. And Know Your Health offers fifteen A I powered tools. A symptom checker that triages urgency. A derma scan for skin conditions. An X ray reader using vision A I. A diet planner. A lab report analyzer. And more. All powered by G L M four Plus.",
  },
  {
    id: "09-investors",
    text: "The market is three hundred seventy two billion dollars. The government's A B D M mandate is forcing every hospital to digitize by twenty twenty six. Six hundred eighty million A B H A I D s already exist. Nexura OS is raising eight million dollars in seed funding. To scale from pilot to fifty hospitals, two hundred clinics, and one hundred pharmacies across four cities.",
  },
  {
    id: "10-founder",
    text: "And behind all of this is one person. Arpit Nayan. A student from Bihar. A self taught builder. He spent three months in hospital corridors in Patna. Listening, observing, understanding. He didn't see a lack of care. He saw fragmentation. So he built Nexura OS. Not an app. Not a tool. But the connective tissue. Not software. A promise.",
  },
  {
    id: "11-closing",
    text: "Nexura OS. Healthcare Operating System. Built in India, for one point four billion people.",
  },
];

async function main() {
  console.log("🎬 Generating advanced narration (Indian English)...\n");
  if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const zai = await ZAI.create();
  const results: { id: string; duration: number }[] = [];

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

      const { execSync } = await import("child_process");
      const durationStr = execSync(
        `ffprobe -i "${outputPath}" -show_entries format=duration -v quiet -of csv="p=0"`,
      )
        .toString()
        .trim();
      const duration = parseFloat(durationStr);
      results.push({ id: scene.id, duration });
      console.log(`    ✓ ${duration.toFixed(1)}s, ${(buffer.length / 1024).toFixed(0)} KB`);
      await new Promise((r) => setTimeout(r, 500));
    } catch (e: any) {
      console.error(`    ✗ ${scene.id}: ${e.message}`);
    }
  }

  const total = results.reduce((s, r) => s + r.duration, 0);
  console.log(`\n✅ Done! ${results.length} scenes, ${total.toFixed(1)}s total`);
  fs.writeFileSync(
    path.join(OUTPUT_DIR, "manifest.json"),
    JSON.stringify({ total, scenes: results }, null, 2),
  );
}

main().catch(console.error);
