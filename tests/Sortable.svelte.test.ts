import axe from "axe-core";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { render } from "vitest-browser-svelte";
import { tick } from "svelte";
import SortableBasic from "./fixtures/SortableBasic.svelte";
import SortableHandle from "./fixtures/SortableHandle.svelte";
import SortableObjects, { type Card } from "./fixtures/SortableObjects.svelte";
import SortableConnected from "./fixtures/SortableConnected.svelte";
import SortableConnectedObjects from "./fixtures/SortableConnectedObjects.svelte";
import SortableGhost from "./fixtures/SortableGhost.svelte";
import { createSortableGroup } from "#svs/Sortable.svelte";
import { PARTS, VARIANT, _fnClass } from "#svs/core";
import type { AxeMatchers } from "vitest-axe/matchers";

declare module "vitest" {
  interface Assertion<T = any> extends AxeMatchers {}
}

const el = (container: HTMLElement, id: string) => container.querySelector(`[data-testid="${id}"]`) as HTMLElement;
const keyed = (container: HTMLElement, key: string) => container.querySelector(`[data-svs-key="${key}"]`) as HTMLElement;
const items = (container: HTMLElement) => [...container.querySelectorAll<HTMLElement>("li[data-svs-key]")];
const live = (container: HTMLElement) => container.querySelector('[aria-live="polite"]') as HTMLElement;

function stubReducedMotion() {
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: query.includes("prefers-reduced-motion"),
    media: query,
    onchange: null,
    addEventListener() {},
    removeEventListener() {},
    addListener() {},
    removeListener() {},
    dispatchEvent: () => false,
  }));
}

async function drag(origin: HTMLElement, over: HTMLElement | null, opts?: { up?: boolean }) {
  origin.dispatchEvent(new PointerEvent("pointerdown", { button: 0, buttons: 1, clientX: 0, clientY: 0, bubbles: true, cancelable: true }));
  await tick();
  window.dispatchEvent(new PointerEvent("pointermove", { buttons: 1, clientX: 20, clientY: 20, bubbles: true }));
  if (over) over.dispatchEvent(new PointerEvent("pointerover", { buttons: 1, bubbles: true }));
  if (opts?.up ?? true) window.dispatchEvent(new PointerEvent("pointerup", { bubbles: true }));
  await tick();
}

