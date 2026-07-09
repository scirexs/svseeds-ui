import axe from "axe-core";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { render } from "vitest-browser-svelte";
import { tick } from "svelte";
import SortableGroupBasic from "./fixtures/SortableGroupBasic.svelte";
import SortableGroupExternal from "./fixtures/SortableGroupExternal.svelte";
import SortableGroupMotionProbe from "./fixtures/SortableGroupMotionProbe.svelte";
import SortableBasic from "./fixtures/SortableBasic.svelte";
import { createSortableGroup } from "#svs/Sortable.svelte";
import { PARTS, VARIANT, _fnClass } from "#svs/core";
import type { AxeMatchers } from "vitest-axe/matchers";

declare module "vitest" {
  interface Assertion<T = any> extends AxeMatchers {}
}

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

describe("SortableGroup structure", () => {
  test("renders a role=group container with children", async () => {
    const { container } = render(SortableGroupBasic);
    const group = container.querySelector('[role="group"]') as HTMLElement;

    await expect.element(group).toHaveClass("svs-sortable-group", PARTS.WHOLE, VARIANT.NEUTRAL);
    expect(container.querySelectorAll("ul")).toHaveLength(2);
  });

  test("custom styling applies to the wrapper whole", () => {
    const styling = "custom-group";
    const cls = _fnClass("svs-sortable-group", styling);
    const { container } = render(SortableGroupBasic, { styling });
    const group = container.querySelector('[role="group"]') as HTMLElement;

    expect(group.className).toBe(cls(PARTS.WHOLE, VARIANT.NEUTRAL));
  });

  test("passes group attributes and merges caller class on the wrapper", async () => {
    const { container } = render(SortableGroupBasic, {
      ariaLabel: "Sortable columns",
      ariaLabelledby: "sort-label",
      dataProbe: "group-probe",
      groupClass: "caller-group",
    });
    const group = container.querySelector('[role="group"]') as HTMLElement;

    await expect.element(group).toHaveAttribute("aria-label", "Sortable columns");
    await expect.element(group).toHaveAttribute("aria-labelledby", "sort-label");
    await expect.element(group).toHaveAttribute("data-probe", "group-probe");
    await expect.element(group).toHaveClass("svs-sortable-group", PARTS.WHOLE, VARIANT.NEUTRAL);
    await expect.element(group).toHaveClass("caller-group");
  });
});

describe("SortableGroup motion", () => {
  test("defaults group motion to 300ms", async () => {
    const { getByTestId } = render(SortableGroupMotionProbe);

    await expect.element(getByTestId("motion-duration")).toHaveTextContent("300");
  });

  test("forwards duration and easing to the created controller", async () => {
    const easing = () => 0.75;
    const { getByTestId } = render(SortableGroupMotionProbe, { duration: 120, easing });

    await expect.element(getByTestId("motion-duration")).toHaveTextContent("120");
    await expect.element(getByTestId("motion-easing")).toHaveTextContent("0.75");
  });

  test("resolves duration to 0 under reduced motion", async () => {
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
    const { getByTestId } = render(SortableGroupMotionProbe, { duration: 120 });

    await expect.element(getByTestId("motion-duration")).toHaveTextContent("0");
  });
});

describe("SortableGroup context wiring", () => {
  beforeEach(stubReducedMotion);

  test("children without group props move items through context", async () => {
    const props = $state({ a: ["a1", "a2"], b: ["b1"] });
    const { container } = render(SortableGroupBasic, props);

    await drag(el(container, "item-a1"), el(container, "item-b1"));

    await expect.element(el(container, "readout-a")).toHaveTextContent("a2");
    await expect.element(el(container, "readout-b")).toHaveTextContent("a1,b1");
    expect(props.a).toEqual(["a2"]);
    expect(props.b).toEqual(["a1", "b1"]);
  });

  test("accept and swap still apply inside the wrapper", async () => {
    const blocked = render(SortableGroupBasic, { acceptB: [] });
    await drag(el(blocked.container, "item-a1"), el(blocked.container, "item-b1"));
    await expect.element(el(blocked.container, "readout-a")).toHaveTextContent("a1,a2");
    await expect.element(el(blocked.container, "readout-b")).toHaveTextContent("b1,b2");
    blocked.unmount();

    const swapped = render(SortableGroupBasic, { mode: "swap", a: ["a1"], b: ["b1"] });
    await drag(el(swapped.container, "item-a1"), el(swapped.container, "item-b1"));
    await expect.element(el(swapped.container, "readout-a")).toHaveTextContent("b1");
    await expect.element(el(swapped.container, "readout-b")).toHaveTextContent("a1");
    swapped.unmount();
  });
});

