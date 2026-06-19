import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, test, vi } from "vitest";
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
