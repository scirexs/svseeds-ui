import { afterEach, describe, expect, test, vi } from "vitest";
import { render, within } from "@testing-library/svelte";
import { createRawSnippet } from "svelte";
import ProgressTracker from "#svs/_ProgressTracker.svelte";
import { PARTS, VARIANT } from "#svs/core";

const labels = ["Step 1", "Step 2", "Step 3", "Step 4"];
const auxid = "test-aux";
const extraid = "test-extra";
const childrenid = "test-children";

const auxfn = createRawSnippet((index: () => number, label: () => string, variant: () => string) => {
  return { render: () => `<span data-testid="${auxid}">${variant()}-${index()}</span>` };
});

const extrafn = createRawSnippet((index: () => number, label: () => string, variant: () => string) => {
  return { render: () => `<span data-testid="${extraid}">${variant()}-${index()}</span>` };
});

const childrenfn = createRawSnippet((index: () => number, label: () => string, variant: () => string) => {
  return { render: () => `<span data-testid="${childrenid}">${label()}-${index()}</span>` };
});

describe("Basic structure and rendering", () => {
  test("basic rendering with labels", () => {
    const { getByRole, getAllByRole } = render(ProgressTracker, { current: 1, labels });
    const list = getByRole("list") as HTMLOListElement;
    const items = getAllByRole("listitem");

    expect(list.tagName).toBe("OL");
    expect(items).toHaveLength(4);

    // Check that each step is rendered
    labels.forEach((label, index) => {
      const item = items[index];
      expect(item).toHaveTextContent(label);
    });
  });

  test("current step has aria-current attribute", () => {
    const { getAllByRole } = render(ProgressTracker, { current: 2, labels });
    const items = getAllByRole("listitem");

    items.forEach((item, index) => {
      if (index === 2) {
        expect(item).toHaveAttribute("aria-current", "step");
      } else {
        expect(item).toHaveAttribute("aria-current", "false");
      }
    });
  });

  test("with aux snippet", () => {
    const aux = vi.fn().mockImplementation(auxfn);
    const { getAllByRole, getAllByTestId } = render(ProgressTracker, {
      current: 1,
      labels,
      aux,
    });

    const items = getAllByRole("listitem");
    const auxElements = getAllByTestId(auxid);

    expect(auxElements).toHaveLength(4);
    expect(aux).toHaveBeenCalledTimes(4);

    // Check that aux is rendered for each step
    items.forEach((item, index) => {
      const auxElement = within(item).getByTestId(auxid);
      expect(auxElement).toBeInTheDocument();
    });
  });

  test("with extra snippet (separators)", () => {
    const extra = vi.fn().mockImplementation(extrafn);
    const { getAllByRole, getAllByTestId } = render(ProgressTracker, {
      current: 2,
      labels,
      extra,
    });

    const items = getAllByRole("listitem");
    const extraElements = getAllByTestId(extraid);

    expect(items).toHaveLength(4);
    expect(extraElements).toHaveLength(labels.length - 1);
    expect(extra).toHaveBeenCalledTimes(labels.length - 1);

    extraElements.forEach((extraElement) => {
      const extraParent = extraElement.parentElement;
      expect(extraParent).toHaveClass("svs-progress-tracker", PARTS.EXTRA);
      expect(extraParent).toHaveAttribute("aria-hidden", "true");
    });
  });

  test("children snippet replaces label", () => {
    const children = vi.fn().mockImplementation(childrenfn);
    const { getAllByRole, getAllByTestId } = render(ProgressTracker, {
      current: 1,
      labels,
      children,
    });

    const items = getAllByRole("listitem");
    const childrenElements = getAllByTestId(childrenid);

    expect(childrenElements).toHaveLength(4);
    expect(children).toHaveBeenCalledTimes(4);

    childrenElements.forEach((childrenElement, index) => {
      const labelParent = childrenElement.parentElement;
      expect(labelParent).toHaveClass("svs-progress-tracker", PARTS.LABEL);
      expect(within(labelParent as HTMLElement).queryByText(labels[index], { exact: true })).toBeNull();
      expect(items[index]).toContainElement(childrenElement);
    });
  });

  test("extra={false} renders no separators", () => {
    const { container, getAllByRole } = render(ProgressTracker, {
      current: 1,
      labels,
      extra: false,
    });

    expect(getAllByRole("listitem")).toHaveLength(4);
    expect(container.querySelectorAll(".extra")).toHaveLength(0);
  });
});