async function press(target: HTMLElement, key: string, init?: KeyboardEventInit) {
  target.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true, ...init }));
  await tick();
  await tick();
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("_Sortable rendering and API", () => {
  test("createSortableGroup exposes shared motion params", () => {
    const easing = (t: number) => t;
    const controller = createSortableGroup(undefined, { duration: 120, easing });

    expect(controller.tp.duration).toBe(120);
    expect(controller.tp.easing).toBe(easing);
  });

  test("createSortableGroup resolves reduced motion duration", () => {
    vi.stubGlobal("matchMedia", (query: string) => ({
      matches: true,
      media: query,
      onchange: null,
      addEventListener() {},
      removeEventListener() {},
      addListener() {},
      removeListener() {},
      dispatchEvent: () => false,
    }));
    const controller = createSortableGroup(undefined, { duration: 120 });

    expect(controller.tp.duration).toBe(0);
  });

  test("empty items render an empty list", async () => {
    const { container, getByTestId } = render(SortableBasic, { items: [] });
    const list = container.querySelector("ul");

    expect(list).not.toBe(null);
    expect(list?.querySelectorAll("li")).toHaveLength(0);
    await expect.element(getByTestId("value-readout")).toHaveTextContent("");
  });

  test("items render keyed list elements", async () => {
    const { container, getByTestId } = render(SortableBasic, { items: ["a", "b"] });
    const list = container.querySelector("ul") as HTMLElement;
    const items = container.querySelectorAll("li[data-svs-key]");

    await expect.element(list).toHaveClass("svs-sortable", PARTS.WHOLE, VARIANT.NEUTRAL);
    expect(items).toHaveLength(2);
    expect(items[0].getAttribute("data-svs-key")).toBe("a");
    expect(items[1].getAttribute("data-svs-key")).toBe("b");
    await expect.element(getByTestId("item-a")).toHaveTextContent("a");
  });

  test("variant and styling use _fnClass-compatible classes", () => {
    const styling = "custom-sortable";
    const cls = _fnClass("svs-sortable", styling);
    const { container } = render(SortableBasic, { items: ["a"], styling, variant: VARIANT.ACTIVE });
    const list = container.querySelector("ul");
    const item = container.querySelector("li");

    expect(list?.className).toBe(cls(PARTS.WHOLE, VARIANT.ACTIVE));
    expect(item?.className).toBe(cls(PARTS.MAIN, VARIANT.ACTIVE));
  });

  test("ariaLabel names the list", async () => {
    const { container } = render(SortableBasic, { items: ["a"], ariaLabel: "Backlog" });
    const list = container.querySelector("ul") as HTMLElement;

    await expect.element(list).toHaveAttribute("aria-label", "Backlog");
  });

  test("omits aria-label when ariaLabel is unset", () => {
    const { container } = render(SortableBasic, { items: ["a"] });
    const list = container.querySelector("ul") as HTMLElement;

    expect(list.hasAttribute("aria-label")).toBe(false);
  });

  test("item aria-roledescription defaults and can be overridden", () => {
    const standard = render(SortableBasic, { items: ["a"] });
    const custom = render(SortableBasic, { items: ["a"], ariaRoleDescription: "Backlog card" });

    expect(items(standard.container)[0].getAttribute("aria-roledescription")).toBe("Sortable Item");
    expect(items(custom.container)[0].getAttribute("aria-roledescription")).toBe("Backlog card");
  });

  test("passes list attributes and merges caller class", async () => {
    const { container } = render(SortableBasic, {
      items: ["a"],
      ariaLabelledby: "sortable-label",
      dataProbe: "list-probe",
      listClass: "caller-list",
    });
    const list = container.querySelector("ul") as HTMLElement;

    await expect.element(list).toHaveAttribute("aria-labelledby", "sortable-label");
    await expect.element(list).toHaveAttribute("data-probe", "list-probe");
    await expect.element(list).toHaveClass("svs-sortable", PARTS.WHOLE, VARIANT.NEUTRAL);
    await expect.element(list).toHaveClass("caller-list");
  });

  test("standalone renders are isolated", async () => {
    stubReducedMotion();
    const first = render(SortableBasic, { items: ["a", "b", "c"] });
    const second = render(SortableBasic, { items: ["x", "y"] });

    await drag(el(first.container, "item-a"), el(first.container, "item-c"));

    await expect.element(el(first.container, "value-readout")).toHaveTextContent("b,c,a");
    await expect.element(el(second.container, "value-readout")).toHaveTextContent("x,y");
  });
});

