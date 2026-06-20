import { describe, expect, test, vi } from "vitest";
import { render } from "vitest-browser-svelte";
import { createRawSnippet } from "svelte";
import ProgressTracker from "#svs/ProgressTracker.svelte";
import { PARTS, VARIANT } from "#svs/core";

const byText = (node: ParentNode, text: string) =>
  [...node.querySelectorAll("*")].reverse().find((el) => el.textContent?.trim() === text) ?? null;

const labels = ["Step 1", "Step 2", "Step 3", "Step 4"];
const auxid = "test-aux";
const extraid = "test-extra";
const childrenid = "test-children";

const auxfn = createRawSnippet((index: () => number, _label: () => string, variant: () => string) => {
  return { render: () => `<span data-testid="${auxid}">${variant()}-${index()}</span>` };
});

const extrafn = createRawSnippet((index: () => number, _label: () => string, variant: () => string) => {
  return { render: () => `<span data-testid="${extraid}">${variant()}-${index()}</span>` };
});

const childrenfn = createRawSnippet((index: () => number, label: () => string, _variant: () => string) => {
  return { render: () => `<span data-testid="${childrenid}">${label()}-${index()}</span>` };
});

describe("Basic structure and rendering", () => {
  test("basic rendering with labels", async () => {
    const { container } = render(ProgressTracker, { current: 1, labels });
    const list = container.querySelector("ol") as HTMLOListElement;
    const items = [...container.querySelectorAll("li")];

    expect(list.tagName).toBe("OL");
    expect(items).toHaveLength(4);

    // Check that each step is rendered
    await Promise.all(
      labels.map(async (label, index) => {
        const item = items[index];
        await expect.element(item).toHaveTextContent(label);
      }),
    );
  });

  test("current step has aria-current attribute", async () => {
    const { container } = render(ProgressTracker, { current: 2, labels });
    const items = [...container.querySelectorAll("li")];

    await Promise.all(
      items.map(async (item, index) => {
        if (index === 2) {
          await expect.element(item).toHaveAttribute("aria-current", "step");
        } else {
          await expect.element(item).toHaveAttribute("aria-current", "false");
        }
      }),
    );
  });

  test("with aux snippet", async () => {
    const aux = vi.fn().mockImplementation(auxfn);
    const { container } = render(ProgressTracker, {
      current: 1,
      labels,
      aux,
    });

    const items = [...container.querySelectorAll("li")];
    const auxElements = [...container.querySelectorAll(`[data-testid="${auxid}"]`)];

    expect(auxElements).toHaveLength(4);
    expect(aux).toHaveBeenCalledTimes(4);

    // Check that aux is rendered for each step
    await Promise.all(
      items.map(async (item) => {
        const auxElement = item.querySelector(`[data-testid="${auxid}"]`) as HTMLElement;
        await expect.element(auxElement).toBeInTheDocument();
      }),
    );
  });

  test("with extra snippet (separators)", async () => {
    const extra = vi.fn().mockImplementation(extrafn);
    const { container } = render(ProgressTracker, {
      current: 2,
      labels,
      extra,
    });

    const items = [...container.querySelectorAll("li")];
    const extraElements = [...container.querySelectorAll(`[data-testid="${extraid}"]`)];

    expect(items).toHaveLength(4);
    expect(extraElements).toHaveLength(labels.length - 1);
    expect(extra).toHaveBeenCalledTimes(labels.length - 1);

    await Promise.all(
      extraElements.map(async (extraElement) => {
        const extraParent = extraElement.parentElement;
        await expect.element(extraParent).toHaveClass("svs-progress-tracker", PARTS.EXTRA);
        await expect.element(extraParent).toHaveAttribute("aria-hidden", "true");
      }),
    );
  });

  test("children snippet replaces label", async () => {
    const children = vi.fn().mockImplementation(childrenfn);
    const { container } = render(ProgressTracker, {
      current: 1,
      labels,
      children,
    });

    const items = [...container.querySelectorAll("li")];
    const childrenElements = [...container.querySelectorAll(`[data-testid="${childrenid}"]`)];

    expect(childrenElements).toHaveLength(4);
    expect(children).toHaveBeenCalledTimes(4);

    await Promise.all(
      childrenElements.map(async (childrenElement, index) => {
        const labelParent = childrenElement.parentElement;
        await expect.element(labelParent).toHaveClass("svs-progress-tracker", PARTS.LABEL);
        expect(byText(labelParent as HTMLElement, labels[index])).toBeNull();
        expect(items[index].contains(childrenElement)).toBe(true);
      }),
    );
  });

  test("extra={false} renders no separators", async () => {
    const { container } = render(ProgressTracker, {
      current: 1,
      labels,
      extra: false,
    });

    expect([...container.querySelectorAll("li")]).toHaveLength(4);
    expect(container.querySelectorAll(".extra")).toHaveLength(0);
  });
});

