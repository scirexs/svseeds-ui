// Retained in jsdom: these assert long/negative/precise auto-dismiss & flip-removal timing driven by vi.useFakeTimers(), which fights chromium's real timers + Web Animations (see .ref/migration-test.md §"What to KEEP in jsdom").
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { configure, fireEvent, render, waitFor, within } from "@testing-library/svelte";
import { createRawSnippet, tick } from "svelte";
import Toast, { createToaster, type ToastItem } from "#svs/Toast.svelte";
import { PARTS, VARIANT } from "#svs/core";

const DEFAULT_MOTION = 200;
const DEFAULT_DISMISS = 30000;
const children = createRawSnippet<[ToastItem, string]>((item, variant) => ({
  render: () => `<div>${item().message}-${item().type}-${item().id}-${variant()}</div>`,
}));

function matchMediaMock(matches: boolean) {
  return vi.fn().mockImplementation((query) => ({
    matches,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
}

Object.defineProperty(window, "matchMedia", { writable: true, value: matchMediaMock(false) });
HTMLElement.prototype.showPopover = vi.fn();
HTMLElement.prototype.hidePopover = vi.fn();

beforeEach(() => {
  vi.useFakeTimers();
  window.matchMedia = matchMediaMock(false) as unknown as typeof window.matchMedia;
  configure({ defaultHidden: true });
});

afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.clearAllMocks();
  configure({ defaultHidden: false });
});

async function flush() {
  await Promise.resolve();
  await tick();
}
async function advance(ms: number) {
  await vi.advanceTimersByTimeAsync(ms);
  await tick();
}
function setup(options?: Parameters<typeof createToaster>[0], props: Partial<Parameters<typeof render<typeof Toast>>[1]> = {}) {
  const toaster = createToaster(options);
  return { toaster, ...render(Toast, { toaster, children, ...props }) };
}

describe("Toast duration behavior retained in jsdom", () => {
  test("[T-14] default safety-net auto-dismiss (30 s)", async () => {
    const { toaster, getByRole } = setup();
    const region = getByRole("region");
    toaster.add("Safety net");
    await waitFor(() => expect(region).toHaveAttribute("aria-label", "1 notifications"));
    await advance(DEFAULT_DISMISS - 1);
    expect(region).toHaveAttribute("aria-label", "1 notifications");
    await advance(1 + DEFAULT_MOTION);
    await waitFor(() => expect(region).toHaveAttribute("aria-label", "0 notifications"));
  });

  test("[T-15] Infinity persists", async () => {
    const persistent = setup({ duration: Infinity });
    const finite = setup({ duration: 100 });
    const persistentRegion = within(persistent.container).getByRole("region");
    const finiteRegion = within(finite.container).getByRole("region");
    persistent.toaster.add("Persistent");
    finite.toaster.add("One off", { duration: Infinity });
    await waitFor(() => expect(persistentRegion).toHaveAttribute("aria-label", "1 notifications"));
    await waitFor(() => expect(finiteRegion).toHaveAttribute("aria-label", "1 notifications"));
    await advance(DEFAULT_DISMISS + DEFAULT_MOTION + 1000);
    expect(persistentRegion).toHaveAttribute("aria-label", "1 notifications");
    expect(finiteRegion).toHaveAttribute("aria-label", "1 notifications");
  });
});

describe("Toast interaction timing retained in jsdom", () => {
  test("[T-20] pointer-enter pauses auto-dismiss", async () => {
    const timeout = 300;
    const { toaster, getByRole } = setup({ duration: timeout });
    const region = getByRole("region");
    toaster.add("Hover message");
    await flush();
    await fireEvent.pointerEnter(getByRole("status"));
    await advance(timeout + DEFAULT_MOTION + 100);
    expect(region).toHaveAttribute("aria-label", "1 notifications");
  });

  test("[T-21] pointer-leave (touch) re-arms x1.5", async () => {
    const timeout = 400;
    const { toaster, getByRole } = setup({ duration: timeout });
    const region = getByRole("region");
    toaster.add("Touch message");
    await flush();
    const status = getByRole("status");
    await fireEvent.pointerEnter(status);
    await fireEvent.pointerLeave(status, { pointerType: "touch" });
    await advance(timeout + 10);
    expect(region).toHaveAttribute("aria-label", "1 notifications");
    expect(getByRole("status")).toHaveClass(PARTS.MAIN, VARIANT.NEUTRAL);
    await advance(timeout * 0.5 - 10 + DEFAULT_MOTION);
    await waitFor(() => expect(region).toHaveAttribute("aria-label", "0 notifications"));
  });

  test("[T-22] pointer-cancel re-arms", async () => {
    const timeout = 300;
    const { toaster, getByRole } = setup({ duration: timeout });
    const region = getByRole("region");
    toaster.add("Cancel message");
    await flush();
    const status = getByRole("status");
    await advance(timeout - 50);
    await fireEvent.pointerCancel(status, { pointerType: "mouse" });
    await advance(50 + DEFAULT_MOTION);
    expect(region).toHaveAttribute("aria-label", "1 notifications");
    expect(status).toHaveClass(PARTS.MAIN, VARIANT.NEUTRAL);
    await advance(50 + DEFAULT_MOTION);
    await waitFor(() => expect(region).toHaveAttribute("aria-label", "0 notifications"));
  });
});

describe("Toast lifecycle timing retained in jsdom", () => {
  test("[T-31] motion prop controls leave removal delay", async () => {
    const motion = 350;
    const { toaster, getByRole } = setup({ duration: Infinity }, { motion });
    const region = getByRole("region");
    const id = toaster.add("Animated removal");
    await waitFor(() => expect(region).toHaveAttribute("aria-label", "1 notifications"));
    toaster.dismiss(id);
    await advance(motion - 1);
    expect(region).toHaveAttribute("aria-label", "1 notifications");
    expect(getByRole("status")).toHaveClass(PARTS.MAIN, VARIANT.INACTIVE);
    await advance(1);
    await waitFor(() => expect(region).toHaveAttribute("aria-label", "0 notifications"));
  });
});
