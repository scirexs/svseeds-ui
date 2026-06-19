import { describe, expect, test, vi } from "vitest";
import { render } from "vitest-browser-svelte";
import { tick } from "svelte";
import ColorPicker, { getHex } from "#svs/ColorPicker.svelte";
import { PARTS, VARIANT } from "#svs/core";

describe("Switching existence of elements and basic functionality", () => {
  const attachfn = () => {};

  test("no props", async () => {
    const { container } = render(ColorPicker);
    const label = container.querySelector("label") as HTMLLabelElement;
    const input = container.querySelector("input") as HTMLInputElement;
    const colorDiv = container.querySelector("div[style*='background-color']") as HTMLDivElement;

    expect(label).toBeTruthy();
    expect(input).toBeTruthy();
    await expect.element(input).toHaveAttribute("type", "color");
    await expect.element(input).toHaveValue("#000000");
    await expect.element(input).toHaveStyle({ opacity: "0" });
    expect(colorDiv).toBeTruthy();
    await expect.element(colorDiv).toHaveStyle({ backgroundColor: "rgb(0, 0, 0)" });
  });

  test("w/ default value", async () => {
    const value = "#ff0000";
    const props = { value };
    const { container } = render(ColorPicker, props);
    const input = container.querySelector("input") as HTMLInputElement;
    const colorDiv = container.querySelector("div[style*='background-color']") as HTMLDivElement;

    await expect.element(input).toHaveValue(value);
    await expect.element(colorDiv).toHaveStyle({ backgroundColor: "rgb(255, 0, 0)" });
  });

  test("w/ alpha value", async () => {
    const value = "#ff0000";
    const alpha = 0.5;
    const props = { value, alpha };
    const { container } = render(ColorPicker, props);
    const colorDiv = container.querySelector("div[style*='background-color']") as HTMLDivElement;

    await expect.element(colorDiv).toHaveStyle({ backgroundColor: "rgba(255, 0, 0, 0.5)" });
  });

  test("w/ attach", () => {
    const attach = vi.fn().mockImplementation(attachfn);
    const props = { attach };
    const { container } = render(ColorPicker, props);
    const input = container.querySelector("input") as HTMLInputElement;

    expect(input).toBeTruthy();
    expect(attach).toHaveBeenCalled();
  });

  test("w/ attributes", async () => {
    const props = { name: "test-color", id: "color-input", disabled: true };
    const { container } = render(ColorPicker, props);
    const input = container.querySelector("input") as HTMLInputElement;

    await expect.element(input).toHaveAttribute("name", "test-color");
    await expect.element(input).toHaveAttribute("id", "color-input");
    await expect.element(input).toHaveAttribute("disabled");
    expect(input.hasAttribute("type")).toBe(true);
    expect(input.getAttribute("type")).not.toBe("text");
  });

  test("w/ invalid hex value defaults to #000", async () => {
    const value = "invalid-color";
    const props = { value };
    const { container } = render(ColorPicker, props);
    const input = container.querySelector("input") as HTMLInputElement;
    const colorDiv = container.querySelector("div[style*='background-color']") as HTMLDivElement;

    await expect.element(input).toHaveValue("#000000");
    await expect.element(colorDiv).toHaveStyle({ backgroundColor: "rgb(0, 0, 0)" });
  });

  test("w/ 3-digit hex value expands correctly", async () => {
    const value = "#f0a";
    const props = { value };
    const { container } = render(ColorPicker, props);
    const input = container.querySelector("input") as HTMLInputElement;
    const colorDiv = container.querySelector("div[style*='background-color']") as HTMLDivElement;

    await expect.element(input).toHaveValue("#ff00aa");
    await expect.element(colorDiv).toHaveStyle({ backgroundColor: "rgb(255, 0, 170)" });
  });

  test("w/ hex value without # prefix", async () => {
    const value = "ff0000";
    const props = { value };
    const { container } = render(ColorPicker, props);
    const input = container.querySelector("input") as HTMLInputElement;
    const colorDiv = container.querySelector("div[style*='background-color']") as HTMLDivElement;

    await expect.element(input).toHaveValue(`#${value}`);
    await expect.element(colorDiv).toHaveStyle({ backgroundColor: "rgb(255, 0, 0)" });
  });

  test("invalid value normalizes bound value to default", async () => {
    const props = $state({ value: "invalid-color" });
    render(ColorPicker, props);
    await tick();

    expect(props.value).toBe("#000000");
  });

  test.each(["", "#12", "#GGGGGG", "#zzz"])("invalid edge value %s normalizes to default", async (value) => {
    const props = $state({ value, alpha: 0.5 });
    const { container } = render(ColorPicker, props);
    const colorDiv = container.querySelector("div[style*='background-color']") as HTMLDivElement;

    await tick();

    expect(props.value).toBe("#000000");
    await expect.element(colorDiv).toHaveStyle({ backgroundColor: "rgba(0, 0, 0, 0.5)" });
  });

  test.each([
    ["#f0a", "#ff00aa"],
    ["ff0000", "#ff0000"],
  ])("hex value %s normalizes bound value to %s", async (value, expected) => {
    const props = $state({ value });
    render(ColorPicker, props);
    await tick();

    expect(props.value).toBe(expected);
  });
});

