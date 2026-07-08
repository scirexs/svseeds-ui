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

const el = (container: HTMLElement, id: string) => container.querySelector(`[data-testid="${id}"]`) as HTMLElement;

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
