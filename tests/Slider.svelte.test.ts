import { describe, expect, test, vi } from "vitest";
import { render } from "vitest-browser-svelte";
import { createRawSnippet, flushSync, tick } from "svelte";
import Slider from "#svs/Slider.svelte";
import { PARTS, VARIANT } from "#svs/core";

const leftid = "test-left";
const rightid = "test-right";
const leftfn = createRawSnippet((value: () => number, variant: () => string, element: () => HTMLInputElement | undefined) => {
  const text = () => `v=${value()};var=${variant()};el=${element() ? "1" : "0"}`;
  return {
    render: () => `<span data-testid="${leftid}">${text()}</span>`,
    setup: (node: Element) => {
      $effect(() => {
        node.textContent = text();
      });
    },
  };
});
const rightfn = createRawSnippet((value: () => number, variant: () => string, element: () => HTMLInputElement | undefined) => {
  const text = () => `v=${value()};var=${variant()};el=${element() ? "1" : "0"}`;
  return {
    render: () => `<span data-testid="${rightid}">${text()}</span>`,
    setup: (node: Element) => {
      $effect(() => {
        node.textContent = text();
      });
    },
  };
});

describe("Switching existence of elements", () => {
  const options = new Set([10, 20, 30, 40, 50]);
  const attachfn = () => {};

  test("no props", async () => {
    const { container } = render(Slider, { min: 0, max: 100 });
    const whole = container.firstElementChild as HTMLSpanElement;
    const main = whole.querySelector('input[type="range"]') as HTMLInputElement;
    expect(whole.children).toHaveLength(1);
    expect(main.tagName).toBe("INPUT");
    await expect.element(main).toHaveAttribute("type", "range");
    await expect.element(main).toHaveAttribute("min", "0");
    await expect.element(main).toHaveAttribute("max", "100");
    await expect.element(main).not.toHaveAttribute("step");
    await expect.element(main).not.toHaveAttribute("list");
  });

  test("w/ left snippet", async () => {
    const left = vi.fn().mockImplementation(leftfn);
    const { container } = render(Slider, { min: 0, max: 100, left });
    const whole = container.firstElementChild as HTMLSpanElement;
    const main = whole.querySelector('input[type="range"]') as HTMLInputElement;
    const leftsp = container.querySelector(`[data-testid="${leftid}"]`) as HTMLElement;
    expect(whole.children).toHaveLength(2);
    expect(whole.firstElementChild).toBe(leftsp.parentElement);
    expect(whole.lastElementChild).toBe(main);
    expect(left).toHaveBeenCalled();
  });

  test("w/ right snippet", async () => {
    const right = vi.fn().mockImplementation(rightfn);
    const { container } = render(Slider, { min: 0, max: 100, right });
    const whole = container.firstElementChild as HTMLSpanElement;
    const main = whole.querySelector('input[type="range"]') as HTMLInputElement;
    const rightsp = container.querySelector(`[data-testid="${rightid}"]`) as HTMLElement;
    expect(whole.children).toHaveLength(2);
    expect(whole.firstElementChild).toBe(main);
    expect(whole.lastElementChild).toBe(rightsp.parentElement);
    expect(right).toHaveBeenCalled();
  });

  test("w/ both left and right snippets", async () => {
    const left = vi.fn().mockImplementation(leftfn);
    const right = vi.fn().mockImplementation(rightfn);
    const { container } = render(Slider, { min: 0, max: 100, left, right });
    const whole = container.firstElementChild as HTMLSpanElement;
    const main = whole.querySelector('input[type="range"]') as HTMLInputElement;
    const leftsp = container.querySelector(`[data-testid="${leftid}"]`) as HTMLElement;
    const rightsp = container.querySelector(`[data-testid="${rightid}"]`) as HTMLElement;
    expect(whole.children).toHaveLength(3);
    expect(whole.firstElementChild).toBe(leftsp.parentElement);
    expect(whole.children[1]).toBe(main);
    expect(whole.lastElementChild).toBe(rightsp.parentElement);
    expect(left).toHaveBeenCalled();
    expect(right).toHaveBeenCalled();
  });

  test("w/ options", async () => {
    const { container } = render(Slider, { min: 0, max: 100, options });
    const whole = container.firstElementChild as HTMLSpanElement;
    const main = whole.querySelector('input[type="range"]') as HTMLInputElement;
    const datalist = whole.querySelector("datalist") as HTMLDataListElement;
    expect(whole.children).toHaveLength(2);
    expect(whole.firstElementChild).toBe(main);
    expect(whole.lastElementChild).toBe(datalist);
    const listid = datalist.getAttribute("id");
    await expect.element(main).toHaveAttribute("list", listid);
    expect(datalist.children).toHaveLength(5);
    await expect.element(datalist.firstElementChild as HTMLOptionElement).toHaveAttribute("value", "10");
    await expect.element(datalist.lastElementChild as HTMLOptionElement).toHaveAttribute("value", "50");
  });

  test("w/ attach", async () => {
    const attach = vi.fn((node: Element) => {
      attachfn();
      (node as HTMLInputElement).dataset.attached = "1";
    });
    const { container } = render(Slider, { min: 0, max: 100, attach });
    const whole = container.firstElementChild as HTMLSpanElement;
    const main = whole.querySelector('input[type="range"]') as HTMLInputElement;
    expect(whole.children).toHaveLength(1);
    expect(whole.firstElementChild).toBe(main);
    expect(attach).toHaveBeenCalled();
    expect(main.dataset.attached).toBe("1");
  });

  test("w/ empty options", async () => {
    const emptyOptions = new Set<number>();
    const { container } = render(Slider, { min: 0, max: 100, options: emptyOptions });
    const whole = container.firstElementChild as HTMLSpanElement;
    const main = whole.querySelector('input[type="range"]') as HTMLInputElement;
    const datalist = whole.querySelector("datalist");
    expect(whole.children).toHaveLength(1);
    expect(whole.firstElementChild).toBe(main);
    expect(datalist).toBeNull();
    await expect.element(main).not.toHaveAttribute("list");
  });
});

