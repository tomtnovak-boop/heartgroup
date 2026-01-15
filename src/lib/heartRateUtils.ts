// Heart Rate Zone Calculation Utilities

/**
 * Calculate age from birth date
 */
export function calculateAgeFromBirthDate(birthDate: Date): number {
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}

/**
 * Get effective age from birth date or manual age
 */
export function getEffectiveAge(birthDate: Date | string | null, manualAge: number | null): number {
  if (birthDate) {
    const date = typeof birthDate === 'string' ? new Date(birthDate) : birthDate;
    return calculateAgeFromBirthDate(date);
  }
  return manualAge || 30;
}

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
 * Calculate max heart rate based on age using Tanaka formula
 * HFmax = 208 - (0.7 * age)
 * This formula is used for all age groups
 */
export function calculateMaxHR(age: number): number {
  return Math.round(208 - (0.7 * age));
}

/**
 * Get the effective max HR for a profile
 * Uses custom_max_hr if set, otherwise calculates based on age using Tanaka
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
