import { beforeEach, describe, expect, test, vi } from "vitest";
import { fireEvent, render, waitFor, within } from "@testing-library/svelte";
import { createRawSnippet, tick } from "svelte";
import Popover from "#svs/Popover.svelte";
import { PARTS, VARIANT } from "#svs/core";
import PopoverMenu from "./fixtures/PopoverMenu.svelte";

const content = "Panel content";
const children = createRawSnippet<[string]>((variant) => ({ render: () => `<div>${content}-${variant()}</div>` }));
const label = createRawSnippet<[boolean, string]>((open, variant) => ({
  render: () => `<span data-testid="label">${open() ? "open" : "closed"}-${variant()}</span>`,
}));

HTMLElement.prototype.showPopover = vi.fn();
HTMLElement.prototype.hidePopover = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
});

function trigger(container: HTMLElement) {
  return container.querySelector("button") as HTMLButtonElement;
}

function panel(container: HTMLElement) {
  return container.querySelector("[popover]") as HTMLDivElement;
}

function menu(container: HTMLElement) {
  return container.querySelector('[aria-orientation="vertical"]') as HTMLDivElement;
}

function item(container: HTMLElement, name: string) {
  return within(container).getByRole("menuitem", { name, hidden: true });
}

function toggle(el: HTMLElement, state: "open" | "closed") {
  el.dispatchEvent(Object.assign(new Event("toggle"), { newState: state }));
}

async function flush() {
  await Promise.resolve();
  await tick();
}