describe("Specify attrs & value handling & styling", () => {
  const seed = "svs-slider";

  test("w/ range validation", async () => {
    // Test min > max swap
    const { container } = render(Slider, { min: 100, max: 0 });
    const main = container.querySelector('input[type="range"]') as HTMLInputElement;
    await expect.element(main).toHaveAttribute("min", "0");
    await expect.element(main).toHaveAttribute("max", "100");
  });

  test("w/ default value calculation", async () => {
    const { container } = render(Slider, { min: 0, max: 100 });
    const main = container.querySelector('input[type="range"]') as HTMLInputElement;
    await expect.element(main).toHaveValue("50"); // (0 + 100) / 2
  });

  test("w/ out of range value correction", async () => {
    const value = 5; // below min
    const { container } = render(Slider, { min: 10, max: 90, value });
    const main = container.querySelector('input[type="range"]') as HTMLInputElement;
    await expect.element(main).toHaveValue("10"); // clamp to nearest bound
  });

  test("w/ upper out of range value correction", async () => {
    const value = 999; // above max
    const { container } = render(Slider, { min: 10, max: 90, value });
    const main = container.querySelector('input[type="range"]') as HTMLInputElement;
    await expect.element(main).toHaveValue("90"); // clamp to nearest bound
  });

  test("w/ valid initial value", async () => {
    const value = 75;
    const { container } = render(Slider, { min: 0, max: 100, value });
    const main = container.querySelector('input[type="range"]') as HTMLInputElement;
    await expect.element(main).toHaveValue("75");
  });

  test("w/ custom step", async () => {
    const step = 5;
    const { container } = render(Slider, { min: 0, max: 100, step });
    const main = container.querySelector('input[type="range"]') as HTMLInputElement;
    await expect.element(main).toHaveAttribute("step", "5");
  });

  test("w/ step any", async () => {
    const step = "any";
    const { container } = render(Slider, { min: 0, max: 100, step });
    const main = container.querySelector('input[type="range"]') as HTMLInputElement;
    await expect.element(main).toHaveAttribute("step", "any");
  });

  test("w/ custom fill range", async () => {
    const value = 25;
    const fillRange = { min: 10, max: 90 };
    const { container } = render(Slider, { min: 0, max: 100, value, fillRange });
    const main = container.querySelector('input[type="range"]') as HTMLInputElement;
    // value 25 in range 0-100 should be 25%
    // mapped to fillRange 10-90 should be 30% (10 + 25 * 0.8)
    const expectedRate = Math.trunc(10 + (25 * 80) / 100);
    const expectedStyle = `background: linear-gradient(to right, var(--color-active) ${expectedRate}%, var(--color-inactive) ${expectedRate}%)`;
    expect(main.style.cssText).toContain(expectedStyle);
  });

  test("w/ swapped fill range", async () => {
    const value = 25;
    const fillRange = { min: 90, max: 10 };
    const { container } = render(Slider, { min: 0, max: 100, value, fillRange });
    const main = container.querySelector('input[type="range"]') as HTMLInputElement;
    const expectedRate = Math.trunc(10 + (25 * 80) / 100);
    const expectedStyle = `background: linear-gradient(to right, var(--color-active) ${expectedRate}%, var(--color-inactive) ${expectedRate}%)`;
    expect(main.style.cssText).toContain(expectedStyle);
  });

  test("rate at endpoints maps to fill range bounds", async () => {
    const minRender = render(Slider, { min: 0, max: 100, value: 0 });
    const minMain = minRender.container.querySelector('input[type="range"]') as HTMLInputElement;
    expect(minMain.style.cssText).toContain("var(--color-active) 5%");
    expect(minMain.style.cssText).toContain("var(--color-inactive) 5%");
    minRender.unmount();

    const maxRender = render(Slider, { min: 0, max: 100, value: 100 });
    const maxMain = maxRender.container.querySelector('input[type="range"]') as HTMLInputElement;
    expect(maxMain.style.cssText).toContain("var(--color-active) 95%");
    expect(maxMain.style.cssText).toContain("var(--color-inactive) 95%");
  });

  test("min equal max uses fill range midpoint for rate", async () => {
    const { container } = render(Slider, { min: 50, max: 50 });
    const main = container.querySelector('input[type="range"]') as HTMLInputElement;
    await expect.element(main).toHaveValue("50");
    expect(main.style.cssText).toContain("var(--color-active) 50%");
    expect(main.style.cssText).toContain("var(--color-inactive) 50%");
    expect(main.style.cssText).not.toContain("NaN");
  });

  test("min equal max uses custom fill range midpoint for rate", async () => {
    const { container } = render(Slider, { min: 10, max: 10, value: 999, fillRange: { min: 20, max: 60 } });
    const main = container.querySelector('input[type="range"]') as HTMLInputElement;
    await expect.element(main).toHaveValue("10");
    expect(main.style.cssText).toContain("var(--color-active) 40%");
    expect(main.style.cssText).toContain("var(--color-inactive) 40%");
    expect(main.style.cssText).not.toContain("NaN");
  });

  test("w/ specify attributes", async () => {
    const { container } = render(Slider, { min: 0, max: 100, name: "slider", disabled: true, "data-test": "custom" });
    const main = container.querySelector('input[type="range"]') as HTMLInputElement;
    await expect.element(main).toHaveAttribute("name", "slider");
    await expect.element(main).toHaveAttribute("disabled");
    await expect.element(main).toHaveAttribute("data-test", "custom");
  });

  test("class merged onto control, input attrs controlled", async () => {
    const { container } = render(Slider, { min: 0, max: 100, class: "merged", list: "ignored" } as any);
    const main = container.querySelector('input[type="range"]') as HTMLInputElement;
    const root = main.parentElement as HTMLElement;
    await expect.element(main).toHaveClass("merged"); // class merged onto the control (same as ...rest)
    await expect.element(root).not.toHaveClass("merged"); // not on the WHOLE root
    await expect.element(main).toHaveAttribute("type", "range"); // forced
    await expect.element(main).toHaveAttribute("min", "0"); // from min/max props
    await expect.element(main).toHaveAttribute("max", "100");
    await expect.element(main).not.toHaveAttribute("list", "ignored"); // list controlled, not from rest
  });

  test("style is component-owned", async () => {
    const { container } = render(Slider, { min: 0, max: 100, value: 50, style: "color: red;" } as any);
    const main = container.querySelector('input[type="range"]') as HTMLInputElement;
    expect(main.style.cssText).toContain("linear-gradient");
    expect(main.style.color).not.toBe("red");
  });

  describe("cssvar custom track variable names", () => {
    test("cssvar.active overrides active name, inactive falls back", async () => {
      const { container } = render(Slider, { min: 0, max: 100, value: 50, cssvar: { active: "--x" } });
      const main = container.querySelector('input[type="range"]') as HTMLInputElement;
      expect(main.style.cssText).toContain("var(--x) 50%");
      expect(main.style.cssText).toContain("var(--color-inactive) 50%");
      expect(main.style.cssText).not.toContain("var(--color-active)");
    });

    test("cssvar.inactive overrides inactive name, active falls back", async () => {
      const { container } = render(Slider, { min: 0, max: 100, value: 50, cssvar: { inactive: "--y" } });
      const main = container.querySelector('input[type="range"]') as HTMLInputElement;
      expect(main.style.cssText).toContain("var(--color-active) 50%");
      expect(main.style.cssText).toContain("var(--y) 50%");
      expect(main.style.cssText).not.toContain("var(--color-inactive)");
    });

    test("cssvar with both keys overrides both names", async () => {
      const { container } = render(Slider, { min: 0, max: 100, value: 50, cssvar: { active: "--x", inactive: "--y" } });
      const main = container.querySelector('input[type="range"]') as HTMLInputElement;
      expect(main.style.cssText).toContain("var(--x) 50%");
      expect(main.style.cssText).toContain("var(--y) 50%");
    });

    test("empty cssvar falls back to default names", async () => {
      const { container } = render(Slider, { min: 0, max: 100, value: 50, cssvar: {} });
      const main = container.querySelector('input[type="range"]') as HTMLInputElement;
      expect(main.style.cssText).toContain("var(--color-active) 50%");
      expect(main.style.cssText).toContain("var(--color-inactive) 50%");
    });

    test("cssvar is not forwarded to input attributes", async () => {
      const { container } = render(Slider, { min: 0, max: 100, value: 50, cssvar: { active: "--x" } });
      const main = container.querySelector('input[type="range"]') as HTMLInputElement;
      await expect.element(main).not.toHaveAttribute("cssvar");
    });
  });

  test("value change interaction", async () => {
    const props = $state({ min: 0, max: 100, value: 50 });
    const { container } = render(Slider, props);
    const main = container.querySelector('input[type="range"]') as HTMLInputElement;

    await expect.element(main).toHaveValue("50");

    main.value = "75";
    main.dispatchEvent(new Event("input", { bubbles: true }));
    await tick();
    expect(props.value).toBe(75);
  });

  test("default class of each variant", async () => {
    const left = vi.fn().mockImplementation(leftfn);
    const right = vi.fn().mockImplementation(rightfn);
    const variant = VARIANT.NEUTRAL;
    const { container } = render(Slider, { min: 0, max: 100, left, right, variant });
    const whole = container.firstElementChild as HTMLSpanElement;
    const main = whole.querySelector('input[type="range"]') as HTMLInputElement;
    const leftdv = (container.querySelector(`[data-testid="${leftid}"]`) as HTMLElement).parentElement;
    const rightdv = (container.querySelector(`[data-testid="${rightid}"]`) as HTMLElement).parentElement;

    await expect.element(whole).toHaveClass(seed, PARTS.WHOLE, VARIANT.NEUTRAL);
    await expect.element(leftdv).toHaveClass(seed, PARTS.LEFT, VARIANT.NEUTRAL);
    await expect.element(main).toHaveClass(seed, PARTS.MAIN, VARIANT.NEUTRAL);
    await expect.element(rightdv).toHaveClass(seed, PARTS.RIGHT, VARIANT.NEUTRAL);
  });

  test("left snippet receives args in value, variant, element order", async () => {
    const left = vi.fn().mockImplementation(leftfn);
    const { container } = render(Slider, { min: 0, max: 100, value: 75, variant: VARIANT.ACTIVE, left });
    flushSync();

    const leftsp = container.querySelector(`[data-testid="${leftid}"]`) as HTMLElement;
    await expect.element(leftsp).toHaveTextContent("v=75");
    await expect.element(leftsp).toHaveTextContent("var=active");
    await expect.element(leftsp).toHaveTextContent("el=1");
  });

  test("w/ different variant", async () => {
    const left = vi.fn().mockImplementation(leftfn);
    const right = vi.fn().mockImplementation(rightfn);
    const props = $state({ min: 0, max: 100, left, right, variant: VARIANT.NEUTRAL as string });
    props.variant = VARIANT.ACTIVE;
    const { container, rerender } = render(Slider, props);
    const whole = container.firstElementChild as HTMLSpanElement;
    const main = whole.querySelector('input[type="range"]') as HTMLInputElement;
    const leftdv = (container.querySelector(`[data-testid="${leftid}"]`) as HTMLElement).parentElement;
    const rightdv = (container.querySelector(`[data-testid="${rightid}"]`) as HTMLElement).parentElement;

    await expect.element(whole).toHaveClass(seed, PARTS.WHOLE, VARIANT.ACTIVE);
    await expect.element(leftdv).toHaveClass(seed, PARTS.LEFT, VARIANT.ACTIVE);
    await expect.element(main).toHaveClass(seed, PARTS.MAIN, VARIANT.ACTIVE);
    await expect.element(rightdv).toHaveClass(seed, PARTS.RIGHT, VARIANT.ACTIVE);

    props.variant = VARIANT.INACTIVE;
    await rerender(props);

    await expect.element(whole).toHaveClass(seed, PARTS.WHOLE, VARIANT.INACTIVE);
    await expect.element(leftdv).toHaveClass(seed, PARTS.LEFT, VARIANT.INACTIVE);
    await expect.element(main).toHaveClass(seed, PARTS.MAIN, VARIANT.INACTIVE);
    await expect.element(rightdv).toHaveClass(seed, PARTS.RIGHT, VARIANT.INACTIVE);
  });

  test("w/ string styling class", async () => {
    const left = vi.fn().mockImplementation(leftfn);
    const right = vi.fn().mockImplementation(rightfn);
    const clsid = "custom-styling";
    const variant = VARIANT.NEUTRAL;
    const { container } = render(Slider, { min: 0, max: 100, left, right, variant, styling: clsid });
    const whole = container.firstElementChild as HTMLSpanElement;
    const main = whole.querySelector('input[type="range"]') as HTMLInputElement;
    const leftdv = (container.querySelector(`[data-testid="${leftid}"]`) as HTMLElement).parentElement;
    const rightdv = (container.querySelector(`[data-testid="${rightid}"]`) as HTMLElement).parentElement;

    await expect.element(whole).toHaveClass(clsid, PARTS.WHOLE, VARIANT.NEUTRAL);
    await expect.element(leftdv).toHaveClass(clsid, PARTS.LEFT, VARIANT.NEUTRAL);
    await expect.element(main).toHaveClass(clsid, PARTS.MAIN, VARIANT.NEUTRAL);
    await expect.element(rightdv).toHaveClass(clsid, PARTS.RIGHT, VARIANT.NEUTRAL);
  });

  test("w/ object styling", async () => {
    const left = vi.fn().mockImplementation(leftfn);
    const right = vi.fn().mockImplementation(rightfn);
    const dynObj = {
      base: "base-class",
      neutral: "neutral-class",
      active: "active-class",
      inactive: "inactive-class",
    };
    const styling = {
      whole: dynObj,
      left: dynObj,
      main: dynObj,
      right: dynObj,
    };
    const variant = VARIANT.NEUTRAL;
    const { container } = render(Slider, { min: 0, max: 100, left, right, variant, styling });
    const whole = container.firstElementChild as HTMLSpanElement;
    const main = whole.querySelector('input[type="range"]') as HTMLInputElement;
    const leftdv = (container.querySelector(`[data-testid="${leftid}"]`) as HTMLElement).parentElement;
    const rightdv = (container.querySelector(`[data-testid="${rightid}"]`) as HTMLElement).parentElement;

    await expect.element(whole).toHaveClass(dynObj.base, dynObj.neutral);
    await expect.element(leftdv).toHaveClass(dynObj.base, dynObj.neutral);
    await expect.element(main).toHaveClass(dynObj.base, dynObj.neutral);
    await expect.element(rightdv).toHaveClass(dynObj.base, dynObj.neutral);
  });
});

