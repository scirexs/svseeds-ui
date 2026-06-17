import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { configure, fireEvent, render, waitFor, within } from "@testing-library/svelte";
import { createRawSnippet, tick } from "svelte";
import Toast, { createToaster, type ToastItem } from "#svs/Toast.svelte";
import { PARTS, VARIANT } from "#svs/core";
import ToastSnippetProbe from "./fixtures/ToastSnippetProbe.svelte";

const testid = "test-toast";
const DEFAULT_ANIMATION = 200;
const DEFAULT_DISMISS = 30000;
const children = createRawSnippet<[ToastItem, string]>((item, variant) => ({
  render: () => `<div data-testid="${testid}">${item().message}-${item().type}-${item().id}-${variant()}</div>`,
}));

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

HTMLElement.prototype.showPopover = vi.fn();
HTMLElement.prototype.hidePopover = vi.fn();

beforeEach(() => {
  vi.useFakeTimers();
  configure({ defaultHidden: true });
});

afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.clearAllMocks();
  configure({ defaultHidden: false });
});

async function flush() {
  await Promise.resolve();
  await tick();
}

async function advance(ms: number) {
  await vi.advanceTimersByTimeAsync(ms);
  await tick();
}

function setup(options?: Parameters<typeof createToaster>[0], props: Partial<Parameters<typeof render<typeof Toast>>[1]> = {}) {
  const toaster = createToaster(options);
  const rendered = render(Toast, { toaster, children, ...props });
  return { toaster, ...rendered };
}

describe("Toast component initialization", () => {
  test("renders with minimal props", () => {
    const { getByRole } = setup();

    const region = getByRole("region");
    expect(region).toBeTruthy();
    expect(region).toHaveAttribute("role", "region");
    expect(region).toHaveAttribute("tabindex", "-1");
    expect(region).toHaveAttribute("popover", "manual");
    expect(region).toHaveAttribute("aria-label", "0 notifications");
  });

  test("sets default variant", () => {
    const { getByRole } = setup(undefined, { variant: VARIANT.NEUTRAL });

    expect(getByRole("region")).toHaveClass("svs-toast", PARTS.WHOLE, VARIANT.NEUTRAL);
  });

  test("preserves custom variant", () => {
    const toaster = createToaster();
    const props = $state({ toaster, children, variant: "warning" });
    render(Toast, props);

    expect(props.variant).toBe("warning");
  });

  test("handles prefers-reduced-motion", async () => {
    vi.resetModules();
    const mockMatchMedia = vi.fn().mockReturnValue({ matches: true });
    window.matchMedia = mockMatchMedia;

    await import("#svs/Toast.svelte");

    expect(mockMatchMedia).toHaveBeenCalledWith("(prefers-reduced-motion: reduce)");
  });
});

