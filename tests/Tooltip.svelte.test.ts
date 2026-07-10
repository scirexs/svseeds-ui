import axe from "axe-core";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { createRawSnippet, tick } from "svelte";
import { initTooltip, tooltip, type TooltipParams } from "#svs/Tooltip.svelte";
import { PARTS, VARIANT, type SVSVariant } from "#svs/core";

import type { AxeMatchers } from "vitest-axe/matchers";

declare module "vitest" {
  interface Assertion<T = any> extends AxeMatchers {}
}

const triggers: HTMLElement[] = [];
const cleanups: Array<() => void> = [];
function makeTrigger(): HTMLButtonElement {
  const btn = document.createElement("button");
  btn.style.pointerEvents = "none";
  document.body.appendChild(btn);
  triggers.push(btn);
  return btn;
}
function attach(node: HTMLElement, params: TooltipParams) {
  const cleanup = tooltip(params)(node) as () => void;
  cleanups.push(cleanup);
  return cleanup;
}
function resetTooltipDefaults() {
  initTooltip({
    position: "top",
    align: "center",
    offset: { x: 0, y: 0 },
    delay: 1000,
    cursor: false,
    variant: VARIANT.NEUTRAL,
    styling: undefined,
  });
}
function setHover(can: boolean) {
  vi.stubGlobal(
    "matchMedia",
    vi.fn().mockReturnValue({
      matches: can,
      media: "",
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }),
  );
}
async function enter(trigger: HTMLElement, pointer: PointerEventInit = {}) {
  await tick();
  trigger.dispatchEvent(new PointerEvent("pointerenter", { bubbles: true, ...pointer }));
  await tick();
}
async function press(trigger: HTMLElement, pointer: PointerEventInit = {}) {
  await tick();
  trigger.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, ...pointer }));
  await tick();
}
async function pointer(trigger: HTMLElement, type: string, init: PointerEventInit = {}) {
  trigger.dispatchEvent(new PointerEvent(type, { bubbles: true, ...init }));
  await tick();
}
async function showAfter(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms + 10));
  await tick();
}
const queryTip = () => document.querySelector('[role="tooltip"]');
const getTip = () => queryTip() as HTMLElement;

