import { sveltekit } from "@sveltejs/kit/vite";
import { defineConfig } from "vite";
import deno from "@deno/vite-plugin";
import { svelteTesting } from "@testing-library/svelte/vite";

export default defineConfig({
  plugins: [
    deno(),
    sveltekit(),
  ],
  test: {
    workspace: [{
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
