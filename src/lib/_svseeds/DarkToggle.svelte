<!--
  @component
  ### Types
  default value: *`(value)`*
  ```ts
  interface DarkToggleProps extends Omit<ToggleProps, "value"> {
    dark?: boolean; // bindable (prefers-color-scheme)
  }
  // children, styling, and ariaLabel use DarkToggle defaults when omitted.
  ```
  ### Anatomy
  ```svelte
  <Toggle {...rest} bind:value={dark} bind:variant bind:element>
    {#if children}
      {children}
    {:else}
      // Default Icon
    {/if}
  </Toggle>
  ```
  SSR default theme: light.

  DarkToggle emits an SSR-only `<svelte:head>` guard that sets the `light` or
  `dark` class on `<html>` before first paint, based on `prefers-color-scheme`.
  This is effective only when DarkToggle is in the initial server-rendered tree.
  Under a strict Content-Security-Policy, the inline script may be blocked; use
  an app-level blocking script with an appropriate nonce in that case.
-->
<script module lang="ts">
  export interface DarkToggleProps extends Omit<ToggleProps, "value"> {
    dark?: boolean; // bindable (prefers-color-scheme)
  }
  export type DarkToggleReqdProps = never;
  export type DarkToggleBindProps = "dark" | "variant" | "element";

  export const THEME = { LIGHT: "light", DARK: "dark" } as const;
  export function setThemeToRoot(theme?: string) {
    if (typeof window === "undefined") return;
    if (!theme) theme = Theme.getPreferTheme();
    const html = window.document.documentElement;
    html.classList.remove(THEME.LIGHT, THEME.DARK);
    html.classList.add(theme);
  }

  const THEME_SELECTOR = ":root";
  const THEME_LAYER_NAME = "theme";
  const THEME_NAME_KEY = "$theme";
  const THEME_MEDIA_REGEX = /\(prefers-color-scheme:\s*(light|dark)\s*\)/i;
  const THEME_COLOR_PREFIX = "--color-";
  const THEME_TARGET_PREFIX = "--svs-";
  const ariaLabel = "Toggle theme color";
  const preset = "svs-dark-toggle";
  // Keep the string literals in sync with THEME; the inline script must be self-contained.
  const FOUC_SCRIPT =
    `<script>(function(){try{` +
    `var d=window.matchMedia("(prefers-color-scheme: dark)").matches;` +
    `var e=document.documentElement;` +
    `e.classList.remove("light","dark");` +
    `e.classList.add(d?"dark":"light");` +
    `}catch(_){}})()<\/script>`;

  type CustomProps = Record<string, string>;
  type ThemeProps = Map<string, CustomProps>;
  function getThemeProps(): ThemeProps {
    if (typeof window === "undefined") return new Map();
    genTwColors();
    const sheets = window.document.styleSheets;
    const rules: CustomProps[] = [];
    for (let i = 0; i < sheets.length; i++) {
      scanGroup(sheets[i])?.forEach((x) => rules.push(x));
    }
    twColors.clear();
    return castRulesToMap(rules);
  }
  function castRulesToMap(rules: CustomProps[]): ThemeProps {
    const map: ThemeProps = new Map();
    rules.forEach(({ $theme, ...props }) => map.set($theme, props));
    return map;
  }
  function getRules(sheet: CSSStyleSheet | CSSGroupingRule): CSSRuleList | undefined {
    try {
      return sheet.cssRules;
    } catch (e) {
      // mainly, due to CORS
      return;
    }
  }
  function scanGroup(group: CSSStyleSheet | CSSGroupingRule, theme?: string): CustomProps[] {
    const rules = getRules(group);
    if (!rules) return [];
    const ret: CustomProps[] = [];
    for (let i = 0; i < rules.length; i++) {
      filterRule(rules[i], theme)?.forEach((x) => ret.push(x));
    }
    return ret;
  }
  function filterRule(rule: CSSRule, theme?: string): CustomProps[] | undefined {
    if (rule instanceof CSSLayerBlockRule && rule.name === THEME_LAYER_NAME) theme = "light";
    if (rule instanceof CSSMediaRule) theme = getThemeName(rule.conditionText);
    // Style/page rules must be handled before grouping rules; modern CSSOM makes
    // CSSStyleRule/CSSPageRule inherit from CSSGroupingRule for CSS Nesting.
    if (rule instanceof CSSStyleRule || rule instanceof CSSPageRule) {
      if (!rule.selectorText.includes(THEME_SELECTOR)) return;
      const fallback = rule.selectorText === THEME_SELECTOR ? "light" : undefined;
      return getCustomProps(rule.style, theme ?? fallback);
    }
    if (rule instanceof CSSGroupingRule) return scanGroup(rule, theme);
  }
  function getThemeName(condition: string): string | undefined {
    const match = condition.match(THEME_MEDIA_REGEX);
    return match?.[1]?.toLowerCase();
  }
  function getCustomProps(style: CSSStyleDeclarationBase, theme?: string): CustomProps[] | undefined {
    if (!theme) return;
    const props: CustomProps = { [THEME_NAME_KEY]: theme };
    for (let i = 0; i < style.length; i++) {
      const prop = style[i];
      if (prop.startsWith("--") && isThemeCustomProp(prop)) {
        props[prop] = style.getPropertyValue(prop).trim();
      }
    }
    return Object.keys(props).length > 1 ? [props] : undefined;
  }
  function isThemeCustomProp(name: string): boolean {
    if (name.startsWith(THEME_COLOR_PREFIX)) {
      return !twColors.has(name);
    }
    return name.startsWith(THEME_TARGET_PREFIX);
  }
  function genTwColors() {
    const TW_COLORS = [
      "red",
      "orange",
      "amber",
      "yellow",
      "lime",
      "green",
      "emerald",
      "teal",
      "cyan",
      "sky",
      "blue",
      "indigo",
      "violet",
      "purple",
      "fuchsia",
      "pink",
      "rose",
      "slate",
      "gray",
      "zinc",
      "neutral",
      "stone",
    ];
    const TW_NUMBERS = ["50", "100", "200", "300", "400", "500", "600", "700", "800", "900", "950"];
    TW_COLORS.forEach((color) => {
      TW_NUMBERS.forEach((num) => {
        twColors.add(`${THEME_COLOR_PREFIX}${color}-${num}`);
      });
    });
  }

  class Theme {
    #props: ThemeProps;
    #theme: string;
    set dark(bool: boolean) {
      this.#switch(bool);
    }
    get dark(): boolean {
      return this.#theme === THEME.DARK;
    }

    constructor() {
      this.#theme = Theme.getPreferTheme();
      this.#props = getThemeProps();
      this.#setColorScheme();
      setThemeToRoot(this.#theme);
    }
    #switch(dark: boolean) {
      const theme = Theme.#getThemeString(dark);
      if (this.#theme === theme) return;
      this.#apply(theme, this.#theme);
      this.#theme = theme;
    }
    #apply(to: string, from: string) {
      if (typeof window === "undefined") return;
      const html = window.document.documentElement;
      Object.entries(this.#props.get(to) ?? {}).forEach(([name, value]) => html.style.setProperty(name, value));
      if (html.classList.contains(from)) {
        html.classList.replace(from, to);
      } else {
        html.classList.add(to);
      }
    }
    #setColorScheme() {
      if (typeof window === "undefined") return;
      const themes = [...this.#props.keys()].filter((x) => x === THEME.LIGHT || x === THEME.DARK);
      window.document.documentElement.style.colorScheme = themes.join(" ");
    }

    static #isPreferDark(): boolean {
      if (typeof window === "undefined") return false;
      return window.matchMedia("(prefers-color-scheme: dark)").matches;
    }
    static #getThemeString(dark: boolean): string {
      return dark ? THEME.DARK : THEME.LIGHT;
    }
    static getPreferTheme(): string {
      return Theme.#getThemeString(Theme.#isPreferDark());
    }
  }
  const twColors = new Set<string>();
  const theme = new Theme();

  // Programmatic control of the page-wide (singleton) theme.
  // Note: this updates the shared theme/DOM but not the `dark` prop of already-mounted instances.
  export function setTheme(dark: boolean) {
    theme.dark = dark;
  }
  export function toggleTheme() {
    theme.dark = !theme.dark;
  }
  export function isDark(): boolean {
    return theme.dark;
  }

  import { VARIANT } from "./core";
  import Toggle, { type ToggleProps } from "./_Toggle.svelte";