describe("_Sortable single-list drag", () => {
  beforeEach(stubReducedMotion);

  test("move mode reorders the bound array", async () => {
    const props = $state({ items: ["a", "b", "c"] });
    const { container } = render(SortableBasic, props);

    await drag(el(container, "item-a"), el(container, "item-c"));

    await expect.element(el(container, "value-readout")).toHaveTextContent("b,c,a");
    expect(props.items).toEqual(["b", "c", "a"]);
  });

  test("move mode reorders the bound array backward", async () => {
    const props = $state({ items: ["a", "b", "c"] });
    const { container } = render(SortableBasic, props);

    await drag(el(container, "item-c"), el(container, "item-a"));

    await expect.element(el(container, "value-readout")).toHaveTextContent("c,a,b");
    expect(props.items).toEqual(["c", "a", "b"]);
  });

  test("swap mode exchanges two same-list items", async () => {
    const { container } = render(SortableBasic, { items: ["a", "b", "c"], mode: "swap" });

    await drag(el(container, "item-a"), el(container, "item-c"));

    await expect.element(el(container, "value-readout")).toHaveTextContent("c,b,a");
  });

  test("clone mode reorders same-list items without duplicating", async () => {
    const { container } = render(SortableBasic, { items: ["a", "b", "c"], mode: "clone" });

    await drag(el(container, "item-a"), el(container, "item-c"));

    await expect.element(el(container, "value-readout")).toHaveTextContent("b,c,a");
    expect(container.querySelectorAll("li[data-svs-key]")).toHaveLength(3);
  });

  test("repeated pointerover on a moving target does not reverse the reorder", async () => {
    const props = $state({ items: ["a", "b", "c"] });
    const { container } = render(SortableBasic, props);
    const origin = el(container, "item-a");
    const target = el(container, "item-c");

    origin.dispatchEvent(
      new PointerEvent("pointerdown", { button: 0, buttons: 1, clientX: 0, clientY: 0, bubbles: true, cancelable: true }),
    );
    await tick();
    window.dispatchEvent(new PointerEvent("pointermove", { buttons: 1, clientX: 20, clientY: 20, bubbles: true }));
    target.dispatchEvent(new PointerEvent("pointerover", { buttons: 1, bubbles: true }));
    await tick();
    target.dispatchEvent(new PointerEvent("pointerover", { buttons: 1, bubbles: true }));
    window.dispatchEvent(new PointerEvent("pointerup", { bubbles: true }));
    await tick();

    await expect.element(el(container, "value-readout")).toHaveTextContent("b,c,a");
    expect(props.items).toEqual(["b", "c", "a"]);
  });

  test("sort=false prevents same-list sorting", async () => {
    const { container } = render(SortableBasic, { items: ["a", "b", "c"], sort: false });

    await drag(el(container, "item-a"), el(container, "item-c"));

    await expect.element(el(container, "value-readout")).toHaveTextContent("a,b,c");
  });

  test("draggable=false without a handle does not start a drag", async () => {
    const { container } = render(SortableBasic, { items: ["a", "b"], draggable: false, noHandle: true });

    await drag(el(container, "item-a"), el(container, "item-b"));

    expect(container.querySelector('[style*="position: fixed"]')).toBe(null);
    await expect.element(el(container, "value-readout")).toHaveTextContent("a,b");
  });

  test("ending on the origin leaves order unchanged", async () => {
    const { container } = render(SortableBasic, { items: ["a", "b"] });

    await drag(el(container, "item-a"), null);

    await expect.element(el(container, "value-readout")).toHaveTextContent("a,b");
  });
});

describe("_Sortable drag handles and shadow", () => {
  beforeEach(stubReducedMotion);

  test("dedicated handle starts drag while label does not", async () => {
    const { container } = render(SortableHandle, { items: ["a", "b"] });

    await drag(el(container, "label-a"), null, { up: false });
    expect(container.querySelector('[style*="position: fixed"]')).toBe(null);
    window.dispatchEvent(new PointerEvent("pointerup", { bubbles: true }));
    await tick();

    await drag(el(container, "handle-a"), null, { up: false });
    expect(container.querySelector('[style*="position: fixed"]')).not.toBe(null);
    window.dispatchEvent(new PointerEvent("pointerup", { bubbles: true }));
    await tick();
  });

  test("default floating preview appears while dragging and is removed on pointerup", async () => {
    const { container } = render(SortableBasic, { items: ["a", "b"] });

    await drag(el(container, "item-a"), null, { up: false });
    expect(container.querySelector('[style*="position: fixed"]')).not.toBe(null);

    window.dispatchEvent(new PointerEvent("pointerup", { bubbles: true }));
    await tick();
    expect(container.querySelector('[style*="position: fixed"]')).toBe(null);
  });

  test("custom ghost snippet is used for the preview", async () => {
    const { container, getByTestId } = render(SortableGhost, { items: ["a", "b"] });

    await drag(el(container, "item-a"), null, { up: false });

    await expect.element(getByTestId("ghost")).toHaveTextContent("a");
    window.dispatchEvent(new PointerEvent("pointerup", { bubbles: true }));
    await tick();
  });
});

describe("_Sortable generic object items", () => {
  beforeEach(stubReducedMotion);

  test("object items reorder by key without stringifying values", async () => {
    const alpha: Card = { id: "a", text: "Alpha" };
    const beta: Card = { id: "b", text: "Beta" };
    const gamma: Card = { id: "c", text: "Gamma" };
    const props = $state({ cards: [alpha, beta, gamma] });
    const { container } = render(SortableObjects, props);

    await drag(el(container, "item-a"), el(container, "item-c"));

    await expect.element(el(container, "value-readout")).toHaveTextContent("b,c,a");
    expect(props.cards[2]).toStrictEqual(alpha);
    expect(el(container, "item-a").getAttribute("data-text")).toBe("Alpha");
  });
});