describe("Alpha value correction and edge cases", () => {
  test("alpha below 0 corrects to 0", async () => {
    const value = "#ff0000";
    const alpha = -0.5;
    const props = { value, alpha };
    const { container } = render(ColorPicker, props);
    const colorDiv = container.querySelector("div[style*='background-color']") as HTMLDivElement;

    await expect.element(colorDiv).toHaveStyle({ backgroundColor: "rgba(255, 0, 0, 0)" });
  });

  test("alpha above 1 corrects to 1", async () => {
    const value = "#ff0000";
    const alpha = 1.5;
    const props = { value, alpha };
    const { container } = render(ColorPicker, props);
    const colorDiv = container.querySelector("div[style*='background-color']") as HTMLDivElement;

    await expect.element(colorDiv).toHaveStyle({ backgroundColor: "rgb(255, 0, 0)" });
  });

  test("alpha exactly 0", async () => {
    const value = "#ff0000";
    const alpha = 0;
    const props = { value, alpha };
    const { container } = render(ColorPicker, props);
    const colorDiv = container.querySelector("div[style*='background-color']") as HTMLDivElement;

    await expect.element(colorDiv).toHaveStyle({ backgroundColor: "rgba(255, 0, 0, 0)" });
  });

  test("alpha exactly 1", async () => {
    const value = "#ff0000";
    const alpha = 1;
    const props = { value, alpha };
    const { container } = render(ColorPicker, props);
    const colorDiv = container.querySelector("div[style*='background-color']") as HTMLDivElement;

    await expect.element(colorDiv).toHaveStyle({ backgroundColor: "rgb(255, 0, 0)" });
  });
});

describe("Status and styling", () => {
  const seed = "svs-color-picker";

  test("default variant is neutral", async () => {
    const props = {};
    const { container } = render(ColorPicker, props);
    const label = container.querySelector("label") as HTMLLabelElement;
    const colorDiv = container.querySelector("div[style*='background-color']") as HTMLDivElement;

    await expect.element(label).toHaveClass(seed, PARTS.WHOLE, VARIANT.NEUTRAL);
    await expect.element(colorDiv).toHaveClass(seed, PARTS.MAIN, VARIANT.NEUTRAL);
  });

  test("w/ active variant", async () => {
    const props = { variant: VARIANT.ACTIVE };
    const { container } = render(ColorPicker, props);
    const label = container.querySelector("label") as HTMLLabelElement;
    const colorDiv = container.querySelector("div[style*='background-color']") as HTMLDivElement;

    await expect.element(label).toHaveClass(seed, PARTS.WHOLE, VARIANT.ACTIVE);
    await expect.element(colorDiv).toHaveClass(seed, PARTS.MAIN, VARIANT.ACTIVE);
  });

  test("w/ inactive variant", async () => {
    const props = { variant: VARIANT.INACTIVE };
    const { container } = render(ColorPicker, props);
    const label = container.querySelector("label") as HTMLLabelElement;
    const colorDiv = container.querySelector("div[style*='background-color']") as HTMLDivElement;

    await expect.element(label).toHaveClass(seed, PARTS.WHOLE, VARIANT.INACTIVE);
    await expect.element(colorDiv).toHaveClass(seed, PARTS.MAIN, VARIANT.INACTIVE);
  });

  test("w/ string style class", async () => {
    const clsid = "custom-style";
    const props = { styling: clsid };
    const { container } = render(ColorPicker, props);
    const label = container.querySelector("label") as HTMLLabelElement;
    const colorDiv = container.querySelector("div[style*='background-color']") as HTMLDivElement;

    await expect.element(label).toHaveClass(clsid, PARTS.WHOLE, VARIANT.NEUTRAL);
    await expect.element(colorDiv).toHaveClass(clsid, PARTS.MAIN, VARIANT.NEUTRAL);
  });

  test("w/ object style", async () => {
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

    await expect.element(label).toHaveClass(dynObj.base, dynObj.active);
    await expect.element(colorDiv).toHaveClass(dynObj.base, dynObj.active);
  });
});

