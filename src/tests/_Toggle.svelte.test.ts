import { afterEach, describe, expect, test, vi } from "vitest";
import { fireEvent, render, within } from "@testing-library/svelte";
import { userEvent } from "@testing-library/user-event";
import { createRawSnippet } from "svelte";
import Toggle from "../lib/_svseeds/_Toggle.svelte";
import { PARTS, VARIANT } from "../lib/_svseeds/core.ts";

type ToggleElement = HTMLButtonElement | undefined;
const ariaLabel = "toggle_label";
const mainid = "test-main";
const leftid = "test-left";
const rightid = "test-right";
const mainfn = createRawSnippet(
  (
    variant: () => string,
    value: () => boolean,
    element: () => ToggleElement,
  ) => {
    return { render: () => `<span data-testid="${mainid}">${variant()}-${value()}-${element()?.tagName}</span>` };
  },
);
const leftfn = createRawSnippet(
  (
    variant: () => string,
    value: () => boolean,
    element: () => ToggleElement,
  ) => {
    return { render: () => `<span data-testid="${leftid}">${variant()}-${value()}-${element()?.tagName}</span>` };
  },
);
const rightfn = createRawSnippet(
  (
    variant: () => string,
    value: () => boolean,
    element: () => ToggleElement,
  ) => {
    return { render: () => `<span data-testid="${rightid}">${variant()}-${value()}-${element()?.tagName}</span>` };
  },
);

