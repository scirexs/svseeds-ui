import axe from "axe-core";
import { describe, expect, test, vi } from "vitest";
import { render } from "vitest-browser-svelte";
import { userEvent } from "vitest/browser";
import { createRawSnippet, tick } from "svelte";
import Toggle from "#svs/Toggle.svelte";
import { PARTS, VARIANT } from "#svs/core";
import type { AxeMatchers } from "vitest-axe/matchers";

declare module "vitest" {
  interface Assertion<T = any> extends AxeMatchers {}
}

type ToggleElement = HTMLButtonElement | undefined;
const ariaLabel = "toggle_label";
const mainid = "test-main";
const leftid = "test-left";
const rightid = "test-right";
const mainfn = createRawSnippet((variant: () => string, value: () => boolean, element: () => ToggleElement) => {
  const text = () => `${variant()}-${value()}-${element()?.tagName}`;
  return {
    render: () => `<span data-testid="${mainid}">${text()}</span>`,
    setup: (node: Element) => {
      $effect(() => {
        node.textContent = text();
      });
    },
  };
});
const leftfn = createRawSnippet((variant: () => string, value: () => boolean, element: () => ToggleElement) => {
  return { render: () => `<span data-testid="${leftid}">${variant()}-${value()}-${element()?.tagName}</span>` };
});
const rightfn = createRawSnippet((variant: () => string, value: () => boolean, element: () => ToggleElement) => {
  return { render: () => `<span data-testid="${rightid}">${variant()}-${value()}-${element()?.tagName}</span>` };
});

