import { describe, expect, test, vi } from "vitest";
import { render } from "vitest-browser-svelte";
import { userEvent } from "vitest/browser";
import { createRawSnippet, tick } from "svelte";
import Button, { type ButtonProps } from "#svs/Button.svelte";
import { PARTS, VARIANT } from "#svs/core";

const leftid = "test-left";
const rightid = "test-right";
const leftfn = createRawSnippet((variant: () => string, element: () => HTMLButtonElement | undefined) => {
  return { render: () => `<span data-testid="${leftid}">${variant()},${element?.toString()}</span>` };
});
const rightfn = createRawSnippet((variant: () => string, element: () => HTMLButtonElement | undefined) => {
  return { render: () => `<span data-testid="${rightid}">${variant()},${element?.toString()}</span>` };
});
const children = createRawSnippet(() => {
  return { render: () => "<span>Button Text</span>" };
});
const tid = (container: HTMLElement, id: string) => container.querySelector(`[data-testid="${id}"]`) as HTMLElement;
const has = (el: Element | null | undefined, ...names: string[]) =>
  expect([...(el?.classList ?? [])]).toEqual(expect.arrayContaining(names));
const lacks = (el: Element | null | undefined, name: string) => expect(el?.classList.contains(name)).toBe(false);
const attr = (el: Element, name: string, value?: string) => {
  if (value === undefined) expect(el.hasAttribute(name)).toBe(true);
  else expect(el.getAttribute(name)).toBe(value);
};
const noattr = (el: Element, name: string) => expect(el.hasAttribute(name)).toBe(false);
const txt = (el: Element, value: string) => expect(el.textContent).toContain(value);

