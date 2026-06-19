import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { getContext, setContext } from "svelte";
import {
  BASE,
  canHover,
  _DEFAULT_DURATION,
  _debounce,
  _fnClass,
  _isNeutral,
  _isUnsignedInteger,
  _omit,
  PARTS,
  SR_ONLY,
  shouldReduceMotion,
  _throttle,
  VARIANT,
  _cssVar,
  _cssVarStyle,
  _createContext,
  _isVariantMap,
  _prepRule,
  _resolveDuration,
  _ruleClass,
} from "#svs/core";

vi.mock("svelte", async (importOriginal) => {
  const actual = await importOriginal<typeof import("svelte")>();
  return {
    ...actual,
    getContext: vi.fn(),
    setContext: vi.fn((_, context) => context),
  };
});

describe("const vars", () => {
  test("VARIANT", () => {
    expect(VARIANT).toEqual({
      NEUTRAL: "neutral",
      ACTIVE: "active",
      INACTIVE: "inactive",
    });
    expect(Object.isFrozen(VARIANT)).toBe(true);
  });
  test("PARTS", () => {
    expect(PARTS).toEqual({
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
    expect(Object.isFrozen(PARTS)).toBe(true);
  });
  test("BASE", () => {
    expect(BASE).toBe("base");
  });
  test("SR_ONLY", () => {
    expect(SR_ONLY).toBe("position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap;border:0;");
  });
});

describe("class rule helpers", () => {
  test("_isVariantMap rejects primitive values, arrays, and clsx condition objects", () => {
    expect(_isVariantMap("class-name")).toBe(false);
    expect(_isVariantMap(["class-name"])).toBe(false);
    expect(_isVariantMap({ selected: true, disabled: false })).toBe(false);
  });

  test("_isVariantMap accepts plain objects whose values are class values", () => {
    expect(_isVariantMap({ [BASE]: "base-class", [VARIANT.ACTIVE]: ["active-class"] })).toBe(true);
    expect(_isVariantMap({ [VARIANT.NEUTRAL]: { neutralClass: null } })).toBe(true);
  });

  test("_prepRule trims blank strings and returns undefined for empty rules", () => {
    expect(_prepRule()).toBeUndefined();
    expect(_prepRule("   ")).toBeUndefined();
    expect(_prepRule({})).toBeUndefined();
    expect(_prepRule("  ui-button  ")).toBe("  ui-button  ");
  });

  test("_prepRule wraps part-level class values as base rules", () => {
    expect(_prepRule({ [PARTS.WHOLE]: "whole-class", [PARTS.MAIN]: ["main-class"] })).toEqual({
      [PARTS.WHOLE]: { [BASE]: "whole-class" },
      [PARTS.MAIN]: { [BASE]: ["main-class"] },
    });
  });

  test("_prepRule preserves variant maps", () => {
    expect(_prepRule({ [PARTS.WHOLE]: { [BASE]: "base-class", [VARIANT.ACTIVE]: "active-class" } })).toEqual({
      [PARTS.WHOLE]: { [BASE]: "base-class", [VARIANT.ACTIVE]: "active-class" },
    });
  });

  test("_ruleClass returns base, variant, fallback neutral, or undefined", () => {
    const rule = {
      [PARTS.WHOLE]: { [BASE]: "base-class", [VARIANT.ACTIVE]: "active-class", [VARIANT.NEUTRAL]: "neutral-class" },
      [PARTS.MAIN]: { [VARIANT.ACTIVE]: "main-active" },
      [PARTS.TOP]: { [BASE]: "top-base" },
    };

    expect(_ruleClass(rule, PARTS.WHOLE, VARIANT.ACTIVE)).toEqual(["base-class", "active-class"]);
    expect(_ruleClass(rule, PARTS.WHOLE, VARIANT.INACTIVE)).toEqual(["base-class", "neutral-class"]);
    expect(_ruleClass(rule, PARTS.MAIN, VARIANT.ACTIVE)).toBe("main-active");
    expect(_ruleClass(rule, PARTS.TOP, VARIANT.ACTIVE)).toBe("top-base");
    expect(_ruleClass(rule, PARTS.RIGHT, VARIANT.ACTIVE)).toBeUndefined();
  });
});

describe("variant and number helpers", () => {
  test("_isNeutral returns false only for active and inactive variants", () => {
    expect(_isNeutral(VARIANT.NEUTRAL)).toBe(true);
    expect(_isNeutral("custom")).toBe(true);
    expect(_isNeutral("")).toBe(true);
    expect(_isNeutral(VARIANT.ACTIVE)).toBe(false);
    expect(_isNeutral(VARIANT.INACTIVE)).toBe(false);
  });

  test("_isUnsignedInteger accepts zero and positive integers", () => {
    expect(_isUnsignedInteger(0)).toBe(true);
    expect(_isUnsignedInteger(1)).toBe(true);
    expect(_isUnsignedInteger(Number.MAX_SAFE_INTEGER)).toBe(true);
  });

  test("_isUnsignedInteger rejects negative, fractional, and non-finite numbers", () => {
    expect(_isUnsignedInteger(-1)).toBe(false);
    expect(_isUnsignedInteger(1.1)).toBe(false);
    expect(_isUnsignedInteger(NaN)).toBe(false);
    expect(_isUnsignedInteger(Infinity)).toBe(false);
  });
});

describe("_createContext", () => {
  test("returns get and set functions backed by the same private key", () => {
    const [getCtx, setCtx] = _createContext<{ value: string }>();
    const value = { value: "context-value" };

    expect(setCtx(value)).toBe(value);
    expect(setContext).toHaveBeenCalledWith(expect.any(Symbol), value);

    const key = vi.mocked(setContext).mock.calls[0]?.[0];
    getCtx();
    expect(getContext).toHaveBeenCalledWith(key);
  });

  test("uses a unique key for each context factory", () => {
    const [, setFirst] = _createContext<string>();
    const [, setSecond] = _createContext<string>();

    setFirst("first");
    setSecond("second");

    const firstKey = vi.mocked(setContext).mock.calls.at(-2)?.[0];
    const secondKey = vi.mocked(setContext).mock.calls.at(-1)?.[0];
    expect(firstKey).not.toBe(secondKey);
  });
});

describe("_fnClass", () => {
  const pstr = "preset-str";
  const sstr = "style-str";
  const prule = {
    [PARTS.WHOLE]: "preset-rule-w",
    [PARTS.TOP]: "preset-rule-t",
  };
  const srule = {
    [PARTS.WHOLE]: "style-rule-w",
    [PARTS.MAIN]: "style-rule-m",
  };
  const srulex = {
    [PARTS.WHOLE]: {
      [BASE]: ["style-rule-w1", "style-rule-w2"],
      [VARIANT.ACTIVE]: { stylerulewa: "style-rule-wa" },
    },
    [PARTS.MAIN]: [{ stylerulem: "style-rule-m" }],
  };
  const prules = {
    [PARTS.WHOLE]: {
      [BASE]: "preset-rules-wc",
      [VARIANT.NEUTRAL]: "preset-rules-wd",
    },
    [PARTS.TOP]: {
      [VARIANT.NEUTRAL]: "preset-rules-tc",
      [VARIANT.INACTIVE]: "preset-rules-ti",
    },
  };
  const srules = {
    [PARTS.WHOLE]: {
      [BASE]: "style-rules-wc",
      [VARIANT.ACTIVE]: "style-rules-wa",
    },
    [PARTS.MAIN]: {
      [BASE]: "style-rules-mc",
      [VARIANT.INACTIVE]: "style-rules-mi",
    },
  };

  // preset_style
  const str_str = _fnClass(pstr, sstr);
  const str_rule = _fnClass(pstr, srule);
  const str_rulex = _fnClass(pstr, srulex);
  const str_rules = _fnClass(pstr, srules);
  const str_blank = _fnClass(pstr, "");
  const str_empty = _fnClass(pstr, {});
  const str_undef = _fnClass(pstr, undefined);
  const rule_str = _fnClass(prule, sstr);
  const rule_rule = _fnClass(prule, srule);
  const rule_rules = _fnClass(prule, srules);
  const rule_blank = _fnClass(prule, "");
  const rule_empty = _fnClass(prule, {});
  const rule_undef = _fnClass(prule, undefined);
  const rules_str = _fnClass(prules, sstr);
  const rules_rule = _fnClass(prules, srule);
  const rules_rules = _fnClass(prules, srules);
  const rules_blank = _fnClass(prules, "");
  const rules_empty = _fnClass(prules, {});
  const rules_undef = _fnClass(prules, undefined);
  const blank_str = _fnClass("", sstr);
  const blank_rule = _fnClass("", srule);
  const blank_rules = _fnClass("", srules);
  const blank_blank = _fnClass("", "");
  const blank_empty = _fnClass("", {});
  const blank_undef = _fnClass("", undefined);
  const empty_str = _fnClass({}, sstr);
  const empty_rule = _fnClass({}, srule);
  const empty_rules = _fnClass({}, srules);
  const empty_blank = _fnClass({}, "");
  const empty_empty = _fnClass({}, {});
  const empty_undef = _fnClass({}, undefined);

  test("str_str", () => {
    const wholeNeutral = str_str(PARTS.WHOLE, VARIANT.NEUTRAL);
    const wholeActive = str_str(PARTS.WHOLE, VARIANT.ACTIVE);
    const wholeInactive = str_str(PARTS.WHOLE, VARIANT.INACTIVE);
    const topNeutral = str_str(PARTS.TOP, VARIANT.NEUTRAL);
    const mainNeutral = str_str(PARTS.MAIN, VARIANT.NEUTRAL);
    expect(wholeNeutral).toBe(`${sstr} ${PARTS.WHOLE} ${VARIANT.NEUTRAL}`);
    expect(wholeActive).toBe(`${sstr} ${PARTS.WHOLE} ${VARIANT.ACTIVE}`);
    expect(wholeInactive).toBe(`${sstr} ${PARTS.WHOLE} ${VARIANT.INACTIVE}`);
    expect(topNeutral).toBe(`${sstr} ${PARTS.TOP} ${VARIANT.NEUTRAL}`);
    expect(mainNeutral).toBe(`${sstr} ${PARTS.MAIN} ${VARIANT.NEUTRAL}`);
  });
  test("str_rule", () => {
    const wholeNeutral = str_rule(PARTS.WHOLE, VARIANT.NEUTRAL);
    const wholeActive = str_rule(PARTS.WHOLE, VARIANT.ACTIVE);
    const wholeInactive = str_rule(PARTS.WHOLE, VARIANT.INACTIVE);
    const topNeutral = str_rule(PARTS.TOP, VARIANT.NEUTRAL);
    const mainNeutral = str_rule(PARTS.MAIN, VARIANT.NEUTRAL);
    expect(wholeNeutral).toBe(`${srule[PARTS.WHOLE]}`);
    expect(wholeActive).toBe(`${srule[PARTS.WHOLE]}`);
    expect(wholeInactive).toBe(`${srule[PARTS.WHOLE]}`);
    expect(topNeutral).toBeUndefined();
    expect(mainNeutral).toBe(`${srule[PARTS.MAIN]}`);
  });
  test("str_rulex", () => {
    const wholeNeutral = str_rulex(PARTS.WHOLE, VARIANT.NEUTRAL);
    const wholeActive = str_rulex(PARTS.WHOLE, VARIANT.ACTIVE);
    const wholeInactive = str_rulex(PARTS.WHOLE, VARIANT.INACTIVE);
    const topNeutral = str_rulex(PARTS.TOP, VARIANT.NEUTRAL);
    const mainNeutral = str_rulex(PARTS.MAIN, VARIANT.NEUTRAL);
    expect(wholeNeutral).toEqual(srulex[PARTS.WHOLE][BASE]);
    expect(wholeActive).toEqual([srulex[PARTS.WHOLE][BASE], srulex[PARTS.WHOLE][VARIANT.ACTIVE]]);
    expect(wholeInactive).toEqual(srulex[PARTS.WHOLE][BASE]);
    expect(topNeutral).toBeUndefined();
    expect(mainNeutral).toEqual(srulex[PARTS.MAIN]);
  });
  test("str_rules", () => {
    const wholeNeutral = str_rules(PARTS.WHOLE, VARIANT.NEUTRAL);
    const wholeActive = str_rules(PARTS.WHOLE, VARIANT.ACTIVE);
    const wholeInactive = str_rules(PARTS.WHOLE, VARIANT.INACTIVE);
    const topNeutral = str_rules(PARTS.TOP, VARIANT.NEUTRAL);
    const mainNeutral = str_rules(PARTS.MAIN, VARIANT.NEUTRAL);
    expect(wholeNeutral).toBe(`${srules[PARTS.WHOLE][BASE]}`);
    expect(wholeActive).toEqual([srules[PARTS.WHOLE][BASE], srules[PARTS.WHOLE][VARIANT.ACTIVE]]);
    expect(wholeInactive).toBe(`${srules[PARTS.WHOLE][BASE]}`);
    expect(topNeutral).toBeUndefined();
    expect(mainNeutral).toBe(`${srules[PARTS.MAIN][BASE]}`);
  });
  test("str_blank", () => {
    const wholeNeutral = str_blank(PARTS.WHOLE, VARIANT.NEUTRAL);
    const wholeActive = str_blank(PARTS.WHOLE, VARIANT.ACTIVE);
    const wholeInactive = str_blank(PARTS.WHOLE, VARIANT.INACTIVE);
    const topNeutral = str_blank(PARTS.TOP, VARIANT.NEUTRAL);
    const mainNeutral = str_blank(PARTS.MAIN, VARIANT.NEUTRAL);
    expect(wholeNeutral).toBe(`${pstr} ${PARTS.WHOLE} ${VARIANT.NEUTRAL}`);
    expect(wholeActive).toBe(`${pstr} ${PARTS.WHOLE} ${VARIANT.ACTIVE}`);
    expect(wholeInactive).toBe(`${pstr} ${PARTS.WHOLE} ${VARIANT.INACTIVE}`);
    expect(topNeutral).toBe(`${pstr} ${PARTS.TOP} ${VARIANT.NEUTRAL}`);
    expect(mainNeutral).toBe(`${pstr} ${PARTS.MAIN} ${VARIANT.NEUTRAL}`);
  });
  test("str_empty", () => {
    const wholeNeutral = str_empty(PARTS.WHOLE, VARIANT.NEUTRAL);
    const wholeActive = str_empty(PARTS.WHOLE, VARIANT.ACTIVE);
    const wholeInactive = str_empty(PARTS.WHOLE, VARIANT.INACTIVE);
    const topNeutral = str_empty(PARTS.TOP, VARIANT.NEUTRAL);
    const mainNeutral = str_empty(PARTS.MAIN, VARIANT.NEUTRAL);
    expect(wholeNeutral).toBe(`${pstr} ${PARTS.WHOLE} ${VARIANT.NEUTRAL}`);
    expect(wholeActive).toBe(`${pstr} ${PARTS.WHOLE} ${VARIANT.ACTIVE}`);
    expect(wholeInactive).toBe(`${pstr} ${PARTS.WHOLE} ${VARIANT.INACTIVE}`);
    expect(topNeutral).toBe(`${pstr} ${PARTS.TOP} ${VARIANT.NEUTRAL}`);
    expect(mainNeutral).toBe(`${pstr} ${PARTS.MAIN} ${VARIANT.NEUTRAL}`);
  });
  test("str_undef", () => {
    const wholeNeutral = str_undef(PARTS.WHOLE, VARIANT.NEUTRAL);
    const wholeActive = str_undef(PARTS.WHOLE, VARIANT.ACTIVE);
    const wholeInactive = str_undef(PARTS.WHOLE, VARIANT.INACTIVE);
    const topNeutral = str_undef(PARTS.TOP, VARIANT.NEUTRAL);
    const mainNeutral = str_undef(PARTS.MAIN, VARIANT.NEUTRAL);
    expect(wholeNeutral).toBe(`${pstr} ${PARTS.WHOLE} ${VARIANT.NEUTRAL}`);
    expect(wholeActive).toBe(`${pstr} ${PARTS.WHOLE} ${VARIANT.ACTIVE}`);
    expect(wholeInactive).toBe(`${pstr} ${PARTS.WHOLE} ${VARIANT.INACTIVE}`);
    expect(topNeutral).toBe(`${pstr} ${PARTS.TOP} ${VARIANT.NEUTRAL}`);
    expect(mainNeutral).toBe(`${pstr} ${PARTS.MAIN} ${VARIANT.NEUTRAL}`);
  });
  test("rule_str", () => {
    const wholeNeutral = rule_str(PARTS.WHOLE, VARIANT.NEUTRAL);
    const wholeActive = rule_str(PARTS.WHOLE, VARIANT.ACTIVE);
    const wholeInactive = rule_str(PARTS.WHOLE, VARIANT.INACTIVE);
    const topNeutral = rule_str(PARTS.TOP, VARIANT.NEUTRAL);
    const mainNeutral = rule_str(PARTS.MAIN, VARIANT.NEUTRAL);
    expect(wholeNeutral).toBe(`${sstr} ${PARTS.WHOLE} ${VARIANT.NEUTRAL}`);
    expect(wholeActive).toBe(`${sstr} ${PARTS.WHOLE} ${VARIANT.ACTIVE}`);
    expect(wholeInactive).toBe(`${sstr} ${PARTS.WHOLE} ${VARIANT.INACTIVE}`);
    expect(topNeutral).toBe(`${sstr} ${PARTS.TOP} ${VARIANT.NEUTRAL}`);
    expect(mainNeutral).toBe(`${sstr} ${PARTS.MAIN} ${VARIANT.NEUTRAL}`);
  });
  test("rule_rule", () => {
    const wholeNeutral = rule_rule(PARTS.WHOLE, VARIANT.NEUTRAL);
    const wholeActive = rule_rule(PARTS.WHOLE, VARIANT.ACTIVE);
    const wholeInactive = rule_rule(PARTS.WHOLE, VARIANT.INACTIVE);
    const topNeutral = rule_rule(PARTS.TOP, VARIANT.NEUTRAL);
    const mainNeutral = rule_rule(PARTS.MAIN, VARIANT.NEUTRAL);
    expect(wholeNeutral).toBe(`${srule[PARTS.WHOLE]}`);
    expect(wholeActive).toBe(`${srule[PARTS.WHOLE]}`);
    expect(wholeInactive).toBe(`${srule[PARTS.WHOLE]}`);
    expect(topNeutral).toBeUndefined();
    expect(mainNeutral).toBe(`${srule[PARTS.MAIN]}`);
  });
  test("rule_rules", () => {
    const wholeNeutral = rule_rules(PARTS.WHOLE, VARIANT.NEUTRAL);
    const wholeActive = rule_rules(PARTS.WHOLE, VARIANT.ACTIVE);
    const wholeInactive = rule_rules(PARTS.WHOLE, VARIANT.INACTIVE);
    const topNeutral = rule_rules(PARTS.TOP, VARIANT.NEUTRAL);
    const mainNeutral = rule_rules(PARTS.MAIN, VARIANT.NEUTRAL);
    expect(wholeNeutral).toBe(`${srules[PARTS.WHOLE][BASE]}`);
    expect(wholeActive).toEqual([srules[PARTS.WHOLE][BASE], srules[PARTS.WHOLE][VARIANT.ACTIVE]]);
    expect(wholeInactive).toBe(`${srules[PARTS.WHOLE][BASE]}`);
    expect(topNeutral).toBeUndefined();
    expect(mainNeutral).toBe(`${srules[PARTS.MAIN][BASE]}`);
  });
  test("rule_blank", () => {
    const wholeNeutral = rule_blank(PARTS.WHOLE, VARIANT.NEUTRAL);
    const wholeActive = rule_blank(PARTS.WHOLE, VARIANT.ACTIVE);
    const wholeInactive = rule_blank(PARTS.WHOLE, VARIANT.INACTIVE);
    const topNeutral = rule_blank(PARTS.TOP, VARIANT.NEUTRAL);
    const mainNeutral = rule_blank(PARTS.MAIN, VARIANT.NEUTRAL);
    expect(wholeNeutral).toBe(`${prule[PARTS.WHOLE]}`);
    expect(wholeActive).toBe(`${prule[PARTS.WHOLE]}`);
    expect(wholeInactive).toBe(`${prule[PARTS.WHOLE]}`);
    expect(topNeutral).toBe(`${prule[PARTS.TOP]}`);
    expect(mainNeutral).toBeUndefined();
  });
  test("rule_empty", () => {
    const wholeNeutral = rule_empty(PARTS.WHOLE, VARIANT.NEUTRAL);
    const wholeActive = rule_empty(PARTS.WHOLE, VARIANT.ACTIVE);
    const wholeInactive = rule_empty(PARTS.WHOLE, VARIANT.INACTIVE);
    const topNeutral = rule_empty(PARTS.TOP, VARIANT.NEUTRAL);
    const mainNeutral = rule_empty(PARTS.MAIN, VARIANT.NEUTRAL);
    expect(wholeNeutral).toBe(`${prule[PARTS.WHOLE]}`);
    expect(wholeActive).toBe(`${prule[PARTS.WHOLE]}`);
    expect(wholeInactive).toBe(`${prule[PARTS.WHOLE]}`);
    expect(topNeutral).toBe(`${prule[PARTS.TOP]}`);
    expect(mainNeutral).toBeUndefined();
  });
  test("rule_undef", () => {
    const wholeNeutral = rule_undef(PARTS.WHOLE, VARIANT.NEUTRAL);
    const wholeActive = rule_undef(PARTS.WHOLE, VARIANT.ACTIVE);
    const wholeInactive = rule_undef(PARTS.WHOLE, VARIANT.INACTIVE);
    const topNeutral = rule_undef(PARTS.TOP, VARIANT.NEUTRAL);
    const mainNeutral = rule_undef(PARTS.MAIN, VARIANT.NEUTRAL);
    expect(wholeNeutral).toBe(`${prule[PARTS.WHOLE]}`);
    expect(wholeActive).toBe(`${prule[PARTS.WHOLE]}`);
    expect(wholeInactive).toBe(`${prule[PARTS.WHOLE]}`);
    expect(topNeutral).toBe(`${prule[PARTS.TOP]}`);
    expect(mainNeutral).toBeUndefined();
  });
  test("rules_str", () => {
    const wholeNeutral = rules_str(PARTS.WHOLE, VARIANT.NEUTRAL);
    const wholeActive = rules_str(PARTS.WHOLE, VARIANT.ACTIVE);
    const wholeInactive = rules_str(PARTS.WHOLE, VARIANT.INACTIVE);
    const topNeutral = rules_str(PARTS.TOP, VARIANT.NEUTRAL);
    const mainNeutral = rules_str(PARTS.MAIN, VARIANT.NEUTRAL);
    expect(wholeNeutral).toBe(`${sstr} ${PARTS.WHOLE} ${VARIANT.NEUTRAL}`);
    expect(wholeActive).toBe(`${sstr} ${PARTS.WHOLE} ${VARIANT.ACTIVE}`);
    expect(wholeInactive).toBe(`${sstr} ${PARTS.WHOLE} ${VARIANT.INACTIVE}`);
    expect(topNeutral).toBe(`${sstr} ${PARTS.TOP} ${VARIANT.NEUTRAL}`);
    expect(mainNeutral).toBe(`${sstr} ${PARTS.MAIN} ${VARIANT.NEUTRAL}`);
  });
  test("rules_rule", () => {
    const wholeNeutral = rules_rule(PARTS.WHOLE, VARIANT.NEUTRAL);
    const wholeActive = rules_rule(PARTS.WHOLE, VARIANT.ACTIVE);
    const wholeInactive = rules_rule(PARTS.WHOLE, VARIANT.INACTIVE);
    const topNeutral = rules_rule(PARTS.TOP, VARIANT.NEUTRAL);
    const mainNeutral = rules_rule(PARTS.MAIN, VARIANT.NEUTRAL);
    expect(wholeNeutral).toBe(`${srule[PARTS.WHOLE]}`);
    expect(wholeActive).toBe(`${srule[PARTS.WHOLE]}`);
    expect(wholeInactive).toBe(`${srule[PARTS.WHOLE]}`);
    expect(topNeutral).toBeUndefined();
    expect(mainNeutral).toBe(`${srule[PARTS.MAIN]}`);
  });
  test("rules_rules", () => {
    const wholeNeutral = rules_rules(PARTS.WHOLE, VARIANT.NEUTRAL);
    const wholeActive = rules_rules(PARTS.WHOLE, VARIANT.ACTIVE);
    const wholeInactive = rules_rules(PARTS.WHOLE, VARIANT.INACTIVE);
    const topNeutral = rules_rules(PARTS.TOP, VARIANT.NEUTRAL);
    const mainNeutral = rules_rules(PARTS.MAIN, VARIANT.NEUTRAL);
    expect(wholeNeutral).toBe(`${srules[PARTS.WHOLE][BASE]}`);
    expect(wholeActive).toEqual([srules[PARTS.WHOLE][BASE], srules[PARTS.WHOLE][VARIANT.ACTIVE]]);
    expect(wholeInactive).toBe(`${srules[PARTS.WHOLE][BASE]}`);
    expect(topNeutral).toBeUndefined();
    expect(mainNeutral).toBe(`${srules[PARTS.MAIN][BASE]}`);
  });
  test("rules_blank", () => {
    const wholeNeutral = rules_blank(PARTS.WHOLE, VARIANT.NEUTRAL);
    const wholeActive = rules_blank(PARTS.WHOLE, VARIANT.ACTIVE);
    const wholeInactive = rules_blank(PARTS.WHOLE, VARIANT.INACTIVE);
    const topNeutral = rules_blank(PARTS.TOP, VARIANT.NEUTRAL);
    const mainNeutral = rules_blank(PARTS.MAIN, VARIANT.NEUTRAL);
    expect(wholeNeutral).toEqual([prules[PARTS.WHOLE][BASE], prules[PARTS.WHOLE][VARIANT.NEUTRAL]]);
    expect(wholeActive).toEqual([prules[PARTS.WHOLE][BASE], prules[PARTS.WHOLE][VARIANT.NEUTRAL]]);
    expect(wholeInactive).toEqual([prules[PARTS.WHOLE][BASE], prules[PARTS.WHOLE][VARIANT.NEUTRAL]]);
    expect(topNeutral).toBe(`${prules[PARTS.TOP][VARIANT.NEUTRAL]}`);
    expect(mainNeutral).toBeUndefined();
  });
  test("rules_empty", () => {
    const wholeNeutral = rules_empty(PARTS.WHOLE, VARIANT.NEUTRAL);
    const wholeActive = rules_empty(PARTS.WHOLE, VARIANT.ACTIVE);
    const wholeInactive = rules_empty(PARTS.WHOLE, VARIANT.INACTIVE);
    const topNeutral = rules_empty(PARTS.TOP, VARIANT.NEUTRAL);
    const mainNeutral = rules_empty(PARTS.MAIN, VARIANT.NEUTRAL);
    expect(wholeNeutral).toEqual([prules[PARTS.WHOLE][BASE], prules[PARTS.WHOLE][VARIANT.NEUTRAL]]);
    expect(wholeActive).toEqual([prules[PARTS.WHOLE][BASE], prules[PARTS.WHOLE][VARIANT.NEUTRAL]]);
    expect(wholeInactive).toEqual([prules[PARTS.WHOLE][BASE], prules[PARTS.WHOLE][VARIANT.NEUTRAL]]);
    expect(topNeutral).toBe(`${prules[PARTS.TOP][VARIANT.NEUTRAL]}`);
    expect(mainNeutral).toBeUndefined();
  });
  test("rules_undef", () => {
    const wholeNeutral = rules_undef(PARTS.WHOLE, VARIANT.NEUTRAL);
    const wholeActive = rules_undef(PARTS.WHOLE, VARIANT.ACTIVE);
    const wholeInactive = rules_undef(PARTS.WHOLE, VARIANT.INACTIVE);
    const topNeutral = rules_undef(PARTS.TOP, VARIANT.NEUTRAL);
    const mainNeutral = rules_undef(PARTS.MAIN, VARIANT.NEUTRAL);
    expect(wholeNeutral).toEqual([prules[PARTS.WHOLE][BASE], prules[PARTS.WHOLE][VARIANT.NEUTRAL]]);
    expect(wholeActive).toEqual([prules[PARTS.WHOLE][BASE], prules[PARTS.WHOLE][VARIANT.NEUTRAL]]);
    expect(wholeInactive).toEqual([prules[PARTS.WHOLE][BASE], prules[PARTS.WHOLE][VARIANT.NEUTRAL]]);
    expect(topNeutral).toBe(`${prules[PARTS.TOP][VARIANT.NEUTRAL]}`);
    expect(mainNeutral).toBeUndefined();
  });
  test("blank_str", () => {
    const wholeNeutral = blank_str(PARTS.WHOLE, VARIANT.NEUTRAL);
    const wholeActive = blank_str(PARTS.WHOLE, VARIANT.ACTIVE);
    const wholeInactive = blank_str(PARTS.WHOLE, VARIANT.INACTIVE);
    const topNeutral = blank_str(PARTS.TOP, VARIANT.NEUTRAL);
    const mainNeutral = blank_str(PARTS.MAIN, VARIANT.NEUTRAL);
    expect(wholeNeutral).toBe(`${sstr} ${PARTS.WHOLE} ${VARIANT.NEUTRAL}`);
    expect(wholeActive).toBe(`${sstr} ${PARTS.WHOLE} ${VARIANT.ACTIVE}`);
    expect(wholeInactive).toBe(`${sstr} ${PARTS.WHOLE} ${VARIANT.INACTIVE}`);
    expect(topNeutral).toBe(`${sstr} ${PARTS.TOP} ${VARIANT.NEUTRAL}`);
    expect(mainNeutral).toBe(`${sstr} ${PARTS.MAIN} ${VARIANT.NEUTRAL}`);
  });
  test("blank_rule", () => {
    const wholeNeutral = blank_rule(PARTS.WHOLE, VARIANT.NEUTRAL);
    const wholeActive = blank_rule(PARTS.WHOLE, VARIANT.ACTIVE);
    const wholeInactive = blank_rule(PARTS.WHOLE, VARIANT.INACTIVE);
    const topNeutral = blank_rule(PARTS.TOP, VARIANT.NEUTRAL);
    const mainNeutral = blank_rule(PARTS.MAIN, VARIANT.NEUTRAL);
    expect(wholeNeutral).toBe(`${srule[PARTS.WHOLE]}`);
    expect(wholeActive).toBe(`${srule[PARTS.WHOLE]}`);
    expect(wholeInactive).toBe(`${srule[PARTS.WHOLE]}`);
    expect(topNeutral).toBeUndefined();
    expect(mainNeutral).toBe(`${srule[PARTS.MAIN]}`);
  });
  test("blank_rules", () => {
    const wholeNeutral = blank_rules(PARTS.WHOLE, VARIANT.NEUTRAL);
    const wholeActive = blank_rules(PARTS.WHOLE, VARIANT.ACTIVE);
    const wholeInactive = blank_rules(PARTS.WHOLE, VARIANT.INACTIVE);
    const topNeutral = blank_rules(PARTS.TOP, VARIANT.NEUTRAL);
    const mainNeutral = blank_rules(PARTS.MAIN, VARIANT.NEUTRAL);
    expect(wholeNeutral).toBe(`${srules[PARTS.WHOLE][BASE]}`);
    expect(wholeActive).toEqual([srules[PARTS.WHOLE][BASE], srules[PARTS.WHOLE][VARIANT.ACTIVE]]);
    expect(wholeInactive).toBe(`${srules[PARTS.WHOLE][BASE]}`);
    expect(topNeutral).toBeUndefined();
    expect(mainNeutral).toBe(`${srules[PARTS.MAIN][BASE]}`);
  });
  test("blank_blank", () => {
    const wholeNeutral = blank_blank(PARTS.WHOLE, VARIANT.NEUTRAL);
    const wholeActive = blank_blank(PARTS.WHOLE, VARIANT.ACTIVE);
    const wholeInactive = blank_blank(PARTS.WHOLE, VARIANT.INACTIVE);
    const topNeutral = blank_blank(PARTS.TOP, VARIANT.NEUTRAL);
    const mainNeutral = blank_blank(PARTS.MAIN, VARIANT.NEUTRAL);
    expect(wholeNeutral).toBeUndefined();
    expect(wholeActive).toBeUndefined();
    expect(wholeInactive).toBeUndefined();
    expect(topNeutral).toBeUndefined();
    expect(mainNeutral).toBeUndefined();
  });
  test("blank_empty", () => {
    const wholeNeutral = blank_empty(PARTS.WHOLE, VARIANT.NEUTRAL);
    const wholeActive = blank_empty(PARTS.WHOLE, VARIANT.ACTIVE);
    const wholeInactive = blank_empty(PARTS.WHOLE, VARIANT.INACTIVE);
    const topNeutral = blank_empty(PARTS.TOP, VARIANT.NEUTRAL);
    const mainNeutral = blank_empty(PARTS.MAIN, VARIANT.NEUTRAL);
    expect(wholeNeutral).toBeUndefined();
    expect(wholeActive).toBeUndefined();
    expect(wholeInactive).toBeUndefined();
    expect(topNeutral).toBeUndefined();
    expect(mainNeutral).toBeUndefined();
  });
  test("blank_undef", () => {
    const wholeNeutral = blank_undef(PARTS.WHOLE, VARIANT.NEUTRAL);
    const wholeActive = blank_undef(PARTS.WHOLE, VARIANT.ACTIVE);
    const wholeInactive = blank_undef(PARTS.WHOLE, VARIANT.INACTIVE);
    const topNeutral = blank_undef(PARTS.TOP, VARIANT.NEUTRAL);
    const mainNeutral = blank_undef(PARTS.MAIN, VARIANT.NEUTRAL);
    expect(wholeNeutral).toBeUndefined();
    expect(wholeActive).toBeUndefined();
    expect(wholeInactive).toBeUndefined();
    expect(topNeutral).toBeUndefined();
    expect(mainNeutral).toBeUndefined();
  });
  test("empty_str", () => {
    const wholeNeutral = empty_str(PARTS.WHOLE, VARIANT.NEUTRAL);
    const wholeActive = empty_str(PARTS.WHOLE, VARIANT.ACTIVE);
    const wholeInactive = empty_str(PARTS.WHOLE, VARIANT.INACTIVE);
    const topNeutral = empty_str(PARTS.TOP, VARIANT.NEUTRAL);
    const mainNeutral = empty_str(PARTS.MAIN, VARIANT.NEUTRAL);
    expect(wholeNeutral).toBe(`${sstr} ${PARTS.WHOLE} ${VARIANT.NEUTRAL}`);
    expect(wholeActive).toBe(`${sstr} ${PARTS.WHOLE} ${VARIANT.ACTIVE}`);
    expect(wholeInactive).toBe(`${sstr} ${PARTS.WHOLE} ${VARIANT.INACTIVE}`);
    expect(topNeutral).toBe(`${sstr} ${PARTS.TOP} ${VARIANT.NEUTRAL}`);
    expect(mainNeutral).toBe(`${sstr} ${PARTS.MAIN} ${VARIANT.NEUTRAL}`);
  });
  test("empty_rule", () => {
    const wholeNeutral = empty_rule(PARTS.WHOLE, VARIANT.NEUTRAL);
    const wholeActive = empty_rule(PARTS.WHOLE, VARIANT.ACTIVE);
    const wholeInactive = empty_rule(PARTS.WHOLE, VARIANT.INACTIVE);
    const topNeutral = empty_rule(PARTS.TOP, VARIANT.NEUTRAL);
    const mainNeutral = empty_rule(PARTS.MAIN, VARIANT.NEUTRAL);
    expect(wholeNeutral).toBe(`${srule[PARTS.WHOLE]}`);
    expect(wholeActive).toBe(`${srule[PARTS.WHOLE]}`);
    expect(wholeInactive).toBe(`${srule[PARTS.WHOLE]}`);
    expect(topNeutral).toBeUndefined();
    expect(mainNeutral).toBe(`${srule[PARTS.MAIN]}`);
  });
  test("empty_rules", () => {
    const wholeNeutral = empty_rules(PARTS.WHOLE, VARIANT.NEUTRAL);
    const wholeActive = empty_rules(PARTS.WHOLE, VARIANT.ACTIVE);
    const wholeInactive = empty_rules(PARTS.WHOLE, VARIANT.INACTIVE);
    const topNeutral = empty_rules(PARTS.TOP, VARIANT.NEUTRAL);
    const mainNeutral = empty_rules(PARTS.MAIN, VARIANT.NEUTRAL);
    expect(wholeNeutral).toBe(`${srules[PARTS.WHOLE][BASE]}`);
    expect(wholeActive).toEqual([srules[PARTS.WHOLE][BASE], srules[PARTS.WHOLE][VARIANT.ACTIVE]]);
    expect(wholeInactive).toBe(`${srules[PARTS.WHOLE][BASE]}`);
    expect(topNeutral).toBeUndefined();
    expect(mainNeutral).toBe(`${srules[PARTS.MAIN][BASE]}`);
  });
  test("empty_blank", () => {
    const wholeNeutral = empty_blank(PARTS.WHOLE, VARIANT.NEUTRAL);
    const wholeActive = empty_blank(PARTS.WHOLE, VARIANT.ACTIVE);
    const wholeInactive = empty_blank(PARTS.WHOLE, VARIANT.INACTIVE);
    const topNeutral = empty_blank(PARTS.TOP, VARIANT.NEUTRAL);
    const mainNeutral = empty_blank(PARTS.MAIN, VARIANT.NEUTRAL);
    expect(wholeNeutral).toBeUndefined();
    expect(wholeActive).toBeUndefined();
    expect(wholeInactive).toBeUndefined();
    expect(topNeutral).toBeUndefined();
    expect(mainNeutral).toBeUndefined();
  });
  test("empty_empty", () => {
    const wholeNeutral = empty_empty(PARTS.WHOLE, VARIANT.NEUTRAL);
    const wholeActive = empty_empty(PARTS.WHOLE, VARIANT.ACTIVE);
    const wholeInactive = empty_empty(PARTS.WHOLE, VARIANT.INACTIVE);
    const topNeutral = empty_empty(PARTS.TOP, VARIANT.NEUTRAL);
    const mainNeutral = empty_empty(PARTS.MAIN, VARIANT.NEUTRAL);
    expect(wholeNeutral).toBeUndefined();
    expect(wholeActive).toBeUndefined();
    expect(wholeInactive).toBeUndefined();
    expect(topNeutral).toBeUndefined();
    expect(mainNeutral).toBeUndefined();
  });
  test("empty_undef", () => {
    const wholeNeutral = empty_undef(PARTS.WHOLE, VARIANT.NEUTRAL);
    const wholeActive = empty_undef(PARTS.WHOLE, VARIANT.ACTIVE);
    const wholeInactive = empty_undef(PARTS.WHOLE, VARIANT.INACTIVE);
    const topNeutral = empty_undef(PARTS.TOP, VARIANT.NEUTRAL);
    const mainNeutral = empty_undef(PARTS.MAIN, VARIANT.NEUTRAL);
    expect(wholeNeutral).toBeUndefined();
    expect(wholeActive).toBeUndefined();
    expect(wholeInactive).toBeUndefined();
    expect(topNeutral).toBeUndefined();
    expect(mainNeutral).toBeUndefined();
  });

  // test("noPresetWithStyle", () => {
  //   const wholeNeutral = noPresetWithStyle(PARTS.WHOLE, VARIANT.NEUTRAL);
  //   const wholeActive = noPresetWithStyle(PARTS.WHOLE, VARIANT.ACTIVE);
  //   const wholeInactive = noPresetWithStyle(PARTS.WHOLE, VARIANT.INACTIVE);
  //   const topNeutral = noPresetWithStyle(PARTS.TOP, VARIANT.NEUTRAL);
  //   const mainNeutral = noPresetWithStyle(PARTS.MAIN, VARIANT.NEUTRAL);
  //   expect(wholeNeutral).toBe(`${style.whole?.const}`);
  //   expect(wholeActive).toBe(`${style.whole?.const} ${style.whole?.active}`);
  //   expect(wholeInactive).toBe(`${style.whole?.const}`);
  //   expect(topNeutral).toBeUndefined();
  //   expect(mainNeutral).toBe(`${style.main?.const}`);
  // });
  // test("noPresetEmptyStyle", () => {
  //   const wholeNeutral = noPresetEmptyStyle(PARTS.WHOLE, VARIANT.NEUTRAL);
  //   const wholeActive = noPresetEmptyStyle(PARTS.WHOLE, VARIANT.ACTIVE);
  //   const wholeInactive = noPresetEmptyStyle(PARTS.WHOLE, VARIANT.INACTIVE);
  //   const topNeutral = noPresetEmptyStyle(PARTS.TOP, VARIANT.NEUTRAL);
  //   const mainNeutral = noPresetEmptyStyle(PARTS.MAIN, VARIANT.NEUTRAL);
  //   expect(wholeNeutral).toBe(`${name} ${PARTS.WHOLE}`);
  //   expect(wholeActive).toBe(`${name} ${PARTS.WHOLE} ${VARIANT.ACTIVE}`);
  //   expect(wholeInactive).toBe(`${name} ${PARTS.WHOLE} ${VARIANT.INACTIVE}`);
  //   expect(topNeutral).toBe(`${name} ${PARTS.TOP}`);
  //   expect(mainNeutral).toBe(`${name} ${PARTS.MAIN}`);
  // });
  // test("noPresetStrStyle", () => {
  //   const wholeNeutral = noPresetStrStyle(PARTS.WHOLE, VARIANT.NEUTRAL);
  //   const wholeActive = noPresetStrStyle(PARTS.WHOLE, VARIANT.ACTIVE);
  //   const wholeInactive = noPresetStrStyle(PARTS.WHOLE, VARIANT.INACTIVE);
  //   const topNeutral = noPresetStrStyle(PARTS.TOP, VARIANT.NEUTRAL);
  //   const mainNeutral = noPresetStrStyle(PARTS.MAIN, VARIANT.NEUTRAL);
  //   expect(wholeNeutral).toBe(`${strStyle} ${PARTS.WHOLE}`);
  //   expect(wholeActive).toBe(`${strStyle} ${PARTS.WHOLE} ${VARIANT.ACTIVE}`);
  //   expect(wholeInactive).toBe(`${strStyle} ${PARTS.WHOLE} ${VARIANT.INACTIVE}`);
  //   expect(topNeutral).toBe(`${strStyle} ${PARTS.TOP}`);
  //   expect(mainNeutral).toBe(`${strStyle} ${PARTS.MAIN}`);
  // });
  // test("withPresetNoStyle", () => {
  //   const wholeNeutral = withPresetNoStyle(PARTS.WHOLE, VARIANT.NEUTRAL);
  //   const wholeActive = withPresetNoStyle(PARTS.WHOLE, VARIANT.ACTIVE);
  //   const wholeInactive = withPresetNoStyle(PARTS.WHOLE, VARIANT.INACTIVE);
  //   const topNeutral = withPresetNoStyle(PARTS.TOP, VARIANT.NEUTRAL);
  //   const mainNeutral = withPresetNoStyle(PARTS.MAIN, VARIANT.NEUTRAL);
  //   expect(wholeNeutral).toBe(`${preset.whole?.const} ${preset.whole?.default}`);
  //   expect(wholeActive).toBe(`${preset.whole?.const} ${preset.whole?.default}`);
  //   expect(wholeInactive).toBe(`${preset.whole?.const} ${preset.whole?.default}`);
  //   expect(topNeutral).toBe(`${preset.top?.default}`);
  //   expect(mainNeutral).toBeUndefined();
  // });
  // test("withPresetWithStyle", () => {
  //   const wholeNeutral = withPresetWithStyle(PARTS.WHOLE, VARIANT.NEUTRAL);
  //   const wholeActive = withPresetWithStyle(PARTS.WHOLE, VARIANT.ACTIVE);
  //   const wholeInactive = withPresetWithStyle(PARTS.WHOLE, VARIANT.INACTIVE);
  //   const topNeutral = withPresetWithStyle(PARTS.TOP, VARIANT.NEUTRAL);
  //   const mainNeutral = withPresetWithStyle(PARTS.MAIN, VARIANT.NEUTRAL);
  //   expect(wholeNeutral).toBe(`${style.whole?.const} ${preset.whole?.default}`);
  //   expect(wholeActive).toBe(`${style.whole?.const} ${style.whole?.active}`);
  //   expect(wholeInactive).toBe(`${style.whole?.const} ${preset.whole?.default}`);
  //   expect(topNeutral).toBe(`${preset.top?.default}`);
  //   expect(mainNeutral).toBe(`${style.main?.const}`);
  // });
  // test("withPresetEmptyStyle", () => {
  //   const wholeNeutral = withPresetEmptyStyle(PARTS.WHOLE, VARIANT.NEUTRAL);
  //   const wholeActive = withPresetEmptyStyle(PARTS.WHOLE, VARIANT.ACTIVE);
  //   const wholeInactive = withPresetEmptyStyle(PARTS.WHOLE, VARIANT.INACTIVE);
  //   const topNeutral = withPresetEmptyStyle(PARTS.TOP, VARIANT.NEUTRAL);
  //   const mainNeutral = withPresetEmptyStyle(PARTS.MAIN, VARIANT.NEUTRAL);
  //   expect(wholeNeutral).toBe(`${name} ${PARTS.WHOLE}`);
  //   expect(wholeActive).toBe(`${name} ${PARTS.WHOLE} ${VARIANT.ACTIVE}`);
  //   expect(wholeInactive).toBe(`${name} ${PARTS.WHOLE} ${VARIANT.INACTIVE}`);
  //   expect(topNeutral).toBe(`${name} ${PARTS.TOP}`);
  //   expect(mainNeutral).toBe(`${name} ${PARTS.MAIN}`);
  // });
  // test("withPresetStrStyle", () => {
  //   const wholeNeutral = withPresetStrStyle(PARTS.WHOLE, VARIANT.NEUTRAL);
  //   const wholeActive = withPresetStrStyle(PARTS.WHOLE, VARIANT.ACTIVE);
  //   const wholeInactive = withPresetStrStyle(PARTS.WHOLE, VARIANT.INACTIVE);
  //   const topNeutral = withPresetStrStyle(PARTS.TOP, VARIANT.NEUTRAL);
  //   const mainNeutral = withPresetStrStyle(PARTS.MAIN, VARIANT.NEUTRAL);
  //   expect(wholeNeutral).toBe(`${strStyle} ${PARTS.WHOLE}`);
  //   expect(wholeActive).toBe(`${strStyle} ${PARTS.WHOLE} ${VARIANT.ACTIVE}`);
  //   expect(wholeInactive).toBe(`${strStyle} ${PARTS.WHOLE} ${VARIANT.INACTIVE}`);
  //   expect(topNeutral).toBe(`${strStyle} ${PARTS.TOP}`);
  //   expect(mainNeutral).toBe(`${strStyle} ${PARTS.MAIN}`);
  // });
});

describe("_omit", () => {
  test("return empty object", () => {
    const result = _omit(undefined);
    expect(result).toStrictEqual({});
  });
  test("return empty object for null at runtime", () => {
    const result = _omit(null as never);
    expect(result).toStrictEqual({});
  });
  test("return shallow copied object", () => {
    const obj = { a: 1, b: 2, c: 3 };
    const result = _omit(obj, "a", "c");
    expect(result).toStrictEqual({ b: 2 });
    expect(obj).toStrictEqual({ a: 1, b: 2, c: 3 });
  });
  test("return a new shallow copy when no keys are omitted", () => {
    const obj = { a: 1 };
    const result = _omit(obj);
    expect(result).toStrictEqual(obj);
    expect(result).not.toBe(obj);
  });
});

describe("_debounce", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  test("call once", () => {
    const mockFn = vi.fn();
    const debouncedFn = _debounce(100, mockFn);

    debouncedFn();
    expect(mockFn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(50);
    expect(mockFn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(50);
    expect(mockFn).toHaveBeenCalledTimes(1);
  });
  test("call several times", () => {
    const mockFn = vi.fn();
    const debouncedFn = _debounce(100, mockFn);

    debouncedFn();
    vi.advanceTimersByTime(50);
    debouncedFn();
    vi.advanceTimersByTime(50);
    expect(mockFn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(50);
    expect(mockFn).toHaveBeenCalledTimes(1);
  });
  test("pass thru args", () => {
    const mockFn = vi.fn();
    const debouncedFn = _debounce(100, mockFn);

    debouncedFn("test", 123);
    vi.advanceTimersByTime(100);
    expect(mockFn).toHaveBeenCalledWith("test", 123);
  });
  test("uses the latest args after repeated calls", () => {
    const mockFn = vi.fn();
    const debouncedFn = _debounce(100, mockFn);

    debouncedFn("first");
    vi.advanceTimersByTime(50);
    debouncedFn("second");
    vi.advanceTimersByTime(100);

    expect(mockFn).toHaveBeenCalledTimes(1);
    expect(mockFn).toHaveBeenCalledWith("second");
  });
  test("cancel prevents a pending call and remains reusable", () => {
    const mockFn = vi.fn();
    const debouncedFn = _debounce(100, mockFn);

    // WP-CORE
    debouncedFn();
    vi.advanceTimersByTime(50);
    debouncedFn.cancel();
    vi.advanceTimersByTime(100);
    expect(mockFn).not.toHaveBeenCalled();

    debouncedFn();
    vi.advanceTimersByTime(100);
    expect(mockFn).toHaveBeenCalledTimes(1);
  });
});

describe("_throttle", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  test("immediately run by first time call", () => {
    const mockFn = vi.fn();
    const throttledFn = _throttle(100, mockFn);

    throttledFn("test");
    expect(mockFn).toHaveBeenCalledTimes(1);
    expect(mockFn).toHaveBeenCalledWith("test");
  });
  test("prevent run within interval", () => {
    const mockFn = vi.fn();
    const throttledFn = _throttle(100, mockFn);

    throttledFn();
    mockFn.mockClear(); // reset first call

    throttledFn();
    vi.advanceTimersByTime(50);
    expect(mockFn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(50);
    expect(mockFn).toHaveBeenCalledTimes(1);
  });
  test("used latest args after interval", () => {
    const mockFn = vi.fn();
    const throttledFn = _throttle(100, mockFn);

    throttledFn("first");
    mockFn.mockClear(); // reset first call

    throttledFn("second");
    vi.advanceTimersByTime(50);
    throttledFn("third");
    vi.advanceTimersByTime(50);

    expect(mockFn).toHaveBeenCalledTimes(1);
    expect(mockFn).toHaveBeenCalledWith("third");
  });
  test("runs queued calls when the interval has elapsed", () => {
    const mockFn = vi.fn();
    const throttledFn = _throttle(100, mockFn);

    throttledFn("first");
    vi.advanceTimersByTime(100);
    throttledFn("second");
    vi.advanceTimersByTime(0);

    expect(mockFn).toHaveBeenCalledTimes(2);
    expect(mockFn).toHaveBeenLastCalledWith("second");
  });
});

describe("_fnClass styling object heuristic", () => {
  test("clsx condition object (boolean values) is treated as a class value, not a variant map", () => {
    const cls = _fnClass("preset", { [PARTS.WHOLE]: { foo: true, bar: false } });
    // detected as clsx dict -> wrapped as { base: {...} }, so same value for any variant
    expect(cls(PARTS.WHOLE, VARIANT.NEUTRAL)).toEqual({ foo: true, bar: false });
    expect(cls(PARTS.WHOLE, VARIANT.ACTIVE)).toEqual({ foo: true, bar: false });
  });
  test("plain object with class values is treated as a variant map", () => {
    const cls = _fnClass("preset", { [PARTS.WHOLE]: { [BASE]: "b", [VARIANT.ACTIVE]: "a" } });
    expect(cls(PARTS.WHOLE, VARIANT.NEUTRAL)).toBe("b");
    expect(cls(PARTS.WHOLE, VARIANT.ACTIVE)).toEqual(["b", "a"]);
  });
  test("array-wrapped clsx object still works (backward compatible)", () => {
    const cls = _fnClass("preset", { [PARTS.WHOLE]: [{ foo: true, bar: false }] });
    expect(cls(PARTS.WHOLE, VARIANT.NEUTRAL)).toEqual([{ foo: true, bar: false }]);
    expect(cls(PARTS.WHOLE, VARIANT.ACTIVE)).toEqual([{ foo: true, bar: false }]);
  });
});

describe("shouldReduceMotion", () => {
  const original = window.matchMedia;
  afterEach(() => {
    if (typeof window !== "undefined") window.matchMedia = original;
    vi.unstubAllGlobals();
  });

  test("returns true when prefers-reduced-motion is reduce", () => {
    window.matchMedia = vi.fn().mockReturnValue({ matches: true }) as unknown as typeof window.matchMedia;
    expect(shouldReduceMotion()).toBe(true);
  });

  test("returns false when reduced motion is not preferred", () => {
    window.matchMedia = vi.fn().mockReturnValue({ matches: false }) as unknown as typeof window.matchMedia;
    expect(shouldReduceMotion()).toBe(false);
  });

  test("queries the prefers-reduced-motion media feature", () => {
    const mock = vi.fn().mockReturnValue({ matches: false });
    window.matchMedia = mock as unknown as typeof window.matchMedia;
    shouldReduceMotion();
    expect(mock).toHaveBeenCalledWith("(prefers-reduced-motion: reduce)");
  });

  test("returns false when window is unavailable", () => {
    vi.stubGlobal("window", undefined);
    expect(shouldReduceMotion()).toBe(false);
  });
});

describe("canHover", () => {
  const original = window.matchMedia;
  afterEach(() => {
    if (typeof window !== "undefined") window.matchMedia = original;
    vi.unstubAllGlobals();
  });

  test("returns true when the primary pointer can hover", () => {
    window.matchMedia = vi.fn().mockReturnValue({ matches: true }) as unknown as typeof window.matchMedia;
    expect(canHover()).toBe(true);
  });

  test("returns false when the primary pointer cannot hover", () => {
    window.matchMedia = vi.fn().mockReturnValue({ matches: false }) as unknown as typeof window.matchMedia;
    expect(canHover()).toBe(false);
  });

  test("queries the hover media feature", () => {
    const mock = vi.fn().mockReturnValue({ matches: false });
    window.matchMedia = mock as unknown as typeof window.matchMedia;
    canHover();
    expect(mock).toHaveBeenCalledWith("(hover: hover)");
  });

  test("returns true when window is unavailable", () => {
    vi.stubGlobal("window", undefined);
    expect(canHover()).toBe(true);
  });
});

describe("motion helpers", () => {
  const original = window.matchMedia;
  afterEach(() => {
    if (typeof window !== "undefined") window.matchMedia = original;
    vi.unstubAllGlobals();
  });
  const stubMotion = (matches: boolean) => {
    window.matchMedia = vi.fn().mockReturnValue({ matches }) as unknown as typeof window.matchMedia;
  };

  test("_resolveDuration preserves valid durations and falls back otherwise", () => {
    stubMotion(false);
    expect(_resolveDuration(-1)).toBe(_DEFAULT_DURATION);
    expect(_resolveDuration(0)).toBe(0);
    expect(_resolveDuration(350)).toBe(350);
    expect(_resolveDuration(undefined)).toBe(_DEFAULT_DURATION);
    expect(_resolveDuration(3.5)).toBe(_DEFAULT_DURATION);
    expect(_resolveDuration(-1, 300)).toBe(300);
  });

  test("_resolveDuration returns 0 under reduced motion", () => {
    stubMotion(true);
    expect(_resolveDuration(350)).toBe(0);
    expect(_resolveDuration(0)).toBe(0);
    expect(_resolveDuration(-1)).toBe(0);
  });

  test("_cssVar resolves mapped custom-property names", () => {
    expect(_cssVar({ active: "--x" }, "active", "--y")).toBe("--x");
    expect(_cssVar(undefined, "active", "--y")).toBe("--y");
    expect(_cssVar({ inactive: "--z" }, "active", "--y")).toBe("--y");
  });

  test("_cssVarStyle joins defined entries in order", () => {
    expect(
      _cssVarStyle([
        { name: "--a", value: "1px" },
        { name: undefined, value: "2px" },
        { name: "--b", value: undefined },
        { name: "--c", value: null as any },
        { name: "", value: "3px" },
        { name: "--zero", value: 0 as any },
        { name: "--d", value: "0ms" },
      ]),
    ).toBe("--a: 1px; --zero: 0; --d: 0ms");
    expect(
      _cssVarStyle([
        { name: undefined, value: "1px" },
        { name: "--x", value: undefined },
      ]),
    ).toBeUndefined();
  });
});