describe("Switching existence of elements", () => {
  const attachfn = () => {};

  test("no props", async () => {
    const children = vi.fn().mockImplementation(mainfn);
    const props = { children };
    const { container } = render(Toggle, props);
    const main = container.querySelector("button")! as HTMLButtonElement;
    expect(main.tagName).toBe("BUTTON");
    await expect.element(main).toHaveAttribute("type", "button");
    await expect.element(main).toHaveAttribute("aria-pressed", "false");
    await expect.element(main).not.toHaveAttribute("aria-checked");
    await expect.element(main).not.toHaveAttribute("role");
  });

  test("no group wrapper without side snippets", async () => {
    const children = vi.fn().mockImplementation(mainfn);
    const props = { children };
    const { container } = render(Toggle, props);
    expect(container.querySelector('[role="group"]')).toBeNull();
  });

  test("children is optional", async () => {
    const { container } = render(Toggle, { ariaLabel });
    expect(container.contains(container.querySelector("button")!)).toBe(true);
    expect(container.querySelector(`[data-testid="${mainid}"]`)).toBeNull();
  });

  test("switch to switch type", async () => {
    const children = vi.fn().mockImplementation(mainfn);
    const props = { children, role: "switch" as const };
    const { container } = render(Toggle, props);
    const main = container.querySelector('[role="switch"]')! as HTMLButtonElement;
    expect(main.tagName).toBe("BUTTON");
    await expect.element(main).toHaveAttribute("type", "button");
    await expect.element(main).toHaveAttribute("role", "switch");
    await expect.element(main).toHaveAttribute("aria-checked", "false");
    await expect.element(main).not.toHaveAttribute("aria-pressed");
  });

  test("w/ ariaLabel", async () => {
    const children = vi.fn().mockImplementation(mainfn);
    const props = { children, ariaLabel };
    const { container } = render(Toggle, props);
    const main = container.querySelector("button")! as HTMLButtonElement;
    await expect.element(main).toHaveAttribute("aria-label", ariaLabel);
  });

  test("w/ main snippet", async () => {
    const children = vi.fn().mockImplementation(mainfn);
    const props = { children };
    const { container } = render(Toggle, props);
    const button = container.querySelector("button")! as HTMLButtonElement;
    const mainsp = container.querySelector(`[data-testid="${mainid}"]`)!;
    expect(button.contains(mainsp)).toBe(true);
    expect(children).toHaveBeenCalled();
  });

  test("element is passed to the main snippet", async () => {
    const children = vi.fn().mockImplementation(mainfn);
    const props = { children };
    const { container } = render(Toggle, props);
    await tick();
    expect(container.querySelector(`[data-testid="${mainid}"]`)!.textContent).toContain("BUTTON");
  });

  test("w/ main snippet of attach button", async () => {
    const children = vi.fn().mockImplementation(mainfn);
    const attach = vi.fn().mockImplementation(attachfn);
    const props = { children, attach };
    const { container } = render(Toggle, props);
    const button = container.querySelector("button")! as HTMLButtonElement;
    const mainsp = container.querySelector(`[data-testid="${mainid}"]`)!;
    expect(button.contains(mainsp)).toBe(true);
    expect(children).toHaveBeenCalled();
    expect(attach).toHaveBeenCalled();
    expect(attach.mock.calls[0][0]).toBe(button);
  });

  test("w/ main snippet of switch", async () => {
    const children = vi.fn().mockImplementation(mainfn);
    const props = { children, role: "switch" as const };
    const { container } = render(Toggle, props);
    const button = container.querySelector('[role="switch"]')! as HTMLButtonElement;
    const mainsp = container.querySelector(`[data-testid="${mainid}"]`)!;
    expect(button.contains(mainsp)).toBe(true);
    expect(children).toHaveBeenCalled();
  });

  test("w/ children snippet of attach switch", async () => {
    const children = vi.fn().mockImplementation(mainfn);
    const attach = vi.fn().mockImplementation(attachfn);
    const props = { children, role: "switch" as const, attach };
    const { container } = render(Toggle, props);
    const button = container.querySelector('[role="switch"]')! as HTMLButtonElement;
    const mainsp = container.querySelector(`[data-testid="${mainid}"]`)!;
    expect(button.contains(mainsp)).toBe(true);
    expect(children).toHaveBeenCalled();
    expect(attach).toHaveBeenCalled();
  });

  test("w/ left snippet", async () => {
    const children = vi.fn().mockImplementation(mainfn);
    const left = vi.fn().mockImplementation(leftfn);
    const props = { children, left };
    const { container } = render(Toggle, props);
    const whole = container.querySelector('[role="group"]')! as HTMLSpanElement;
    const button = container.querySelector("button")! as HTMLButtonElement;
    const leftsp = container.querySelector(`[data-testid="${leftid}"]`)!;
    expect(whole.tagName).toBe("SPAN");
    expect(whole.contains(button)).toBe(true);
    expect(whole.contains(leftsp.parentElement)).toBe(true);
    expect(whole.children).toHaveLength(2); // left side + button
    expect(left).toHaveBeenCalled();
  });

  test("w/ right snippet", async () => {
    const children = vi.fn().mockImplementation(mainfn);
    const right = vi.fn().mockImplementation(rightfn);
    const props = { children, right };
    const { container } = render(Toggle, props);
    const whole = container.querySelector('[role="group"]')! as HTMLSpanElement;
    const button = container.querySelector("button")! as HTMLButtonElement;
    const rightsp = container.querySelector(`[data-testid="${rightid}"]`)!;
    expect(whole.tagName).toBe("SPAN");
    expect(whole.contains(button)).toBe(true);
    expect(whole.contains(rightsp.parentElement)).toBe(true);
    expect(whole.children).toHaveLength(2); // button + right side
    expect(right).toHaveBeenCalled();
  });

  test("w/ left, right, and main snippets", async () => {
    const children = vi.fn().mockImplementation(mainfn);
    const left = vi.fn().mockImplementation(leftfn);
    const right = vi.fn().mockImplementation(rightfn);
    const props = { children, left, right };
    const { container } = render(Toggle, props);
    const whole = container.querySelector('[role="group"]')! as HTMLSpanElement;
    const button = container.querySelector("button")! as HTMLButtonElement;
    const mainsp = container.querySelector(`[data-testid="${mainid}"]`)!;
    const leftsp = container.querySelector(`[data-testid="${leftid}"]`)!;
    const rightsp = container.querySelector(`[data-testid="${rightid}"]`)!;
    expect(whole.contains(button)).toBe(true);
    expect(button.contains(mainsp)).toBe(true);
    expect(whole.contains(leftsp.parentElement)).toBe(true);
    expect(whole.contains(rightsp.parentElement)).toBe(true);
    expect(whole.children).toHaveLength(3);
    expect(children).toHaveBeenCalled();
    expect(left).toHaveBeenCalled();
    expect(right).toHaveBeenCalled();
  });

  test("w/ all snippets of switch", async () => {
    const children = vi.fn().mockImplementation(mainfn);
    const left = vi.fn().mockImplementation(leftfn);
    const right = vi.fn().mockImplementation(rightfn);
    const props = { children, left, right, role: "switch" as const };
    const { container } = render(Toggle, props);
    const whole = container.querySelector('[role="group"]')! as HTMLSpanElement;
    const button = container.querySelector('[role="switch"]')! as HTMLButtonElement;
    const mainsp = container.querySelector(`[data-testid="${mainid}"]`)!;
    const leftsp = container.querySelector(`[data-testid="${leftid}"]`)!;
    const rightsp = container.querySelector(`[data-testid="${rightid}"]`)!;
    expect(whole.contains(button)).toBe(true);
    expect(button.contains(mainsp)).toBe(true);
    expect(whole.contains(leftsp.parentElement)).toBe(true);
    expect(whole.contains(rightsp.parentElement)).toBe(true);
    expect(whole.children).toHaveLength(3);
    expect(children).toHaveBeenCalled();
    expect(left).toHaveBeenCalled();
    expect(right).toHaveBeenCalled();
  });
});

