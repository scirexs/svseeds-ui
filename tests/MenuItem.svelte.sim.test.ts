import { afterEach, describe, expect, test, vi } from "vitest";
import { fireEvent, render } from "@testing-library/svelte";
import { createRawSnippet } from "svelte";
import MenuItem from "#svs/MenuItem.svelte";
import { PARTS, VARIANT } from "#svs/core";
import MenuItemCtxProvider from "./fixtures/MenuItemCtxProvider.svelte";

const children = createRawSnippet(() => ({ render: () => "<span>Item</span>" }));
const root = (c: HTMLElement) => c.querySelector('[role="menuitem"]') as HTMLButtonElement | HTMLAnchorElement;

afterEach(() => {
  vi.restoreAllMocks();
});

describe("MenuItem rendering and semantics", () => {
  test("renders menuitem button semantics", () => {
    const { container } = render(MenuItem, { children });
    const button = root(container);

    expect(button.tagName).toBe("BUTTON");
    expect(button).toHaveAttribute("role", "menuitem");
    expect(button).toHaveAttribute("type", "button");
    expect(button).toHaveAttribute("tabindex", "-1");
  });

  test("applies default and custom variant classes", () => {
    const normal = render(MenuItem, { children });
    expect(root(normal.container)).toHaveClass("svs-menu-item", PARTS.WHOLE, VARIANT.NEUTRAL);
    normal.unmount();

    const active = render(MenuItem, { children, variant: VARIANT.ACTIVE });
    expect(root(active.container)).toHaveClass("svs-menu-item", PARTS.WHOLE, VARIANT.ACTIVE);
  });

  test("styling overrides preset and class prop merges", () => {
    const { container } = render(MenuItem, {
      children,
      styling: "custom-item",
      class: "extra-item",
    });
    const button = root(container);

    expect(button).toHaveClass("custom-item", PARTS.WHOLE, VARIANT.NEUTRAL, "extra-item");
    expect(button).not.toHaveClass("svs-menu-item");
  });

  test("object styling and rest attributes pass through", () => {
    const { container } = render(MenuItem, {
      children,
      styling: { whole: { base: "item-base", neutral: "item-neutral" } },
      "aria-label": "Action",
      "data-id": "x",
    });
    const button = root(container);

    expect(button).toHaveClass("item-base", "item-neutral");
    expect(button).toHaveAttribute("aria-label", "Action");
    expect(button).toHaveAttribute("data-id", "x");
  });

  test("component-owned semantics cannot be overridden by rest attributes", () => {
    const { container } = render(MenuItem, {
      children,
      type: "submit",
      role: "button",
      tabindex: 0,
      "aria-disabled": "false",
      disabled: true,
    } as any);
    const button = root(container);

    expect(button).toHaveAttribute("type", "button");
    expect(button).toHaveAttribute("role", "menuitem");
    expect(button).toHaveAttribute("tabindex", "-1");
    expect(button).toHaveAttribute("aria-disabled", "true");
  });
});

describe("MenuItem disabled", () => {
  test("disabled uses aria-disabled without native disabled", () => {
    const { container } = render(MenuItem, { children, disabled: true });
    const button = root(container);

    expect(button).toHaveAttribute("aria-disabled", "true");
    expect(button).not.toHaveAttribute("disabled");
  });

  test("enabled omits aria-disabled", () => {
    const { container } = render(MenuItem, { children });
    expect(root(container)).not.toHaveAttribute("aria-disabled");
  });

  test("disabled click blocks selection and prevents default", async () => {
    const onselect = vi.fn();
    const { container } = render(MenuItem, { children, disabled: true, onselect });
    const button = root(container);
    const ev = new MouseEvent("click", { bubbles: true, cancelable: true });

    await fireEvent(button, ev);

    expect(onselect).not.toHaveBeenCalled();
    expect(ev.defaultPrevented).toBe(true);
  });
});

describe("MenuItem activation", () => {
  test("enabled click calls onselect", async () => {
    const onselect = vi.fn();
    const { container } = render(MenuItem, { children, onselect });
    const button = root(container);

    await fireEvent.click(button);

    expect(onselect).toHaveBeenCalledTimes(1);
    expect(onselect.mock.calls[0][0]).toBeInstanceOf(MouseEvent);
  });

  test("enabled click without onselect does not throw", async () => {
    const { container } = render(MenuItem, { children });
    await expect(fireEvent.click(root(container))).resolves.toBeTruthy();
  });
});

