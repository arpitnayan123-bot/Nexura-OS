/* ============================================================
 * PIE Phase 1.4 — Social Determinants of Health
 * Geolocation-based context: AQI, weather, food-desert proximity,
 * neighborhood safety. Ships with a bundled regional dataset for
 * India (the demo deployment footprint) behind a provider
 * interface so a live AQI/weather API can be dropped in without
 * touching callers. Pure + deterministic.
 * ============================================================ */

export interface SdohSnapshot {
  regionKey: string;
  aqi: number | null; // 0..500
  tempC: number | null;
  humidity: number | null;
  foodDesertKm: number | null; // distance to nearest fresh-food market
  crimeIndex: number | null; // 0..100 normalized
  greenSpaceIndex: number | null; // 0..1
  provider: string;
}

export interface SdohProvider {
  fetch(regionKey: string): SdohSnapshot | null;
}

/** Bundled regional dataset — India metros + districts (demo footprint). */
const REGIONAL: Record<string, Omit<SdohSnapshot, "regionKey" | "provider">> = {
  "560001": {
    aqi: 95,
    tempC: 29,
    humidity: 62,
    foodDesertKm: 0.8,
    crimeIndex: 38,
    greenSpaceIndex: 0.41,
  }, // Bengaluru
  "110001": {
    aqi: 165,
    tempC: 31,
    humidity: 48,
    foodDesertKm: 1.1,
    crimeIndex: 52,
    greenSpaceIndex: 0.28,
  }, // New Delhi
  "400001": {
    aqi: 78,
    tempC: 30,
    humidity: 74,
    foodDesertKm: 0.6,
    crimeIndex: 44,
    greenSpaceIndex: 0.33,
  }, // Mumbai
  "700001": {
    aqi: 105,
    tempC: 31,
    humidity: 70,
    foodDesertKm: 1.4,
    crimeIndex: 47,
    greenSpaceIndex: 0.3,
  }, // Kolkata
  "600001": {
    aqi: 88,
    tempC: 32,
    humidity: 68,
    foodDesertKm: 0.9,
    crimeIndex: 40,
    greenSpaceIndex: 0.36,
  }, // Chennai
  "500001": {
    aqi: 92,
    tempC: 31,
    humidity: 55,
    foodDesertKm: 1.2,
    crimeIndex: 42,
    greenSpaceIndex: 0.31,
  }, // Hyderabad
  "411001": {
    aqi: 98,
    tempC: 28,
    humidity: 58,
    foodDesertKm: 1.0,
    crimeIndex: 43,
    greenSpaceIndex: 0.34,
  }, // Pune
  "380001": {
    aqi: 112,
    tempC: 33,
    humidity: 52,
    foodDesertKm: 1.8,
    crimeIndex: 45,
    greenSpaceIndex: 0.26,
  }, // Ahmedabad
  "302001": {
    aqi: 121,
    tempC: 32,
    humidity: 44,
    foodDesertKm: 2.1,
    crimeIndex: 49,
    greenSpaceIndex: 0.29,
  }, // Jaipur
  "226001": {
    aqi: 132,
    tempC: 30,
    humidity: 60,
    foodDesertKm: 2.4,
    crimeIndex: 55,
    greenSpaceIndex: 0.24,
  }, // Lucknow
  "682001": {
    aqi: 65,
    tempC: 30,
    humidity: 78,
    foodDesertKm: 0.7,
    crimeIndex: 35,
    greenSpaceIndex: 0.44,
  }, // Kochi
  "781001": {
    aqi: 58,
    tempC: 28,
    humidity: 75,
    foodDesertKm: 1.6,
    crimeIndex: 33,
    greenSpaceIndex: 0.52,
  }, // Guwahati
};

export const bundledProvider: SdohProvider = {
  fetch(regionKey: string): SdohSnapshot | null {
    const hit = REGIONAL[regionKey];
    if (!hit) return null;
    return { regionKey, provider: "nexura-regional-dataset", ...hit };
  },
};

let activeProvider: SdohProvider = bundledProvider;

/** Swap in a live AQI/weather provider at boot. */
export function setSdohProvider(p: SdohProvider) {
  activeProvider = p;
}

export function getSdoh(regionKey: string | null | undefined): SdohSnapshot | null {
  if (!regionKey) return null;
  const key = regionKey.trim();
  return activeProvider.fetch(key) ?? bundledProvider.fetch(key.slice(0, 3) === "IND" ? key : key);
}

/**
 * SDoH → risk modifiers consumed by the chronic-decay model.
 * Values are relative multipliers grounded in epidemiology:
 * high AQI worsens cardiopulmonary decay; food deserts worsen
 * diabetic control; high crime suppresses outdoor activity.
 */
export function sdohRiskModifiers(s: SdohSnapshot | null): {
  cardiopulmonary: number;
  metabolic: number;
  activity: number;
  notes: string[];
} {
  if (!s) return { cardiopulmonary: 1, metabolic: 1, activity: 1, notes: [] };
  const notes: string[] = [];
  let cardio = 1,
    meta = 1,
    act = 1;
  if (s.aqi !== null && s.aqi > 100) {
    cardio *= 1 + Math.min(0.25, (s.aqi - 100) / 400);
    notes.push(`AQI ${s.aqi} — sustained particulate exposure`);
  }
  if (s.foodDesertKm !== null && s.foodDesertKm > 1.5) {
    meta *= 1 + Math.min(0.15, (s.foodDesertKm - 1.5) / 10);
    notes.push(`fresh food ${s.foodDesertKm}km away — dietary control headwind`);
  }
  if (s.crimeIndex !== null && s.crimeIndex > 50) {
    act *= 0.85;
    notes.push("neighborhood safety limits outdoor activity");
  }
  if (s.greenSpaceIndex !== null && s.greenSpaceIndex < 0.3) {
    act *= 0.92;
    notes.push("low green-space access");
  }
  return {
    cardiopulmonary: Number(cardio.toFixed(3)),
    metabolic: Number(meta.toFixed(3)),
    activity: Number(act.toFixed(3)),
    notes,
  };
}
