import { afterEach, describe, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, within } from "@testing-library/svelte";
import { tick } from "svelte";
import SortableBasic from "./fixtures/SortableBasic.svelte";
import SortableHandle from "./fixtures/SortableHandle.svelte";
import SortableObjects, { type Card } from "./fixtures/SortableObjects.svelte";
import SortableConnected from "./fixtures/SortableConnected.svelte";
import SortableConnectedObjects from "./fixtures/SortableConnectedObjects.svelte";
import SortableGhost from "./fixtures/SortableGhost.svelte";
import { createSortableGroup } from "#svs/Sortable.svelte";
import { PARTS, VARIANT, fnClass } from "#svs/core";

async function drag(origin: HTMLElement, over: HTMLElement | null, opts?: { up?: boolean }) {
  await fireEvent.pointerDown(origin, { button: 0, buttons: 1, clientX: 0, clientY: 0 });
  await tick();
  await fireEvent.pointerMove(window, { buttons: 1, clientX: 20, clientY: 20 });
  await tick();
  if (over) await fireEvent.pointerOver(over, { buttons: 1 });
  await tick();
  if (opts?.up ?? true) await fireEvent.pointerUp(window, { clientX: 20, clientY: 20 });
  await tick();
}

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  cleanup();
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

  test("empty items render an empty list", () => {
    const { container, getByTestId } = render(SortableBasic, { items: [] });
    const list = container.querySelector("ul");

    expect(list).toBeInTheDocument();
    expect(list?.querySelectorAll("li")).toHaveLength(0);
    expect(getByTestId("value-readout")).toHaveTextContent("");
  });

  test("items render keyed list elements", () => {
    const { container, getByTestId } = render(SortableBasic, { items: ["a", "b"] });
    const list = container.querySelector("ul");
    const items = container.querySelectorAll("li[data-svs-key]");

    expect(list).toHaveClass("svs-sortable", PARTS.WHOLE, VARIANT.NEUTRAL);
    expect(items).toHaveLength(2);
    expect(items[0]).toHaveAttribute("data-svs-key", "a");
    expect(items[1]).toHaveAttribute("data-svs-key", "b");
    expect(getByTestId("item-a")).toHaveTextContent("a");
  });

  test("variant and styling use fnClass-compatible classes", () => {
    const styling = "custom-sortable";
    const cls = fnClass("svs-sortable", styling);
    const { container } = render(SortableBasic, { items: ["a"], styling, variant: VARIANT.ACTIVE });
    const list = container.querySelector("ul");
    const item = container.querySelector("li");

    expect(list?.className).toBe(cls(PARTS.WHOLE, VARIANT.ACTIVE));
    expect(item?.className).toBe(cls(PARTS.MAIN, VARIANT.ACTIVE));
  });

  test("standalone renders are isolated", async () => {
    const first = render(SortableBasic, { items: ["a", "b", "c"] });
    const second = render(SortableBasic, { items: ["x", "y"] });
    const firstView = within(first.container);
    const secondView = within(second.container);

    await drag(firstView.getByTestId("item-a"), firstView.getByTestId("item-c"));

    expect(firstView.getByTestId("value-readout")).toHaveTextContent("b,c,a");
    expect(secondView.getByTestId("value-readout")).toHaveTextContent("x,y");
  });
});

describe("_Sortable single-list drag", () => {
  test("move mode reorders the bound array", async () => {
    const props = $state({ items: ["a", "b", "c"] });
    const { getByTestId } = render(SortableBasic, props);

    await drag(getByTestId("item-a"), getByTestId("item-c"));

    expect(getByTestId("value-readout")).toHaveTextContent("b,c,a");
    expect(props.items).toEqual(["b", "c", "a"]);
  });

  test("sort=false prevents same-list sorting", async () => {
    const { getByTestId } = render(SortableBasic, { items: ["a", "b", "c"], sort: false });

    await drag(getByTestId("item-a"), getByTestId("item-c"));

    expect(getByTestId("value-readout")).toHaveTextContent("a,b,c");
  });

  test("draggable=false without a handle does not start a drag", async () => {
    const { queryByText, getByTestId } = render(SortableBasic, { items: ["a", "b"], draggable: false, noHandle: true });

    await drag(getByTestId("item-a"), getByTestId("item-b"));

    expect(queryByText("position: fixed")).not.toBeInTheDocument();
    expect(getByTestId("value-readout")).toHaveTextContent("a,b");
  });

  test("ending on the origin leaves order unchanged", async () => {
    const { getByTestId } = render(SortableBasic, { items: ["a", "b"] });

    await drag(getByTestId("item-a"), null);

    expect(getByTestId("value-readout")).toHaveTextContent("a,b");
  });
});