describe("Switching existence of elements", () => {
  const attachfn = () => {};

  test("minimal props", () => {
    const { container } = render(Button, { children });
    const btn = container.querySelector("button") as HTMLButtonElement;
    txt(btn, "Button Text");
    attr(btn, "type", "button");
    expect(btn.children).toHaveLength(1);
    expect(btn.firstElementChild?.tagName).toBe("SPAN");
    expect(btn.firstElementChild?.children).toHaveLength(1);
    expect(btn.firstElementChild?.firstElementChild?.tagName).toBe("SPAN");
    expect(btn.firstElementChild?.textContent).toBe("Button Text");
  });

  test("w/ submit type", () => {
    const props: ButtonProps = { children, type: "submit" };
    const { container } = render(Button, props);
    const btn = container.querySelector("button") as HTMLButtonElement;
    attr(btn, "type", "submit");
  });

  test("w/ reset type", () => {
    const props: ButtonProps = { children, type: "reset" };
    const { container } = render(Button, props);
    const btn = container.querySelector("button") as HTMLButtonElement;
    attr(btn, "type", "reset");
  });

  test("w/ left snippet", () => {
    const left = vi.fn().mockImplementation(leftfn);
    const props = { children, left };
    const { container } = render(Button, props);
    const btn = container.querySelector("button") as HTMLButtonElement;
    const leftsp = tid(container, leftid);
    expect(btn.children).toHaveLength(2);
    expect(btn.firstElementChild).toBe(leftsp.parentElement);
    expect(btn.lastElementChild?.textContent).toBe("Button Text");
    expect(left).toHaveBeenCalled();
  });

  test("w/ right snippet", () => {
    const right = vi.fn().mockImplementation(rightfn);
    const props = { children, right };
    const { container } = render(Button, props);
    const btn = container.querySelector("button") as HTMLButtonElement;
    const rightsp = tid(container, rightid);
    expect(btn.children).toHaveLength(2);
    expect(btn.lastElementChild).toBe(rightsp.parentElement);
    expect(btn.firstElementChild?.textContent).toBe("Button Text");
    expect(right).toHaveBeenCalled();
  });

  test("w/ left and right snippets", () => {
    const left = vi.fn().mockImplementation(leftfn);
    const right = vi.fn().mockImplementation(rightfn);
    const props = { children, left, right };
    const { container } = render(Button, props);
    const btn = container.querySelector("button") as HTMLButtonElement;
    const leftsp = tid(container, leftid);
    const rightsp = tid(container, rightid);
    expect(btn.children).toHaveLength(3);
    expect(btn.firstElementChild).toBe(leftsp.parentElement);
    expect(btn.children[1]?.textContent).toBe("Button Text");
    expect(btn.lastElementChild).toBe(rightsp.parentElement);
    expect(left).toHaveBeenCalled();
    expect(right).toHaveBeenCalled();
  });

  test("passes variant to left and right snippets", () => {
    const props = { children, left: leftfn, right: rightfn, variant: VARIANT.ACTIVE };
    const { container } = render(Button, props);

    expect(tid(container, leftid).textContent).toContain(VARIANT.ACTIVE);
    expect(tid(container, rightid).textContent).toContain(VARIANT.ACTIVE);
  });

  test("passes element to left and right snippets", () => {
    const left = vi.fn().mockImplementation(leftfn);
    const right = vi.fn().mockImplementation(rightfn);

    const { container } = render(Button, { children, left, right });
    const btn = container.querySelector("button") as HTMLButtonElement;
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

    const { container } = render(Button, { children: variantChildren, variant: VARIANT.ACTIVE });

    expect(tid(container, childid).textContent).toBe(VARIANT.ACTIVE);
  });

  test("w/ attach", () => {
    const attach = vi.fn().mockImplementation(attachfn);
    const props = { children, attach };
    const { container } = render(Button, props);
    const btn = container.querySelector("button") as HTMLButtonElement;
    txt(btn, "Button Text");
    expect(attach).toHaveBeenCalled();
  });

  test("w/ attach and snippets", () => {
    const attach = vi.fn().mockImplementation(attachfn);
    const left = vi.fn().mockImplementation(leftfn);
    const right = vi.fn().mockImplementation(rightfn);
    const props = { children, left, right, attach };
    const { container } = render(Button, props);
    const btn = container.querySelector("button") as HTMLButtonElement;
    const leftsp = tid(container, leftid);
    const rightsp = tid(container, rightid);
    expect(btn.firstElementChild).toBe(leftsp.parentElement);
    expect(btn.children[1]?.textContent).toBe("Button Text");
    expect(btn.lastElementChild).toBe(rightsp.parentElement);
    expect(attach).toHaveBeenCalled();
    expect(left).toHaveBeenCalled();
    expect(right).toHaveBeenCalled();
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
    const { container } = render(Button, props);
    const btn = container.querySelector("button") as HTMLButtonElement;
    attr(btn, "name", "test-button");
    attr(btn, "value", "test-value");
    attr(btn, "disabled");
    attr(btn, "aria-label", "Test Button");
  });

  test("w/ string class merged onto root", () => {
    const props: ButtonProps = { children, class: "custom-class" };
    const { container } = render(Button, props);
    const btn = container.querySelector("button") as HTMLButtonElement;
    has(btn, "custom-class", seed, PARTS.WHOLE, VARIANT.NEUTRAL);
  });

  test("w/ array class merged onto root", () => {
    const props: ButtonProps = { children, class: ["custom-a", "custom-b"] };
    const { container } = render(Button, props);
    const btn = container.querySelector("button") as HTMLButtonElement;
    has(btn, "custom-a", "custom-b", seed, PARTS.WHOLE);
  });

  test("w/ object class merged onto root", () => {
    const props: ButtonProps = { children, class: { "custom-on": true, "custom-off": false } };
    const { container } = render(Button, props);
    const btn = container.querySelector("button") as HTMLButtonElement;
    has(btn, "custom-on", seed, PARTS.WHOLE);
    lacks(btn, "custom-off");
  });

  test("form validation - valid form", async () => {
    const mockClick = vi.fn();
    // Create a mock form that returns true for checkValidity
    const mockForm = { checkValidity: vi.fn().mockReturnValue(true) } as any;

    const props = $state({
      children,
      onclick: mockClick,
      form: mockForm,
    });

    const { container } = render(Button, props);
    const btn = container.querySelector("button") as HTMLButtonElement;

    await userEvent.click(btn);
    expect(mockForm.checkValidity).toHaveBeenCalled();
    expect(mockClick).toHaveBeenCalled();
  });

  test("form validation - invalid form", async () => {
    const mockClick = vi.fn();
    // Create a mock form that returns false for checkValidity
    const mockForm = { checkValidity: vi.fn().mockReturnValue(false) } as any;

    const props = $state({
      children,
      onclick: mockClick,
      form: mockForm,
    });

    const { container } = render(Button, props);
    const btn = container.querySelector("button") as HTMLButtonElement;

    await userEvent.click(btn);
    expect(mockForm.checkValidity).toHaveBeenCalled();
    expect(mockClick).not.toHaveBeenCalled();
  });

  test("form validation - no form", async () => {
    const mockClick = vi.fn();
    const props = { children, onclick: mockClick };
    const { container } = render(Button, props);
    const btn = container.querySelector("button") as HTMLButtonElement;

    await userEvent.click(btn);
    expect(mockClick).toHaveBeenCalled();
  });

  test("form attribute - outputs form id", () => {
    const f = document.createElement("form");
    f.id = "my-form";

    const { container } = render(Button, { children, form: f });
    const btn = container.querySelector("button") as HTMLButtonElement;

    attr(btn, "form", "my-form");
  });

  test("form attribute - omits empty form id", () => {
    const f = document.createElement("form");

    const { container } = render(Button, { children, form: f });
    const btn = container.querySelector("button") as HTMLButtonElement;

    noattr(btn, "form");
  });

  test("disabled suppresses onclick", async () => {
    const mockClick = vi.fn();
    const { container } = render(Button, { children, onclick: mockClick, disabled: true });
    const btn = container.querySelector("button") as HTMLButtonElement;

    btn.click();
    await tick();
    expect(mockClick).not.toHaveBeenCalled();
  });

  test("keyboard activation - enter fires onclick", async () => {
    const mockClick = vi.fn();
    const { container } = render(Button, { children, onclick: mockClick });
    const btn = container.querySelector("button") as HTMLButtonElement;

    btn.focus();
    await userEvent.keyboard("{Enter}");
    expect(mockClick).toHaveBeenCalled();
  });

  test("keyboard activation - space fires onclick", async () => {
    const mockClick = vi.fn();
    const { container } = render(Button, { children, onclick: mockClick });
    const btn = container.querySelector("button") as HTMLButtonElement;

    btn.focus();
    await userEvent.keyboard("[Space]");
    expect(mockClick).toHaveBeenCalled();
  });

  test("keyboard activation - invalid form suppresses onclick", async () => {
    const mockClick = vi.fn();
    const mockForm = { checkValidity: vi.fn().mockReturnValue(false) } as any;

    const { container } = render(Button, { children, onclick: mockClick, form: mockForm });
    const btn = container.querySelector("button") as HTMLButtonElement;

    btn.focus();
    await userEvent.keyboard("{Enter}");
    expect(mockForm.checkValidity).toHaveBeenCalled();
    expect(mockClick).not.toHaveBeenCalled();
  });

  describe("Inactive (aria-disabled) state", () => {
    test("sets aria-disabled and aria-description to the reason", () => {
      const reason = "編集中は保存できません";
      const { container } = render(Button, { children, inactive: reason });
      const btn = container.querySelector("button") as HTMLButtonElement;

      attr(btn, "aria-disabled", "true");
      expect(btn.getAttribute("aria-description")).toBe(reason);
      noattr(btn, "aria-describedby");
    });

    test("renders no extra reason node", () => {
      const { container } = render(Button, { children, inactive: "reason" });
      const btn = container.querySelector("button") as HTMLButtonElement;

      expect(container.children).toHaveLength(1);
      expect(container.firstElementChild).toBe(btn);
      expect(container.querySelector(`.${PARTS.BOTTOM}`)).toBeNull();
    });

    test("inactive drives variant to INACTIVE", () => {
      const { container } = render(Button, {
        children,
        inactive: "reason",
        variant: VARIANT.NEUTRAL,
      });
      const btn = container.querySelector("button") as HTMLButtonElement;

      has(btn, seed, PARTS.WHOLE, VARIANT.INACTIVE);
      lacks(btn, VARIANT.NEUTRAL);
    });

    test("bound variant reflects the transition", () => {
      const props = $state({ children, inactive: "reason", variant: VARIANT.NEUTRAL });

      render(Button, props);

      expect(props.variant).toBe(VARIANT.INACTIVE);
    });

    test("suppresses onclick on click", async () => {
      const mockClick = vi.fn();
      const { container } = render(Button, { children, onclick: mockClick, inactive: "reason" });
      const btn = container.querySelector("button") as HTMLButtonElement;

      btn.click();
      await tick();
      expect(mockClick).not.toHaveBeenCalled();
    });

    test("suppresses keyboard activation", async () => {
      const mockClick = vi.fn();
      const { container } = render(Button, { children, onclick: mockClick, inactive: "reason" });
      const btn = container.querySelector("button") as HTMLButtonElement;

      btn.focus();
      await userEvent.keyboard("{Enter}");
      await userEvent.keyboard("[Space]");
      expect(mockClick).not.toHaveBeenCalled();
    });

    test("does not call form.checkValidity while inactive", async () => {
      const mockClick = vi.fn();
      const mockForm = { checkValidity: vi.fn().mockReturnValue(true) } as any;
      const { container } = render(Button, {
        children,
        onclick: mockClick,
        form: mockForm,
        inactive: "reason",
      });
      const btn = container.querySelector("button") as HTMLButtonElement;

      btn.click();
      await tick();
      expect(mockForm.checkValidity).not.toHaveBeenCalled();
      expect(mockClick).not.toHaveBeenCalled();
    });

    test("absent inactive -> no aria-disabled, no aria-description, onclick fires", async () => {
      const mockClick = vi.fn();
      const { container } = render(Button, { children, onclick: mockClick });
      const btn = container.querySelector("button") as HTMLButtonElement;

      noattr(btn, "aria-disabled");
      noattr(btn, "aria-description");
      await userEvent.click(btn);
      expect(mockClick).toHaveBeenCalledTimes(1);
    });

    test("whitespace-only inactive is treated as absent", async () => {
      const mockClick = vi.fn();
      const { container } = render(Button, { children, onclick: mockClick, inactive: "   " });
      const btn = container.querySelector("button") as HTMLButtonElement;

      noattr(btn, "aria-disabled");
      noattr(btn, "aria-description");
      await userEvent.click(btn);
      expect(mockClick).toHaveBeenCalledTimes(1);
    });

    test("toggling inactive off restores clickability and variant", async () => {
      const mockClick = vi.fn();
      const props = $state({
        children,
        onclick: mockClick,
        inactive: "reason" as string | undefined,
        variant: VARIANT.NEUTRAL,
      });
      const { container, rerender } = render(Button, props);
      const btn = container.querySelector("button") as HTMLButtonElement;

      btn.click();
      await tick();
      expect(mockClick).not.toHaveBeenCalled();
      expect(props.variant).toBe(VARIANT.INACTIVE);

      props.inactive = undefined;
      await rerender(props);

      noattr(btn, "aria-disabled");
      noattr(btn, "aria-description");
      expect(props.variant).toBe(VARIANT.NEUTRAL);
      has(btn, seed, PARTS.WHOLE, VARIANT.NEUTRAL);
      await userEvent.click(btn);
      expect(mockClick).toHaveBeenCalledTimes(1);
    });
  });

  test("real form validation - invalid required field suppresses onclick", async () => {
    const mockClick = vi.fn();
    const f = document.createElement("form");
    const input = document.createElement("input");
    input.required = true;
    f.appendChild(input);
    document.body.appendChild(f);

    try {
      const { container } = render(Button, { children, onclick: mockClick, form: f });
      const btn = container.querySelector("button") as HTMLButtonElement;

      await userEvent.click(btn);
      expect(f.checkValidity()).toBe(false);
      expect(mockClick).not.toHaveBeenCalled();
    } finally {
      f.remove();
    }
  });

  test("real form validation - valid required field fires onclick", async () => {
    const mockClick = vi.fn();
    const f = document.createElement("form");
    const input = document.createElement("input");
    input.required = true;
    input.value = "x";
    f.appendChild(input);
    document.body.appendChild(f);

    try {
      const { container } = render(Button, { children, onclick: mockClick, form: f });
      const btn = container.querySelector("button") as HTMLButtonElement;

      await userEvent.click(btn);
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

    const { container } = render(Button, props);
    const btn = container.querySelector("button") as HTMLButtonElement;
    const leftsp = tid(container, leftid).parentElement;
    const mainsp = btn.children[1];
    const rightsp = tid(container, rightid).parentElement;

    expect(props.variant).toBe(VARIANT.NEUTRAL);
    has(btn, seed, PARTS.WHOLE, VARIANT.NEUTRAL);
    has(leftsp, seed, PARTS.LEFT, VARIANT.NEUTRAL);
    has(mainsp, seed, PARTS.MAIN, VARIANT.NEUTRAL);
    has(rightsp, seed, PARTS.RIGHT, VARIANT.NEUTRAL);
  });

  test("default class of active variant", () => {
    const props = {
      children,
      left: leftfn,
      right: rightfn,
      variant: VARIANT.ACTIVE,
    };

    const { container } = render(Button, props);
    const btn = container.querySelector("button") as HTMLButtonElement;
    const leftsp = tid(container, leftid).parentElement;
    const mainsp = btn.children[1];
    const rightsp = tid(container, rightid).parentElement;

    has(btn, seed, PARTS.WHOLE, VARIANT.ACTIVE);
    has(leftsp, seed, PARTS.LEFT, VARIANT.ACTIVE);
    has(mainsp, seed, PARTS.MAIN, VARIANT.ACTIVE);
    has(rightsp, seed, PARTS.RIGHT, VARIANT.ACTIVE);
  });

  test("default class of inactive variant", () => {
    const props = {
      children,
      left: leftfn,
      right: rightfn,
      variant: VARIANT.INACTIVE,
    };

    const { container } = render(Button, props);
    const btn = container.querySelector("button") as HTMLButtonElement;
    const leftsp = tid(container, leftid).parentElement;
    const mainsp = btn.children[1];
    const rightsp = tid(container, rightid).parentElement;

    has(btn, seed, PARTS.WHOLE, VARIANT.INACTIVE);
    has(leftsp, seed, PARTS.LEFT, VARIANT.INACTIVE);
    has(mainsp, seed, PARTS.MAIN, VARIANT.INACTIVE);
    has(rightsp, seed, PARTS.RIGHT, VARIANT.INACTIVE);
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

    const { container } = render(Button, props);
    const btn = container.querySelector("button") as HTMLButtonElement;
    const leftsp = tid(container, leftid).parentElement;
    const mainsp = btn.children[1];
    const rightsp = tid(container, rightid).parentElement;

    expect(props.variant).toBe(VARIANT.NEUTRAL);
    has(btn, clsid, PARTS.WHOLE, VARIANT.NEUTRAL);
    has(leftsp, clsid, PARTS.LEFT, VARIANT.NEUTRAL);
    has(mainsp, clsid, PARTS.MAIN, VARIANT.NEUTRAL);
    has(rightsp, clsid, PARTS.RIGHT, VARIANT.NEUTRAL);
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

    const { container } = render(Button, props);
    const btn = container.querySelector("button") as HTMLButtonElement;
    const leftsp = tid(container, leftid).parentElement;
    const mainsp = btn.children[1];
    const rightsp = tid(container, rightid).parentElement;

    has(btn, clsid, PARTS.WHOLE, VARIANT.ACTIVE);
    has(leftsp, clsid, PARTS.LEFT, VARIANT.ACTIVE);
    has(mainsp, clsid, PARTS.MAIN, VARIANT.ACTIVE);
    has(rightsp, clsid, PARTS.RIGHT, VARIANT.ACTIVE);
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

    const { container } = render(Button, props);
    const btn = container.querySelector("button") as HTMLButtonElement;
    const leftsp = tid(container, leftid).parentElement;
    const mainsp = btn.children[1];
    const rightsp = tid(container, rightid).parentElement;

    expect(props.variant).toBe(VARIANT.NEUTRAL);
    has(btn, dynObj.base, dynObj.neutral);
    has(leftsp, dynObj.base, dynObj.neutral);
    has(mainsp, dynObj.base, dynObj.neutral);
    has(rightsp, dynObj.base, dynObj.neutral);
  });

  test("w/ object styling of active variant", () => {
    const props = $state({
      children,
      left: leftfn,
      right: rightfn,
      variant: VARIANT.ACTIVE,
      styling,
    });

    const { container } = render(Button, props);
    const btn = container.querySelector("button") as HTMLButtonElement;
    const leftsp = tid(container, leftid).parentElement;
    const mainsp = btn.children[1];
    const rightsp = tid(container, rightid).parentElement;

    has(btn, dynObj.base, dynObj.active);
    has(leftsp, dynObj.base, dynObj.active);
    has(mainsp, dynObj.base, dynObj.active);
    has(rightsp, dynObj.base, dynObj.active);
  });

  test("w/ object styling of inactive variant", () => {
    const props = $state({
      children,
      left: leftfn,
      right: rightfn,
      variant: VARIANT.INACTIVE,
      styling,
    });

    const { container } = render(Button, props);
    const btn = container.querySelector("button") as HTMLButtonElement;
    const leftsp = tid(container, leftid).parentElement;
    const mainsp = btn.children[1];
    const rightsp = tid(container, rightid).parentElement;

    has(btn, dynObj.base, dynObj.inactive);
    has(leftsp, dynObj.base, dynObj.inactive);
    has(mainsp, dynObj.base, dynObj.inactive);
    has(rightsp, dynObj.base, dynObj.inactive);
  });

  test("element binding", () => {
    const props = $state({ children, element: undefined as HTMLButtonElement | undefined });
    const { container } = render(Button, props);
    const btn = container.querySelector("button") as HTMLButtonElement;

    expect(props.element).toBe(btn);
  });

  test("variant binding", async () => {
    const props = $state({ children, variant: "custom-variant" });
    const { container, rerender } = render(Button, props);
    const btn = container.querySelector("button") as HTMLButtonElement;

    has(btn, seed, PARTS.WHOLE, "custom-variant");

    props.variant = "another-variant";
    await rerender(props);
    has(btn, seed, PARTS.WHOLE, "another-variant");
  });

  test("form binding", () => {
    const mockForm = document.createElement("form");
    const props = $state({ children, form: mockForm });

    render(Button, props);
    expect(props.form).toBe(mockForm);
  });
  test("handles rapid clicks", async () => {
    const mockClick = vi.fn();
    const { container } = render(Button, { children, onclick: mockClick });
    const btn = container.querySelector("button") as HTMLButtonElement;

    for (let i = 0; i < 10; i++) {
      await userEvent.click(btn);
    }

    expect(mockClick).toHaveBeenCalledTimes(10);
  });
});