describe("Popover structure and a11y", () => {
  test("renders trigger and panel", () => {
    const { container, getByText } = render(Popover, { label: "Open", children });
    const button = trigger(container);
    const pop = panel(container);

    expect(button).toBeInTheDocument();
    expect(pop).toBeInTheDocument();
    expect(getByText(`${content}-${VARIANT.NEUTRAL}`)).toBeInTheDocument();
    expect(pop).toHaveAttribute("popover", "auto");
    expect(button.getAttribute("popovertarget")).toBe(pop.id);
    expect(button.getAttribute("aria-controls")).toBe(pop.id);
  });

  test("renders label snippet with open state and variant", () => {
    const { getByTestId } = render(Popover, { label, children, variant: VARIANT.ACTIVE, open: true });

    expect(getByTestId("label")).toHaveTextContent(`open-${VARIANT.ACTIVE}`);
  });

  test("applies parts, variant, and styling to trigger and panel", () => {
    const normal = render(Popover, { label: "Open", children });
    expect(trigger(normal.container)).toHaveClass("svs-popover", PARTS.LABEL, VARIANT.NEUTRAL);
    expect(panel(normal.container)).toHaveClass("svs-popover", PARTS.WHOLE, VARIANT.NEUTRAL);
    normal.unmount();

    const active = render(Popover, { label: "Open", children, variant: VARIANT.ACTIVE });
    expect(trigger(active.container)).toHaveClass("svs-popover", PARTS.LABEL, VARIANT.ACTIVE);
    expect(panel(active.container)).toHaveClass("svs-popover", PARTS.WHOLE, VARIANT.ACTIVE);
    active.unmount();

    const styled = render(Popover, { label: "Open", children, styling: "pop" });
    expect(trigger(styled.container)).toHaveClass("pop", PARTS.LABEL, VARIANT.NEUTRAL);
    expect(panel(styled.container)).toHaveClass("pop", PARTS.WHOLE, VARIANT.NEUTRAL);
  });

  test("sets aria-haspopup and role from ariaRole", () => {
    const plain = render(Popover, { label: "Open", children });
    expect(trigger(plain.container)).toHaveAttribute("aria-haspopup", "true");
    expect(panel(plain.container)).not.toHaveAttribute("role");
    plain.unmount();

    for (const ariaRole of ["menu", "listbox", "dialog"] as const) {
      const rendered = render(Popover, { label: "Open", children, ariaRole });
      expect(trigger(rendered.container)).toHaveAttribute("aria-haspopup", ariaRole);
      expect(panel(rendered.container)).toHaveAttribute("role", ariaRole);
      rendered.unmount();
    }
  });

  test("supports manual popover mode", () => {
    const auto = render(Popover, { label: "Open", children });
    expect(panel(auto.container)).toHaveAttribute("popover", "auto");
    auto.unmount();

    const manual = render(Popover, { label: "Open", children, manual: true });
    expect(panel(manual.container)).toHaveAttribute("popover", "manual");
  });

  test("renders optional arrow hook", () => {
    const plain = render(Popover, { label: "Open", children });
    expect(panel(plain.container).querySelector(`.${PARTS.EXTRA}`)).toBeNull();
    plain.unmount();

    const rendered = render(Popover, { label: "Open", children, arrow: true });
    const arrow = panel(rendered.container).querySelector(`.${PARTS.EXTRA}`) as HTMLDivElement;
    expect(arrow).toBeInTheDocument();
    expect(arrow).toHaveClass("svs-popover", PARTS.EXTRA, VARIANT.NEUTRAL);
    expect(arrow).toHaveAttribute("aria-hidden", "true");
  });

  test("forwards rest attributes and class to trigger", () => {
    const { container } = render(Popover, {
      label: "Open",
      children,
      class: "mine",
      "data-x": "y",
      type: "submit",
    } as any);

    expect(trigger(container)).toHaveClass("mine");
    expect(trigger(container)).toHaveAttribute("data-x", "y");
    expect(trigger(container)).toHaveAttribute("type", "submit");
    expect(panel(container)).not.toHaveClass("mine");
  });

  test("forwards rest event handlers to trigger", async () => {
    const onpointerenter = vi.fn();
    const onfocusin = vi.fn();
    const onpointerleave = vi.fn();
    const onfocusout = vi.fn();
    const { container } = render(Popover, { label: "Open", children, onpointerenter, onfocusin, onpointerleave, onfocusout } as any);
    const button = trigger(container);

    await fireEvent.pointerEnter(button);
    await fireEvent.focusIn(button);
    await fireEvent.pointerLeave(button);
    await fireEvent.focusOut(button);

    expect(onpointerenter).toHaveBeenCalledTimes(1);
    expect(onfocusin).toHaveBeenCalledTimes(1);
    expect(onpointerleave).toHaveBeenCalledTimes(1);
    expect(onfocusout).toHaveBeenCalledTimes(1);
  });

  test("defaults trigger type to button", () => {
    const { container } = render(Popover, { label: "Open", children });
    expect(trigger(container)).toHaveAttribute("type", "button");
  });

  test("binds element and runs attach on the trigger", () => {
    let attached: HTMLButtonElement | undefined;
    const attach = vi.fn((node: HTMLButtonElement) => {
      attached = node;
    });
    const props = $state({
      label: "Open",
      children,
      element: undefined as HTMLButtonElement | undefined,
      attach,
    });
    const { container } = render(Popover, props);

    expect(attached).toBe(trigger(container));
    expect(attach).toHaveBeenCalled();
    expect(props.element).toBe(trigger(container));
  });
});

