export {
  type SVSClass,
  type SVSVariant,
  type SVSPart,
  type SVSFieldValidation,
  type SVSFieldConstraint,
  type SVSContext,
  type CollectionEvents,
  BASE,
  SR_ONLY,
  DEFAULT_DURATION,
  VARIANT,
  PARTS,
  _createContext,
  _isVariantMap,
  _prepRule,
  _ruleClass,
  _resolveDuration,
  _cssVar,
  _cssVarStyle,
  fnClass,
  isNeutral,
  isUnsignedInteger,
  shouldReduceMotion,
  omit,
  debounce,
  throttle,
};

import { getContext, setContext } from "svelte";

type ClassDictionary = Record<string, unknown>;
type ClassArray = (ClassArray | ClassDictionary | string | number | bigint | null | boolean | undefined)[];
type ClassPartialValue = string | ClassArray;
type ClassValue = ClassPartialValue | ClassDictionary;
// A part value is either a class value applied to every variant (string / array / clsx condition object)
// or a variant map (Record<variant, ClassValue>). Including ClassDictionary lets a bare clsx object be
// written directly without the historical array-wrap workaround; see _isVariantMap for runtime disambiguation.
type ClassRule = ClassPartialValue | ClassDictionary | Record<string, ClassValue>;
type ClassRuleSet = Record<string, Record<string, ClassValue>>;
type SVSClass = Record<string, ClassRule> | string;
type ClassFn = (part: string, variant: string) => ClassValue | undefined;
type SVSFieldValidation<V, E extends HTMLElement = HTMLInputElement> = (ctx: {
  value: V;
  validity: ValidityState;
  element: E;
}) => string | undefined | null;
type SVSFieldConstraint<E extends HTMLElement = HTMLInputElement> = (ctx: {
  value: string;
  values: string[];
  validity: ValidityState;
  element: E;
}) => string | undefined | null;
type SVSContext = {
  get variant(): SVSVariant;
  get styling(): SVSClass | undefined;
};
interface CollectionEvents<T> {
  // Return the subset to commit: undefined => all, [] => none.
  onadd?: (detail: { values: T[]; added: T[] }) => T[] | void;
  onremove?: (detail: { values: T[]; removed: T[] }) => T[] | void;
}

const BASE = "base";
const SR_ONLY =
  "position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap;border:0;";
const DEFAULT_DURATION = 200;
const VARIANT = Object.freeze({ NEUTRAL: "neutral", ACTIVE: "active", INACTIVE: "inactive" } as const);
const PARTS = Object.freeze({
  WHOLE: "whole",
  MIDDLE: "middle",
  MAIN: "main",
  TOP: "top",
  LEFT: "left",
  RIGHT: "right",
  BOTTOM: "bottom",
  LABEL: "label",
  AUX: "aux",
  EXTRA: "extra",
} as const);
type SVSVariant = (typeof VARIANT)[keyof typeof VARIANT] | (string & {});
type SVSPart = (typeof PARTS)[keyof typeof PARTS] | (string & {});
/**
 * Creates a function that dynamically generates CSS classes based on component parts and variant.
 *
 * Compatible with ClassValue type available in Svelte 5.16+ class attributes,
 * this function generates a ClassFn that returns appropriate CSS classes
 * based on the combination of component parts and their variants.
 *
 * @param preset - Preset style definition. Can be a string or style rule object
 * @param style - Optional style definition. Takes precedence over preset when provided
 *
 * @returns Function that takes part and variant parameters and returns ClassValue
 *
 * @example
 * // String preset case
 * const classFn = fnClass("my-preset");
 * classFn("whole", "active"); // "my-preset whole active"
 *
 * @example
 * // Rule-based case
 * const rules = {
 *   whole: {
 *     base: "container",
 *     active: "container-active"
 *   },
 *   main: {
 *     base: "main-content"
 *   }
 * };
 * const classFn = fnClass(rules);
 * classFn("whole", "neutral"); // "container"
 * classFn("whole", "active");  // ["container", "container-active"]
 * classFn("main", "neutral");  // "main-content"
 * classFn("unknown", "active"); // undefined
 *
 * @example
 * // Overriding preset with style
 * const preset = "default-style";
 * const customStyle = {
 *   button: {
 *     base: "btn",
 *     active: "btn-active"
 *   }
 * };
 * const classFn = fnClass(preset, customStyle);
 * classFn("button", "active"); // ["btn", "btn-active"]
 */
