import { beforeEach, describe, expect, test, vi } from "vitest";
import { render as browserRender } from "vitest-browser-svelte";
import { userEvent } from "vitest/browser";
import { createRawSnippet } from "svelte";
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

// Custom snippet for testing the direct children prop
const customMainSnippet = createRawSnippet((value: () => boolean, variant: () => string, element: () => HTMLButtonElement | undefined) => {
  const text = () => `${variant()},${value()},${element()?.tagName}`;
  return {
    render: () => `<span data-testid="custom-main">${text()}</span>`,
    // render() only produces the initial markup; without a reactive setup the snippet
    // never reflects later changes (bound element, toggled value).
    setup: (node: Element) => {
      $effect(() => {
        node.textContent = text();
      });
    },
  };
});

const waitFor = vi.waitFor;
const has = (el: Element, ...names: string[]) => expect([...el.classList]).toEqual(expect.arrayContaining(names));
const lacks = (el: Element, name: string) => expect(el.classList.contains(name)).toBe(false);
const render = (component: Parameters<typeof browserRender>[0], props?: Parameters<typeof browserRender>[1]) => {
  const screen = browserRender(component, props);
  return {
    ...screen,
    getByRole: (role: string) =>
      (role === "button" ? screen.container.querySelector("button") : screen.container.querySelector(`[role="${role}"]`)) as HTMLElement,
    getByTestId: (id: string) => screen.container.querySelector(`[data-testid="${id}"]`) as HTMLElement,
  };
};

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
  });
  test("renders with default props", () => {
    const { getByRole } = render(DarkToggle);
    const button = getByRole("button") as HTMLButtonElement;

    expect(button?.isConnected).toBe(true);
    expect(button.getAttribute("aria-label")).toBe("Toggle theme color");
    has(button, "svs-dark-toggle", "svs-toggle");
  });

  test("initializes from the shared theme (light)", async () => {
    forceTheme(false);

    const props = $state({ dark: undefined });
    const { getByRole } = render(DarkToggle, props);
    const button = getByRole("button") as HTMLButtonElement;

    await waitFor(() => {
      expect(props.dark).toBe(false);
      expect(button?.isConnected).toBe(true);
      has(document.documentElement, THEME.LIGHT);
    });
  });

  test("initializes from the shared theme (dark)", async () => {
    forceTheme(true);

    const props = $state({ dark: undefined });
    const { getByRole } = render(DarkToggle, props);
    const button = getByRole("button") as HTMLButtonElement;

    await waitFor(() => {
      expect(props.dark).toBe(true);
      expect(button?.isConnected).toBe(true);
      has(document.documentElement, THEME.DARK);
    });
  });

  test("renders default light icon when dark=false", () => {
    const props = { dark: false };
    const { container } = render(DarkToggle, props);
    const svg = container.querySelector("svg") as SVGElement;

    expect(svg?.isConnected).toBe(true);
    expect(svg.getAttribute("viewBox")).toBe("0 0 24 24");
    expect(svg.getAttribute("aria-hidden")).toBe("true");
  });

  test("renders default dark icon when dark=true", () => {
    const props = { dark: true };
    const { container } = render(DarkToggle, props);
    const svg = container.querySelector("svg") as SVGElement;

    expect(svg?.isConnected).toBe(true);
    expect(svg.getAttribute("viewBox")).toBe("0 0 24 24");
    expect(svg.getAttribute("aria-hidden")).toBe("true");
  });
});