</script>

<script lang="ts">
  // prettier-ignore
  let { children, dark = $bindable(), variant = $bindable(VARIANT.NEUTRAL), element = $bindable(), ...rest }: DarkToggleProps = $props();

  // *** Initialize *** //
  if (dark === undefined) dark = theme.dark;

  // *** Initialize Toggle Props *** //
  // svelte-ignore state_referenced_locally
  const svsToggle = {
    ...rest,
    children: main,
    styling: rest.styling ?? `${preset} svs-toggle`,
    ariaLabel: rest.ariaLabel ?? ariaLabel,
  };

  // *** Reactive Handlers *** //
  $effect.pre(() => {
    theme.dark = dark!;
  });
</script>

<!---------------------------------------->

<svelte:head>
  {@html FOUC_SCRIPT}
</svelte:head>

<Toggle bind:value={dark} bind:variant bind:element {...svsToggle} />

{#snippet main(value: boolean, variant: string, element: HTMLButtonElement | undefined)}
  {#if children}
    {@render children(value, variant, element)}
  {:else}
    {#if value}
      {@render svgDark()}
    {:else}
      {@render svgLight()}
    {/if}
  {/if}
{/snippet}
{#snippet svgDark()}
  <svg style="width:100%;height:100%;" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
  </svg>
{/snippet}
{#snippet svgLight()}
  <svg style="width:100%;height:100%;" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" aria-hidden="true">
    <circle cx="12" cy="12" r="5" />
    <path d="M12 0v4M12 20v4M0 12h4M20 12h4M6.4 6.4l-2.9-2.9M17.6 6.4l2.9-2.9M6.4 17.6l-2.9 2.9M17.6 17.6l2.9 2.9" />
  </svg>
{/snippet}
