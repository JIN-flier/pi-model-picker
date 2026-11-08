import type {
  ExtensionAPI,
  ExtensionContext,
} from "@earendil-works/pi-coding-agent";

import { TIERS, type AutoModelConfig, type Tier } from "./types.ts";

import { getPricingPeriod } from "./time-manager.ts";

import { switchModelForTier } from "./model-manager.ts";

// ============================================================
// Show Model Selector
// ============================================================

export async function showModelSelector(
  ctx: ExtensionContext,
  pi: ExtensionAPI,
  config: AutoModelConfig,
): Promise<void> {
  if (!ctx.hasUI) return;

  // ----------------------------------------------------------
  // 1. Get Current Pricing Period
  // ----------------------------------------------------------

  const period = getPricingPeriod(config);

  // ----------------------------------------------------------
  // 2. Build Selection Options
  // ----------------------------------------------------------

  const options = TIERS.map((tier) => {
    const choice = config.plans[period][tier];

    return {
      tier,
      label: [
        tier.toUpperCase(),
        `${choice.provider}/${choice.id}`,
        `Thinking: ${choice.thinking}`,
      ].join(" | "),
    };
  });

  // ----------------------------------------------------------
  // 3. Show Native Selection Dialog
  // ----------------------------------------------------------

  const selected = await ctx.ui.select(
    `Select Model Tier (${period.toUpperCase()})`,
    options.map((option) => option.label),
  );

  // Esc or cancellation
  if (selected === undefined) {
    return;
  }

  // ----------------------------------------------------------
  // 4. Resolve Selected Tier
  // ----------------------------------------------------------

  const option = options.find((item) => item.label === selected);

  if (!option) {
    return;
  }

  const tier: Tier = option.tier;

  // ----------------------------------------------------------
  // 5. Switch Model
  // ----------------------------------------------------------

  await switchModelForTier(tier, ctx, pi, config);
}