describe("Status management and step states", () => {
  test("default variant initialization", () => {
    const { getAllByRole } = render(ProgressTracker, { current: 1, labels });
    const items = getAllByRole("listitem");

    // Check default variant classes are applied
    items.forEach((item) => {
      expect(item.className).toMatch(/svs-progress-tracker/);
    });
  });

  test("step variant based on current position", () => {
    const props = $state({ current: 2, labels, variant: VARIANT.ACTIVE });
    const { getAllByRole } = render(ProgressTracker, props);
    const items = getAllByRole("listitem");

    items.forEach((item, index) => {
      if (index < props.current) {
        // Past steps should have ACTIVE variant
        expect(item.className).toContain(VARIANT.ACTIVE);
      } else if (index > props.current) {
        // Future steps should have INACTIVE variant
        expect(item.className).toContain(VARIANT.INACTIVE);
      } else {
        // Current step should have the specified variant
        expect(item.className).toContain(props.variant);
      }
    });
  });

  test("custom eachVariant map overrides default behavior", () => {
    const eachVariant = new Map([
      [0, "custom-variant-0"],
      [2, "custom-variant-2"],
    ]);

    const { getAllByRole } = render(ProgressTracker, {
      current: 1,
      labels,
      variant: VARIANT.NEUTRAL,
      eachVariant,
    });
    const items = getAllByRole("listitem");

    // Check custom variant is applied
    expect(items[0].className).toContain("custom-variant-0");
    expect(items[2].className).toContain("custom-variant-2");

    // Other steps should follow default logic
    expect(items[1].className).toContain(VARIANT.NEUTRAL); // current step
    expect(items[3].className).toContain(VARIANT.INACTIVE); // future step
  });

  test("variant binding and updates", async () => {
    const props = $state({
      current: 1,
      labels,
      variant: VARIANT.NEUTRAL as string,
    });
    const { rerender, getAllByRole } = render(ProgressTracker, props);

    let items = getAllByRole("listitem");
    expect(items[1].className).toContain(VARIANT.NEUTRAL);

    // Update variant
    props.variant = VARIANT.ACTIVE;
    await rerender(props);

    items = getAllByRole("listitem");
    expect(items[1].className).toContain(VARIANT.ACTIVE);
  });

  test("current position binding and updates", async () => {
    const props = $state({
      current: 0,
      labels,
      variant: VARIANT.ACTIVE,
    });
    const { rerender, getAllByRole } = render(ProgressTracker, props);

    let items = getAllByRole("listitem");
    expect(items[0]).toHaveAttribute("aria-current", "step");

    // Update current position
    props.current = 2;
    await rerender(props);

    items = getAllByRole("listitem");
    expect(items[2]).toHaveAttribute("aria-current", "step");
    expect(items[0]).toHaveAttribute("aria-current", "false");
  });
});