describe("Toaster management", () => {
  test("add() adds toast", async () => {
    const { toaster, getByRole } = setup();
    const region = getByRole("region");

    const id = toaster.add("Test message");
    expect(id).toBeTruthy();

    await waitFor(() => expect(region).toHaveAttribute("aria-label", "1 notifications"));
  });

  test("dismiss() then removal", async () => {
    const { toaster, getByRole } = setup();
    const region = getByRole("region");

    const id = toaster.add("Test message");
    await waitFor(() => expect(region).toHaveAttribute("aria-label", "1 notifications"));
    toaster.dismiss(id);
    await advance(DEFAULT_ANIMATION);

    await waitFor(() => expect(region).toHaveAttribute("aria-label", "0 notifications"));
  });

  test("multiple add/dismiss", async () => {
    const { toaster, getByRole } = setup();
    const region = getByRole("region");

    toaster.add("Message 1", { type: "info" });
    const id2 = toaster.add("Message 2", { type: "warning" });
    toaster.add("Message 3", { type: "error" });
    await waitFor(() => expect(region).toHaveAttribute("aria-label", "3 notifications"));
    toaster.dismiss(id2);
    await advance(DEFAULT_ANIMATION);

    await waitFor(() => expect(region).toHaveAttribute("aria-label", "2 notifications"));
  });

  test("independent toasters", async () => {
    const a = setup();
    const b = setup();
    const regionA = within(a.container).getByRole("region");
    const regionB = within(b.container).getByRole("region");

    a.toaster.add("A");
    await waitFor(() => expect(regionA).toHaveAttribute("aria-label", "1 notifications"));

    expect(regionB).toHaveAttribute("aria-label", "0 notifications");
  });

  test("add returns id usable by dismiss", async () => {
    const { toaster, getByRole } = setup();
    const region = getByRole("region");

    expect(() => toaster.dismiss("nope")).not.toThrow();
    const id = toaster.add("Message");
    toaster.dismiss(id);
    await advance(DEFAULT_ANIMATION);

    await waitFor(() => expect(region).toHaveAttribute("aria-label", "0 notifications"));
  });

  test("remove() drops immediately", async () => {
    const { toaster, getByRole } = setup();
    const region = getByRole("region");

    const id = toaster.add("Message");
    await waitFor(() => expect(region).toHaveAttribute("aria-label", "1 notifications"));
    toaster.remove(id);

    await waitFor(() => expect(region).toHaveAttribute("aria-label", "0 notifications"));
  });

  test("clear() dismisses all", async () => {
    const { toaster, getByRole } = setup();
    const region = getByRole("region");

    toaster.add("Message 1");
    toaster.add("Message 2");
    toaster.add("Message 3");
    await waitFor(() => expect(region).toHaveAttribute("aria-label", "3 notifications"));
    toaster.clear();
    await advance(DEFAULT_ANIMATION);

    await waitFor(() => expect(region).toHaveAttribute("aria-label", "0 notifications"));
  });

  test("pause/resume on unknown id no-op", () => {
    const toaster = createToaster();

    expect(() => toaster.pause("nope")).not.toThrow();
    expect(() => toaster.resume("nope")).not.toThrow();
  });
});

describe("Duration behavior", () => {
  test("auto-dismiss after toaster duration", async () => {
    const timeout = 500;
    const { toaster, getByRole } = setup({ duration: timeout });
    const region = getByRole("region");

    toaster.add("Auto dismiss message");
    await flush();
    await advance(timeout);
    expect(getByRole("dialog")).toHaveClass(PARTS.MAIN, VARIANT.INACTIVE);
    await advance(DEFAULT_ANIMATION);

    await waitFor(() => expect(region).toHaveAttribute("aria-label", "0 notifications"));
  });

  test("default safety-net auto-dismiss (30 s)", async () => {
    const { toaster, getByRole } = setup();
    const region = getByRole("region");

    toaster.add("Safety net");
    await waitFor(() => expect(region).toHaveAttribute("aria-label", "1 notifications"));
    await advance(DEFAULT_DISMISS - 1);
    expect(region).toHaveAttribute("aria-label", "1 notifications");
    await advance(1 + DEFAULT_ANIMATION);

    await waitFor(() => expect(region).toHaveAttribute("aria-label", "0 notifications"));
  });

  test("Infinity persists", async () => {
    const persistent = setup({ duration: Infinity });
    const finite = setup({ duration: 100 });
    const persistentRegion = within(persistent.container).getByRole("region");
    const finiteRegion = within(finite.container).getByRole("region");

    persistent.toaster.add("Persistent");
    finite.toaster.add("One off", { duration: Infinity });
    await waitFor(() => expect(persistentRegion).toHaveAttribute("aria-label", "1 notifications"));
    await waitFor(() => expect(finiteRegion).toHaveAttribute("aria-label", "1 notifications"));
    await advance(DEFAULT_DISMISS + DEFAULT_ANIMATION + 1000);

    expect(persistentRegion).toHaveAttribute("aria-label", "1 notifications");
    expect(finiteRegion).toHaveAttribute("aria-label", "1 notifications");
  });

  test("per-toast duration overrides toaster default", async () => {
    const { toaster, getByRole } = setup({ duration: 1000 });
    const region = getByRole("region");

    toaster.add("Override", { duration: 100 });
    await waitFor(() => expect(region).toHaveAttribute("aria-label", "1 notifications"));
    await advance(100 + DEFAULT_ANIMATION);

    await waitFor(() => expect(region).toHaveAttribute("aria-label", "0 notifications"));
  });
});