describe("Switching existence of elements", () => {
  const actionfn = () => {
    return {};
  };

  test("no props", () => {
    const children = vi.fn().mockImplementation(mainfn);
    const props = { children };
    const { getByRole } = render(Toggle, props);
    const main = getByRole("button") as HTMLButtonElement;
    expect(main.tagName).toBe("BUTTON");
    expect(main).toHaveAttribute("type", "button");
    expect(main).toHaveAttribute("aria-pressed", "false");
    expect(main).not.toHaveAttribute("aria-checked");
    expect(main).not.toHaveAttribute("role");
  });

  test("switch to switch type", () => {
    const children = vi.fn().mockImplementation(mainfn);
    const props = { children, role: "switch" };
    const { getByRole } = render(Toggle, props);
    const main = getByRole("switch") as HTMLButtonElement;
    expect(main.tagName).toBe("BUTTON");
    expect(main).toHaveAttribute("type", "button");
    expect(main).toHaveAttribute("role", "switch");
    expect(main).toHaveAttribute("aria-checked", "false");
    expect(main).not.toHaveAttribute("aria-pressed");
  });

  test("w/ ariaLabel", () => {
    const children = vi.fn().mockImplementation(mainfn);
    const props = { children, ariaLabel };
    const { getByRole } = render(Toggle, props);
    const main = getByRole("button") as HTMLButtonElement;
    expect(main).toHaveAttribute("aria-label", ariaLabel);
  });

  test("w/ main snippet", () => {
    const children = vi.fn().mockImplementation(mainfn);
    const props = { children };
    const { getByRole, getByTestId } = render(Toggle, props);
    const button = getByRole("button") as HTMLButtonElement;
    const mainsp = getByTestId(mainid);
    expect(button).toContainElement(mainsp);
    expect(children).toHaveBeenCalled();
  });

  test("w/ main snippet of action button", () => {
    const children = vi.fn().mockImplementation(mainfn);
    const action = vi.fn().mockImplementation(actionfn);
    const props = { children, action };
    const { getByRole, getByTestId } = render(Toggle, props);
    const button = getByRole("button") as HTMLButtonElement;
    const mainsp = getByTestId(mainid);
    expect(button).toContainElement(mainsp);
    expect(children).toHaveBeenCalled();
    expect(action).toHaveBeenCalled();
  });

  test("w/ main snippet of switch", () => {
    const children = vi.fn().mockImplementation(mainfn);
    const props = { children, role: "switch" };
    const { getByRole, getByTestId } = render(Toggle, props);
    const button = getByRole("switch") as HTMLButtonElement;
    const mainsp = getByTestId(mainid);
    expect(button).toContainElement(mainsp);
    expect(children).toHaveBeenCalled();
  });

  test("w/ children snippet of action switch", () => {
    const children = vi.fn().mockImplementation(mainfn);
    const action = vi.fn().mockImplementation(actionfn);
    const props = { children, role: "switch", action };
    const { getByRole, getByTestId } = render(Toggle, props);
    const button = getByRole("switch") as HTMLButtonElement;
    const mainsp = getByTestId(mainid);
    expect(button).toContainElement(mainsp);
    expect(children).toHaveBeenCalled();
    expect(action).toHaveBeenCalled();
  });

  test("w/ left snippet", () => {
    const children = vi.fn().mockImplementation(mainfn);
    const left = vi.fn().mockImplementation(leftfn);
    const props = { children, left };
    const { getByRole, getByTestId } = render(Toggle, props);
    const whole = getByRole("group") as HTMLSpanElement;
    const button = getByRole("button") as HTMLButtonElement;
    const leftsp = getByTestId(leftid);
    expect(whole.tagName).toBe("SPAN");
    expect(whole).toContainElement(button);
    expect(whole).toContainElement(leftsp.parentElement);
    expect(whole.children).toHaveLength(2); // left side + button
    expect(left).toHaveBeenCalled();
  });

  test("w/ right snippet", () => {
    const children = vi.fn().mockImplementation(mainfn);
    const right = vi.fn().mockImplementation(rightfn);
    const props = { children, right };
    const { getByRole, getByTestId } = render(Toggle, props);
    const whole = getByRole("group") as HTMLSpanElement;
    const button = getByRole("button") as HTMLButtonElement;
    const rightsp = getByTestId(rightid);
    expect(whole.tagName).toBe("SPAN");
    expect(whole).toContainElement(button);
    expect(whole).toContainElement(rightsp.parentElement);
    expect(whole.children).toHaveLength(2); // button + right side
    expect(right).toHaveBeenCalled();
  });

  test("w/ left, right, and main snippets", () => {
    const children = vi.fn().mockImplementation(mainfn);
    const left = vi.fn().mockImplementation(leftfn);
    const right = vi.fn().mockImplementation(rightfn);
    const props = { children, left, right };
    const { getByRole, getByTestId } = render(Toggle, props);
    const whole = getByRole("group") as HTMLSpanElement;
    const button = getByRole("button") as HTMLButtonElement;
    const mainsp = getByTestId(mainid);
    const leftsp = getByTestId(leftid);
    const rightsp = getByTestId(rightid);
    expect(whole).toContainElement(button);
    expect(button).toContainElement(mainsp);
    expect(whole).toContainElement(leftsp.parentElement);
    expect(whole).toContainElement(rightsp.parentElement);
    expect(whole.children).toHaveLength(3);
    expect(children).toHaveBeenCalled();
    expect(left).toHaveBeenCalled();
    expect(right).toHaveBeenCalled();
  });

  test("w/ all snippets of switch", () => {
    const children = vi.fn().mockImplementation(mainfn);
    const left = vi.fn().mockImplementation(leftfn);
    const right = vi.fn().mockImplementation(rightfn);
    const props = { children, left, right, role: "switch" };
    const { getByRole, getByTestId } = render(Toggle, props);
    const whole = getByRole("group") as HTMLSpanElement;
    const button = getByRole("switch") as HTMLButtonElement;
    const mainsp = getByTestId(mainid);
    const leftsp = getByTestId(leftid);
    const rightsp = getByTestId(rightid);
    const thumb = mainsp.parentElement;
    expect(whole).toContainElement(button);
    expect(button).toContainElement(thumb);
    expect(thumb).toContainElement(mainsp);
    expect(whole).toContainElement(leftsp.parentElement);
    expect(whole).toContainElement(rightsp.parentElement);
    expect(whole.children).toHaveLength(3);
    expect(children).toHaveBeenCalled();
    expect(left).toHaveBeenCalled();
    expect(right).toHaveBeenCalled();
  });
});

