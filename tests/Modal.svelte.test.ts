import axe from "axe-core";
import { afterEach, describe, expect, test, vi } from "vitest";
import { userEvent } from "vitest/browser";
import { render as browserRender } from "vitest-browser-svelte";
import { createRawSnippet, tick } from "svelte";
import Modal from "#svs/Modal.svelte";
import { PARTS, VARIANT } from "#svs/core";

import type { AxeMatchers } from "vitest-axe/matchers";

declare module "vitest" {
  interface Assertion<T = any> extends AxeMatchers {}
}

afterEach(() => {
  document.querySelectorAll("dialog[open]").forEach((dialog) => (dialog as HTMLDialogElement).remove());
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

const childrenText = "Modal content";
const ariaLabel = "Test modal";
const preset = "svs-modal";
const childrenSnippet = createRawSnippet(() => ({ render: () => `<p>${childrenText}</p>` }));
const byText = (container: HTMLElement, text: string) => Array.from(container.querySelectorAll("*")).find((el) => el.textContent?.trim() === text) as HTMLElement;
const render = (component: Parameters<typeof browserRender>[0], props?: Parameters<typeof browserRender>[1]) => {
  const screen = browserRender(component, props);
  return { ...screen, getByText: (text: string) => byText(screen.container, text) };
};
const dialog = (container: HTMLElement) => container.querySelector("dialog") as HTMLDialogElement;

describe("Modal basic functionality", () => {
  test("is closed by default and opens at mount", async () => {
    const closed = render(Modal, { children: childrenSnippet });
    expect(dialog(closed.container).hasAttribute("open")).toBe(false);
    expect(dialog(closed.container).open).toBe(false);
    const opened = render(Modal, { children: childrenSnippet, open: true });
    const el = dialog(opened.container);
    await tick(); await expect.element(el).toHaveAttribute("open");
    expect(el.open).toBe(true);
  });

  test("renders children, aria label, and element binding", async () => {
    const props = $state({ children: childrenSnippet, element: undefined as HTMLDialogElement | undefined, ariaLabel, open: true });
    const { container, getByText } = render(Modal, props);
    const el = dialog(container); await tick();
    expect(el.contains(getByText(childrenText))).toBe(true);
    await expect.element(el).toHaveAttribute("aria-label", ariaLabel);
    expect(props.element).toBeInstanceOf(HTMLDialogElement);
  });
});

describe("Modal open and close behavior", () => {
  test("opens and closes programmatically", async () => {
    const props = $state({ children: childrenSnippet, open: false });
    const { container } = render(Modal, props);
    const el = dialog(container);
    expect(el.open).toBe(false);
    props.open = true; await tick(); await expect.element(el).toHaveAttribute("open"); expect(el.open).toBe(true);
    props.open = false; await tick(); expect(el.hasAttribute("open")).toBe(false); expect(el.open).toBe(false);
  });

  test("uses target-precise backdrop and content clicks", async () => {
    const closable = $state({ children: childrenSnippet, open: true, closable: true });
    const closeRender = render(Modal, closable);
    const backdrop = dialog(closeRender.container); await tick(); backdrop.click(); await tick();
    expect(closable.open).toBe(false);
    const fixed = $state({ children: childrenSnippet, open: true, closable: false });
    const fixedRender = render(Modal, fixed);
    const fixedDialog = dialog(fixedRender.container); await tick(); fixedDialog.click(); await tick();
    expect(fixed.open).toBe(true);
    const content = $state({ children: childrenSnippet, open: true, closable: true });
    const contentRender = render(Modal, content); await tick();
    await userEvent.click(byText(contentRender.container, childrenText)); await tick();
    expect(content.open).toBe(true);
  });

  test("handles Escape and native toggle synchronization", async () => {
    const blocked = render(Modal, { children: childrenSnippet, open: true, closable: false });
    const blockedDialog = dialog(blocked.container); await tick();
    const escape = new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true });
    blockedDialog.dispatchEvent(escape); expect(escape.defaultPrevented).toBe(true); expect(blockedDialog.open).toBe(true);
    const allowed = render(Modal, { children: childrenSnippet, open: true, closable: true });
    const allowedEscape = new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true });
    dialog(allowed.container).dispatchEvent(allowedEscape); expect(allowedEscape.defaultPrevented).toBe(false);
    const props = $state({ children: childrenSnippet, open: true });
    const synced = render(Modal, props); const syncedDialog = dialog(synced.container); await tick();
    syncedDialog.open = false; syncedDialog.dispatchEvent(new Event("toggle")); await tick();
    expect(props.open).toBe(false);
  });
});

