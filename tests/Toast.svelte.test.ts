import { afterEach, describe, expect, test, vi } from "vitest";
import { render } from "vitest-browser-svelte";
import { createRawSnippet, tick } from "svelte";
import Toast, { createToaster, type ToastItem } from "#svs/Toast.svelte";
import { PARTS, VARIANT } from "#svs/core";
import ToastSnippetProbe from "./fixtures/ToastSnippetProbe.svelte";

const testid = "test-toast";
const children = createRawSnippet<[ToastItem, string]>((item, variant) => ({
  render: () => `<div data-testid="${testid}">${item().message}-${item().type}-${item().id}-${variant()}</div>`,
}));
const region = (c: HTMLElement) => c.querySelector('[role="region"]') as HTMLElement;
const statuses = (c: HTMLElement) => [...c.querySelectorAll('[role="status"]')] as HTMLElement[];
const alerts = (c: HTMLElement) => [...c.querySelectorAll('[role="alert"]')] as HTMLElement[];
const probe = (c: HTMLElement, id: string) => c.querySelector(`[data-testid="${id}"]`) as HTMLElement;

function matchMediaMock(matches: boolean) {
  return vi.fn().mockImplementation((query) => ({
    matches,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
}
function setup(options?: Parameters<typeof createToaster>[0], props: Record<string, unknown> = {}) {
  const toaster = createToaster(options);
  return { toaster, ...render(Toast, { toaster, children, ...props }) };
}

afterEach(() => {
  document.querySelectorAll(":popover-open").forEach((el) => (el as HTMLElement & { hidePopover(): void }).hidePopover());
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe("Toast component initialization", () => {
  test("[T-1] renders with minimal props", () => {
    const { container } = setup();
    const el = region(container);
    expect(el.getAttribute("role")).toBe("region");
    expect(el.getAttribute("tabindex")).toBe("-1");
    expect(el.getAttribute("popover")).toBe("manual");
    expect(el.getAttribute("aria-label")).toBe("0 notifications");
    expect(el.matches(":popover-open")).toBe(false);
  });

  test("[T-2] sets default variant", async () => {
    const { container } = setup(undefined, { variant: VARIANT.NEUTRAL });
    await expect.element(region(container)).toHaveClass("svs-toast", PARTS.WHOLE, VARIANT.NEUTRAL);
  });

  test("[T-3] preserves custom variant", () => {
    const toaster = createToaster();
    const props = $state({ toaster, children, variant: "warning" });
    render(Toast, props);
    expect(props.variant).toBe("warning");
  });

  test("[T-4] handles prefers-reduced-motion", async () => {
    vi.stubGlobal("matchMedia", matchMediaMock(true));
    const { toaster, container } = setup({ duration: Infinity });
    const el = region(container);
    const id = toaster.add("Reduced motion");
    await expect.element(el).toHaveAttribute("aria-label", "1 notifications");
    toaster.dismiss(id);
    await expect.element(el).toHaveAttribute("aria-label", "0 notifications");
  });
});

describe("Toaster management", () => {
  test("[T-5] add() adds toast", async () => {
    const { toaster, container } = setup();
    const id = toaster.add("Test message");
    expect(id).toBeTruthy();
    await expect.element(region(container)).toHaveAttribute("aria-label", "1 notifications");
  });
  test("[T-6] dismiss() then removal", async () => {
    const { toaster, container } = setup();
    const el = region(container);
    const id = toaster.add("Test message");
    await expect.element(el).toHaveAttribute("aria-label", "1 notifications");
    toaster.dismiss(id);
    await expect.element(el).toHaveAttribute("aria-label", "0 notifications");
  });
  test("[T-7] multiple add/dismiss", async () => {
    const { toaster, container } = setup();
    const el = region(container);
    toaster.add("Message 1", { type: "info" });
    const id = toaster.add("Message 2", { type: "warning" });
    toaster.add("Message 3", { type: "error" });
    await expect.element(el).toHaveAttribute("aria-label", "3 notifications");
    toaster.dismiss(id);
    await expect.element(el).toHaveAttribute("aria-label", "2 notifications");
  });
  test("[T-8] independent toasters", async () => {
    const a = setup();
    const b = setup();
    a.toaster.add("A");
    await expect.element(region(a.container)).toHaveAttribute("aria-label", "1 notifications");
    expect(region(b.container).getAttribute("aria-label")).toBe("0 notifications");
  });
  test("[T-9] add returns id usable by dismiss", async () => {
    const { toaster, container } = setup();
    const el = region(container);
    expect(() => toaster.dismiss("nope")).not.toThrow();
    const id = toaster.add("Message");
    await expect.element(el).toHaveAttribute("aria-label", "1 notifications");
    toaster.dismiss(id);
    await expect.element(el).toHaveAttribute("aria-label", "0 notifications");
  });
  test("[T-10] remove() drops immediately", async () => {
    const { toaster, container } = setup();
    const el = region(container);
    const id = toaster.add("Message");
    await expect.element(el).toHaveAttribute("aria-label", "1 notifications");
    toaster.remove(id);
    await expect.element(el).toHaveAttribute("aria-label", "0 notifications");
  });
  test("[T-11] clear() dismisses all", async () => {
    const { toaster, container } = setup();
    const el = region(container);
    toaster.add("Message 1");
    toaster.add("Message 2");
    toaster.add("Message 3");
    await expect.element(el).toHaveAttribute("aria-label", "3 notifications");
    toaster.clear();
    await expect.element(el).toHaveAttribute("aria-label", "0 notifications");
  });
  test("[T-12] pause/resume on unknown id no-op", () => {
    const toaster = createToaster();
    expect(() => toaster.pause("nope")).not.toThrow();
    expect(() => toaster.resume("nope")).not.toThrow();
  });
});

describe("Duration behavior", () => {
  test("[T-13] auto-dismiss after toaster duration", async () => {
    const { toaster, container } = setup({ duration: 500 });
    toaster.add("Auto dismiss message");
    await expect.element(region(container)).toHaveAttribute("aria-label", "1 notifications");
    await vi.waitFor(() => expect(region(container).getAttribute("aria-label")).toBe("0 notifications"), { timeout: 1500 });
  });
  test("[T-16] per-toast duration overrides toaster default", async () => {
    const { toaster, container } = setup({ duration: 1000 });
    toaster.add("Override", { duration: 100 });
    await expect.element(region(container)).toHaveAttribute("aria-label", "1 notifications");
    await expect.element(region(container)).toHaveAttribute("aria-label", "0 notifications");
  });
});

describe("Toast display and interaction", () => {
  test("[T-17] children receives item and leave state uses effective variant", async () => {
    const { toaster, container } = setup(undefined, { variant: "primary" });
    const id = toaster.add("Display message", { type: "success" });
    await tick();
    const el = probe(container, testid);
    expect(el.textContent).toContain("Display message");
    expect(el.textContent).toContain("success");
    expect(el.textContent).toContain(id);
    toaster.dismiss(id);
    await tick();
    await expect.element(statuses(container)[0]).toHaveClass(PARTS.MAIN, VARIANT.INACTIVE);
  });
  test("[T-18] children snippet receives updated effective variant", async () => {
    const toaster = createToaster();
    const { container } = render(ToastSnippetProbe, { toaster, variant: "primary" });
    const id = toaster.add("Compiled snippet", { type: "success" });
    await tick();
    await expect.element(statuses(container)[0]).toHaveClass(PARTS.MAIN, "primary");
    await expect.element(probe(container, "toast-snippet-probe")).toHaveTextContent(`Compiled snippet-success-${id}-primary`);
    toaster.dismiss(id);
    await tick();
    await expect.element(statuses(container)[0]).toHaveClass(PARTS.MAIN, VARIANT.INACTIVE);
    await expect.element(probe(container, "toast-snippet-probe")).toHaveTextContent(`Compiled snippet-success-${id}-${VARIANT.INACTIVE}`);
  });
  test("[T-19] type feeds status aria-label", async () => {
    const { toaster, container } = setup();
    toaster.add("Typed", { type: "error" });
    toaster.add("Untyped");
    await tick();
    await expect.element(statuses(container)[0]).toHaveAttribute("aria-label", "error message");
    await expect.element(statuses(container)[1]).toHaveAttribute("aria-label", "message");
  });
  test("[T-20] assertive option selects alert role", async () => {
    const direct = setup();
    direct.toaster.add("Polite");
    direct.toaster.add("Urgent", { assertive: true });
    await tick();
    expect(statuses(direct.container)).toHaveLength(1);
    expect(alerts(direct.container)).toHaveLength(1);

    const defaults = setup({ assertive: true });
    defaults.toaster.add("Default urgent");
    await tick();
    expect(statuses(defaults.container)).toHaveLength(0);
    expect(alerts(defaults.container)).toHaveLength(1);
  });
});

describe("Keyboard navigation", () => {
  test("[T-23] F6 key focuses toast container", async () => {
    const { toaster, container } = setup();
    const el = region(container);
    toaster.add("Focus message");
    await expect.element(el).toHaveAttribute("aria-label", "1 notifications");
    document.body.dispatchEvent(new KeyboardEvent("keydown", { key: "F6", bubbles: true, composed: false }));
    await tick();
    await expect.element(el).toHaveFocus();
  });
  test("[T-24] F6 key with composed event is ignored", async () => {
    const { toaster, container } = setup();
    const el = region(container);
    toaster.add("Composed message");
    await expect.element(el).toHaveAttribute("aria-label", "1 notifications");
    document.body.dispatchEvent(new KeyboardEvent("keydown", { key: "F6", bubbles: true, composed: true }));
    await tick();
    expect(document.activeElement).not.toBe(el);
  });
  test("[T-25] other keys are ignored", async () => {
    const { toaster, container } = setup();
    const el = region(container);
    toaster.add("Other key message");
    await expect.element(el).toHaveAttribute("aria-label", "1 notifications");
    document.body.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true, composed: false }));
    document.body.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true, composed: false }));
    await tick();
    expect(document.activeElement).not.toBe(el);
  });
});

