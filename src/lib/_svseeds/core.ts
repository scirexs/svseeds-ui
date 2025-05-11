// deno-fmt-ignore
export {
  type SVSStyle,
  CONST,
  STATE,
  PARTS,
  elemId,
  fnClass,
  isNeutral,
  omit,
  debounce,
  throttle,
  UniqueId,
}

type ClassRule = Record<string, string> | string;
type ClassRuleSet = Record<string, Record<string, string>>;
type SVSStyle = Record<string, ClassRule> | string;

const CONST = "const";
const STATE = Object.freeze({ DEFAULT: "default", ACTIVE: "active", INACTIVE: "inactive" });
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

class UniqueId {
  static #ALPHABETIC = [...Array.from(Array(25).keys(), (x) => x + 65), ...Array.from(Array(25).keys(), (x) => x + 97)];
  #store = new Set<string>();
  #LEN = 4;

  get id(): string {
    return this.get(true)!;
  }
  constructor(len: number = 4) {
    if (len > 2) this.#LEN = len;
  }
  get(v: unknown): string | undefined {
    if (!v) return;
    if (this.#store.size > 10000) this.#store.clear();
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

type ClassFn = (part: string, status: string) => string | undefined;
function fnClass(preset: SVSStyle, style?: SVSStyle): ClassFn {
  const rule = prepRule(style) ?? prepRule(preset);
  if (rule == null) return (_, __) => undefined;
  if (typeof rule === "string") return (part, status) => `${rule} ${part} ${status}`;
  return (part, status) => ruleClass(rule, part, status);
}
function prepRule(rule?: SVSStyle): ClassRuleSet | string | undefined {
  if (rule == null) return;
  if (typeof rule === "string") return rule.trim() ? rule : undefined;
  const entries = Object.entries(rule);
  if (!entries.length) return;
  return Object.fromEntries(entries.map(([k, v]) => typeof v === "string" ? [k, { const: v }] : [k, v]));
}
function ruleClass(rule: ClassRuleSet, part: string, status: string): string | undefined {
  const constant = rule[part]?.[CONST] ?? "";
  const dynamic = rule[part]?.[status] ?? rule[part]?.[STATE.DEFAULT] ?? "";
  if (!constant && !dynamic) return;
  return `${constant}${constant && dynamic ? " " : ""}${dynamic}`;
}
function isNeutral(status: string): boolean {
  return status !== STATE.ACTIVE && status !== STATE.INACTIVE;
}
function omit<T extends object, K extends keyof T>(obj?: T, ...keys: K[]): Omit<T, K> | Record<string, never> {
  if (!obj) return {};
  const ret = { ...obj };
  keys.forEach((key) => delete ret[key]);
  return ret;
}
function debounce<Args extends unknown[], R>(delay: number, fn: (...args: Args) => R): (...args: Args) => void {
  let timer: number | undefined;
  return (...args: Args) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      fn.call(null, ...args);
    }, delay);
  };
}
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
