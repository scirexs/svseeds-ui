import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { render } from "vitest-browser-svelte";
import { cdp } from "vitest/browser";
import { createRawSnippet, tick } from "svelte";
import WheelPicker, { type WheelOption } from "#svs/WheelPicker.svelte";
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
const middle = (c: HTMLElement) => whole(c).querySelector(`.${PARTS.MIDDLE}`) as HTMLElement;
const labels = (c: HTMLElement) => Array.from(c.querySelectorAll(`.${PARTS.LABEL}`)) as HTMLElement[];
const has = (el: Element, ...names: string[]) => expect([...el.classList]).toEqual(expect.arrayContaining(names));
const itemHeightPx = (c: HTMLElement) => labels(c)[0]?.getBoundingClientRect().height ?? 0;
const waitForMeasure = async (c: HTMLElement) => {
  await tick();
  await vi.waitFor(() => expect(itemHeightPx(c)).toBeGreaterThan(0));
};
const setWheel = async (select: HTMLSelectElement, value: string) => {
  select.value = value;
  select.dispatchEvent(new Event("change", { bubbles: true }));
  await tick();
};
const wheel = (el: HTMLElement, deltaY = 1) => {
  el.dispatchEvent(new WheelEvent("wheel", { deltaY, bubbles: true, cancelable: true }));
};
const point = (el: HTMLElement, type: string, clientY: number) => {
  el.dispatchEvent(new PointerEvent(type, { clientY, pointerId: 1, bubbles: true }));
};
const rotateX = (el: HTMLElement) => Number(el.getAttribute("style")?.match(/rotateX\((-?\d+(?:\.\d+)?)deg\)/)?.[1]);
const translateYPx = (el: HTMLElement) => {
  const style = el.getAttribute("style") ?? "";
  const signed = style.match(/calc\(-50%\s*([+-])\s*(\d+(?:\.\d+)?)px\)/);
  if (signed) return signed[1] === "-" ? -Number(signed[2]) : Number(signed[2]);
  return Number(style.match(/\+\s*(-?\d+(?:\.\d+)?)px\)/)?.[1]);
};
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
let seenResizeObservers: MockResizeObserver[] = [];
class MockResizeObserver {
  observe = vi.fn();
  disconnect = vi.fn();

  constructor() {
    seenResizeObservers.push(this);
  }
}

beforeEach(() => {
  document.body.innerHTML = "";
});

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
    expect(options[2].disabled).toBe(true);
  });

  test("renders default parts and aria ownership", () => {
    const { container } = render(WheelPicker, { options: opts });
    const root = whole(container);
    const main = sel(container);
    const mid = middle(container);
    const aux = root.querySelector(`.${PARTS.AUX}`) as HTMLElement;
    const extra = root.querySelector(`.${PARTS.EXTRA}`) as HTMLElement;

    has(root, seed, PARTS.WHOLE, VARIANT.NEUTRAL);
    has(main, seed, PARTS.MAIN, VARIANT.NEUTRAL);
    has(mid, seed, PARTS.MIDDLE, VARIANT.NEUTRAL);
    has(aux, seed, PARTS.AUX, VARIANT.NEUTRAL);
    has(extra, seed, PARTS.EXTRA, VARIANT.NEUTRAL);
    expect(mid.getAttribute("aria-hidden")).toBe("true");
    expect(aux.getAttribute("aria-hidden")).toBe("true");
    expect(extra.getAttribute("aria-hidden")).toBe("true");
    expect(main.hasAttribute("aria-hidden")).toBe(false);
    expect(main.getAttribute("style")).toContain("clip-path: inset(50%)");
    expect(main.getAttribute("style")).not.toContain("clip:");
    expect(main.getAttribute("style")).toContain("pointer-events: none");
  });

  test("drum text is not selectable", () => {
    const { container } = render(WheelPicker, { options: opts });
    const style = middle(container).getAttribute("style") ?? "";

    expect(style).toContain("touch-action: none");
    expect(style).toContain("user-select: none");
  });

  test("renders labels and supports a custom label snippet", async () => {
    const label = vi.fn().mockImplementation(labelfn);
    const { container, getByTestId } = render(WheelPicker, { options: opts, value: "feb", label });

    expect(labels(container).map((x) => x.textContent)).toEqual(["jan:neutral:0", "feb:active:1", "mar:inactive:2", "apr:neutral:3"]);
    await expect.element(getByTestId(`${labelid}-1`)).toHaveTextContent("feb:active:1");
    expect(label).toHaveBeenCalled();
  });
});

