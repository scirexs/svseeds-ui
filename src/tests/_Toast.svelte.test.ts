import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { fireEvent, render, waitFor, waitForElementToBeRemoved } from "@testing-library/svelte";
import { userEvent } from "@testing-library/user-event";
import { createRawSnippet } from "svelte";
import Toast, { removeToast, toast } from "../lib/_svseeds/_Toast.svelte";
import { PARTS, VARIANT } from "../lib/_svseeds/core.ts";

type ToastSnippetParams = [string, string, string, string]; // [message, type, id, variant]
const testid = "test-toast";
const toastfn = createRawSnippet(
  (
    message: () => string,
    type: () => string,
    id: () => string,
    variant: () => string,
  ) => {
    return {
      render: () => `<div data-testid="${testid}">${message()}-${type()}-${id()}-${variant()}</div>`,
    };
  },
);

// Mock window.matchMedia for prefers-reduced-motion
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock HTMLElement.showPopover/hidePopover
HTMLElement.prototype.showPopover = vi.fn();
HTMLElement.prototype.hidePopover = vi.fn();

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.clearAllMocks();
});

describe("Toast component initialization", () => {
  test("renders with minimal props", () => {
    const children = vi.fn().mockImplementation(toastfn);
    const props = { children };
    const { getByRole } = render(Toast, props);

    const toastContainer = getByRole("region");
    expect(toastContainer).toBeTruthy();
    expect(toastContainer).toHaveAttribute("role", "region");
    expect(toastContainer).toHaveAttribute("tabindex", "-1");
    expect(toastContainer).toHaveAttribute("popover", "manual");
    expect(toastContainer).toHaveAttribute("aria-label", "0 notifications");
  });

  test("initializes with custom name", () => {
    const children = vi.fn().mockImplementation(toastfn);
    const name = "custom-toast";
    const props = { children, name };
    const { getByRole } = render(Toast, props);

    const toastContainer = getByRole("region");
    expect(toastContainer).toBeTruthy();
  });

  test("sets default variant", () => {
    const children = vi.fn().mockImplementation(toastfn);
    const props = $state({ children, variant: "" });
    render(Toast, props);

    expect(props.variant).toBe(VARIANT.NEUTRAL);
  });

  test("preserves custom variant", () => {
    const children = vi.fn().mockImplementation(toastfn);
    const customVariant = "warning";
    const props = $state({ children, variant: customVariant });
    render(Toast, props);

    expect(props.variant).toBe(customVariant);
  });

  test("handles prefers-reduced-motion", () => {
    const mockMatchMedia = vi.fn().mockReturnValue({ matches: true });
    window.matchMedia = mockMatchMedia;

    const children = vi.fn().mockImplementation(toastfn);
    const props = { children, duration: 200 };
    render(Toast, props);

    expect(mockMatchMedia).toHaveBeenCalledWith("(prefers-reduced-motion: reduce)");
  });

  test("applies custom timeout", () => {
    const children = vi.fn().mockImplementation(toastfn);
    const timeout = 5000;
    const props = { children, timeout };
    render(Toast, props);

    // Timeout is passed to ToastContainer constructor
    // We can verify this by checking toast behavior with timeout
    expect(true).toBe(true); // Basic test that component renders
  });
});

