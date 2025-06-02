import { describe, expect, test, vi } from "vitest";
import { fireEvent, render } from "@testing-library/svelte";
import ColorPicker, { getHex } from "../lib/_svseeds/_ColorPicker.svelte";
import { PARTS, STATE } from "../lib/_svseeds/core.ts";

describe("Switching existence of elements and basic functionality", () => {
  const actionfn = () => {
    return {};
  };

  test("no props", () => {
    const { container } = render(ColorPicker);
    const label = container.querySelector("label") as HTMLLabelElement;
    const input = container.querySelector("input") as HTMLInputElement;
    const colorDiv = container.querySelector("div[style*='background-color']") as HTMLDivElement;

    expect(label).toBeTruthy();
    expect(input).toBeTruthy();
    expect(input).toHaveAttribute("type", "color");
    expect(input).toHaveValue("#000000");
    expect(input).toHaveStyle("visibility: hidden");
    expect(colorDiv).toBeTruthy();
    expect(colorDiv).toHaveStyle("background-color: rgba(0,0,0,1)");
  });

  test("w/ default value", () => {
    const value = "#ff0000";
    const props = { value };
    const { container } = render(ColorPicker, props);
    const input = container.querySelector("input") as HTMLInputElement;
    const colorDiv = container.querySelector("div[style*='background-color']") as HTMLDivElement;

    expect(input).toHaveValue(value);
    expect(colorDiv).toHaveStyle("background-color: rgba(255,0,0,1)");
  });

  test("w/ alpha value", () => {
    const value = "#ff0000";
    const alpha = 0.5;
    const props = { value, alpha };
    const { container } = render(ColorPicker, props);
    const colorDiv = container.querySelector("div[style*='background-color']") as HTMLDivElement;

    expect(colorDiv).toHaveStyle("background-color: rgba(255,0,0,0.5)");
  });

  test("w/ action", () => {
    const action = vi.fn().mockImplementation(actionfn);
    const props = { action };
    const { container } = render(ColorPicker, props);
    const input = container.querySelector("input") as HTMLInputElement;

    expect(input).toBeTruthy();
    expect(action).toHaveBeenCalled();
  });

  test("w/ attributes", () => {
    const attributes = { name: "test-color", id: "color-input", disabled: true };
    const props = { attributes };
    const { container } = render(ColorPicker, props);
    const input = container.querySelector("input") as HTMLInputElement;

    expect(input).toHaveAttribute("name", "test-color");
    expect(input).toHaveAttribute("id", "color-input");
    expect(input).toHaveAttribute("disabled");
    expect(input).not.toHaveAttribute("type", "text"); // type should remain "color"
  });

  test("w/ invalid hex value defaults to #000", () => {
    const value = "invalid-color";
    const props = { value };
    const { container } = render(ColorPicker, props);
    const input = container.querySelector("input") as HTMLInputElement;
    const colorDiv = container.querySelector("div[style*='background-color']") as HTMLDivElement;

    expect(input).toHaveValue("#000000");
    expect(colorDiv).toHaveStyle("background-color: rgba(0,0,0,1)");
  });

  test("w/ 3-digit hex value expands correctly", () => {
    const value = "#f0a";
    const props = { value };
    const { container } = render(ColorPicker, props);
    const input = container.querySelector("input") as HTMLInputElement;
    const colorDiv = container.querySelector("div[style*='background-color']") as HTMLDivElement;

    expect(input).toHaveValue("#ff00aa");
    expect(colorDiv).toHaveStyle("background-color: rgba(255,0,170,1)");
  });

  test("w/ hex value without # prefix", () => {
    const value = "ff0000";
    const props = { value };
    const { container } = render(ColorPicker, props);
    const input = container.querySelector("input") as HTMLInputElement;
    const colorDiv = container.querySelector("div[style*='background-color']") as HTMLDivElement;

    expect(input).toHaveValue(`#${value}`);
    expect(colorDiv).toHaveStyle("background-color: rgba(255,0,0,1)");
  });
});

describe("Alpha value correction and edge cases", () => {
  test("alpha below 0 corrects to 0", () => {
    const value = "#ff0000";
    const alpha = -0.5;
    const props = { value, alpha };
    const { container } = render(ColorPicker, props);
    const colorDiv = container.querySelector("div[style*='background-color']") as HTMLDivElement;

    expect(colorDiv).toHaveStyle("background-color: rgba(255,0,0,0)");
  });

  test("alpha above 1 corrects to 1", () => {
    const value = "#ff0000";
    const alpha = 1.5;
    const props = { value, alpha };
    const { container } = render(ColorPicker, props);
    const colorDiv = container.querySelector("div[style*='background-color']") as HTMLDivElement;

    expect(colorDiv).toHaveStyle("background-color: rgba(255,0,0,1)");
  });

  test("alpha exactly 0", () => {
    const value = "#ff0000";
    const alpha = 0;
    const props = { value, alpha };
    const { container } = render(ColorPicker, props);
    const colorDiv = container.querySelector("div[style*='background-color']") as HTMLDivElement;

    expect(colorDiv).toHaveStyle("background-color: rgba(255,0,0,0)");
  });

  test("alpha exactly 1", () => {
    const value = "#ff0000";
    const alpha = 1;
    const props = { value, alpha };
    const { container } = render(ColorPicker, props);
    const colorDiv = container.querySelector("div[style*='background-color']") as HTMLDivElement;

    expect(colorDiv).toHaveStyle("background-color: rgba(255,0,0,1)");
  });
});