beforeEach(() => setHover(true));
afterEach(async () => {
  cleanups.forEach((cleanup) => cleanup());
  cleanups.length = 0;
  await tick();
  triggers.forEach((trigger) => trigger.remove());
  triggers.length = 0;
  resetTooltipDefaults();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("Basic rendering", () => {
  test("[TT-1] nothing mounted before first hover", () => expect(queryTip()).toBeNull());
  test("[TT-2] mounts on pointerenter and becomes visible only after the delay", async () => {
    const trigger = makeTrigger();
    attach(trigger, { text: "Hello", delay: 100 });
    await enter(trigger);
    expect(getTip().style.visibility).toBe("hidden");
    await expect.element(getTip()).toHaveTextContent("Hello");
    await vi.waitFor(() => expect(getTip().style.visibility).toBe("visible"));
  });
  test("[TT-3] hides on pointerleave", async () => {
    const trigger = makeTrigger();
    attach(trigger, { text: "Bye", delay: 10 });
    await enter(trigger);
    await showAfter(10);
    await pointer(trigger, "pointerleave");
    expect(queryTip()).toBeNull();
  });
  test("[TT-4] hides on pointercancel", async () => {
    const trigger = makeTrigger();
    attach(trigger, { text: "Cancel", delay: 10 });
    await enter(trigger);
    await showAfter(10);
    await pointer(trigger, "pointercancel");
    expect(queryTip()).toBeNull();
  });
});

describe("Touch long-press fallback", () => {
  test("[TT-5] pointerdown shows after the delay on touch; pointerenter does nothing", async () => {
    setHover(false);
    const trigger = makeTrigger();
    attach(trigger, { text: "Touch", delay: 100 });
    await enter(trigger);
    await showAfter(200);
    expect(queryTip()).toBeNull();
    await press(trigger, { clientX: 100, clientY: 100 });
    expect(getTip().style.visibility).toBe("hidden");
    await expect.element(getTip()).toHaveTextContent("Touch");
    await vi.waitFor(() => expect(getTip().style.visibility).toBe("visible"));
  });
  test("[TT-6] pointerup hides after shown", async () => {
    setHover(false);
    const trigger = makeTrigger();
    attach(trigger, { text: "Up", delay: 10 });
    await press(trigger, { clientX: 0, clientY: 0 });
    await showAfter(10);
    await pointer(trigger, "pointerup");
    expect(queryTip()).toBeNull();
  });
  test("[TT-7] pointerup before the delay cancels the pending show", async () => {
    setHover(false);
    const trigger = makeTrigger();
    attach(trigger, { text: "Cancel-up", delay: 100 });
    await press(trigger, { clientX: 0, clientY: 0 });
    expect(getTip().style.visibility).toBe("hidden");
    await pointer(trigger, "pointerup");
    await showAfter(100);
    expect(queryTip()).toBeNull();
  });
  test("[TT-8] pointercancel and pointerleave hide on the touch path", async () => {
    for (const type of ["pointercancel", "pointerleave"]) {
      setHover(false);
      const trigger = makeTrigger();
      attach(trigger, { text: "Hide", delay: 10 });
      await press(trigger, { clientX: 0, clientY: 0 });
      await vi.waitFor(() => expect(getTip().style.visibility).toBe("visible"));
      await pointer(trigger, type);
      expect(queryTip()).toBeNull();
    }
  });
  test("[TT-9] pointermove beyond the threshold cancels/hides", async () => {
    setHover(false);
    const trigger = makeTrigger();
    attach(trigger, { text: "Move", delay: 100 });
    await press(trigger, { clientX: 100, clientY: 100 });
    await pointer(trigger, "pointermove", { clientX: 100, clientY: 120 });
    await showAfter(100);
    expect(queryTip()).toBeNull();
  });
  test("[TT-10] small pointermove within the threshold keeps the tooltip", async () => {
    setHover(false);
    const trigger = makeTrigger();
    attach(trigger, { text: "Stay", delay: 50 });
    await press(trigger, { clientX: 100, clientY: 100 });
    await pointer(trigger, "pointermove", { clientX: 104, clientY: 103 });
    await vi.waitFor(() => expect(getTip().style.visibility).toBe("visible"));
  });
  test("[TT-12] cursor:true does not enable cursor tracking on touch", async () => {
    setHover(false);
    const trigger = makeTrigger();
    attach(trigger, { text: "Cur", delay: 50, cursor: true });
    await press(trigger, { clientX: 100, clientY: 100 });
    await pointer(trigger, "pointermove", { clientX: 100, clientY: 130 });
    await showAfter(50);
    expect(queryTip()).toBeNull();
  });
});

describe("tooltip attachment factory", () => {
  const blankContent = createRawSnippet<[string, SVSVariant, boolean]>(() => ({ render: () => "<span></span>" }));
  test("[TT-13] returns an attachment that yields a cleanup function", () => {
    const factory = tooltip({ text: "x" });
    expect(typeof factory).toBe("function");
    const cleanup = factory(makeTrigger());
    expect(typeof cleanup).toBe("function");
    (cleanup as () => void)();
  });
  test("[TT-14] sets aria-description on the host element", () => {
    const textTrigger = makeTrigger();
    attach(textTrigger, { text: "Describe me" });
    expect(textTrigger.getAttribute("aria-description")).toBe("Describe me");
    const contentTrigger = makeTrigger();
    attach(contentTrigger, { content: blankContent });
    expect(contentTrigger.getAttribute("aria-description")).toBeNull();
  });
  test("[TT-17] cleanup detaches the listener so the tooltip no longer shows", async () => {
    const trigger = makeTrigger();
    const cleanup = attach(trigger, { text: "Gone", delay: 10 });
    await tick();
    cleanup();
    await enter(trigger);
    await showAfter(10);
    expect(queryTip()).toBeNull();
  });
  test("[TT-18] cleanup hides a pending tooltip and clears its timer", async () => {
    const trigger = makeTrigger();
    const cleanup = attach(trigger, { text: "Pending", delay: 50 });
    await enter(trigger);
    expect(getTip().style.visibility).toBe("hidden");
    cleanup();
    await tick();
    expect(queryTip()).toBeNull();
    await showAfter(50);
    expect(queryTip()).toBeNull();
  });
});

describe("content snippet", () => {
  const contentSnippet = createRawSnippet<[string, SVSVariant, boolean]>((text, variant, flipped) => ({
    render: () => `<span data-testid="tooltip-content">text=${text()};variant=${variant()};flipped=${flipped()}</span>`,
  }));
  test("[TT-19] renders custom content with text, variant, and flipped args", async () => {
    const trigger = makeTrigger();
    trigger.style.position = "fixed";
    trigger.style.top = "100px";
    trigger.style.left = "100px";
    attach(trigger, { text: "Custom", content: contentSnippet, variant: VARIANT.ACTIVE, delay: 10 });
    await enter(trigger);
    await showAfter(10);
    await expect
      .element(getTip().querySelector('[data-testid="tooltip-content"]') as HTMLElement)
      .toHaveTextContent("text=Custom;variant=active;flipped=false");
  });
  test("[TT-20] content falls back to text when no content snippet", async () => {
    const trigger = makeTrigger();
    attach(trigger, { text: "Plain", delay: 10 });
    await enter(trigger);
    await showAfter(10);
    expect(getTip().textContent?.trim()).toBe("Plain");
  });
});

describe("Variant and styling classes", () => {
  async function show(params: TooltipParams) {
    const trigger = makeTrigger();
    attach(trigger, { text: "Styled", delay: 10, ...params });
    await enter(trigger);
    await showAfter(10);
    return getTip();
  }
  test("[TT-21] applies preset, part, and neutral variant classes by default", async () =>
    await expect.element(await show({})).toHaveClass("svs-tooltip", PARTS.WHOLE, VARIANT.NEUTRAL));
  test("[TT-22] reflects a custom variant", async () => {
    const el = await show({ variant: VARIANT.ACTIVE });
    await expect.element(el).toHaveClass("svs-tooltip", PARTS.WHOLE, VARIANT.ACTIVE);
    expect(el.classList.contains(VARIANT.NEUTRAL)).toBe(false);
  });
  test("[TT-23] a string styling overrides the preset", async () => {
    const el = await show({ styling: "custom-tt", variant: VARIANT.ACTIVE });
    await expect.element(el).toHaveClass("custom-tt", PARTS.WHOLE, VARIANT.ACTIVE);
    expect(el.classList.contains("svs-tooltip")).toBe(false);
  });
  test("[TT-24] an object styling maps base and variant classes", async () => {
    const styling = { [PARTS.WHOLE]: { base: "base-c", [VARIANT.NEUTRAL]: "neu-c", [VARIANT.ACTIVE]: "act-c" } };
    const el = await show({ styling, variant: VARIANT.NEUTRAL });
    await expect.element(el).toHaveClass("base-c", "neu-c");
    expect(el.classList.contains("act-c")).toBe(false);
  });
});

describe("Singleton and defaults", () => {
  test("[TT-31] a second hover replaces the first tooltip", async () => {
    const a = makeTrigger();
    const b = makeTrigger();
    attach(a, { text: "A", delay: 10 });
    attach(b, { text: "B", delay: 10 });
    await enter(a);
    await showAfter(10);
    expect(getTip().textContent?.trim()).toBe("A");
    await enter(b);
    await showAfter(10);
    const tips = document.querySelectorAll('[role="tooltip"]');
    expect(tips).toHaveLength(1);
    expect(tips[0].textContent?.trim()).toBe("B");
  });
  test("[TT-32] delay: 0 shows immediately", async () => {
    const trigger = makeTrigger();
    attach(trigger, { text: "Now", delay: 0 });
    await enter(trigger);
    await vi.waitFor(() => expect(getTip().style.visibility).toBe("visible"));
  });
  test("[TT-33] initTooltip sets library-wide defaults", async () => {
    initTooltip({ delay: 500, variant: VARIANT.ACTIVE });
    const trigger = makeTrigger();
    attach(trigger, { text: "Def" });
    await enter(trigger);
    expect(getTip().style.visibility).toBe("hidden");
    await vi.waitFor(() => expect(getTip().style.visibility).toBe("visible"), { timeout: 1500 });
    await expect.element(getTip()).toHaveClass(VARIANT.ACTIVE);
  });
  test("[TT-34] per-call params override initTooltip defaults", async () => {
    initTooltip({ delay: 500 });
    const trigger = makeTrigger();
    attach(trigger, { text: "Fast", delay: 20 });
    await enter(trigger);
    expect(getTip().style.visibility).toBe("hidden");
    await vi.waitFor(() => expect(getTip().style.visibility).toBe("visible"));
  });
});

describe("accessibility (axe)", () => {
  test("plain-text tip has no violations", async () => {
    const trigger = makeTrigger();
    attach(trigger, { text: "Plain axe", delay: 10 });
    await enter(trigger);
    await showAfter(10);
    await vi.waitFor(() => expect(getTip().style.visibility).toBe("visible"));

    expect(await axe.run(getTip())).toHaveNoViolations();
  });

  test("custom content tip has no violations", async () => {
    const contentSnippet = createRawSnippet<[string, SVSVariant, boolean]>((text, variant, flipped) => ({
      render: () => `<span data-testid="tooltip-content">text=${text()};variant=${variant()};flipped=${flipped()}</span>`,
    }));
    const trigger = makeTrigger();
    trigger.style.position = "fixed";
    trigger.style.top = "100px";
    trigger.style.left = "100px";
    attach(trigger, { text: "Custom axe", content: contentSnippet, variant: VARIANT.ACTIVE, delay: 10 });
    await enter(trigger);
    await showAfter(10);
    await vi.waitFor(() => expect(getTip().style.visibility).toBe("visible"));
    const content = getTip().querySelector('[data-testid="tooltip-content"]') as HTMLElement;
    expect(content.textContent).toContain("text=Custom axe;variant=active;flipped=");

    expect(await axe.run(getTip())).toHaveNoViolations();
  });
});