describe("User interaction and binding", () => {
  test("color change updates value binding", async () => {
    const props = $state({ value: "#000000" });
    const { container } = render(ColorPicker, props);
    const input = container.querySelector("input") as HTMLInputElement;
    const colorDiv = container.querySelector("div[style*='background-color']") as HTMLDivElement;

    input.value = "#ff0000";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    await tick();

    expect(props.value).toBe("#ff0000");
    await expect.element(colorDiv).toHaveStyle({ backgroundColor: "rgb(255, 0, 0)" });
  });

  test("external value update is re-normalized reactively", async () => {
    const props = $state({ value: "#ff0000" });
    const { container } = render(ColorPicker, props);
    const colorDiv = container.querySelector("div[style*='background-color']") as HTMLDivElement;

    props.value = "#0f0";
    await tick();

    expect(props.value).toBe("#00ff00");
    await expect.element(colorDiv).toHaveStyle({ backgroundColor: "rgb(0, 255, 0)" });
  });

  test("external invalid value update normalizes to default", async () => {
    const props = $state({ value: "#ff0000" });
    const { container } = render(ColorPicker, props);
    const colorDiv = container.querySelector("div[style*='background-color']") as HTMLDivElement;

    props.value = "nope";
    await tick();

    expect(props.value).toBe("#000000");
    await expect.element(colorDiv).toHaveStyle({ backgroundColor: "rgb(0, 0, 0)" });
  });

  test("native input is focusable", async () => {
    const { container } = render(ColorPicker);
    const input = container.querySelector("input") as HTMLInputElement;

    input.focus();

    expect(document.activeElement).toBe(input);
    expect(input.style.visibility).not.toBe("hidden");
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

    await expect.element(label).toHaveClass("svs-color-picker", PARTS.WHOLE, VARIANT.NEUTRAL);

    props.variant = VARIANT.ACTIVE;
    await tick();

    await expect.element(label).toHaveClass("svs-color-picker", PARTS.WHOLE, VARIANT.ACTIVE);
  });

  test("alpha binding works", async () => {
    const props = $state({ alpha: 0.8, value: "#ff0000" });
    const { container } = render(ColorPicker, props);
    const colorDiv = container.querySelector("div[style*='background-color']") as HTMLDivElement;

    await expect.element(colorDiv).toHaveStyle({ backgroundColor: "rgba(255, 0, 0, 0.8)" });

    props.alpha = 0.3;
    await tick();
    await expect.element(colorDiv).toHaveStyle({ backgroundColor: "rgba(255, 0, 0, 0.3)" });
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

  test("checkered=false removes the transparency background", async () => {
    const { container } = render(ColorPicker, { checkered: false });
    const middle = container.querySelector("label > div") as HTMLDivElement;

    await expect.element(middle).toHaveStyle({ display: "inline-block" });
    expect(middle.style.backgroundImage).toBe("");
  });
});