describe("Default value and binding", () => {
  test("defaults to the first enabled option", () => {
    const { container } = render(WheelPicker, { options: opts });
    expect(sel(container).value).toBe("jan");
  });

  test("skips a disabled first option for the default value", () => {
    const options = [{ ...opts[0], disabled: true }, ...opts.slice(1)];
    const { container } = render(WheelPicker, { options });
    expect(sel(container).value).toBe("feb");
  });

  test("marks selected and disabled labels with precedence", () => {
    const { container } = render(WheelPicker, { options: opts, value: "apr" });
    const rows = labels(container);

    expect(sel(container).value).toBe("apr");
    has(rows[3], VARIANT.ACTIVE);
    has(rows[2], VARIANT.INACTIVE);
    has(rows[0], VARIANT.NEUTRAL);
  });

  test("two-way binding follows select changes", async () => {
    const props = $state({ options: opts, value: "jan" });
    const { container } = render(WheelPicker, props);
    const main = sel(container);

    await setWheel(main, "feb");

    await vi.waitFor(() => expect(props.value).toBe("feb"));
    has(labels(container)[1], VARIANT.ACTIVE);
  });

  test("value prop updates select and active label", async () => {
    const props = $state({ options: opts, value: "jan" });
    const { container, rerender } = render(WheelPicker, props);

    props.value = "apr";
    await rerender(props);

    expect(sel(container).value).toBe("apr");
    has(labels(container)[3], VARIANT.ACTIVE);
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
    const mid = middle(container);
    const aux = root.querySelector(`.${PARTS.AUX}`) as HTMLElement;
    const extra = root.querySelector(`.${PARTS.EXTRA}`) as HTMLElement;
    const rows = labels(container);

    has(root, VARIANT.ACTIVE);
    has(main, VARIANT.ACTIVE);
    has(mid, VARIANT.ACTIVE);
    has(aux, VARIANT.ACTIVE);
    has(extra, VARIANT.ACTIVE);
    has(rows[1], VARIANT.ACTIVE);
    has(rows[2], VARIANT.INACTIVE);
    has(rows[0], VARIANT.ACTIVE);
  });

  test("styling string replaces the preset on parts", () => {
    const { container } = render(WheelPicker, { options: opts, styling: "x" });
    const root = whole(container);

    has(root, "x", PARTS.WHOLE, VARIANT.NEUTRAL);
    expect(root.classList.contains(seed)).toBe(false);
    has(sel(container), "x", PARTS.MAIN, VARIANT.NEUTRAL);
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
  test("name participates in form data and unnamed controls do not", async () => {
    const named = render(WheelPicker, { options: opts, value: "feb", name: "month" });
    const form = document.createElement("form");
    form.append(whole(named.container));
    expect(new FormData(form).get("month")).toBe("feb");
    await named.unmount();

    const unnamed = render(WheelPicker, { options: opts, value: "feb" });
    const form2 = document.createElement("form");
    form2.append(whole(unnamed.container));
    expect(new FormData(form2).get("month")).toBeNull();
    await unnamed.unmount();
  });

  test("passes arbitrary rest attrs to the select", () => {
    const { container } = render(WheelPicker, { options: opts, "data-x": "1", "aria-label": "Month" });
    const main = sel(container);

    expect(main.getAttribute("data-x")).toBe("1");
    expect(main.getAttribute("aria-label")).toBe("Month");
  });

  test("component-owned attrs are not overridden by rest", () => {
    const { container } = render(WheelPicker, { options: opts, "aria-orientation": "horizontal", multiple: true, size: 4 } as any);
    const main = sel(container);
    const mid = middle(container);

    expect(main.getAttribute("aria-orientation")).toBe("vertical");
    expect(main.multiple).toBe(false);
    expect(main.hasAttribute("size")).toBe(false);
    expect(mid.getAttribute("aria-hidden")).toBe("true");
  });

  test("rest aria-hidden cannot hide the native select source of truth", () => {
    const { container } = render(WheelPicker, { options: opts, "aria-hidden": "true" } as any);

    expect(sel(container).hasAttribute("aria-hidden")).toBe(false);
  });

  test("rest hidden cannot remove the native select from the tree", () => {
    const { container } = render(WheelPicker, { options: opts, hidden: true } as any);

    expect(sel(container).hasAttribute("hidden")).toBe(false);
  });

  test("calls the native change handler", async () => {
    const onchange = vi.fn();
    const { container } = render(WheelPicker, { options: opts, onchange });
    const main = sel(container);

    await setWheel(main, "feb");

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

    await rendered.unmount();

    expect(seenResizeObservers[0].disconnect).toHaveBeenCalledTimes(1);
  });

  test("cancels a pending animation frame on unmount", async () => {
    const cancel = vi.spyOn(globalThis, "cancelAnimationFrame");
    const rendered = render(WheelPicker, { options: opts, value: "apr" });

    await rendered.unmount();

    expect(cancel).toHaveBeenCalled();
  });

  test("clears a pending wheel snap timer on unmount", async () => {
    const set = vi.spyOn(globalThis, "setTimeout");
    const clear = vi.spyOn(globalThis, "clearTimeout");
    const rendered = render(WheelPicker, { options: opts });
    const mid = middle(rendered.container);
    set.mockClear();
    clear.mockClear();

    wheel(mid);
    const timer = set.mock.results[set.mock.results.length - 1]?.value;

    await rendered.unmount();

    expect(timer).toBeDefined();
    expect(clear).toHaveBeenCalledWith(timer);
  });
});

describe("Drum layout, pointer and animation (browser)", () => {
  test("pointer-drag to snap", async () => {
    const props = $state({ options: opts, value: "jan" });
    const { container } = render(WheelPicker, props);
    await waitForMeasure(container);
    const mid = middle(container);
    const unit = itemHeightPx(container);

    point(mid, "pointerdown", 100);
    point(mid, "pointermove", 100 - unit);
    point(mid, "pointerup", 100 - unit);

    await vi.waitFor(() => expect(props.value).toBe("feb"));
    expect(labels(container)[1].classList.contains(VARIANT.ACTIVE)).toBe(true);
  });

  test("wheel spin snaps after the timeout", async () => {
    const props = $state({ options: opts, value: "jan" });
    const { container } = render(WheelPicker, props);
    await waitForMeasure(container);
    await sleep(150);

    wheel(middle(container));

    await vi.waitFor(() => expect(props.value).toBe("feb"), { timeout: 500 });
  });

  test("rapid wheel notches snap once", async () => {
    const onchange = vi.fn();
    const props = $state({ options: opts, value: "jan", onchange });
    const { container } = render(WheelPicker, props);
    await waitForMeasure(container);
    await sleep(150);
    const mid = middle(container);

    // WP-1
    wheel(mid);
    wheel(mid);
    wheel(mid);

    await vi.waitFor(() => expect(props.value).toBe("apr"), { timeout: 500 });
    expect(onchange).toHaveBeenCalledTimes(1);
  });

  test("late pointer-move after pointerup does not move past the snap", async () => {
    const props = $state({ options: opts, value: "jan" });
    const { container } = render(WheelPicker, props);
    await waitForMeasure(container);
    const mid = middle(container);
    const unit = itemHeightPx(container);

    // WP-2
    point(mid, "pointerdown", 100);
    point(mid, "pointermove", 100 - unit);
    point(mid, "pointermove", 100 - unit * 3);
    point(mid, "pointerup", 100 - unit);
    await sleep(30);

    await vi.waitFor(() => expect(props.value).toBe("feb"));
    expect(labels(container)[1].classList.contains(VARIANT.ACTIVE)).toBe(true);
    expect(translateYPx(labels(container)[1])).toBe(0);
  });

  test("3D rotateX transforms", async () => {
    const { container } = render(WheelPicker, { options: opts, value: "feb", perspective: 600 });
    await waitForMeasure(container);

    await vi.waitFor(() => expect(rotateX(labels(container)[1])).toBe(0));
    const rows = labels(container);
    const selected = rows[1].getAttribute("style") ?? "";
    const radius = Number(selected.match(/translateZ\((-?\d+(?:\.\d+)?)px\)/)?.[1]);

    expect(radius).toBeGreaterThan(0);
    expect(Math.abs(rotateX(rows[0]))).toBeGreaterThan(0);
  });

  test("measured item-height cssvar is a real px value", async () => {
    const { container } = render(WheelPicker, { options: opts, cssvar: { itemHeight: "--row-h" } });
    await waitForMeasure(container);

    const v = whole(container).style.getPropertyValue("--row-h");
    expect(parseFloat(v)).toBeGreaterThan(0);
  });

  test("object styling measures item height without part literal classes", async () => {
    const { container } = render(WheelPicker, {
      options: opts,
      perspective: 600,
      styling: { whole: { base: "w" }, middle: { base: "m" }, label: { base: "l" } },
      cssvar: { itemHeight: "--row-h" },
    });
    const root = container.firstElementChild as HTMLElement;
    const rows = Array.from(root.querySelectorAll(".l")) as HTMLElement[];

    expect(root.classList.contains(PARTS.WHOLE)).toBe(false);
    expect(rows[0].classList.contains(PARTS.LABEL)).toBe(false);
    await vi.waitFor(() => expect(parseFloat(root.style.getPropertyValue("--row-h"))).toBeGreaterThan(0));

    const selected = rows[0].getAttribute("style") ?? "";
    const radius = Number(selected.match(/translateZ\((-?\d+(?:\.\d+)?)px\)/)?.[1]);
    expect(radius).toBeGreaterThan(0);
    expect(rows[2].getAttribute("style")).toContain("visibility: hidden");
  });

  test("visible-count cssvar reflects measured rows", async () => {
    const style = document.createElement("style");
    style.textContent = ".wheel-tall { height: 300px; }";
    document.head.append(style);
    try {
      const { container } = render(WheelPicker, { options: opts, class: "wheel-tall", cssvar: { visible: "--n" } });
      await waitForMeasure(container);

      await vi.waitFor(() => expect(Number(whole(container).style.getPropertyValue("--n"))).toBeGreaterThanOrEqual(2));
    } finally {
      style.remove();
    }
  });

  test("loop seam clones provide continuity", async () => {
    const { container } = render(WheelPicker, { options: opts, loop: true });
    await waitForMeasure(container);
    const rows = labels(container);
    const cloneCount = (rows.length - opts.length) / 2;
    const head = rows[0];
    const tail = rows[cloneCount + opts.length];

    expect(rows.length).toBeGreaterThan(opts.length);
    expect(Number.isInteger(cloneCount)).toBe(true);
    expect(head.textContent).toContain("April");
    expect(tail.textContent).toContain("January");
    expect(translateYPx(head)).toBeLessThan(0);
    expect(translateYPx(tail)).toBeGreaterThan(translateYPx(rows[cloneCount + opts.length - 1]) ?? 0);
    expect(sel(container).options).toHaveLength(opts.length);
  });

  test("reduced-motion jumps instead of animating", async () => {
    await cdp().send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "reduce" }] });
    try {
      const props = $state({ options: opts, value: "jan" });
      const { container } = render(WheelPicker, props);
      await waitForMeasure(container);

      await setWheel(sel(container), "apr");

      expect(props.value).toBe("apr");
      expect(translateYPx(labels(container)[3])).toBe(0);
    } finally {
      await cdp().send("Emulation.setEmulatedMedia", { features: [] });
    }
  });

  // momentum: not applicable - release snaps directly to nearest (see WheelPicker.svelte hpointerup); no inertia implemented.
});