describe("Specify attrs & state transition & event handlers", () => {
  const preset = "svs-toggle";

  test("w/ default value true", () => {
    const children = vi.fn().mockImplementation(mainfn);
    const props = { children, value: true };
    const { getByRole } = render(Toggle, props);
    const main = getByRole("button") as HTMLButtonElement;
    expect(main).toHaveAttribute("aria-pressed", "true");
  });

  test("w/ default value true of switch", () => {
    const children = vi.fn().mockImplementation(mainfn);
    const props = { children, value: true, role: "switch" };
    const { getByRole } = render(Toggle, props);
    const main = getByRole("switch") as HTMLButtonElement;
    expect(main).toHaveAttribute("aria-checked", "true");
  });

  test("w/ specify id", () => {
    const children = vi.fn().mockImplementation(mainfn);
    const id = "id_foo";
    const props = { children, attributes: { id } };
    const { getByRole } = render(Toggle, props);
    const main = getByRole("button") as HTMLButtonElement;
    expect(main).toHaveAttribute("id", id);
  });

  test("w/ specify ignored attrs", () => {
    const children = vi.fn().mockImplementation(mainfn);
    const props = { children, attributes: { class: "c", type: "submit", role: "checkbox", "aria-checked": "mixed" } };
    const { getByRole } = render(Toggle, props);
    const main = getByRole("button") as HTMLButtonElement;
    expect(main).not.toHaveAttribute("class", "c");
    expect(main).not.toHaveAttribute("type", "submit");
    expect(main).not.toHaveAttribute("role", "checkbox");
    expect(main).not.toHaveAttribute("aria-checked", "mixed");
  });

  test("w/ specify major attrs", async () => {
    const children = vi.fn().mockImplementation(mainfn);
    const props = { children, attributes: { name: "n", disabled: true, tabindex: -1 } };
    const { rerender, getByRole } = render(Toggle, props);
    let main = getByRole("button") as HTMLButtonElement;
    expect(main).toHaveAttribute("name", "n");
    expect(main).toHaveAttribute("disabled");
    expect(main).toHaveAttribute("tabindex", "-1");

    await rerender({ role: "switch", ...props });
    main = getByRole("switch") as HTMLButtonElement;
    expect(main).toHaveAttribute("name", "n");
    expect(main).toHaveAttribute("disabled");
    expect(main).toHaveAttribute("tabindex", "-1");
  });

  test("major state transition", async () => {
    const children = vi.fn().mockImplementation(mainfn);
    const props = $state({
      children,
      value: false,
      variant: VARIANT.NEUTRAL,
    });
    const user = userEvent.setup();
    const { getByRole } = render(Toggle, props);
    const main = getByRole("button") as HTMLButtonElement;
    expect(props.value).toBe(false);
    expect(props.variant).toBe(VARIANT.NEUTRAL);
    expect(main).toHaveAttribute("aria-pressed", "false");

    await user.click(main);
    expect(props.value).toBe(true);
    expect(props.variant).toBe(VARIANT.ACTIVE);
    expect(main).toHaveAttribute("aria-pressed", "true");

    await user.click(main);
    expect(props.value).toBe(false);
    expect(props.variant).toBe(VARIANT.NEUTRAL);
    expect(main).toHaveAttribute("aria-pressed", "false");
  });

  test("state transition of switch", async () => {
    const children = vi.fn().mockImplementation(mainfn);
    const props = $state({
      children,
      value: false,
      variant: VARIANT.NEUTRAL,
      role: "switch",
    });
    const user = userEvent.setup();
    const { getByRole } = render(Toggle, props);
    const main = getByRole("switch") as HTMLButtonElement;
    expect(props.value).toBe(false);
    expect(props.variant).toBe(VARIANT.NEUTRAL);
    expect(main).toHaveAttribute("aria-checked", "false");

    await user.click(main);
    expect(props.value).toBe(true);
    expect(props.variant).toBe(VARIANT.ACTIVE);
    expect(main).toHaveAttribute("aria-checked", "true");

    await user.click(main);
    expect(props.value).toBe(false);
    expect(props.variant).toBe(VARIANT.NEUTRAL);
    expect(main).toHaveAttribute("aria-checked", "false");
  });

  test("state transition with custom neutral variant", async () => {
    const children = vi.fn().mockImplementation(mainfn);
    const customNeutral = "custom_neutral";
    const props = $state({
      children,
      value: false,
      variant: customNeutral,
    });
    const user = userEvent.setup();
    const { getByRole } = render(Toggle, props);
    const main = getByRole("button") as HTMLButtonElement;
    expect(props.value).toBe(false);
    expect(props.variant).toBe(customNeutral);

    await user.click(main);
    expect(props.value).toBe(true);
    expect(props.variant).toBe(VARIANT.ACTIVE);

    await user.click(main);
    expect(props.value).toBe(false);
    expect(props.variant).toBe(customNeutral); // returns to custom neutral, not default neutral
  });

  test("w/ custom onclick", async () => {
    const children = vi.fn().mockImplementation(mainfn);
    const onclick = vi.fn();
    const props = $state({
      children,
      value: false,
      attributes: { onclick },
    });
    const user = userEvent.setup();
    const { getByRole } = render(Toggle, props);
    const main = getByRole("button") as HTMLButtonElement;

    await user.click(main);
    expect(onclick).toHaveBeenCalledTimes(1);
    expect(props.value).toBe(true);

    await user.click(main);
    expect(onclick).toHaveBeenCalledTimes(2);
    expect(props.value).toBe(false);
  });

  test("programmatic value change updates variant", async () => {
    const children = vi.fn().mockImplementation(mainfn);
    const props = $state({
      children,
      value: false,
      variant: VARIANT.NEUTRAL,
    });
    const { rerender } = render(Toggle, props);
    expect(props.variant).toBe(VARIANT.NEUTRAL);

    props.value = true;
    await rerender(props);
    expect(props.variant).toBe(VARIANT.ACTIVE);

    props.value = false;
    await rerender(props);
    expect(props.variant).toBe(VARIANT.NEUTRAL);
  });

  test("default class of each variant", async () => {
    const children = vi.fn().mockImplementation(mainfn);
    const left = vi.fn().mockImplementation(leftfn);
    const right = vi.fn().mockImplementation(rightfn);
    const props = $state({
      children,
      left,
      right,
      value: false,
      variant: VARIANT.NEUTRAL,
    });
    const user = userEvent.setup();
    const { getByRole, getByTestId } = render(Toggle, props);
    const whole = getByRole("group") as HTMLSpanElement;
    const button = getByRole("button") as HTMLButtonElement;
    const mainsp = getByTestId(mainid);
    const leftdv = getByTestId(leftid).parentElement;
    const rightdv = getByTestId(rightid).parentElement;

    expect(props.variant).toBe(VARIANT.NEUTRAL);
    expect(whole).toHaveClass(preset, PARTS.WHOLE);
    expect(leftdv).toHaveClass(preset, PARTS.LEFT);
    expect(button).toHaveClass(preset, PARTS.MAIN);
    expect(rightdv).toHaveClass(preset, PARTS.RIGHT);

    await user.click(button);
    expect(props.variant).toBe(VARIANT.ACTIVE);
    expect(whole).toHaveClass(preset, PARTS.WHOLE, VARIANT.ACTIVE);
    expect(leftdv).toHaveClass(preset, PARTS.LEFT, VARIANT.ACTIVE);
    expect(button).toHaveClass(preset, PARTS.MAIN, VARIANT.ACTIVE);
    expect(rightdv).toHaveClass(preset, PARTS.RIGHT, VARIANT.ACTIVE);
  });

  test("default class of switch with thumb", async () => {
    const children = vi.fn().mockImplementation(mainfn);
    const props = $state({
      children,
      role: "switch",
      value: false,
      variant: VARIANT.NEUTRAL,
    });
    const user = userEvent.setup();
    const { getByRole, getByTestId } = render(Toggle, props);
    const button = getByRole("switch") as HTMLButtonElement;
    const mainsp = getByTestId(mainid);

    expect(props.variant).toBe(VARIANT.NEUTRAL);
    expect(button).toHaveClass(preset, PARTS.MAIN);

    await user.click(button);
    expect(props.variant).toBe(VARIANT.ACTIVE);
    expect(button).toHaveClass(preset, PARTS.MAIN, VARIANT.ACTIVE);
  });

  test("w/ string styling class of each variant", async () => {
    const clsid = "style_id";
    const children = vi.fn().mockImplementation(mainfn);
    const left = vi.fn().mockImplementation(leftfn);
    const right = vi.fn().mockImplementation(rightfn);
    const props = $state({
      children,
      left,
      right,
      value: false,
      variant: VARIANT.NEUTRAL,
      styling: clsid,
    });
    const user = userEvent.setup();
    const { getByRole, getByTestId } = render(Toggle, props);
    const whole = getByRole("group") as HTMLSpanElement;
    const button = getByRole("button") as HTMLButtonElement;
    const leftdv = getByTestId(leftid).parentElement;
    const rightdv = getByTestId(rightid).parentElement;

    expect(props.variant).toBe(VARIANT.NEUTRAL);
    expect(whole).toHaveClass(clsid, PARTS.WHOLE);
    expect(leftdv).toHaveClass(clsid, PARTS.LEFT);
    expect(button).toHaveClass(clsid, PARTS.MAIN);
    expect(rightdv).toHaveClass(clsid, PARTS.RIGHT);

    await user.click(button);
    expect(props.variant).toBe(VARIANT.ACTIVE);
    expect(whole).toHaveClass(clsid, PARTS.WHOLE, VARIANT.ACTIVE);
    expect(leftdv).toHaveClass(clsid, PARTS.LEFT, VARIANT.ACTIVE);
    expect(button).toHaveClass(clsid, PARTS.MAIN, VARIANT.ACTIVE);
    expect(rightdv).toHaveClass(clsid, PARTS.RIGHT, VARIANT.ACTIVE);
  });

  test("w/ obj styling of each variant", async () => {
    const dynObj = {
      base: "base",
      neutral: "dyn_neutral",
      active: "dyn_active",
      inactive: "dyn_inactive",
    };
    const styling = {
      whole: dynObj,
      main: dynObj,
      left: dynObj,
      right: dynObj,
      aux: dynObj,
    };
    const children = vi.fn().mockImplementation(mainfn);
    const left = vi.fn().mockImplementation(leftfn);
    const right = vi.fn().mockImplementation(rightfn);
    const props = $state({
      children,
      left,
      right,
      role: "switch",
      value: false,
      variant: VARIANT.NEUTRAL,
      styling,
    });
    const user = userEvent.setup();
    const { getByRole, getByTestId } = render(Toggle, props);
    const whole = getByRole("group") as HTMLSpanElement;
    const button = getByRole("switch") as HTMLButtonElement;
    const mainsp = getByTestId(mainid);
    const leftdv = getByTestId(leftid).parentElement;
    const rightdv = getByTestId(rightid).parentElement;
    const thumb = mainsp.parentElement;

    expect(props.variant).toBe(VARIANT.NEUTRAL);
    expect(whole).toHaveClass(dynObj.base, dynObj.neutral);
    expect(leftdv).toHaveClass(dynObj.base, dynObj.neutral);
    expect(button).toHaveClass(dynObj.base, dynObj.neutral);
    expect(rightdv).toHaveClass(dynObj.base, dynObj.neutral);
    expect(thumb).toHaveClass(dynObj.base, dynObj.neutral);

    await user.click(button);
    expect(props.variant).toBe(VARIANT.ACTIVE);
    expect(whole).toHaveClass(dynObj.base, dynObj.active);
    expect(leftdv).toHaveClass(dynObj.base, dynObj.active);
    expect(button).toHaveClass(dynObj.base, dynObj.active);
    expect(rightdv).toHaveClass(dynObj.base, dynObj.active);
    expect(thumb).toHaveClass(dynObj.base, dynObj.active);
  });
});
