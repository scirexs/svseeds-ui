import { describe, expect, test, vi } from "vitest";
import { fireEvent, render, waitFor } from "@testing-library/svelte";
import { createRawSnippet, flushSync } from "svelte";
import Slider from "#svs/_Slider.svelte";
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

  test("no props", () => {
    const { container } = render(Slider, { min: 0, max: 100 });
    const whole = container.firstElementChild as HTMLSpanElement;
    const main = whole.querySelector('input[type="range"]') as HTMLInputElement;
    expect(whole.children).toHaveLength(1);
    expect(main.tagName).toBe("INPUT");
    expect(main).toHaveAttribute("type", "range");
    expect(main).toHaveAttribute("min", "0");
    expect(main).toHaveAttribute("max", "100");
    expect(main).not.toHaveAttribute("step");
    expect(main).not.toHaveAttribute("list");
  });

  test("w/ left snippet", () => {
    const left = vi.fn().mockImplementation(leftfn);
    const { container, getByTestId } = render(Slider, { min: 0, max: 100, left });
    const whole = container.firstElementChild as HTMLSpanElement;
    const main = whole.querySelector('input[type="range"]') as HTMLInputElement;
    const leftsp = getByTestId(leftid);
    expect(whole.children).toHaveLength(2);
    expect(whole.firstElementChild).toBe(leftsp.parentElement);
    expect(whole.lastElementChild).toBe(main);
    expect(left).toHaveBeenCalled();
  });

  test("w/ right snippet", () => {
    const right = vi.fn().mockImplementation(rightfn);
    const { container, getByTestId } = render(Slider, { min: 0, max: 100, right });
    const whole = container.firstElementChild as HTMLSpanElement;
    const main = whole.querySelector('input[type="range"]') as HTMLInputElement;
    const rightsp = getByTestId(rightid);
    expect(whole.children).toHaveLength(2);
    expect(whole.firstElementChild).toBe(main);
    expect(whole.lastElementChild).toBe(rightsp.parentElement);
    expect(right).toHaveBeenCalled();
  });

  test("w/ both left and right snippets", () => {
    const left = vi.fn().mockImplementation(leftfn);
    const right = vi.fn().mockImplementation(rightfn);
    const { container, getByTestId } = render(Slider, { min: 0, max: 100, left, right });
    const whole = container.firstElementChild as HTMLSpanElement;
    const main = whole.querySelector('input[type="range"]') as HTMLInputElement;
    const leftsp = getByTestId(leftid);
    const rightsp = getByTestId(rightid);
    expect(whole.children).toHaveLength(3);
    expect(whole.firstElementChild).toBe(leftsp.parentElement);
    expect(whole.children[1]).toBe(main);
    expect(whole.lastElementChild).toBe(rightsp.parentElement);
    expect(left).toHaveBeenCalled();
    expect(right).toHaveBeenCalled();
  });

  test("w/ options", () => {
    const { container } = render(Slider, { min: 0, max: 100, options });
    const whole = container.firstElementChild as HTMLSpanElement;
    const main = whole.querySelector('input[type="range"]') as HTMLInputElement;
    const datalist = whole.querySelector("datalist") as HTMLDataListElement;
    expect(whole.children).toHaveLength(2);
    expect(whole.firstElementChild).toBe(main);
    expect(whole.lastElementChild).toBe(datalist);
    const listid = datalist.getAttribute("id");
    expect(main).toHaveAttribute("list", listid);
    expect(datalist.children).toHaveLength(5);
    expect(datalist.firstElementChild).toHaveAttribute("value", "10");
    expect(datalist.lastElementChild).toHaveAttribute("value", "50");
  });

  test("w/ attach", () => {
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

  test("w/ empty options", () => {
    const emptyOptions = new Set<number>();
    const { container } = render(Slider, { min: 0, max: 100, options: emptyOptions });
    const whole = container.firstElementChild as HTMLSpanElement;
    const main = whole.querySelector('input[type="range"]') as HTMLInputElement;
    const datalist = whole.querySelector("datalist");
    expect(whole.children).toHaveLength(1);
    expect(whole.firstElementChild).toBe(main);
    expect(datalist).toBeNull();
    expect(main).not.toHaveAttribute("list");
  });
});

