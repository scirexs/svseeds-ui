import { readFileSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { fireEvent, render, waitFor } from "@testing-library/svelte";
import { userEvent } from "@testing-library/user-event";
import { createRawSnippet } from "svelte";
import { compile } from "svelte/compiler";
import DarkToggle, { isDark, setTheme, setThemeToRoot, THEME, toggleTheme } from "#svs/DarkToggle.svelte";
import { PARTS, VARIANT } from "#svs/core";

// The theme state is a module-level singleton (one theme per page). matchMedia is only
// read once at import, so per-test matchMedia changes cannot re-derive it. Drive it
// deterministically via setTheme instead. Calling setTheme(!dark) then setTheme(dark)
// guarantees a real transition, so the <html> class is (re)applied regardless of the
// singleton's prior state (and of beforeEach clearing the class).
function forceTheme(dark: boolean) {
  setTheme(!dark);
  setTheme(dark);
}

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

function mockStyleSheets(sheets: CSSStyleSheet[] = []) {
  Object.defineProperty(document, "styleSheets", {
    writable: true,
    value: sheets as unknown as StyleSheetList,
  });
}

function createThemeStyleSheet() {
  const style = document.createElement("style");
  style.textContent = `
    :root { --svs-bg: white; }
    @media (prefers-color-scheme: dark) {
      :root { --svs-bg: black; }
    }
  `;
  document.head.append(style);
  return style.sheet!;
}

// Custom snippet for testing deps.svsToggle.main
const customMainSnippet = createRawSnippet(
  (
    value: () => boolean,
    variant: () => string,
    element: () => HTMLButtonElement | undefined,
  ) => {
    const text = () => `${variant()},${value()},${element()?.tagName}`;
    return {
      render: () => `<span data-testid="custom-main">${text()}</span>`,
      // render() only produces the initial markup; without a reactive setup the snippet
      // never reflects later changes (bound element, toggled value).
      setup: (node: Element) => {
        $effect(() => { node.textContent = text(); });
      },
    };
  },
);

// Reset the singleton theme before every test so the shared state does not leak between
// tests (e.g. a test that toggles to dark must not affect a later test that renders default).
beforeEach(() => {
  setTheme(false);
});

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

  test("initializes from the shared theme (light)", async () => {
    forceTheme(false);

    const props = $state({ dark: undefined });
    const { getByRole } = render(DarkToggle, props);
    const button = getByRole("button") as HTMLButtonElement;

    await waitFor(() => {
      expect(props.dark).toBe(false);
      expect(button).toBeInTheDocument();
      expect(document.documentElement).toHaveClass(THEME.LIGHT);
    });
  });

  test("initializes from the shared theme (dark)", async () => {
    forceTheme(true);

    const props = $state({ dark: undefined });
    const { getByRole } = render(DarkToggle, props);
    const button = getByRole("button") as HTMLButtonElement;

    await waitFor(() => {
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
    forceTheme(true); // baseline opposite, so rendering dark:false is a real transition to light
    const props = $state({ dark: false, variant: VARIANT.NEUTRAL });
    const user = userEvent.setup();
    const { getByRole } = render(DarkToggle, props);
    const button = getByRole("button") as HTMLButtonElement;

    await waitFor(() => {
      expect(props.dark).toBe(false);
      expect(document.documentElement).toHaveClass(THEME.LIGHT);
    });

    await user.click(button);

    await waitFor(() => {
      expect(props.dark).toBe(true);
      expect(document.documentElement).toHaveClass(THEME.DARK);
    });

    await user.click(button);

    await waitFor(() => {
      expect(props.dark).toBe(false);
      expect(document.documentElement).toHaveClass(THEME.LIGHT);
    });
  });

  test("variant updates correctly", async () => {
    const props = $state({ dark: false, variant: VARIANT.NEUTRAL });
    const user = userEvent.setup();
    const { getByRole } = render(DarkToggle, props);
    const button = getByRole("button") as HTMLButtonElement;

    expect(props.variant).toBe(VARIANT.NEUTRAL);

    await user.click(button);

    // Status should update to active after interaction
    expect(props.variant).toBe(VARIANT.ACTIVE);
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

  test("applies custom styling from deps", () => {
    const customStyle = "custom-toggle-styling";
    const deps = {
      svsToggle: {
        styling: customStyle,
      },
    };
    const { getByRole } = render(DarkToggle, { deps });
    const button = getByRole("button") as HTMLButtonElement;

    expect(button).toHaveClass(customStyle);
  });

  test("applies custom attributes from deps", () => {
    const deps = {
      svsToggle: {
        "data-testid": "custom-toggle",
        title: "Custom toggle title",
      },
    };
    const { getByTestId } = render(DarkToggle, { deps });
    const button = getByTestId("custom-toggle") as HTMLButtonElement;

    expect(button).toHaveAttribute("title", "Custom toggle title");
    expect(button).toHaveAttribute("aria-label", "Toggle theme color"); // Still has default aria-label
  });

  test("allows aria-label override from deps", () => {
    const deps = {
      svsToggle: {
        ariaLabel: "Switch color mode",
      },
    };
    const { getByRole } = render(DarkToggle, { deps });
    const button = getByRole("button") as HTMLButtonElement;

    expect(button).toHaveAttribute("aria-label", "Switch color mode");
  });

  test("renders custom main snippet", async () => {
    const props = $state({ children: customMainSnippet, dark: false, variant: VARIANT.NEUTRAL });
    const { getByTestId } = render(DarkToggle, { ...props });
    const customMain = getByTestId("custom-main");

    await waitFor(() => {
      expect(customMain).toBeInTheDocument();
      expect(customMain.textContent).toContain(VARIANT.NEUTRAL);
      expect(customMain.textContent).toContain("false");
      expect(customMain.textContent).toContain("neutral,false,BUTTON");
    });
  });

  test("custom main snippet updates with state changes", async () => {
    const props = $state({ children: customMainSnippet, dark: false, variant: VARIANT.NEUTRAL });
    const user = userEvent.setup();
    const { getByTestId, getByRole } = render(DarkToggle, { ...props });
    const button = getByRole("button") as HTMLButtonElement;
    const customMain = getByTestId("custom-main");

    expect(customMain.textContent).toContain("false");

    await user.click(button);

    await waitFor(() => {
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

  test("applies light theme class to document root on initialization", async () => {
    forceTheme(true); // baseline dark, so initializing to light is a real transition
    render(DarkToggle, { dark: false });

    await waitFor(() => {
      expect(document.documentElement).toHaveClass(THEME.LIGHT);
      expect(document.documentElement).not.toHaveClass(THEME.DARK);
    });
  });

  test("applies dark theme class to document root on initialization", async () => {
    forceTheme(false); // baseline light, so initializing to dark is a real transition
    render(DarkToggle, { dark: true });

    await waitFor(() => {
      expect(document.documentElement).toHaveClass(THEME.DARK);
      expect(document.documentElement).not.toHaveClass(THEME.LIGHT);
    });
  });

  test("switches theme classes when toggled", async () => {
    forceTheme(true); // baseline dark, so rendering dark:false is a real transition to light
    const props = $state({ dark: false });
    const user = userEvent.setup();
    const { getByRole } = render(DarkToggle, props);
    const button = getByRole("button");

    await waitFor(() => {
      expect(document.documentElement).toHaveClass(THEME.LIGHT);
    });

    await user.click(button);

    await waitFor(() => {
      expect(document.documentElement).toHaveClass(THEME.DARK);
      expect(document.documentElement).not.toHaveClass(THEME.LIGHT);
    });
  });

  test("setThemeToRoot function works in browser environment", async () => {
    // Clear any existing classes
    document.documentElement.className = "";

    setThemeToRoot(THEME.DARK);
    await waitFor(() => {
      expect(document.documentElement).toHaveClass(THEME.DARK);
    });

    setThemeToRoot(THEME.LIGHT);
    await waitFor(() => {
      expect(document.documentElement).toHaveClass(THEME.LIGHT);
      expect(document.documentElement).not.toHaveClass(THEME.DARK);
    });

    setThemeToRoot(THEME.DARK);
    await waitFor(() => {
      expect(document.documentElement).toHaveClass(THEME.DARK);
      expect(document.documentElement).not.toHaveClass(THEME.LIGHT);
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

  test("programmatic API toggles the shared theme", async () => {
    forceTheme(false);

    toggleTheme();
    await waitFor(() => {
      expect(isDark()).toBe(true);
      expect(document.documentElement).toHaveClass(THEME.DARK);
    });

    toggleTheme();
    await waitFor(() => {
      expect(isDark()).toBe(false);
      expect(document.documentElement).toHaveClass(THEME.LIGHT);
    });
  });
});

describe("DarkToggle - SSR and CSS scanning", () => {
  beforeEach(() => {
    document.documentElement.className = "";
    document.documentElement.style.cssText = "";
    document.head.innerHTML = "";
    mockStyleSheets();
    mockMatchMedia.mockReturnValue({
      matches: false,
      media: "(prefers-color-scheme: dark)",
    });
  });

  afterEach(() => {
    mockStyleSheets();
    vi.resetModules();
  });

  test("defaults to light in an SSR-style environment", async () => {
    const originalWindow = globalThis.window;
    // @ts-ignore:
    delete globalThis.window;

    try {
      vi.resetModules();
      const mod = await import("#svs/DarkToggle.svelte");

      expect(mod.isDark()).toBe(false);
    } finally {
      globalThis.window = originalWindow;
    }
  });

  test("sets color-scheme from scanned light and dark theme props", async () => {
    const sheet = createThemeStyleSheet();
    mockStyleSheets([sheet]);
    vi.resetModules();

    await import("#svs/DarkToggle.svelte");
    const themes = document.documentElement.style.colorScheme.split(/\s+/);

    expect(themes).toContain(THEME.LIGHT);
    expect(themes).toContain(THEME.DARK);
  });

  test("keeps color-scheme empty when no theme props are found", async () => {
    document.documentElement.style.colorScheme = "dark";
    mockStyleSheets();
    vi.resetModules();

    await import("#svs/DarkToggle.svelte");

    expect(document.documentElement.style.colorScheme).toBe("");
  });

  test("compiles the FOUC guard into SSR head output", () => {
    const source = readFileSync("src/lib/_svseeds/DarkToggle.svelte", "utf8");
    const code = compile(source, {
      filename: "DarkToggle.svelte",
      generate: "server",
    }).js.code;

    expect(code).toContain("$.head(");
    expect(code).toContain("$.html(FOUC_SCRIPT)");
    expect(code).toContain("<script>");
    expect(code).toContain('matchMedia("(prefers-color-scheme: dark)")');
    expect(code).toContain('classList.remove("light","dark")');
    expect(code).toContain('classList.add(d?"dark":"light")');
  });

  test("keeps the FOUC guard inert during client render", () => {
    mockMatchMedia.mockClear();

    render(DarkToggle, { dark: false });

    expect(document.head.innerHTML).toContain('matchMedia("(prefers-color-scheme: dark)")');
    expect(mockMatchMedia).not.toHaveBeenCalled();
  });
});

describe("DarkToggle - Status states", () => {
  beforeEach(() => {
    mockMatchMedia.mockReturnValue({
      matches: false,
      media: "(prefers-color-scheme: dark)",
    });
  });

  test("initializes with neutral variant", () => {
    const props = $state({ variant: VARIANT.NEUTRAL });
    render(DarkToggle, props);

    expect(props.variant).toBe(VARIANT.NEUTRAL);
  });

  test("preserves custom initial variant", () => {
    const customStatus = "custom";
    const props = $state({ variant: customStatus });
    render(DarkToggle, props);

    expect(props.variant).toBe(customStatus);
  });

  test("applies variant classes correctly", () => {
    const customStatus = "custom";
    const props = $state({ variant: customStatus });
    const { getByRole } = render(DarkToggle, props);
    const button = getByRole("button") as HTMLButtonElement;

    expect(button).toHaveClass("svs-dark-toggle", "svs-toggle", PARTS.MAIN, customStatus);
  });
});

describe("DarkToggle - Error handling and edge cases", () => {
  test("handles missing window object gracefully", () => {
    // This test simulates SSR environment
    const originalWindow = globalThis.window;
    // @ts-ignore:
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