describe("Popover positioning style", () => {
  test("sets default trigger and panel anchor styles", () => {
    const { container } = render(Popover, { label: "Open", children });

    expect(trigger(container).getAttribute("style")).toContain("anchor-name: --svs-popover");
    expect(panel(container).getAttribute("style")).toContain("position-anchor: --svs-popover");
    expect(panel(container).getAttribute("style")).toContain("position-area: bottom span-right");
    expect(panel(container).getAttribute("style")).toContain("position-try-fallbacks: flip-block, flip-inline");
  });

  test("maps position and align combinations", () => {
    const top = render(Popover, { label: "Open", children, position: "top", align: "center" });
    expect(panel(top.container).getAttribute("style")).toContain("position-area: top center");
    top.unmount();

    const right = render(Popover, { label: "Open", children, position: "right", align: "end" });
    expect(panel(right.container).getAttribute("style")).toContain("position-area: right span-top");
    right.unmount();

    const left = render(Popover, { label: "Open", children, position: "left", align: "start" });
    expect(panel(left.container).getAttribute("style")).toContain("position-area: left span-bottom");
  });

  test("adds offset on the correct side", () => {
    const bottom = render(Popover, { label: "Open", children, offset: 8 });
    expect(panel(bottom.container).getAttribute("style")).toContain("margin-top: 8px");
    bottom.unmount();

    const right = render(Popover, { label: "Open", children, position: "right", offset: 8 });
    expect(panel(right.container).getAttribute("style")).toContain("margin-left: 8px");
    right.unmount();

    const none = render(Popover, { label: "Open", children, offset: 0 });
    expect(panel(none.container).getAttribute("style")).not.toContain("margin-");
  });

  test("adds match width and auto flip options", () => {
    const matched = render(Popover, { label: "Open", children, matchWidth: true });
    expect(panel(matched.container).getAttribute("style")).toContain("min-width: anchor-size(width)");
    expect(panel(matched.container).getAttribute("style")).toContain("position-try-fallbacks");
    matched.unmount();

    const fixed = render(Popover, { label: "Open", children, autoFlip: false });
    expect(panel(fixed.container).getAttribute("style")).not.toContain("position-try-fallbacks");
    expect(panel(fixed.container).getAttribute("style")).not.toContain("min-width: anchor-size(width)");
  });
});

describe("Popover open sync", () => {
  test("initial open state shows the panel", async () => {
    const { container } = render(PopoverMenu, { open: true });

    await waitFor(() => expect(HTMLElement.prototype.showPopover).toHaveBeenCalledTimes(1));
    expect(trigger(container)).toHaveAttribute("aria-expanded", "true");
  });

  test("programmatic open shows the panel", async () => {
    const props = $state({ open: false });
    const { container } = render(PopoverMenu, props);
    const show = vi.spyOn(panel(container), "showPopover");

    props.open = true;
    await waitFor(() => expect(show).toHaveBeenCalledTimes(1));

    expect(trigger(container)).toHaveAttribute("aria-expanded", "true");
  });

  test("programmatic close hides the panel", async () => {
    const props = $state({ open: false });
    const { container } = render(PopoverMenu, props);
    const pop = panel(container);
    const hide = vi.spyOn(pop, "hidePopover");

    toggle(pop, "open");
    await flush();
    props.open = false;

    await waitFor(() => expect(hide).toHaveBeenCalledTimes(1));
    expect(trigger(container)).toHaveAttribute("aria-expanded", "false");
  });

  test("native toggle updates bound open", async () => {
    const props = $state({ open: false });
    const { container } = render(PopoverMenu, props);
    const pop = panel(container);

    toggle(pop, "open");
    await flush();
    expect(props.open).toBe(true);
    expect(trigger(container)).toHaveAttribute("aria-expanded", "true");

    toggle(pop, "closed");
    await flush();
    expect(props.open).toBe(false);
    expect(trigger(container)).toHaveAttribute("aria-expanded", "false");
  });

  test("native toggle does not re-enter showPopover", async () => {
    const props = $state({ open: false });
    const { container } = render(PopoverMenu, props);
    const pop = panel(container);
    const show = vi.spyOn(pop, "showPopover");

    toggle(pop, "open");
    await flush();

    expect(props.open).toBe(true);
    expect(show).not.toHaveBeenCalled();
  });
});

