import { afterEach, describe, expect, test, vi } from "vitest";
import { fireEvent, render, waitFor } from "@testing-library/svelte";
import { createRawSnippet, tick } from "svelte";
import WheelPicker, { type WheelOption } from "#svs/_WheelPicker.svelte";
import { PARTS, VARIANT } from "#svs/core";

const seed = "svs-wheelpicker";
const opts: WheelOption[] = [
  { value: "jan", text: "January" },
  { value: "feb", text: "February" },
  { value: "mar", text: "March", disabled: true },
  { value: "apr", text: "April" },
];
const labelid = "test-label";
const labelfn = createRawSnippet((option: () => WheelOption, variant: () => string, index: () => number) => {
  const text = () => `${option().value}:${variant()}:${index()}`;
  return {
    render: () => `<span data-testid="${labelid}-${index()}">${text()}</span>`,
    setup: (node: Element) => {
      $effect(() => {
        node.textContent = text();
      });
    },
  };
});

const sel = (c: HTMLElement) => c.querySelector("select") as HTMLSelectElement;
const whole = (c: HTMLElement) => c.querySelector(`.${PARTS.WHOLE}`) as HTMLElement;
const labels = (c: HTMLElement) => Array.from(c.querySelectorAll(`.${PARTS.LABEL}`)) as HTMLElement[];
let seenResizeObservers: MockResizeObserver[] = [];
class MockResizeObserver {
  observe = vi.fn();
  disconnect = vi.fn();