describe("_Sortable connected lists", () => {
  beforeEach(stubReducedMotion);

  test("move transfers an item between explicit group lists", async () => {
    const props = $state({ a: ["a1", "a2"], b: ["b1", "b2"] });
    const { container } = render(SortableConnected, props);

    await drag(el(container, "item-a1"), el(container, "item-b1"));

    await expect.element(el(container, "readout-a")).toHaveTextContent("a2");
    await expect.element(el(container, "readout-b")).toHaveTextContent("a1,b1,b2");
    expect(props.a).toEqual(["a2"]);
    expect(props.b).toEqual(["a1", "b1", "b2"]);
  });

  test("clone with object items keeps source and inserts cloned key", async () => {
    const { container } = render(SortableConnectedObjects);

    await drag(el(container, "item-a"), el(container, "item-b"));

    await expect.element(el(container, "readout-a")).toHaveTextContent("a");
    await expect.element(el(container, "readout-b")).toHaveTextContent("a*,b");
  });

  test("swap exchanges items between lists on commit", async () => {
    const { container } = render(SortableConnected, { mode: "swap", a: ["a1"], b: ["b1"] });

    await drag(el(container, "item-a1"), el(container, "item-b1"));

    await expect.element(el(container, "readout-a")).toHaveTextContent("b1");
    await expect.element(el(container, "readout-b")).toHaveTextContent("a1");
  });

  test("accept blocks or allows by source id", async () => {
    const blocked = render(SortableConnected, { acceptB: [] });
    await drag(el(blocked.container, "item-a1"), el(blocked.container, "item-b1"));
    await expect.element(el(blocked.container, "readout-a")).toHaveTextContent("a1,a2");
    await expect.element(el(blocked.container, "readout-b")).toHaveTextContent("b1,b2");
    blocked.unmount();

    const allowed = render(SortableConnected, { acceptB: ["a"] });
    await drag(el(allowed.container, "item-a1"), el(allowed.container, "item-b1"));
    await expect.element(el(allowed.container, "readout-b")).toHaveTextContent("a1,b1,b2");
    allowed.unmount();

    const rejected = render(SortableConnected, { acceptB: ["a"] });
    await drag(el(rejected.container, "item-c1"), el(rejected.container, "item-b1"));
    await expect.element(el(rejected.container, "readout-c")).toHaveTextContent("c1");
    await expect.element(el(rejected.container, "readout-b")).toHaveTextContent("b1,b2");
    rejected.unmount();

    const predicate = render(SortableConnected, { acceptB: (fromId: string) => fromId !== "a" });
    await drag(el(predicate.container, "item-a1"), el(predicate.container, "item-b1"));
    await expect.element(el(predicate.container, "readout-b")).toHaveTextContent("b1,b2");
    predicate.unmount();
  });

  test("independent explicit groups do not interfere", async () => {
    const first = render(SortableConnected, { a: ["a1"], b: ["b1"] });
    const second = render(SortableConnected, { a: ["x1"], b: ["y1"] });

    await drag(el(first.container, "item-a1"), el(first.container, "item-b1"));

    await expect.element(el(first.container, "readout-b")).toHaveTextContent("a1,b1");
    await expect.element(el(second.container, "readout-a")).toHaveTextContent("x1");
    await expect.element(el(second.container, "readout-b")).toHaveTextContent("y1");
  });
});

