import { readFileSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { render } from "@testing-library/svelte";
import { compile } from "svelte/compiler";
import DarkToggle, { setThemeToRoot, THEME } from "#svs/DarkToggle.svelte";

const mockMatchMedia = vi.fn();
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: mockMatchMedia,
});

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

describe("DarkToggle - Theme preference retained in jsdom", () => {
  test("setThemeToRoot uses preferred theme when no theme specified", () => {
    document.documentElement.className = "";
    mockMatchMedia.mockReturnValue({
      matches: true,
      media: "(prefers-color-scheme: dark)",
    });

    setThemeToRoot();
    expect(document.documentElement).toHaveClass(THEME.DARK);
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

describe("DarkToggle - Color-scheme selection", () => {
  beforeEach(() => {
    document.documentElement.className = "";
    document.documentElement.style.cssText = "";
    document.head.innerHTML = "";
    mockMatchMedia.mockReturnValue({
      matches: true,
      media: "(prefers-color-scheme: dark)",
    });
    mockStyleSheets([createThemeStyleSheet()]);
    vi.resetModules();
  });

  afterEach(async () => {
    const { cleanup } = await import("@testing-library/svelte/pure");
    cleanup();
  });

  test("keeps the automatic scheme at load and on mount without a dark prop", async () => {
    // Reload the renderer too so it shares the fresh component's Svelte runtime.
    const { render } = await import("@testing-library/svelte/pure");
    const mod = await import("#svs/DarkToggle.svelte");

    expect(document.documentElement.style.colorScheme).toBe("light dark");
    expect(document.documentElement).toHaveClass(THEME.DARK);
    render(mod.default);
    expect(document.documentElement.style.colorScheme).toBe("light dark");
    expect(document.documentElement).toHaveClass(THEME.DARK);
  });

  test("pins the scheme when selecting and toggling themes", async () => {
    const mod = await import("#svs/DarkToggle.svelte");

    mod.setTheme(false);
    expect(document.documentElement.style.colorScheme).toBe("light");
    expect(document.documentElement.style.getPropertyValue("--svs-bg")).toBe("white");
    mod.toggleTheme();
    expect(document.documentElement.style.colorScheme).toBe("dark");
    expect(document.documentElement.style.getPropertyValue("--svs-bg")).toBe("black");
  });

  test("applies a selection even when it matches the current theme", async () => {
    const mod = await import("#svs/DarkToggle.svelte");

    mod.setTheme(true);
    expect(document.documentElement.style.colorScheme).toBe("dark");
    expect(document.documentElement.style.getPropertyValue("--svs-bg")).toBe("black");
  });

  test("keeps the automatic scheme when the mounted dark prop matches", async () => {
    const { render } = await import("@testing-library/svelte/pure");
    const mod = await import("#svs/DarkToggle.svelte");

    render(mod.default, { dark: true });
    expect(document.documentElement.style.colorScheme).toBe("light dark");
  });

  test("pins the scheme when the mounted dark prop differs", async () => {
    const { render } = await import("@testing-library/svelte/pure");
    const mod = await import("#svs/DarkToggle.svelte");

    render(mod.default, { dark: false });
    expect(document.documentElement.style.colorScheme).toBe("light");
  });

  test("sets the root scheme without changing the singleton or palette", async () => {
    const mod = await import("#svs/DarkToggle.svelte");
    const html = document.documentElement;

    mod.setThemeToRoot("light");
    expect(html.style.colorScheme).toBe("light");
    expect(html).toHaveClass(THEME.LIGHT);
    expect(mod.isDark()).toBe(true);
    expect(html.style.getPropertyValue("--svs-bg")).toBe("");

    mod.setThemeToRoot();
    expect(html.style.colorScheme).toBe("light dark");
    expect(html).toHaveClass(THEME.DARK);
    mod.setThemeToRoot("dark");
    expect(html.style.colorScheme).toBe("dark");
    mod.setThemeToRoot("");
    expect(html.style.colorScheme).toBe("light dark");
    expect(html).toHaveClass(THEME.DARK);
    mod.setThemeToRoot("sepia");
    expect(html.style.colorScheme).toBe("light dark");
    expect(html).toHaveClass("sepia");
    expect(mod.isDark()).toBe(true);
    expect(html.style.getPropertyValue("--svs-bg")).toBe("");
  });

  test.each([
    ["light", true, "dark"],
    ["dark", false, "light"],
  ] as const)("normalizes root classes after %s then setTheme(%s)", async (name, dark, applied) => {
    const mod = await import("#svs/DarkToggle.svelte");
    const html = document.documentElement;
    mod.setTheme(dark);
    html.classList.add("app", "sepia");

    mod.setThemeToRoot(name);
    mod.setTheme(dark);
    expect([...html.classList].filter((x) => x === THEME.LIGHT || x === THEME.DARK)).toEqual([applied]);
    expect(html).toHaveClass("app", "sepia");
    expect(html.style.colorScheme).toBe(applied);
  });

  test("uses an empty automatic scheme without detected theme props", async () => {
    mockStyleSheets();
    const mod = await import("#svs/DarkToggle.svelte");

    expect(document.documentElement.style.colorScheme).toBe("");
    mod.setTheme(true);
    expect(document.documentElement.style.colorScheme).toBe("dark");
    mod.setThemeToRoot();
    expect(document.documentElement.style.colorScheme).toBe("");
  });
});

describe("DarkToggle - Error handling and edge cases", () => {
  test("handles missing window object gracefully", () => {
    const originalWindow = globalThis.window;
    // @ts-ignore:
    delete globalThis.window;

    expect(() => {
      setThemeToRoot(THEME.DARK);
    }).not.toThrow();

    globalThis.window = originalWindow;
  });
});