describe("Binding and element reference", () => {
  test("element binding", async () => {
    const props = $state({ min: 0, max: 100, element: undefined as HTMLInputElement | undefined });
    const { container } = render(Slider, props);
    const main = container.querySelector('input[type="range"]') as HTMLInputElement;

    expect(props.element).toBe(main);
  });

  test("min/max prop update", async () => {
    const props = $state({ min: 0, max: 100 });
    const { container, rerender } = render(Slider, props);
    const main = container.querySelector('input[type="range"]') as HTMLInputElement;

    await expect.element(main).toHaveAttribute("min", "0");
    await expect.element(main).toHaveAttribute("max", "100");

    props.min = 10;
    props.max = 90;
    await rerender(props);

    await expect.element(main).toHaveAttribute("min", "10");
    await expect.element(main).toHaveAttribute("max", "90");
  });

  test("out of range correction re-applies on runtime max change", async () => {
    const props = $state({ min: 0, max: 100, value: 80 });
    const { container } = render(Slider, props);
    const main = container.querySelector('input[type="range"]') as HTMLInputElement;

    await expect.element(main).toHaveValue("80");

    props.max = 50;
    flushSync();

    expect(props.value).toBe(50);
    await expect.element(main).toHaveValue("50");
  });

  test("out of range correction re-applies on runtime min change", async () => {
    const props = $state({ min: 0, max: 100, value: 20 });
    const { container } = render(Slider, props);
    const main = container.querySelector('input[type="range"]') as HTMLInputElement;

    await expect.element(main).toHaveValue("20");

    props.min = 40;
    flushSync();

    expect(props.value).toBe(40);
    await expect.element(main).toHaveValue("40");
  });

  test("programmatic upper out of range value is clamped", async () => {
    const props = $state({ min: 0, max: 100, value: 50 });
    const { container } = render(Slider, props);
    const main = container.querySelector('input[type="range"]') as HTMLInputElement;

    props.value = 150;
    flushSync();

    expect(props.value).toBe(100);
    await expect.element(main).toHaveValue("100");
  });

  test("programmatic lower out of range value is clamped", async () => {
    const props = $state({ min: 0, max: 100, value: 50 });
    const { container } = render(Slider, props);
    const main = container.querySelector('input[type="range"]') as HTMLInputElement;

    props.value = -20;
    flushSync();

    expect(props.value).toBe(0);
    await expect.element(main).toHaveValue("0");
  });

  test("variant prop update", async () => {
    const props = $state({ min: 0, max: 100, variant: VARIANT.NEUTRAL as string });
    const { container, rerender } = render(Slider, props);
    const whole = container.firstElementChild as HTMLSpanElement;

    await expect.element(whole).toHaveClass("svs-slider", PARTS.WHOLE, VARIANT.NEUTRAL);

    props.variant = VARIANT.ACTIVE;
    await rerender(props);

    await expect.element(whole).toHaveClass("svs-slider", PARTS.WHOLE, VARIANT.ACTIVE);
  });
});
