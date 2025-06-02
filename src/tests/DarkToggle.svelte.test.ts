import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { fireEvent, render, waitFor } from "@testing-library/svelte";
import { userEvent } from "@testing-library/user-event";
import { createRawSnippet } from "svelte";
import DarkToggle, { setThemeToRoot, THEME } from "../lib/_svseeds/DarkToggle.svelte";
import { PARTS, STATE } from "../lib/_svseeds/core.ts";

// Mock window.matchMedia for testing
const mockMatchMedia = vi.fn();
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: mockMatchMedia,
});

// Mock document.styleSheets
Object.defineProperty(document, "styleSheets", {
  writable: true,
  value: [],
});

// Custom snippet for testing deps.svsToggle.main
const customMainSnippet = createRawSnippet(
  (
    status: () => string,
    value: () => boolean,
    element: () => HTMLButtonElement | undefined,
  ) => {
    return {
      render: () => `<span data-testid="custom-main">${status()},${value()},${element()?.tagName}</span>`,
    };
  },
);

describe("DarkToggle - Basic functionality", () => {
  beforeEach(() => {
    // Reset DOM state
    document.documentElement.className = "";
    document.documentElement.style.cssText = "";

    // Mock prefers-color-scheme: light by default
    mockMatchMedia.mockReturnValue({
      matches: false,
      media: "(prefers-color-scheme: dark)",
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  test("renders with default props", () => {
    const { getByRole } = render(DarkToggle);
    const button = getByRole("button") as HTMLButtonElement;

    expect(button).toBeInTheDocument();
    expect(button).toHaveAttribute("aria-label", "Toggle theme color");
    expect(button).toHaveClass("svs-dark-toggle", "svs-toggle");
  });

  test("initializes with system preference (light)", () => {
    mockMatchMedia.mockReturnValue({
      matches: false,
      media: "(prefers-color-scheme: light)",
    });

    const props = $state({ dark: undefined });
    const { getByRole } = render(DarkToggle, props);
    const button = getByRole("button") as HTMLButtonElement;

    waitFor(() => {
      expect(props.dark).toBe(false);
      expect(button).toBeInTheDocument();
      expect(document.documentElement).toHaveClass(THEME.LIGHT);
    });
  });

  test("initializes with system preference (dark)", () => {
    mockMatchMedia.mockReturnValue({
      matches: true,
      media: "(prefers-color-scheme: dark)",
    });

    const props = $state({ dark: undefined });
    const { getByRole } = render(DarkToggle, props);
    const button = getByRole("button") as HTMLButtonElement;

    waitFor(() => {
      expect(props.dark).toBe(true);
      expect(button).toBeInTheDocument();
      expect(document.documentElement).toHaveClass(THEME.DARK);
    });
  });

  test("renders default light icon when dark=false", () => {
    const props = { dark: false };
    const { container } = render(DarkToggle, props);
    const svg = container.querySelector("svg");

    expect(svg).toBeInTheDocument();
    expect(svg).toHaveAttribute("viewBox", "0 0 24 24");
    expect(svg).toHaveAttribute("aria-hidden", "true");
  });

  test("renders default dark icon when dark=true", () => {
    const props = { dark: true };
    const { container } = render(DarkToggle, props);
    const svg = container.querySelector("svg");

    expect(svg).toBeInTheDocument();
    expect(svg).toHaveAttribute("viewBox", "0 0 24 24");
    expect(svg).toHaveAttribute("aria-hidden", "true");
  });
});

describe("DarkToggle - User interactions", () => {
  beforeEach(() => {
    document.documentElement.className = "";
    document.documentElement.style.cssText = "";
    mockMatchMedia.mockReturnValue({
      matches: false,
      media: "(prefers-color-scheme: dark)",
    });
  });

  test("toggles dark and light mode on click", async () => {
    const props = $state({ dark: false, status: STATE.NEUTRAL });
    const user = userEvent.setup();
    const { getByRole } = render(DarkToggle, props);
    const button = getByRole("button") as HTMLButtonElement;

    waitFor(() => {
      expect(props.dark).toBe(false);
      expect(document.documentElement).toHaveClass(THEME.LIGHT);
    });

    await user.click(button);

    waitFor(() => {
      expect(props.dark).toBe(true);
      expect(document.documentElement).toHaveClass(THEME.DARK);
    });

    await user.click(button);

    waitFor(() => {
      expect(props.dark).toBe(false);
      expect(document.documentElement).toHaveClass(THEME.LIGHT);
    });
  });

  test("status updates correctly", async () => {
    const props = $state({ dark: false, status: STATE.NEUTRAL });
    const user = userEvent.setup();
    const { getByRole } = render(DarkToggle, props);
    const button = getByRole("button") as HTMLButtonElement;

    expect(props.status).toBe(STATE.NEUTRAL);

    await user.click(button);

    // Status should update to active after interaction
    expect(props.status).toBe(STATE.ACTIVE);
  });

  test("element binding works correctly", () => {
    const props: { element?: HTMLButtonElement } = $state({ element: undefined });
    const { getByRole } = render(DarkToggle, props);
    const button = getByRole("button") as HTMLButtonElement;

    expect(props.element).toBe(button);
    expect(props.element?.tagName).toBe("BUTTON");
  });
});

describe("DarkToggle - Dependencies and customization", () => {
  beforeEach(() => {
    document.documentElement.className = "";
    mockMatchMedia.mockReturnValue({
      matches: false,
      media: "(prefers-color-scheme: dark)",
    });
  });

  test("applies custom style from deps", () => {
    const customStyle = "custom-toggle-style";
    const deps = {
      svsToggle: {
        style: customStyle,
      },
    };
    const { getByRole } = render(DarkToggle, { deps });
    const button = getByRole("button") as HTMLButtonElement;

    expect(button).toHaveClass(customStyle);
  });

  test("applies custom attributes from deps", () => {
    const deps = {
      svsToggle: {
        attributes: {
          "data-testid": "custom-toggle",
          title: "Custom toggle title",
        },
      },
    };
    const { getByTestId } = render(DarkToggle, { deps });
    const button = getByTestId("custom-toggle") as HTMLButtonElement;

    expect(button).toHaveAttribute("title", "Custom toggle title");
    expect(button).toHaveAttribute("aria-label", "Toggle theme color"); // Still has default aria-label
  });

  test("renders custom main snippet", () => {
    const deps = {
      svsToggle: {
        main: customMainSnippet,
      },
    };
    const props = $state({ dark: false, status: STATE.NEUTRAL, deps });
    const { getByTestId } = render(DarkToggle, { ...props, deps });
    const customMain = getByTestId("custom-main");

    waitFor(() => {
      expect(customMain).toBeInTheDocument();
      expect(customMain.textContent).toContain(STATE.NEUTRAL);
      expect(customMain.textContent).toContain("false");
      expect(customMain.textContent).toContain("neutral,false,BUTTON");
    });
  });

  test("custom main snippet updates with state changes", async () => {
    const deps = {
      svsToggle: {
        main: customMainSnippet,
      },
    };
    const props = $state({ dark: false, status: STATE.NEUTRAL });
    const user = userEvent.setup();
    const { getByTestId, getByRole } = render(DarkToggle, { ...props, deps });
    const button = getByRole("button") as HTMLButtonElement;
    const customMain = getByTestId("custom-main");

    expect(customMain.textContent).toContain("false");

    await user.click(button);

    waitFor(() => {
      expect(customMain.textContent).toContain("true");
    });
  });
});

describe("DarkToggle - Theme class management", () => {
  beforeEach(() => {
    document.documentElement.className = "";
    document.documentElement.style.cssText = "";
    mockMatchMedia.mockReturnValue({
      matches: false,
      media: "(prefers-color-scheme: dark)",
    });
  });

  test("applies light theme class to document root on initialization", () => {
    render(DarkToggle, { dark: false });

    waitFor(() => {
      expect(document.documentElement).toHaveClass(THEME.LIGHT);
      expect(document.documentElement).not.toHaveClass(THEME.DARK);
    });
  });

  test("applies dark theme class to document root on initialization", () => {
    render(DarkToggle, { dark: true });

    waitFor(() => {
      expect(document.documentElement).toHaveClass(THEME.DARK);
      expect(document.documentElement).not.toHaveClass(THEME.LIGHT);
    });
  });

  test("switches theme classes when toggled", async () => {
    const props = $state({ dark: false });
    const user = userEvent.setup();
    const { getByRole } = render(DarkToggle, props);
    const button = getByRole("button");

    waitFor(() => {
      expect(document.documentElement).toHaveClass(THEME.LIGHT);
    });

    await user.click(button);

    waitFor(() => {
      expect(document.documentElement).toHaveClass(THEME.DARK);
      expect(document.documentElement).not.toHaveClass(THEME.LIGHT);
    });
  });

  test("setThemeToRoot function works in browser environment", () => {
    // Clear any existing classes
    document.documentElement.className = "";

    setThemeToRoot(THEME.DARK);
    waitFor(() => {
      expect(document.documentElement).toHaveClass(THEME.DARK);
    });

    setThemeToRoot(THEME.LIGHT);
    waitFor(() => {
      expect(document.documentElement).toHaveClass(THEME.LIGHT);
    });
  });

  test("setThemeToRoot uses preferred theme when no theme specified", () => {
    document.documentElement.className = "";
    mockMatchMedia.mockReturnValue({
      matches: true, // Prefer dark
      media: "(prefers-color-scheme: dark)",
    });

    setThemeToRoot();
    expect(document.documentElement).toHaveClass(THEME.DARK);
  });
});

describe("DarkToggle - Status states", () => {
  beforeEach(() => {
    mockMatchMedia.mockReturnValue({
      matches: false,
      media: "(prefers-color-scheme: dark)",
    });
  });

  test("initializes with neutral status", () => {
    const props = $state({ status: "" });
    render(DarkToggle, props);

    expect(props.status).toBe(STATE.NEUTRAL);
  });

  test("preserves custom initial status", () => {
    const customStatus = "custom";
    const props = $state({ status: customStatus });
    render(DarkToggle, props);

    expect(props.status).toBe(customStatus);
  });

  test("applies status classes correctly", () => {
    const customStatus = "custom";
    const props = $state({ status: customStatus });
    const { getByRole } = render(DarkToggle, props);
    const button = getByRole("button") as HTMLButtonElement;

    expect(button).toHaveClass("svs-dark-toggle", "svs-toggle", PARTS.MAIN, customStatus);
  });
});

describe("DarkToggle - Error handling and edge cases", () => {
  test("handles missing window object gracefully", () => {
    // This test simulates SSR environment
    const originalWindow = globalThis.window;
    // @ts-ignore
    delete globalThis.window;

    expect(() => {
      setThemeToRoot(THEME.DARK);
    }).not.toThrow();

    globalThis.window = originalWindow;
  });

  test("handles empty deps object", () => {
    const deps = {};
    const { getByRole } = render(DarkToggle, { deps });
    const button = getByRole("button") as HTMLButtonElement;

    expect(button).toBeInTheDocument();
    expect(button).toHaveClass("svs-dark-toggle", "svs-toggle");
  });

  test("handles undefined deps", () => {
    const { getByRole } = render(DarkToggle, { deps: undefined });
    const button = getByRole("button") as HTMLButtonElement;

    expect(button).toBeInTheDocument();
    expect(button).toHaveClass("svs-dark-toggle", "svs-toggle");
  });
});