describe("Toast display and interaction", () => {
  test("children receives item and leave state uses effective variant", async () => {
    const { toaster, getByRole, getByTestId } = setup(undefined, { variant: "primary" });

    const id = toaster.add("Display message", { type: "success" });
    await flush();
    const element = getByTestId(testid);
    expect(element.textContent).toContain("Display message");
    expect(element.textContent).toContain("success");
    expect(element.textContent).toContain(id);

    toaster.dismiss(id);
    await tick();

    expect(getByRole("dialog")).toHaveClass(PARTS.MAIN, VARIANT.INACTIVE);
  });

  test("children snippet receives updated effective variant", async () => {
    const toaster = createToaster();
    const { getByRole, getByTestId } = render(ToastSnippetProbe, { toaster, variant: "primary" });

    const id = toaster.add("Compiled snippet", { type: "success" });
    await flush();

    expect(getByRole("dialog")).toHaveClass(PARTS.MAIN, "primary");
    expect(getByTestId("toast-snippet-probe")).toHaveTextContent(`Compiled snippet-success-${id}-primary`);

    toaster.dismiss(id);
    await tick();

    expect(getByRole("dialog")).toHaveClass(PARTS.MAIN, VARIANT.INACTIVE);
    expect(getByTestId("toast-snippet-probe")).toHaveTextContent(
      `Compiled snippet-success-${id}-${VARIANT.INACTIVE}`,
    );
  });

  test("type feeds dialog aria-label", async () => {
    const { toaster, getAllByRole } = setup();

    toaster.add("Typed", { type: "error" });
    toaster.add("Untyped");
    await flush();

    const dialogs = getAllByRole("dialog");
    expect(dialogs[0]).toHaveAttribute("aria-label", "error message");
    expect(dialogs[1]).toHaveAttribute("aria-label", "message");
  });

  test("pointer-enter pauses auto-dismiss", async () => {
    const timeout = 300;
    const { toaster, getByRole } = setup({ duration: timeout });
    const region = getByRole("region");

    toaster.add("Hover message");
    await flush();
    await fireEvent.pointerEnter(getByRole("dialog"));
    await advance(timeout + DEFAULT_ANIMATION + 100);

    expect(region).toHaveAttribute("aria-label", "1 notifications");
  });

  test("pointer-leave (touch) re-arms x1.5", async () => {
    const timeout = 400;
    const { toaster, getByRole } = setup({ duration: timeout });
    const region = getByRole("region");

    toaster.add("Touch message");
    await flush();
    const dialog = getByRole("dialog");
    await fireEvent.pointerEnter(dialog);
    await fireEvent.pointerLeave(dialog, { pointerType: "touch" });
    await advance(timeout + 10);
    expect(region).toHaveAttribute("aria-label", "1 notifications");
    expect(getByRole("dialog")).toHaveClass(PARTS.MAIN, VARIANT.NEUTRAL);
    await advance(timeout * 0.5 - 10 + DEFAULT_ANIMATION);

    await waitFor(() => expect(region).toHaveAttribute("aria-label", "0 notifications"));
  });

  test("pointer-cancel re-arms", async () => {
    const timeout = 300;
    const { toaster, getByRole } = setup({ duration: timeout });
    const region = getByRole("region");

    toaster.add("Cancel message");
    await flush();
    const dialog = getByRole("dialog");
    await advance(timeout - 50);
    await fireEvent.pointerCancel(dialog, { pointerType: "mouse" });
    await advance(50 + DEFAULT_ANIMATION);

    expect(region).toHaveAttribute("aria-label", "1 notifications");
    expect(dialog).toHaveClass(PARTS.MAIN, VARIANT.NEUTRAL);
    await advance(50 + DEFAULT_ANIMATION);

    await waitFor(() => expect(region).toHaveAttribute("aria-label", "0 notifications"));
  });
});

