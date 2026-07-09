import axe from "axe-core";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { render } from "vitest-browser-svelte";
import { tick } from "svelte";
import ZSortableA11yBasic from "./fixtures/ZSortableA11yBasic.svelte";
import ZSortableA11yConnected from "./fixtures/ZSortableA11yConnected.svelte";
import { VARIANT } from "#svs/core";
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

async function press(target: HTMLElement, key: string, init?: KeyboardEventInit) {
  target.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true, ...init }));
  await tick();
  await tick();
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("ZSortableA11y keyboard drag and drop", () => {
  beforeEach(stubReducedMotion);

  test("renders roving tabindex on items", () => {
    const { container } = render(ZSortableA11yBasic, { items: ["a", "b", "c"] });
    const li = items(container);

    expect(li.map((node) => node.getAttribute("tabindex"))).toEqual(["0", "-1", "-1"]);
  });

  test("space picks up, arrow moves, and space drops the focused item", async () => {
    const props = $state({ items: ["a", "b", "c"] });
    const { container } = render(ZSortableA11yBasic, props);
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

  test("grabbed arrow move respects sort false within the list", async () => {
    const { container } = render(ZSortableA11yBasic, { items: ["a", "b", "c"], sort: false });
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
    const { container } = render(ZSortableA11yBasic, props);
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

  test("ctrl+space toggles selection and keyboard drop moves followers", async () => {
    const props = $state({ items: ["a", "b", "c", "d"] });
    const { container } = render(ZSortableA11yBasic, { items: props.items, multiple: true });
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
  });

  test("focus loss cancels an active keyboard grab without restoring focus", async () => {
    const button = document.createElement("button");
    document.body.append(button);
    try {
      const props = $state({ items: ["a", "b", "c"] });
      const { container } = render(ZSortableA11yBasic, props);
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

describe("ZSortableA11y connected-list keyboard", () => {
  beforeEach(stubReducedMotion);

  test("arrow down at a boundary moves a grabbed item into the next list", async () => {
    const { container } = render(ZSortableA11yConnected);
    const item = keyed(container, "a2");

    item.focus();
    await press(item, " ");
    await press(item, "ArrowDown");

    await expect.element(el(container, "readout-a")).toHaveTextContent("a1");
    await expect.element(el(container, "readout-b")).toHaveTextContent("a2,b1");
    expect(document.activeElement?.getAttribute("data-svs-key")).toBe("a2");
  });

  test("accept gates a keyboard boundary move", async () => {
    const { container } = render(ZSortableA11yConnected, { acceptB: [] });
    const item = keyed(container, "a2");

    item.focus();
    await press(item, " ");
    await press(item, "ArrowDown");

    await expect.element(el(container, "readout-a")).toHaveTextContent("a1,a2");
    await expect.element(el(container, "readout-b")).toHaveTextContent("b1");
    await expect.element(live(container)).toHaveTextContent("At position 2 of 2");
  });

  test("arrow down moves a grabbed item into an empty next list", async () => {
    const { container } = render(ZSortableA11yConnected);
    const item = keyed(container, "b1");

    item.focus();
    await press(item, " ");
    await press(item, "ArrowDown");

    expect(el(container, "readout-b").textContent).toBe("");
    await expect.element(el(container, "readout-c")).toHaveTextContent("b1");
    expect(document.activeElement?.getAttribute("data-svs-key")).toBe("b1");
  });

  test("sort false blocks same-list movement but allows leaving at a boundary", async () => {
    const blocked = render(ZSortableA11yConnected, { b: ["b1", "b2"], sortB: false });
    const first = keyed(blocked.container, "b1");

    first.focus();
    await press(first, " ");
    await press(first, "ArrowDown");

    await expect.element(el(blocked.container, "readout-b")).toHaveTextContent("b1,b2");
    expect(document.activeElement?.getAttribute("data-svs-key")).toBe("b1");
    blocked.unmount();

    const leaving = render(ZSortableA11yConnected, { b: ["b1", "b2"], sortB: false });
    const last = keyed(leaving.container, "b2");

    last.focus();
    await press(last, " ");
    await press(last, "ArrowDown");

    await expect.element(el(leaving.container, "readout-b")).toHaveTextContent("b1");
    await expect.element(el(leaving.container, "readout-c")).toHaveTextContent("b2");
  });

  test("keyboard drop moves selected followers across lists", async () => {
    const { container } = render(ZSortableA11yConnected, { multiple: true });
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
  beforeEach(stubReducedMotion);

  test("audits the default keyboard sortable fixture", async () => {
    const { container } = render(ZSortableA11yBasic, { items: ["a", "b", "c"] });

    expect(await axe.run(container)).toHaveNoViolations();
  });

  test("audits a grabbed keyboard sortable item", async () => {
    const { container } = render(ZSortableA11yBasic, { items: ["a", "b", "c"] });
    const first = items(container)[0];

    first.focus();
    await press(first, " ");
    await expect.element(live(container)).toHaveTextContent("Grabbed a");

    expect(await axe.run(container)).toHaveNoViolations();
  });
});
