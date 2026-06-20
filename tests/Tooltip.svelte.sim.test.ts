// Retained in jsdom: positioning/flipping/cursor-tracking depend on mocked getBoundingClientRect + window.innerWidth/innerHeight (unreliable in headless chromium — see .ref/migration-test.md §"window dimensions NO"), and the 1000ms default-delay boundary is precise fake-timer territory.
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { fireEvent, screen } from "@testing-library/svelte";
import { tick } from "svelte";
import { initTooltip, tooltip, type TooltipParams } from "#svs/Tooltip.svelte";
import { VARIANT } from "#svs/core";

const triggers: HTMLElement[] = [];
const cleanups: Array<() => void> = [];
function makeTrigger(): HTMLButtonElement { const btn = document.createElement("button"); document.body.appendChild(btn); triggers.push(btn); return btn; }
function attach(node: HTMLElement, params: TooltipParams) { const cleanup = tooltip(params)(node) as () => void; cleanups.push(cleanup); return cleanup; }
function resetTooltipDefaults() { initTooltip({ position: "top", align: "center", offset: { x: 0, y: 0 }, delay: 1000, cursor: false, variant: VARIANT.NEUTRAL, styling: undefined }); }
function setHover(can: boolean) { vi.stubGlobal("matchMedia", vi.fn().mockReturnValue({ matches: can, media: "", onchange: null, addEventListener: vi.fn(), removeEventListener: vi.fn(), dispatchEvent: vi.fn() })); }

const STD_RECT = { x: 50, y: 50, width: 100, height: 30, top: 50, left: 50, right: 150, bottom: 80 };
function mockRect(rect: Partial<DOMRect>) { const full = { ...STD_RECT, ...rect } as DOMRect; HTMLElement.prototype.getBoundingClientRect = vi.fn(() => ({ ...full, toJSON: () => full }) as DOMRect); }
let restoreSize: (() => void) | undefined;
function mockTooltipSize(width: number, height: number) {
  const ow = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "offsetWidth"); const oh = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "offsetHeight");
  Object.defineProperty(HTMLElement.prototype, "offsetWidth", { configurable: true, get: () => width }); Object.defineProperty(HTMLElement.prototype, "offsetHeight", { configurable: true, get: () => height });
  restoreSize = () => { if (ow) Object.defineProperty(HTMLElement.prototype, "offsetWidth", ow); if (oh) Object.defineProperty(HTMLElement.prototype, "offsetHeight", oh); restoreSize = undefined; };
}
async function enter(trigger: HTMLElement, pointer: Record<string, number> = {}) { await tick(); await fireEvent.pointerEnter(trigger, pointer); await tick(); }
async function press(trigger: HTMLElement, pointer: Record<string, number> = {}) { await tick(); await fireEvent.pointerDown(trigger, pointer); await tick(); }
async function advance(ms: number) { vi.advanceTimersByTime(ms); await tick(); }
const getTip = () => screen.getByRole("tooltip", { hidden: true });

beforeEach(() => { vi.useFakeTimers(); setHover(true); mockRect({}); });
afterEach(async () => {
  cleanups.forEach((c) => c()); cleanups.length = 0; await tick(); triggers.forEach((t) => t.remove()); triggers.length = 0;
  restoreSize?.(); resetTooltipDefaults(); vi.clearAllTimers(); vi.useRealTimers(); vi.unstubAllGlobals(); vi.restoreAllMocks();
});

describe("Touch long-press fallback retained in jsdom", () => {
  test("[TT-11] anchors to the press point on touch even when cursor is false", async () => {
    setHover(false); vi.stubGlobal("innerWidth", 800); vi.stubGlobal("innerHeight", 600); mockTooltipSize(60, 30); mockRect({ x: 300, y: 300, width: 100, height: 40 });
    const trigger = makeTrigger(); attach(trigger, { text: "Press", delay: 10, cursor: false }); await press(trigger, { clientX: 100, clientY: 100 }); await advance(10);
    expect(getTip().style.left).toBe("70px"); expect(getTip().style.top).toBe("70px");
  });
});

describe("tooltip attachment factory timing retained in jsdom", () => {
  test("[TT-15] uses the default 1000ms delay when delay is omitted", async () => {
    const trigger = makeTrigger(); attach(trigger, { text: "Default" }); await enter(trigger); await advance(999); expect(getTip().style.visibility).toBe("hidden"); await advance(1); expect(getTip().style.visibility).toBe("visible");
  });
  test("[TT-16] treats a negative delay as the default delay", async () => {
    const trigger = makeTrigger(); attach(trigger, { text: "Neg", delay: -50 }); await enter(trigger); await advance(999); expect(getTip().style.visibility).toBe("hidden"); await advance(1); expect(getTip().style.visibility).toBe("visible");
  });
});

describe("Positioning and flipping retained in jsdom", () => {
  beforeEach(() => { vi.stubGlobal("innerWidth", 1000); vi.stubGlobal("innerHeight", 800); mockTooltipSize(60, 30); });
  async function showAt(rect: Partial<DOMRect>, params: TooltipParams = {}) { mockRect(rect); const trigger = makeTrigger(); attach(trigger, { text: "Pos", delay: 10, ...params }); await enter(trigger); await advance(10); return getTip(); }
  test("[TT-25] positions at top-center by default", async () => { const el = await showAt({ x: 200, y: 200, width: 100, height: 40 }); expect(el.style.left).toBe("220px"); expect(el.style.top).toBe("170px"); });
  test("[TT-26] flips from top to bottom when there is no room above", async () => { const el = await showAt({ x: 200, y: 10, width: 100, height: 40 }); expect(el.style.top).toBe("50px"); });
  test("[TT-27] position/align/offset are per-call", async () => {
    const right = await showAt({ x: 200, y: 200, width: 100, height: 40 }, { position: "right", align: "start", offset: { x: 5, y: 7 } }); expect(right.style.left).toBe("305px"); expect(right.style.top).toBe("207px");
    cleanups.pop()?.(); await tick();
    const bottom = await showAt({ x: 200, y: 200, width: 100, height: 40 }, { position: "bottom", align: "end", offset: { x: 5, y: 7 } }); expect(bottom.style.left).toBe("245px"); expect(bottom.style.top).toBe("247px");
  });
  test("[TT-28] offset is not shared between calls", async () => { const offset = { x: 10, y: 0 }; initTooltip({ offset }); const trigger = makeTrigger(); attach(trigger, { text: "Copy", delay: 10 }); offset.x = 80; await enter(trigger); await advance(10); expect(getTip().style.left).toBe("80px"); });
});

describe("Cursor tracking retained in jsdom", () => {
  beforeEach(() => { vi.stubGlobal("innerWidth", 800); vi.stubGlobal("innerHeight", 600); mockTooltipSize(60, 30); });
  test("[TT-29] anchors to the pointer position when cursor is enabled", async () => { const trigger = makeTrigger(); attach(trigger, { text: "Cursor", delay: 10, cursor: true }); await enter(trigger, { clientX: 100, clientY: 100 }); await advance(10); expect(getTip().style.left).toBe("70px"); expect(getTip().style.top).toBe("70px"); });
  test("[TT-30] follows pointermove that happens before the tooltip becomes visible", async () => { const trigger = makeTrigger(); attach(trigger, { text: "Track", delay: 100, cursor: true }); await enter(trigger, { clientX: 100, clientY: 100 }); await fireEvent.pointerMove(trigger, { clientX: 150, clientY: 150 }); await tick(); await advance(100); expect(getTip().style.left).toBe("120px"); expect(getTip().style.top).toBe("120px"); });
});
