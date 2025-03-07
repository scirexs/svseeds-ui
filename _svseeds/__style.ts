export { THEME, theme };

const THEME = Object.freeze({ LIGHT: "light", DARK: "dark" });
const preset: ThemePreset = {
  [THEME.LIGHT]: {
    color_system: "#f3f3f3", // #f3f3f3
    color_canvas: "#e2e8ef", // #e2e8ef
    color_stroke: "#01413a", // #01413a
    color_active: "#03ab99", // #03ab99
    color_inactive: "#7fa091", // #7fa091
    color_invalid: "#ab0315", // #ab0315
    theme_brightness: "0.9",
  },
  [THEME.DARK]: {
    color_system: "#1f1f1f", // #1f1f1f
    color_canvas: "#1a1f24", // #1a1f24
    color_stroke: "#a0f0e6", // #a0f0e6
    color_active: "#04d6c1", // #04d6c1
    color_inactive: "#5a7268", // #5a7268
    color_invalid: "#ff3b4e", // #ff3b4e
    theme_brightness: "1.5",
  },
};

type valueof<T> = T[keyof T];
type ThemeName = valueof<typeof THEME>;
type CssVarSet = Record<string, string>;
type ThemePreset = Record<ThemeName, CssVarSet>;
class ThemeSwitch {
  #styles: ThemePreset = { [THEME.LIGHT]: {}, [THEME.DARK]: {} };
  #current: ThemeName;

  constructor(initial?: ThemeName) {
    this.#current = ThemeSwitch.setInitialTheme(initial);
    this.#apply();
  }

  setPreset(preset: ThemePreset): ThemeSwitch {
    this.#styles = ThemeSwitch.toCSSVarName(preset);
    if (window) window.document.documentElement.style.colorScheme = Object.keys(preset).join(" ");
    return this;
  }
  toLight() {
    this.current = THEME.LIGHT;
  }
  toDark() {
    this.current = THEME.DARK;
  }
  #apply() {
    if (!window) {
      return;
    }
    const style = window.document.documentElement.style;
    Object.entries(this.#styles[this.#current]).forEach(([name, value]) => {
      style.setProperty(name, value);
    });
  }

  get current() {
    return this.#current;
  }
  set current(value: ThemeName) {
    this.#current = value;
    this.#apply();
  }

  static toCSSVarName(styles: ThemePreset): ThemePreset {
    return Object.fromEntries(
      Object.entries(styles).map(([theme, obj]) => [
        theme,
        ThemeSwitch.renameProperties(obj),
      ]),
    ) as ThemePreset;
  }
  static renameProperties(obj: Record<string, string>): CssVarSet {
    return Object.fromEntries(
      Object.entries(obj).map(([name, value]) => [
        `--${name.replaceAll("_", "-")}`,
        value,
      ]),
    );
  }
  static setInitialTheme(initial?: ThemeName): ThemeName {
    if (initial) {
      return initial;
    }
    return window?.matchMedia("(prefers-color-scheme: light)").matches ? THEME.LIGHT : THEME.DARK;
  }
}
const theme = new ThemeSwitch().setPreset(preset);
