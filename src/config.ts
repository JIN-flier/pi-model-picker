import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";

import {
  THINKING_LEVELS,
  type AutoModelConfig,
  type ModelChoice,
  type PricingPeriod,
  type TierPlan,
} from "./types.ts";
import { console } from "node:inspector";

// ============================================================
// Configuration Path
// ============================================================

export const CONFIG_PATH = join(homedir(), ".pi", "agent", "model-picker.json");

// ============================================================
// Validation Helpers
// ============================================================

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requiredString(value: unknown, path: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${path} must be a non-empty string`);
  }

  return value.trim();
}

function optionalBoolean(
  value: unknown,
  defaultValue: boolean,
  path: string,
): boolean {
  if (value === undefined) {
    return defaultValue;
  }

  if (typeof value !== "boolean") {
    throw new Error(`${path} must be a boolean`);
  }

  return value;
}

function isValidDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const date = new Date(`${value}T00:00:00Z`);

  return (
    !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
  );
}

// ============================================================
// Model Choice Validation
// ============================================================

function validateModelChoice(value: unknown, path: string): ModelChoice {
  if (!isRecord(value)) {
    throw new Error(`${path} must be an object`);
  }

  const provider = requiredString(value.provider, `${path}.provider`);

  const id = requiredString(value.id, `${path}.id`);

  const thinking = value.thinking;

  if (
    typeof thinking !== "string" ||
    !THINKING_LEVELS.includes(thinking as (typeof THINKING_LEVELS)[number])
  ) {
    throw new Error(`${path}.thinking has an invalid value`);
  }

  return {
    provider,
    id,
    thinking: thinking as ModelChoice["thinking"],
  };
}

// ============================================================
// Plan Validation
// ============================================================

function validateTierPlan(value: unknown, period: PricingPeriod): TierPlan {
  if (!isRecord(value)) {
    throw new Error(`plans.${period} must be an object`);
  }

  const result = {} as TierPlan;

  const tier_list: string[] = [];
  Object.keys(value).forEach((key) => {
    tier_list.push(key);
    result[key] = validateModelChoice(value[key], `plans.${period}.${key}`);
  });

  return result;
}

// ============================================================
// Full Configuration Validation
// ============================================================

export function validateConfig(value: unknown): AutoModelConfig {
  if (!isRecord(value)) {
    throw new Error("Configuration must be an object");
  }

  // Time zone
  const timeZone =
    value.timeZone === undefined
      ? "Asia/Shanghai"
      : requiredString(value.timeZone, "timeZone");

  try {
    new Intl.DateTimeFormat("en-US", {
      timeZone,
    });
  } catch {
    throw new Error(`Invalid timeZone: ${timeZone}`);
  }

  // Session prompt options
  const promptOnNewSession = optionalBoolean(
    value.promptOnNewSession,
    false,
    "promptOnNewSession",
  );

  const promptOnStartup = optionalBoolean(
    value.promptOnStartup,
    false,
    "promptOnStartup",
  );

  // Holidays
  const rawHolidays = value.holidays ?? [];

  if (!Array.isArray(rawHolidays)) {
    throw new Error("holidays must be an array");
  }

  const holidays = rawHolidays.map((date, index) => {
    if (typeof date !== "string" || !isValidDate(date)) {
      throw new Error(`holidays[${index}] must be YYYY-MM-DD`);
    }

    return date;
  });

  // Plans
  if (!isRecord(value.plans)) {
    throw new Error("plans must be an object");
  }

  const plans: AutoModelConfig["plans"] = {
    peak: validateTierPlan(value.plans.peak, "peak"),
    offPeak: validateTierPlan(value.plans.offPeak, "offPeak"),
  };

  return {
    timeZone,
    promptOnNewSession,
    promptOnStartup,
    holidays,
    plans,
  };
}

// ============================================================
// Load Configuration
// ============================================================

export async function loadConfig(): Promise<AutoModelConfig> {
  const raw = await readFile(CONFIG_PATH, "utf-8");

  let parsed: unknown;

  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(`Invalid JSON syntax in ${CONFIG_PATH}`);
  }

  return validateConfig(parsed);
}