describe("_Sortable drag handles and shadow", () => {
  test("dedicated handle starts drag while label does not", async () => {
    const { getByTestId, container } = render(SortableHandle, { items: ["a", "b"] });

    await drag(getByTestId("label-a"), null, { up: false });
    expect(container.querySelector('[style*="position: fixed"]')).not.toBeInTheDocument();
    await fireEvent.pointerUp(window);

    await drag(getByTestId("handle-a"), null, { up: false });
    expect(container.querySelector('[style*="position: fixed"]')).toBeInTheDocument();
    await fireEvent.pointerUp(window);
  });

  test("default floating preview appears while dragging and is removed on pointerup", async () => {
    const { getByTestId, container } = render(SortableBasic, { items: ["a", "b"] });

    await drag(getByTestId("item-a"), null, { up: false });
    expect(container.querySelector('[style*="position: fixed"]')).toBeInTheDocument();

    await fireEvent.pointerUp(window);
    await tick();
    expect(container.querySelector('[style*="position: fixed"]')).not.toBeInTheDocument();
  });

  test("custom ghost snippet is used for the preview", async () => {
    const { getByTestId } = render(SortableGhost, { items: ["a", "b"] });

    await drag(getByTestId("item-a"), null, { up: false });

    expect(getByTestId("ghost")).toHaveTextContent("a");
    await fireEvent.pointerUp(window);
  });
});

describe("_Sortable generic object items", () => {
  test("object items reorder by key without stringifying values", async () => {
    const alpha: Card = { id: "a", text: "Alpha" };
    const beta: Card = { id: "b", text: "Beta" };
    const gamma: Card = { id: "c", text: "Gamma" };
    const props = $state({ cards: [alpha, beta, gamma] });
    const { getByTestId } = render(SortableObjects, props);

    await drag(getByTestId("item-a"), getByTestId("item-c"));

    expect(getByTestId("value-readout")).toHaveTextContent("b,c,a");
    expect(props.cards[2]).toStrictEqual(alpha);
    expect(getByTestId("item-a")).toHaveAttribute("data-text", "Alpha");
  });
});

describe("_Sortable connected lists", () => {
  test("move transfers an item between explicit group lists", async () => {
    const props = $state({ a: ["a1", "a2"], b: ["b1", "b2"] });
    const { getByTestId } = render(SortableConnected, props);

    await drag(getByTestId("item-a1"), getByTestId("item-b1"));

    expect(getByTestId("readout-a")).toHaveTextContent("a2");
    expect(getByTestId("readout-b")).toHaveTextContent("a1,b1,b2");
    expect(props.a).toEqual(["a2"]);
    expect(props.b).toEqual(["a1", "b1", "b2"]);
  });

  test("clone with object items keeps source and inserts cloned key", async () => {
    const { getByTestId } = render(SortableConnectedObjects);

    await drag(getByTestId("item-a"), getByTestId("item-b"));

    expect(getByTestId("readout-a")).toHaveTextContent("a");
    expect(getByTestId("readout-b")).toHaveTextContent("a*,b");
  });

  test("swap exchanges items between lists on commit", async () => {
    const { getByTestId } = render(SortableConnected, { mode: "swap", a: ["a1"], b: ["b1"] });

    await drag(getByTestId("item-a1"), getByTestId("item-b1"));

    expect(getByTestId("readout-a")).toHaveTextContent("b1");
    expect(getByTestId("readout-b")).toHaveTextContent("a1");
  });

  test("accept blocks or allows by source id", async () => {
    const blocked = render(SortableConnected, { acceptB: [] });
    await drag(blocked.getByTestId("item-a1"), blocked.getByTestId("item-b1"));
    expect(blocked.getByTestId("readout-a")).toHaveTextContent("a1,a2");
    expect(blocked.getByTestId("readout-b")).toHaveTextContent("b1,b2");
    blocked.unmount();

    const allowed = render(SortableConnected, { acceptB: ["a"] });
    await drag(allowed.getByTestId("item-a1"), allowed.getByTestId("item-b1"));
    expect(allowed.getByTestId("readout-b")).toHaveTextContent("a1,b1,b2");
    allowed.unmount();

    const rejected = render(SortableConnected, { acceptB: ["a"] });
    await drag(rejected.getByTestId("item-c1"), rejected.getByTestId("item-b1"));
    expect(rejected.getByTestId("readout-c")).toHaveTextContent("c1");
    expect(rejected.getByTestId("readout-b")).toHaveTextContent("b1,b2");
    rejected.unmount();

    const predicate = render(SortableConnected, { acceptB: (fromId: string) => fromId !== "a" });
    await drag(predicate.getByTestId("item-a1"), predicate.getByTestId("item-b1"));
    expect(predicate.getByTestId("readout-b")).toHaveTextContent("b1,b2");
  });

  test("independent explicit groups do not interfere", async () => {
    const first = render(SortableConnected, { a: ["a1"], b: ["b1"] });
    const second = render(SortableConnected, { a: ["x1"], b: ["y1"] });
    const firstView = within(first.container);
    const secondView = within(second.container);

    await drag(firstView.getByTestId("item-a1"), firstView.getByTestId("item-b1"));

    expect(firstView.getByTestId("readout-b")).toHaveTextContent("a1,b1");
    expect(secondView.getByTestId("readout-a")).toHaveTextContent("x1");
    expect(secondView.getByTestId("readout-b")).toHaveTextContent("y1");
  });
});

