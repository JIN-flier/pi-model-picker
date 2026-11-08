import type {
  ExtensionAPI,
  ExtensionContext,
} from "@earendil-works/pi-coding-agent";

import { type AutoModelConfig, type Tier } from "./types.ts";

import { CONFIG_PATH, loadConfig } from "./config.ts";

import { getPricingPeriod } from "./time-manager.ts";

import { switchModelForTier } from "./model-manager.ts";

import { showModelSelector } from "./model-selector.ts";

// ============================================================
// Helpers
// ============================================================

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function notify(
  ctx: ExtensionContext,
  message: string,
  level: "info" | "warning" | "error",
): void {
  if (!ctx.hasUI) return;

  ctx.ui.notify(message, level);
}

// ============================================================
// Extension Entry
// ============================================================

export default async function (pi: ExtensionAPI) {
  // ----------------------------------------------------------
  // 1. Configuration State
  // ----------------------------------------------------------

  let config: AutoModelConfig | undefined;

  let configError: string | undefined;

  try {
    config = await loadConfig();
  } catch (error) {
    configError = getErrorMessage(error);
  }

  // ----------------------------------------------------------
  // 2. Session Lifecycle
  // ----------------------------------------------------------

  pi.on("session_start", async (event, ctx) => {
    // Configuration unavailable
    if (!config) {
      if (ctx.hasUI) {
        ctx.ui.notify(
          `无法加载配置文件：${configError ?? CONFIG_PATH}`,
          "error",
        );
      }

      return;
    }

    // --------------------------------------------------------
    // Automatic Model Selector
    // --------------------------------------------------------

    const shouldPrompt =
      (event.reason === "new" && config.promptOnNewSession) ||
      (event.reason === "startup" && config.promptOnStartup);

    if (shouldPrompt && ctx.hasUI) {
      await showModelSelector(ctx, pi, config);
    }
  });

  // ==========================================================
  // 7. Register Command
  // ==========================================================

  pi.registerCommand("model-picker", {
    description: "Interactive model manager",

    handler: async (args, ctx) => {
      const command = args.trim().toLowerCase();

      // ------------------------------------------------------
      // Reload Configuration
      // ------------------------------------------------------

      if (command === "reload") {
        try {
          const newConfig = await loadConfig();

          config = newConfig;
          configError = undefined;

          notify(ctx, "模型配置已重新加载", "info");
        } catch (error) {
          const message = getErrorMessage(error);

          configError = message;

          notify(
            ctx,
            `配置重新加载失败，保留原有有效配置：${message}`,
            "error",
          );
        }

        return;
      }

      // ------------------------------------------------------
      // Show Current Status
      // ------------------------------------------------------

      if (command === "status") {
        if (!config) {
          notify(ctx, `配置不可用：${configError ?? CONFIG_PATH}`, "error");

          return;
        }

        const period = getPricingPeriod(config);

        const modelName = ctx.model
          ? `${ctx.model.provider}/${ctx.model.id}`
          : "NO MODEL";

        const thinking = pi.getThinkingLevel();

        const message = [
          "Model Manager Status",
          `Period: ${period}`,
          `Model: ${modelName}`,
          `Thinking: ${thinking}`,
          `Config: ${CONFIG_PATH}`,
        ].join("\n");

        notify(ctx, message, "info");

        return;
      }

      // ------------------------------------------------------
      // Check Configuration
      // ------------------------------------------------------

      if (!config) {
        notify(ctx, `配置不可用：${configError ?? CONFIG_PATH}`, "error");

        return;
      }

      // ------------------------------------------------------
      // No Arguments: Interactive Selector
      // ------------------------------------------------------

      if (!command) {
        await showModelSelector(ctx, pi, config);

        return;
      }

      // ------------------------------------------------------
      // Direct Tier Selection
      // ------------------------------------------------------

      const tier_list: string[] = [];
      Object.keys(config.plans.peak).forEach((key) => {
        tier_list.push(key);
      });

      const tier = tier_list.find((item) => item === command);

      if (tier) {
        await switchModelForTier(tier as Tier, ctx, pi, config);

        return;
      }

      // ------------------------------------------------------
      // Invalid Arguments
      // ------------------------------------------------------

      notify(
        ctx,
        [
          "用法：",
          "/model-picker",
          "/model-picker <your tier>",
          "/model-picker reload",
          "/model-picker status",
        ].join("\n"),
        "warning",
      );
    },
  });
}
