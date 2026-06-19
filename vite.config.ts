import { svelte } from "@sveltejs/vite-plugin-svelte";
import { defineConfig } from "vitest/config";
import { playwright } from "@vitest/browser-playwright";
import { svelteTesting } from "@testing-library/svelte/vite";

export default defineConfig({
  plugins: [
    svelte(),
  ],
  test: {
    projects: [{
      extends: "./vite.config.ts",
      test: {
        name: "client",
        include: ["tests/**/*.svelte.test.ts"],
        browser: {
          enabled: true,
          provider: playwright(),
          headless: true,
          instances: [{ browser: "chromium" }]
        },
      },
    }, {
      extends: "./vite.config.ts",
      plugins: [svelteTesting()],
      test: {
        name: "simulation",
        environment: "jsdom",
        clearMocks: true,
        include: [
          "tests/**/*.svelte.sim.test.ts",
          "tests/_core.test.ts",
        ],
        setupFiles: ["./tests/sim-setup.ts"],
      },
    }],
  },
});