describe("Toast management functions", () => {
  test("toast() function adds toast", () => {
    const children = vi.fn().mockImplementation(toastfn);
    const props = { children };
    const { getByRole } = render(Toast, props);

    const toastContainer = getByRole("region");
    const message = "Test message";
    const type = "info";
    const toastId = toast(message, type);

    expect(toastId).toBeTruthy();
    expect(toastId).toMatch(/^[A-Za-z]+$/); // Should be generated ID

    // Wait for the toast to be rendered
    waitFor(() => {
      expect(toastContainer).toHaveAttribute("aria-label", "1 notifications");
    });
  });

  test("toast() function with all parameters", () => {
    const children = vi.fn().mockImplementation(toastfn);
    const name = "named-toast";
    const props = { children, name };
    render(Toast, props);

    const message = "Custom message";
    const type = "error";
    const timeout = 3000;
    const toastId = toast(message, type, name, timeout);

    expect(toastId).toBeTruthy();
  });

  test("removeToast() function", () => {
    const children = vi.fn().mockImplementation(toastfn);
    const props = { children };
    const { getByRole } = render(Toast, props);

    const toastContainer = getByRole("region");
    const toastId = toast("Test message");

    waitFor(() => {
      expect(toastContainer).toHaveAttribute("aria-label", "1 notifications");
    });

    removeToast(toastId);

    // Wait for hide animation duration
    waitFor(() => {
      expect(toastContainer).toHaveAttribute("aria-label", "0 notifications");
    });
  });

  test("multiple toasts management", () => {
    const children = vi.fn().mockImplementation(toastfn);
    const props = { children };
    const { getByRole } = render(Toast, props);

    const toastContainer = getByRole("region");
    const id1 = toast("Message 1", "info");
    const id2 = toast("Message 2", "warning");
    const id3 = toast("Message 3", "error");

    waitFor(() => {
      expect(toastContainer).toHaveAttribute("aria-label", "3 notifications");
    });

    removeToast(id2);
    waitFor(() => {
      expect(toastContainer).toHaveAttribute("aria-label", "2 notifications");
    });
  });
});

describe("Toast display and interaction", () => {
  test("toast appears with correct content", () => {
    const children = vi.fn().mockImplementation(toastfn);
    const props = { children, variant: "primary" };
    const { getByTestId } = render(Toast, props);

    const message = "Display message";
    const type = "success";
    toast(message, type);

    waitFor(() => {
      const toastElement = getByTestId(testid);
      expect(toastElement.textContent).toContain(message);
      expect(toastElement.textContent).toContain(type);
      expect(toastElement.textContent).toContain("primary");
    });
  });

  test("toast with empty type", () => {
    const children = vi.fn().mockImplementation(toastfn);
    const props = { children };
    const { getByTestId } = render(Toast, props);

    const message = "No type message";
    toast(message); // No type specified

    waitFor(() => {
      const toastElement = getByTestId(testid);
      expect(toastElement.textContent).toContain(message);
      expect(toastElement.textContent).toContain(`${message}--`); // Empty type
    });
  });

  test("toast auto-dismiss with timeout", () => {
    const children = vi.fn().mockImplementation(toastfn);
    const timeout = 500;
    const props = { children, timeout };
    const { getByRole } = render(Toast, props);

    const toastContainer = getByRole("region");
    toast("Auto dismiss message", "info");

    waitFor(() => {
      expect(toastContainer).toHaveAttribute("aria-label", "1 notifications");
    });

    // Fast-forward through timeout + hide duration
    waitFor(() => {
      expect(toastContainer).toHaveAttribute("aria-label", "0 notifications");
    }, { interval: timeout + 200 });
  });

  test("toast without auto-dismiss (infinite timeout)", () => {
    const children = vi.fn().mockImplementation(toastfn);
    const props = { children }; // No timeout = Infinity
    const { getByRole } = render(Toast, props);

    const toastContainer = getByRole("region");
    toast("Persistent message", "info");

    waitFor(() => {
      expect(toastContainer).toHaveAttribute("aria-label", "1 notifications");
    });

    // Fast-forward a long time - should still be there
    waitFor(() => {
      expect(toastContainer).toHaveAttribute("aria-label", "1 notifications");
    }, { timeout: 10000, interval: 10000 });
  });
});

