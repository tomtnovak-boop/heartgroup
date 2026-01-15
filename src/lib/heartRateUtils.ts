// Heart Rate Zone Calculation Utilities

export interface HeartRateZone {
  zone: number;
  name: string;
  minPercent: number;
  maxPercent: number;
  color: string;
  bgClass: string;
}

export const HEART_RATE_ZONES: HeartRateZone[] = [
  { zone: 1, name: "Recovery", minPercent: 0, maxPercent: 60, color: "hsl(220 15% 45%)", bgClass: "zone-1-bg" },
  { zone: 2, name: "Fat Burn", minPercent: 60, maxPercent: 70, color: "hsl(200 100% 50%)", bgClass: "zone-2-bg" },
  { zone: 3, name: "Aerobic", minPercent: 70, maxPercent: 80, color: "hsl(145 80% 45%)", bgClass: "zone-3-bg" },
  { zone: 4, name: "Anaerobic", minPercent: 80, maxPercent: 90, color: "hsl(45 100% 50%)", bgClass: "zone-4-bg" },
  { zone: 5, name: "Max Effort", minPercent: 90, maxPercent: 100, color: "hsl(0 100% 55%)", bgClass: "zone-5-bg" },
];

/**
 * Calculate max heart rate based on age
 * Uses standard formula (220 - age) for age <= 40
 * Uses Tanaka formula (208 - 0.7 * age) for age > 40
 */
export function calculateMaxHR(age: number): number {
  if (age > 40) {
    // Tanaka formula for better accuracy in older adults
    return Math.round(208 - (0.7 * age));
  }
  return 220 - age;
}

/**
 * Get the effective max HR for a profile
 * Uses custom_max_hr if set, otherwise calculates based on age
 */
export function getEffectiveMaxHR(age: number, customMaxHR?: number | null): number {
  if (customMaxHR && customMaxHR > 0) {
    return customMaxHR;
  }
  return calculateMaxHR(age);
}

export function calculateHRPercentage(bpm: number, maxHR: number): number {
  return Math.round((bpm / maxHR) * 100);
}

export function calculateZone(bpm: number, maxHR: number): number {
  const percentage = (bpm / maxHR) * 100;
  
  if (percentage < 60) return 1;
  if (percentage < 70) return 2;
  if (percentage < 80) return 3;
  if (percentage < 90) return 4;
  return 5;
}

export function getZoneInfo(zone: number): HeartRateZone {
  return HEART_RATE_ZONES[zone - 1] || HEART_RATE_ZONES[0];
}

export function getZoneColor(zone: number): string {
  return getZoneInfo(zone).color;
}

export function getZoneBgClass(zone: number): string {
  return getZoneInfo(zone).bgClass;
}