describe("Specify attrs & value handling & styling", () => {
  const seed = "svs-slider";

  test("w/ range validation", () => {
    // Test min > max swap
    const { container } = render(Slider, { min: 100, max: 0 });
    const main = container.querySelector('input[type="range"]') as HTMLInputElement;
    expect(main).toHaveAttribute("min", "0");
    expect(main).toHaveAttribute("max", "100");
  });

  test("w/ default value calculation", () => {
    const { container } = render(Slider, { min: 0, max: 100 });
    const main = container.querySelector('input[type="range"]') as HTMLInputElement;
    expect(main).toHaveValue("50"); // (0 + 100) / 2
  });

  test("w/ out of range value correction", () => {
    const value = 5; // below min
    const { container } = render(Slider, { min: 10, max: 90, value });
    const main = container.querySelector('input[type="range"]') as HTMLInputElement;
    expect(main).toHaveValue("10"); // clamp to nearest bound
  });

  test("w/ upper out of range value correction", () => {
    const value = 999; // above max
    const { container } = render(Slider, { min: 10, max: 90, value });
    const main = container.querySelector('input[type="range"]') as HTMLInputElement;
    expect(main).toHaveValue("90"); // clamp to nearest bound
  });

  test("w/ valid initial value", () => {
    const value = 75;
    const { container } = render(Slider, { min: 0, max: 100, value });
    const main = container.querySelector('input[type="range"]') as HTMLInputElement;
    expect(main).toHaveValue("75");
  });

  test("w/ custom step", () => {
    const step = 5;
    const { container } = render(Slider, { min: 0, max: 100, step });
    const main = container.querySelector('input[type="range"]') as HTMLInputElement;
    expect(main).toHaveAttribute("step", "5");
  });

  test("w/ step any", () => {
    const step = "any";
    const { container } = render(Slider, { min: 0, max: 100, step });
    const main = container.querySelector('input[type="range"]') as HTMLInputElement;
    expect(main).toHaveAttribute("step", "any");
  });

  test("w/ custom fill range", () => {
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

  test("w/ swapped fill range", () => {
    const value = 25;
    const fillRange = { min: 90, max: 10 };
    const { container } = render(Slider, { min: 0, max: 100, value, fillRange });
    const main = container.querySelector('input[type="range"]') as HTMLInputElement;
    const expectedRate = Math.trunc(10 + (25 * 80) / 100);
    const expectedStyle = `background: linear-gradient(to right, var(--color-active) ${expectedRate}%, var(--color-inactive) ${expectedRate}%)`;
    expect(main.style.cssText).toContain(expectedStyle);
  });

  test("rate at endpoints maps to fill range bounds", () => {
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

  test("min equal max uses fill range midpoint for rate", () => {
    const { container } = render(Slider, { min: 50, max: 50 });
    const main = container.querySelector('input[type="range"]') as HTMLInputElement;
    expect(main).toHaveValue("50");
    expect(main.style.cssText).toContain("var(--color-active) 50%");
    expect(main.style.cssText).toContain("var(--color-inactive) 50%");
    expect(main.style.cssText).not.toContain("NaN");
  });

  test("min equal max uses custom fill range midpoint for rate", () => {
    const { container } = render(Slider, { min: 10, max: 10, value: 999, fillRange: { min: 20, max: 60 } });
    const main = container.querySelector('input[type="range"]') as HTMLInputElement;
    expect(main).toHaveValue("10");
    expect(main.style.cssText).toContain("var(--color-active) 40%");
    expect(main.style.cssText).toContain("var(--color-inactive) 40%");
    expect(main.style.cssText).not.toContain("NaN");
  });

  test("w/ specify attributes", () => {
    const { container } = render(Slider, { min: 0, max: 100, name: "slider", disabled: true, "data-test": "custom" });
    const main = container.querySelector('input[type="range"]') as HTMLInputElement;
    expect(main).toHaveAttribute("name", "slider");
    expect(main).toHaveAttribute("disabled");
    expect(main).toHaveAttribute("data-test", "custom");
  });

  test("class merged onto control, input attrs controlled", () => {
    const { container } = render(Slider, { min: 0, max: 100, class: "merged", list: "ignored" } as any);
    const main = container.querySelector('input[type="range"]') as HTMLInputElement;
    const root = main.parentElement as HTMLElement;
    expect(main).toHaveClass("merged"); // class merged onto the control (same as ...rest)
    expect(root).not.toHaveClass("merged"); // not on the WHOLE root
    expect(main).toHaveAttribute("type", "range"); // forced
    expect(main).toHaveAttribute("min", "0"); // from min/max props
    expect(main).toHaveAttribute("max", "100");
    expect(main).not.toHaveAttribute("list", "ignored"); // list controlled, not from rest
  });

  test("style is component-owned", () => {
    const { container } = render(Slider, { min: 0, max: 100, value: 50, style: "color: red;" } as any);
    const main = container.querySelector('input[type="range"]') as HTMLInputElement;
    expect(main.style.cssText).toContain("linear-gradient");
    expect(main.style.color).not.toBe("red");
  });

  test("value change interaction", async () => {
    const props = $state({ min: 0, max: 100, value: 50 });
    const { container } = render(Slider, props);
    const main = container.querySelector('input[type="range"]') as HTMLInputElement;

    expect(main).toHaveValue("50");

    await fireEvent.input(main, { target: { value: "75" } });
    await waitFor(() => {
      expect(props.value).toBe(75);
    });
  });

  test("default class of each variant", () => {
    const left = vi.fn().mockImplementation(leftfn);
    const right = vi.fn().mockImplementation(rightfn);
    const variant = VARIANT.NEUTRAL;
    const { container, getByTestId } = render(Slider, { min: 0, max: 100, left, right, variant });
    const whole = container.firstElementChild as HTMLSpanElement;
    const main = whole.querySelector('input[type="range"]') as HTMLInputElement;
    const leftdv = getByTestId(leftid).parentElement;
    const rightdv = getByTestId(rightid).parentElement;

    expect(whole).toHaveClass(seed, PARTS.WHOLE, VARIANT.NEUTRAL);
    expect(leftdv).toHaveClass(seed, PARTS.LEFT, VARIANT.NEUTRAL);
    expect(main).toHaveClass(seed, PARTS.MAIN, VARIANT.NEUTRAL);
    expect(rightdv).toHaveClass(seed, PARTS.RIGHT, VARIANT.NEUTRAL);
  });

  test("left snippet receives args in value, variant, element order", () => {
    const left = vi.fn().mockImplementation(leftfn);
    const { getByTestId } = render(Slider, { min: 0, max: 100, value: 75, variant: VARIANT.ACTIVE, left });
    flushSync();

    const leftsp = getByTestId(leftid);
    expect(leftsp).toHaveTextContent("v=75");
    expect(leftsp).toHaveTextContent("var=active");
    expect(leftsp).toHaveTextContent("el=1");
  });

  test("w/ different variant", async () => {
    const left = vi.fn().mockImplementation(leftfn);
    const right = vi.fn().mockImplementation(rightfn);
    const props = $state({ min: 0, max: 100, left, right, variant: VARIANT.NEUTRAL as string });
    props.variant = VARIANT.ACTIVE;
    const { container, getByTestId, rerender } = render(Slider, props);
    const whole = container.firstElementChild as HTMLSpanElement;
    const main = whole.querySelector('input[type="range"]') as HTMLInputElement;
    const leftdv = getByTestId(leftid).parentElement;
    const rightdv = getByTestId(rightid).parentElement;

    expect(whole).toHaveClass(seed, PARTS.WHOLE, VARIANT.ACTIVE);
    expect(leftdv).toHaveClass(seed, PARTS.LEFT, VARIANT.ACTIVE);
    expect(main).toHaveClass(seed, PARTS.MAIN, VARIANT.ACTIVE);
    expect(rightdv).toHaveClass(seed, PARTS.RIGHT, VARIANT.ACTIVE);

    props.variant = VARIANT.INACTIVE;
    await rerender(props);

    expect(whole).toHaveClass(seed, PARTS.WHOLE, VARIANT.INACTIVE);
    expect(leftdv).toHaveClass(seed, PARTS.LEFT, VARIANT.INACTIVE);
    expect(main).toHaveClass(seed, PARTS.MAIN, VARIANT.INACTIVE);
    expect(rightdv).toHaveClass(seed, PARTS.RIGHT, VARIANT.INACTIVE);
  });

  test("w/ string styling class", () => {
    const left = vi.fn().mockImplementation(leftfn);
    const right = vi.fn().mockImplementation(rightfn);
    const clsid = "custom-styling";
    const variant = VARIANT.NEUTRAL;
    const { container, getByTestId } = render(Slider, { min: 0, max: 100, left, right, variant, styling: clsid });
    const whole = container.firstElementChild as HTMLSpanElement;
    const main = whole.querySelector('input[type="range"]') as HTMLInputElement;
    const leftdv = getByTestId(leftid).parentElement;
    const rightdv = getByTestId(rightid).parentElement;

    expect(whole).toHaveClass(clsid, PARTS.WHOLE, VARIANT.NEUTRAL);
    expect(leftdv).toHaveClass(clsid, PARTS.LEFT, VARIANT.NEUTRAL);
    expect(main).toHaveClass(clsid, PARTS.MAIN, VARIANT.NEUTRAL);
    expect(rightdv).toHaveClass(clsid, PARTS.RIGHT, VARIANT.NEUTRAL);
  });

  test("w/ object styling", () => {
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
    const { container, getByTestId } = render(Slider, { min: 0, max: 100, left, right, variant, styling });
    const whole = container.firstElementChild as HTMLSpanElement;
    const main = whole.querySelector('input[type="range"]') as HTMLInputElement;
    const leftdv = getByTestId(leftid).parentElement;
    const rightdv = getByTestId(rightid).parentElement;

    expect(whole).toHaveClass(dynObj.base, dynObj.neutral);
    expect(leftdv).toHaveClass(dynObj.base, dynObj.neutral);
    expect(main).toHaveClass(dynObj.base, dynObj.neutral);
    expect(rightdv).toHaveClass(dynObj.base, dynObj.neutral);
  });
});

describe("Binding and element reference", () => {
  test("element binding", () => {
    const props = $state({ min: 0, max: 100, element: undefined as HTMLInputElement | undefined });
    const { container } = render(Slider, props);
    const main = container.querySelector('input[type="range"]') as HTMLInputElement;

    expect(props.element).toBe(main);
  });

  test("min/max prop update", async () => {
    const props = $state({ min: 0, max: 100 });
    const { container, rerender } = render(Slider, props);
    const main = container.querySelector('input[type="range"]') as HTMLInputElement;

    expect(main).toHaveAttribute("min", "0");
    expect(main).toHaveAttribute("max", "100");

    props.min = 10;
    props.max = 90;
    await rerender(props);

    expect(main).toHaveAttribute("min", "10");
    expect(main).toHaveAttribute("max", "90");
  });

  test("out of range correction re-applies on runtime max change", () => {
    const props = $state({ min: 0, max: 100, value: 80 });
    const { container } = render(Slider, props);
    const main = container.querySelector('input[type="range"]') as HTMLInputElement;

    expect(main).toHaveValue("80");

    props.max = 50;
    flushSync();

    expect(props.value).toBe(50);
    expect(main).toHaveValue("50");
  });

  test("out of range correction re-applies on runtime min change", () => {
    const props = $state({ min: 0, max: 100, value: 20 });
    const { container } = render(Slider, props);
    const main = container.querySelector('input[type="range"]') as HTMLInputElement;

    expect(main).toHaveValue("20");

    props.min = 40;
    flushSync();

    expect(props.value).toBe(40);
    expect(main).toHaveValue("40");
  });

  test("programmatic upper out of range value is clamped", () => {
    const props = $state({ min: 0, max: 100, value: 50 });
    const { container } = render(Slider, props);
    const main = container.querySelector('input[type="range"]') as HTMLInputElement;

    props.value = 150;
    flushSync();

    expect(props.value).toBe(100);
    expect(main).toHaveValue("100");
  });

  test("programmatic lower out of range value is clamped", () => {
    const props = $state({ min: 0, max: 100, value: 50 });
    const { container } = render(Slider, props);
    const main = container.querySelector('input[type="range"]') as HTMLInputElement;

    props.value = -20;
    flushSync();

    expect(props.value).toBe(0);
    expect(main).toHaveValue("0");
  });

  test("variant prop update", async () => {
    const props = $state({ min: 0, max: 100, variant: VARIANT.NEUTRAL as string });
    const { container, rerender } = render(Slider, props);
    const whole = container.firstElementChild as HTMLSpanElement;

    expect(whole).toHaveClass("svs-slider", PARTS.WHOLE, VARIANT.NEUTRAL);

    props.variant = VARIANT.ACTIVE;
    await rerender(props);

    expect(whole).toHaveClass("svs-slider", PARTS.WHOLE, VARIANT.ACTIVE);
  });
});
