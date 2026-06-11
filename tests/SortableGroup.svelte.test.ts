import { afterEach, describe, expect, test } from "vitest";
import { cleanup, fireEvent, render, within } from "@testing-library/svelte";
import { tick } from "svelte";
import SortableGroupBasic from "./fixtures/SortableGroupBasic.svelte";
import SortableGroupExternal from "./fixtures/SortableGroupExternal.svelte";
import SortableBasic from "./fixtures/SortableBasic.svelte";
import { createSortableGroup } from "#svs/_Sortable.svelte";
import { PARTS, VARIANT, fnClass } from "#svs/core";

async function drag(origin: HTMLElement, over: HTMLElement | null) {
  await fireEvent.pointerDown(origin, { button: 0, buttons: 1, clientX: 0, clientY: 0 });
  await tick();
  await fireEvent.pointerMove(window, { buttons: 1, clientX: 20, clientY: 20 });
  await tick();
  if (over) await fireEvent.pointerOver(over, { buttons: 1 });
  await tick();
  await fireEvent.pointerUp(window, { clientX: 20, clientY: 20 });
  await tick();
}

afterEach(() => cleanup());

describe("SortableGroup structure", () => {
  test("renders a role=group container with children", () => {
    const { getByRole, container } = render(SortableGroupBasic);
    const group = getByRole("group");

    expect(group).toHaveClass("svs-sortable-group", PARTS.WHOLE, VARIANT.NEUTRAL);
    expect(container.querySelectorAll("ul")).toHaveLength(2);
  });

  test("custom styling applies to the wrapper whole", () => {
    const styling = "custom-group";
    const cls = fnClass("svs-sortable-group", styling);
    const { getByRole } = render(SortableGroupBasic, { styling });

    expect(getByRole("group").className).toBe(cls(PARTS.WHOLE, VARIANT.NEUTRAL));
  });
});

describe("SortableGroup context wiring", () => {
  test("children without group props move items through context", async () => {
    const props = $state({ a: ["a1", "a2"], b: ["b1"] });
    const { getByTestId } = render(SortableGroupBasic, props);

    await drag(getByTestId("item-a1"), getByTestId("item-b1"));

    expect(getByTestId("readout-a")).toHaveTextContent("a2");
    expect(getByTestId("readout-b")).toHaveTextContent("a1,b1");
    expect(props.a).toEqual(["a2"]);
    expect(props.b).toEqual(["a1", "b1"]);
  });

  test("accept and swap still apply inside the wrapper", async () => {
    const blocked = render(SortableGroupBasic, { acceptB: [] });
    await drag(blocked.getByTestId("item-a1"), blocked.getByTestId("item-b1"));
    expect(blocked.getByTestId("readout-a")).toHaveTextContent("a1,a2");
    expect(blocked.getByTestId("readout-b")).toHaveTextContent("b1,b2");
    blocked.unmount();

    const swapped = render(SortableGroupBasic, { mode: "swap", a: ["a1"], b: ["b1"] });
    await drag(swapped.getByTestId("item-a1"), swapped.getByTestId("item-b1"));
    expect(swapped.getByTestId("readout-a")).toHaveTextContent("b1");
    expect(swapped.getByTestId("readout-b")).toHaveTextContent("a1");
  });
});

describe("SortableGroup inheritance and external controller", () => {
  test("variant and styling inherit to neutral children", () => {
    const { getByTestId, container } = render(SortableGroupBasic, { variant: VARIANT.ACTIVE, styling: "child-style" });
    const firstList = container.querySelector("ul");

    expect(getByTestId("item-a1")).toHaveAttribute("data-variant", VARIANT.ACTIVE);
    expect(firstList).toHaveClass("child-style", PARTS.WHOLE, VARIANT.ACTIVE);
  });

  test("explicit non-neutral child variant and own styling win", () => {
    const { getByTestId, container } = render(SortableGroupBasic, {
      variant: VARIANT.ACTIVE,
      styling: "group-style",
      childVariant: VARIANT.INACTIVE,
      childStyling: "child-style",
    });
    const firstList = container.querySelector("ul");

    expect(getByTestId("item-a1")).toHaveAttribute("data-variant", VARIANT.INACTIVE);
    expect(firstList).toHaveClass("child-style", PARTS.WHOLE, VARIANT.INACTIVE);
  });

  test("external controller connects children and ignores wrapper presentation", async () => {
    const group = createSortableGroup();
    const { getByTestId } = render(SortableGroupExternal, { group, variant: VARIANT.ACTIVE });

    expect(getByTestId("item-a1")).toHaveAttribute("data-variant", VARIANT.NEUTRAL);
    await drag(getByTestId("item-a1"), getByTestId("item-b1"));
    expect(getByTestId("readout-b")).toHaveTextContent("a1,b1");
  });
});

describe("SortableGroup isolation", () => {
  test("separate groups and standalone Sortable remain isolated", async () => {
    const first = render(SortableGroupBasic, { a: ["a1"], b: ["b1"] });
    const second = render(SortableGroupBasic, { a: ["x1"], b: ["y1"] });
    const standalone = render(SortableBasic, { items: ["s1", "s2"] });
    const firstView = within(first.container);
    const secondView = within(second.container);
    const standaloneView = within(standalone.container);

    await drag(firstView.getByTestId("item-a1"), firstView.getByTestId("item-b1"));

    expect(firstView.getByTestId("readout-b")).toHaveTextContent("a1,b1");
    expect(secondView.getByTestId("readout-a")).toHaveTextContent("x1");
    expect(secondView.getByTestId("readout-b")).toHaveTextContent("y1");
    expect(standaloneView.getByTestId("value-readout")).toHaveTextContent("s1,s2");
  });

  test("a group drag over a standalone Sortable does not connect the lists", async () => {
    const group = render(SortableGroupBasic, { a: ["a1"], b: ["b1"] });
    const standalone = render(SortableBasic, { items: ["s1", "s2"] });
    const groupView = within(group.container);
    const standaloneView = within(standalone.container);

    await drag(groupView.getByTestId("item-a1"), standaloneView.getByTestId("item-s1"));

    expect(groupView.getByTestId("readout-a")).toHaveTextContent("a1");
    expect(groupView.getByTestId("readout-b")).toHaveTextContent("b1");
    expect(standaloneView.getByTestId("value-readout")).toHaveTextContent("s1,s2");
  });
});