function fnClass(preset: SVSClass, style?: SVSClass): ClassFn {
  const rule = _prepRule(style) ?? _prepRule(preset);
  if (rule == null) return (_, __) => undefined;
  if (typeof rule === "string") return (part, variant) => `${rule} ${part} ${variant}`;
  return (part, variant) => _ruleClass(rule, part, variant);
}
function _prepRule(rule?: SVSClass): ClassRuleSet | string | undefined {
  if (rule == null) return;
  if (typeof rule === "string") return rule.trim() ? rule : undefined;
  const entries = Object.entries(rule);
  if (!entries.length) return;
  return Object.fromEntries(entries.map(([k, v]) => (_isVariantMap(v) ? [k, v] : [k, { base: v }])));
}
function _isVariantMap(v: ClassRule): v is Record<string, ClassValue> {
  if (v === null || typeof v !== "object" || Array.isArray(v)) return false;
  // A clsx condition object (e.g. { foo, bar: !foo }) has boolean values; a variant map's values are ClassValue (never boolean).
  return !Object.values(v).some((x) => typeof x === "boolean");
}
function _ruleClass(rule: ClassRuleSet, part: string, variant: string): ClassValue | undefined {
  const base = rule[part]?.[BASE] ?? "";
  const dyn = rule[part]?.[variant] ?? rule[part]?.[VARIANT.NEUTRAL] ?? "";
  if (!base && !dyn) return;
  if (base && dyn) return [base, dyn];
  return base ? base : dyn;
}
/**
 * Determines whether a variant is in a neutral variant (neither ACTIVE nor INACTIVE).
 *
 * @param variant - The variant string to check
 * @returns false if the variant is ACTIVE or INACTIVE, true otherwise
 *
 * @example
 * ```typescript
 * isNeutral(VARIANT.NEUTRAL); // true
 * isNeutral("custom variant"); // true
 * isNeutral(VARIANT.ACTIVE); // false
 * isNeutral(VARIANT.INACTIVE); // false
 * ```
 */
function isNeutral(variant: string): boolean {
  return variant !== VARIANT.ACTIVE && variant !== VARIANT.INACTIVE;
}
/**
 * Checks if a given number is an unsigned integer (non-negative integer).
 *
 * @param num - The number to check
 * @returns True if the number is an integer and greater than or equal to zero, false otherwise
 *
 * @example
 * ```typescript
 * isUnsignedInteger(5);        // true
 * isUnsignedInteger(0);        // true
 * isUnsignedInteger(-1);       // false
 * isUnsignedInteger(3.14);     // false
 * isUnsignedInteger(NaN);      // false
 * isUnsignedInteger(Infinity); // false
 * ```
 */
function isUnsignedInteger(num: number): boolean {
  return Number.isInteger(num) && num >= 0;
}
/**
 * Checks whether the user prefers reduced motion via the `prefers-reduced-motion` media query.
 *
 * Returns `false` in non-browser environments (e.g. SSR) where `window` is unavailable,
 * so that motion is treated as allowed by default during server-side rendering.
 *
 * @returns True if the user has requested reduced motion, false otherwise (including SSR)
 *
 * @example
 * ```typescript
 * shouldReduceMotion(); // true when OS/browser setting is "reduce"
 * ```
 */
function shouldReduceMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
function _resolveDuration(duration?: number, fallback: number = DEFAULT_DURATION): number {
  if (shouldReduceMotion()) return 0;
  return isUnsignedInteger(duration as number) ? (duration as number) : fallback;
}
function _cssVar(map: Partial<Record<string, string>> | undefined, key: string, fallback: string): string {
  return map?.[key] ?? fallback;
}
function _cssVarStyle(entries: { name?: string; value?: string }[]): string | undefined {
  const css = entries
    .filter((e) => e.name && e.value != null)
    .map((e) => `${e.name}: ${e.value}`)
    .join("; ");
  return css || undefined;
}
/**
 * Creates a new object with specified keys omitted from the original object.
 * Returns an empty object if the input object is undefined or null.
 *
 * @param obj - The source object to omit keys from
 * @param keys - The keys to omit from the object
 * @returns A new object with the specified keys removed, or an empty object if input is falsy
 *
 * @example
 * ```typescript
 * const user = { id: 1, name: "John", email: "john@example.com" };
 * const publicUser = omit(user, "email"); // { id: 1, name: "John" }
 * const empty = omit(undefined, "key"); // {}
 * ```
 */
function omit<T extends object, K extends keyof T>(obj?: T, ...keys: K[]): Omit<T, K> | Record<string, never> {
  if (!obj) return {};
  const ret = { ...obj };
  keys.forEach((key) => delete ret[key]);
  return ret;
}
/**
 * Creates a scoped Svelte context backed by a fresh unique key.
 * @internal
 *
 * @returns A tuple of `[getContext, setContext]` bound to a private Symbol key
 *
 * @example
 * ```typescript
 * const [getCtx, setCtx] = _createContext<MyContext>();
 * setCtx(value);
 * const ctx = getCtx();
 * ```
 */
function _createContext<T>(): [() => T | undefined, (context: T) => T] {
  const key = Symbol();
  return [() => getContext<T | undefined>(key), (context: T) => setContext(key, context)];
}
/**
 * Creates a debounced function that delays invoking the provided function until after
 * the specified delay has elapsed since the last time it was invoked.
 *
 * @param delay - The number of milliseconds to delay
 * @param fn - The function to debounce
 * @returns A debounced version of the function
 *
 * @example
 * ```typescript
 * const debouncedSearch = debounce(300, (query: string) => {
 *   console.log("Searching for:", query);
 * });
 *
 * debouncedSearch("hello"); // Will only execute after 300ms of no further calls
 * debouncedSearch("hello world"); // Cancels previous call, waits another 300ms
 * ```
 */
function debounce<Args extends unknown[], R>(delay: number, fn: (...args: Args) => R): (...args: Args) => void {
  let timer: ReturnType<typeof setTimeout> | undefined;
  return (...args: Args) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      fn.call(null, ...args);
    }, delay);
  };
}
/**
 * Creates a throttled function that only invokes the provided function at most once
 * per specified interval. Subsequent calls within the interval are queued and executed
 * at the next available interval boundary.
 *
 * @param interval - The number of milliseconds to throttle invocations to
 * @param fn - The function to throttle
 * @returns A throttled version of the function
 *
 * @example
 * ```typescript
 * const throttledScroll = throttle(100, (event: Event) => {
 *   console.log("Scroll event handled");
 * });
 *
 * window.addEventListener("scroll", throttledScroll);
 * // Will execute at most once every 100ms, even if scroll events fire more frequently
 * ```
 */
function throttle<Args extends unknown[], R>(interval: number, fn: (...args: Args) => R): (...args: Args) => void {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let last: number = 0;
  const elapsed = () => Date.now() - last;
  const run = (args: Args) => {
    fn.call(null, ...args);
    last = Date.now();
  };
  return (...args: Args) => {
    if (!last) return run(args);
    clearTimeout(timer);
    timer = setTimeout(() => {
      if (elapsed() >= interval) run(args);
    }, interval - elapsed());
  };
}