describe("_Sortable multiple, confirm, append, and dragging", () => {
  beforeEach(stubReducedMotion);

  test("multiple selected followers move with the dragged item", async () => {
    const { container } = render(SortableConnected, { a: ["a1", "a2", "a3"], b: ["b1"], multiple: true });

    el(container, "item-a1").dispatchEvent(new PointerEvent("pointerdown", { button: 0, buttons: 1, bubbles: true }));
    el(container, "item-a1").dispatchEvent(new PointerEvent("pointerup", { button: 0, buttons: 0, bubbles: true }));
    await tick();
    await expect.element(el(container, "item-a1")).toHaveAttribute("data-variant", VARIANT.ACTIVE);

    el(container, "item-a2").dispatchEvent(new PointerEvent("pointerdown", { button: 0, buttons: 1, bubbles: true }));
    el(container, "item-a2").dispatchEvent(new PointerEvent("pointerup", { button: 0, buttons: 0, bubbles: true }));
    await tick();
    await expect.element(el(container, "item-a2")).toHaveAttribute("data-variant", VARIANT.ACTIVE);

    await drag(el(container, "item-a1"), el(container, "item-b1"));

    await expect.element(el(container, "readout-a")).toHaveTextContent("a3");
    await expect.element(el(container, "readout-b")).toHaveTextContent("a1,a2,b1");
    expect(el(container, "item-a1").getAttribute("data-variant")).not.toBe(VARIANT.ACTIVE);
    expect(el(container, "item-a2").getAttribute("data-variant")).not.toBe(VARIANT.ACTIVE);
  });

  test("same-list multi-select move relocates the whole selection to the drop target", async () => {
    const { container } = render(SortableBasic, { items: ["one", "two", "three", "four"], multiple: true });

    el(container, "item-one").dispatchEvent(new PointerEvent("pointerdown", { button: 0, buttons: 1, bubbles: true }));
    el(container, "item-one").dispatchEvent(new PointerEvent("pointerup", { button: 0, buttons: 0, bubbles: true }));
    await tick();
    await expect.element(el(container, "item-one")).toHaveAttribute("data-variant", VARIANT.ACTIVE);

    await drag(el(container, "item-two"), el(container, "item-four"));

    await expect.element(el(container, "value-readout")).toHaveTextContent("three,four,two,one");
    expect(el(container, "item-one").getAttribute("data-variant")).not.toBe(VARIANT.ACTIVE);
    expect(el(container, "item-two").getAttribute("data-variant")).not.toBe(VARIANT.ACTIVE);
  });

  test("plain click-to-select survives pointerup", async () => {
    const { container } = render(SortableBasic, { items: ["a", "b"], multiple: true });

    el(container, "item-a").dispatchEvent(new PointerEvent("pointerdown", { button: 0, buttons: 1, bubbles: true }));
    el(container, "item-a").dispatchEvent(new PointerEvent("pointerup", { button: 0, buttons: 0, bubbles: true }));
    await tick();

    await expect.element(el(container, "item-a")).toHaveAttribute("data-variant", VARIANT.ACTIVE);
  });

  test("pointer cancel preserves multi-select selection", async () => {
    const { container } = render(SortableBasic, { items: ["a", "b"], multiple: true });

    el(container, "item-a").dispatchEvent(new PointerEvent("pointerdown", { button: 0, buttons: 1, bubbles: true }));
    el(container, "item-a").dispatchEvent(new PointerEvent("pointerup", { button: 0, buttons: 0, bubbles: true }));
    await tick();
    await drag(el(container, "item-a"), null, { up: false });
    window.dispatchEvent(new PointerEvent("pointercancel", { bubbles: true }));
    await tick();

    await expect.element(el(container, "item-a")).toHaveAttribute("data-variant", VARIANT.ACTIVE);
  });

  test("confirm shows a pending highlight before committing", async () => {
    const { container } = render(SortableBasic, { items: ["a", "b", "c"], confirm: true });

    await drag(el(container, "item-a"), el(container, "item-c"), { up: false });

    await expect.element(el(container, "item-c")).toHaveAttribute("data-variant", VARIANT.ACTIVE);
    await expect.element(el(container, "value-readout")).toHaveTextContent("a,b,c");
    window.dispatchEvent(new PointerEvent("pointerup", { bubbles: true }));
    await tick();
  });

  test("appendable and empty list append on group enter", async () => {
    const appendable = render(SortableConnected, { a: ["a1"], b: ["b1"], appendableB: true });
    const targetList = appendable.container.querySelectorAll("ul")[1] as HTMLUListElement;

    await drag(el(appendable.container, "item-a1"), null, { up: false });
    targetList.dispatchEvent(new PointerEvent("pointerenter", { buttons: 1, bubbles: true }));
    await tick();
    targetList.dispatchEvent(new PointerEvent("pointerover", { buttons: 1, bubbles: true }));
    await tick();
    window.dispatchEvent(new PointerEvent("pointerup", { bubbles: true }));
    await tick();

    await expect.element(el(appendable.container, "readout-b")).toHaveTextContent("b1,a1");
    appendable.unmount();

    const empty = render(SortableConnected, { a: ["a1"], b: [] });
    const emptyList = empty.container.querySelectorAll("ul")[1] as HTMLUListElement;
    await drag(el(empty.container, "item-a1"), null, { up: false });
    emptyList.dispatchEvent(new PointerEvent("pointerenter", { buttons: 1, bubbles: true }));
    await tick();
    emptyList.dispatchEvent(new PointerEvent("pointerover", { buttons: 1, bubbles: true }));
    await tick();
    window.dispatchEvent(new PointerEvent("pointerup", { bubbles: true }));
    await tick();

    await expect.element(el(empty.container, "readout-a")).toHaveTextContent("");
    await expect.element(el(empty.container, "readout-b")).toHaveTextContent("a1");
  });

  test("dragging bindable tracks active drag", async () => {
    const props = $state({ items: ["a", "b"], dragging: false });
    const { container } = render(SortableBasic, props);

    await drag(el(container, "item-a"), null, { up: false });
    expect(props.dragging).toBe(true);
    await expect.element(el(container, "dragging-readout")).toHaveTextContent("true");

    window.dispatchEvent(new PointerEvent("pointerup", { bubbles: true }));
    await tick();
    expect(props.dragging).toBe(false);
  });

  test("pointercancel tears down an active drag without leaving stray movement", async () => {
    const props = $state({ items: ["a", "b"], dragging: false });
    const { container } = render(SortableBasic, props);

    await drag(el(container, "item-a"), null, { up: false });
    expect(props.dragging).toBe(true);

    window.dispatchEvent(new PointerEvent("pointercancel", { bubbles: true }));
    await tick();
    window.dispatchEvent(new PointerEvent("pointermove", { buttons: 1, clientX: 40, clientY: 40, bubbles: true }));
    await tick();

    expect(props.dragging).toBe(false);
    await expect.element(el(container, "value-readout")).toHaveTextContent("a,b");
    expect(container.querySelector('[style*="position: fixed"]')).toBe(null);
  });
});

