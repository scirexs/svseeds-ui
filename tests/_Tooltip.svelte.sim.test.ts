import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { fireEvent, screen, within } from "@testing-library/svelte";
import { createRawSnippet, tick } from "svelte";
import { initTooltip, tooltip, type TooltipParams } from "#svs/_Tooltip.svelte";
import { PARTS, VARIANT, type SVSVariant } from "#svs/core";

// *** Shared helpers *** //
const triggers: HTMLElement[] = [];
const cleanups: Array<() => void> = [];

function makeTrigger(): HTMLButtonElement {
  const btn = document.createElement("button");
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

const STD_RECT = { x: 50, y: 50, width: 100, height: 30, top: 50, left: 50, right: 150, bottom: 80 };
function mockRect(rect: Partial<DOMRect>) {
  const full = { ...STD_RECT, ...rect } as DOMRect;
  HTMLElement.prototype.getBoundingClientRect = vi.fn(() => ({ ...full, toJSON: () => full }) as DOMRect);
}

let restoreSize: (() => void) | undefined;
function mockTooltipSize(width: number, height: number) {
  const ow = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "offsetWidth");
  const oh = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "offsetHeight");
  Object.defineProperty(HTMLElement.prototype, "offsetWidth", { configurable: true, get: () => width });
  Object.defineProperty(HTMLElement.prototype, "offsetHeight", { configurable: true, get: () => height });
  restoreSize = () => {
    if (ow) Object.defineProperty(HTMLElement.prototype, "offsetWidth", ow);
    if (oh) Object.defineProperty(HTMLElement.prototype, "offsetHeight", oh);
    restoreSize = undefined;
  };
}

async function enter(trigger: HTMLElement, pointer: Record<string, number> = {}) {
  await tick();
  await fireEvent.pointerEnter(trigger, pointer);
  await tick();
}
async function advance(ms: number) {
  vi.advanceTimersByTime(ms);
  await tick();
}
const getTip = () => screen.getByRole("tooltip", { hidden: true });
const queryTip = () => screen.queryByRole("tooltip", { hidden: true });

beforeEach(() => {
  vi.useFakeTimers();
  mockRect({});
});