describe("SortableGroup inheritance and external controller", () => {
  beforeEach(stubReducedMotion);

  test("variant and styling inherit to neutral children", async () => {
    const { container } = render(SortableGroupBasic, { variant: VARIANT.ACTIVE, styling: "child-style" });
    const firstList = container.querySelector("ul") as HTMLElement;

    await expect.element(el(container, "item-a1")).toHaveAttribute("data-variant", VARIANT.ACTIVE);
    await expect.element(firstList).toHaveClass("child-style", PARTS.WHOLE, VARIANT.ACTIVE);
  });

  test("explicit non-neutral child variant and own styling win", async () => {
    const { container } = render(SortableGroupBasic, {
      variant: VARIANT.ACTIVE,
      styling: "group-style",
      childVariant: VARIANT.INACTIVE,
      childStyling: "child-style",
    });
    const firstList = container.querySelector("ul") as HTMLElement;

    await expect.element(el(container, "item-a1")).toHaveAttribute("data-variant", VARIANT.INACTIVE);
    await expect.element(firstList).toHaveClass("child-style", PARTS.WHOLE, VARIANT.INACTIVE);
  });

  test("external controller connects children and ignores wrapper presentation", async () => {
    const group = createSortableGroup();
    const { container } = render(SortableGroupExternal, { group, variant: VARIANT.ACTIVE });

    await expect.element(el(container, "item-a1")).toHaveAttribute("data-variant", VARIANT.NEUTRAL);
    await drag(el(container, "item-a1"), el(container, "item-b1"));
    await expect.element(el(container, "readout-b")).toHaveTextContent("a1,b1");
  });
});

describe("SortableGroup isolation", () => {
  beforeEach(stubReducedMotion);

  test("separate groups and standalone Sortable remain isolated", async () => {
    const first = render(SortableGroupBasic, { a: ["a1"], b: ["b1"] });
    const second = render(SortableGroupBasic, { a: ["x1"], b: ["y1"] });
    const standalone = render(SortableBasic, { items: ["s1", "s2"] });

    await drag(el(first.container, "item-a1"), el(first.container, "item-b1"));

    await expect.element(el(first.container, "readout-b")).toHaveTextContent("a1,b1");
    await expect.element(el(second.container, "readout-a")).toHaveTextContent("x1");
    await expect.element(el(second.container, "readout-b")).toHaveTextContent("y1");
    await expect.element(el(standalone.container, "value-readout")).toHaveTextContent("s1,s2");
  });

  test("a group drag over a standalone Sortable does not connect the lists", async () => {
    const group = render(SortableGroupBasic, { a: ["a1"], b: ["b1"] });
    const standalone = render(SortableBasic, { items: ["s1", "s2"] });

    await drag(el(group.container, "item-a1"), el(standalone.container, "item-s1"));

    await expect.element(el(group.container, "readout-a")).toHaveTextContent("a1");
    await expect.element(el(group.container, "readout-b")).toHaveTextContent("b1");
    await expect.element(el(standalone.container, "value-readout")).toHaveTextContent("s1,s2");
  });
});

describe("accessibility (axe)", () => {
  test("audits the default sortable group fixture", async () => {
    // Single composed audit: SortableGroup has no distinct a11y-differing second fixture state.
    const { container } = render(SortableGroupBasic, {});

    expect(await axe.run(container)).toHaveNoViolations();
  });
});