describe("_Sortable keyboard drag and drop", () => {
  beforeEach(stubReducedMotion);

  test("renders roving tabindex on items", () => {
    const { container } = render(SortableBasic, { items: ["a", "b", "c"] });
    const li = items(container);

    expect(li.map((node) => node.getAttribute("tabindex"))).toEqual(["0", "-1", "-1"]);
  });

  test("space picks up, arrow moves, and space drops the focused item", async () => {
    const props = $state({ items: ["a", "b", "c"] });
    const { container } = render(SortableBasic, props);
    const first = items(container)[0];

    first.focus();
    await press(first, " ");
    await expect.element(live(container)).toHaveTextContent("Grabbed a");
    await press(first, "ArrowDown");
    await expect.element(el(container, "value-readout")).toHaveTextContent("b,a,c");
    expect(document.activeElement?.getAttribute("data-svs-key")).toBe("a");
    await expect.element(live(container)).toHaveTextContent("Moved to position 2 of 3");
    await press(document.activeElement as HTMLElement, " ");

    await expect.element(el(container, "value-readout")).toHaveTextContent("b,a,c");
    await expect.element(live(container)).toHaveTextContent("Dropped at position 2 of 3");
    expect(props.items).toEqual(["b", "a", "c"]);
  });

  test("custom keyboard messages override supplied formatters and keep defaults for the rest", async () => {
    const { container } = render(SortableBasic, {
      items: ["a", "b", "c"],
      messages: {
        grabbed: (key, index, total) => `Picked up ${key} at ${index}/${total}`,
      },
    });
    const first = items(container)[0];

    first.focus();
    await press(first, " ");
    await expect.element(live(container)).toHaveTextContent("Picked up a at 1/3");
    await press(first, "ArrowDown");
    await expect.element(live(container)).toHaveTextContent("Moved to position 2 of 3");
  });

  test("grabbed arrow move respects sort false within the list", async () => {
    const { container } = render(SortableBasic, { items: ["a", "b", "c"], sort: false });
    const first = items(container)[0];

    first.focus();
    await press(first, " ");
    await expect.element(live(container)).toHaveTextContent("Grabbed a");
    await press(first, "ArrowDown");

    await expect.element(el(container, "value-readout")).toHaveTextContent("a,b,c");
    expect(document.activeElement?.getAttribute("data-svs-key")).toBe("a");
    await expect.element(live(container)).toHaveTextContent("At position 1 of 3");
  });

  test("escape restores the original order after a keyboard move", async () => {
    const props = $state({ items: ["a", "b", "c"] });
    const { container } = render(SortableBasic, props);
    const first = items(container)[0];

    first.focus();
    await press(first, "Enter");
    await press(first, "ArrowDown");
    await expect.element(el(container, "value-readout")).toHaveTextContent("b,a,c");
    await press(document.activeElement as HTMLElement, "Escape");

    await expect.element(el(container, "value-readout")).toHaveTextContent("a,b,c");
    await expect.element(live(container)).toHaveTextContent("Cancelled, returned to position 1 of 3");
    expect(props.items).toEqual(["a", "b", "c"]);
  });

  test("custom selection messages override select and deselect announcements", async () => {
    const { container } = render(SortableBasic, {
      items: ["a", "b"],
      multiple: true,
      messages: {
        selected: (key, count) => `Added ${key}; ${count} selected`,
        deselected: (key, count) => `Removed ${key}; ${count} selected`,
      },
    });
    const first = items(container)[0];

    first.focus();
    await press(first, " ", { ctrlKey: true });
    await expect.element(live(container)).toHaveTextContent("Added a; 1 selected");
    await press(first, " ", { ctrlKey: true });
    await expect.element(live(container)).toHaveTextContent("Removed a; 0 selected");
  });

  test("ctrl+space toggles selection and keyboard drop moves followers", async () => {
    const props = $state({ items: ["a", "b", "c", "d"] });
    const { container } = render(SortableBasic, { items: props.items, multiple: true });
    const first = items(container)[0];

    first.focus();
    await press(first, " ", { ctrlKey: true });
    await expect.element(el(container, "item-a")).toHaveAttribute("data-variant", VARIANT.ACTIVE);
    await expect.element(live(container)).toHaveTextContent("a selected, 1 items selected");
    await press(first, "ArrowDown");
    await press(document.activeElement as HTMLElement, " ", { ctrlKey: true });
    await expect.element(el(container, "item-b")).toHaveAttribute("data-variant", VARIANT.ACTIVE);
    await expect.element(live(container)).toHaveTextContent("b selected, 2 items selected");
    await press(document.activeElement as HTMLElement, "ArrowUp");
    await press(document.activeElement as HTMLElement, " ");
    await press(document.activeElement as HTMLElement, "ArrowDown");
    await press(document.activeElement as HTMLElement, "ArrowDown");
    await press(document.activeElement as HTMLElement, " ");

    await expect.element(el(container, "value-readout")).toHaveTextContent("c,a,b,d");
    expect(el(container, "item-a").getAttribute("data-variant")).not.toBe(VARIANT.ACTIVE);
    expect(el(container, "item-b").getAttribute("data-variant")).not.toBe(VARIANT.ACTIVE);
  });

  test("focus loss cancels an active keyboard grab without restoring focus", async () => {
    const button = document.createElement("button");
    document.body.append(button);
    try {
      const props = $state({ items: ["a", "b", "c"] });
      const { container } = render(SortableBasic, props);
      const first = items(container)[0];

      first.focus();
      await press(first, " ");
      await press(first, "ArrowDown");
      await expect.element(el(container, "value-readout")).toHaveTextContent("b,a,c");
      button.focus();
      await tick();

      await expect.element(el(container, "value-readout")).toHaveTextContent("a,b,c");
      await expect.element(live(container)).toHaveTextContent("Cancelled, returned to position 1 of 3");
      expect(document.activeElement).toBe(button);
      expect(props.items).toEqual(["a", "b", "c"]);
    } finally {
      button.remove();
    }
  });
});

