import { cloudflareTest } from "@cloudflare/vitest-plugin";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [
    cloudflareTest({
      wrangler: { configPath: "./wrangler.jsonc" },
      miniflare: {
        bindings: { ENV: "test", DEV_EMAIL: "owner@example.com", ALLOWED_EMAIL: "owner@example.com", ANTHROPIC_API_KEY: "test-key", AI_DAILY_CALLS: "3", AI_API_URL: "https://ai.test/v1/messages" },
      },
    }),
  ],
  test: { include: ["test/worker/**/*.test.js"] },
});
