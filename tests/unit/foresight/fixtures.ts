/* Shared fixture for foresight engine tests — a fully "average"
   adult with no signals. Tests clone and override. */

import type { ForesightInput } from "@/modules/foresight/types";

export const EMPTY_INPUT: ForesightInput = {
  profile: { ageYears: 34, sexAtBirth: "male", heightCm: 172, weightKg: 68, waistCm: 82 },
  symptoms: [],
  diet: {
    type: "non_veg", cuisine: "north", sweetsPerWeek: "rare", friedPerWeek: "rare",
    sugaryDrinksPerWeek: "none", riceRotiBalance: "balanced", salt: "moderate",
    breakfastSkipped: false, outsideFoodPerWeek: 1,
  },
  activity: { minutesPerWeek: 150, kinds: ["walking"], occupation: "desk", shiftWork: false },
  sleep: { hoursPerNight: 7.5, quality: "good", snoring: "none", daytimeSleepiness: "none", schedule: "regular", screensBeforeBed: false },
  vitals: { systolic: 118, diastolic: 76, pulse: 72, spo2: 98 },
  labs: {},
  history: {
    conditions: [], familyHistory: [], tobacco: "never", alcohol: "never",
    stress: "low", moodLowDays: 0,
  },
  environment: { aqiBand: "good", sunlightMinutesPerDay: 25 },
};