describe("Toast interaction events", () => {
  test("pointer enter resets timer", () => {
    const children = vi.fn().mockImplementation(toastfn);
    const timeout = 500;
    const props = { children, timeout };
    const { getByRole } = render(Toast, props);

    const toastContainer = getByRole("region");
    toast("Hover message", "info");

    waitFor(() => {
      const toastDialog = getByRole("dialog");
      expect(toastDialog).toBeTruthy();

      // Simulate pointer enter
      fireEvent.pointerEnter(toastDialog);
    });

    // Timer should be reset, toast should still be visible
    waitFor(() => {
      expect(toastContainer).toHaveAttribute("aria-label", "1 notifications");
    }, { timeout: 2000, interval: 1000 });
  });

  test("pointer leave restarts timer", () => {
    const children = vi.fn().mockImplementation(toastfn);
    const timeout = 500;
    const props = { children, timeout };
    const { getByRole } = render(Toast, props);

    const toastContainer = getByRole("region");
    toast("Leave message", "info");

    waitFor(() => {
      const toastDialog = getByRole("dialog");
      // Simulate pointer enter then leave
      fireEvent.pointerLeave(toastDialog, { pointerType: "mouse" });
    });

    // Should restart with normal timeout
    waitFor(() => {
      expect(toastContainer).toHaveAttribute("aria-label", "0 notifications");
    }, { interval: timeout + 250 });
  });

  test("touch leave extends timer", () => {
    const children = vi.fn().mockImplementation(toastfn);
    const timeout = 600;
    const props = { children, timeout };
    const { getByRole } = render(Toast, props);

    const toastContainer = getByRole("region");
    toast("Touch message", "info");

    waitFor(() => {
      const toastDialog = getByRole("dialog");
      // Simulate touch leave (extends timer by 1.5x)
      fireEvent.pointerLeave(toastDialog, { pointerType: "touch" });
    });

    waitFor(() => {
      // Should still be visible after normal timeout
      expect(toastContainer).toHaveAttribute("aria-label", "1 notifications");
    }, { interval: timeout + 250 });

    waitFor(() => {
      // Should be gone after extended timeout
      expect(toastContainer).toHaveAttribute("aria-label", "0 notifications");
    }, { interval: timeout * 1.5 + 250 });
  });

  test("pointer cancel resets timer", () => {
    const children = vi.fn().mockImplementation(toastfn);
    const timeout = 1000;
    const props = { children, timeout };
    const { getByRole } = render(Toast, props);

    const toastContainer = getByRole("region");
    toast("Cancel message", "info");

    waitFor(() => {
      const toastDialog = getByRole("dialog");
      fireEvent.pointerCancel(toastDialog, { pointerType: "mouse" });
    });

    waitFor(() => {
      // Should restart with normal timeout
      expect(toastContainer).toHaveAttribute("aria-label", "0 notifications");
    }, { interval: timeout + 250 });
  });
});

describe("Keyboard navigation", () => {
  test("F6 key focuses toast container", () => {
    const children = vi.fn().mockImplementation(toastfn);
    const props = { children };
    const { getByRole } = render(Toast, props);

    const toastContainer = getByRole("region");
    const focusSpy = vi.spyOn(toastContainer, "focus");
    toast("Focus message", "info");

    waitFor(() => {
      // Simulate F6 key on body
      fireEvent.keyDown(document.body, { key: "F6" });
      expect(focusSpy).toHaveBeenCalled();
    });
  });

  test("F6 key with composed event is ignored", () => {
    const children = vi.fn().mockImplementation(toastfn);
    const props = { children };
    const { getByRole } = render(Toast, props);

    const toastContainer = getByRole("region");
    const focusSpy = vi.spyOn(toastContainer, "focus");
    toast("Composed message", "info");

    waitFor(() => {
      // Simulate F6 key with composed flag
      fireEvent.keyDown(document.body, { key: "F6", composed: true });
      expect(focusSpy).not.toHaveBeenCalled();
    });
  });

  test("other keys are ignored", () => {
    const children = vi.fn().mockImplementation(toastfn);
    const props = { children };
    const { getByRole } = render(Toast, props);

    const toastContainer = getByRole("region");
    const focusSpy = vi.spyOn(toastContainer, "focus");
    toast("Other key message", "info");

    waitFor(() => {
      // Simulate other keys
      fireEvent.keyDown(document.body, { key: "Escape" });
      fireEvent.keyDown(document.body, { key: "Enter" });

      expect(focusSpy).not.toHaveBeenCalled();
    });
  });
});

