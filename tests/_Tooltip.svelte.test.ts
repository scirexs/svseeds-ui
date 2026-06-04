import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/svelte";
import { createRawSnippet, tick } from "svelte";
import Tooltip, { tooltip, type TooltipProps } from "#svs/_Tooltip.svelte"; // Adjust path if needed
import { PARTS, VARIANT } from "#svs/core"; // Adjust path if needed

// The `tooltip` export is an attachment factory: `tooltip(params)` returns an
// Attachment `(node) => cleanup`. The default `Tooltip` component is a global
// renderer driven by the shared singleton; a host element opts in by applying
// the attachment. Because that singleton persists across tests, every test uses
// a unique `name` so the rendered tooltip only targets its own host.

// *** Shared helpers *** //
let nameSeq = 0;
const nextName = () => `tt-${nameSeq++}`;

const triggers: HTMLElement[] = [];
const cleanups: Array<() => void> = [];

function makeTrigger(): HTMLButtonElement {
  const btn = document.createElement("button");
  document.body.appendChild(btn);
  triggers.push(btn);
  return btn;
}
// Apply the tooltip attachment to a host node, tracking its cleanup.
function attach(node: HTMLElement, params: { text: string; delay?: number; cursor?: boolean; name?: string }) {
  // The attachment always returns a teardown function (Attachment's type is the
  // wider `void | (() => void)`); narrow it for test bookkeeping.
  const cleanup = tooltip(params)(node) as () => void;
  cleanups.push(cleanup);
  return cleanup;
}

const STD_RECT = { x: 50, y: 50, width: 100, height: 30, top: 50, left: 50, right: 150, bottom: 80 };
function mockRect(rect: Partial<DOMRect>) {
  const full = { ...STD_RECT, ...rect } as DOMRect;
  HTMLElement.prototype.getBoundingClientRect = vi.fn(() => ({ ...full, toJSON: () => full }) as DOMRect);
}

// Override the tooltip's own measured size (jsdom reports 0 for offsetWidth/Height).
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
  // Svelte's `on()` defers registration of pointer/touch/wheel listeners to a
  // microtask, so flush before dispatching or the handler misses the event.
  await tick();
  await fireEvent.pointerEnter(trigger, pointer);
  await tick();
}
async function advance(ms: number) {
  vi.advanceTimersByTime(ms);
  await tick();
}
// The tooltip element stays mounted (with `visibility: hidden`) during the
// pre-delay window, so role queries must opt into hidden nodes; visibility is
// asserted separately via `style.visibility`.
const getTip = () => screen.getByRole("tooltip", { hidden: true });
const queryTip = () => screen.queryByRole("tooltip", { hidden: true });

beforeEach(() => {
  vi.useFakeTimers();
  mockRect({});
});