describe("Modal styling and duration", () => {
  test("applies variants, styling, structure, and reactive variant changes", async () => {
    const props = $state({ children: childrenSnippet, open: true, variant: VARIANT.NEUTRAL as string });
    const { container } = render(Modal, props); const el = dialog(container); await tick();
    await expect.element(el).toHaveClass(preset, PARTS.WHOLE, VARIANT.NEUTRAL);
    expect(el.children).toHaveLength(1); expect(el.firstElementChild?.tagName).toBe("P");
    props.variant = VARIANT.ACTIVE; await tick(); await expect.element(el).toHaveClass(preset, PARTS.WHOLE, VARIANT.ACTIVE);
    props.open = false; await tick(); expect(props.variant).toBe(VARIANT.ACTIVE);
    props.open = true; await tick(); await expect.element(el).toHaveClass(preset, PARTS.WHOLE, VARIANT.ACTIVE);
    const styled = render(Modal, { children: childrenSnippet, open: true, styling: "custom-modal" }); await tick();
    await expect.element(dialog(styled.container)).toHaveClass("custom-modal", PARTS.WHOLE, VARIANT.NEUTRAL);
    const objectStyled = render(Modal, { children: childrenSnippet, open: true, styling: { whole: { base: "modal-base", neutral: "modal-neutral" } } }); await tick();
    await expect.element(dialog(objectStyled.container)).toHaveClass("modal-base", "modal-neutral");
    const custom = render(Modal, { children: childrenSnippet, open: true, variant: "custom-variant" }); await tick();
    await expect.element(dialog(custom.container)).toHaveClass(preset, PARTS.WHOLE, "custom-variant");
  });

  test("emits normal, reduced-motion, renamed, and invalid duration values", async () => {
    const normal = render(Modal, { children: childrenSnippet, open: true }); await tick();
    expect(dialog(normal.container).style.getPropertyValue("--svs-duration")).toBe("200ms");
    const custom = render(Modal, { children: childrenSnippet, open: true, duration: 500 }); await tick();
    expect(dialog(custom.container).style.getPropertyValue("--svs-duration")).toBe("500ms");
    const renamed = render(Modal, { children: childrenSnippet, open: true, cssvar: { duration: "--x" } }); await tick();
    expect(dialog(renamed.container).style.getPropertyValue("--svs-duration")).toBe("var(--x, 200ms)");
    const invalid = $state({ children: childrenSnippet, open: true, duration: -1 });
    const invalidRender = render(Modal, invalid); const invalidDialog = dialog(invalidRender.container); await tick();
    expect(invalidDialog.style.getPropertyValue("--svs-duration")).toBe("200ms");
    invalid.duration = NaN; await tick(); expect(invalidDialog.style.getPropertyValue("--svs-duration")).toBe("200ms");
    invalid.duration = 1.5; await tick(); expect(invalidDialog.style.getPropertyValue("--svs-duration")).toBe("200ms");
    vi.stubGlobal("matchMedia", (query: string) => ({ matches: true, media: query, onchange: null, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, dispatchEvent: () => false }));
    const reduced = render(Modal, { children: childrenSnippet, open: true }); await tick();
    expect(dialog(reduced.container).style.getPropertyValue("--svs-duration")).toBe("0ms");
  });
});

describe("Modal event passthrough and edge cases", () => {
  test("runs passthrough handlers before its own close, key, and toggle behavior", async () => {
    const onclick = vi.fn(); const clickProps = $state({ children: childrenSnippet, open: true, closable: true, onclick });
    const clicked = render(Modal, clickProps); const clickedDialog = dialog(clicked.container); await tick(); clickedDialog.click(); await tick();
    expect(onclick).toHaveBeenCalledTimes(1); expect(clickProps.open).toBe(false);
    const onkeydown = vi.fn(); const keyed = render(Modal, { children: childrenSnippet, open: true, closable: false, onkeydown });
    const key = new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true }); dialog(keyed.container).dispatchEvent(key);
    expect(onkeydown).toHaveBeenCalledTimes(1); expect(key.defaultPrevented).toBe(true);
    const ontoggle = vi.fn(); const toggleProps = $state({ children: childrenSnippet, open: true, ontoggle });
    const toggled = render(Modal, toggleProps); const toggledDialog = dialog(toggled.container); await tick(); toggledDialog.open = false; toggledDialog.dispatchEvent(new Event("toggle")); await tick();
    expect(ontoggle).toHaveBeenCalledTimes(1); expect(toggleProps.open).toBe(false);
    const blockedClick = vi.fn(); const blockedProps = $state({ children: childrenSnippet, open: true, closable: false, onclick: blockedClick });
    const blocked = render(Modal, blockedProps); await tick(); dialog(blocked.container).click(); await tick();
    expect(blockedClick).toHaveBeenCalledTimes(1); expect(blockedProps.open).toBe(true);
  });

  test("reopens synchronously and supports complex children", async () => {
    const props = $state({ children: childrenSnippet, open: true }); const rendered = render(Modal, props); const el = dialog(rendered.container); await tick();
    props.open = false; await tick(); props.open = true; await tick();
    expect(el.open).toBe(true); await expect.element(el).toHaveAttribute("open");
    const complex = createRawSnippet(() => ({ render: () => "<div><h2>Modal Title</h2><p>Some content</p><button>Action</button></div>" }));
    const contents = render(Modal, { children: complex, open: true }); await tick();
    expect(byText(contents.container, "Modal Title")?.isConnected).toBe(true);
    expect(byText(contents.container, "Some content")?.isConnected).toBe(true);
    expect(byText(contents.container, "Action")?.isConnected).toBe(true);
  });
});

describe("accessibility (axe)", () => {
  test("closed render has no violations", async () => {
    const { container } = render(Modal, { children: childrenSnippet });

    expect(await axe.run(container)).toHaveNoViolations();
  });

  test("open render has no violations", async () => {
    const { container } = render(Modal, { children: childrenSnippet, open: true });
    await tick();

    expect(await axe.run(container)).toHaveNoViolations();
  });
});