describe("Keyboard navigation", () => {
  test("F6 key focuses toast container", async () => {
    const { toaster, getByRole } = setup();
    const region = getByRole("region");
    const focusSpy = vi.spyOn(region, "focus");
    const showPopoverSpy = vi.spyOn(region, "showPopover");

    toaster.add("Focus message");
    await waitFor(() => expect(showPopoverSpy).toHaveBeenCalled());
    document.body.dispatchEvent(new KeyboardEvent("keydown", { key: "F6", bubbles: true, composed: false }));

    expect(focusSpy).toHaveBeenCalled();
  });

  test("F6 key with composed event is ignored", async () => {
    const { toaster, getByRole } = setup();
    const region = getByRole("region");
    const focusSpy = vi.spyOn(region, "focus");
    const showPopoverSpy = vi.spyOn(region, "showPopover");

    toaster.add("Composed message");
    await waitFor(() => expect(showPopoverSpy).toHaveBeenCalled());
    document.body.dispatchEvent(new KeyboardEvent("keydown", { key: "F6", bubbles: true, composed: true }));

    expect(focusSpy).not.toHaveBeenCalled();
  });

  test("other keys are ignored", async () => {
    const { toaster, getByRole } = setup();
    const region = getByRole("region");
    const focusSpy = vi.spyOn(region, "focus");
    const showPopoverSpy = vi.spyOn(region, "showPopover");

    toaster.add("Other key message");
    await waitFor(() => expect(showPopoverSpy).toHaveBeenCalled());
    document.body.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true, composed: false }));
    document.body.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true, composed: false }));

    expect(focusSpy).not.toHaveBeenCalled();
  });
});

describe("Styling and lifecycle", () => {
  const preset = "svs-toast";

  test("applies CSS classes correctly", async () => {
    const { toaster, container, getByRole } = setup(undefined, { variant: VARIANT.NEUTRAL });

    toaster.add("Styled message");
    await flush();
    const region = getByRole("region");
    const middle = container.querySelector(`[class*="${PARTS.MIDDLE}"]`);
    const main = getByRole("dialog");

    expect(region).toHaveClass(preset, PARTS.WHOLE, VARIANT.NEUTRAL);
    expect(middle).toHaveClass(preset, PARTS.MIDDLE, VARIANT.NEUTRAL);
    expect(main).toHaveClass(preset, PARTS.MAIN, VARIANT.NEUTRAL);
  });

  test("INACTIVE while leaving", async () => {
    const { toaster, getByRole } = setup(undefined, { variant: "custom" });

    const id = toaster.add("Hide message");
    await flush();
    expect(getByRole("dialog")).toHaveClass(PARTS.MAIN, "custom");
    toaster.dismiss(id);

    await waitFor(() => expect(getByRole("dialog")).toHaveClass(PARTS.MAIN, VARIANT.INACTIVE));
  });

  test("custom styling", async () => {
    const customStyling = "custom-toast-style";
    const { toaster, getByRole } = setup(undefined, { styling: customStyling });

    toaster.add("Custom styled message");
    await flush();

    expect(getByRole("region")).toHaveClass(customStyling, PARTS.WHOLE);
  });

  test("showPopover/hidePopover lifecycle", async () => {
    const { toaster, getByRole } = setup();
    const region = getByRole("region");
    const showPopoverSpy = vi.spyOn(region, "showPopover");
    const hidePopoverSpy = vi.spyOn(region, "hidePopover");

    const id = toaster.add("Popover message");
    await waitFor(() => expect(showPopoverSpy).toHaveBeenCalled());
    toaster.dismiss(id);
    await advance(DEFAULT_ANIMATION);

    await waitFor(() => expect(hidePopoverSpy).toHaveBeenCalled());
  });

  test("flip duration from animation prop", async () => {
    const { toaster, getAllByRole } = setup(undefined, { animation: 300 });

    toaster.add("First message");
    toaster.add("Second message");
    await flush();

    expect(getAllByRole("dialog")).toHaveLength(2);
  });

  test("animation prop controls leave removal delay", async () => {
    const animation = 350;
    const { toaster, getByRole } = setup({ duration: Infinity }, { animation });
    const region = getByRole("region");

    const id = toaster.add("Animated removal");
    await waitFor(() => expect(region).toHaveAttribute("aria-label", "1 notifications"));
    toaster.dismiss(id);
    await advance(animation - 1);

    expect(region).toHaveAttribute("aria-label", "1 notifications");
    expect(getByRole("dialog")).toHaveClass(PARTS.MAIN, VARIANT.INACTIVE);
    await advance(1);

    await waitFor(() => expect(region).toHaveAttribute("aria-label", "0 notifications"));
  });
});
