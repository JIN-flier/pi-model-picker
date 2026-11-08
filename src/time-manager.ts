import type { AutoModelConfig, PricingPeriod } from "./types.ts";

// ============================================================
// Get Local Time Parts
// ============================================================

function getTimeParts(now: Date, timeZone: string): Record<string, string> {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,

    year: "numeric",
    month: "2-digit",
    day: "2-digit",

    weekday: "short",

    hour: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);

  const result: Record<string, string> = {};

  for (const part of parts) {
    result[part.type] = part.value;
  }

  return result;
}

// ============================================================
// Pricing Period
// ============================================================

export function getPricingPeriod(
  config: AutoModelConfig,
  now = new Date(),
): PricingPeriod {
  const parts = getTimeParts(now, config.timeZone);

  const hour = Number(parts.hour);

  const date = [parts.year, parts.month, parts.day].join("-");

  const weekday = parts.weekday;

  // Monday - Friday
  const isWeekday = ["Mon", "Tue", "Wed", "Thu", "Fri"].includes(weekday);

  // Public holidays
  const isHoliday = config.holidays.includes(date);

  // Peak hours
  const isPeakHour = (hour >= 9 && hour < 12) || (hour >= 14 && hour < 18);

  return isWeekday && !isHoliday && isPeakHour ? "peak" : "offPeak";
}

// ============================================================
// Human-readable Period
// ============================================================

export function getPeriodLabel(period: PricingPeriod): string {
  return period === "peak" ? "PEAK" : "OFF-PEAK";
}
