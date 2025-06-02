import { afterEach, describe, expect, test, vi } from "vitest";
import { fireEvent, render, within } from "@testing-library/svelte";
import { userEvent } from "@testing-library/user-event";
import { createRawSnippet } from "svelte";
import Toggle from "../lib/_svseeds/_Toggle.svelte";
import { PARTS, STATE } from "../lib/_svseeds/core.ts";

type ToggleElement = HTMLButtonElement | undefined;
const ariaLabel = "toggle_label";
const mainid = "test-main";
const leftid = "test-left";
const rightid = "test-right";
const mainfn = createRawSnippet(
  (
    status: () => string,
    value: () => boolean,
    element: () => ToggleElement,
  ) => {
    return { render: () => `<span data-testid="${mainid}">${status()}-${value()}-${element()?.tagName}</span>` };
  },
);
const leftfn = createRawSnippet(
  (
    status: () => string,
    value: () => boolean,
    element: () => ToggleElement,
  ) => {
    return { render: () => `<span data-testid="${leftid}">${status()}-${value()}-${element()?.tagName}</span>` };
  },
);
const rightfn = createRawSnippet(
  (
    status: () => string,
    value: () => boolean,
    element: () => ToggleElement,
  ) => {
    return { render: () => `<span data-testid="${rightid}">${status()}-${value()}-${element()?.tagName}</span>` };
  },
);