afterEach(async () => {
  cleanups.forEach((c) => c());
  cleanups.length = 0;
  await tick();
  triggers.forEach((t) => t.remove());
  triggers.length = 0;
  restoreSize?.();
  resetTooltipDefaults();
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("Basic rendering", () => {
  test("nothing mounted before first hover", () => {
    expect(queryTip()).toBeNull();
  });

  test("mounts on pointerenter and becomes visible only after the delay", async () => {
    const trigger = makeTrigger();
    attach(trigger, { text: "Hello", delay: 100 });

    await enter(trigger);
    const el = getTip();
    expect(el.style.visibility).toBe("hidden");
    expect(el).toHaveTextContent("Hello");

    await advance(99);
    expect(getTip().style.visibility).toBe("hidden");

    await advance(1);
    expect(getTip().style.visibility).toBe("visible");
  });

  test("hides on pointerleave", async () => {
    const trigger = makeTrigger();
    attach(trigger, { text: "Bye", delay: 10 });

    await enter(trigger);
    await advance(10);
    expect(queryTip()).not.toBeNull();

    await fireEvent.pointerLeave(trigger);
    await tick();
    expect(queryTip()).toBeNull();
  });

  test("hides on pointercancel", async () => {
    const trigger = makeTrigger();
    attach(trigger, { text: "Cancel", delay: 10 });

    await enter(trigger);
    await advance(10);
    expect(queryTip()).not.toBeNull();

    await fireEvent.pointerCancel(trigger);
    await tick();
    expect(queryTip()).toBeNull();
  });
});

describe("tooltip attachment factory", () => {
  const blankContent = createRawSnippet<[string, SVSVariant, boolean]>(() => ({
    render: () => "<span></span>",
  }));

  test("returns an attachment that yields a cleanup function", () => {
    const factory = tooltip({ text: "x" });
    expect(typeof factory).toBe("function");
    const cleanup = factory(makeTrigger());
    expect(typeof cleanup).toBe("function");
    (cleanup as () => void)();
  });

  test("sets aria-description on the host element", () => {
    const textTrigger = makeTrigger();
    attach(textTrigger, { text: "Describe me" });
    expect(textTrigger).toHaveAttribute("aria-description", "Describe me");

    const contentTrigger = makeTrigger();
    attach(contentTrigger, { content: blankContent });
    expect(contentTrigger).not.toHaveAttribute("aria-description");
  });

  test("uses the default 1000ms delay when delay is omitted", async () => {
    const trigger = makeTrigger();
    attach(trigger, { text: "Default" });

    await enter(trigger);
    await advance(999);
    expect(getTip().style.visibility).toBe("hidden");
    await advance(1);
    expect(getTip().style.visibility).toBe("visible");
  });

  test("treats a negative delay as the default delay", async () => {
    const trigger = makeTrigger();
    attach(trigger, { text: "Neg", delay: -50 });

    await enter(trigger);
    await advance(999);
    expect(getTip().style.visibility).toBe("hidden");
    await advance(1);
    expect(getTip().style.visibility).toBe("visible");
  });

  test("cleanup detaches the listener so the tooltip no longer shows", async () => {
    const trigger = makeTrigger();
    const cleanup = attach(trigger, { text: "Gone", delay: 10 });

    await tick();
    cleanup();
    await enter(trigger);
    await advance(10);
    expect(queryTip()).toBeNull();
  });

  test("cleanup hides a pending tooltip and clears its timer", async () => {
    const trigger = makeTrigger();
    const cleanup = attach(trigger, { text: "Pending", delay: 50 });

    await enter(trigger);
    expect(getTip().style.visibility).toBe("hidden");

    cleanup();
    await tick();
    expect(queryTip()).toBeNull();

    await advance(50);
    expect(queryTip()).toBeNull();
  });
});

describe("content snippet", () => {
  const contentId = "tooltip-content";
  const contentSnippet = createRawSnippet<[string, SVSVariant, boolean]>((text, variant, flipped) => ({
    render: () => `<span data-testid="${contentId}">text=${text()};variant=${variant()};flipped=${flipped()}</span>`,
  }));

  test("renders custom content with text, variant, and flipped args", async () => {
    const trigger = makeTrigger();
    attach(trigger, { text: "Custom", content: contentSnippet, variant: VARIANT.ACTIVE, delay: 10 });

    await enter(trigger);
    await advance(10);

    const el = getTip();
    expect(within(el).getByTestId(contentId)).toHaveTextContent("text=Custom;variant=active;flipped=false");
  });

  test("content falls back to text when no content snippet", async () => {
    const trigger = makeTrigger();
    attach(trigger, { text: "Plain", delay: 10 });

    await enter(trigger);
    await advance(10);

    expect(getTip().textContent?.trim()).toBe("Plain");
  });
});

describe("Variant and styling classes", () => {
  async function show(params: TooltipParams) {
    const trigger = makeTrigger();
    attach(trigger, { text: "Styled", delay: 10, ...params });
    await enter(trigger);
    await advance(10);
    return getTip();
  }

  test("applies preset, part, and neutral variant classes by default", async () => {
    const el = await show({});
    expect(el).toHaveClass("svs-tooltip", PARTS.WHOLE, VARIANT.NEUTRAL);
  });

  test("reflects a custom variant", async () => {
    const el = await show({ variant: VARIANT.ACTIVE });
    expect(el).toHaveClass("svs-tooltip", PARTS.WHOLE, VARIANT.ACTIVE);
    expect(el).not.toHaveClass(VARIANT.NEUTRAL);
  });

  test("a string styling overrides the preset", async () => {
    const el = await show({ styling: "custom-tt", variant: VARIANT.ACTIVE });
    expect(el).toHaveClass("custom-tt", PARTS.WHOLE, VARIANT.ACTIVE);
    expect(el).not.toHaveClass("svs-tooltip");
  });

  test("an object styling maps base and variant classes", async () => {
    const styling = {
      [PARTS.WHOLE]: { base: "base-c", [VARIANT.NEUTRAL]: "neu-c", [VARIANT.ACTIVE]: "act-c" },
    };
    const el = await show({ styling, variant: VARIANT.NEUTRAL });
    expect(el).toHaveClass("base-c", "neu-c");
    expect(el).not.toHaveClass("act-c");
  });
});

describe("Positioning and flipping", () => {
  beforeEach(() => {
    vi.stubGlobal("innerWidth", 1000);
    vi.stubGlobal("innerHeight", 800);
    mockTooltipSize(60, 30);
  });

  async function showAt(rect: Partial<DOMRect>, params: TooltipParams = {}) {
    mockRect(rect);
    const trigger = makeTrigger();
    attach(trigger, { text: "Pos", delay: 10, ...params });
    await enter(trigger);
    await advance(10);
    return getTip();
  }

  test("positions at top-center by default", async () => {
    const el = await showAt({ x: 200, y: 200, width: 100, height: 40 });
    expect(el.style.left).toBe("220px");
    expect(el.style.top).toBe("170px");
  });

  test("flips from top to bottom when there is no room above", async () => {
    const el = await showAt({ x: 200, y: 10, width: 100, height: 40 });
    expect(el.style.top).toBe("50px");
  });

  test("position/align/offset are per-call", async () => {
    const right = await showAt({ x: 200, y: 200, width: 100, height: 40 }, { position: "right", align: "start", offset: { x: 5, y: 7 } });
    expect(right.style.left).toBe("305px");
    expect(right.style.top).toBe("207px");

    cleanups.pop()?.();
    await tick();

    const bottom = await showAt({ x: 200, y: 200, width: 100, height: 40 }, { position: "bottom", align: "end", offset: { x: 5, y: 7 } });
    expect(bottom.style.left).toBe("245px");
    expect(bottom.style.top).toBe("247px");
  });

  test("offset is not shared between calls", async () => {
    const offset = { x: 10, y: 0 };
    initTooltip({ offset });
    const trigger = makeTrigger();
    attach(trigger, { text: "Copy", delay: 10 });
    offset.x = 80;

    await enter(trigger);
    await advance(10);

    expect(getTip().style.left).toBe("80px");
  });
});

describe("Cursor tracking", () => {
  beforeEach(() => {
    vi.stubGlobal("innerWidth", 800);
    vi.stubGlobal("innerHeight", 600);
    mockTooltipSize(60, 30);
  });

  test("anchors to the pointer position when cursor is enabled", async () => {
    const trigger = makeTrigger();
    attach(trigger, { text: "Cursor", delay: 10, cursor: true });

    await enter(trigger, { clientX: 100, clientY: 100 });
    await advance(10);

    const el = getTip();
    expect(el.style.left).toBe("70px");
    expect(el.style.top).toBe("70px");
  });

  test("follows pointermove that happens before the tooltip becomes visible", async () => {
    const trigger = makeTrigger();
    attach(trigger, { text: "Track", delay: 100, cursor: true });

    await enter(trigger, { clientX: 100, clientY: 100 });
    await fireEvent.pointerMove(trigger, { clientX: 150, clientY: 150 });
    await tick();
    await advance(100);

    const el = getTip();
    expect(el.style.left).toBe("120px");
    expect(el.style.top).toBe("120px");
  });
});

describe("Singleton and defaults", () => {
  test("a second hover replaces the first tooltip", async () => {
    const a = makeTrigger();
    const b = makeTrigger();
    attach(a, { text: "A", delay: 10 });
    attach(b, { text: "B", delay: 10 });

    await enter(a);
    await advance(10);
    expect(getTip()).toHaveTextContent("A");

    await enter(b);
    await advance(10);

    const tips = screen.getAllByRole("tooltip", { hidden: true });
    expect(tips).toHaveLength(1);
    expect(tips[0]).toHaveTextContent("B");
  });

  test("delay: 0 shows immediately", async () => {
    const trigger = makeTrigger();
    attach(trigger, { text: "Now", delay: 0 });

    await enter(trigger);
    await advance(0);

    expect(getTip().style.visibility).toBe("visible");
  });

  test("initTooltip sets library-wide defaults", async () => {
    initTooltip({ delay: 500, variant: VARIANT.ACTIVE });
    const trigger = makeTrigger();
    attach(trigger, { text: "Def" });

    await enter(trigger);
    await advance(499);
    expect(getTip().style.visibility).toBe("hidden");
    await advance(1);

    const el = getTip();
    expect(el.style.visibility).toBe("visible");
    expect(el).toHaveClass(VARIANT.ACTIVE);
  });

  test("per-call params override initTooltip defaults", async () => {
    initTooltip({ delay: 500 });
    const trigger = makeTrigger();
    attach(trigger, { text: "Fast", delay: 20 });

    await enter(trigger);
    await advance(19);
    expect(getTip().style.visibility).toBe("hidden");
    await advance(1);

    expect(getTip().style.visibility).toBe("visible");
  });
});
