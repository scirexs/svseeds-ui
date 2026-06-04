import { sveltekit } from "@sveltejs/kit/vite";
import { defineConfig } from "vitest/config";
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
        setupFiles: ["./tests/setup.ts"],
      },
    }],
  },
});