describe("Styling and lifecycle", () => {
  const preset = "svs-toast";
  test("[T-26] applies CSS classes correctly", async () => {
    const { toaster, container } = setup(undefined, { variant: VARIANT.NEUTRAL });
    toaster.add("Styled message");
    await tick();
    await expect.element(region(container)).toHaveClass(preset, PARTS.WHOLE, VARIANT.NEUTRAL);
    await expect
      .element(container.querySelector(`[class*="${PARTS.MIDDLE}"]`) as HTMLElement)
      .toHaveClass(preset, PARTS.MIDDLE, VARIANT.NEUTRAL);
    await expect.element(statuses(container)[0]).toHaveClass(preset, PARTS.MAIN, VARIANT.NEUTRAL);
  });
  test("[T-27] INACTIVE while leaving", async () => {
    const { toaster, container } = setup(undefined, { variant: "custom" });
    const id = toaster.add("Hide message");
    await tick();
    await expect.element(statuses(container)[0]).toHaveClass(PARTS.MAIN, "custom");
    toaster.dismiss(id);
    await expect.element(statuses(container)[0]).toHaveClass(PARTS.MAIN, VARIANT.INACTIVE);
  });
  test("[T-28] custom styling", async () => {
    const { toaster, container } = setup(undefined, { styling: "custom-toast-style" });
    toaster.add("Custom styled message");
    await tick();
    await expect.element(region(container)).toHaveClass("custom-toast-style", PARTS.WHOLE);
  });
  test("[T-29] real Popover lifecycle", async () => {
    const { toaster, container } = setup();
    const el = region(container);
    const id = toaster.add("Popover message");
    await expect.element(el).toHaveAttribute("aria-label", "1 notifications");
    expect(el.matches(":popover-open")).toBe(true);
    toaster.dismiss(id);
    await expect.element(el).toHaveAttribute("aria-label", "0 notifications");
    expect(el.matches(":popover-open")).toBe(false);
  });
  test("[T-30] flip duration from motion prop", async () => {
    const motion = 600;
    const { toaster, container } = setup({ duration: Infinity }, { motion });
    const el = region(container);
    const first = toaster.add("First message");
    toaster.add("Second message");
    await tick();
    await expect.element(el).toHaveAttribute("aria-label", "2 notifications");
    expect(statuses(container)).toHaveLength(2);
    // dismiss flips the leaving status to INACTIVE immediately and defers its removal by `motion` (600ms)
    toaster.dismiss(first);
    await expect.element(statuses(container)[0]).toHaveClass(PARTS.MAIN, VARIANT.INACTIVE);
    // still present at 300ms — past the 200ms default, proving the motion prop governs the removal delay
    await new Promise((r) => setTimeout(r, 300));
    expect(el.getAttribute("aria-label")).toBe("2 notifications");
    // once the 600ms window elapses only the dismissed toast is removed (the other persists: duration Infinity)
    await vi.waitFor(() => expect(el.getAttribute("aria-label")).toBe("1 notifications"), { timeout: 2000 });
    expect(statuses(container)).toHaveLength(1);
  });
});