describe("DarkToggle - User interactions", () => {
  beforeEach(() => {
    document.documentElement.className = "";
    document.documentElement.style.cssText = "";
  });

  test("toggles dark and light mode on click", async () => {
    forceTheme(true); // baseline opposite, so rendering dark:false is a real transition to light
    const props = $state({ dark: false, variant: VARIANT.NEUTRAL });
    const { getByRole } = render(DarkToggle, props);
    const button = getByRole("button") as HTMLButtonElement;

    await waitFor(() => {
      expect(props.dark).toBe(false);
      has(document.documentElement, THEME.LIGHT);
    });

    await userEvent.click(button);

    await waitFor(() => {
      expect(props.dark).toBe(true);
      has(document.documentElement, THEME.DARK);
    });

    await userEvent.click(button);

    await waitFor(() => {
      expect(props.dark).toBe(false);
      has(document.documentElement, THEME.LIGHT);
    });
  });

  test("variant updates correctly", async () => {
    const props = $state({ dark: false, variant: VARIANT.NEUTRAL });
    const { getByRole } = render(DarkToggle, props);
    const button = getByRole("button") as HTMLButtonElement;

    expect(props.variant).toBe(VARIANT.NEUTRAL);

    await userEvent.click(button);

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

describe("DarkToggle - Singleton sync", () => {
  beforeEach(() => {
    document.documentElement.className = "";
    document.documentElement.style.cssText = "";
  });

  test("setTheme updates a mounted instance", async () => {
    const props = $state({ dark: undefined });
    const { container } = render(DarkToggle, props);

    await waitFor(() => {
      expect(props.dark).toBe(false);
      expect(container.querySelector("circle")).toBeNull();
    });

    setTheme(true);
    await waitFor(() => {
      expect(props.dark).toBe(true);
      expect(container.querySelector("circle")?.isConnected).toBe(true);
      has(document.documentElement, THEME.DARK);
    });

    setTheme(false);
    await waitFor(() => {
      expect(props.dark).toBe(false);
      expect(container.querySelector("circle")).toBeNull();
      has(document.documentElement, THEME.LIGHT);
    });
  });

  test("toggleTheme updates a mounted instance", async () => {
    const props = $state({ dark: false });
    render(DarkToggle, props);

    toggleTheme();
    await waitFor(() => {
      expect(props.dark).toBe(true);
    });

    toggleTheme();
    await waitFor(() => {
      expect(props.dark).toBe(false);
    });
  });

  test("instances stay in sync with each other", async () => {
    const a = $state({ dark: false });
    const b = $state({ dark: false });
    const ra = render(DarkToggle, a);
    render(DarkToggle, b);
    const button = ra.container.querySelector("button") as HTMLButtonElement;

    setTheme(true);
    await waitFor(() => {
      expect(a.dark).toBe(true);
      expect(b.dark).toBe(true);
    });

    await userEvent.click(button);
    await waitFor(() => {
      expect(a.dark).toBe(false);
      expect(b.dark).toBe(false);
    });
  });

  test("explicit dark prop wins at mount over a conflicting singleton", async () => {
    forceTheme(true);

    const props = $state({ dark: false });
    render(DarkToggle, props);

    await waitFor(() => {
      expect(props.dark).toBe(false);
      expect(isDark()).toBe(false);
      has(document.documentElement, THEME.LIGHT);
    });
  });

  test("settles cleanly after repeated clicks", async () => {
    const props = $state({ dark: false });
    const { getByRole } = render(DarkToggle, props);
    const button = getByRole("button");

    await userEvent.click(button);
    await waitFor(() => {
      expect(props.dark).toBe(true);
    });

    await userEvent.click(button);
    await waitFor(() => {
      expect(props.dark).toBe(false);
    });

    await userEvent.click(button);
    await waitFor(() => {
      expect(props.dark).toBe(true);
    });
  });
});

describe("DarkToggle - Dependencies and customization", () => {
  beforeEach(() => {
    document.documentElement.className = "";
  });

  test("applies custom styling prop", () => {
    const customStyle = "custom-toggle-styling";
    const { getByRole } = render(DarkToggle, { styling: customStyle });
    const button = getByRole("button") as HTMLButtonElement;

    has(button, customStyle);
  });

  test("applies custom attributes via passthrough", () => {
    const { getByTestId } = render(DarkToggle, {
      "data-testid": "custom-toggle",
      title: "Custom toggle title",
    });
    const button = getByTestId("custom-toggle") as HTMLButtonElement;

    expect(button.getAttribute("title")).toBe("Custom toggle title");
    expect(button.getAttribute("aria-label")).toBe("Toggle theme color"); // Still has default aria-label
  });

  test("allows aria-label override via prop", () => {
    const { getByRole } = render(DarkToggle, { ariaLabel: "Switch color mode" });
    const button = getByRole("button") as HTMLButtonElement;

    expect(button.getAttribute("aria-label")).toBe("Switch color mode");
  });

  test("renders custom main snippet", async () => {
    const props = $state({ children: customMainSnippet, dark: false, variant: VARIANT.NEUTRAL });
    const { getByTestId } = render(DarkToggle, { ...props });
    const customMain = getByTestId("custom-main");

    await waitFor(() => {
      expect(customMain?.isConnected).toBe(true);
      expect(customMain.textContent).toContain(VARIANT.NEUTRAL);
      expect(customMain.textContent).toContain("false");
      expect(customMain.textContent).toContain("neutral,false,BUTTON");
    });
  });

  test("custom main snippet updates with state changes", async () => {
    const props = $state({ children: customMainSnippet, dark: false, variant: VARIANT.NEUTRAL });
    const { getByTestId, getByRole } = render(DarkToggle, { ...props });
    const button = getByRole("button") as HTMLButtonElement;
    const customMain = getByTestId("custom-main");

    expect(customMain.textContent).toContain("false");

    await userEvent.click(button);

    await waitFor(() => {
      expect(customMain.textContent).toContain("true");
    });
  });
});

describe("DarkToggle - Theme class management", () => {
  beforeEach(() => {
    document.documentElement.className = "";
    document.documentElement.style.cssText = "";
  });

  test("applies light theme class to document root on initialization", async () => {
    forceTheme(true); // baseline dark, so initializing to light is a real transition
    render(DarkToggle, { dark: false });

    await waitFor(() => {
      has(document.documentElement, THEME.LIGHT);
      lacks(document.documentElement, THEME.DARK);
    });
  });

  test("applies dark theme class to document root on initialization", async () => {
    forceTheme(false); // baseline light, so initializing to dark is a real transition
    render(DarkToggle, { dark: true });

    await waitFor(() => {
      has(document.documentElement, THEME.DARK);
      lacks(document.documentElement, THEME.LIGHT);
    });
  });

  test("switches theme classes when toggled", async () => {
    forceTheme(true); // baseline dark, so rendering dark:false is a real transition to light
    const props = $state({ dark: false });
    const { getByRole } = render(DarkToggle, props);
    const button = getByRole("button");

    await waitFor(() => {
      has(document.documentElement, THEME.LIGHT);
    });

    await userEvent.click(button);

    await waitFor(() => {
      has(document.documentElement, THEME.DARK);
      lacks(document.documentElement, THEME.LIGHT);
    });
  });

  test("setThemeToRoot function works in browser environment", async () => {
    // Clear any existing classes
    document.documentElement.className = "";

    setThemeToRoot(THEME.DARK);
    await waitFor(() => {
      has(document.documentElement, THEME.DARK);
    });

    setThemeToRoot(THEME.LIGHT);
    await waitFor(() => {
      has(document.documentElement, THEME.LIGHT);
      lacks(document.documentElement, THEME.DARK);
    });

    setThemeToRoot(THEME.DARK);
    await waitFor(() => {
      has(document.documentElement, THEME.DARK);
      lacks(document.documentElement, THEME.LIGHT);
    });
  });

  test("programmatic API toggles the shared theme", async () => {
    forceTheme(false);

    toggleTheme();
    await waitFor(() => {
      expect(isDark()).toBe(true);
      has(document.documentElement, THEME.DARK);
    });

    toggleTheme();
    await waitFor(() => {
      expect(isDark()).toBe(false);
      has(document.documentElement, THEME.LIGHT);
    });
  });
});

describe("DarkToggle - Status states", () => {
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

    has(button, "svs-dark-toggle", "svs-toggle", PARTS.MAIN, customStatus);
  });
});