afterEach(async () => {
  // Hide any active tooltip and detach listeners so the singleton resets.
  cleanups.forEach((c) => c());
  cleanups.length = 0;
  await tick();
  triggers.forEach((t) => t.remove());
  triggers.length = 0;
  restoreSize?.();
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("Basic rendering", () => {
  test("is not rendered before any interaction", () => {
    render(Tooltip, { name: nextName() });
    expect(queryTip()).toBeNull();
  });

  test("mounts on pointerenter and becomes visible only after the delay", async () => {
    const name = nextName();
    render(Tooltip, { name });
    const trigger = makeTrigger();
    attach(trigger, { text: "Hello", delay: 100, name });

    await enter(trigger);
    // The element is mounted during the pre-delay window, but kept invisible.
    const el = getTip();
    expect(el.style.visibility).toBe("hidden");
    expect(el).toHaveTextContent("Hello");

    await advance(99);
    expect(getTip().style.visibility).toBe("hidden");

    await advance(1);
    expect(getTip().style.visibility).toBe("visible");
  });

  test("hides on pointerleave", async () => {
    const name = nextName();
    render(Tooltip, { name });
    const trigger = makeTrigger();
    attach(trigger, { text: "Bye", delay: 10, name });

    await enter(trigger);
    await advance(10);
    expect(queryTip()).not.toBeNull();

    await fireEvent.pointerLeave(trigger);
    await tick();
    expect(queryTip()).toBeNull();
  });

  test("hides on pointercancel", async () => {
    const name = nextName();
    render(Tooltip, { name });
    const trigger = makeTrigger();
    attach(trigger, { text: "Cancel", delay: 10, name });

    await enter(trigger);
    await advance(10);
    expect(queryTip()).not.toBeNull();

    await fireEvent.pointerCancel(trigger);
    await tick();
    expect(queryTip()).toBeNull();
  });
});

describe("tooltip attachment factory", () => {
  test("returns an attachment that yields a cleanup function", () => {
    const factory = tooltip({ text: "x" });
    expect(typeof factory).toBe("function");
    const cleanup = factory(makeTrigger());
    expect(typeof cleanup).toBe("function");
    (cleanup as () => void)();
  });

  test("sets aria-description on the host element", () => {
    const trigger = makeTrigger();
    attach(trigger, { text: "Describe me", name: nextName() });
    expect(trigger).toHaveAttribute("aria-description", "Describe me");
  });

  test("uses the default 1000ms delay when delay is omitted", async () => {
    const name = nextName();
    render(Tooltip, { name });
    const trigger = makeTrigger();
    attach(trigger, { text: "Default", name });

    await enter(trigger);
    await advance(999);
    expect(getTip().style.visibility).toBe("hidden");
    await advance(1);
    expect(getTip().style.visibility).toBe("visible");
  });

  test("treats a negative delay as the default delay", async () => {
    const name = nextName();
    render(Tooltip, { name });
    const trigger = makeTrigger();
    attach(trigger, { text: "Neg", delay: -50, name });

    await enter(trigger);
    await advance(999);
    expect(getTip().style.visibility).toBe("hidden");
    await advance(1);
    expect(getTip().style.visibility).toBe("visible");
  });

  test("cleanup detaches the listener so the tooltip no longer shows", async () => {
    const name = nextName();
    render(Tooltip, { name });
    const trigger = makeTrigger();
    const cleanup = attach(trigger, { text: "Gone", delay: 10, name });

    await tick(); // let the deferred listener registration run, then detach it
    cleanup();
    await enter(trigger);
    await advance(10);
    expect(queryTip()).toBeNull();
  });
});

describe("Name targeting", () => {
  test("uses the provided name as the element id", async () => {
    const name = nextName();
    render(Tooltip, { name });
    const trigger = makeTrigger();
    attach(trigger, { text: "Named", delay: 10, name });

    await enter(trigger);
    await advance(10);
    expect(getTip()).toHaveAttribute("id", name);
  });

  test("only the component registered with the matching name is shown", async () => {
    const nameA = nextName();
    const nameB = nextName();
    render(Tooltip, { name: nameA });
    render(Tooltip, { name: nameB });
    const trigger = makeTrigger();
    attach(trigger, { text: "ForA", delay: 10, name: nameA });

    await enter(trigger);
    await advance(10);

    const shown = screen.getAllByRole("tooltip", { hidden: true });
    expect(shown).toHaveLength(1);
    expect(shown[0]).toHaveAttribute("id", nameA);
  });
});

describe("children snippet", () => {
  const contentId = "tooltip-content";
  const contentSnippet = createRawSnippet<[string, string, boolean]>((text, variant, flipped) => ({
    render: () =>
      `<span data-testid="${contentId}">text=${text()};variant=${variant()};flipped=${flipped()}</span>`,
  }));

  test("renders custom content with text, variant, and flipped args", async () => {
    const name = nextName();
    render(Tooltip, { name, variant: VARIANT.ACTIVE, children: contentSnippet });
    const trigger = makeTrigger();
    attach(trigger, { text: "Custom", delay: 10, name });

    await enter(trigger);
    await advance(10);

    const el = getTip();
    expect(within(el).getByTestId(contentId)).toHaveTextContent(
      "text=Custom;variant=active;flipped=false",
    );
  });
});

describe("Variant and styling classes", () => {
  async function show(props: Partial<TooltipProps>) {
    const name = nextName();
    render(Tooltip, { name, ...props });
    const trigger = makeTrigger();
    attach(trigger, { text: "Styled", delay: 10, name });
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

  async function showAt(rect: Partial<DOMRect>, props: Partial<TooltipProps> = {}) {
    mockRect(rect);
    const name = nextName();
    render(Tooltip, { name, ...props });
    const trigger = makeTrigger();
    attach(trigger, { text: "Pos", delay: 10, name });
    await enter(trigger);
    await advance(10);
    return getTip();
  }

  test("positions at top-center by default", async () => {
    // anchor (x,y) = (200,200), trigger 100x40, tooltip 60x30
    // x = 200 + 100/2 - 60/2 = 220 ; y = 200 - 30 = 170
    const el = await showAt({ x: 200, y: 200, width: 100, height: 40 });
    expect(el.style.left).toBe("220px");
    expect(el.style.top).toBe("170px");
  });

  test("flips from top to bottom when there is no room above", async () => {
    // anchor.y = 10, unflipped top would be 10 - 30 = -20 (< 0) -> flip to bottom
    // flipped top = anchor.y(10) + trigger.height(40) = 50
    const el = await showAt({ x: 200, y: 10, width: 100, height: 40 });
    expect(el.style.top).toBe("50px");
  });
});

describe("Cursor tracking", () => {
  beforeEach(() => {
    vi.stubGlobal("innerWidth", 800);
    vi.stubGlobal("innerHeight", 600);
    mockTooltipSize(60, 30);
  });

  test("anchors to the pointer position when cursor is enabled", async () => {
    const name = nextName();
    render(Tooltip, { name });
    const trigger = makeTrigger();
    attach(trigger, { text: "Cursor", delay: 10, cursor: true, name });

    await enter(trigger, { clientX: 100, clientY: 100 });
    await advance(10);
    const el = getTip();
    // top-center around cursor: x = 100 - 60/2 = 70 ; y = 100 - 30 = 70
    expect(el.style.left).toBe("70px");
    expect(el.style.top).toBe("70px");
  });

  test("follows pointermove that happens before the tooltip becomes visible", async () => {
    const name = nextName();
    render(Tooltip, { name });
    const trigger = makeTrigger();
    attach(trigger, { text: "Track", delay: 100, cursor: true, name });

    await enter(trigger, { clientX: 100, clientY: 100 });
    await fireEvent.pointerMove(trigger, { clientX: 150, clientY: 150 });
    await tick();
    await advance(100);

    const el = getTip();
    // anchored to the latest cursor (150,150): x = 150 - 30 = 120 ; y = 150 - 30 = 120
    expect(el.style.left).toBe("120px");
    expect(el.style.top).toBe("120px");
  });
});