describe("_Sortable multiple, confirm, append, and dragging", () => {
  test("multiple selected followers move with the dragged item", async () => {
    const { getByTestId } = render(SortableConnected, { a: ["a1", "a2", "a3"], b: ["b1"], multiple: true });

    await fireEvent.pointerDown(getByTestId("item-a1"), { button: 0, buttons: 1 });
    await fireEvent.pointerUp(getByTestId("item-a1"), { button: 0, buttons: 0 });
    await tick();
    expect(getByTestId("item-a1")).toHaveAttribute("data-variant", VARIANT.ACTIVE);

    await fireEvent.pointerDown(getByTestId("item-a2"), { button: 0, buttons: 1 });
    await fireEvent.pointerUp(getByTestId("item-a2"), { button: 0, buttons: 0 });
    await tick();
    expect(getByTestId("item-a2")).toHaveAttribute("data-variant", VARIANT.ACTIVE);

    await drag(getByTestId("item-a1"), getByTestId("item-b1"));

    expect(getByTestId("readout-a")).toHaveTextContent("a3");
    expect(getByTestId("readout-b")).toHaveTextContent("a1,a2,b1");
  });

  test("confirm delays the move and can be cancelled by leaving", async () => {
    vi.useFakeTimers();
    const { getByTestId } = render(SortableBasic, { items: ["a", "b", "c"], confirm: true });

    await fireEvent.pointerDown(getByTestId("item-a"), { button: 0, buttons: 1, clientX: 0, clientY: 0 });
    await tick();
    await fireEvent.pointerMove(window, { buttons: 1, clientX: 20, clientY: 20 });
    await vi.advanceTimersByTimeAsync(20);
    await tick();
    await fireEvent.pointerOver(getByTestId("item-c"), { buttons: 1 });
    await tick();
    expect(getByTestId("item-c")).toHaveAttribute("data-variant", VARIANT.ACTIVE);
    await vi.advanceTimersByTimeAsync(400);
    await fireEvent.pointerOut(getByTestId("item-c"));
    await vi.advanceTimersByTimeAsync(200);

    expect(getByTestId("value-readout")).toHaveTextContent("a,b,c");

    await fireEvent.pointerOver(getByTestId("item-c"), { buttons: 1 });
    await vi.advanceTimersByTimeAsync(500);
    await tick();
    expect(getByTestId("value-readout")).toHaveTextContent("b,c,a");
    await fireEvent.pointerUp(window);
  });

  test("appendable and empty list append on group enter", async () => {
    const appendable = render(SortableConnected, { a: ["a1"], b: ["b1"], appendableB: true });
    const targetList = appendable.container.querySelectorAll("ul")[1] as HTMLUListElement;

    await drag(appendable.getByTestId("item-a1"), null, { up: false });
    await fireEvent.pointerEnter(targetList, { buttons: 1 });
    await fireEvent.pointerOver(targetList, { buttons: 1 });
    await fireEvent.pointerUp(window);

    expect(appendable.getByTestId("readout-b")).toHaveTextContent("b1,a1");
    appendable.unmount();

    const empty = render(SortableConnected, { a: ["a1"], b: [] });
    const emptyList = empty.container.querySelectorAll("ul")[1] as HTMLUListElement;
    await drag(empty.getByTestId("item-a1"), null, { up: false });
    await fireEvent.pointerEnter(emptyList, { buttons: 1 });
    await fireEvent.pointerOver(emptyList, { buttons: 1 });
    await fireEvent.pointerUp(window);

    expect(empty.getByTestId("readout-a")).toHaveTextContent("");
    expect(empty.getByTestId("readout-b")).toHaveTextContent("a1");
  });

  test("dragging bindable tracks active drag", async () => {
    const props = $state({ items: ["a", "b"], dragging: false });
    const { getByTestId } = render(SortableBasic, props);

    await drag(getByTestId("item-a"), null, { up: false });
    expect(props.dragging).toBe(true);
    expect(getByTestId("dragging-readout")).toHaveTextContent("true");

    await fireEvent.pointerUp(window);
    await tick();
    expect(props.dragging).toBe(false);
  });

  test("pointercancel tears down an active drag without leaving stray movement", async () => {
    const props = $state({ items: ["a", "b"], dragging: false });
    const { getByTestId, container } = render(SortableBasic, props);

    await drag(getByTestId("item-a"), null, { up: false });
    expect(props.dragging).toBe(true);

    await fireEvent.pointerCancel(window);
    await tick();
    await fireEvent.pointerMove(window, { buttons: 1, clientX: 40, clientY: 40 });
    await tick();

    expect(props.dragging).toBe(false);
    expect(getByTestId("value-readout")).toHaveTextContent("a,b");
    expect(container.querySelector('[style*="position: fixed"]')).not.toBeInTheDocument();
  });
});
