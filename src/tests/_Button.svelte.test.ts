import { describe, expect, test, vi } from "vitest";
import { render } from "@testing-library/svelte";
import { userEvent } from "@testing-library/user-event";
import { createRawSnippet } from "svelte";
import Button from "../lib/_svseeds/_Button.svelte";
import { PARTS, VARIANT } from "../lib/_svseeds/core.ts";

const leftid = "test-left";
const rightid = "test-right";
const leftfn = createRawSnippet(
  (
    variant: () => string,
    element: () => HTMLButtonElement | undefined,
  ) => {
    return { render: () => `<span data-testid="${leftid}">${variant()},${element?.toString()}</span>` };
  },
);
const rightfn = createRawSnippet(
  (
    variant: () => string,
    element: () => HTMLButtonElement | undefined,
  ) => {
    return { render: () => `<span data-testid="${rightid}">${variant()},${element?.toString()}</span>` };
  },
);
const children = createRawSnippet(() => {
  return { render: () => "Button Text" };
});

describe("Switching existence of elements", () => {
  const actionfn = () => {
    return {};
  };

  test("minimal props", () => {
    const { getByRole } = render(Button, { children });
    const btn = getByRole("button") as HTMLButtonElement;
    expect(btn).toHaveTextContent("Button Text");
    expect(btn).toHaveAttribute("type", "button");
    expect(btn.children).toHaveLength(1);
    expect(btn.firstElementChild?.tagName).toBe("SPAN");
    expect(btn.firstElementChild?.children).toHaveLength(0);
    expect(btn.firstElementChild?.textContent).toBe("Button Text");
  });

  test("w/ submit type", () => {
    const props = { children, type: "submit" };
    const { getByRole } = render(Button, props);
    const btn = getByRole("button") as HTMLButtonElement;
    expect(btn).toHaveAttribute("type", "submit");
  });

  test("w/ reset type", () => {
    const props = { children, type: "reset" };
    const { getByRole } = render(Button, props);
    const btn = getByRole("button") as HTMLButtonElement;
    expect(btn).toHaveAttribute("type", "reset");
  });

  test("w/ left snippet", () => {
    const left = vi.fn().mockImplementation(leftfn);
    const props = { children, left };
    const { getByRole, getByTestId } = render(Button, props);
    const btn = getByRole("button") as HTMLButtonElement;
    const leftsp = getByTestId(leftid);
    expect(btn.children).toHaveLength(2);
    expect(btn.firstElementChild).toBe(leftsp.parentElement);
    expect(btn.lastElementChild?.textContent).toBe("Button Text");
    expect(left).toHaveBeenCalled();
  });

  test("w/ right snippet", () => {
    const right = vi.fn().mockImplementation(rightfn);
    const props = { children, right };
    const { getByRole, getByTestId } = render(Button, props);
    const btn = getByRole("button") as HTMLButtonElement;
    const rightsp = getByTestId(rightid);
    expect(btn.children).toHaveLength(2);
    expect(btn.lastElementChild).toBe(rightsp.parentElement);
    expect(btn.firstElementChild?.textContent).toBe("Button Text");
    expect(right).toHaveBeenCalled();
  });

  test("w/ left and right snippets", () => {
    const left = vi.fn().mockImplementation(leftfn);
    const right = vi.fn().mockImplementation(rightfn);
    const props = { children, left, right };
    const { getByRole, getByTestId } = render(Button, props);
    const btn = getByRole("button") as HTMLButtonElement;
    const leftsp = getByTestId(leftid);
    const rightsp = getByTestId(rightid);
    expect(btn.children).toHaveLength(3);
    expect(btn.firstElementChild).toBe(leftsp.parentElement);
    expect(btn.children[1]?.textContent).toBe("Button Text");
    expect(btn.lastElementChild).toBe(rightsp.parentElement);
    expect(left).toHaveBeenCalled();
    expect(right).toHaveBeenCalled();
  });

  test("w/ action", () => {
    const action = vi.fn().mockImplementation(actionfn);
    const props = { children, action };
    const { getByRole } = render(Button, props);
    const btn = getByRole("button") as HTMLButtonElement;
    expect(btn).toHaveTextContent("Button Text");
    expect(action).toHaveBeenCalled();
  });

  test("w/ action and snippets", () => {
    const action = vi.fn().mockImplementation(actionfn);
    const left = vi.fn().mockImplementation(leftfn);
    const right = vi.fn().mockImplementation(rightfn);
    const props = { children, left, right, action };
    const { getByRole, getByTestId } = render(Button, props);
    const btn = getByRole("button") as HTMLButtonElement;
    const leftsp = getByTestId(leftid);
    const rightsp = getByTestId(rightid);
    expect(btn.firstElementChild).toBe(leftsp.parentElement);
    expect(btn.children[1]?.textContent).toBe("Button Text");
    expect(btn.lastElementChild).toBe(rightsp.parentElement);
    expect(action).toHaveBeenCalled();
    expect(left).toHaveBeenCalled();
    expect(right).toHaveBeenCalled();
  });
  test("handles snippet errors gracefully", () => {
    const errorSnippet = createRawSnippet(() => {
      throw new Error("Snippet error");
    });

    expect(() => render(Button, { children: errorSnippet })).toThrow();
  });
});

