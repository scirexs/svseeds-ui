<!--
  @component
  ### Types
  default value: *`(value)`*
  ```ts
  interface DarkToggleProps {
    children?: Snippet<[boolean, string, HTMLButtonElement | undefined]>; // Snippet<[value,variant,element]>
    dark?: boolean; // bindable (prefers-color-scheme)
    element?: HTMLButtonElement; // bindable
    variant?: string; // bindable (VARIANT.NEUTRAL)
    deps?: DarkToggleDeps;
  }
  interface DarkToggleDeps {
    svsToggle?: Omit<ToggleProps, ToggleReqdProps | ToggleBindProps>;
  }
  ```
  ### Anatomy
  ```svelte
  <Toggle {...deps.svsToggle} bind:value={dark} bind:element>
    {#if children}
      {children}
    {:else}
      // Default Icon
    {/if}
  </Toggle>
  ```
-->
<script module lang="ts">
  export interface DarkToggleProps {
    children?: Snippet<[boolean, string, HTMLButtonElement | undefined]>; // Snippet<[value,variant,element]>
    dark?: boolean; // bindable (prefers-color-scheme)
    element?: HTMLButtonElement; // bindable
    variant?: string; // bindable (VARIANT.NEUTRAL)
    deps?: DarkToggleDeps;
  }
  export interface DarkToggleDeps {
    svsToggle?: Omit<ToggleProps, ToggleReqdProps | ToggleBindProps>;
  }
  export type DarkToggleReqdProps = never;
  export type DarkToggleBindProps = "dark" | "variant" | "element";

  export const THEME = { LIGHT: "light", DARK: "dark" } as const;
  export function setThemeToRoot(theme?: string) {
    if (typeof window === "undefined") return;
    if (!theme) theme = Theme.getPreferTheme();
    window.document.documentElement.classList.add(theme);
  }

  const THEME_SELECTOR = ":root";
  const THEME_LAYER_NAME = "theme";
  const THEME_NAME_KEY = "$theme";
  const THEME_MEDIA_REGEX = /\(prefers-color-scheme:\s*(light|dark)\s*\)/i;
  const THEME_COLOR_PREFIX = "--color-";
  const THEME_TARGET_PREFIX = "--svs-";
  const ariaLabel = "Toggle theme color";
  const preset = "svs-dark-toggle";

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
    } catch (e) { // mainly, due to CORS
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
    if (rule instanceof CSSGroupingRule) return scanGroup(rule, theme);
    if (!(rule instanceof CSSStyleRule) && !(rule instanceof CSSPageRule)) return;
    if (rule.selectorText.includes(THEME_SELECTOR)) {
      const fallback = rule.selectorText === THEME_SELECTOR ? "light" : undefined;
      return getCustomProps(rule.style, theme ?? fallback);
    };
  }
  function getThemeName(condition: string): string | undefined {
    const match = condition.match(THEME_MEDIA_REGEX);
    return match?.[1]?.toLowerCase();
  }
  function getCustomProps(style: CSSStyleDeclaration, theme?: string): CustomProps[] | undefined {
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
    const TW_COLORS = ["red","orange","amber","yellow","lime","green","emerald","teal","cyan","sky","blue","indigo","violet","purple","fuchsia","pink","rose","slate","gray","zinc","neutral","stone"];
    const TW_NUMBERS = ["50","100","200","300","400","500","600","700","800","900","950"];
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
      if (!this.#props.has(theme)) return;
      this.#apply(theme, this.#theme);
      this.#theme = theme;
    }
    #apply(to: string, from: string) {
      if (typeof window === "undefined") return;
      const html = window.document.documentElement;
      Object.entries(this.#props.get(to) ?? {})
        .forEach(([name, value]) => html.style.setProperty(name, value));
      if (html.classList.contains(from)) {
        html.classList.replace(from, to);
      } else {
        html.classList.add(to);
      }
    }
    #setColorScheme() {
      if (typeof window === "undefined") return;
      const themes = Object.keys(this.#props).filter((x) => x === THEME.LIGHT || x === THEME.DARK);
      window.document.documentElement.style.colorScheme = themes.join(" ");
    }

    static #isPreferDark(): boolean {
      if (typeof window === "undefined") return true;
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

  import { type Snippet } from "svelte";
  import { VARIANT, omit } from "./core";
  import Toggle, { type ToggleProps, type ToggleReqdProps, type ToggleBindProps } from "./_Toggle.svelte";
</script>

<script lang="ts">
  let { children, dark = $bindable(), variant = $bindable(""), element = $bindable(), deps }: DarkToggleProps = $props();

  // *** Initialize *** //
  if (!variant) variant = VARIANT.NEUTRAL;
  if (dark === undefined) dark = theme.dark;
  theme.dark = dark;

  // *** Initialize Deps *** //
  const svsToggle = {
    ...omit(deps?.svsToggle, "styling", "attributes"),
    children: main,
    styling: deps?.svsToggle?.styling ?? `${preset} svs-toggle`,
    ariaLabel,
    attributes: {
      ...deps?.svsToggle?.attributes,
    },
  };

  // *** Bind Handlers *** //
  $effect.pre(() => { theme.dark = dark!; });
</script>

<!---------------------------------------->

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
  <svg style="width:100%;height:100%;" viewBox="0 0 24 24" aria-hidden="true">
    <path fill-rule="evenodd" clip-rule="evenodd" d="M12.2256 2.00253C9.59172 1.94346 6.93894 2.9189 4.92893 4.92891C1.02369 8.83415 1.02369 15.1658 4.92893 19.071C8.83418 22.9763 15.1658 22.9763 19.0711 19.071C21.0811 17.061 22.0565 14.4082 21.9975 11.7743C21.9796 10.9772 21.8669 10.1818 21.6595 9.40643C21.0933 9.9488 20.5078 10.4276 19.9163 10.8425C18.5649 11.7906 17.1826 12.4053 15.9301 12.6837C14.0241 13.1072 12.7156 12.7156 12 12C11.2844 11.2844 10.8928 9.97588 11.3163 8.0699C11.5947 6.81738 12.2094 5.43511 13.1575 4.08368C13.5724 3.49221 14.0512 2.90664 14.5935 2.34046C13.8182 2.13305 13.0228 2.02041 12.2256 2.00253ZM17.6569 17.6568C18.9081 16.4056 19.6582 14.8431 19.9072 13.2186C16.3611 15.2643 12.638 15.4664 10.5858 13.4142C8.53361 11.362 8.73568 7.63895 10.7814 4.09281C9.1569 4.34184 7.59434 5.09193 6.34315 6.34313C3.21895 9.46732 3.21895 14.5326 6.34315 17.6568C9.46734 20.781 14.5327 20.781 17.6569 17.6568Z" />
  </svg>
{/snippet}
{#snippet svgLight()}
  <svg style="width:100%;height:100%;" viewBox="0 0 24 24" aria-hidden="true">
    <path fill-rule="evenodd" clip-rule="evenodd" d="M12 16C14.2091 16 16 14.2091 16 12C16 9.79086 14.2091 8 12 8C9.79086 8 8 9.79086 8 12C8 14.2091 9.79086 16 12 16ZM12 18C15.3137 18 18 15.3137 18 12C18 8.68629 15.3137 6 12 6C8.68629 6 6 8.68629 6 12C6 15.3137 8.68629 18 12 18Z" />
    <path fill-rule="evenodd" clip-rule="evenodd" d="M11 0H13V4.06189C12.6724 4.02104 12.3387 4 12 4C11.6613 4 11.3276 4.02104 11 4.06189V0ZM7.0943 5.68018L4.22173 2.80761L2.80752 4.22183L5.6801 7.09441C6.09071 6.56618 6.56608 6.0908 7.0943 5.68018ZM4.06189 11H0V13H4.06189C4.02104 12.6724 4 12.3387 4 12C4 11.6613 4.02104 11.3276 4.06189 11ZM5.6801 16.9056L2.80751 19.7782L4.22173 21.1924L7.0943 18.3198C6.56608 17.9092 6.09071 17.4338 5.6801 16.9056ZM11 19.9381V24H13V19.9381C12.6724 19.979 12.3387 20 12 20C11.6613 20 11.3276 19.979 11 19.9381ZM16.9056 18.3199L19.7781 21.1924L21.1923 19.7782L18.3198 16.9057C17.9092 17.4339 17.4338 17.9093 16.9056 18.3199ZM19.9381 13H24V11H19.9381C19.979 11.3276 20 11.6613 20 12C20 12.3387 19.979 12.6724 19.9381 13ZM18.3198 7.0943L21.1923 4.22183L19.7781 2.80762L16.9056 5.6801C17.4338 6.09071 17.9092 6.56608 18.3198 7.0943Z" />
  </svg>
{/snippet}
