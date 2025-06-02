import { afterEach, describe, expect, test, vi } from "vitest";
import { fireEvent, render, waitFor, within } from "@testing-library/svelte";
import { userEvent } from "@testing-library/user-event";
import { createRawSnippet } from "svelte";
import Slider from "../lib/_svseeds/_Slider.svelte";
import { PARTS, STATE } from "../lib/_svseeds/core.ts";

const leftid = "test-left";
const rightid = "test-right";
const leftfn = createRawSnippet(
  (
    status: () => string,
    value: () => number,
    element: () => HTMLInputElement | undefined,
  ) => {
    return { render: () => `<span data-testid="${leftid}">${status()},${value()},${element()?.toString()}</span>` };
  },
);
const rightfn = createRawSnippet(
  (
    status: () => string,
    value: () => number,
    element: () => HTMLInputElement | undefined,
  ) => {
    return { render: () => `<span data-testid="${rightid}">${status()},${value()},${element()?.toString()}</span>` };
  },
);

describe("Switching existence of elements", () => {
  const options = new Set([10, 20, 30, 40, 50]);
  const actionfn = () => {
    return {};
  };

  test("no props", () => {
    const range = { min: 0, max: 100 };
    const { container } = render(Slider, { range });
    const whole = container.firstElementChild as HTMLSpanElement;
    const main = whole.querySelector('input[type="range"]') as HTMLInputElement;
    expect(whole.children).toHaveLength(1);
    expect(main.tagName).toBe("INPUT");
    expect(main).toHaveAttribute("type", "range");
    expect(main).toHaveAttribute("min", "0");
    expect(main).toHaveAttribute("max", "100");
    expect(main).toHaveAttribute("step", "1");
    expect(main).not.toHaveAttribute("list");
  });

  test("w/ left snippet", () => {
    const range = { min: 0, max: 100 };
    const left = vi.fn().mockImplementation(leftfn);
    const { container, getByTestId } = render(Slider, { range, left });
    const whole = container.firstElementChild as HTMLSpanElement;
    const main = whole.querySelector('input[type="range"]') as HTMLInputElement;
    const leftsp = getByTestId(leftid);
    expect(whole.children).toHaveLength(2);
    expect(whole.firstElementChild).toBe(leftsp.parentElement);
    expect(whole.lastElementChild).toBe(main);
    expect(left).toHaveBeenCalled();
  });

  test("w/ right snippet", () => {
    const range = { min: 0, max: 100 };
    const right = vi.fn().mockImplementation(rightfn);
    const { container, getByTestId } = render(Slider, { range, right });
    const whole = container.firstElementChild as HTMLSpanElement;
    const main = whole.querySelector('input[type="range"]') as HTMLInputElement;
    const rightsp = getByTestId(rightid);
    expect(whole.children).toHaveLength(2);
    expect(whole.firstElementChild).toBe(main);
    expect(whole.lastElementChild).toBe(rightsp.parentElement);
    expect(right).toHaveBeenCalled();
  });

  test("w/ both left and right snippets", () => {
    const range = { min: 0, max: 100 };
    const left = vi.fn().mockImplementation(leftfn);
    const right = vi.fn().mockImplementation(rightfn);
    const { container, getByTestId } = render(Slider, { range, left, right });
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
    const range = { min: 0, max: 100 };
    const { container } = render(Slider, { range, options });
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

  test("w/ action", () => {
    const range = { min: 0, max: 100 };
    const action = vi.fn().mockImplementation(actionfn);
    const { container } = render(Slider, { range, action });
    const whole = container.firstElementChild as HTMLSpanElement;
    const main = whole.querySelector('input[type="range"]') as HTMLInputElement;
    expect(whole.children).toHaveLength(1);
    expect(whole.firstElementChild).toBe(main);
    expect(action).toHaveBeenCalled();
  });

  test("w/ empty options", () => {
    const range = { min: 0, max: 100 };
    const emptyOptions = new Set<number>();
    const { container } = render(Slider, { range, options: emptyOptions });
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
    const range = { min: 100, max: 0 };
    const { container } = render(Slider, { range });
    const main = container.querySelector('input[type="range"]') as HTMLInputElement;
    expect(main).toHaveAttribute("min", "0");
    expect(main).toHaveAttribute("max", "100");
  });

  test("w/ default value calculation", () => {
    const range = { min: 0, max: 100 };
    const { container } = render(Slider, { range });
    const main = container.querySelector('input[type="range"]') as HTMLInputElement;
    expect(main).toHaveValue("50"); // (0 + 100) / 2
  });

  test("w/ out of range value correction", () => {
    const range = { min: 10, max: 90 };
    const value = 5; // below min
    const { container } = render(Slider, { range, value });
    const main = container.querySelector('input[type="range"]') as HTMLInputElement;
    expect(main).toHaveValue("50"); // default to middle value
  });

  test("w/ valid initial value", () => {
    const range = { min: 0, max: 100 };
    const value = 75;
    const { container } = render(Slider, { range, value });
    const main = container.querySelector('input[type="range"]') as HTMLInputElement;
    expect(main).toHaveValue("75");
  });

  test("w/ custom step", () => {
    const range = { min: 0, max: 100 };
    const step = 5;
    const { container } = render(Slider, { range, step });
    const main = container.querySelector('input[type="range"]') as HTMLInputElement;
    expect(main).toHaveAttribute("step", "5");
  });

  test("w/ step any", () => {
    const range = { min: 0, max: 100 };
    const step = "any";
    const { container } = render(Slider, { range, step });
    const main = container.querySelector('input[type="range"]') as HTMLInputElement;
    expect(main).toHaveAttribute("step", "any");
  });

  test("w/ custom background range", () => {
    const range = { min: 0, max: 100 };
    const value = 25;
    const background = { min: 10, max: 90 };
    const { container } = render(Slider, { range, value, background });
    const main = container.querySelector('input[type="range"]') as HTMLInputElement;
    // value 25 in range 0-100 should be 25%
    // mapped to background 10-90 should be 30% (10 + 25 * 0.8)
    const expectedRate = Math.trunc(10 + (25 * 80) / 100);
    const expectedStyle =
      `background: linear-gradient(to right, var(--color-active) ${expectedRate}%, var(--color-inactive) ${expectedRate}%)`;
    expect(main.style.cssText).toContain(expectedStyle);
  });

  test("w/ specify attributes", () => {
    const range = { min: 0, max: 100 };
    const attributes = { name: "slider", disabled: true, "data-test": "custom" };
    const { container } = render(Slider, { range, attributes });
    const main = container.querySelector('input[type="range"]') as HTMLInputElement;
    expect(main).toHaveAttribute("name", "slider");
    expect(main).toHaveAttribute("disabled");
    expect(main).toHaveAttribute("data-test", "custom");
  });

  test("w/ ignored attributes", () => {
    const range = { min: 0, max: 100 };
    const attributes = { class: "ignored", type: "text", value: "ignored", min: 999, max: 999, step: 999, list: "ignored" };
    const { container } = render(Slider, { range, attributes });
    const main = container.querySelector('input[type="range"]') as HTMLInputElement;
    expect(main).not.toHaveAttribute("class", "ignored");
    expect(main).toHaveAttribute("type", "range");
    expect(main).not.toHaveValue("ignored");
    expect(main).toHaveAttribute("min", "0");
    expect(main).toHaveAttribute("max", "100");
    expect(main).toHaveAttribute("step", "1");
    expect(main).not.toHaveAttribute("list", "ignored");
  });

  test("value change interaction", async () => {
    const range = { min: 0, max: 100 };
    const props = $state({ range, value: 50 });
    const user = userEvent.setup();
    const { container } = render(Slider, props);
    const main = container.querySelector('input[type="range"]') as HTMLInputElement;

    expect(main).toHaveValue("50");

    await user.type(main, "75");
    waitFor(() => {
      expect(props.value).toBe(75);
    });
  });

  test("default class of each status", () => {
    const range = { min: 0, max: 100 };
    const left = vi.fn().mockImplementation(leftfn);
    const right = vi.fn().mockImplementation(rightfn);
    const status = STATE.NEUTRAL;
    const { container, getByTestId } = render(Slider, { range, left, right, status });
    const whole = container.firstElementChild as HTMLSpanElement;
    const main = whole.querySelector('input[type="range"]') as HTMLInputElement;
    const leftdv = getByTestId(leftid).parentElement;
    const rightdv = getByTestId(rightid).parentElement;

    expect(whole).toHaveClass(seed, PARTS.WHOLE, STATE.NEUTRAL);
    expect(leftdv).toHaveClass(seed, PARTS.LEFT, STATE.NEUTRAL);
    expect(main).toHaveClass(seed, PARTS.MAIN, STATE.NEUTRAL);
    expect(rightdv).toHaveClass(seed, PARTS.RIGHT, STATE.NEUTRAL);
  });

  test("w/ different status", async () => {
    const range = { min: 0, max: 100 };
    const left = vi.fn().mockImplementation(leftfn);
    const right = vi.fn().mockImplementation(rightfn);
    const props = $state({ range, left, right, status: "" });
    props.status = STATE.ACTIVE;
    const { container, getByTestId, rerender } = render(Slider, props);
    const whole = container.firstElementChild as HTMLSpanElement;
    const main = whole.querySelector('input[type="range"]') as HTMLInputElement;
    const leftdv = getByTestId(leftid).parentElement;
    const rightdv = getByTestId(rightid).parentElement;

    expect(whole).toHaveClass(seed, PARTS.WHOLE, STATE.ACTIVE);
    expect(leftdv).toHaveClass(seed, PARTS.LEFT, STATE.ACTIVE);
    expect(main).toHaveClass(seed, PARTS.MAIN, STATE.ACTIVE);
    expect(rightdv).toHaveClass(seed, PARTS.RIGHT, STATE.ACTIVE);

    props.status = STATE.INACTIVE;
    await rerender(props);

    expect(whole).toHaveClass(seed, PARTS.WHOLE, STATE.INACTIVE);
    expect(leftdv).toHaveClass(seed, PARTS.LEFT, STATE.INACTIVE);
    expect(main).toHaveClass(seed, PARTS.MAIN, STATE.INACTIVE);
    expect(rightdv).toHaveClass(seed, PARTS.RIGHT, STATE.INACTIVE);
  });

  test("w/ string style class", () => {
    const range = { min: 0, max: 100 };
    const left = vi.fn().mockImplementation(leftfn);
    const right = vi.fn().mockImplementation(rightfn);
    const clsid = "custom-style";
    const status = STATE.NEUTRAL;
    const { container, getByTestId } = render(Slider, { range, left, right, status, style: clsid });
    const whole = container.firstElementChild as HTMLSpanElement;
    const main = whole.querySelector('input[type="range"]') as HTMLInputElement;
    const leftdv = getByTestId(leftid).parentElement;
    const rightdv = getByTestId(rightid).parentElement;

    expect(whole).toHaveClass(clsid, PARTS.WHOLE, STATE.NEUTRAL);
    expect(leftdv).toHaveClass(clsid, PARTS.LEFT, STATE.NEUTRAL);
    expect(main).toHaveClass(clsid, PARTS.MAIN, STATE.NEUTRAL);
    expect(rightdv).toHaveClass(clsid, PARTS.RIGHT, STATE.NEUTRAL);
  });

  test("w/ object style", () => {
    const range = { min: 0, max: 100 };
    const left = vi.fn().mockImplementation(leftfn);
    const right = vi.fn().mockImplementation(rightfn);
    const dynObj = {
      base: "base-class",
      neutral: "neutral-class",
      active: "active-class",
      inactive: "inactive-class",
    };
    const style = {
      whole: dynObj,
      left: dynObj,
      main: dynObj,
      right: dynObj,
    };
    const status = STATE.NEUTRAL;
    const { container, getByTestId } = render(Slider, { range, left, right, status, style });
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
    const range = { min: 0, max: 100 };
    const props = $state({ range, element: undefined as HTMLInputElement | undefined });
    const { container } = render(Slider, props);
    const main = container.querySelector('input[type="range"]') as HTMLInputElement;

    expect(props.element).toBe(main);
  });

  test("range binding", async () => {
    const props = $state({ range: { min: 0, max: 100 } });
    const { container, rerender } = render(Slider, props);
    const main = container.querySelector('input[type="range"]') as HTMLInputElement;

    expect(main).toHaveAttribute("min", "0");
    expect(main).toHaveAttribute("max", "100");

    props.range = { min: 10, max: 90 };
    await rerender(props);

    expect(main).toHaveAttribute("min", "10");
    expect(main).toHaveAttribute("max", "90");
  });

  test("status binding", async () => {
    const range = { min: 0, max: 100 };
    const props = $state({ range, status: "" });
    const { container, rerender } = render(Slider, props);
    const whole = container.firstElementChild as HTMLSpanElement;

    expect(whole).toHaveClass("svs-slider", PARTS.WHOLE, STATE.NEUTRAL);

    props.status = STATE.ACTIVE;
    await rerender(props);

    expect(whole).toHaveClass("svs-slider", PARTS.WHOLE, STATE.ACTIVE);
  });
});
