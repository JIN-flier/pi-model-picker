import type {
  ExtensionAPI,
  ExtensionContext,
} from "@earendil-works/pi-coding-agent";

import type { AutoModelConfig, Tier } from "./types.ts";

import { getPricingPeriod } from "./time-manager.ts";

// ============================================================
// Notification Helper
// ============================================================

function notify(
  ctx: ExtensionContext,
  message: string,
  level: "info" | "warning" | "error",
): void {
  if (!ctx.hasUI) return;

  ctx.ui.notify(message, level);
}

// ============================================================
// Model Switching
// ============================================================

export async function switchModelForTier(
  tier: Tier,
  ctx: ExtensionContext,
  pi: ExtensionAPI,
  config: AutoModelConfig,
): Promise<void> {
  // ----------------------------------------------------------
  // 1. Get Pricing Period
  // ----------------------------------------------------------

  const period = getPricingPeriod(config);

  const choice = config.plans[period][tier];

  // ----------------------------------------------------------
  // 2. Find Model
  // ----------------------------------------------------------

  const model = ctx.modelRegistry.find(choice.provider, choice.id);

  if (!model) {
    notify(ctx, `模型未注册：${choice.provider}/${choice.id}`, "error");

    return;
  }

  // ----------------------------------------------------------
  // 3. Check Session Model Scope
  // ----------------------------------------------------------

  const scopedModels = ctx.scopedModels;

  const isAllowed =
    scopedModels.length === 0 ||
    scopedModels.some(({ model: scopedModel }) => {
      return (
        scopedModel.provider === model.provider && scopedModel.id === model.id
      );
    });

  if (!isAllowed) {
    notify(
      ctx,
      `模型不在当前 Session 的允许范围内：${model.provider}/${model.id}`,
      "error",
    );

    return;
  }

  try {
    // --------------------------------------------------------
    // 4. Switch Model
    // --------------------------------------------------------

    const isSameModel =
      ctx.model?.provider === model.provider && ctx.model?.id === model.id;

    if (!isSameModel) {
      const success = await pi.setModel(model);

      if (!success) {
        notify(
          ctx,
          `模型切换失败，请检查 Provider 认证：${model.provider}`,
          "error",
        );

        // updateStatus(ctx, pi, config);

        return;
      }
    }

    // --------------------------------------------------------
    // 5. Set Thinking Level
    // --------------------------------------------------------

    pi.setThinkingLevel(choice.thinking);

    // --------------------------------------------------------
    // 6. Read Actual Thinking Level
    // --------------------------------------------------------

    const actualThinking = pi.getThinkingLevel();

    // --------------------------------------------------------
    // 7. Update Status
    // --------------------------------------------------------

    // updateStatus(ctx, pi, config);

    // --------------------------------------------------------
    // 8. Notify
    // --------------------------------------------------------

    const message = [
      "模型切换完成",
      `档位：${tier.toUpperCase()}`,
      `时段：${period}`,
      `模型：${model.provider}/${model.id}`,
      `Thinking：${actualThinking}`,
      actualThinking !== choice.thinking
        ? `注意：请求 ${choice.thinking}，实际生效 ${actualThinking}`
        : "",
    ]
      .filter(Boolean)
      .join("\n");

    notify(
      ctx,
      message,
      actualThinking === choice.thinking ? "info" : "warning",
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    notify(ctx, `模型切换失败：${message}`, "error");

    // updateStatus(ctx, pi, config);
  }
}