describe("Styling and CSS classes", () => {
  const seed = "svs-progress-tracker";

  test("default CSS classes", () => {
    const { getByRole, getAllByRole } = render(ProgressTracker, {
      current: 1,
      labels,
      variant: VARIANT.NEUTRAL,
    });

    const list = getByRole("list");
    const items = getAllByRole("listitem");

    expect(list).toHaveClass(seed, PARTS.WHOLE, VARIANT.NEUTRAL);

    items.forEach((item, index) => {
      expect(item).toHaveClass(seed, PARTS.MIDDLE);

      // Check variant classes based on position
      if (index < 1) {
        expect(item).toHaveClass(VARIANT.ACTIVE);
      } else if (index > 1) {
        expect(item).toHaveClass(VARIANT.INACTIVE);
      } else {
        expect(item).toHaveClass(VARIANT.NEUTRAL);
      }
    });
  });

  test("string styling override", () => {
    const customStyle = "custom-tracker";
    const { getByRole, getAllByRole } = render(ProgressTracker, {
      current: 1,
      labels,
      variant: VARIANT.ACTIVE,
      styling: customStyle,
    });

    const list = getByRole("list");
    const items = getAllByRole("listitem");

    expect(list).toHaveClass(customStyle, PARTS.WHOLE, VARIANT.ACTIVE);

    items.forEach((item) => {
      expect(item).toHaveClass(customStyle, PARTS.MIDDLE);
    });
  });

  test("object styling configuration", () => {
    const styling = {
      whole: { base: "whole-base", active: "whole-active" },
      middle: { base: "middle-base", active: "middle-active" },
      main: { base: "main-base", inactive: "main-inactive" },
      label: { base: "label-base", neutral: "label-neutral" },
      aux: { base: "aux-base", active: "aux-active" },
      extra: { base: "extra-base", inactive: "extra-inactive" },
    };

    const { getByRole, getAllByRole, getAllByTestId } = render(ProgressTracker, {
      current: 1,
      labels,
      variant: VARIANT.ACTIVE,
      styling,
      aux: auxfn,
      extra: extrafn,
    });

    const list = getByRole("list");
    const items = getAllByRole("listitem");

    expect(list).toHaveClass("whole-base", "whole-active");

    // Check middle items
    items.forEach((item, index) => {
      if (item.getAttribute("role") !== "separator") {
        expect(item).toHaveClass("middle-base");

        // Check label classes
        const labelElement = item.querySelector(`.label-base`);
        expect(labelElement).toBeInTheDocument();
      }
    });
  });

  test("CSS classes with aux and extra snippets", () => {
    const { getAllByRole, getAllByTestId } = render(ProgressTracker, {
      current: 1,
      labels,
      variant: VARIANT.ACTIVE,
      aux: auxfn,
      extra: extrafn,
    });

    const auxElements = getAllByTestId(auxid);
    const extraElements = getAllByTestId(extraid);

    // Check aux elements have proper parent classes
    auxElements.forEach((auxElement) => {
      const auxParent = auxElement.parentElement;
      expect(auxParent).toHaveClass(seed, PARTS.AUX);
    });

    // Check extra elements (separators) have proper classes
    extraElements.forEach((extraElement) => {
      const extraParent = extraElement.parentElement;
      expect(extraParent).toHaveClass(seed, PARTS.EXTRA);
      expect(extraParent).toHaveAttribute("aria-hidden", "true");
    });
  });
});

describe("Accessibility and semantic structure", () => {
  test("proper ARIA attributes", () => {
    const { getByRole, getAllByRole } = render(ProgressTracker, {
      current: 2,
      labels,
    });

    const list = getByRole("list");
    const items = getAllByRole("listitem");

    expect(list.tagName).toBe("OL");

    items.forEach((item, index) => {
      expect(item.tagName).toBe("LI");

      if (index === 2) {
        expect(item).toHaveAttribute("aria-current", "step");
      } else {
        expect(item).toHaveAttribute("aria-current", "false");
      }
    });
  });

  test("label content is properly rendered", () => {
    const { getAllByRole } = render(ProgressTracker, {
      current: 1,
      labels,
    });

    const items = getAllByRole("listitem");

    items.forEach((item, index) => {
      if (item.getAttribute("role") !== "separator") {
        expect(item).toHaveTextContent(labels[index]);
      }
    });
  });

  test("statusLabels default folds completed into past-step aria-label", () => {
    const { getAllByRole } = render(ProgressTracker, {
      current: 2,
      labels,
    });

    const items = getAllByRole("listitem");

    expect(items[0]).toHaveAttribute("aria-label", "Step 1, completed");
    expect(items[1]).toHaveAttribute("aria-label", "Step 2, completed");
    expect(items[2]).not.toHaveAttribute("aria-label");
    expect(items[2]).toHaveAttribute("aria-current", "step");
    expect(items[3]).not.toHaveAttribute("aria-label");
    expect(items[3]).toHaveAttribute("aria-current", "false");
  });

  test("statusLabels override and disable", () => {
    const override = render(ProgressTracker, {
      current: 1,
      labels,
      statusLabels: { active: "done", inactive: "todo" },
    });

    let items = override.getAllByRole("listitem");

    expect(items[0]).toHaveAttribute("aria-label", "Step 1, done");
    expect(items[1]).not.toHaveAttribute("aria-label");
    expect(items[2]).toHaveAttribute("aria-label", "Step 3, todo");
    expect(items[3]).toHaveAttribute("aria-label", "Step 4, todo");

    override.unmount();

    const disabled = render(ProgressTracker, {
      current: 1,
      labels,
      statusLabels: {},
    });

    items = disabled.getAllByRole("listitem");
    items.forEach((item) => {
      expect(item).not.toHaveAttribute("aria-label");
    });
  });

  test("ol receives pass-through attributes", () => {
    const { getByRole } = render(ProgressTracker, {
      current: 1,
      labels,
      "aria-label": "Checkout progress",
    });

    expect(getByRole("list", { name: "Checkout progress" })).toHaveAttribute("aria-label", "Checkout progress");
  });

  test("class prop merges with computed classes", () => {
    const { getByRole } = render(ProgressTracker, {
      current: 1,
      labels,
      class: "extra-class",
    });

    expect(getByRole("list")).toHaveClass("extra-class", "svs-progress-tracker", PARTS.WHOLE);
  });
});

