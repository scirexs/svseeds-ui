import { describe, expect, test, vi } from "vitest";
import { render } from "@testing-library/svelte";
import { userEvent } from "@testing-library/user-event";
import { createRawSnippet } from "svelte";
import Button, { type ButtonProps } from "#svs/_Button.svelte";
import { PARTS, VARIANT } from "#svs/core";

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
  const attachfn = () => {};

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
    const props: ButtonProps = { children, type: "submit" };
    const { getByRole } = render(Button, props);
    const btn = getByRole("button") as HTMLButtonElement;
    expect(btn).toHaveAttribute("type", "submit");
  });

  test("w/ reset type", () => {
    const props: ButtonProps = { children, type: "reset" };
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

  test("passes variant to left and right snippets", () => {
    const props = { children, left: leftfn, right: rightfn, variant: VARIANT.ACTIVE };
    const { getByTestId } = render(Button, props);

    expect(getByTestId(leftid).textContent).toContain(VARIANT.ACTIVE);
    expect(getByTestId(rightid).textContent).toContain(VARIANT.ACTIVE);
  });

  test("passes element to left and right snippets", () => {
    const left = vi.fn().mockImplementation(leftfn);
    const right = vi.fn().mockImplementation(rightfn);

    const { getByRole } = render(Button, { children, left, right });
    const btn = getByRole("button") as HTMLButtonElement;
    const leftElement = left.mock.calls[0]?.[2] as (() => HTMLButtonElement | undefined) | undefined;
    const rightElement = right.mock.calls[0]?.[2] as (() => HTMLButtonElement | undefined) | undefined;

    expect(leftElement?.()).toBe(btn);
    expect(rightElement?.()).toBe(btn);
  });

  test("passes variant to children snippet", () => {
    const childid = "test-child-variant";
    const variantChildren = createRawSnippet((variant: () => string) => {
      return { render: () => `<span data-testid="${childid}">${variant()}</span>` };
    });

    const { getByTestId } = render(Button, { children: variantChildren, variant: VARIANT.ACTIVE });

    expect(getByTestId(childid).textContent).toBe(VARIANT.ACTIVE);
  });

  test("w/ attach", () => {
    const attach = vi.fn().mockImplementation(attachfn);
    const props = { children, attach };
    const { getByRole } = render(Button, props);
    const btn = getByRole("button") as HTMLButtonElement;
    expect(btn).toHaveTextContent("Button Text");
    expect(attach).toHaveBeenCalled();
  });

  test("w/ attach and snippets", () => {
    const attach = vi.fn().mockImplementation(attachfn);
    const left = vi.fn().mockImplementation(leftfn);
    const right = vi.fn().mockImplementation(rightfn);
    const props = { children, left, right, attach };
    const { getByRole, getByTestId } = render(Button, props);
    const btn = getByRole("button") as HTMLButtonElement;
    const leftsp = getByTestId(leftid);
    const rightsp = getByTestId(rightid);
    expect(btn.firstElementChild).toBe(leftsp.parentElement);
    expect(btn.children[1]?.textContent).toBe("Button Text");
    expect(btn.lastElementChild).toBe(rightsp.parentElement);
    expect(attach).toHaveBeenCalled();
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

  test("w/ rest attributes", () => {
    const props: ButtonProps = {
      children,
      name: "test-button",
      value: "test-value",
      disabled: true,
      "aria-label": "Test Button",
    };
    const { getByRole } = render(Button, props);
    const btn = getByRole("button") as HTMLButtonElement;
    expect(btn).toHaveAttribute("name", "test-button");
    expect(btn).toHaveAttribute("value", "test-value");
    expect(btn).toHaveAttribute("disabled");
    expect(btn).toHaveAttribute("aria-label", "Test Button");
  });

  test("w/ string class merged onto root", () => {
    const props: ButtonProps = { children, class: "custom-class" };
    const { getByRole } = render(Button, props);
    const btn = getByRole("button") as HTMLButtonElement;
    expect(btn).toHaveClass("custom-class", seed, PARTS.WHOLE, VARIANT.NEUTRAL);
  });

  test("w/ array class merged onto root", () => {
    const props: ButtonProps = { children, class: ["custom-a", "custom-b"] };
    const { getByRole } = render(Button, props);
    const btn = getByRole("button") as HTMLButtonElement;
    expect(btn).toHaveClass("custom-a", "custom-b", seed, PARTS.WHOLE);
  });

  test("w/ object class merged onto root", () => {
    const props: ButtonProps = { children, class: { "custom-on": true, "custom-off": false } };
    const { getByRole } = render(Button, props);
    const btn = getByRole("button") as HTMLButtonElement;
    expect(btn).toHaveClass("custom-on", seed, PARTS.WHOLE);
    expect(btn).not.toHaveClass("custom-off");
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

  test("form attribute - outputs form id", () => {
    const f = document.createElement("form");
    f.id = "my-form";

    const { getByRole } = render(Button, { children, form: f });
    const btn = getByRole("button") as HTMLButtonElement;

    expect(btn).toHaveAttribute("form", "my-form");
  });

  test("form attribute - omits empty form id", () => {
    const f = document.createElement("form");

    const { getByRole } = render(Button, { children, form: f });
    const btn = getByRole("button") as HTMLButtonElement;

    expect(btn).not.toHaveAttribute("form");
  });

  test("disabled suppresses onclick", async () => {
    const mockClick = vi.fn();
    const user = userEvent.setup();

    const { getByRole } = render(Button, { children, onclick: mockClick, disabled: true });
    const btn = getByRole("button") as HTMLButtonElement;

    await user.click(btn);
    expect(mockClick).not.toHaveBeenCalled();
  });

  test("keyboard activation - enter fires onclick", async () => {
    const mockClick = vi.fn();
    const user = userEvent.setup();

    const { getByRole } = render(Button, { children, onclick: mockClick });
    const btn = getByRole("button") as HTMLButtonElement;

    btn.focus();
    await user.keyboard("{Enter}");
    expect(mockClick).toHaveBeenCalled();
  });

  test("keyboard activation - space fires onclick", async () => {
    const mockClick = vi.fn();
    const user = userEvent.setup();

    const { getByRole } = render(Button, { children, onclick: mockClick });
    const btn = getByRole("button") as HTMLButtonElement;

    btn.focus();
    await user.keyboard("[Space]");
    expect(mockClick).toHaveBeenCalled();
  });

  test("keyboard activation - invalid form suppresses onclick", async () => {
    const mockClick = vi.fn();
    const user = userEvent.setup();
    const mockForm = { checkValidity: vi.fn().mockReturnValue(false) } as any;

    const { getByRole } = render(Button, { children, onclick: mockClick, form: mockForm });
    const btn = getByRole("button") as HTMLButtonElement;

    btn.focus();
    await user.keyboard("{Enter}");
    expect(mockForm.checkValidity).toHaveBeenCalled();
    expect(mockClick).not.toHaveBeenCalled();
  });

  test("real form validation - invalid required field suppresses onclick", async () => {
    const mockClick = vi.fn();
    const user = userEvent.setup();
    const f = document.createElement("form");
    const input = document.createElement("input");
    input.required = true;
    f.appendChild(input);
    document.body.appendChild(f);

    try {
      const { getByRole } = render(Button, { children, onclick: mockClick, form: f });
      const btn = getByRole("button") as HTMLButtonElement;

      await user.click(btn);
      expect(f.checkValidity()).toBe(false);
      expect(mockClick).not.toHaveBeenCalled();
    } finally {
      f.remove();
    }
  });

  test("real form validation - valid required field fires onclick", async () => {
    const mockClick = vi.fn();
    const user = userEvent.setup();
    const f = document.createElement("form");
    const input = document.createElement("input");
    input.required = true;
    input.value = "x";
    f.appendChild(input);
    document.body.appendChild(f);

    try {
      const { getByRole } = render(Button, { children, onclick: mockClick, form: f });
      const btn = getByRole("button") as HTMLButtonElement;

      await user.click(btn);
      expect(f.checkValidity()).toBe(true);
      expect(mockClick).toHaveBeenCalled();
    } finally {
      f.remove();
    }
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
