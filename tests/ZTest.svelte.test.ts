import { describe, expect, test } from "vitest";
import { render } from "vitest-browser-svelte";
import ZTest from "#svs/ZTest.svelte";

// Browser-mode sample: runs in real Chromium, so native Temporal is available
// both in the component and here in the test. No polyfill / jsdom mocks needed.
describe("ZTest (browser mode)", () => {
  test("renders today's date in ISO format", async () => {
    const today = Temporal.Now.plainDateISO();
    const screen = render(ZTest);

    await expect.element(screen.getByRole("button", { name: "button" })).toBeVisible();
    await expect.element(screen.getByText(today.toString())).toBeVisible();
  });

  test("advances the date by one day on click", async () => {
    const today = Temporal.Now.plainDateISO();
    const tomorrow = today.add({ days: 1 });
    const screen = render(ZTest);

    await screen.getByRole("button", { name: "button" }).click();

    await expect.element(screen.getByText(tomorrow.toString())).toBeVisible();
  });
});
