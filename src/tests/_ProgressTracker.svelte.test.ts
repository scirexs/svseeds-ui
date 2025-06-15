import { afterEach, describe, expect, test, vi } from "vitest";
import { render, within } from "@testing-library/svelte";
import { createRawSnippet } from "svelte";
import ProgressTracker from "../lib/_svseeds/_ProgressTracker.svelte";
import { PARTS, VARIANT } from "../lib/_svseeds/core.ts";

const labels = ["Step 1", "Step 2", "Step 3", "Step 4"];
const auxid = "test-aux";
const extraid = "test-extra";

const auxfn = createRawSnippet(
  (
    variant: () => string,
    index: () => number,
  ) => {
    return { render: () => `<span data-testid="${auxid}">${variant()}-${index()}</span>` };
  },
);

const extrafn = createRawSnippet(
  (
    variant: () => string,
    index: () => number,
  ) => {
    return { render: () => `<span data-testid="${extraid}">${variant()}-${index()}</span>` };
  },
);

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

    // Extra elements should be rendered as separators
    // Should have separators between steps (labels.length - 1)
    expect(extraElements.length).toBeGreaterThan(0);
    expect(extra).toHaveBeenCalled();

    // Check that separators have role="separator"
    const separators = getAllByRole("separator");
    expect(separators.length).toBeGreaterThan(0);
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
      variant: "",
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
      expect(extraParent).toHaveAttribute("role", "separator");
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
});

describe("Edge cases and error handling", () => {
  // test("empty labels array", () => {
  //   const { container } = render(ProgressTracker, { current: 0, labels: [] });
  //   expect(container.firstChild).toBeNull();
  // });

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
    const eachVariant = new Map([
      [1, "special-variant"],
    ]);

    const { getAllByRole } = render(ProgressTracker, {
      current: 0,
      labels,
      eachVariant,
    });

    const items = getAllByRole("listitem");
    expect(items[1].className).toContain("special-variant");
  });
});
