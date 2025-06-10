// deno-fmt-ignore
export {
  type SVSClass,
  BASE,
  VARIANT,
  PARTS,
  elemId,
  fnClass,
  isNeutral,
  isUnsignedInteger,
  omit,
  debounce,
  throttle,
  UniqueId,
}

type ClassDictionary = Record<string, unknown>;
type ClassArray = (ClassArray | ClassDictionary | string | number | bigint | null | boolean | undefined)[];
type ClassPartialValue = string | ClassArray;
type ClassValue = ClassPartialValue | ClassDictionary;
type ClassRule = Record<string, ClassValue> | ClassPartialValue;
type ClassRuleSet = Record<string, Record<string, ClassValue>>;
type SVSClass = Record<string, ClassRule> | string;
type ClassFn = (part: string, variant: string) => ClassValue | undefined;

const BASE = "base";
const VARIANT = Object.freeze({ NEUTRAL: "neutral", ACTIVE: "active", INACTIVE: "inactive" });
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
});
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
  const rule = prepRule(style) ?? prepRule(preset);
  if (rule == null) return (_, __) => undefined;
  if (typeof rule === "string") return (part, variant) => `${rule} ${part} ${variant}`;
  return (part, variant) => ruleClass(rule, part, variant);
}
function prepRule(rule?: SVSClass): ClassRuleSet | string | undefined {
  if (rule == null) return;
  if (typeof rule === "string") return rule.trim() ? rule : undefined;
  const entries = Object.entries(rule);
  if (!entries.length) return;
  return Object.fromEntries(entries.map(([k, v]) => {
    return v !== null && typeof v === "object" && !Array.isArray(v) ? [k, v] : [k, { base: v }];
  }));
}
function ruleClass(rule: ClassRuleSet, part: string, variant: string): ClassValue | undefined {
  const base = rule[part]?.[BASE] ?? "";
  const dyn = rule[part]?.[variant] ?? rule[part]?.[VARIANT.NEUTRAL] ?? "";
  if (!base && !dyn) return;
  if (base && dyn) return [base, dyn];
  return base ? base : dyn;
}
/**
 * Generates unique random alphabetic ID strings with collision detection.
 * Uses a carefully selected character set of 50 letters (A-Y, a-y) to ensure
 * uniform distribution when using Math.random(), and provides a reserved
 * character space (Z, z) for manual ID injection without conflicts.
 *
 * In default, internal store for detecting collision is automatically cleared
 * when it exceeds 100,000 entries to manage memory usage in long-running.
 *
 * @example
 * ```typescript
 * const idGen = new UniqueId(5);
 * const id1 = idGen.id; // "AbCdE"
 * const id2 = idGen.id; // "XyaBc" (guaranteed to be different from id1)
 *
 * // Conditional generation
 * const conditionalId = idGen.get(someCondition); // string | undefined
 *
 * // Manual injection with reserved characters
 * const manualId = "zTest"; // Will never conflict with generated IDs
 * ```
 */
class UniqueId {
  static #ALPHABETIC = [...Array.from(Array(25).keys(), (x) => x + 65), ...Array.from(Array(25).keys(), (x) => x + 97)];
  #store = new Set<string>();
  #LEN = 3;
  #LIMIT = 100000;

  /**
   * Gets a new unique ID string. Always returns a string (never undefined).
   *
   * @returns A unique alphabetic ID string
   *
   * @example
   * ```typescript
   * const generator = new UniqueId();
   * const myId = generator.id; // "AbC"
   * ```
   */
  get id(): string {
    return this.get(true)!;
  }
  /**
   * Creates a new UniqueId generator instance.
   *
   * @param len   - The length of generated ID strings (minimum 3, defaults to 3)
   * @param limit - Maximum number of IDs to store before clearing the internal store (defaults to 100,000)
   *
   * @example
   * ```typescript
   * const shortIds = new UniqueId(4); // Generates 4-character IDs
   * const longIds = new UniqueId(8);  // Generates 8-character IDs
   * ```
   */
  constructor(len: number = 3, limit: number = 100000) {
    if (len > 2) this.#LEN = len;
    limit = Math.trunc(limit);
    if (limit > 0 && limit < Math.min(Math.pow(50, this.#LEN), Number.MAX_SAFE_INTEGER)) this.#LIMIT = limit;
  }
  /**
   * Conditionally generates a unique ID string based on the provided value.
   * Returns undefined if the value is falsy. The internal store is automatically
   * cleared if it exceeds 100,000 entries to prevent excessive memory usage.
   *
   * @param v - A value to check for truthiness
   * @returns A unique ID string if the value is truthy, undefined otherwise
   *
   * @example
   * ```typescript
   * const generator = new UniqueId(4);
   * const id1 = generator.get(true);        // "AbCd"
   * const id2 = generator.get(false);       // undefined
   * const id3 = generator.get("hello");     // "XyAb"
   * const id4 = generator.get(null);        // undefined
   * ```
   */
  get(v: unknown): string | undefined {
    if (!v) return;
    if (this.#store.size > this.#LIMIT) this.#store.clear();
    return this.#add();
  }
  #char(): number {
    return UniqueId.#ALPHABETIC[Math.trunc(Math.random() * UniqueId.#ALPHABETIC.length)];
  }
  #gen(): string {
    return String.fromCharCode(...Array(this.#LEN).fill(null).map(() => this.#char()));
  }
  #add(): string {
    let id = this.#gen();
    while (this.#store.has(id)) {
      id = this.#gen();
    }
    this.#store.add(id);
    return id;
  }
}
const elemId = new UniqueId();
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
  let timer: number | undefined;
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
  let timer: number | undefined;
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