describe("Specify attrs & state transition & event handlers", () => {
  const preset = "svs-toggle";

  test("w/ default value true", async () => {
    const children = vi.fn().mockImplementation(mainfn);
    const props = { children, value: true };
    const { container } = render(Toggle, props);
    const main = container.querySelector("button")! as HTMLButtonElement;
    await expect.element(main).toHaveAttribute("aria-pressed", "true");
  });

  test("w/ default value true of switch", async () => {
    const children = vi.fn().mockImplementation(mainfn);
    const props = { children, value: true, role: "switch" as const };
    const { container } = render(Toggle, props);
    const main = container.querySelector('[role="switch"]')! as HTMLButtonElement;
    await expect.element(main).toHaveAttribute("aria-checked", "true");
  });

  test("w/ specify id", async () => {
    const children = vi.fn().mockImplementation(mainfn);
    const id = "id_foo";
    const props = { children, id };
    const { container } = render(Toggle, props);
    const main = container.querySelector("button")! as HTMLButtonElement;
    await expect.element(main).toHaveAttribute("id", id);
  });

  test("w/ class merged & type protected", async () => {
    const children = vi.fn().mockImplementation(mainfn);
    const props = { children, class: "c", type: "submit" } as any;
    const { container } = render(Toggle, props);
    const main = container.querySelector("button")! as HTMLButtonElement;
    await expect.element(main).toHaveClass("c"); // class is merged onto root
    await expect.element(main).toHaveAttribute("type", "button"); // forced to "button", not from rest
    await expect.element(main).not.toHaveAttribute("aria-checked"); // controlled by state (button role)
  });

  test("w/ specify major attrs", async () => {
    const children = vi.fn().mockImplementation(mainfn);
    const props = { children, name: "n", disabled: true, tabindex: -1 };
    const { container, rerender } = render(Toggle, props);
    let main = container.querySelector("button")! as HTMLButtonElement;
    await expect.element(main).toHaveAttribute("name", "n");
    await expect.element(main).toHaveAttribute("disabled");
    await expect.element(main).toHaveAttribute("tabindex", "-1");

    await rerender({ role: "switch" as const, ...props });
    main = container.querySelector('[role="switch"]')! as HTMLButtonElement;
    await expect.element(main).toHaveAttribute("name", "n");
    await expect.element(main).toHaveAttribute("disabled");
    await expect.element(main).toHaveAttribute("tabindex", "-1");
  });

  test("major state transition", async () => {
    const children = vi.fn().mockImplementation(mainfn);
    const props = $state({
      children,
      value: false,
      variant: VARIANT.NEUTRAL,
    });
    const { container } = render(Toggle, props);
    const main = container.querySelector("button")! as HTMLButtonElement;
    expect(props.value).toBe(false);
    expect(props.variant).toBe(VARIANT.NEUTRAL);
    await expect.element(main).toHaveAttribute("aria-pressed", "false");

    await userEvent.click(main);
    expect(props.value).toBe(true);
    expect(props.variant).toBe(VARIANT.ACTIVE);
    await expect.element(main).toHaveAttribute("aria-pressed", "true");

    await userEvent.click(main);
    expect(props.value).toBe(false);
    expect(props.variant).toBe(VARIANT.NEUTRAL);
    await expect.element(main).toHaveAttribute("aria-pressed", "false");
  });

  test("state transition of switch", async () => {
    const children = vi.fn().mockImplementation(mainfn);
    const props = $state({
      children,
      value: false,
      variant: VARIANT.NEUTRAL,
      role: "switch" as const,
    });
    const { container } = render(Toggle, props);
    const main = container.querySelector('[role="switch"]')! as HTMLButtonElement;
    expect(props.value).toBe(false);
    expect(props.variant).toBe(VARIANT.NEUTRAL);
    await expect.element(main).toHaveAttribute("aria-checked", "false");

    await userEvent.click(main);
    expect(props.value).toBe(true);
    expect(props.variant).toBe(VARIANT.ACTIVE);
    await expect.element(main).toHaveAttribute("aria-checked", "true");

    await userEvent.click(main);
    expect(props.value).toBe(false);
    expect(props.variant).toBe(VARIANT.NEUTRAL);
    await expect.element(main).toHaveAttribute("aria-checked", "false");
  });

  test("state transition with custom neutral variant", async () => {
    const children = vi.fn().mockImplementation(mainfn);
    const customNeutral = "custom_neutral";
    const props = $state({
      children,
      value: false,
      variant: customNeutral,
    });
    const { container } = render(Toggle, props);
    const main = container.querySelector("button")! as HTMLButtonElement;
    expect(props.value).toBe(false);
    expect(props.variant).toBe(customNeutral);

    await userEvent.click(main);
    expect(props.value).toBe(true);
    expect(props.variant).toBe(VARIANT.ACTIVE);

    await userEvent.click(main);
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
    const { container } = render(Toggle, props);
    const main = container.querySelector("button")! as HTMLButtonElement;
    expect(props.variant).toBe("neutral_a");

    props.variant = "neutral_b";
    await tick();
    await userEvent.click(main);
    expect(props.variant).toBe(VARIANT.ACTIVE);

    await userEvent.click(main);
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
    const { container } = render(Toggle, props);
    const main = container.querySelector("button")! as HTMLButtonElement;

    await userEvent.click(main);
    expect(onclick).toHaveBeenCalledTimes(1);
    expect(props.value).toBe(true);

    await userEvent.click(main);
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
    const { container } = render(Toggle, props);
    const main = container.querySelector("button")! as HTMLButtonElement;

    main.focus();
    await userEvent.keyboard("{Enter}");
    expect(props.value).toBe(true);
    await expect.element(main).toHaveAttribute("aria-pressed", "true");
    expect(props.variant).toBe(VARIANT.ACTIVE);

    await userEvent.keyboard("[Space]");
    expect(props.value).toBe(false);
    await expect.element(main).toHaveAttribute("aria-pressed", "false");
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
    const { container } = render(Toggle, props);
    const main = container.querySelector("button")! as HTMLButtonElement;

    main.click();
    await tick();
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
    const { container } = render(Toggle, props);
    const main = container.querySelector("button")! as HTMLButtonElement;

    await userEvent.click(main);
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
    const { container } = render(Toggle, props);
    const whole = container.querySelector('[role="group"]')! as HTMLSpanElement;
    const button = container.querySelector("button")! as HTMLButtonElement;
    container.querySelector(`[data-testid="${mainid}"]`)!;
    const leftdv = container.querySelector(`[data-testid="${leftid}"]`)!.parentElement;
    const rightdv = container.querySelector(`[data-testid="${rightid}"]`)!.parentElement;

    expect(props.variant).toBe(VARIANT.NEUTRAL);
    await expect.element(whole).toHaveClass(preset, PARTS.WHOLE);
    await expect.element(leftdv).toHaveClass(preset, PARTS.LEFT);
    await expect.element(button).toHaveClass(preset, PARTS.MAIN);
    await expect.element(rightdv).toHaveClass(preset, PARTS.RIGHT);

    await userEvent.click(button);
    expect(props.variant).toBe(VARIANT.ACTIVE);
    await expect.element(whole).toHaveClass(preset, PARTS.WHOLE, VARIANT.ACTIVE);
    await expect.element(leftdv).toHaveClass(preset, PARTS.LEFT, VARIANT.ACTIVE);
    await expect.element(button).toHaveClass(preset, PARTS.MAIN, VARIANT.ACTIVE);
    await expect.element(rightdv).toHaveClass(preset, PARTS.RIGHT, VARIANT.ACTIVE);
  });

  test("default class of switch (main only)", async () => {
    const children = vi.fn().mockImplementation(mainfn);
    const props = $state({
      children,
      role: "switch" as const,
      value: false,
      variant: VARIANT.NEUTRAL,
    });
    const { container } = render(Toggle, props);
    const button = container.querySelector('[role="switch"]')! as HTMLButtonElement;

    expect(props.variant).toBe(VARIANT.NEUTRAL);
    await expect.element(button).toHaveClass(preset, PARTS.MAIN);

    await userEvent.click(button);
    expect(props.variant).toBe(VARIANT.ACTIVE);
    await expect.element(button).toHaveClass(preset, PARTS.MAIN, VARIANT.ACTIVE);
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
    const { container } = render(Toggle, props);
    const whole = container.querySelector('[role="group"]')! as HTMLSpanElement;
    const button = container.querySelector("button")! as HTMLButtonElement;
    const leftdv = container.querySelector(`[data-testid="${leftid}"]`)!.parentElement;
    const rightdv = container.querySelector(`[data-testid="${rightid}"]`)!.parentElement;

    expect(props.variant).toBe(VARIANT.NEUTRAL);
    await expect.element(whole).toHaveClass(clsid, PARTS.WHOLE);
    await expect.element(leftdv).toHaveClass(clsid, PARTS.LEFT);
    await expect.element(button).toHaveClass(clsid, PARTS.MAIN);
    await expect.element(rightdv).toHaveClass(clsid, PARTS.RIGHT);

    await userEvent.click(button);
    expect(props.variant).toBe(VARIANT.ACTIVE);
    await expect.element(whole).toHaveClass(clsid, PARTS.WHOLE, VARIANT.ACTIVE);
    await expect.element(leftdv).toHaveClass(clsid, PARTS.LEFT, VARIANT.ACTIVE);
    await expect.element(button).toHaveClass(clsid, PARTS.MAIN, VARIANT.ACTIVE);
    await expect.element(rightdv).toHaveClass(clsid, PARTS.RIGHT, VARIANT.ACTIVE);
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
    const { container } = render(Toggle, props);
    const whole = container.querySelector('[role="group"]')! as HTMLSpanElement;
    const button = container.querySelector('[role="switch"]')! as HTMLButtonElement;
    const mainsp = container.querySelector(`[data-testid="${mainid}"]`)!;
    const leftdv = container.querySelector(`[data-testid="${leftid}"]`)!.parentElement;
    const rightdv = container.querySelector(`[data-testid="${rightid}"]`)!.parentElement;

    expect(props.variant).toBe(VARIANT.NEUTRAL);
    await expect.element(whole).toHaveClass(dynObj.base, dynObj.neutral);
    await expect.element(leftdv).toHaveClass(dynObj.base, dynObj.neutral);
    await expect.element(button).toHaveClass(dynObj.base, dynObj.neutral);
    await expect.element(rightdv).toHaveClass(dynObj.base, dynObj.neutral);
    expect(button.contains(mainsp)).toBe(true);

    await userEvent.click(button);
    expect(props.variant).toBe(VARIANT.ACTIVE);
    await expect.element(whole).toHaveClass(dynObj.base, dynObj.active);
    await expect.element(leftdv).toHaveClass(dynObj.base, dynObj.active);
    await expect.element(button).toHaveClass(dynObj.base, dynObj.active);
    await expect.element(rightdv).toHaveClass(dynObj.base, dynObj.active);
  });
});

describe("accessibility (axe)", () => {
  test("default render has no violations", async () => {
    const children = vi.fn().mockImplementation(mainfn);
    const { container } = render(Toggle, { children });

    expect(await axe.run(container)).toHaveNoViolations();
  });

  test("checked state has no violations", async () => {
    const children = vi.fn().mockImplementation(mainfn);
    const props = $state({ children, value: false, variant: VARIANT.NEUTRAL });
    const { container } = render(Toggle, props);
    const main = container.querySelector("button") as HTMLButtonElement;

    await userEvent.click(main);
    expect(props.value).toBe(true);
    await expect.element(main).toHaveAttribute("aria-pressed", "true");
    expect(await axe.run(container)).toHaveNoViolations();
  });
});
