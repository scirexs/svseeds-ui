import { describe, expect, test, vi } from "vitest";
import { fireEvent, render } from "@testing-library/svelte";
import ColorPicker, { getHex } from "#svs/_ColorPicker.svelte";
import { PARTS, VARIANT } from "#svs/core";

describe("Switching existence of elements and basic functionality", () => {
  const attachfn = () => {};

  test("no props", () => {
    const { container } = render(ColorPicker);
    const label = container.querySelector("label") as HTMLLabelElement;
    const input = container.querySelector("input") as HTMLInputElement;
    const colorDiv = container.querySelector("div[style*='background-color']") as HTMLDivElement;

    expect(label).toBeTruthy();
    expect(input).toBeTruthy();
    expect(input).toHaveAttribute("type", "color");
    expect(input).toHaveValue("#000000");
    expect(input).toHaveStyle("opacity: 0");
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

  test("w/ attach", () => {
    const attach = vi.fn().mockImplementation(attachfn);
    const props = { attach };
    const { container } = render(ColorPicker, props);
    const input = container.querySelector("input") as HTMLInputElement;

    expect(input).toBeTruthy();
    expect(attach).toHaveBeenCalled();
  });

  test("w/ attributes", () => {
    const props = { name: "test-color", id: "color-input", disabled: true };
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

  test("invalid value normalizes bound value to default", async () => {
    const props = $state({ value: "invalid-color" });
    render(ColorPicker, props);
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(props.value).toBe("#000000");
  });

  test.each(["", "#12", "#GGGGGG", "#zzz"])("invalid edge value %s normalizes to default", async (value) => {
    const props = $state({ value, alpha: 0.5 });
    const { container } = render(ColorPicker, props);
    const colorDiv = container.querySelector("div[style*='background-color']") as HTMLDivElement;

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(props.value).toBe("#000000");
    expect(colorDiv).toHaveStyle("background-color: rgba(0,0,0,0.5)");
  });

  test.each([
    ["#f0a", "#ff00aa"],
    ["ff0000", "#ff0000"],
  ])("hex value %s normalizes bound value to %s", async (value, expected) => {
    const props = $state({ value });
    render(ColorPicker, props);
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(props.value).toBe(expected);
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

  test("default variant is neutral", () => {
    const props = {};
    const { container } = render(ColorPicker, props);
    const label = container.querySelector("label") as HTMLLabelElement;
    const colorDiv = container.querySelector("div[style*='background-color']") as HTMLDivElement;

    expect(label).toHaveClass(seed, PARTS.WHOLE, VARIANT.NEUTRAL);
    expect(colorDiv).toHaveClass(seed, PARTS.MAIN, VARIANT.NEUTRAL);
  });

  test("w/ active variant", () => {
    const props = { variant: VARIANT.ACTIVE };
    const { container } = render(ColorPicker, props);
    const label = container.querySelector("label") as HTMLLabelElement;
    const colorDiv = container.querySelector("div[style*='background-color']") as HTMLDivElement;

    expect(label).toHaveClass(seed, PARTS.WHOLE, VARIANT.ACTIVE);
    expect(colorDiv).toHaveClass(seed, PARTS.MAIN, VARIANT.ACTIVE);
  });

  test("w/ inactive variant", () => {
    const props = { variant: VARIANT.INACTIVE };
    const { container } = render(ColorPicker, props);
    const label = container.querySelector("label") as HTMLLabelElement;
    const colorDiv = container.querySelector("div[style*='background-color']") as HTMLDivElement;

    expect(label).toHaveClass(seed, PARTS.WHOLE, VARIANT.INACTIVE);
    expect(colorDiv).toHaveClass(seed, PARTS.MAIN, VARIANT.INACTIVE);
  });

  test("w/ string style class", () => {
    const clsid = "custom-style";
    const props = { styling: clsid };
    const { container } = render(ColorPicker, props);
    const label = container.querySelector("label") as HTMLLabelElement;
    const colorDiv = container.querySelector("div[style*='background-color']") as HTMLDivElement;

    expect(label).toHaveClass(clsid, PARTS.WHOLE, VARIANT.NEUTRAL);
    expect(colorDiv).toHaveClass(clsid, PARTS.MAIN, VARIANT.NEUTRAL);
  });

  test("w/ object style", () => {
    const dynObj = {
      base: "base-class",
      neutral: "neutral-class",
      active: "active-class",
      inactive: "inactive-class",
    };
    const styling = {
      whole: dynObj,
      main: dynObj,
    };
    const props = { styling, variant: VARIANT.ACTIVE };
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

  test("external value update is re-normalized reactively", async () => {
    const props = $state({ value: "#ff0000" });
    const { container } = render(ColorPicker, props);
    const colorDiv = container.querySelector("div[style*='background-color']") as HTMLDivElement;

    props.value = "#0f0";
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(props.value).toBe("#00ff00");
    expect(colorDiv).toHaveStyle("background-color: rgba(0,255,0,1)");
  });

  test("external invalid value update normalizes to default", async () => {
    const props = $state({ value: "#ff0000" });
    const { container } = render(ColorPicker, props);
    const colorDiv = container.querySelector("div[style*='background-color']") as HTMLDivElement;

    props.value = "nope";
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(props.value).toBe("#000000");
    expect(colorDiv).toHaveStyle("background-color: rgba(0,0,0,1)");
  });

  test("native input is focusable", () => {
    const { container } = render(ColorPicker);
    const input = container.querySelector("input") as HTMLInputElement;

    input.focus();

    expect(document.activeElement).toBe(input);
    expect(input).not.toHaveStyle("visibility: hidden");
  });

  test("element binding works", () => {
    const props = $state({ element: undefined });
    const { container } = render(ColorPicker, props);
    const input = container.querySelector("input") as HTMLInputElement;

    expect(props.element).toBe(input);
  });

  test("variant binding works", async () => {
    const props = $state({ variant: VARIANT.NEUTRAL as string });
    const { container } = render(ColorPicker, props);
    const label = container.querySelector("label") as HTMLLabelElement;

    expect(label).toHaveClass("svs-color-picker", PARTS.WHOLE, VARIANT.NEUTRAL);

    props.variant = VARIANT.ACTIVE;
    await new Promise((resolve) => setTimeout(resolve, 0)); // wait reactive update

    expect(label).toHaveClass("svs-color-picker", PARTS.WHOLE, VARIANT.ACTIVE);
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

  test("checkered=false removes the transparency background", () => {
    const { container } = render(ColorPicker, { checkered: false });
    const middle = container.querySelector("label > div") as HTMLDivElement;

    expect(middle).toHaveStyle("display: inline-block");
    expect(middle.style.backgroundImage).toBe("");
  });
});
