// deno-fmt-ignore
export {
  type ClassRuleSet,
  CONST,
  STATE,
  AREA,
  elemId,
  fnClass,
  isNeutral,
  omit,
  debounce,
  throttle,
  UniqueId,
};

type ClassRule = Partial<Record<string, string>>;
type ClassRuleSet = Partial<Record<string, ClassRule>>;

const CONST = "const";
const STATE = Object.freeze({ DEFAULT: "default", ACTIVE: "active", INACTIVE: "inactive" });
const AREA = Object.freeze({
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

type ClassFn = (area: string, status: string) => string | undefined;
function fnClass(name: string, preset: ClassRuleSet, style?: ClassRuleSet | string): ClassFn {
  const rule = getRule(name, preset, style ?? {});
  if (typeof rule === "string") {
    return (area: string, status: string) => cssClass(rule, area, status);
  } else {
    return (area: string, status: string) => ruleClass(rule, area, status);
  }
}
function getRule(name: string, preset: ClassRuleSet, style: ClassRuleSet | string): ClassRuleSet | string {
  if (typeof style === "string") return style.trim() ? style : name;
  const rule = mergeRule(preset, style);
  return Object.keys(rule).length <= 0 ? name : rule;
}
function cssClass(name: string, area: string, status: string): string {
  return `${name} ${area}${status === STATE.DEFAULT ? "" : ` ${status}`}`;
}
function ruleClass(rule: ClassRuleSet, area: string, status: string): string | undefined {
  const constant = rule[area]?.[CONST] ?? "";
  const dynamic = rule[area]?.[status] ?? rule[area]?.[STATE.DEFAULT] ?? "";
  return constant === "" && dynamic === "" ? undefined : `${constant}${constant && dynamic ? " " : ""}${dynamic}`;
}
function mergeRule(preset: ClassRuleSet, style: ClassRuleSet): ClassRuleSet {
  const presetKeys = Object.keys(preset) as string[];
  if (presetKeys.length <= 0) return style;
  const styleKeys = Object.keys(style) as string[];
  if (styleKeys.length <= 0) return preset;
  const result: ClassRuleSet = {};
  new Set([...presetKeys, ...styleKeys]).forEach((key) => {
    result[key] = { ...preset[key] ?? {}, ...style[key] ?? {} };
  });
  return result;
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