describe("Status management and step states", () => {
  test("default variant initialization", async () => {
    const { container } = render(ProgressTracker, { current: 1, labels });
    const items = [...container.querySelectorAll("li")];

    // Check default variant classes are applied
    items.forEach((item) => {
      expect(item.className).toMatch(/svs-progress-tracker/);
    });
  });

  test("step variant based on current position", async () => {
    const props = $state({ current: 2, labels, variant: VARIANT.ACTIVE });
    const { container } = render(ProgressTracker, props);
    const items = [...container.querySelectorAll("li")];

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

  test("custom eachVariant map overrides default behavior", async () => {
    const eachVariant = new Map([
      [0, "custom-variant-0"],
      [2, "custom-variant-2"],
    ]);

    const { container } = render(ProgressTracker, {
      current: 1,
      labels,
      variant: VARIANT.NEUTRAL,
      eachVariant,
    });
    const items = [...container.querySelectorAll("li")];

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
    const { container, rerender } = render(ProgressTracker, props);

    let items = [...container.querySelectorAll("li")];
    expect(items[1].className).toContain(VARIANT.NEUTRAL);

    // Update variant
    props.variant = VARIANT.ACTIVE;
    await rerender(props);

    items = [...container.querySelectorAll("li")];
    expect(items[1].className).toContain(VARIANT.ACTIVE);
  });

  test("current position binding and updates", async () => {
    const props = $state({
      current: 0,
      labels,
      variant: VARIANT.ACTIVE,
    });
    const { container, rerender } = render(ProgressTracker, props);

    let items = [...container.querySelectorAll("li")];
    await expect.element(items[0]).toHaveAttribute("aria-current", "step");

    // Update current position
    props.current = 2;
    await rerender(props);

    items = [...container.querySelectorAll("li")];
    await expect.element(items[2]).toHaveAttribute("aria-current", "step");
    await expect.element(items[0]).toHaveAttribute("aria-current", "false");
  });
});

describe("Styling and CSS classes", () => {
  const seed = "svs-progress-tracker";

  test("default CSS classes", async () => {
    const { container } = render(ProgressTracker, {
      current: 1,
      labels,
      variant: VARIANT.NEUTRAL,
    });

    const list = container.querySelector("ol") as HTMLOListElement;
    const items = [...container.querySelectorAll("li")];

    await expect.element(list).toHaveClass(seed, PARTS.WHOLE, VARIANT.NEUTRAL);

    await Promise.all(
      items.map(async (item, index) => {
        await expect.element(item).toHaveClass(seed, PARTS.MIDDLE);

        // Check variant classes based on position
        if (index < 1) {
          await expect.element(item).toHaveClass(VARIANT.ACTIVE);
        } else if (index > 1) {
          await expect.element(item).toHaveClass(VARIANT.INACTIVE);
        } else {
          await expect.element(item).toHaveClass(VARIANT.NEUTRAL);
        }
      }),
    );
  });

  test("string styling override", async () => {
    const customStyle = "custom-tracker";
    const { container } = render(ProgressTracker, {
      current: 1,
      labels,
      variant: VARIANT.ACTIVE,
      styling: customStyle,
    });

    const list = container.querySelector("ol") as HTMLOListElement;
    const items = [...container.querySelectorAll("li")];

    await expect.element(list).toHaveClass(customStyle, PARTS.WHOLE, VARIANT.ACTIVE);

    await Promise.all(
      items.map(async (item) => {
        await expect.element(item).toHaveClass(customStyle, PARTS.MIDDLE);
      }),
    );
  });

  test("object styling configuration", async () => {
    const styling = {
      whole: { base: "whole-base", active: "whole-active" },
      middle: { base: "middle-base", active: "middle-active" },
      main: { base: "main-base", inactive: "main-inactive" },
      label: { base: "label-base", neutral: "label-neutral" },
      aux: { base: "aux-base", active: "aux-active" },
      extra: { base: "extra-base", inactive: "extra-inactive" },
    };

    const { container } = render(ProgressTracker, {
      current: 1,
      labels,
      variant: VARIANT.ACTIVE,
      styling,
      aux: auxfn,
      extra: extrafn,
    });

    const list = container.querySelector("ol");
    const items = [...container.querySelectorAll("li")];

    await expect.element(list as HTMLOListElement).toHaveClass("whole-base", "whole-active");

    // Check middle items
    await Promise.all(
      items.map(async (item) => {
        if (item.getAttribute("role") !== "separator") {
          await expect.element(item).toHaveClass("middle-base");

          // Check label classes
          const labelElement = item.querySelector(`.label-base`) as HTMLElement;
          await expect.element(labelElement).toBeInTheDocument();
        }
      }),
    );
  });

  test("CSS classes with aux and extra snippets", async () => {
    const { container } = render(ProgressTracker, {
      current: 1,
      labels,
      variant: VARIANT.ACTIVE,
      aux: auxfn,
      extra: extrafn,
    });

    const auxElements = [...container.querySelectorAll(`[data-testid="${auxid}"]`)];
    const extraElements = [...container.querySelectorAll(`[data-testid="${extraid}"]`)];

    // Check aux elements have proper parent classes
    await Promise.all(
      auxElements.map(async (auxElement) => {
        const auxParent = auxElement.parentElement;
        await expect.element(auxParent).toHaveClass(seed, PARTS.AUX);
      }),
    );

    // Check extra elements (separators) have proper classes
    await Promise.all(
      extraElements.map(async (extraElement) => {
        const extraParent = extraElement.parentElement;
        await expect.element(extraParent).toHaveClass(seed, PARTS.EXTRA);
        await expect.element(extraParent).toHaveAttribute("aria-hidden", "true");
      }),
    );
  });
});

describe("Accessibility and semantic structure", () => {
  test("proper ARIA attributes", async () => {
    const { container } = render(ProgressTracker, {
      current: 2,
      labels,
    });

    const list = container.querySelector("ol");
    const items = [...container.querySelectorAll("li")];

    expect((list as HTMLOListElement).tagName).toBe("OL");

    await Promise.all(
      items.map(async (item, index) => {
        expect(item.tagName).toBe("LI");

        if (index === 2) {
          await expect.element(item).toHaveAttribute("aria-current", "step");
        } else {
          await expect.element(item).toHaveAttribute("aria-current", "false");
        }
      }),
    );
  });

  test("label content is properly rendered", async () => {
    const { container } = render(ProgressTracker, {
      current: 1,
      labels,
    });

    const items = [...container.querySelectorAll("li")];

    await Promise.all(
      items.map(async (item, index) => {
        if (item.getAttribute("role") !== "separator") {
          await expect.element(item).toHaveTextContent(labels[index]);
        }
      }),
    );
  });

  test("statusLabels default folds completed into past-step aria-label", async () => {
    const { container } = render(ProgressTracker, {
      current: 2,
      labels,
    });

    const items = [...container.querySelectorAll("li")];

    await expect.element(items[0]).toHaveAttribute("aria-label", "Step 1, completed");
    await expect.element(items[1]).toHaveAttribute("aria-label", "Step 2, completed");
    await expect.element(items[2]).not.toHaveAttribute("aria-label");
    await expect.element(items[2]).toHaveAttribute("aria-current", "step");
    await expect.element(items[3]).not.toHaveAttribute("aria-label");
    await expect.element(items[3]).toHaveAttribute("aria-current", "false");
  });

  test("statusLabels override and disable", async () => {
    const override = render(ProgressTracker, {
      current: 1,
      labels,
      statusLabels: { active: "done", inactive: "todo" },
    });

    let items = [...override.container.querySelectorAll("li")];

    await expect.element(items[0]).toHaveAttribute("aria-label", "Step 1, done");
    await expect.element(items[1]).not.toHaveAttribute("aria-label");
    await expect.element(items[2]).toHaveAttribute("aria-label", "Step 3, todo");
    await expect.element(items[3]).toHaveAttribute("aria-label", "Step 4, todo");

    override.unmount();

    const disabled = render(ProgressTracker, {
      current: 1,
      labels,
      statusLabels: {},
    });

    items = [...disabled.container.querySelectorAll("li")];
    await Promise.all(
      items.map(async (item) => {
        await expect.element(item).not.toHaveAttribute("aria-label");
      }),
    );
  });

  test("ol receives pass-through attributes", async () => {
    const { container } = render(ProgressTracker, {
      current: 1,
      labels,
      "aria-label": "Checkout progress",
    });

    await expect.element(container.querySelector("ol")).toHaveAttribute("aria-label", "Checkout progress");
  });

  test("class prop merges with computed classes", async () => {
    const { container } = render(ProgressTracker, {
      current: 1,
      labels,
      class: "extra-class",
    });

    await expect.element(container.querySelector("ol")).toHaveClass("extra-class", "svs-progress-tracker", PARTS.WHOLE);
  });
});

describe("Edge cases and error handling", () => {
  test("empty labels array", async () => {
    const { container } = render(ProgressTracker, { current: 0, labels: [] });
    expect(container.querySelector("ol")).toBeNull();
    expect([...container.querySelectorAll("li")]).toHaveLength(0);
  });

  test("current position out of bounds", async () => {
    const { container } = render(ProgressTracker, {
      current: 10, // Out of bounds
      labels,
    });

    const items = [...container.querySelectorAll("li")];

    // All steps should be in active state (past steps)
    await Promise.all(
      items.map(async (item) => {
        if (item.getAttribute("role") !== "separator") {
          await expect.element(item).toHaveAttribute("aria-current", "false");
          expect(item.className).toContain(VARIANT.ACTIVE);
        }
      }),
    );
  });

  test("negative current position", async () => {
    const { container } = render(ProgressTracker, {
      current: -1,
      labels,
      variant: VARIANT.NEUTRAL,
    });

    const items = [...container.querySelectorAll("li")];

    // All steps should be in inactive state (future steps)
    await Promise.all(
      items.map(async (item, i) => {
        if (i > 0) {
          await expect.element(item).toHaveAttribute("aria-current", "false");
          expect(item.className).toContain(VARIANT.INACTIVE);
        } else {
          await expect.element(item).toHaveAttribute("aria-current", "step");
          expect(item.className).toContain(VARIANT.NEUTRAL);
        }
      }),
    );
  });

  test("non-integer current position", async () => {
    const { container } = render(ProgressTracker, {
      current: 1.5,
      labels,
      variant: VARIANT.NEUTRAL,
    });

    const items = [...container.querySelectorAll("li")];

    await expect.element(items[0]).toHaveAttribute("aria-current", "step");
    expect(items[0].className).toContain(VARIANT.NEUTRAL);

    await Promise.all(
      items.slice(1).map(async (item) => {
        await expect.element(item).toHaveAttribute("aria-current", "false");
        expect(item.className).toContain(VARIANT.INACTIVE);
      }),
    );
  });

  test("single label", async () => {
    const singleLabel = ["Only Step"];
    const { container } = render(ProgressTracker, {
      current: 0,
      labels: singleLabel,
    });

    container.querySelector("ol");
    const items = [...container.querySelectorAll("li")];

    expect(items).toHaveLength(1);
    await expect.element(items[0]).toHaveTextContent("Only Step");
    await expect.element(items[0]).toHaveAttribute("aria-current", "step");
  });

  test("eachVariant with SvelteMap", async () => {
    // Test with SvelteMap (though we're using regular Map in tests)
    const eachVariant = new Map([[1, "special-variant"]]);

    const { container } = render(ProgressTracker, {
      current: 0,
      labels,
      eachVariant,
    });

    const items = [...container.querySelectorAll("li")];
    expect(items[1].className).toContain("special-variant");
  });
});