describe("MenuItem as anchor", () => {
  test("href renders anchor semantics", () => {
    const { container } = render(MenuItem, { children, href: "/go" });
    const anchor = root(container);

    expect(anchor.tagName).toBe("A");
    expect(anchor).toHaveAttribute("href", "/go");
    expect(anchor).toHaveAttribute("role", "menuitem");
    expect(anchor).not.toHaveAttribute("type");
    expect(anchor).toHaveAttribute("tabindex", "-1");
  });

  test("enabled anchor click calls onselect", async () => {
    const onselect = vi.fn((ev: MouseEvent) => ev.preventDefault());
    const { container } = render(MenuItem, { children, href: "/go", onselect });

    await fireEvent.click(root(container));

    expect(onselect).toHaveBeenCalledTimes(1);
  });

  test("context anchor click closes and disabled anchor prevents navigation", async () => {
    const onselect = vi.fn((ev: MouseEvent) => ev.preventDefault());
    const enabled = $state({ closed: 0, onselect, href: "/go" });
    const rendered = render(MenuItemCtxProvider, enabled);

    await fireEvent.click(root(rendered.container));

    expect(onselect).toHaveBeenCalledTimes(1);
    expect(enabled.closed).toBe(1);
    rendered.unmount();

    const disabledSelect = vi.fn();
    const disabled = $state({ closed: 0, onselect: disabledSelect, disabled: true, href: "/go" });
    const blocked = render(MenuItemCtxProvider, disabled);
    const ev = new MouseEvent("click", { bubbles: true, cancelable: true });

    await fireEvent(root(blocked.container), ev);

    expect(disabledSelect).not.toHaveBeenCalled();
    expect(disabled.closed).toBe(0);
    expect(ev.defaultPrevented).toBe(true);
  });

  test("component-owned anchor semantics cannot be overridden", () => {
    const { container } = render(MenuItem, {
      children,
      href: "/go",
      type: "submit",
      role: "link",
    } as any);
    const anchor = root(container);

    expect(anchor).toHaveAttribute("role", "menuitem");
    expect(anchor).not.toHaveAttribute("type");
  });

  test("element binding resolves to anchor", () => {
    const props = $state({ children, href: "/go", element: undefined as HTMLButtonElement | HTMLAnchorElement | undefined });
    const { container } = render(MenuItem, props);

    expect(props.element).toBe(root(container));
    expect(props.element?.tagName).toBe("A");
  });
});

describe("MenuItem embedded context", () => {
  test("context variant drives class and rerenders", async () => {
    const props = $state({ variant: VARIANT.ACTIVE as string });
    const { container, rerender } = render(MenuItemCtxProvider, props);
    const button = root(container);

    expect(button).toHaveClass("svs-menu-item", PARTS.WHOLE, VARIANT.ACTIVE);

    props.variant = VARIANT.INACTIVE;
    await rerender(props);

    expect(button).toHaveClass("svs-menu-item", PARTS.WHOLE, VARIANT.INACTIVE);
  });

  test("context styling is used and item styling wins", () => {
    const contextual = render(MenuItemCtxProvider, { styling: "ctx-item" });
    expect(root(contextual.container)).toHaveClass("ctx-item", PARTS.WHOLE, VARIANT.NEUTRAL);
    contextual.unmount();

    const local = render(MenuItemCtxProvider, { styling: "ctx-item", itemStyling: "local-item" });
    const button = root(local.container);
    expect(button).toHaveClass("local-item", PARTS.WHOLE, VARIANT.NEUTRAL);
    expect(button).not.toHaveClass("ctx-item");
  });

  test("enabled click calls onselect and closes", async () => {
    const onselect = vi.fn();
    const props = $state({ closed: 0, onselect });
    const { container } = render(MenuItemCtxProvider, props);

    await fireEvent.click(root(container));

    expect(onselect).toHaveBeenCalledTimes(1);
    expect(props.closed).toBe(1);
  });

  test("disabled click does not select, close, or propagate", async () => {
    const onselect = vi.fn();
    const spy = vi.fn();
    const props = $state({ closed: 0, onselect, disabled: true });
    const { container } = render(MenuItemCtxProvider, props);
    document.addEventListener("click", spy);

    try {
      await fireEvent.click(root(container));
    } finally {
      document.removeEventListener("click", spy);
    }

    expect(onselect).not.toHaveBeenCalled();
    expect(props.closed).toBe(0);
    expect(spy).not.toHaveBeenCalled();
  });
});