describe("Popover MenuContainerContext integration", () => {
  test("themes nested MenuList through the container context", () => {
    const { container } = render(PopoverMenu, { open: true, variant: VARIANT.ACTIVE, styling: "ctx" });

    expect(menu(container)).toHaveClass("ctx", PARTS.WHOLE, VARIANT.ACTIVE);
  });

  test("focuses the first item when opened", async () => {
    const props = $state({ open: false });
    const { container } = render(PopoverMenu, props);

    props.open = true;

    await waitFor(() => expect(document.activeElement).toBe(item(container, "Cut")));
  });

  test("item activation closes the popover", async () => {
    const onselect = vi.fn();
    const props = $state({ open: false, onselect });
    const { container } = render(PopoverMenu, props);
    const pop = panel(container);
    const hide = vi.spyOn(pop, "hidePopover");

    toggle(pop, "open");
    await flush();
    await fireEvent.click(item(container, "Cut"));

    await waitFor(() => expect(hide).toHaveBeenCalledTimes(1));
    expect(onselect).toHaveBeenCalledTimes(1);
    expect(props.open).toBe(false);
  });
});

describe("Popover hover mode", () => {
  test("opens on pointerenter and focusin", async () => {
    const pointer = $state({ open: false, hover: true });
    const pointerRender = render(PopoverMenu, pointer);
    const pointerShow = vi.spyOn(panel(pointerRender.container), "showPopover");

    await fireEvent.pointerEnter(trigger(pointerRender.container));
    await waitFor(() => expect(pointerShow).toHaveBeenCalledTimes(1));
    expect(pointer.open).toBe(true);
    pointerRender.unmount();

    const focus = $state({ open: false, hover: true });
    const focusRender = render(PopoverMenu, focus);
    const focusShow = vi.spyOn(panel(focusRender.container), "showPopover");

    await fireEvent.focusIn(trigger(focusRender.container));
    await waitFor(() => expect(focusShow).toHaveBeenCalled());
    expect(focus.open).toBe(true);
  });

  test("stays open moving into panel and closes leaving both", async () => {
    const props = $state({ open: false, hover: true });
    const { container } = render(PopoverMenu, props);
    const button = trigger(container);
    const pop = panel(container);
    const hide = vi.spyOn(pop, "hidePopover");

    await fireEvent.pointerEnter(button);
    await waitFor(() => expect(props.open).toBe(true));
    toggle(pop, "open");
    await flush();
    button.dispatchEvent(new MouseEvent("pointerleave", { bubbles: true, relatedTarget: pop }));
    await flush();
    expect(props.open).toBe(true);

    button.dispatchEvent(new MouseEvent("pointerleave", { bubbles: true, relatedTarget: document.body }));
    await waitFor(() => expect(hide).toHaveBeenCalledTimes(1));
    expect(props.open).toBe(false);
  });

  test("does not open on hover when hover mode is disabled", async () => {
    const props = $state({ open: false });
    const { container } = render(PopoverMenu, props);
    const show = vi.spyOn(panel(container), "showPopover");

    await fireEvent.pointerEnter(trigger(container));
    await flush();

    expect(show).not.toHaveBeenCalled();
    expect(props.open).toBe(false);
  });

  test("composes trigger event handlers with hover behavior", async () => {
    const onpointerenter = vi.fn();
    const onfocusin = vi.fn();
    const onpointerleave = vi.fn();
    const onfocusout = vi.fn();
    const props = $state({ label: "Open", children, hover: true, open: false, onpointerenter, onfocusin, onpointerleave, onfocusout });
    const { container } = render(Popover, props as any);
    const button = trigger(container);
    const pop = panel(container);

    await fireEvent.pointerEnter(button);
    await waitFor(() => expect(props.open).toBe(true));
    expect(onpointerenter).toHaveBeenCalledTimes(1);

    toggle(pop, "open");
    await flush();
    await fireEvent.pointerLeave(button, { relatedTarget: document.body });
    await waitFor(() => expect(props.open).toBe(false));
    expect(onpointerleave).toHaveBeenCalledTimes(1);

    await fireEvent.focusIn(button);
    await waitFor(() => expect(props.open).toBe(true));
    expect(onfocusin).toHaveBeenCalledTimes(1);

    toggle(pop, "open");
    await flush();
    await fireEvent.focusOut(button, { relatedTarget: document.body });
    await waitFor(() => expect(props.open).toBe(false));
    expect(onfocusout).toHaveBeenCalledTimes(1);
  });
});
