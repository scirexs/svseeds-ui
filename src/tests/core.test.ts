import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { BASE, debounce, elemId, fnClass, omit, PARTS, STATE, type SVSStyle, throttle, UniqueId } from "../lib/_svseeds/core.ts";

describe("const vars", () => {
  test("STATE", () => {
    expect(STATE).toEqual({
      NEUTRAL: "neutral",
      ACTIVE: "active",
      INACTIVE: "inactive",
    });
    expect(Object.isFrozen(STATE)).toBe(true);
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
});

describe("elemId (UniqueId class)", () => {
  test("id", () => {
    expect(typeof elemId.id).toBe("string");
  });
  test("get w/ undefined", () => {
    expect(elemId.get(undefined)).toBeUndefined();
  });
  test("get w/ null", () => {
    expect(elemId.get(null)).toBeUndefined();
  });
  test("get w/ truthly value", () => {
    expect(typeof elemId.get("test")).toBe("string");
    expect(typeof elemId.get(1)).toBe("string");
    expect(typeof elemId.get(true)).toBe("string");
  });
  test("id is fixed format", () => {
    const id = elemId.id;
    expect(id).toMatch(/^[a-yA-Y]{3}$/);
  });
});

describe("fnClass", () => {
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
      [STATE.ACTIVE]: { stylerulewa: "style-rule-wa" },
    },
    [PARTS.MAIN]: [{ stylerulem: "style-rule-m" }],
  };
  const prules = {
    [PARTS.WHOLE]: {
      [BASE]: "preset-rules-wc",
      [STATE.NEUTRAL]: "preset-rules-wd",
    },
    [PARTS.TOP]: {
      [STATE.NEUTRAL]: "preset-rules-tc",
      [STATE.INACTIVE]: "preset-rules-ti",
    },
  };
  const srules = {
    [PARTS.WHOLE]: {
      [BASE]: "style-rules-wc",
      [STATE.ACTIVE]: "style-rules-wa",
    },
    [PARTS.MAIN]: {
      [BASE]: "style-rules-mc",
      [STATE.INACTIVE]: "style-rules-mi",
    },
  };

  // preset_style
  const str_str = fnClass(pstr, sstr);
  const str_rule = fnClass(pstr, srule);
  const str_rulex = fnClass(pstr, srulex);
  const str_rules = fnClass(pstr, srules);
  const str_blank = fnClass(pstr, "");
  const str_empty = fnClass(pstr, {});
  const str_undef = fnClass(pstr, undefined);
  const rule_str = fnClass(prule, sstr);
  const rule_rule = fnClass(prule, srule);
  const rule_rules = fnClass(prule, srules);
  const rule_blank = fnClass(prule, "");
  const rule_empty = fnClass(prule, {});
  const rule_undef = fnClass(prule, undefined);
  const rules_str = fnClass(prules, sstr);
  const rules_rule = fnClass(prules, srule);
  const rules_rules = fnClass(prules, srules);
  const rules_blank = fnClass(prules, "");
  const rules_empty = fnClass(prules, {});
  const rules_undef = fnClass(prules, undefined);
  const blank_str = fnClass("", sstr);
  const blank_rule = fnClass("", srule);
  const blank_rules = fnClass("", srules);
  const blank_blank = fnClass("", "");
  const blank_empty = fnClass("", {});
  const blank_undef = fnClass("", undefined);
  const empty_str = fnClass({}, sstr);
  const empty_rule = fnClass({}, srule);
  const empty_rules = fnClass({}, srules);
  const empty_blank = fnClass({}, "");
  const empty_empty = fnClass({}, {});
  const empty_undef = fnClass({}, undefined);

  test("str_str", () => {
    const wholeNeutral = str_str(PARTS.WHOLE, STATE.NEUTRAL);
    const wholeActive = str_str(PARTS.WHOLE, STATE.ACTIVE);
    const wholeInactive = str_str(PARTS.WHOLE, STATE.INACTIVE);
    const topNeutral = str_str(PARTS.TOP, STATE.NEUTRAL);
    const mainNeutral = str_str(PARTS.MAIN, STATE.NEUTRAL);
    expect(wholeNeutral).toBe(`${sstr} ${PARTS.WHOLE} ${STATE.NEUTRAL}`);
    expect(wholeActive).toBe(`${sstr} ${PARTS.WHOLE} ${STATE.ACTIVE}`);
    expect(wholeInactive).toBe(`${sstr} ${PARTS.WHOLE} ${STATE.INACTIVE}`);
    expect(topNeutral).toBe(`${sstr} ${PARTS.TOP} ${STATE.NEUTRAL}`);
    expect(mainNeutral).toBe(`${sstr} ${PARTS.MAIN} ${STATE.NEUTRAL}`);
  });
  test("str_rule", () => {
    const wholeNeutral = str_rule(PARTS.WHOLE, STATE.NEUTRAL);
    const wholeActive = str_rule(PARTS.WHOLE, STATE.ACTIVE);
    const wholeInactive = str_rule(PARTS.WHOLE, STATE.INACTIVE);
    const topNeutral = str_rule(PARTS.TOP, STATE.NEUTRAL);
    const mainNeutral = str_rule(PARTS.MAIN, STATE.NEUTRAL);
    expect(wholeNeutral).toBe(`${srule[PARTS.WHOLE]}`);
    expect(wholeActive).toBe(`${srule[PARTS.WHOLE]}`);
    expect(wholeInactive).toBe(`${srule[PARTS.WHOLE]}`);
    expect(topNeutral).toBeUndefined();
    expect(mainNeutral).toBe(`${srule[PARTS.MAIN]}`);
  });
  test("str_rulex", () => {
    const wholeNeutral = str_rulex(PARTS.WHOLE, STATE.NEUTRAL);
    const wholeActive = str_rulex(PARTS.WHOLE, STATE.ACTIVE);
    const wholeInactive = str_rulex(PARTS.WHOLE, STATE.INACTIVE);
    const topNeutral = str_rulex(PARTS.TOP, STATE.NEUTRAL);
    const mainNeutral = str_rulex(PARTS.MAIN, STATE.NEUTRAL);
    expect(wholeNeutral).toEqual(srulex[PARTS.WHOLE][BASE]);
    expect(wholeActive).toEqual([srulex[PARTS.WHOLE][BASE], srulex[PARTS.WHOLE][STATE.ACTIVE]]);
    expect(wholeInactive).toEqual(srulex[PARTS.WHOLE][BASE]);
    expect(topNeutral).toBeUndefined();
    expect(mainNeutral).toEqual(srulex[PARTS.MAIN]);
  });
  test("str_rules", () => {
    const wholeNeutral = str_rules(PARTS.WHOLE, STATE.NEUTRAL);
    const wholeActive = str_rules(PARTS.WHOLE, STATE.ACTIVE);
    const wholeInactive = str_rules(PARTS.WHOLE, STATE.INACTIVE);
    const topNeutral = str_rules(PARTS.TOP, STATE.NEUTRAL);
    const mainNeutral = str_rules(PARTS.MAIN, STATE.NEUTRAL);
    expect(wholeNeutral).toBe(`${srules[PARTS.WHOLE][BASE]}`);
    expect(wholeActive).toEqual([srules[PARTS.WHOLE][BASE], srules[PARTS.WHOLE][STATE.ACTIVE]]);
    expect(wholeInactive).toBe(`${srules[PARTS.WHOLE][BASE]}`);
    expect(topNeutral).toBeUndefined();
    expect(mainNeutral).toBe(`${srules[PARTS.MAIN][BASE]}`);
  });
  test("str_blank", () => {
    const wholeNeutral = str_blank(PARTS.WHOLE, STATE.NEUTRAL);
    const wholeActive = str_blank(PARTS.WHOLE, STATE.ACTIVE);
    const wholeInactive = str_blank(PARTS.WHOLE, STATE.INACTIVE);
    const topNeutral = str_blank(PARTS.TOP, STATE.NEUTRAL);
    const mainNeutral = str_blank(PARTS.MAIN, STATE.NEUTRAL);
    expect(wholeNeutral).toBe(`${pstr} ${PARTS.WHOLE} ${STATE.NEUTRAL}`);
    expect(wholeActive).toBe(`${pstr} ${PARTS.WHOLE} ${STATE.ACTIVE}`);
    expect(wholeInactive).toBe(`${pstr} ${PARTS.WHOLE} ${STATE.INACTIVE}`);
    expect(topNeutral).toBe(`${pstr} ${PARTS.TOP} ${STATE.NEUTRAL}`);
    expect(mainNeutral).toBe(`${pstr} ${PARTS.MAIN} ${STATE.NEUTRAL}`);
  });
  test("str_empty", () => {
    const wholeNeutral = str_empty(PARTS.WHOLE, STATE.NEUTRAL);
    const wholeActive = str_empty(PARTS.WHOLE, STATE.ACTIVE);
    const wholeInactive = str_empty(PARTS.WHOLE, STATE.INACTIVE);
    const topNeutral = str_empty(PARTS.TOP, STATE.NEUTRAL);
    const mainNeutral = str_empty(PARTS.MAIN, STATE.NEUTRAL);
    expect(wholeNeutral).toBe(`${pstr} ${PARTS.WHOLE} ${STATE.NEUTRAL}`);
    expect(wholeActive).toBe(`${pstr} ${PARTS.WHOLE} ${STATE.ACTIVE}`);
    expect(wholeInactive).toBe(`${pstr} ${PARTS.WHOLE} ${STATE.INACTIVE}`);
    expect(topNeutral).toBe(`${pstr} ${PARTS.TOP} ${STATE.NEUTRAL}`);
    expect(mainNeutral).toBe(`${pstr} ${PARTS.MAIN} ${STATE.NEUTRAL}`);
  });
  test("str_undef", () => {
    const wholeNeutral = str_undef(PARTS.WHOLE, STATE.NEUTRAL);
    const wholeActive = str_undef(PARTS.WHOLE, STATE.ACTIVE);
    const wholeInactive = str_undef(PARTS.WHOLE, STATE.INACTIVE);
    const topNeutral = str_undef(PARTS.TOP, STATE.NEUTRAL);
    const mainNeutral = str_undef(PARTS.MAIN, STATE.NEUTRAL);
    expect(wholeNeutral).toBe(`${pstr} ${PARTS.WHOLE} ${STATE.NEUTRAL}`);
    expect(wholeActive).toBe(`${pstr} ${PARTS.WHOLE} ${STATE.ACTIVE}`);
    expect(wholeInactive).toBe(`${pstr} ${PARTS.WHOLE} ${STATE.INACTIVE}`);
    expect(topNeutral).toBe(`${pstr} ${PARTS.TOP} ${STATE.NEUTRAL}`);
    expect(mainNeutral).toBe(`${pstr} ${PARTS.MAIN} ${STATE.NEUTRAL}`);
  });
  test("rule_str", () => {
    const wholeNeutral = rule_str(PARTS.WHOLE, STATE.NEUTRAL);
    const wholeActive = rule_str(PARTS.WHOLE, STATE.ACTIVE);
    const wholeInactive = rule_str(PARTS.WHOLE, STATE.INACTIVE);
    const topNeutral = rule_str(PARTS.TOP, STATE.NEUTRAL);
    const mainNeutral = rule_str(PARTS.MAIN, STATE.NEUTRAL);
    expect(wholeNeutral).toBe(`${sstr} ${PARTS.WHOLE} ${STATE.NEUTRAL}`);
    expect(wholeActive).toBe(`${sstr} ${PARTS.WHOLE} ${STATE.ACTIVE}`);
    expect(wholeInactive).toBe(`${sstr} ${PARTS.WHOLE} ${STATE.INACTIVE}`);
    expect(topNeutral).toBe(`${sstr} ${PARTS.TOP} ${STATE.NEUTRAL}`);
    expect(mainNeutral).toBe(`${sstr} ${PARTS.MAIN} ${STATE.NEUTRAL}`);
  });
  test("rule_rule", () => {
    const wholeNeutral = rule_rule(PARTS.WHOLE, STATE.NEUTRAL);
    const wholeActive = rule_rule(PARTS.WHOLE, STATE.ACTIVE);
    const wholeInactive = rule_rule(PARTS.WHOLE, STATE.INACTIVE);
    const topNeutral = rule_rule(PARTS.TOP, STATE.NEUTRAL);
    const mainNeutral = rule_rule(PARTS.MAIN, STATE.NEUTRAL);
    expect(wholeNeutral).toBe(`${srule[PARTS.WHOLE]}`);
    expect(wholeActive).toBe(`${srule[PARTS.WHOLE]}`);
    expect(wholeInactive).toBe(`${srule[PARTS.WHOLE]}`);
    expect(topNeutral).toBeUndefined();
    expect(mainNeutral).toBe(`${srule[PARTS.MAIN]}`);
  });
  test("rule_rules", () => {
    const wholeNeutral = rule_rules(PARTS.WHOLE, STATE.NEUTRAL);
    const wholeActive = rule_rules(PARTS.WHOLE, STATE.ACTIVE);
    const wholeInactive = rule_rules(PARTS.WHOLE, STATE.INACTIVE);
    const topNeutral = rule_rules(PARTS.TOP, STATE.NEUTRAL);
    const mainNeutral = rule_rules(PARTS.MAIN, STATE.NEUTRAL);
    expect(wholeNeutral).toBe(`${srules[PARTS.WHOLE][BASE]}`);
    expect(wholeActive).toEqual([srules[PARTS.WHOLE][BASE], srules[PARTS.WHOLE][STATE.ACTIVE]]);
    expect(wholeInactive).toBe(`${srules[PARTS.WHOLE][BASE]}`);
    expect(topNeutral).toBeUndefined();
    expect(mainNeutral).toBe(`${srules[PARTS.MAIN][BASE]}`);
  });
  test("rule_blank", () => {
    const wholeNeutral = rule_blank(PARTS.WHOLE, STATE.NEUTRAL);
    const wholeActive = rule_blank(PARTS.WHOLE, STATE.ACTIVE);
    const wholeInactive = rule_blank(PARTS.WHOLE, STATE.INACTIVE);
    const topNeutral = rule_blank(PARTS.TOP, STATE.NEUTRAL);
    const mainNeutral = rule_blank(PARTS.MAIN, STATE.NEUTRAL);
    expect(wholeNeutral).toBe(`${prule[PARTS.WHOLE]}`);
    expect(wholeActive).toBe(`${prule[PARTS.WHOLE]}`);
    expect(wholeInactive).toBe(`${prule[PARTS.WHOLE]}`);
    expect(topNeutral).toBe(`${prule[PARTS.TOP]}`);
    expect(mainNeutral).toBeUndefined();
  });
  test("rule_empty", () => {
    const wholeNeutral = rule_empty(PARTS.WHOLE, STATE.NEUTRAL);
    const wholeActive = rule_empty(PARTS.WHOLE, STATE.ACTIVE);
    const wholeInactive = rule_empty(PARTS.WHOLE, STATE.INACTIVE);
    const topNeutral = rule_empty(PARTS.TOP, STATE.NEUTRAL);
    const mainNeutral = rule_empty(PARTS.MAIN, STATE.NEUTRAL);
    expect(wholeNeutral).toBe(`${prule[PARTS.WHOLE]}`);
    expect(wholeActive).toBe(`${prule[PARTS.WHOLE]}`);
    expect(wholeInactive).toBe(`${prule[PARTS.WHOLE]}`);
    expect(topNeutral).toBe(`${prule[PARTS.TOP]}`);
    expect(mainNeutral).toBeUndefined();
  });
  test("rule_undef", () => {
    const wholeNeutral = rule_undef(PARTS.WHOLE, STATE.NEUTRAL);
    const wholeActive = rule_undef(PARTS.WHOLE, STATE.ACTIVE);
    const wholeInactive = rule_undef(PARTS.WHOLE, STATE.INACTIVE);
    const topNeutral = rule_undef(PARTS.TOP, STATE.NEUTRAL);
    const mainNeutral = rule_undef(PARTS.MAIN, STATE.NEUTRAL);
    expect(wholeNeutral).toBe(`${prule[PARTS.WHOLE]}`);
    expect(wholeActive).toBe(`${prule[PARTS.WHOLE]}`);
    expect(wholeInactive).toBe(`${prule[PARTS.WHOLE]}`);
    expect(topNeutral).toBe(`${prule[PARTS.TOP]}`);
    expect(mainNeutral).toBeUndefined();
  });
  test("rules_str", () => {
    const wholeNeutral = rules_str(PARTS.WHOLE, STATE.NEUTRAL);
    const wholeActive = rules_str(PARTS.WHOLE, STATE.ACTIVE);
    const wholeInactive = rules_str(PARTS.WHOLE, STATE.INACTIVE);
    const topNeutral = rules_str(PARTS.TOP, STATE.NEUTRAL);
    const mainNeutral = rules_str(PARTS.MAIN, STATE.NEUTRAL);
    expect(wholeNeutral).toBe(`${sstr} ${PARTS.WHOLE} ${STATE.NEUTRAL}`);
    expect(wholeActive).toBe(`${sstr} ${PARTS.WHOLE} ${STATE.ACTIVE}`);
    expect(wholeInactive).toBe(`${sstr} ${PARTS.WHOLE} ${STATE.INACTIVE}`);
    expect(topNeutral).toBe(`${sstr} ${PARTS.TOP} ${STATE.NEUTRAL}`);
    expect(mainNeutral).toBe(`${sstr} ${PARTS.MAIN} ${STATE.NEUTRAL}`);
  });
  test("rules_rule", () => {
    const wholeNeutral = rules_rule(PARTS.WHOLE, STATE.NEUTRAL);
    const wholeActive = rules_rule(PARTS.WHOLE, STATE.ACTIVE);
    const wholeInactive = rules_rule(PARTS.WHOLE, STATE.INACTIVE);
    const topNeutral = rules_rule(PARTS.TOP, STATE.NEUTRAL);
    const mainNeutral = rules_rule(PARTS.MAIN, STATE.NEUTRAL);
    expect(wholeNeutral).toBe(`${srule[PARTS.WHOLE]}`);
    expect(wholeActive).toBe(`${srule[PARTS.WHOLE]}`);
    expect(wholeInactive).toBe(`${srule[PARTS.WHOLE]}`);
    expect(topNeutral).toBeUndefined();
    expect(mainNeutral).toBe(`${srule[PARTS.MAIN]}`);
  });
  test("rules_rules", () => {
    const wholeNeutral = rules_rules(PARTS.WHOLE, STATE.NEUTRAL);
    const wholeActive = rules_rules(PARTS.WHOLE, STATE.ACTIVE);
    const wholeInactive = rules_rules(PARTS.WHOLE, STATE.INACTIVE);
    const topNeutral = rules_rules(PARTS.TOP, STATE.NEUTRAL);
    const mainNeutral = rules_rules(PARTS.MAIN, STATE.NEUTRAL);
    expect(wholeNeutral).toBe(`${srules[PARTS.WHOLE][BASE]}`);
    expect(wholeActive).toEqual([srules[PARTS.WHOLE][BASE], srules[PARTS.WHOLE][STATE.ACTIVE]]);
    expect(wholeInactive).toBe(`${srules[PARTS.WHOLE][BASE]}`);
    expect(topNeutral).toBeUndefined();
    expect(mainNeutral).toBe(`${srules[PARTS.MAIN][BASE]}`);
  });
  test("rules_blank", () => {
    const wholeNeutral = rules_blank(PARTS.WHOLE, STATE.NEUTRAL);
    const wholeActive = rules_blank(PARTS.WHOLE, STATE.ACTIVE);
    const wholeInactive = rules_blank(PARTS.WHOLE, STATE.INACTIVE);
    const topNeutral = rules_blank(PARTS.TOP, STATE.NEUTRAL);
    const mainNeutral = rules_blank(PARTS.MAIN, STATE.NEUTRAL);
    expect(wholeNeutral).toEqual([prules[PARTS.WHOLE][BASE], prules[PARTS.WHOLE][STATE.NEUTRAL]]);
    expect(wholeActive).toEqual([prules[PARTS.WHOLE][BASE], prules[PARTS.WHOLE][STATE.NEUTRAL]]);
    expect(wholeInactive).toEqual([prules[PARTS.WHOLE][BASE], prules[PARTS.WHOLE][STATE.NEUTRAL]]);
    expect(topNeutral).toBe(`${prules[PARTS.TOP][STATE.NEUTRAL]}`);
    expect(mainNeutral).toBeUndefined();
  });
  test("rules_empty", () => {
    const wholeNeutral = rules_empty(PARTS.WHOLE, STATE.NEUTRAL);
    const wholeActive = rules_empty(PARTS.WHOLE, STATE.ACTIVE);
    const wholeInactive = rules_empty(PARTS.WHOLE, STATE.INACTIVE);
    const topNeutral = rules_empty(PARTS.TOP, STATE.NEUTRAL);
    const mainNeutral = rules_empty(PARTS.MAIN, STATE.NEUTRAL);
    expect(wholeNeutral).toEqual([prules[PARTS.WHOLE][BASE], prules[PARTS.WHOLE][STATE.NEUTRAL]]);
    expect(wholeActive).toEqual([prules[PARTS.WHOLE][BASE], prules[PARTS.WHOLE][STATE.NEUTRAL]]);
    expect(wholeInactive).toEqual([prules[PARTS.WHOLE][BASE], prules[PARTS.WHOLE][STATE.NEUTRAL]]);
    expect(topNeutral).toBe(`${prules[PARTS.TOP][STATE.NEUTRAL]}`);
    expect(mainNeutral).toBeUndefined();
  });
  test("rules_undef", () => {
    const wholeNeutral = rules_undef(PARTS.WHOLE, STATE.NEUTRAL);
    const wholeActive = rules_undef(PARTS.WHOLE, STATE.ACTIVE);
    const wholeInactive = rules_undef(PARTS.WHOLE, STATE.INACTIVE);
    const topNeutral = rules_undef(PARTS.TOP, STATE.NEUTRAL);
    const mainNeutral = rules_undef(PARTS.MAIN, STATE.NEUTRAL);
    expect(wholeNeutral).toEqual([prules[PARTS.WHOLE][BASE], prules[PARTS.WHOLE][STATE.NEUTRAL]]);
    expect(wholeActive).toEqual([prules[PARTS.WHOLE][BASE], prules[PARTS.WHOLE][STATE.NEUTRAL]]);
    expect(wholeInactive).toEqual([prules[PARTS.WHOLE][BASE], prules[PARTS.WHOLE][STATE.NEUTRAL]]);
    expect(topNeutral).toBe(`${prules[PARTS.TOP][STATE.NEUTRAL]}`);
    expect(mainNeutral).toBeUndefined();
  });
  test("blank_str", () => {
    const wholeNeutral = blank_str(PARTS.WHOLE, STATE.NEUTRAL);
    const wholeActive = blank_str(PARTS.WHOLE, STATE.ACTIVE);
    const wholeInactive = blank_str(PARTS.WHOLE, STATE.INACTIVE);
    const topNeutral = blank_str(PARTS.TOP, STATE.NEUTRAL);
    const mainNeutral = blank_str(PARTS.MAIN, STATE.NEUTRAL);
    expect(wholeNeutral).toBe(`${sstr} ${PARTS.WHOLE} ${STATE.NEUTRAL}`);
    expect(wholeActive).toBe(`${sstr} ${PARTS.WHOLE} ${STATE.ACTIVE}`);
    expect(wholeInactive).toBe(`${sstr} ${PARTS.WHOLE} ${STATE.INACTIVE}`);
    expect(topNeutral).toBe(`${sstr} ${PARTS.TOP} ${STATE.NEUTRAL}`);
    expect(mainNeutral).toBe(`${sstr} ${PARTS.MAIN} ${STATE.NEUTRAL}`);
  });
  test("blank_rule", () => {
    const wholeNeutral = blank_rule(PARTS.WHOLE, STATE.NEUTRAL);
    const wholeActive = blank_rule(PARTS.WHOLE, STATE.ACTIVE);
    const wholeInactive = blank_rule(PARTS.WHOLE, STATE.INACTIVE);
    const topNeutral = blank_rule(PARTS.TOP, STATE.NEUTRAL);
    const mainNeutral = blank_rule(PARTS.MAIN, STATE.NEUTRAL);
    expect(wholeNeutral).toBe(`${srule[PARTS.WHOLE]}`);
    expect(wholeActive).toBe(`${srule[PARTS.WHOLE]}`);
    expect(wholeInactive).toBe(`${srule[PARTS.WHOLE]}`);
    expect(topNeutral).toBeUndefined();
    expect(mainNeutral).toBe(`${srule[PARTS.MAIN]}`);
  });
  test("blank_rules", () => {
    const wholeNeutral = blank_rules(PARTS.WHOLE, STATE.NEUTRAL);
    const wholeActive = blank_rules(PARTS.WHOLE, STATE.ACTIVE);
    const wholeInactive = blank_rules(PARTS.WHOLE, STATE.INACTIVE);
    const topNeutral = blank_rules(PARTS.TOP, STATE.NEUTRAL);
    const mainNeutral = blank_rules(PARTS.MAIN, STATE.NEUTRAL);
    expect(wholeNeutral).toBe(`${srules[PARTS.WHOLE][BASE]}`);
    expect(wholeActive).toEqual([srules[PARTS.WHOLE][BASE], srules[PARTS.WHOLE][STATE.ACTIVE]]);
    expect(wholeInactive).toBe(`${srules[PARTS.WHOLE][BASE]}`);
    expect(topNeutral).toBeUndefined();
    expect(mainNeutral).toBe(`${srules[PARTS.MAIN][BASE]}`);
  });
  test("blank_blank", () => {
    const wholeNeutral = blank_blank(PARTS.WHOLE, STATE.NEUTRAL);
    const wholeActive = blank_blank(PARTS.WHOLE, STATE.ACTIVE);
    const wholeInactive = blank_blank(PARTS.WHOLE, STATE.INACTIVE);
    const topNeutral = blank_blank(PARTS.TOP, STATE.NEUTRAL);
    const mainNeutral = blank_blank(PARTS.MAIN, STATE.NEUTRAL);
    expect(wholeNeutral).toBeUndefined();
    expect(wholeActive).toBeUndefined();
    expect(wholeInactive).toBeUndefined();
    expect(topNeutral).toBeUndefined();
    expect(mainNeutral).toBeUndefined();
  });
  test("blank_empty", () => {
    const wholeNeutral = blank_empty(PARTS.WHOLE, STATE.NEUTRAL);
    const wholeActive = blank_empty(PARTS.WHOLE, STATE.ACTIVE);
    const wholeInactive = blank_empty(PARTS.WHOLE, STATE.INACTIVE);
    const topNeutral = blank_empty(PARTS.TOP, STATE.NEUTRAL);
    const mainNeutral = blank_empty(PARTS.MAIN, STATE.NEUTRAL);
    expect(wholeNeutral).toBeUndefined();
    expect(wholeActive).toBeUndefined();
    expect(wholeInactive).toBeUndefined();
    expect(topNeutral).toBeUndefined();
    expect(mainNeutral).toBeUndefined();
  });
  test("blank_undef", () => {
    const wholeNeutral = blank_undef(PARTS.WHOLE, STATE.NEUTRAL);
    const wholeActive = blank_undef(PARTS.WHOLE, STATE.ACTIVE);
    const wholeInactive = blank_undef(PARTS.WHOLE, STATE.INACTIVE);
    const topNeutral = blank_undef(PARTS.TOP, STATE.NEUTRAL);
    const mainNeutral = blank_undef(PARTS.MAIN, STATE.NEUTRAL);
    expect(wholeNeutral).toBeUndefined();
    expect(wholeActive).toBeUndefined();
    expect(wholeInactive).toBeUndefined();
    expect(topNeutral).toBeUndefined();
    expect(mainNeutral).toBeUndefined();
  });
  test("empty_str", () => {
    const wholeNeutral = empty_str(PARTS.WHOLE, STATE.NEUTRAL);
    const wholeActive = empty_str(PARTS.WHOLE, STATE.ACTIVE);
    const wholeInactive = empty_str(PARTS.WHOLE, STATE.INACTIVE);
    const topNeutral = empty_str(PARTS.TOP, STATE.NEUTRAL);
    const mainNeutral = empty_str(PARTS.MAIN, STATE.NEUTRAL);
    expect(wholeNeutral).toBe(`${sstr} ${PARTS.WHOLE} ${STATE.NEUTRAL}`);
    expect(wholeActive).toBe(`${sstr} ${PARTS.WHOLE} ${STATE.ACTIVE}`);
    expect(wholeInactive).toBe(`${sstr} ${PARTS.WHOLE} ${STATE.INACTIVE}`);
    expect(topNeutral).toBe(`${sstr} ${PARTS.TOP} ${STATE.NEUTRAL}`);
    expect(mainNeutral).toBe(`${sstr} ${PARTS.MAIN} ${STATE.NEUTRAL}`);
  });
  test("empty_rule", () => {
    const wholeNeutral = empty_rule(PARTS.WHOLE, STATE.NEUTRAL);
    const wholeActive = empty_rule(PARTS.WHOLE, STATE.ACTIVE);
    const wholeInactive = empty_rule(PARTS.WHOLE, STATE.INACTIVE);
    const topNeutral = empty_rule(PARTS.TOP, STATE.NEUTRAL);
    const mainNeutral = empty_rule(PARTS.MAIN, STATE.NEUTRAL);
    expect(wholeNeutral).toBe(`${srule[PARTS.WHOLE]}`);
    expect(wholeActive).toBe(`${srule[PARTS.WHOLE]}`);
    expect(wholeInactive).toBe(`${srule[PARTS.WHOLE]}`);
    expect(topNeutral).toBeUndefined();
    expect(mainNeutral).toBe(`${srule[PARTS.MAIN]}`);
  });
  test("empty_rules", () => {
    const wholeNeutral = empty_rules(PARTS.WHOLE, STATE.NEUTRAL);
    const wholeActive = empty_rules(PARTS.WHOLE, STATE.ACTIVE);
    const wholeInactive = empty_rules(PARTS.WHOLE, STATE.INACTIVE);
    const topNeutral = empty_rules(PARTS.TOP, STATE.NEUTRAL);
    const mainNeutral = empty_rules(PARTS.MAIN, STATE.NEUTRAL);
    expect(wholeNeutral).toBe(`${srules[PARTS.WHOLE][BASE]}`);
    expect(wholeActive).toEqual([srules[PARTS.WHOLE][BASE], srules[PARTS.WHOLE][STATE.ACTIVE]]);
    expect(wholeInactive).toBe(`${srules[PARTS.WHOLE][BASE]}`);
    expect(topNeutral).toBeUndefined();
    expect(mainNeutral).toBe(`${srules[PARTS.MAIN][BASE]}`);
  });
  test("empty_blank", () => {
    const wholeNeutral = empty_blank(PARTS.WHOLE, STATE.NEUTRAL);
    const wholeActive = empty_blank(PARTS.WHOLE, STATE.ACTIVE);
    const wholeInactive = empty_blank(PARTS.WHOLE, STATE.INACTIVE);
    const topNeutral = empty_blank(PARTS.TOP, STATE.NEUTRAL);
    const mainNeutral = empty_blank(PARTS.MAIN, STATE.NEUTRAL);
    expect(wholeNeutral).toBeUndefined();
    expect(wholeActive).toBeUndefined();
    expect(wholeInactive).toBeUndefined();
    expect(topNeutral).toBeUndefined();
    expect(mainNeutral).toBeUndefined();
  });
  test("empty_empty", () => {
    const wholeNeutral = empty_empty(PARTS.WHOLE, STATE.NEUTRAL);
    const wholeActive = empty_empty(PARTS.WHOLE, STATE.ACTIVE);
    const wholeInactive = empty_empty(PARTS.WHOLE, STATE.INACTIVE);
    const topNeutral = empty_empty(PARTS.TOP, STATE.NEUTRAL);
    const mainNeutral = empty_empty(PARTS.MAIN, STATE.NEUTRAL);
    expect(wholeNeutral).toBeUndefined();
    expect(wholeActive).toBeUndefined();
    expect(wholeInactive).toBeUndefined();
    expect(topNeutral).toBeUndefined();
    expect(mainNeutral).toBeUndefined();
  });
  test("empty_undef", () => {
    const wholeNeutral = empty_undef(PARTS.WHOLE, STATE.NEUTRAL);
    const wholeActive = empty_undef(PARTS.WHOLE, STATE.ACTIVE);
    const wholeInactive = empty_undef(PARTS.WHOLE, STATE.INACTIVE);
    const topNeutral = empty_undef(PARTS.TOP, STATE.NEUTRAL);
    const mainNeutral = empty_undef(PARTS.MAIN, STATE.NEUTRAL);
    expect(wholeNeutral).toBeUndefined();
    expect(wholeActive).toBeUndefined();
    expect(wholeInactive).toBeUndefined();
    expect(topNeutral).toBeUndefined();
    expect(mainNeutral).toBeUndefined();
  });

  // test("noPresetWithStyle", () => {
  //   const wholeNeutral = noPresetWithStyle(PARTS.WHOLE, STATE.NEUTRAL);
  //   const wholeActive = noPresetWithStyle(PARTS.WHOLE, STATE.ACTIVE);
  //   const wholeInactive = noPresetWithStyle(PARTS.WHOLE, STATE.INACTIVE);
  //   const topNeutral = noPresetWithStyle(PARTS.TOP, STATE.NEUTRAL);
  //   const mainNeutral = noPresetWithStyle(PARTS.MAIN, STATE.NEUTRAL);
  //   expect(wholeNeutral).toBe(`${style.whole?.const}`);
  //   expect(wholeActive).toBe(`${style.whole?.const} ${style.whole?.active}`);
  //   expect(wholeInactive).toBe(`${style.whole?.const}`);
  //   expect(topNeutral).toBeUndefined();
  //   expect(mainNeutral).toBe(`${style.main?.const}`);
  // });
  // test("noPresetEmptyStyle", () => {
  //   const wholeNeutral = noPresetEmptyStyle(PARTS.WHOLE, STATE.NEUTRAL);
  //   const wholeActive = noPresetEmptyStyle(PARTS.WHOLE, STATE.ACTIVE);
  //   const wholeInactive = noPresetEmptyStyle(PARTS.WHOLE, STATE.INACTIVE);
  //   const topNeutral = noPresetEmptyStyle(PARTS.TOP, STATE.NEUTRAL);
  //   const mainNeutral = noPresetEmptyStyle(PARTS.MAIN, STATE.NEUTRAL);
  //   expect(wholeNeutral).toBe(`${name} ${PARTS.WHOLE}`);
  //   expect(wholeActive).toBe(`${name} ${PARTS.WHOLE} ${STATE.ACTIVE}`);
  //   expect(wholeInactive).toBe(`${name} ${PARTS.WHOLE} ${STATE.INACTIVE}`);
  //   expect(topNeutral).toBe(`${name} ${PARTS.TOP}`);
  //   expect(mainNeutral).toBe(`${name} ${PARTS.MAIN}`);
  // });
  // test("noPresetStrStyle", () => {
  //   const wholeNeutral = noPresetStrStyle(PARTS.WHOLE, STATE.NEUTRAL);
  //   const wholeActive = noPresetStrStyle(PARTS.WHOLE, STATE.ACTIVE);
  //   const wholeInactive = noPresetStrStyle(PARTS.WHOLE, STATE.INACTIVE);
  //   const topNeutral = noPresetStrStyle(PARTS.TOP, STATE.NEUTRAL);
  //   const mainNeutral = noPresetStrStyle(PARTS.MAIN, STATE.NEUTRAL);
  //   expect(wholeNeutral).toBe(`${strStyle} ${PARTS.WHOLE}`);
  //   expect(wholeActive).toBe(`${strStyle} ${PARTS.WHOLE} ${STATE.ACTIVE}`);
  //   expect(wholeInactive).toBe(`${strStyle} ${PARTS.WHOLE} ${STATE.INACTIVE}`);
  //   expect(topNeutral).toBe(`${strStyle} ${PARTS.TOP}`);
  //   expect(mainNeutral).toBe(`${strStyle} ${PARTS.MAIN}`);
  // });
  // test("withPresetNoStyle", () => {
  //   const wholeNeutral = withPresetNoStyle(PARTS.WHOLE, STATE.NEUTRAL);
  //   const wholeActive = withPresetNoStyle(PARTS.WHOLE, STATE.ACTIVE);
  //   const wholeInactive = withPresetNoStyle(PARTS.WHOLE, STATE.INACTIVE);
  //   const topNeutral = withPresetNoStyle(PARTS.TOP, STATE.NEUTRAL);
  //   const mainNeutral = withPresetNoStyle(PARTS.MAIN, STATE.NEUTRAL);
  //   expect(wholeNeutral).toBe(`${preset.whole?.const} ${preset.whole?.default}`);
  //   expect(wholeActive).toBe(`${preset.whole?.const} ${preset.whole?.default}`);
  //   expect(wholeInactive).toBe(`${preset.whole?.const} ${preset.whole?.default}`);
  //   expect(topNeutral).toBe(`${preset.top?.default}`);
  //   expect(mainNeutral).toBeUndefined();
  // });
  // test("withPresetWithStyle", () => {
  //   const wholeNeutral = withPresetWithStyle(PARTS.WHOLE, STATE.NEUTRAL);
  //   const wholeActive = withPresetWithStyle(PARTS.WHOLE, STATE.ACTIVE);
  //   const wholeInactive = withPresetWithStyle(PARTS.WHOLE, STATE.INACTIVE);
  //   const topNeutral = withPresetWithStyle(PARTS.TOP, STATE.NEUTRAL);
  //   const mainNeutral = withPresetWithStyle(PARTS.MAIN, STATE.NEUTRAL);
  //   expect(wholeNeutral).toBe(`${style.whole?.const} ${preset.whole?.default}`);
  //   expect(wholeActive).toBe(`${style.whole?.const} ${style.whole?.active}`);
  //   expect(wholeInactive).toBe(`${style.whole?.const} ${preset.whole?.default}`);
  //   expect(topNeutral).toBe(`${preset.top?.default}`);
  //   expect(mainNeutral).toBe(`${style.main?.const}`);
  // });
  // test("withPresetEmptyStyle", () => {
  //   const wholeNeutral = withPresetEmptyStyle(PARTS.WHOLE, STATE.NEUTRAL);
  //   const wholeActive = withPresetEmptyStyle(PARTS.WHOLE, STATE.ACTIVE);
  //   const wholeInactive = withPresetEmptyStyle(PARTS.WHOLE, STATE.INACTIVE);
  //   const topNeutral = withPresetEmptyStyle(PARTS.TOP, STATE.NEUTRAL);
  //   const mainNeutral = withPresetEmptyStyle(PARTS.MAIN, STATE.NEUTRAL);
  //   expect(wholeNeutral).toBe(`${name} ${PARTS.WHOLE}`);
  //   expect(wholeActive).toBe(`${name} ${PARTS.WHOLE} ${STATE.ACTIVE}`);
  //   expect(wholeInactive).toBe(`${name} ${PARTS.WHOLE} ${STATE.INACTIVE}`);
  //   expect(topNeutral).toBe(`${name} ${PARTS.TOP}`);
  //   expect(mainNeutral).toBe(`${name} ${PARTS.MAIN}`);
  // });
  // test("withPresetStrStyle", () => {
  //   const wholeNeutral = withPresetStrStyle(PARTS.WHOLE, STATE.NEUTRAL);
  //   const wholeActive = withPresetStrStyle(PARTS.WHOLE, STATE.ACTIVE);
  //   const wholeInactive = withPresetStrStyle(PARTS.WHOLE, STATE.INACTIVE);
  //   const topNeutral = withPresetStrStyle(PARTS.TOP, STATE.NEUTRAL);
  //   const mainNeutral = withPresetStrStyle(PARTS.MAIN, STATE.NEUTRAL);
  //   expect(wholeNeutral).toBe(`${strStyle} ${PARTS.WHOLE}`);
  //   expect(wholeActive).toBe(`${strStyle} ${PARTS.WHOLE} ${STATE.ACTIVE}`);
  //   expect(wholeInactive).toBe(`${strStyle} ${PARTS.WHOLE} ${STATE.INACTIVE}`);
  //   expect(topNeutral).toBe(`${strStyle} ${PARTS.TOP}`);
  //   expect(mainNeutral).toBe(`${strStyle} ${PARTS.MAIN}`);
  // });
});