describe("_Sortable connected-list keyboard", () => {
  beforeEach(stubReducedMotion);

  test("arrow down at a boundary moves a grabbed item into the next list", async () => {
    const { container } = render(SortableConnected, { b: ["b1"], c: [] });
    const item = keyed(container, "a2");

    item.focus();
    await press(item, " ");
    await press(item, "ArrowDown");

    await expect.element(el(container, "readout-a")).toHaveTextContent("a1");
    await expect.element(el(container, "readout-b")).toHaveTextContent("a2,b1");
    expect(document.activeElement?.getAttribute("data-svs-key")).toBe("a2");
  });

  test("accept gates a keyboard boundary move", async () => {
    const { container } = render(SortableConnected, { b: ["b1"], c: [], acceptB: [] });
    const item = keyed(container, "a2");

    item.focus();
    await press(item, " ");
    await press(item, "ArrowDown");

    await expect.element(el(container, "readout-a")).toHaveTextContent("a1,a2");
    await expect.element(el(container, "readout-b")).toHaveTextContent("b1");
    await expect.element(live(container)).toHaveTextContent("At position 2 of 2");
  });

  test("arrow down moves a grabbed item into an empty next list", async () => {
    const { container } = render(SortableConnected, { b: ["b1"], c: [] });
    const item = keyed(container, "b1");

    item.focus();
    await press(item, " ");
    await press(item, "ArrowDown");

    expect(el(container, "readout-b").textContent).toBe("");
    await expect.element(el(container, "readout-c")).toHaveTextContent("b1");
    expect(document.activeElement?.getAttribute("data-svs-key")).toBe("b1");
  });

  test("sort false blocks same-list movement but allows leaving at a boundary", async () => {
    const blocked = render(SortableConnected, { b: ["b1", "b2"], c: [], sortB: false });
    const first = keyed(blocked.container, "b1");

    first.focus();
    await press(first, " ");
    await press(first, "ArrowDown");

    await expect.element(el(blocked.container, "readout-b")).toHaveTextContent("b1,b2");
    expect(document.activeElement?.getAttribute("data-svs-key")).toBe("b1");
    blocked.unmount();

    const leaving = render(SortableConnected, { b: ["b1", "b2"], c: [], sortB: false });
    const last = keyed(leaving.container, "b2");

    last.focus();
    await press(last, " ");
    await press(last, "ArrowDown");

    await expect.element(el(leaving.container, "readout-b")).toHaveTextContent("b1");
    await expect.element(el(leaving.container, "readout-c")).toHaveTextContent("b2");
  });

  test("keyboard drop moves selected followers across lists", async () => {
    const { container } = render(SortableConnected, { b: ["b1"], c: [], multiple: true });
    const first = keyed(container, "a1");

    first.focus();
    await press(first, " ", { ctrlKey: true });
    await expect.element(el(container, "item-a1")).toHaveAttribute("data-variant", VARIANT.ACTIVE);
    await press(first, "ArrowDown");
    await press(document.activeElement as HTMLElement, " ", { ctrlKey: true });
    await expect.element(el(container, "item-a2")).toHaveAttribute("data-variant", VARIANT.ACTIVE);
    await press(document.activeElement as HTMLElement, " ");
    await press(document.activeElement as HTMLElement, "ArrowDown");
    await press(document.activeElement as HTMLElement, " ");

    expect(el(container, "readout-a").textContent).toBe("");
    await expect.element(el(container, "readout-b")).toHaveTextContent("a2,a1,b1");
  });
});

describe("accessibility (axe)", () => {
  test("audits the default sortable fixture", async () => {
    const { container } = render(SortableBasic, {});

    expect(await axe.run(container)).toHaveNoViolations();
  });

  test("audits the multi-select sortable fixture", async () => {
    const { container } = render(SortableBasic, { multiple: true });

    expect(await axe.run(container)).toHaveNoViolations();
  });

  test("audits the default keyboard sortable fixture", async () => {
    stubReducedMotion();
    const { container } = render(SortableBasic, { items: ["a", "b", "c"], ariaLabel: "Keyboard sortable" });

    expect(await axe.run(container)).toHaveNoViolations();
  });

  test("audits a grabbed keyboard sortable item", async () => {
    stubReducedMotion();
    const { container } = render(SortableBasic, { items: ["a", "b", "c"], ariaLabel: "Keyboard sortable" });
    const first = items(container)[0];

    first.focus();
    await press(first, " ");
    await expect.element(live(container)).toHaveTextContent("Grabbed a");

    expect(await axe.run(container)).toHaveNoViolations();
  });
});
