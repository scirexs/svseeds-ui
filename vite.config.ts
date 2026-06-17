import { sveltekit } from "@sveltejs/kit/vite";
import { defineConfig } from "vitest/config";
import { playwright } from "@vitest/browser-playwright";
import { svelteTesting } from "@testing-library/svelte/vite";

export default defineConfig({
  plugins: [
    sveltekit(),
  ],
  test: {
    projects: [{
      extends: "./vite.config.ts",
      plugins: [svelteTesting()],
      test: {
        name: "client",
        environment: "jsdom",
        clearMocks: true,
        include: [
          "tests/**/*.svelte.test.ts",
          "tests/**/*.test.ts",
        ],
        exclude: ["tests/**/*.browser.test.ts"],
        setupFiles: ["./tests/setup.ts"],
      },
    }, {
      extends: "./vite.config.ts",
      test: {
        name: "browser",
        include: ["tests/**/*.browser.test.ts"],
        browser: {
          enabled: true,
          provider: playwright(),
          headless: true,
          instances: [{ browser: "chromium" }]
        },
      },
    }],
  },
});