  constructor() {
    seenResizeObservers.push(this);
  }
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("Rendering and options", () => {
  test("renders select options in array order", () => {
    const { container } = render(WheelPicker, { options: opts });
    const main = sel(container);
    const options = Array.from(main.options);

    expect(options).toHaveLength(opts.length);
    expect(options.map((o) => o.value)).toEqual(["jan", "feb", "mar", "apr"]);
    expect(options.map((o) => o.textContent)).toEqual(["January", "February", "March", "April"]);
    expect(options[2]).toBeDisabled();
  });

  test("renders default parts and aria ownership", () => {
    const { container } = render(WheelPicker, { options: opts });
    const root = whole(container);
    const main = sel(container);
    const middle = root.querySelector(`.${PARTS.MIDDLE}`) as HTMLElement;
    const aux = root.querySelector(`.${PARTS.AUX}`) as HTMLElement;
    const extra = root.querySelector(`.${PARTS.EXTRA}`) as HTMLElement;

    expect(root).toHaveClass(seed, PARTS.WHOLE, VARIANT.NEUTRAL);
    expect(main).toHaveClass(seed, PARTS.MAIN, VARIANT.NEUTRAL);
    expect(middle).toHaveClass(seed, PARTS.MIDDLE, VARIANT.NEUTRAL);
    expect(aux).toHaveClass(seed, PARTS.AUX, VARIANT.NEUTRAL);
    expect(extra).toHaveClass(seed, PARTS.EXTRA, VARIANT.NEUTRAL);
    expect(middle).toHaveAttribute("aria-hidden", "true");
    expect(aux).toHaveAttribute("aria-hidden", "true");
    expect(extra).toHaveAttribute("aria-hidden", "true");
    expect(main).not.toHaveAttribute("aria-hidden");
  });

  test("renders labels and supports a custom label snippet", () => {
    const label = vi.fn().mockImplementation(labelfn);
    const { container, getByTestId } = render(WheelPicker, { options: opts, value: "feb", label });

    expect(labels(container).map((x) => x.textContent)).toEqual(["jan:neutral:0", "feb:active:1", "mar:inactive:2", "apr:neutral:3"]);
    expect(getByTestId(`${labelid}-1`)).toHaveTextContent("feb:active:1");
    expect(label).toHaveBeenCalled();
  });
});

describe("Default value and binding", () => {
  test("defaults to the first enabled option", () => {
    const { container } = render(WheelPicker, { options: opts });
    expect(sel(container)).toHaveValue("jan");
  });

  test("skips a disabled first option for the default value", () => {
    const options = [{ ...opts[0], disabled: true }, ...opts.slice(1)];
    const { container } = render(WheelPicker, { options });
    expect(sel(container)).toHaveValue("feb");
  });

  test("marks selected and disabled labels with precedence", () => {
    const { container } = render(WheelPicker, { options: opts, value: "apr" });
    const rows = labels(container);

    expect(sel(container)).toHaveValue("apr");
    expect(rows[3]).toHaveClass(VARIANT.ACTIVE);
    expect(rows[2]).toHaveClass(VARIANT.INACTIVE);
    expect(rows[0]).toHaveClass(VARIANT.NEUTRAL);
  });

  test("two-way binding follows select changes", async () => {
    const props = $state({ options: opts, value: "jan" });
    const { container } = render(WheelPicker, props);
    const main = sel(container);

    await fireEvent.change(main, { target: { value: "feb" } });

    await waitFor(() => expect(props.value).toBe("feb"));
    expect(labels(container)[1]).toHaveClass(VARIANT.ACTIVE);
  });

  test("value prop updates select and active label", async () => {
    const props = $state({ options: opts, value: "jan" });
    const { container, rerender } = render(WheelPicker, props);

    props.value = "apr";
    await rerender(props);

    expect(sel(container)).toHaveValue("apr");
    expect(labels(container)[3]).toHaveClass(VARIANT.ACTIVE);
  });

  test("empty options render an empty select", () => {
    const props = $state({ options: [] as WheelOption[], value: undefined as string | undefined });
    const { container } = render(WheelPicker, props);

    expect(sel(container).options).toHaveLength(0);
    expect(props.value).toBe("");
  });
});

describe("Variant and styling", () => {
  test("component variant applies to parts while item states override labels", () => {
    const { container } = render(WheelPicker, { options: opts, value: "feb", variant: VARIANT.ACTIVE });
    const root = whole(container);
    const main = sel(container);
    const middle = root.querySelector(`.${PARTS.MIDDLE}`) as HTMLElement;
    const aux = root.querySelector(`.${PARTS.AUX}`) as HTMLElement;
    const extra = root.querySelector(`.${PARTS.EXTRA}`) as HTMLElement;
    const rows = labels(container);

    expect(root).toHaveClass(VARIANT.ACTIVE);
    expect(main).toHaveClass(VARIANT.ACTIVE);
    expect(middle).toHaveClass(VARIANT.ACTIVE);
    expect(aux).toHaveClass(VARIANT.ACTIVE);
    expect(extra).toHaveClass(VARIANT.ACTIVE);
    expect(rows[1]).toHaveClass(VARIANT.ACTIVE);
    expect(rows[2]).toHaveClass(VARIANT.INACTIVE);
    expect(rows[0]).toHaveClass(VARIANT.ACTIVE);
  });

  test("styling string replaces the preset on parts", () => {
    const { container } = render(WheelPicker, { options: opts, styling: "x" });
    const root = whole(container);

    expect(root).toHaveClass("x", PARTS.WHOLE, VARIANT.NEUTRAL);
    expect(root).not.toHaveClass(seed);
    expect(sel(container)).toHaveClass("x", PARTS.MAIN, VARIANT.NEUTRAL);
  });
});

describe("cssvar mirror", () => {
  test("omits whole style when cssvar is absent", () => {
    const { container } = render(WheelPicker, { options: opts });
    expect(whole(container).getAttribute("style") ?? "").toBe("");
  });

  test("mirrors only named perspective and maxAngle properties", () => {
    const { container } = render(WheelPicker, { options: opts, perspective: 800, cssvar: { perspective: "--depth", maxAngle: "--ang" } });
    const style = whole(container).style;

    expect(style.getPropertyValue("--depth")).toBe("800px");
    expect(style.getPropertyValue("--ang")).toBe("60deg");
    expect(style.getPropertyValue("--row-h")).toBe("");
    expect(style.getPropertyValue("--n")).toBe("");
  });

  test("mirrors visible when named", () => {
    const { container } = render(WheelPicker, { options: opts, cssvar: { visible: "--n" } });
    expect(whole(container).style.getPropertyValue("--n")).not.toBe("");
  });

  test("mirrors itemHeight when named", () => {
    const { container } = render(WheelPicker, { options: opts, cssvar: { itemHeight: "--row-h" } });
    expect(whole(container).style.getPropertyValue("--row-h")).not.toBe("");
  });
});

describe("Form and rest passthrough", () => {
  test("name participates in form data and unnamed controls do not", () => {
    const named = render(WheelPicker, { options: opts, value: "feb", name: "month" });
    const form = document.createElement("form");
    form.append(whole(named.container));
    expect(new FormData(form).get("month")).toBe("feb");
    named.unmount();

    const unnamed = render(WheelPicker, { options: opts, value: "feb" });
    const form2 = document.createElement("form");
    form2.append(whole(unnamed.container));
    expect(new FormData(form2).get("month")).toBeNull();
    unnamed.unmount();
  });

  test("passes arbitrary rest attrs to the select", () => {
    const { container } = render(WheelPicker, { options: opts, "data-x": "1", "aria-label": "Month" });
    const main = sel(container);

    expect(main).toHaveAttribute("data-x", "1");
    expect(main).toHaveAttribute("aria-label", "Month");
  });

  test("component-owned attrs are not overridden by rest", () => {
    const { container } = render(WheelPicker, { options: opts, "aria-orientation": "horizontal", multiple: true, size: 4 } as any);
    const main = sel(container);
    const middle = whole(container).querySelector(`.${PARTS.MIDDLE}`) as HTMLElement;

    expect(main).toHaveAttribute("aria-orientation", "vertical");
    expect(main.multiple).toBe(false);
    expect(main).not.toHaveAttribute("size");
    expect(middle).toHaveAttribute("aria-hidden", "true");
  });

  test("rest aria-hidden cannot hide the native select source of truth", () => {
    const { container } = render(WheelPicker, { options: opts, "aria-hidden": "true" } as any);

    expect(sel(container)).not.toHaveAttribute("aria-hidden");
  });

  test("calls the native change handler", async () => {
    const onchange = vi.fn();
    const { container } = render(WheelPicker, { options: opts, onchange });
    const main = sel(container);

    await fireEvent.change(main, { target: { value: "feb" } });

    expect(onchange).toHaveBeenCalledTimes(1);
    expect(onchange.mock.calls[0][0].target).toBe(main);
  });
});

describe("attach and element", () => {
  test("attach receives the select element", () => {
    const attach = vi.fn((node: Element) => {
      (node as HTMLSelectElement).dataset.attached = "1";
    });
    const { container } = render(WheelPicker, { options: opts, attach });
    const main = sel(container);

    expect(attach).toHaveBeenCalled();
    expect(main.dataset.attached).toBe("1");
  });

  test("element binding is populated", async () => {
    const props = $state({ options: opts, element: undefined as HTMLSelectElement | undefined });
    const { container } = render(WheelPicker, props);
    await tick();

    expect(props.element).toBe(sel(container));
  });
});

describe("Geometry observers", () => {
  test("disconnects ResizeObserver on unmount", async () => {
    seenResizeObservers = [];
    vi.stubGlobal("ResizeObserver", MockResizeObserver);

    const rendered = render(WheelPicker, { options: opts });
    await tick();

    expect(seenResizeObservers).toHaveLength(1);
    expect(seenResizeObservers[0].observe).toHaveBeenCalledWith(whole(rendered.container));

    rendered.unmount();

    expect(seenResizeObservers[0].disconnect).toHaveBeenCalledTimes(1);
  });
});

describe("Out of scope in jsdom", () => {
  test.skip("pointer-drag to snap requires layout (browser)", () => {});
  test.skip("wheel spin requires layout (browser)", () => {});
  test.skip("3D rotateX transforms require layout (browser)", () => {});
  test.skip("measured item-height value requires layout (browser)", () => {});
  test.skip("visible-count value requires layout (browser)", () => {});
  test.skip("momentum requires layout (browser)", () => {});
  test.skip("reduced-motion jump-vs-animate requires layout (browser)", () => {});
  test.skip("loop seam-clone visual continuity requires layout (browser)", () => {});
});