describe("omit", () => {
  test("return empty object", () => {
    const result = omit(undefined);
    expect(result).toStrictEqual({});
  });
  test("return shallow copied object", () => {
    const obj = { a: 1, b: 2, c: 3 };
    const result = omit(obj, "a", "c");
    expect(result).toStrictEqual({ b: 2 });
    expect(obj).toStrictEqual({ a: 1, b: 2, c: 3 });
  });
});

describe("debounce", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  test("call once", () => {
    const mockFn = vi.fn();
    const debouncedFn = debounce(100, mockFn);

    debouncedFn();
    expect(mockFn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(50);
    expect(mockFn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(50);
    expect(mockFn).toHaveBeenCalledTimes(1);
  });
  test("call several times", () => {
    const mockFn = vi.fn();
    const debouncedFn = debounce(100, mockFn);

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
    const debouncedFn = debounce(100, mockFn);

    debouncedFn("test", 123);
    vi.advanceTimersByTime(100);
    expect(mockFn).toHaveBeenCalledWith("test", 123);
  });
});

describe("throttle", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  test("immediately run by first time call", () => {
    const mockFn = vi.fn();
    const throttledFn = throttle(100, mockFn);

    throttledFn("test");
    expect(mockFn).toHaveBeenCalledTimes(1);
    expect(mockFn).toHaveBeenCalledWith("test");
  });
  test("prevent run within interval", () => {
    const mockFn = vi.fn();
    const throttledFn = throttle(100, mockFn);

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
    const throttledFn = throttle(100, mockFn);

    throttledFn("first");
    mockFn.mockClear(); // reset first call

    throttledFn("second");
    vi.advanceTimersByTime(50);
    throttledFn("third");
    vi.advanceTimersByTime(50);

    expect(mockFn).toHaveBeenCalledTimes(1);
    expect(mockFn).toHaveBeenCalledWith("third");
  });
});

describe("UniqueId", () => {
  test("construct without arg", () => {
    const unique = new UniqueId();
    expect(unique.id.length).toBe(3);
  });
  test("construct with len arg", () => {
    const unique = new UniqueId(7);
    expect(unique.id.length).toBe(7);
  });
  test("construct with invalid len arg", () => {
    const unique1 = new UniqueId(NaN);
    const unique2 = new UniqueId(-10);
    const unique3 = new UniqueId(2);
    expect(unique1.id.length).toBe(3);
    expect(unique2.id.length).toBe(3);
    expect(unique3.id.length).toBe(3);
  });
  test("ids are unique until limit", () => {
    const unique = new UniqueId();
    const count = 100000;
    const ids = new Set();
    for (let i = 0; i < count; i++) {
      ids.add(unique.id);
    }
    expect(ids.size).toBe(count);
  });
});