describe("Edge cases and error handling", () => {
  test("empty labels array", () => {
    const { queryByRole, queryAllByRole } = render(ProgressTracker, { current: 0, labels: [] });
    expect(queryByRole("list")).toBeNull();
    expect(queryAllByRole("listitem")).toHaveLength(0);
  });

  test("current position out of bounds", () => {
    const { getAllByRole } = render(ProgressTracker, {
      current: 10, // Out of bounds
      labels,
    });

    const items = getAllByRole("listitem");

    // All steps should be in active state (past steps)
    items.forEach((item) => {
      if (item.getAttribute("role") !== "separator") {
        expect(item).toHaveAttribute("aria-current", "false");
        expect(item.className).toContain(VARIANT.ACTIVE);
      }
    });
  });

  test("negative current position", () => {
    const { getAllByRole } = render(ProgressTracker, {
      current: -1,
      labels,
      variant: VARIANT.NEUTRAL,
    });

    const items = getAllByRole("listitem");

    // All steps should be in inactive state (future steps)
    items.forEach((item, i) => {
      if (i > 0) {
        expect(item).toHaveAttribute("aria-current", "false");
        expect(item.className).toContain(VARIANT.INACTIVE);
      } else {
        expect(item).toHaveAttribute("aria-current", "step");
        expect(item.className).toContain(VARIANT.NEUTRAL);
      }
    });
  });

  test("non-integer current position", () => {
    const { getAllByRole } = render(ProgressTracker, {
      current: 1.5,
      labels,
      variant: VARIANT.NEUTRAL,
    });

    const items = getAllByRole("listitem");

    expect(items[0]).toHaveAttribute("aria-current", "step");
    expect(items[0].className).toContain(VARIANT.NEUTRAL);

    items.slice(1).forEach((item) => {
      expect(item).toHaveAttribute("aria-current", "false");
      expect(item.className).toContain(VARIANT.INACTIVE);
    });
  });

  test("single label", () => {
    const singleLabel = ["Only Step"];
    const { getByRole, getAllByRole } = render(ProgressTracker, {
      current: 0,
      labels: singleLabel,
    });

    const list = getByRole("list");
    const items = getAllByRole("listitem");

    expect(items).toHaveLength(1);
    expect(items[0]).toHaveTextContent("Only Step");
    expect(items[0]).toHaveAttribute("aria-current", "step");
  });

  test("eachVariant with SvelteMap", () => {
    // Test with SvelteMap (though we're using regular Map in tests)
    const eachVariant = new Map([[1, "special-variant"]]);

    const { getAllByRole } = render(ProgressTracker, {
      current: 0,
      labels,
      eachVariant,
    });

    const items = getAllByRole("listitem");
    expect(items[1].className).toContain("special-variant");
  });
});
