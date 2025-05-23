import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { CONST, debounce, elemId, fnClass, omit, PARTS, STATE, type SVSStyle, throttle, UniqueId } from "../lib/_svseeds/core.ts";

describe("const vars", () => {
  test("STATE", () => {
    expect(STATE).toEqual({
      DEFAULT: "default",
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
  test("CONST", () => {
    expect(CONST).toBe("const");
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
  const prules = {
    [PARTS.WHOLE]: {
      [CONST]: "preset-rules-wc",
      [STATE.DEFAULT]: "preset-rules-wd",
    },
    [PARTS.TOP]: {
      [STATE.DEFAULT]: "preset-rules-tc",
      [STATE.INACTIVE]: "preset-rules-ti",
    },
  };
  const srules = {
    [PARTS.WHOLE]: {
      [CONST]: "style-rules-wc",
      [STATE.ACTIVE]: "style-rules-wa",
    },
    [PARTS.MAIN]: {
      [CONST]: "style-rules-mc",
      [STATE.INACTIVE]: "style-rules-mi",
    },
  };

  // preset_style
  const str_str = fnClass(pstr, sstr);
  const str_rule = fnClass(pstr, srule);
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
    const wholeDefault = str_str(PARTS.WHOLE, STATE.DEFAULT);
    const wholeActive = str_str(PARTS.WHOLE, STATE.ACTIVE);
    const wholeInactive = str_str(PARTS.WHOLE, STATE.INACTIVE);
    const topDefault = str_str(PARTS.TOP, STATE.DEFAULT);
    const mainDefault = str_str(PARTS.MAIN, STATE.DEFAULT);
    expect(wholeDefault).toBe(`${sstr} ${PARTS.WHOLE} ${STATE.DEFAULT}`);
    expect(wholeActive).toBe(`${sstr} ${PARTS.WHOLE} ${STATE.ACTIVE}`);
    expect(wholeInactive).toBe(`${sstr} ${PARTS.WHOLE} ${STATE.INACTIVE}`);
    expect(topDefault).toBe(`${sstr} ${PARTS.TOP} ${STATE.DEFAULT}`);
    expect(mainDefault).toBe(`${sstr} ${PARTS.MAIN} ${STATE.DEFAULT}`);
  });
  test("str_rule", () => {
    const wholeDefault = str_rule(PARTS.WHOLE, STATE.DEFAULT);
    const wholeActive = str_rule(PARTS.WHOLE, STATE.ACTIVE);
    const wholeInactive = str_rule(PARTS.WHOLE, STATE.INACTIVE);
    const topDefault = str_rule(PARTS.TOP, STATE.DEFAULT);
    const mainDefault = str_rule(PARTS.MAIN, STATE.DEFAULT);
    expect(wholeDefault).toBe(`${srule[PARTS.WHOLE]}`);
    expect(wholeActive).toBe(`${srule[PARTS.WHOLE]}`);
    expect(wholeInactive).toBe(`${srule[PARTS.WHOLE]}`);
    expect(topDefault).toBeUndefined();
    expect(mainDefault).toBe(`${srule[PARTS.MAIN]}`);
  });
  test("str_rules", () => {
    const wholeDefault = str_rules(PARTS.WHOLE, STATE.DEFAULT);
    const wholeActive = str_rules(PARTS.WHOLE, STATE.ACTIVE);
    const wholeInactive = str_rules(PARTS.WHOLE, STATE.INACTIVE);
    const topDefault = str_rules(PARTS.TOP, STATE.DEFAULT);
    const mainDefault = str_rules(PARTS.MAIN, STATE.DEFAULT);
    expect(wholeDefault).toBe(`${srules[PARTS.WHOLE][CONST]}`);
    expect(wholeActive).toEqual([srules[PARTS.WHOLE][CONST], srules[PARTS.WHOLE][STATE.ACTIVE]]);
    expect(wholeInactive).toBe(`${srules[PARTS.WHOLE][CONST]}`);
    expect(topDefault).toBeUndefined();
    expect(mainDefault).toBe(`${srules[PARTS.MAIN][CONST]}`);
  });
  test("str_blank", () => {
    const wholeDefault = str_blank(PARTS.WHOLE, STATE.DEFAULT);
    const wholeActive = str_blank(PARTS.WHOLE, STATE.ACTIVE);
    const wholeInactive = str_blank(PARTS.WHOLE, STATE.INACTIVE);
    const topDefault = str_blank(PARTS.TOP, STATE.DEFAULT);
    const mainDefault = str_blank(PARTS.MAIN, STATE.DEFAULT);
    expect(wholeDefault).toBe(`${pstr} ${PARTS.WHOLE} ${STATE.DEFAULT}`);
    expect(wholeActive).toBe(`${pstr} ${PARTS.WHOLE} ${STATE.ACTIVE}`);
    expect(wholeInactive).toBe(`${pstr} ${PARTS.WHOLE} ${STATE.INACTIVE}`);
    expect(topDefault).toBe(`${pstr} ${PARTS.TOP} ${STATE.DEFAULT}`);
    expect(mainDefault).toBe(`${pstr} ${PARTS.MAIN} ${STATE.DEFAULT}`);
  });
  test("str_empty", () => {
    const wholeDefault = str_empty(PARTS.WHOLE, STATE.DEFAULT);
    const wholeActive = str_empty(PARTS.WHOLE, STATE.ACTIVE);
    const wholeInactive = str_empty(PARTS.WHOLE, STATE.INACTIVE);
    const topDefault = str_empty(PARTS.TOP, STATE.DEFAULT);
    const mainDefault = str_empty(PARTS.MAIN, STATE.DEFAULT);
    expect(wholeDefault).toBe(`${pstr} ${PARTS.WHOLE} ${STATE.DEFAULT}`);
    expect(wholeActive).toBe(`${pstr} ${PARTS.WHOLE} ${STATE.ACTIVE}`);
    expect(wholeInactive).toBe(`${pstr} ${PARTS.WHOLE} ${STATE.INACTIVE}`);
    expect(topDefault).toBe(`${pstr} ${PARTS.TOP} ${STATE.DEFAULT}`);
    expect(mainDefault).toBe(`${pstr} ${PARTS.MAIN} ${STATE.DEFAULT}`);
  });
  test("str_undef", () => {
    const wholeDefault = str_undef(PARTS.WHOLE, STATE.DEFAULT);
    const wholeActive = str_undef(PARTS.WHOLE, STATE.ACTIVE);
    const wholeInactive = str_undef(PARTS.WHOLE, STATE.INACTIVE);
    const topDefault = str_undef(PARTS.TOP, STATE.DEFAULT);
    const mainDefault = str_undef(PARTS.MAIN, STATE.DEFAULT);
    expect(wholeDefault).toBe(`${pstr} ${PARTS.WHOLE} ${STATE.DEFAULT}`);
    expect(wholeActive).toBe(`${pstr} ${PARTS.WHOLE} ${STATE.ACTIVE}`);
    expect(wholeInactive).toBe(`${pstr} ${PARTS.WHOLE} ${STATE.INACTIVE}`);
    expect(topDefault).toBe(`${pstr} ${PARTS.TOP} ${STATE.DEFAULT}`);
    expect(mainDefault).toBe(`${pstr} ${PARTS.MAIN} ${STATE.DEFAULT}`);
  });
  test("rule_str", () => {
    const wholeDefault = rule_str(PARTS.WHOLE, STATE.DEFAULT);
    const wholeActive = rule_str(PARTS.WHOLE, STATE.ACTIVE);
    const wholeInactive = rule_str(PARTS.WHOLE, STATE.INACTIVE);
    const topDefault = rule_str(PARTS.TOP, STATE.DEFAULT);
    const mainDefault = rule_str(PARTS.MAIN, STATE.DEFAULT);
    expect(wholeDefault).toBe(`${sstr} ${PARTS.WHOLE} ${STATE.DEFAULT}`);
    expect(wholeActive).toBe(`${sstr} ${PARTS.WHOLE} ${STATE.ACTIVE}`);
    expect(wholeInactive).toBe(`${sstr} ${PARTS.WHOLE} ${STATE.INACTIVE}`);
    expect(topDefault).toBe(`${sstr} ${PARTS.TOP} ${STATE.DEFAULT}`);
    expect(mainDefault).toBe(`${sstr} ${PARTS.MAIN} ${STATE.DEFAULT}`);
  });
  test("rule_rule", () => {
    const wholeDefault = rule_rule(PARTS.WHOLE, STATE.DEFAULT);
    const wholeActive = rule_rule(PARTS.WHOLE, STATE.ACTIVE);
    const wholeInactive = rule_rule(PARTS.WHOLE, STATE.INACTIVE);
    const topDefault = rule_rule(PARTS.TOP, STATE.DEFAULT);
    const mainDefault = rule_rule(PARTS.MAIN, STATE.DEFAULT);
    expect(wholeDefault).toBe(`${srule[PARTS.WHOLE]}`);
    expect(wholeActive).toBe(`${srule[PARTS.WHOLE]}`);
    expect(wholeInactive).toBe(`${srule[PARTS.WHOLE]}`);
    expect(topDefault).toBeUndefined();
    expect(mainDefault).toBe(`${srule[PARTS.MAIN]}`);
  });
  test("rule_rules", () => {
    const wholeDefault = rule_rules(PARTS.WHOLE, STATE.DEFAULT);
    const wholeActive = rule_rules(PARTS.WHOLE, STATE.ACTIVE);
    const wholeInactive = rule_rules(PARTS.WHOLE, STATE.INACTIVE);
    const topDefault = rule_rules(PARTS.TOP, STATE.DEFAULT);
    const mainDefault = rule_rules(PARTS.MAIN, STATE.DEFAULT);
    expect(wholeDefault).toBe(`${srules[PARTS.WHOLE][CONST]}`);
    expect(wholeActive).toEqual([srules[PARTS.WHOLE][CONST], srules[PARTS.WHOLE][STATE.ACTIVE]]);
    expect(wholeInactive).toBe(`${srules[PARTS.WHOLE][CONST]}`);
    expect(topDefault).toBeUndefined();
    expect(mainDefault).toBe(`${srules[PARTS.MAIN][CONST]}`);
  });
  test("rule_blank", () => {
    const wholeDefault = rule_blank(PARTS.WHOLE, STATE.DEFAULT);
    const wholeActive = rule_blank(PARTS.WHOLE, STATE.ACTIVE);
    const wholeInactive = rule_blank(PARTS.WHOLE, STATE.INACTIVE);
    const topDefault = rule_blank(PARTS.TOP, STATE.DEFAULT);
    const mainDefault = rule_blank(PARTS.MAIN, STATE.DEFAULT);
    expect(wholeDefault).toBe(`${prule[PARTS.WHOLE]}`);
    expect(wholeActive).toBe(`${prule[PARTS.WHOLE]}`);
    expect(wholeInactive).toBe(`${prule[PARTS.WHOLE]}`);
    expect(topDefault).toBe(`${prule[PARTS.TOP]}`);
    expect(mainDefault).toBeUndefined();
  });
  test("rule_empty", () => {
    const wholeDefault = rule_empty(PARTS.WHOLE, STATE.DEFAULT);
    const wholeActive = rule_empty(PARTS.WHOLE, STATE.ACTIVE);
    const wholeInactive = rule_empty(PARTS.WHOLE, STATE.INACTIVE);
    const topDefault = rule_empty(PARTS.TOP, STATE.DEFAULT);
    const mainDefault = rule_empty(PARTS.MAIN, STATE.DEFAULT);
    expect(wholeDefault).toBe(`${prule[PARTS.WHOLE]}`);
    expect(wholeActive).toBe(`${prule[PARTS.WHOLE]}`);
    expect(wholeInactive).toBe(`${prule[PARTS.WHOLE]}`);
    expect(topDefault).toBe(`${prule[PARTS.TOP]}`);
    expect(mainDefault).toBeUndefined();
  });
  test("rule_undef", () => {
    const wholeDefault = rule_undef(PARTS.WHOLE, STATE.DEFAULT);
    const wholeActive = rule_undef(PARTS.WHOLE, STATE.ACTIVE);
    const wholeInactive = rule_undef(PARTS.WHOLE, STATE.INACTIVE);
    const topDefault = rule_undef(PARTS.TOP, STATE.DEFAULT);
    const mainDefault = rule_undef(PARTS.MAIN, STATE.DEFAULT);
    expect(wholeDefault).toBe(`${prule[PARTS.WHOLE]}`);
    expect(wholeActive).toBe(`${prule[PARTS.WHOLE]}`);
    expect(wholeInactive).toBe(`${prule[PARTS.WHOLE]}`);
    expect(topDefault).toBe(`${prule[PARTS.TOP]}`);
    expect(mainDefault).toBeUndefined();
  });
  test("rules_str", () => {
    const wholeDefault = rules_str(PARTS.WHOLE, STATE.DEFAULT);
    const wholeActive = rules_str(PARTS.WHOLE, STATE.ACTIVE);
    const wholeInactive = rules_str(PARTS.WHOLE, STATE.INACTIVE);
    const topDefault = rules_str(PARTS.TOP, STATE.DEFAULT);
    const mainDefault = rules_str(PARTS.MAIN, STATE.DEFAULT);
    expect(wholeDefault).toBe(`${sstr} ${PARTS.WHOLE} ${STATE.DEFAULT}`);
    expect(wholeActive).toBe(`${sstr} ${PARTS.WHOLE} ${STATE.ACTIVE}`);
    expect(wholeInactive).toBe(`${sstr} ${PARTS.WHOLE} ${STATE.INACTIVE}`);
    expect(topDefault).toBe(`${sstr} ${PARTS.TOP} ${STATE.DEFAULT}`);
    expect(mainDefault).toBe(`${sstr} ${PARTS.MAIN} ${STATE.DEFAULT}`);
  });
  test("rules_rule", () => {
    const wholeDefault = rules_rule(PARTS.WHOLE, STATE.DEFAULT);
    const wholeActive = rules_rule(PARTS.WHOLE, STATE.ACTIVE);
    const wholeInactive = rules_rule(PARTS.WHOLE, STATE.INACTIVE);
    const topDefault = rules_rule(PARTS.TOP, STATE.DEFAULT);
    const mainDefault = rules_rule(PARTS.MAIN, STATE.DEFAULT);
    expect(wholeDefault).toBe(`${srule[PARTS.WHOLE]}`);
    expect(wholeActive).toBe(`${srule[PARTS.WHOLE]}`);
    expect(wholeInactive).toBe(`${srule[PARTS.WHOLE]}`);
    expect(topDefault).toBeUndefined();
    expect(mainDefault).toBe(`${srule[PARTS.MAIN]}`);
  });
  test("rules_rules", () => {
    const wholeDefault = rules_rules(PARTS.WHOLE, STATE.DEFAULT);
    const wholeActive = rules_rules(PARTS.WHOLE, STATE.ACTIVE);
    const wholeInactive = rules_rules(PARTS.WHOLE, STATE.INACTIVE);
    const topDefault = rules_rules(PARTS.TOP, STATE.DEFAULT);
    const mainDefault = rules_rules(PARTS.MAIN, STATE.DEFAULT);
    expect(wholeDefault).toBe(`${srules[PARTS.WHOLE][CONST]}`);
    expect(wholeActive).toEqual([srules[PARTS.WHOLE][CONST], srules[PARTS.WHOLE][STATE.ACTIVE]]);
    expect(wholeInactive).toBe(`${srules[PARTS.WHOLE][CONST]}`);
    expect(topDefault).toBeUndefined();
    expect(mainDefault).toBe(`${srules[PARTS.MAIN][CONST]}`);
  });
  test("rules_blank", () => {
    const wholeDefault = rules_blank(PARTS.WHOLE, STATE.DEFAULT);
    const wholeActive = rules_blank(PARTS.WHOLE, STATE.ACTIVE);
    const wholeInactive = rules_blank(PARTS.WHOLE, STATE.INACTIVE);
    const topDefault = rules_blank(PARTS.TOP, STATE.DEFAULT);
    const mainDefault = rules_blank(PARTS.MAIN, STATE.DEFAULT);
    expect(wholeDefault).toEqual([prules[PARTS.WHOLE][CONST], prules[PARTS.WHOLE][STATE.DEFAULT]]);
    expect(wholeActive).toEqual([prules[PARTS.WHOLE][CONST], prules[PARTS.WHOLE][STATE.DEFAULT]]);
    expect(wholeInactive).toEqual([prules[PARTS.WHOLE][CONST], prules[PARTS.WHOLE][STATE.DEFAULT]]);
    expect(topDefault).toBe(`${prules[PARTS.TOP][STATE.DEFAULT]}`);
    expect(mainDefault).toBeUndefined();
  });
  test("rules_empty", () => {
    const wholeDefault = rules_empty(PARTS.WHOLE, STATE.DEFAULT);
    const wholeActive = rules_empty(PARTS.WHOLE, STATE.ACTIVE);
    const wholeInactive = rules_empty(PARTS.WHOLE, STATE.INACTIVE);
    const topDefault = rules_empty(PARTS.TOP, STATE.DEFAULT);
    const mainDefault = rules_empty(PARTS.MAIN, STATE.DEFAULT);
    expect(wholeDefault).toEqual([prules[PARTS.WHOLE][CONST], prules[PARTS.WHOLE][STATE.DEFAULT]]);
    expect(wholeActive).toEqual([prules[PARTS.WHOLE][CONST], prules[PARTS.WHOLE][STATE.DEFAULT]]);
    expect(wholeInactive).toEqual([prules[PARTS.WHOLE][CONST], prules[PARTS.WHOLE][STATE.DEFAULT]]);
    expect(topDefault).toBe(`${prules[PARTS.TOP][STATE.DEFAULT]}`);
    expect(mainDefault).toBeUndefined();
  });
  test("rules_undef", () => {
    const wholeDefault = rules_undef(PARTS.WHOLE, STATE.DEFAULT);
    const wholeActive = rules_undef(PARTS.WHOLE, STATE.ACTIVE);
    const wholeInactive = rules_undef(PARTS.WHOLE, STATE.INACTIVE);
    const topDefault = rules_undef(PARTS.TOP, STATE.DEFAULT);
    const mainDefault = rules_undef(PARTS.MAIN, STATE.DEFAULT);
    expect(wholeDefault).toEqual([prules[PARTS.WHOLE][CONST], prules[PARTS.WHOLE][STATE.DEFAULT]]);
    expect(wholeActive).toEqual([prules[PARTS.WHOLE][CONST], prules[PARTS.WHOLE][STATE.DEFAULT]]);
    expect(wholeInactive).toEqual([prules[PARTS.WHOLE][CONST], prules[PARTS.WHOLE][STATE.DEFAULT]]);
    expect(topDefault).toBe(`${prules[PARTS.TOP][STATE.DEFAULT]}`);
    expect(mainDefault).toBeUndefined();
  });
  test("blank_str", () => {
    const wholeDefault = blank_str(PARTS.WHOLE, STATE.DEFAULT);
    const wholeActive = blank_str(PARTS.WHOLE, STATE.ACTIVE);
    const wholeInactive = blank_str(PARTS.WHOLE, STATE.INACTIVE);
    const topDefault = blank_str(PARTS.TOP, STATE.DEFAULT);
    const mainDefault = blank_str(PARTS.MAIN, STATE.DEFAULT);
    expect(wholeDefault).toBe(`${sstr} ${PARTS.WHOLE} ${STATE.DEFAULT}`);
    expect(wholeActive).toBe(`${sstr} ${PARTS.WHOLE} ${STATE.ACTIVE}`);
    expect(wholeInactive).toBe(`${sstr} ${PARTS.WHOLE} ${STATE.INACTIVE}`);
    expect(topDefault).toBe(`${sstr} ${PARTS.TOP} ${STATE.DEFAULT}`);
    expect(mainDefault).toBe(`${sstr} ${PARTS.MAIN} ${STATE.DEFAULT}`);
  });
  test("blank_rule", () => {
    const wholeDefault = blank_rule(PARTS.WHOLE, STATE.DEFAULT);
    const wholeActive = blank_rule(PARTS.WHOLE, STATE.ACTIVE);
    const wholeInactive = blank_rule(PARTS.WHOLE, STATE.INACTIVE);
    const topDefault = blank_rule(PARTS.TOP, STATE.DEFAULT);
    const mainDefault = blank_rule(PARTS.MAIN, STATE.DEFAULT);
    expect(wholeDefault).toBe(`${srule[PARTS.WHOLE]}`);
    expect(wholeActive).toBe(`${srule[PARTS.WHOLE]}`);
    expect(wholeInactive).toBe(`${srule[PARTS.WHOLE]}`);
    expect(topDefault).toBeUndefined();
    expect(mainDefault).toBe(`${srule[PARTS.MAIN]}`);
  });
  test("blank_rules", () => {
    const wholeDefault = blank_rules(PARTS.WHOLE, STATE.DEFAULT);
    const wholeActive = blank_rules(PARTS.WHOLE, STATE.ACTIVE);
    const wholeInactive = blank_rules(PARTS.WHOLE, STATE.INACTIVE);
    const topDefault = blank_rules(PARTS.TOP, STATE.DEFAULT);
    const mainDefault = blank_rules(PARTS.MAIN, STATE.DEFAULT);
    expect(wholeDefault).toBe(`${srules[PARTS.WHOLE][CONST]}`);
    expect(wholeActive).toEqual([srules[PARTS.WHOLE][CONST], srules[PARTS.WHOLE][STATE.ACTIVE]]);
    expect(wholeInactive).toBe(`${srules[PARTS.WHOLE][CONST]}`);
    expect(topDefault).toBeUndefined();
    expect(mainDefault).toBe(`${srules[PARTS.MAIN][CONST]}`);
  });
  test("blank_blank", () => {
    const wholeDefault = blank_blank(PARTS.WHOLE, STATE.DEFAULT);
    const wholeActive = blank_blank(PARTS.WHOLE, STATE.ACTIVE);
    const wholeInactive = blank_blank(PARTS.WHOLE, STATE.INACTIVE);
    const topDefault = blank_blank(PARTS.TOP, STATE.DEFAULT);
    const mainDefault = blank_blank(PARTS.MAIN, STATE.DEFAULT);
    expect(wholeDefault).toBeUndefined();
    expect(wholeActive).toBeUndefined();
    expect(wholeInactive).toBeUndefined();
    expect(topDefault).toBeUndefined();
    expect(mainDefault).toBeUndefined();
  });
  test("blank_empty", () => {
    const wholeDefault = blank_empty(PARTS.WHOLE, STATE.DEFAULT);
    const wholeActive = blank_empty(PARTS.WHOLE, STATE.ACTIVE);
    const wholeInactive = blank_empty(PARTS.WHOLE, STATE.INACTIVE);
    const topDefault = blank_empty(PARTS.TOP, STATE.DEFAULT);
    const mainDefault = blank_empty(PARTS.MAIN, STATE.DEFAULT);
    expect(wholeDefault).toBeUndefined();
    expect(wholeActive).toBeUndefined();
    expect(wholeInactive).toBeUndefined();
    expect(topDefault).toBeUndefined();
    expect(mainDefault).toBeUndefined();
  });
  test("blank_undef", () => {
    const wholeDefault = blank_undef(PARTS.WHOLE, STATE.DEFAULT);
    const wholeActive = blank_undef(PARTS.WHOLE, STATE.ACTIVE);
    const wholeInactive = blank_undef(PARTS.WHOLE, STATE.INACTIVE);
    const topDefault = blank_undef(PARTS.TOP, STATE.DEFAULT);
    const mainDefault = blank_undef(PARTS.MAIN, STATE.DEFAULT);
    expect(wholeDefault).toBeUndefined();
    expect(wholeActive).toBeUndefined();
    expect(wholeInactive).toBeUndefined();
    expect(topDefault).toBeUndefined();
    expect(mainDefault).toBeUndefined();
  });
  test("empty_str", () => {
    const wholeDefault = empty_str(PARTS.WHOLE, STATE.DEFAULT);
    const wholeActive = empty_str(PARTS.WHOLE, STATE.ACTIVE);
    const wholeInactive = empty_str(PARTS.WHOLE, STATE.INACTIVE);
    const topDefault = empty_str(PARTS.TOP, STATE.DEFAULT);
    const mainDefault = empty_str(PARTS.MAIN, STATE.DEFAULT);
    expect(wholeDefault).toBe(`${sstr} ${PARTS.WHOLE} ${STATE.DEFAULT}`);
    expect(wholeActive).toBe(`${sstr} ${PARTS.WHOLE} ${STATE.ACTIVE}`);
    expect(wholeInactive).toBe(`${sstr} ${PARTS.WHOLE} ${STATE.INACTIVE}`);
    expect(topDefault).toBe(`${sstr} ${PARTS.TOP} ${STATE.DEFAULT}`);
    expect(mainDefault).toBe(`${sstr} ${PARTS.MAIN} ${STATE.DEFAULT}`);
  });
  test("empty_rule", () => {
    const wholeDefault = empty_rule(PARTS.WHOLE, STATE.DEFAULT);
    const wholeActive = empty_rule(PARTS.WHOLE, STATE.ACTIVE);
    const wholeInactive = empty_rule(PARTS.WHOLE, STATE.INACTIVE);
    const topDefault = empty_rule(PARTS.TOP, STATE.DEFAULT);
    const mainDefault = empty_rule(PARTS.MAIN, STATE.DEFAULT);
    expect(wholeDefault).toBe(`${srule[PARTS.WHOLE]}`);
    expect(wholeActive).toBe(`${srule[PARTS.WHOLE]}`);
    expect(wholeInactive).toBe(`${srule[PARTS.WHOLE]}`);
    expect(topDefault).toBeUndefined();
    expect(mainDefault).toBe(`${srule[PARTS.MAIN]}`);
  });
  test("empty_rules", () => {
    const wholeDefault = empty_rules(PARTS.WHOLE, STATE.DEFAULT);
    const wholeActive = empty_rules(PARTS.WHOLE, STATE.ACTIVE);
    const wholeInactive = empty_rules(PARTS.WHOLE, STATE.INACTIVE);
    const topDefault = empty_rules(PARTS.TOP, STATE.DEFAULT);
    const mainDefault = empty_rules(PARTS.MAIN, STATE.DEFAULT);
    expect(wholeDefault).toBe(`${srules[PARTS.WHOLE][CONST]}`);
    expect(wholeActive).toEqual([srules[PARTS.WHOLE][CONST], srules[PARTS.WHOLE][STATE.ACTIVE]]);
    expect(wholeInactive).toBe(`${srules[PARTS.WHOLE][CONST]}`);
    expect(topDefault).toBeUndefined();
    expect(mainDefault).toBe(`${srules[PARTS.MAIN][CONST]}`);
  });
  test("empty_blank", () => {
    const wholeDefault = empty_blank(PARTS.WHOLE, STATE.DEFAULT);
    const wholeActive = empty_blank(PARTS.WHOLE, STATE.ACTIVE);
    const wholeInactive = empty_blank(PARTS.WHOLE, STATE.INACTIVE);
    const topDefault = empty_blank(PARTS.TOP, STATE.DEFAULT);
    const mainDefault = empty_blank(PARTS.MAIN, STATE.DEFAULT);
    expect(wholeDefault).toBeUndefined();
    expect(wholeActive).toBeUndefined();
    expect(wholeInactive).toBeUndefined();
    expect(topDefault).toBeUndefined();
    expect(mainDefault).toBeUndefined();
  });
  test("empty_empty", () => {
    const wholeDefault = empty_empty(PARTS.WHOLE, STATE.DEFAULT);
    const wholeActive = empty_empty(PARTS.WHOLE, STATE.ACTIVE);
    const wholeInactive = empty_empty(PARTS.WHOLE, STATE.INACTIVE);
    const topDefault = empty_empty(PARTS.TOP, STATE.DEFAULT);
    const mainDefault = empty_empty(PARTS.MAIN, STATE.DEFAULT);
    expect(wholeDefault).toBeUndefined();
    expect(wholeActive).toBeUndefined();
    expect(wholeInactive).toBeUndefined();
    expect(topDefault).toBeUndefined();
    expect(mainDefault).toBeUndefined();
  });
  test("empty_undef", () => {
    const wholeDefault = empty_undef(PARTS.WHOLE, STATE.DEFAULT);
    const wholeActive = empty_undef(PARTS.WHOLE, STATE.ACTIVE);
    const wholeInactive = empty_undef(PARTS.WHOLE, STATE.INACTIVE);
    const topDefault = empty_undef(PARTS.TOP, STATE.DEFAULT);
    const mainDefault = empty_undef(PARTS.MAIN, STATE.DEFAULT);
    expect(wholeDefault).toBeUndefined();
    expect(wholeActive).toBeUndefined();
    expect(wholeInactive).toBeUndefined();
    expect(topDefault).toBeUndefined();
    expect(mainDefault).toBeUndefined();
  });

  // test("noPresetWithStyle", () => {
  //   const wholeDefault = noPresetWithStyle(PARTS.WHOLE, STATE.DEFAULT);
  //   const wholeActive = noPresetWithStyle(PARTS.WHOLE, STATE.ACTIVE);
  //   const wholeInactive = noPresetWithStyle(PARTS.WHOLE, STATE.INACTIVE);
  //   const topDefault = noPresetWithStyle(PARTS.TOP, STATE.DEFAULT);
  //   const mainDefault = noPresetWithStyle(PARTS.MAIN, STATE.DEFAULT);
  //   expect(wholeDefault).toBe(`${style.whole?.const}`);
  //   expect(wholeActive).toBe(`${style.whole?.const} ${style.whole?.active}`);
  //   expect(wholeInactive).toBe(`${style.whole?.const}`);
  //   expect(topDefault).toBeUndefined();
  //   expect(mainDefault).toBe(`${style.main?.const}`);
  // });
  // test("noPresetEmptyStyle", () => {
  //   const wholeDefault = noPresetEmptyStyle(PARTS.WHOLE, STATE.DEFAULT);
  //   const wholeActive = noPresetEmptyStyle(PARTS.WHOLE, STATE.ACTIVE);
  //   const wholeInactive = noPresetEmptyStyle(PARTS.WHOLE, STATE.INACTIVE);
  //   const topDefault = noPresetEmptyStyle(PARTS.TOP, STATE.DEFAULT);
  //   const mainDefault = noPresetEmptyStyle(PARTS.MAIN, STATE.DEFAULT);
  //   expect(wholeDefault).toBe(`${name} ${PARTS.WHOLE}`);
  //   expect(wholeActive).toBe(`${name} ${PARTS.WHOLE} ${STATE.ACTIVE}`);
  //   expect(wholeInactive).toBe(`${name} ${PARTS.WHOLE} ${STATE.INACTIVE}`);
  //   expect(topDefault).toBe(`${name} ${PARTS.TOP}`);
  //   expect(mainDefault).toBe(`${name} ${PARTS.MAIN}`);
  // });
  // test("noPresetStrStyle", () => {
  //   const wholeDefault = noPresetStrStyle(PARTS.WHOLE, STATE.DEFAULT);
  //   const wholeActive = noPresetStrStyle(PARTS.WHOLE, STATE.ACTIVE);
  //   const wholeInactive = noPresetStrStyle(PARTS.WHOLE, STATE.INACTIVE);
  //   const topDefault = noPresetStrStyle(PARTS.TOP, STATE.DEFAULT);
  //   const mainDefault = noPresetStrStyle(PARTS.MAIN, STATE.DEFAULT);
  //   expect(wholeDefault).toBe(`${strStyle} ${PARTS.WHOLE}`);
  //   expect(wholeActive).toBe(`${strStyle} ${PARTS.WHOLE} ${STATE.ACTIVE}`);
  //   expect(wholeInactive).toBe(`${strStyle} ${PARTS.WHOLE} ${STATE.INACTIVE}`);
  //   expect(topDefault).toBe(`${strStyle} ${PARTS.TOP}`);
  //   expect(mainDefault).toBe(`${strStyle} ${PARTS.MAIN}`);
  // });
  // test("withPresetNoStyle", () => {
  //   const wholeDefault = withPresetNoStyle(PARTS.WHOLE, STATE.DEFAULT);
  //   const wholeActive = withPresetNoStyle(PARTS.WHOLE, STATE.ACTIVE);
  //   const wholeInactive = withPresetNoStyle(PARTS.WHOLE, STATE.INACTIVE);
  //   const topDefault = withPresetNoStyle(PARTS.TOP, STATE.DEFAULT);
  //   const mainDefault = withPresetNoStyle(PARTS.MAIN, STATE.DEFAULT);
  //   expect(wholeDefault).toBe(`${preset.whole?.const} ${preset.whole?.default}`);
  //   expect(wholeActive).toBe(`${preset.whole?.const} ${preset.whole?.default}`);
  //   expect(wholeInactive).toBe(`${preset.whole?.const} ${preset.whole?.default}`);
  //   expect(topDefault).toBe(`${preset.top?.default}`);
  //   expect(mainDefault).toBeUndefined();
  // });
  // test("withPresetWithStyle", () => {
  //   const wholeDefault = withPresetWithStyle(PARTS.WHOLE, STATE.DEFAULT);
  //   const wholeActive = withPresetWithStyle(PARTS.WHOLE, STATE.ACTIVE);
  //   const wholeInactive = withPresetWithStyle(PARTS.WHOLE, STATE.INACTIVE);
  //   const topDefault = withPresetWithStyle(PARTS.TOP, STATE.DEFAULT);
  //   const mainDefault = withPresetWithStyle(PARTS.MAIN, STATE.DEFAULT);
  //   expect(wholeDefault).toBe(`${style.whole?.const} ${preset.whole?.default}`);
  //   expect(wholeActive).toBe(`${style.whole?.const} ${style.whole?.active}`);
  //   expect(wholeInactive).toBe(`${style.whole?.const} ${preset.whole?.default}`);
  //   expect(topDefault).toBe(`${preset.top?.default}`);
  //   expect(mainDefault).toBe(`${style.main?.const}`);
  // });
  // test("withPresetEmptyStyle", () => {
  //   const wholeDefault = withPresetEmptyStyle(PARTS.WHOLE, STATE.DEFAULT);
  //   const wholeActive = withPresetEmptyStyle(PARTS.WHOLE, STATE.ACTIVE);
  //   const wholeInactive = withPresetEmptyStyle(PARTS.WHOLE, STATE.INACTIVE);
  //   const topDefault = withPresetEmptyStyle(PARTS.TOP, STATE.DEFAULT);
  //   const mainDefault = withPresetEmptyStyle(PARTS.MAIN, STATE.DEFAULT);
  //   expect(wholeDefault).toBe(`${name} ${PARTS.WHOLE}`);
  //   expect(wholeActive).toBe(`${name} ${PARTS.WHOLE} ${STATE.ACTIVE}`);
  //   expect(wholeInactive).toBe(`${name} ${PARTS.WHOLE} ${STATE.INACTIVE}`);
  //   expect(topDefault).toBe(`${name} ${PARTS.TOP}`);
  //   expect(mainDefault).toBe(`${name} ${PARTS.MAIN}`);
  // });
  // test("withPresetStrStyle", () => {
  //   const wholeDefault = withPresetStrStyle(PARTS.WHOLE, STATE.DEFAULT);
  //   const wholeActive = withPresetStrStyle(PARTS.WHOLE, STATE.ACTIVE);
  //   const wholeInactive = withPresetStrStyle(PARTS.WHOLE, STATE.INACTIVE);
  //   const topDefault = withPresetStrStyle(PARTS.TOP, STATE.DEFAULT);
  //   const mainDefault = withPresetStrStyle(PARTS.MAIN, STATE.DEFAULT);
  //   expect(wholeDefault).toBe(`${strStyle} ${PARTS.WHOLE}`);
  //   expect(wholeActive).toBe(`${strStyle} ${PARTS.WHOLE} ${STATE.ACTIVE}`);
  //   expect(wholeInactive).toBe(`${strStyle} ${PARTS.WHOLE} ${STATE.INACTIVE}`);
  //   expect(topDefault).toBe(`${strStyle} ${PARTS.TOP}`);
  //   expect(mainDefault).toBe(`${strStyle} ${PARTS.MAIN}`);
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
