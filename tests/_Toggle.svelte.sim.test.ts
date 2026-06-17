import { describe, expect, test, vi } from "vitest";
import { render } from "@testing-library/svelte";
import { userEvent } from "@testing-library/user-event";
import { createRawSnippet, tick } from "svelte";
import Toggle from "#svs/_Toggle.svelte";
import { PARTS, VARIANT } from "#svs/core";

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
    const text = () => `${variant()}-${value()}-${element()?.tagName}`;
    return {
      render: () => `<span data-testid="${mainid}">${text()}</span>`,
      setup: (node: Element) => {
        $effect(() => {
          node.textContent = text();
        });
      },
    };
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
  const attachfn = () => {};

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

  test("no group wrapper without side snippets", () => {
    const children = vi.fn().mockImplementation(mainfn);
    const props = { children };
    const { queryByRole } = render(Toggle, props);
    expect(queryByRole("group")).toBeNull();
  });

  test("children is optional", () => {
    const { getByRole, queryByTestId } = render(Toggle, { ariaLabel });
    expect(getByRole("button")).toBeInTheDocument();
    expect(queryByTestId(mainid)).toBeNull();
  });

  test("switch to switch type", () => {
    const children = vi.fn().mockImplementation(mainfn);
    const props = { children, role: "switch" as const };
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

  test("element is passed to the main snippet", async () => {
    const children = vi.fn().mockImplementation(mainfn);
    const props = { children };
    const { getByTestId } = render(Toggle, props);
    await tick();
    expect(getByTestId(mainid).textContent).toContain("BUTTON");
  });

  test("w/ main snippet of attach button", () => {
    const children = vi.fn().mockImplementation(mainfn);
    const attach = vi.fn().mockImplementation(attachfn);
    const props = { children, attach };
    const { getByRole, getByTestId } = render(Toggle, props);
    const button = getByRole("button") as HTMLButtonElement;
    const mainsp = getByTestId(mainid);
    expect(button).toContainElement(mainsp);
    expect(children).toHaveBeenCalled();
    expect(attach).toHaveBeenCalled();
    expect(attach.mock.calls[0][0]).toBe(button);
  });

  test("w/ main snippet of switch", () => {
    const children = vi.fn().mockImplementation(mainfn);
    const props = { children, role: "switch" as const };
    const { getByRole, getByTestId } = render(Toggle, props);
    const button = getByRole("switch") as HTMLButtonElement;
    const mainsp = getByTestId(mainid);
    expect(button).toContainElement(mainsp);
    expect(children).toHaveBeenCalled();
  });

  test("w/ children snippet of attach switch", () => {
    const children = vi.fn().mockImplementation(mainfn);
    const attach = vi.fn().mockImplementation(attachfn);
    const props = { children, role: "switch" as const, attach };
    const { getByRole, getByTestId } = render(Toggle, props);
    const button = getByRole("switch") as HTMLButtonElement;
    const mainsp = getByTestId(mainid);
    expect(button).toContainElement(mainsp);
    expect(children).toHaveBeenCalled();
    expect(attach).toHaveBeenCalled();
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
    const props = { children, left, right, role: "switch" as const };
    const { getByRole, getByTestId } = render(Toggle, props);
    const whole = getByRole("group") as HTMLSpanElement;
    const button = getByRole("switch") as HTMLButtonElement;
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
    const props = { children, value: true, role: "switch" as const };
    const { getByRole } = render(Toggle, props);
    const main = getByRole("switch") as HTMLButtonElement;
    expect(main).toHaveAttribute("aria-checked", "true");
  });

  test("w/ specify id", () => {
    const children = vi.fn().mockImplementation(mainfn);
    const id = "id_foo";
    const props = { children, id };
    const { getByRole } = render(Toggle, props);
    const main = getByRole("button") as HTMLButtonElement;
    expect(main).toHaveAttribute("id", id);
  });

  test("w/ class merged & type protected", () => {
    const children = vi.fn().mockImplementation(mainfn);
    const props = { children, class: "c", type: "submit" } as any;
    const { getByRole } = render(Toggle, props);
    const main = getByRole("button") as HTMLButtonElement;
    expect(main).toHaveClass("c"); // class is merged onto root
    expect(main).toHaveAttribute("type", "button"); // forced to "button", not from rest
    expect(main).not.toHaveAttribute("aria-checked"); // controlled by state (button role)
  });

  test("w/ specify major attrs", async () => {
    const children = vi.fn().mockImplementation(mainfn);
    const props = { children, name: "n", disabled: true, tabindex: -1 };
    const { rerender, getByRole } = render(Toggle, props);
    let main = getByRole("button") as HTMLButtonElement;
    expect(main).toHaveAttribute("name", "n");
    expect(main).toHaveAttribute("disabled");
    expect(main).toHaveAttribute("tabindex", "-1");

    await rerender({ role: "switch" as const, ...props });
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
      role: "switch" as const,
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

  test("dynamic custom neutral variant is remembered", async () => {
    const children = vi.fn().mockImplementation(mainfn);
    const props = $state({
      children,
      value: false,
      variant: "neutral_a",
    });
    const user = userEvent.setup();
    const { getByRole } = render(Toggle, props);
    const main = getByRole("button") as HTMLButtonElement;
    expect(props.variant).toBe("neutral_a");

    props.variant = "neutral_b";
    await tick();
    await user.click(main);
    expect(props.variant).toBe(VARIANT.ACTIVE);

    await user.click(main);
    expect(props.variant).toBe("neutral_b");
  });

  test("w/ custom onclick", async () => {
    const children = vi.fn().mockImplementation(mainfn);
    const onclick = vi.fn();
    const props = $state({
      children,
      value: false,
      onclick,
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

  test("keyboard activation toggles state", async () => {
    const children = vi.fn().mockImplementation(mainfn);
    const props = $state({
      children,
      value: false,
      variant: VARIANT.NEUTRAL,
    });
    const user = userEvent.setup();
    const { getByRole } = render(Toggle, props);
    const main = getByRole("button") as HTMLButtonElement;

    main.focus();
    await user.keyboard("{Enter}");
    expect(props.value).toBe(true);
    expect(main).toHaveAttribute("aria-pressed", "true");
    expect(props.variant).toBe(VARIANT.ACTIVE);

    await user.keyboard("[Space]");
    expect(props.value).toBe(false);
    expect(main).toHaveAttribute("aria-pressed", "false");
    expect(props.variant).toBe(VARIANT.NEUTRAL);
  });

  test("disabled prevents toggle and onclick", async () => {
    const children = vi.fn().mockImplementation(mainfn);
    const onclick = vi.fn();
    const props = $state({
      children,
      value: false,
      disabled: true,
      onclick,
    });
    const user = userEvent.setup();
    const { getByRole } = render(Toggle, props);
    const main = getByRole("button") as HTMLButtonElement;

    await user.click(main);
    expect(props.value).toBe(false);
    expect(onclick).not.toHaveBeenCalled();
  });

  test("onclick receives native event currentTarget", async () => {
    const children = vi.fn().mockImplementation(mainfn);
    let captured: EventTarget | null = null;
    const onclick = vi.fn((e: MouseEvent) => {
      captured = e.currentTarget;
    });
    const props = $state({
      children,
      value: false,
      onclick,
    });
    const user = userEvent.setup();
    const { getByRole } = render(Toggle, props);
    const main = getByRole("button") as HTMLButtonElement;

    await user.click(main);
    expect(onclick).toHaveBeenCalledTimes(1);
    expect(captured).toBe(main);
  });

  test("programmatic value change updates variant", async () => {
    const children = vi.fn().mockImplementation(mainfn);
    const props = $state({
      children,
      value: false,
      variant: VARIANT.NEUTRAL,
    });
    render(Toggle, props);
    expect(props.variant).toBe(VARIANT.NEUTRAL);

    props.value = true;
    await tick();
    expect(props.variant).toBe(VARIANT.ACTIVE);

    props.value = false;
    await tick();
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
    getByTestId(mainid);
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

  test("default class of switch (main only)", async () => {
    const children = vi.fn().mockImplementation(mainfn);
    const props = $state({
      children,
      role: "switch" as const,
      value: false,
      variant: VARIANT.NEUTRAL,
    });
    const user = userEvent.setup();
    const { getByRole } = render(Toggle, props);
    const button = getByRole("switch") as HTMLButtonElement;

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
    };
    const children = vi.fn().mockImplementation(mainfn);
    const left = vi.fn().mockImplementation(leftfn);
    const right = vi.fn().mockImplementation(rightfn);
    const props = $state({
      children,
      left,
      right,
      role: "switch" as const,
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

    expect(props.variant).toBe(VARIANT.NEUTRAL);
    expect(whole).toHaveClass(dynObj.base, dynObj.neutral);
    expect(leftdv).toHaveClass(dynObj.base, dynObj.neutral);
    expect(button).toHaveClass(dynObj.base, dynObj.neutral);
    expect(rightdv).toHaveClass(dynObj.base, dynObj.neutral);
    expect(button).toContainElement(mainsp);

    await user.click(button);
    expect(props.variant).toBe(VARIANT.ACTIVE);
    expect(whole).toHaveClass(dynObj.base, dynObj.active);
    expect(leftdv).toHaveClass(dynObj.base, dynObj.active);
    expect(button).toHaveClass(dynObj.base, dynObj.active);
    expect(rightdv).toHaveClass(dynObj.base, dynObj.active);
  });
});