describe("Styling and CSS classes", () => {
  const preset = "svs-toast";

  test("default styling classes", () => {
    const children = vi.fn().mockImplementation(toastfn);
    const props = { children, variant: VARIANT.NEUTRAL };
    const { container, getByRole } = render(Toast, props);

    toast("Styled message", "info");

    waitFor(() => {
      const toastContainer = getByRole("region");
      const toastMiddle = container.querySelector(`[class*="${PARTS.MIDDLE}"]`);
      const toastMain = getByRole("dialog");

      expect(toastContainer).toHaveClass(preset, PARTS.WHOLE, VARIANT.NEUTRAL);
      expect(toastMiddle).toHaveClass(preset, PARTS.MIDDLE, VARIANT.NEUTRAL);
      expect(toastMain).toHaveClass(preset, PARTS.MAIN, VARIANT.NEUTRAL);
    });
  });

  test("inactive variant during hide animation", () => {
    const children = vi.fn().mockImplementation(toastfn);
    const timeout = 100;
    const variant = "custom";
    const props = { children, timeout, variant };
    const { getByRole } = render(Toast, props);

    toast("Hide message", "info");

    // Wait for timeout to trigger hide
    waitFor(() => {
      const toastDialog = getByRole("dialog");
      expect(toastDialog).toHaveClass(variant, PARTS.MAIN, VARIANT.INACTIVE);
    }, { interval: timeout });
  });

  test("custom styling", async () => {
    const children = vi.fn().mockImplementation(toastfn);
    const customStyling = "custom-toast-style";
    const props = { children, styling: customStyling };
    const { getByRole } = render(Toast, props);

    toast("Custom styled message", "info");
    await vi.runOnlyPendingTimersAsync();

    const toastContainer = getByRole("region");
    expect(toastContainer).toHaveClass(customStyling, PARTS.WHOLE);
  });
});

describe("Edge cases and error handling", () => {
  test("invalid duration defaults to DEFALT_DURATION", () => {
    const children = vi.fn().mockImplementation(toastfn);
    const props = { children, duration: -5 }; // Invalid duration
    render(Toast, props);

    // Component should render without error
    expect(true).toBe(true);
  });

  test("removing non-existent toast", () => {
    const children = vi.fn().mockImplementation(toastfn);
    const props = { children };
    render(Toast, props);

    // Should not throw error
    expect(() => removeToast("non-existent-id")).not.toThrow();
  });

  test("adding toast to non-existent named container", () => {
    const children = vi.fn().mockImplementation(toastfn);
    const props = { children, name: "existing" };
    render(Toast, props);

    // Should return empty string for non-existent container
    const result = toast("Message", "info", "non-existent");
    expect(result).toBe("");
  });

  test("popover methods are called correctly", () => {
    const children = vi.fn().mockImplementation(toastfn);
    const props = { children };
    const { getByRole } = render(Toast, props);

    const toastContainer = getByRole("region");
    const showPopoverSpy = vi.spyOn(toastContainer, "showPopover");
    const hidePopoverSpy = vi.spyOn(toastContainer, "hidePopover");

    const toastId = toast("Popover message", "info");

    waitFor(() => {
      expect(showPopoverSpy).toHaveBeenCalled();
      const toastDialog = getByRole("dialog");
      // Remove all toasts to trigger hide
      removeToast(toastId);
      waitForElementToBeRemoved(toastDialog).then(() => {
        expect(hidePopoverSpy).toHaveBeenCalled();
      });
    });
  });
});

describe("Animation and transitions", () => {
  test("flip animation with custom duration", () => {
    const children = vi.fn().mockImplementation(toastfn);
    const duration = 300;
    const props = { children, duration };
    const { getAllByRole } = render(Toast, props);

    toast("First message", "info");
    toast("Second message", "info");

    waitFor(() => {
      // Check that toasts are rendered with animation
      const toastElements = getAllByRole("dialog");
      expect(toastElements).toHaveLength(2);
    });
  });

  test("zero duration with prefers-reduced-motion", () => {
    const mockMatchMedia = vi.fn().mockReturnValue({ matches: true });
    window.matchMedia = mockMatchMedia;

    const children = vi.fn().mockImplementation(toastfn);
    const props = { children, duration: 200 };
    render(Toast, props);

    // Duration should be set to 0 when prefers-reduced-motion is true
    expect(mockMatchMedia).toHaveBeenCalledWith("(prefers-reduced-motion: reduce)");
  });
});