describe("Specify attrs & form validation & event handlers", () => {
  const seed = "svs-button";

  test("w/ basic attributes", () => {
    const props = {
      children,
      attributes: {
        name: "test-button",
        value: "test-value",
        disabled: true,
        "aria-label": "Test Button",
      },
    };
    const { getByRole } = render(Button, props);
    const btn = getByRole("button") as HTMLButtonElement;
    expect(btn).toHaveAttribute("name", "test-button");
    expect(btn).toHaveAttribute("value", "test-value");
    expect(btn).toHaveAttribute("disabled");
    expect(btn).toHaveAttribute("aria-label", "Test Button");
  });

  test("w/ ignored attributes", () => {
    const mockClick = vi.fn();
    const props = {
      children,
      onclick: mockClick,
      attributes: {
        class: "ignored-class",
        type: "submit", // Should be ignored in favor of prop
        onclick: vi.fn(), // Should be ignored in favor of prop
      },
    };
    const { getByRole } = render(Button, props);
    const btn = getByRole("button") as HTMLButtonElement;
    expect(btn).not.toHaveAttribute("class", "ignored-class");
    expect(btn).toHaveAttribute("type", "button"); // Default type, not from attributes
  });

  test("form validation - valid form", async () => {
    const mockClick = vi.fn();
    const user = userEvent.setup();

    // Create a mock form that returns true for checkValidity
    const mockForm = { checkValidity: vi.fn().mockReturnValue(true) } as any;

    const props = $state({
      children,
      onclick: mockClick,
      form: mockForm,
    });

    const { getByRole } = render(Button, props);
    const btn = getByRole("button") as HTMLButtonElement;

    await user.click(btn);
    expect(mockForm.checkValidity).toHaveBeenCalled();
    expect(mockClick).toHaveBeenCalled();
  });

  test("form validation - invalid form", async () => {
    const mockClick = vi.fn();
    const user = userEvent.setup();

    // Create a mock form that returns false for checkValidity
    const mockForm = { checkValidity: vi.fn().mockReturnValue(false) } as any;

    const props = $state({
      children,
      onclick: mockClick,
      form: mockForm,
    });

    const { getByRole } = render(Button, props);
    const btn = getByRole("button") as HTMLButtonElement;

    await user.click(btn);
    expect(mockForm.checkValidity).toHaveBeenCalled();
    expect(mockClick).not.toHaveBeenCalled();
  });

  test("form validation - no form", async () => {
    const mockClick = vi.fn();
    const user = userEvent.setup();

    const props = { children, onclick: mockClick };
    const { getByRole } = render(Button, props);
    const btn = getByRole("button") as HTMLButtonElement;

    await user.click(btn);
    expect(mockClick).toHaveBeenCalled();
  });

  test("onclick from attributes when no onclick prop", async () => {
    const mockClick = vi.fn();
    const user = userEvent.setup();

    const props = {
      children,
      attributes: { onclick: mockClick },
    };
    const { getByRole } = render(Button, props);
    const btn = getByRole("button") as HTMLButtonElement;

    await user.click(btn);
    expect(mockClick).toHaveBeenCalled();
  });

  test("onclick prop takes precedence over attributes onclick", async () => {
    const mockClickProp = vi.fn();
    const mockClickAttr = vi.fn();
    const user = userEvent.setup();

    const props = {
      children,
      onclick: mockClickProp,
      attributes: { onclick: mockClickAttr },
    };
    const { getByRole } = render(Button, props);
    const btn = getByRole("button") as HTMLButtonElement;

    await user.click(btn);
    expect(mockClickProp).toHaveBeenCalled();
    expect(mockClickAttr).not.toHaveBeenCalled();
  });

  test("default class of neutral variant", () => {
    const props = {
      children,
      left: leftfn,
      right: rightfn,
      variant: VARIANT.NEUTRAL,
    };

    const { getByRole, getByTestId } = render(Button, props);
    const btn = getByRole("button") as HTMLButtonElement;
    const leftsp = getByTestId(leftid).parentElement;
    const mainsp = btn.children[1];
    const rightsp = getByTestId(rightid).parentElement;

    expect(props.variant).toBe(VARIANT.NEUTRAL);
    expect(btn).toHaveClass(seed, PARTS.WHOLE, VARIANT.NEUTRAL);
    expect(leftsp).toHaveClass(seed, PARTS.LEFT, VARIANT.NEUTRAL);
    expect(mainsp).toHaveClass(seed, PARTS.MAIN, VARIANT.NEUTRAL);
    expect(rightsp).toHaveClass(seed, PARTS.RIGHT, VARIANT.NEUTRAL);
  });

  test("default class of active variant", () => {
    const props = {
      children,
      left: leftfn,
      right: rightfn,
      variant: VARIANT.ACTIVE,
    };

    const { getByRole, getByTestId } = render(Button, props);
    const btn = getByRole("button") as HTMLButtonElement;
    const leftsp = getByTestId(leftid).parentElement;
    const mainsp = btn.children[1];
    const rightsp = getByTestId(rightid).parentElement;

    expect(btn).toHaveClass(seed, PARTS.WHOLE, VARIANT.ACTIVE);
    expect(leftsp).toHaveClass(seed, PARTS.LEFT, VARIANT.ACTIVE);
    expect(mainsp).toHaveClass(seed, PARTS.MAIN, VARIANT.ACTIVE);
    expect(rightsp).toHaveClass(seed, PARTS.RIGHT, VARIANT.ACTIVE);
  });

  test("default class of inactive variant", () => {
    const props = {
      children,
      left: leftfn,
      right: rightfn,
      variant: VARIANT.INACTIVE,
    };

    const { getByRole, getByTestId, rerender } = render(Button, props);
    const btn = getByRole("button") as HTMLButtonElement;
    const leftsp = getByTestId(leftid).parentElement;
    const mainsp = btn.children[1];
    const rightsp = getByTestId(rightid).parentElement;

    expect(btn).toHaveClass(seed, PARTS.WHOLE, VARIANT.INACTIVE);
    expect(leftsp).toHaveClass(seed, PARTS.LEFT, VARIANT.INACTIVE);
    expect(mainsp).toHaveClass(seed, PARTS.MAIN, VARIANT.INACTIVE);
    expect(rightsp).toHaveClass(seed, PARTS.RIGHT, VARIANT.INACTIVE);
  });

  test("w/ string styling class of neutral variant", () => {
    const clsid = "custom-button";
    const props = $state({
      children,
      left: leftfn,
      right: rightfn,
      variant: VARIANT.NEUTRAL,
      styling: clsid,
    });

    const { getByRole, getByTestId } = render(Button, props);
    const btn = getByRole("button") as HTMLButtonElement;
    const leftsp = getByTestId(leftid).parentElement;
    const mainsp = btn.children[1];
    const rightsp = getByTestId(rightid).parentElement;

    expect(props.variant).toBe(VARIANT.NEUTRAL);
    expect(btn).toHaveClass(clsid, PARTS.WHOLE, VARIANT.NEUTRAL);
    expect(leftsp).toHaveClass(clsid, PARTS.LEFT, VARIANT.NEUTRAL);
    expect(mainsp).toHaveClass(clsid, PARTS.MAIN, VARIANT.NEUTRAL);
    expect(rightsp).toHaveClass(clsid, PARTS.RIGHT, VARIANT.NEUTRAL);
  });

  test("w/ string styling class of active variant", () => {
    const clsid = "custom-button";
    const props = $state({
      children,
      left: leftfn,
      right: rightfn,
      variant: VARIANT.ACTIVE,
      styling: clsid,
    });

    const { getByRole, getByTestId } = render(Button, props);
    const btn = getByRole("button") as HTMLButtonElement;
    const leftsp = getByTestId(leftid).parentElement;
    const mainsp = btn.children[1];
    const rightsp = getByTestId(rightid).parentElement;

    expect(btn).toHaveClass(clsid, PARTS.WHOLE, VARIANT.ACTIVE);
    expect(leftsp).toHaveClass(clsid, PARTS.LEFT, VARIANT.ACTIVE);
    expect(mainsp).toHaveClass(clsid, PARTS.MAIN, VARIANT.ACTIVE);
    expect(rightsp).toHaveClass(clsid, PARTS.RIGHT, VARIANT.ACTIVE);
  });

  const dynObj = {
    base: "btn-base",
    neutral: "btn-neutral",
    active: "btn-active",
    inactive: "btn-inactive",
  };
  const styling = {
    whole: dynObj,
    main: dynObj,
    left: dynObj,
    right: dynObj,
  };
  test("w/ object styling of neutral variant", () => {
    const props = $state({
      children,
      left: leftfn,
      right: rightfn,
      variant: VARIANT.NEUTRAL,
      styling,
    });

    const { getByRole, getByTestId } = render(Button, props);
    const btn = getByRole("button") as HTMLButtonElement;
    const leftsp = getByTestId(leftid).parentElement;
    const mainsp = btn.children[1];
    const rightsp = getByTestId(rightid).parentElement;

    expect(props.variant).toBe(VARIANT.NEUTRAL);
    expect(btn).toHaveClass(dynObj.base, dynObj.neutral);
    expect(leftsp).toHaveClass(dynObj.base, dynObj.neutral);
    expect(mainsp).toHaveClass(dynObj.base, dynObj.neutral);
    expect(rightsp).toHaveClass(dynObj.base, dynObj.neutral);
  });

  test("w/ object styling of active variant", () => {
    const props = $state({
      children,
      left: leftfn,
      right: rightfn,
      variant: VARIANT.ACTIVE,
      styling,
    });

    const { getByRole, getByTestId } = render(Button, props);
    const btn = getByRole("button") as HTMLButtonElement;
    const leftsp = getByTestId(leftid).parentElement;
    const mainsp = btn.children[1];
    const rightsp = getByTestId(rightid).parentElement;

    expect(btn).toHaveClass(dynObj.base, dynObj.active);
    expect(leftsp).toHaveClass(dynObj.base, dynObj.active);
    expect(mainsp).toHaveClass(dynObj.base, dynObj.active);
    expect(rightsp).toHaveClass(dynObj.base, dynObj.active);
  });

  test("w/ object styling of inactive variant", () => {
    const props = $state({
      children,
      left: leftfn,
      right: rightfn,
      variant: VARIANT.INACTIVE,
      styling,
    });

    const { getByRole, getByTestId } = render(Button, props);
    const btn = getByRole("button") as HTMLButtonElement;
    const leftsp = getByTestId(leftid).parentElement;
    const mainsp = btn.children[1];
    const rightsp = getByTestId(rightid).parentElement;

    expect(btn).toHaveClass(dynObj.base, dynObj.inactive);
    expect(leftsp).toHaveClass(dynObj.base, dynObj.inactive);
    expect(mainsp).toHaveClass(dynObj.base, dynObj.inactive);
    expect(rightsp).toHaveClass(dynObj.base, dynObj.inactive);
  });

  test("element binding", () => {
    const props = $state({ children, element: undefined as HTMLButtonElement | undefined });
    const { getByRole } = render(Button, props);
    const btn = getByRole("button") as HTMLButtonElement;

    expect(props.element).toBe(btn);
  });

  test("variant binding", async () => {
    const props = $state({ children, variant: "custom-variant" });
    const { getByRole, rerender } = render(Button, props);
    const btn = getByRole("button") as HTMLButtonElement;

    expect(btn).toHaveClass(seed, PARTS.WHOLE, "custom-variant");

    props.variant = "another-variant";
    await rerender(props);
    expect(btn).toHaveClass(seed, PARTS.WHOLE, "another-variant");
  });

  test("form binding", () => {
    const mockForm = document.createElement("form");
    const props = $state({ children, form: mockForm });

    render(Button, props);
    expect(props.form).toBe(mockForm);
  });
  test("handles rapid clicks", async () => {
    const mockClick = vi.fn();
    const user = userEvent.setup();
    const { getByRole } = render(Button, { children, onclick: mockClick });
    const btn = getByRole("button");

    for (let i = 0; i < 10; i++) {
      await user.click(btn);
    }

    expect(mockClick).toHaveBeenCalledTimes(10);
  });
});