describe("Status and styling", () => {
  const seed = "svs-color-picker";

  test("default status is neutral", () => {
    const props = {};
    const { container } = render(ColorPicker, props);
    const label = container.querySelector("label") as HTMLLabelElement;
    const colorDiv = container.querySelector("div[style*='background-color']") as HTMLDivElement;

    expect(label).toHaveClass(seed, PARTS.WHOLE, STATE.NEUTRAL);
    expect(colorDiv).toHaveClass(seed, PARTS.MAIN, STATE.NEUTRAL);
  });

  test("w/ active status", () => {
    const props = { status: STATE.ACTIVE };
    const { container } = render(ColorPicker, props);
    const label = container.querySelector("label") as HTMLLabelElement;
    const colorDiv = container.querySelector("div[style*='background-color']") as HTMLDivElement;

    expect(label).toHaveClass(seed, PARTS.WHOLE, STATE.ACTIVE);
    expect(colorDiv).toHaveClass(seed, PARTS.MAIN, STATE.ACTIVE);
  });

  test("w/ inactive status", () => {
    const props = { status: STATE.INACTIVE };
    const { container } = render(ColorPicker, props);
    const label = container.querySelector("label") as HTMLLabelElement;
    const colorDiv = container.querySelector("div[style*='background-color']") as HTMLDivElement;

    expect(label).toHaveClass(seed, PARTS.WHOLE, STATE.INACTIVE);
    expect(colorDiv).toHaveClass(seed, PARTS.MAIN, STATE.INACTIVE);
  });

  test("w/ string style class", () => {
    const clsid = "custom-style";
    const props = { style: clsid };
    const { container } = render(ColorPicker, props);
    const label = container.querySelector("label") as HTMLLabelElement;
    const colorDiv = container.querySelector("div[style*='background-color']") as HTMLDivElement;

    expect(label).toHaveClass(clsid, PARTS.WHOLE, STATE.NEUTRAL);
    expect(colorDiv).toHaveClass(clsid, PARTS.MAIN, STATE.NEUTRAL);
  });

  test("w/ object style", () => {
    const dynObj = {
      base: "base-class",
      neutral: "neutral-class",
      active: "active-class",
      inactive: "inactive-class",
    };
    const style = {
      whole: dynObj,
      main: dynObj,
    };
    const props = { style, status: STATE.ACTIVE };
    const { container } = render(ColorPicker, props);
    const label = container.querySelector("label") as HTMLLabelElement;
    const colorDiv = container.querySelector("div[style*='background-color']") as HTMLDivElement;

    expect(label).toHaveClass(dynObj.base, dynObj.active);
    expect(colorDiv).toHaveClass(dynObj.base, dynObj.active);
  });
});

describe("User interaction and binding", () => {
  test("color change updates value binding", async () => {
    const props = $state({ value: "#000000" });
    const { container } = render(ColorPicker, props);
    const input = container.querySelector("input") as HTMLInputElement;
    const colorDiv = container.querySelector("div[style*='background-color']") as HTMLDivElement;

    await fireEvent.input(input, { target: { value: "#ff0000" } });
    await new Promise((resolve) => setTimeout(resolve, 0)); // wait reactive update

    expect(props.value).toBe("#ff0000");
    expect(colorDiv).toHaveStyle("background-color: rgba(255,0,0,1)");
  });

  test("element binding works", () => {
    const props = $state({ element: undefined });
    const { container } = render(ColorPicker, props);
    const input = container.querySelector("input") as HTMLInputElement;

    expect(props.element).toBe(input);
  });

  test("status binding works", async () => {
    const props = $state({ status: "" });
    const { container } = render(ColorPicker, props);
    const label = container.querySelector("label") as HTMLLabelElement;

    expect(label).toHaveClass("svs-color-picker", PARTS.WHOLE, STATE.NEUTRAL);

    props.status = STATE.ACTIVE;
    await new Promise((resolve) => setTimeout(resolve, 0)); // wait reactive update

    expect(label).toHaveClass("svs-color-picker", PARTS.WHOLE, STATE.ACTIVE);
  });

  test("alpha binding works", async () => {
    const props = $state({ alpha: 0.8, value: "#ff0000" });
    const { container } = render(ColorPicker, props);
    const colorDiv = container.querySelector("div[style*='background-color']") as HTMLDivElement;

    expect(colorDiv).toHaveStyle("background-color: rgba(255,0,0,0.8)");

    props.alpha = 0.3;
    await new Promise((resolve) => setTimeout(resolve, 0)); // wait reactive update
    expect(colorDiv).toHaveStyle("background-color: rgba(255,0,0,0.3)");
  });
});

describe("Module functions", () => {
  test("getHex function with valid RGB", () => {
    expect(getHex([255, 0, 0])).toBe("#ff0000");
    expect(getHex([0, 255, 0])).toBe("#00ff00");
    expect(getHex([0, 0, 255])).toBe("#0000ff");
    expect(getHex([255, 255, 255])).toBe("#ffffff");
    expect(getHex([0, 0, 0])).toBe("#000000");
  });

  test("getHex function with invalid RGB", () => {
    expect(getHex([256, 0, 0])).toBe("#000000");
    expect(getHex([-1, 0, 0])).toBe("#000000");
    expect(getHex([255, 256, 0])).toBe("#000000");
    expect(getHex([255, 0, -1])).toBe("#000000");
  });
});

describe("Transparency background pattern", () => {
  test("transparency background pattern exists", () => {
    const props = { value: "#ff0000", alpha: 0.5 };
    const { container } = render(ColorPicker, props);
    const patternDiv = container.querySelector("div[style*='background-image']") as HTMLDivElement;

    expect(patternDiv).toBeTruthy();
    expect(patternDiv.style.backgroundSize).toBe("20px 20px");
  });
});