describe("Switching existence of elements", () => {
  const actionfn = () => {
    return {};
  };

  test("no props", () => {
    const { getByRole } = render(Toggle);
    const main = getByRole("button") as HTMLButtonElement;
    expect(main.tagName).toBe("BUTTON");
    expect(main).toHaveAttribute("type", "button");
    expect(main).toHaveAttribute("aria-pressed", "false");
    expect(main).not.toHaveAttribute("aria-checked");
    expect(main).not.toHaveAttribute("role");
  });

  test("switch to switch type", () => {
    const props = { type: "switch" };
    const { getByRole } = render(Toggle, props);
    const main = getByRole("switch") as HTMLButtonElement;
    expect(main.tagName).toBe("BUTTON");
    expect(main).toHaveAttribute("type", "button");
    expect(main).toHaveAttribute("role", "switch");
    expect(main).toHaveAttribute("aria-checked", "false");
    expect(main).not.toHaveAttribute("aria-pressed");
    expect(main.style.position).toBe("relative");
  });

  test("w/ ariaLabel", () => {
    const props = { ariaLabel };
    const { getByRole } = render(Toggle, props);
    const main = getByRole("button") as HTMLButtonElement;
    expect(main).toHaveAttribute("aria-label", ariaLabel);
  });

  test("w/ main snippet", () => {
    const main = vi.fn().mockImplementation(mainfn);
    const props = { main };
    const { getByRole, getByTestId } = render(Toggle, props);
    const button = getByRole("button") as HTMLButtonElement;
    const mainsp = getByTestId(mainid);
    expect(button).toContainElement(mainsp);
    expect(main).toHaveBeenCalled();
  });

  test("w/ main snippet of action button", () => {
    const main = vi.fn().mockImplementation(mainfn);
    const action = vi.fn().mockImplementation(actionfn);
    const props = { main, action };
    const { getByRole, getByTestId } = render(Toggle, props);
    const button = getByRole("button") as HTMLButtonElement;
    const mainsp = getByTestId(mainid);
    expect(button).toContainElement(mainsp);
    expect(main).toHaveBeenCalled();
    expect(action).toHaveBeenCalled();
  });

  test("w/ main snippet of switch", () => {
    const main = vi.fn().mockImplementation(mainfn);
    const props = { main, type: "switch" };
    const { getByRole, getByTestId } = render(Toggle, props);
    const button = getByRole("switch") as HTMLButtonElement;
    const mainsp = getByTestId(mainid);
    const thumb = mainsp.parentElement;
    expect(button).toContainElement(thumb);
    expect(thumb).toContainElement(mainsp);
    expect(thumb?.style.position).toBe("absolute");
    expect(main).toHaveBeenCalled();
  });

  test("w/ main snippet of action switch", () => {
    const main = vi.fn().mockImplementation(mainfn);
    const action = vi.fn().mockImplementation(actionfn);
    const props = { main, type: "switch", action };
    const { getByRole, getByTestId } = render(Toggle, props);
    const button = getByRole("switch") as HTMLButtonElement;
    const mainsp = getByTestId(mainid);
    const thumb = mainsp.parentElement;
    expect(button).toContainElement(thumb);
    expect(thumb).toContainElement(mainsp);
    expect(thumb?.style.position).toBe("absolute");
    expect(main).toHaveBeenCalled();
    expect(action).toHaveBeenCalled();
  });

  test("w/ left snippet", () => {
    const left = vi.fn().mockImplementation(leftfn);
    const props = { left };
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
    const right = vi.fn().mockImplementation(rightfn);
    const props = { right };
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

  test("w/ left and right snippets", () => {
    const left = vi.fn().mockImplementation(leftfn);
    const right = vi.fn().mockImplementation(rightfn);
    const props = { left, right };
    const { getByRole, getByTestId } = render(Toggle, props);
    const whole = getByRole("group") as HTMLSpanElement;
    const button = getByRole("button") as HTMLButtonElement;
    const leftsp = getByTestId(leftid);
    const rightsp = getByTestId(rightid);
    expect(whole.tagName).toBe("SPAN");
    expect(whole).toContainElement(button);
    expect(whole).toContainElement(leftsp.parentElement);
    expect(whole).toContainElement(rightsp.parentElement);
    expect(whole.children).toHaveLength(3); // left side + button + right side
    expect(left).toHaveBeenCalled();
    expect(right).toHaveBeenCalled();
  });

  test("w/ left, right, and main snippets", () => {
    const main = vi.fn().mockImplementation(mainfn);
    const left = vi.fn().mockImplementation(leftfn);
    const right = vi.fn().mockImplementation(rightfn);
    const props = { main, left, right };
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
    expect(main).toHaveBeenCalled();
    expect(left).toHaveBeenCalled();
    expect(right).toHaveBeenCalled();
  });

  test("w/ all snippets of switch", () => {
    const main = vi.fn().mockImplementation(mainfn);
    const left = vi.fn().mockImplementation(leftfn);
    const right = vi.fn().mockImplementation(rightfn);
    const props = { main, left, right, type: "switch" };
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
    expect(main).toHaveBeenCalled();
    expect(left).toHaveBeenCalled();
    expect(right).toHaveBeenCalled();
  });
});

describe("Specify attrs & state transition & event handlers", () => {
  const preset = "svs-toggle";

  test("w/ default value true", () => {
    const props = { value: true };
    const { getByRole } = render(Toggle, props);
    const main = getByRole("button") as HTMLButtonElement;
    expect(main).toHaveAttribute("aria-pressed", "true");
  });

  test("w/ default value true of switch", () => {
    const props = { value: true, type: "switch" };
    const { getByRole } = render(Toggle, props);
    const main = getByRole("switch") as HTMLButtonElement;
    expect(main).toHaveAttribute("aria-checked", "true");
  });

  test("w/ specify id", () => {
    const id = "id_foo";
    const props = { attributes: { id } };
    const { getByRole } = render(Toggle, props);
    const main = getByRole("button") as HTMLButtonElement;
    expect(main).toHaveAttribute("id", id);
  });

  test("w/ specify ignored attrs", () => {
    const props = { attributes: { class: "c", type: "submit", role: "checkbox", "aria-checked": "mixed" } };
    const { getByRole } = render(Toggle, props);
    const main = getByRole("button") as HTMLButtonElement;
    expect(main).not.toHaveAttribute("class", "c");
    expect(main).not.toHaveAttribute("type", "submit");
    expect(main).not.toHaveAttribute("role", "checkbox");
    expect(main).not.toHaveAttribute("aria-checked", "mixed");
  });

  test("w/ specify major attrs", async () => {
    const props = { attributes: { name: "n", disabled: true, tabindex: -1 } };
    const { rerender, getByRole } = render(Toggle, props);
    let main = getByRole("button") as HTMLButtonElement;
    expect(main).toHaveAttribute("name", "n");
    expect(main).toHaveAttribute("disabled");
    expect(main).toHaveAttribute("tabindex", "-1");

    await rerender({ type: "switch", ...props });
    main = getByRole("switch") as HTMLButtonElement;
    expect(main).toHaveAttribute("name", "n");
    expect(main).toHaveAttribute("disabled");
    expect(main).toHaveAttribute("tabindex", "-1");
  });

  test("major state transition", async () => {
    const props = $state({
      value: false,
      status: STATE.NEUTRAL,
    });
    const user = userEvent.setup();
    const { getByRole } = render(Toggle, props);
    const main = getByRole("button") as HTMLButtonElement;
    expect(props.value).toBe(false);
    expect(props.status).toBe(STATE.NEUTRAL);
    expect(main).toHaveAttribute("aria-pressed", "false");

    await user.click(main);
    expect(props.value).toBe(true);
    expect(props.status).toBe(STATE.ACTIVE);
    expect(main).toHaveAttribute("aria-pressed", "true");

    await user.click(main);
    expect(props.value).toBe(false);
    expect(props.status).toBe(STATE.NEUTRAL);
    expect(main).toHaveAttribute("aria-pressed", "false");
  });

  test("state transition of switch", async () => {
    const props = $state({
      value: false,
      status: STATE.NEUTRAL,
      type: "switch",
    });
    const user = userEvent.setup();
    const { getByRole } = render(Toggle, props);
    const main = getByRole("switch") as HTMLButtonElement;
    expect(props.value).toBe(false);
    expect(props.status).toBe(STATE.NEUTRAL);
    expect(main).toHaveAttribute("aria-checked", "false");

    await user.click(main);
    expect(props.value).toBe(true);
    expect(props.status).toBe(STATE.ACTIVE);
    expect(main).toHaveAttribute("aria-checked", "true");

    await user.click(main);
    expect(props.value).toBe(false);
    expect(props.status).toBe(STATE.NEUTRAL);
    expect(main).toHaveAttribute("aria-checked", "false");
  });

  test("state transition with custom neutral status", async () => {
    const customNeutral = "custom_neutral";
    const props = $state({
      value: false,
      status: customNeutral,
    });
    const user = userEvent.setup();
    const { getByRole } = render(Toggle, props);
    const main = getByRole("button") as HTMLButtonElement;
    expect(props.value).toBe(false);
    expect(props.status).toBe(customNeutral);

    await user.click(main);
    expect(props.value).toBe(true);
    expect(props.status).toBe(STATE.ACTIVE);

    await user.click(main);
    expect(props.value).toBe(false);
    expect(props.status).toBe(customNeutral); // returns to custom neutral, not default neutral
  });

  test("w/ custom onclick", async () => {
    const onclick = vi.fn();
    const props = $state({
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

  test("programmatic value change updates status", async () => {
    const props = $state({
      value: false,
      status: STATE.NEUTRAL,
    });
    const { rerender } = render(Toggle, props);
    expect(props.status).toBe(STATE.NEUTRAL);

    props.value = true;
    await rerender(props);
    expect(props.status).toBe(STATE.ACTIVE);

    props.value = false;
    await rerender(props);
    expect(props.status).toBe(STATE.NEUTRAL);
  });

  test("default class of each status", async () => {
    const main = vi.fn().mockImplementation(mainfn);
    const left = vi.fn().mockImplementation(leftfn);
    const right = vi.fn().mockImplementation(rightfn);
    const props = $state({
      main,
      left,
      right,
      value: false,
      status: STATE.NEUTRAL,
    });
    const user = userEvent.setup();
    const { getByRole, getByTestId } = render(Toggle, props);
    const whole = getByRole("group") as HTMLSpanElement;
    const button = getByRole("button") as HTMLButtonElement;
    const mainsp = getByTestId(mainid);
    const leftdv = getByTestId(leftid).parentElement;
    const rightdv = getByTestId(rightid).parentElement;

    expect(props.status).toBe(STATE.NEUTRAL);
    expect(whole).toHaveClass(preset, PARTS.WHOLE);
    expect(leftdv).toHaveClass(preset, PARTS.LEFT);
    expect(button).toHaveClass(preset, PARTS.MAIN);
    expect(rightdv).toHaveClass(preset, PARTS.RIGHT);

    await user.click(button);
    expect(props.status).toBe(STATE.ACTIVE);
    expect(whole).toHaveClass(preset, PARTS.WHOLE, STATE.ACTIVE);
    expect(leftdv).toHaveClass(preset, PARTS.LEFT, STATE.ACTIVE);
    expect(button).toHaveClass(preset, PARTS.MAIN, STATE.ACTIVE);
    expect(rightdv).toHaveClass(preset, PARTS.RIGHT, STATE.ACTIVE);
  });

  test("default class of switch with thumb", async () => {
    const main = vi.fn().mockImplementation(mainfn);
    const props = $state({
      main,
      type: "switch",
      value: false,
      status: STATE.NEUTRAL,
    });
    const user = userEvent.setup();
    const { getByRole, getByTestId } = render(Toggle, props);
    const button = getByRole("switch") as HTMLButtonElement;
    const mainsp = getByTestId(mainid);
    const thumb = mainsp.parentElement;

    expect(props.status).toBe(STATE.NEUTRAL);
    expect(button).toHaveClass(preset, PARTS.MAIN);
    expect(thumb).toHaveClass(preset, PARTS.AUX);

    await user.click(button);
    expect(props.status).toBe(STATE.ACTIVE);
    expect(button).toHaveClass(preset, PARTS.MAIN, STATE.ACTIVE);
    expect(thumb).toHaveClass(preset, PARTS.AUX, STATE.ACTIVE);
  });

  test("w/ string style class of each status", async () => {
    const clsid = "style_id";
    const main = vi.fn().mockImplementation(mainfn);
    const left = vi.fn().mockImplementation(leftfn);
    const right = vi.fn().mockImplementation(rightfn);
    const props = $state({
      main,
      left,
      right,
      value: false,
      status: STATE.NEUTRAL,
      style: clsid,
    });
    const user = userEvent.setup();
    const { getByRole, getByTestId } = render(Toggle, props);
    const whole = getByRole("group") as HTMLSpanElement;
    const button = getByRole("button") as HTMLButtonElement;
    const leftdv = getByTestId(leftid).parentElement;
    const rightdv = getByTestId(rightid).parentElement;

    expect(props.status).toBe(STATE.NEUTRAL);
    expect(whole).toHaveClass(clsid, PARTS.WHOLE);
    expect(leftdv).toHaveClass(clsid, PARTS.LEFT);
    expect(button).toHaveClass(clsid, PARTS.MAIN);
    expect(rightdv).toHaveClass(clsid, PARTS.RIGHT);

    await user.click(button);
    expect(props.status).toBe(STATE.ACTIVE);
    expect(whole).toHaveClass(clsid, PARTS.WHOLE, STATE.ACTIVE);
    expect(leftdv).toHaveClass(clsid, PARTS.LEFT, STATE.ACTIVE);
    expect(button).toHaveClass(clsid, PARTS.MAIN, STATE.ACTIVE);
    expect(rightdv).toHaveClass(clsid, PARTS.RIGHT, STATE.ACTIVE);
  });

  test("w/ obj style of each status", async () => {
    const dynObj = {
      base: "base",
      neutral: "dyn_neutral",
      active: "dyn_active",
      inactive: "dyn_inactive",
    };
    const style = {
      whole: dynObj,
      main: dynObj,
      left: dynObj,
      right: dynObj,
      aux: dynObj,
    };
    const main = vi.fn().mockImplementation(mainfn);
    const left = vi.fn().mockImplementation(leftfn);
    const right = vi.fn().mockImplementation(rightfn);
    const props = $state({
      main,
      left,
      right,
      type: "switch",
      value: false,
      status: STATE.NEUTRAL,
      style,
    });
    const user = userEvent.setup();
    const { getByRole, getByTestId } = render(Toggle, props);
    const whole = getByRole("group") as HTMLSpanElement;
    const button = getByRole("switch") as HTMLButtonElement;
    const mainsp = getByTestId(mainid);
    const leftdv = getByTestId(leftid).parentElement;
    const rightdv = getByTestId(rightid).parentElement;
    const thumb = mainsp.parentElement;

    expect(props.status).toBe(STATE.NEUTRAL);
    expect(whole).toHaveClass(dynObj.base, dynObj.neutral);
    expect(leftdv).toHaveClass(dynObj.base, dynObj.neutral);
    expect(button).toHaveClass(dynObj.base, dynObj.neutral);
    expect(rightdv).toHaveClass(dynObj.base, dynObj.neutral);
    expect(thumb).toHaveClass(dynObj.base, dynObj.neutral);

    await user.click(button);
    expect(props.status).toBe(STATE.ACTIVE);
    expect(whole).toHaveClass(dynObj.base, dynObj.active);
    expect(leftdv).toHaveClass(dynObj.base, dynObj.active);
    expect(button).toHaveClass(dynObj.base, dynObj.active);
    expect(rightdv).toHaveClass(dynObj.base, dynObj.active);
    expect(thumb).toHaveClass(dynObj.base, dynObj.active);
  });
});
