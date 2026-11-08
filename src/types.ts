import type { ExtensionContext } from "@earendil-works/pi-coding-agent";

// ============================================================
// Basic Types
// ============================================================

export type Tier = string[number];

export type PricingPeriod = "peak" | "offPeak";

export const THINKING_LEVELS = [
  "off",
  "minimal",
  "low",
  "medium",
  "high",
  "xhigh",
  "max",
] as const;

export type ThinkingLevel = (typeof THINKING_LEVELS)[number];

// ============================================================
// Model Configuration
// ============================================================

export interface ModelChoice {
  provider: string;
  id: string;
  thinking: ThinkingLevel;
}

export type TierPlan = Record<Tier, ModelChoice>;

export interface AutoModelConfig {
  timeZone: string;

  promptOnNewSession: boolean;
  promptOnStartup: boolean;

  holidays: string[];

  plans: Record<PricingPeriod, TierPlan>;
}

// ============================================================
// Shared Context
// ============================================================

export type ModelContext = ExtensionContext;
