import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { AREA, CONST, debounce, elemId, fnClass, omit, STATE, type SVSStyle, throttle, UniqueId } from "../lib/_svseeds/core.ts";

describe("const vars", () => {
  test("STATE", () => {
    expect(STATE).toEqual({
      DEFAULT: "default",
      ACTIVE: "active",
      INACTIVE: "inactive",
    });
    expect(Object.isFrozen(STATE)).toBe(true);
  });
  test("AREA", () => {
    expect(AREA).toEqual({
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
    expect(Object.isFrozen(AREA)).toBe(true);
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
    expect(id).toMatch(/^[a-yA-Y]{4}$/);
  });
});

describe("fnClass", () => {
  const pstr = "preset-str";
  const sstr = "style-str";
  const prule = {
    [AREA.WHOLE]: "preset-rule-w",
    [AREA.TOP]: "preset-rule-t",
  };
  const srule = {
    [AREA.WHOLE]: "style-rule-w",
    [AREA.MAIN]: "style-rule-m",
  };
  const prules = {
    [AREA.WHOLE]: {
      [CONST]: "preset-rules-wc",
      [STATE.DEFAULT]: "preset-rules-wd",
    },
    [AREA.TOP]: {
      [STATE.DEFAULT]: "preset-rules-tc",
      [STATE.INACTIVE]: "preset-rules-ti",
    },
  };
  const srules = {
    [AREA.WHOLE]: {
      [CONST]: "style-rules-wc",
      [STATE.ACTIVE]: "style-rules-wa",
    },
    [AREA.MAIN]: {
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
    const wholeDefault = str_str(AREA.WHOLE, STATE.DEFAULT);
    const wholeActive = str_str(AREA.WHOLE, STATE.ACTIVE);
    const wholeInactive = str_str(AREA.WHOLE, STATE.INACTIVE);
    const topDefault = str_str(AREA.TOP, STATE.DEFAULT);
    const mainDefault = str_str(AREA.MAIN, STATE.DEFAULT);
    expect(wholeDefault).toBe(`${sstr} ${AREA.WHOLE} ${STATE.DEFAULT}`);
    expect(wholeActive).toBe(`${sstr} ${AREA.WHOLE} ${STATE.ACTIVE}`);
    expect(wholeInactive).toBe(`${sstr} ${AREA.WHOLE} ${STATE.INACTIVE}`);
    expect(topDefault).toBe(`${sstr} ${AREA.TOP} ${STATE.DEFAULT}`);
    expect(mainDefault).toBe(`${sstr} ${AREA.MAIN} ${STATE.DEFAULT}`);
  });
  test("str_rule", () => {
    const wholeDefault = str_rule(AREA.WHOLE, STATE.DEFAULT);
    const wholeActive = str_rule(AREA.WHOLE, STATE.ACTIVE);
    const wholeInactive = str_rule(AREA.WHOLE, STATE.INACTIVE);
    const topDefault = str_rule(AREA.TOP, STATE.DEFAULT);
    const mainDefault = str_rule(AREA.MAIN, STATE.DEFAULT);
    expect(wholeDefault).toBe(`${srule[AREA.WHOLE]}`);
    expect(wholeActive).toBe(`${srule[AREA.WHOLE]}`);
    expect(wholeInactive).toBe(`${srule[AREA.WHOLE]}`);
    expect(topDefault).toBeUndefined();
    expect(mainDefault).toBe(`${srule[AREA.MAIN]}`);
  });
  test("str_rules", () => {
    const wholeDefault = str_rules(AREA.WHOLE, STATE.DEFAULT);
    const wholeActive = str_rules(AREA.WHOLE, STATE.ACTIVE);
    const wholeInactive = str_rules(AREA.WHOLE, STATE.INACTIVE);
    const topDefault = str_rules(AREA.TOP, STATE.DEFAULT);
    const mainDefault = str_rules(AREA.MAIN, STATE.DEFAULT);
    expect(wholeDefault).toBe(`${srules[AREA.WHOLE][CONST]}`);
    expect(wholeActive).toBe(`${srules[AREA.WHOLE][CONST]} ${srules[AREA.WHOLE][STATE.ACTIVE]}`);
    expect(wholeInactive).toBe(`${srules[AREA.WHOLE][CONST]}`);
    expect(topDefault).toBeUndefined();
    expect(mainDefault).toBe(`${srules[AREA.MAIN][CONST]}`);
  });
  test("str_blank", () => {
    const wholeDefault = str_blank(AREA.WHOLE, STATE.DEFAULT);
    const wholeActive = str_blank(AREA.WHOLE, STATE.ACTIVE);
    const wholeInactive = str_blank(AREA.WHOLE, STATE.INACTIVE);
    const topDefault = str_blank(AREA.TOP, STATE.DEFAULT);
    const mainDefault = str_blank(AREA.MAIN, STATE.DEFAULT);
    expect(wholeDefault).toBe(`${pstr} ${AREA.WHOLE} ${STATE.DEFAULT}`);
    expect(wholeActive).toBe(`${pstr} ${AREA.WHOLE} ${STATE.ACTIVE}`);
    expect(wholeInactive).toBe(`${pstr} ${AREA.WHOLE} ${STATE.INACTIVE}`);
    expect(topDefault).toBe(`${pstr} ${AREA.TOP} ${STATE.DEFAULT}`);
    expect(mainDefault).toBe(`${pstr} ${AREA.MAIN} ${STATE.DEFAULT}`);
  });
  test("str_empty", () => {
    const wholeDefault = str_empty(AREA.WHOLE, STATE.DEFAULT);
    const wholeActive = str_empty(AREA.WHOLE, STATE.ACTIVE);
    const wholeInactive = str_empty(AREA.WHOLE, STATE.INACTIVE);
    const topDefault = str_empty(AREA.TOP, STATE.DEFAULT);
    const mainDefault = str_empty(AREA.MAIN, STATE.DEFAULT);
    expect(wholeDefault).toBe(`${pstr} ${AREA.WHOLE} ${STATE.DEFAULT}`);
    expect(wholeActive).toBe(`${pstr} ${AREA.WHOLE} ${STATE.ACTIVE}`);
    expect(wholeInactive).toBe(`${pstr} ${AREA.WHOLE} ${STATE.INACTIVE}`);
    expect(topDefault).toBe(`${pstr} ${AREA.TOP} ${STATE.DEFAULT}`);
    expect(mainDefault).toBe(`${pstr} ${AREA.MAIN} ${STATE.DEFAULT}`);
  });
  test("str_undef", () => {
    const wholeDefault = str_undef(AREA.WHOLE, STATE.DEFAULT);
    const wholeActive = str_undef(AREA.WHOLE, STATE.ACTIVE);
    const wholeInactive = str_undef(AREA.WHOLE, STATE.INACTIVE);
    const topDefault = str_undef(AREA.TOP, STATE.DEFAULT);
    const mainDefault = str_undef(AREA.MAIN, STATE.DEFAULT);
    expect(wholeDefault).toBe(`${pstr} ${AREA.WHOLE} ${STATE.DEFAULT}`);
    expect(wholeActive).toBe(`${pstr} ${AREA.WHOLE} ${STATE.ACTIVE}`);
    expect(wholeInactive).toBe(`${pstr} ${AREA.WHOLE} ${STATE.INACTIVE}`);
    expect(topDefault).toBe(`${pstr} ${AREA.TOP} ${STATE.DEFAULT}`);
    expect(mainDefault).toBe(`${pstr} ${AREA.MAIN} ${STATE.DEFAULT}`);
  });
  test("rule_str", () => {
    const wholeDefault = rule_str(AREA.WHOLE, STATE.DEFAULT);
    const wholeActive = rule_str(AREA.WHOLE, STATE.ACTIVE);
    const wholeInactive = rule_str(AREA.WHOLE, STATE.INACTIVE);
    const topDefault = rule_str(AREA.TOP, STATE.DEFAULT);
    const mainDefault = rule_str(AREA.MAIN, STATE.DEFAULT);
    expect(wholeDefault).toBe(`${sstr} ${AREA.WHOLE} ${STATE.DEFAULT}`);
    expect(wholeActive).toBe(`${sstr} ${AREA.WHOLE} ${STATE.ACTIVE}`);
    expect(wholeInactive).toBe(`${sstr} ${AREA.WHOLE} ${STATE.INACTIVE}`);
    expect(topDefault).toBe(`${sstr} ${AREA.TOP} ${STATE.DEFAULT}`);
    expect(mainDefault).toBe(`${sstr} ${AREA.MAIN} ${STATE.DEFAULT}`);
  });
  test("rule_rule", () => {
    const wholeDefault = rule_rule(AREA.WHOLE, STATE.DEFAULT);
    const wholeActive = rule_rule(AREA.WHOLE, STATE.ACTIVE);
    const wholeInactive = rule_rule(AREA.WHOLE, STATE.INACTIVE);
    const topDefault = rule_rule(AREA.TOP, STATE.DEFAULT);
    const mainDefault = rule_rule(AREA.MAIN, STATE.DEFAULT);
    expect(wholeDefault).toBe(`${srule[AREA.WHOLE]}`);
    expect(wholeActive).toBe(`${srule[AREA.WHOLE]}`);
    expect(wholeInactive).toBe(`${srule[AREA.WHOLE]}`);
    expect(topDefault).toBeUndefined();
    expect(mainDefault).toBe(`${srule[AREA.MAIN]}`);
  });
  test("rule_rules", () => {
    const wholeDefault = rule_rules(AREA.WHOLE, STATE.DEFAULT);
    const wholeActive = rule_rules(AREA.WHOLE, STATE.ACTIVE);
    const wholeInactive = rule_rules(AREA.WHOLE, STATE.INACTIVE);
    const topDefault = rule_rules(AREA.TOP, STATE.DEFAULT);
    const mainDefault = rule_rules(AREA.MAIN, STATE.DEFAULT);
    expect(wholeDefault).toBe(`${srules[AREA.WHOLE][CONST]}`);
    expect(wholeActive).toBe(`${srules[AREA.WHOLE][CONST]} ${srules[AREA.WHOLE][STATE.ACTIVE]}`);
    expect(wholeInactive).toBe(`${srules[AREA.WHOLE][CONST]}`);
    expect(topDefault).toBeUndefined();
    expect(mainDefault).toBe(`${srules[AREA.MAIN][CONST]}`);
  });
  test("rule_blank", () => {
    const wholeDefault = rule_blank(AREA.WHOLE, STATE.DEFAULT);
    const wholeActive = rule_blank(AREA.WHOLE, STATE.ACTIVE);
    const wholeInactive = rule_blank(AREA.WHOLE, STATE.INACTIVE);
    const topDefault = rule_blank(AREA.TOP, STATE.DEFAULT);
    const mainDefault = rule_blank(AREA.MAIN, STATE.DEFAULT);
    expect(wholeDefault).toBe(`${prule[AREA.WHOLE]}`);
    expect(wholeActive).toBe(`${prule[AREA.WHOLE]}`);
    expect(wholeInactive).toBe(`${prule[AREA.WHOLE]}`);
    expect(topDefault).toBe(`${prule[AREA.TOP]}`);
    expect(mainDefault).toBeUndefined();
  });
  test("rule_empty", () => {
    const wholeDefault = rule_empty(AREA.WHOLE, STATE.DEFAULT);
    const wholeActive = rule_empty(AREA.WHOLE, STATE.ACTIVE);
    const wholeInactive = rule_empty(AREA.WHOLE, STATE.INACTIVE);
    const topDefault = rule_empty(AREA.TOP, STATE.DEFAULT);
    const mainDefault = rule_empty(AREA.MAIN, STATE.DEFAULT);
    expect(wholeDefault).toBe(`${prule[AREA.WHOLE]}`);
    expect(wholeActive).toBe(`${prule[AREA.WHOLE]}`);
    expect(wholeInactive).toBe(`${prule[AREA.WHOLE]}`);
    expect(topDefault).toBe(`${prule[AREA.TOP]}`);
    expect(mainDefault).toBeUndefined();
  });
  test("rule_undef", () => {
    const wholeDefault = rule_undef(AREA.WHOLE, STATE.DEFAULT);
    const wholeActive = rule_undef(AREA.WHOLE, STATE.ACTIVE);
    const wholeInactive = rule_undef(AREA.WHOLE, STATE.INACTIVE);
    const topDefault = rule_undef(AREA.TOP, STATE.DEFAULT);
    const mainDefault = rule_undef(AREA.MAIN, STATE.DEFAULT);
    expect(wholeDefault).toBe(`${prule[AREA.WHOLE]}`);
    expect(wholeActive).toBe(`${prule[AREA.WHOLE]}`);
    expect(wholeInactive).toBe(`${prule[AREA.WHOLE]}`);
    expect(topDefault).toBe(`${prule[AREA.TOP]}`);
    expect(mainDefault).toBeUndefined();
  });
  test("rules_str", () => {
    const wholeDefault = rules_str(AREA.WHOLE, STATE.DEFAULT);
    const wholeActive = rules_str(AREA.WHOLE, STATE.ACTIVE);
    const wholeInactive = rules_str(AREA.WHOLE, STATE.INACTIVE);
    const topDefault = rules_str(AREA.TOP, STATE.DEFAULT);
    const mainDefault = rules_str(AREA.MAIN, STATE.DEFAULT);
    expect(wholeDefault).toBe(`${sstr} ${AREA.WHOLE} ${STATE.DEFAULT}`);
    expect(wholeActive).toBe(`${sstr} ${AREA.WHOLE} ${STATE.ACTIVE}`);
    expect(wholeInactive).toBe(`${sstr} ${AREA.WHOLE} ${STATE.INACTIVE}`);
    expect(topDefault).toBe(`${sstr} ${AREA.TOP} ${STATE.DEFAULT}`);
    expect(mainDefault).toBe(`${sstr} ${AREA.MAIN} ${STATE.DEFAULT}`);
  });
  test("rules_rule", () => {
    const wholeDefault = rules_rule(AREA.WHOLE, STATE.DEFAULT);
    const wholeActive = rules_rule(AREA.WHOLE, STATE.ACTIVE);
    const wholeInactive = rules_rule(AREA.WHOLE, STATE.INACTIVE);
    const topDefault = rules_rule(AREA.TOP, STATE.DEFAULT);
    const mainDefault = rules_rule(AREA.MAIN, STATE.DEFAULT);
    expect(wholeDefault).toBe(`${srule[AREA.WHOLE]}`);
    expect(wholeActive).toBe(`${srule[AREA.WHOLE]}`);
    expect(wholeInactive).toBe(`${srule[AREA.WHOLE]}`);
    expect(topDefault).toBeUndefined();
    expect(mainDefault).toBe(`${srule[AREA.MAIN]}`);
  });
  test("rules_rules", () => {
    const wholeDefault = rules_rules(AREA.WHOLE, STATE.DEFAULT);
    const wholeActive = rules_rules(AREA.WHOLE, STATE.ACTIVE);
    const wholeInactive = rules_rules(AREA.WHOLE, STATE.INACTIVE);
    const topDefault = rules_rules(AREA.TOP, STATE.DEFAULT);
    const mainDefault = rules_rules(AREA.MAIN, STATE.DEFAULT);
    expect(wholeDefault).toBe(`${srules[AREA.WHOLE][CONST]}`);
    expect(wholeActive).toBe(`${srules[AREA.WHOLE][CONST]} ${srules[AREA.WHOLE][STATE.ACTIVE]}`);
    expect(wholeInactive).toBe(`${srules[AREA.WHOLE][CONST]}`);
    expect(topDefault).toBeUndefined();
    expect(mainDefault).toBe(`${srules[AREA.MAIN][CONST]}`);
  });
  test("rules_blank", () => {
    const wholeDefault = rules_blank(AREA.WHOLE, STATE.DEFAULT);
    const wholeActive = rules_blank(AREA.WHOLE, STATE.ACTIVE);
    const wholeInactive = rules_blank(AREA.WHOLE, STATE.INACTIVE);
    const topDefault = rules_blank(AREA.TOP, STATE.DEFAULT);
    const mainDefault = rules_blank(AREA.MAIN, STATE.DEFAULT);
    expect(wholeDefault).toBe(`${prules[AREA.WHOLE][CONST]} ${prules[AREA.WHOLE][STATE.DEFAULT]}`);
    expect(wholeActive).toBe(`${prules[AREA.WHOLE][CONST]} ${prules[AREA.WHOLE][STATE.DEFAULT]}`);
    expect(wholeInactive).toBe(`${prules[AREA.WHOLE][CONST]} ${prules[AREA.WHOLE][STATE.DEFAULT]}`);
    expect(topDefault).toBe(`${prules[AREA.TOP][STATE.DEFAULT]}`);
    expect(mainDefault).toBeUndefined();
  });
  test("rules_empty", () => {
    const wholeDefault = rules_empty(AREA.WHOLE, STATE.DEFAULT);
    const wholeActive = rules_empty(AREA.WHOLE, STATE.ACTIVE);
    const wholeInactive = rules_empty(AREA.WHOLE, STATE.INACTIVE);
    const topDefault = rules_empty(AREA.TOP, STATE.DEFAULT);
    const mainDefault = rules_empty(AREA.MAIN, STATE.DEFAULT);
    expect(wholeDefault).toBe(`${prules[AREA.WHOLE][CONST]} ${prules[AREA.WHOLE][STATE.DEFAULT]}`);
    expect(wholeActive).toBe(`${prules[AREA.WHOLE][CONST]} ${prules[AREA.WHOLE][STATE.DEFAULT]}`);
    expect(wholeInactive).toBe(`${prules[AREA.WHOLE][CONST]} ${prules[AREA.WHOLE][STATE.DEFAULT]}`);
    expect(topDefault).toBe(`${prules[AREA.TOP][STATE.DEFAULT]}`);
    expect(mainDefault).toBeUndefined();
  });
  test("rules_undef", () => {
    const wholeDefault = rules_undef(AREA.WHOLE, STATE.DEFAULT);
    const wholeActive = rules_undef(AREA.WHOLE, STATE.ACTIVE);
    const wholeInactive = rules_undef(AREA.WHOLE, STATE.INACTIVE);
    const topDefault = rules_undef(AREA.TOP, STATE.DEFAULT);
    const mainDefault = rules_undef(AREA.MAIN, STATE.DEFAULT);
    expect(wholeDefault).toBe(`${prules[AREA.WHOLE][CONST]} ${prules[AREA.WHOLE][STATE.DEFAULT]}`);
    expect(wholeActive).toBe(`${prules[AREA.WHOLE][CONST]} ${prules[AREA.WHOLE][STATE.DEFAULT]}`);
    expect(wholeInactive).toBe(`${prules[AREA.WHOLE][CONST]} ${prules[AREA.WHOLE][STATE.DEFAULT]}`);
    expect(topDefault).toBe(`${prules[AREA.TOP][STATE.DEFAULT]}`);
    expect(mainDefault).toBeUndefined();
  });
  test("blank_str", () => {
    const wholeDefault = blank_str(AREA.WHOLE, STATE.DEFAULT);
    const wholeActive = blank_str(AREA.WHOLE, STATE.ACTIVE);
    const wholeInactive = blank_str(AREA.WHOLE, STATE.INACTIVE);
    const topDefault = blank_str(AREA.TOP, STATE.DEFAULT);
    const mainDefault = blank_str(AREA.MAIN, STATE.DEFAULT);
    expect(wholeDefault).toBe(`${sstr} ${AREA.WHOLE} ${STATE.DEFAULT}`);
    expect(wholeActive).toBe(`${sstr} ${AREA.WHOLE} ${STATE.ACTIVE}`);
    expect(wholeInactive).toBe(`${sstr} ${AREA.WHOLE} ${STATE.INACTIVE}`);
    expect(topDefault).toBe(`${sstr} ${AREA.TOP} ${STATE.DEFAULT}`);
    expect(mainDefault).toBe(`${sstr} ${AREA.MAIN} ${STATE.DEFAULT}`);
  });
  test("blank_rule", () => {
    const wholeDefault = blank_rule(AREA.WHOLE, STATE.DEFAULT);
    const wholeActive = blank_rule(AREA.WHOLE, STATE.ACTIVE);
    const wholeInactive = blank_rule(AREA.WHOLE, STATE.INACTIVE);
    const topDefault = blank_rule(AREA.TOP, STATE.DEFAULT);
    const mainDefault = blank_rule(AREA.MAIN, STATE.DEFAULT);
    expect(wholeDefault).toBe(`${srule[AREA.WHOLE]}`);
    expect(wholeActive).toBe(`${srule[AREA.WHOLE]}`);
    expect(wholeInactive).toBe(`${srule[AREA.WHOLE]}`);
    expect(topDefault).toBeUndefined();
    expect(mainDefault).toBe(`${srule[AREA.MAIN]}`);
  });
  test("blank_rules", () => {
    const wholeDefault = blank_rules(AREA.WHOLE, STATE.DEFAULT);
    const wholeActive = blank_rules(AREA.WHOLE, STATE.ACTIVE);
    const wholeInactive = blank_rules(AREA.WHOLE, STATE.INACTIVE);
    const topDefault = blank_rules(AREA.TOP, STATE.DEFAULT);
    const mainDefault = blank_rules(AREA.MAIN, STATE.DEFAULT);
    expect(wholeDefault).toBe(`${srules[AREA.WHOLE][CONST]}`);
    expect(wholeActive).toBe(`${srules[AREA.WHOLE][CONST]} ${srules[AREA.WHOLE][STATE.ACTIVE]}`);
    expect(wholeInactive).toBe(`${srules[AREA.WHOLE][CONST]}`);
    expect(topDefault).toBeUndefined();
    expect(mainDefault).toBe(`${srules[AREA.MAIN][CONST]}`);
  });
  test("blank_blank", () => {
    const wholeDefault = blank_blank(AREA.WHOLE, STATE.DEFAULT);
    const wholeActive = blank_blank(AREA.WHOLE, STATE.ACTIVE);
    const wholeInactive = blank_blank(AREA.WHOLE, STATE.INACTIVE);
    const topDefault = blank_blank(AREA.TOP, STATE.DEFAULT);
    const mainDefault = blank_blank(AREA.MAIN, STATE.DEFAULT);
    expect(wholeDefault).toBeUndefined();
    expect(wholeActive).toBeUndefined();
    expect(wholeInactive).toBeUndefined();
    expect(topDefault).toBeUndefined();
    expect(mainDefault).toBeUndefined();
  });
  test("blank_empty", () => {
    const wholeDefault = blank_empty(AREA.WHOLE, STATE.DEFAULT);
    const wholeActive = blank_empty(AREA.WHOLE, STATE.ACTIVE);
    const wholeInactive = blank_empty(AREA.WHOLE, STATE.INACTIVE);
    const topDefault = blank_empty(AREA.TOP, STATE.DEFAULT);
    const mainDefault = blank_empty(AREA.MAIN, STATE.DEFAULT);
    expect(wholeDefault).toBeUndefined();
    expect(wholeActive).toBeUndefined();
    expect(wholeInactive).toBeUndefined();
    expect(topDefault).toBeUndefined();
    expect(mainDefault).toBeUndefined();
  });
  test("blank_undef", () => {
    const wholeDefault = blank_undef(AREA.WHOLE, STATE.DEFAULT);
    const wholeActive = blank_undef(AREA.WHOLE, STATE.ACTIVE);
    const wholeInactive = blank_undef(AREA.WHOLE, STATE.INACTIVE);
    const topDefault = blank_undef(AREA.TOP, STATE.DEFAULT);
    const mainDefault = blank_undef(AREA.MAIN, STATE.DEFAULT);
    expect(wholeDefault).toBeUndefined();
    expect(wholeActive).toBeUndefined();
    expect(wholeInactive).toBeUndefined();
    expect(topDefault).toBeUndefined();
    expect(mainDefault).toBeUndefined();
  });
  test("empty_str", () => {
    const wholeDefault = empty_str(AREA.WHOLE, STATE.DEFAULT);
    const wholeActive = empty_str(AREA.WHOLE, STATE.ACTIVE);
    const wholeInactive = empty_str(AREA.WHOLE, STATE.INACTIVE);
    const topDefault = empty_str(AREA.TOP, STATE.DEFAULT);
    const mainDefault = empty_str(AREA.MAIN, STATE.DEFAULT);
    expect(wholeDefault).toBe(`${sstr} ${AREA.WHOLE} ${STATE.DEFAULT}`);
    expect(wholeActive).toBe(`${sstr} ${AREA.WHOLE} ${STATE.ACTIVE}`);
    expect(wholeInactive).toBe(`${sstr} ${AREA.WHOLE} ${STATE.INACTIVE}`);
    expect(topDefault).toBe(`${sstr} ${AREA.TOP} ${STATE.DEFAULT}`);
    expect(mainDefault).toBe(`${sstr} ${AREA.MAIN} ${STATE.DEFAULT}`);
  });
  test("empty_rule", () => {
    const wholeDefault = empty_rule(AREA.WHOLE, STATE.DEFAULT);
    const wholeActive = empty_rule(AREA.WHOLE, STATE.ACTIVE);
    const wholeInactive = empty_rule(AREA.WHOLE, STATE.INACTIVE);
    const topDefault = empty_rule(AREA.TOP, STATE.DEFAULT);
    const mainDefault = empty_rule(AREA.MAIN, STATE.DEFAULT);
    expect(wholeDefault).toBe(`${srule[AREA.WHOLE]}`);
    expect(wholeActive).toBe(`${srule[AREA.WHOLE]}`);
    expect(wholeInactive).toBe(`${srule[AREA.WHOLE]}`);
    expect(topDefault).toBeUndefined();
    expect(mainDefault).toBe(`${srule[AREA.MAIN]}`);
  });
  test("empty_rules", () => {
    const wholeDefault = empty_rules(AREA.WHOLE, STATE.DEFAULT);
    const wholeActive = empty_rules(AREA.WHOLE, STATE.ACTIVE);
    const wholeInactive = empty_rules(AREA.WHOLE, STATE.INACTIVE);
    const topDefault = empty_rules(AREA.TOP, STATE.DEFAULT);
    const mainDefault = empty_rules(AREA.MAIN, STATE.DEFAULT);
    expect(wholeDefault).toBe(`${srules[AREA.WHOLE][CONST]}`);
    expect(wholeActive).toBe(`${srules[AREA.WHOLE][CONST]} ${srules[AREA.WHOLE][STATE.ACTIVE]}`);
    expect(wholeInactive).toBe(`${srules[AREA.WHOLE][CONST]}`);
    expect(topDefault).toBeUndefined();
    expect(mainDefault).toBe(`${srules[AREA.MAIN][CONST]}`);
  });
  test("empty_blank", () => {
    const wholeDefault = empty_blank(AREA.WHOLE, STATE.DEFAULT);
    const wholeActive = empty_blank(AREA.WHOLE, STATE.ACTIVE);
    const wholeInactive = empty_blank(AREA.WHOLE, STATE.INACTIVE);
    const topDefault = empty_blank(AREA.TOP, STATE.DEFAULT);
    const mainDefault = empty_blank(AREA.MAIN, STATE.DEFAULT);
    expect(wholeDefault).toBeUndefined();
    expect(wholeActive).toBeUndefined();
    expect(wholeInactive).toBeUndefined();
    expect(topDefault).toBeUndefined();
    expect(mainDefault).toBeUndefined();
  });
  test("empty_empty", () => {
    const wholeDefault = empty_empty(AREA.WHOLE, STATE.DEFAULT);
    const wholeActive = empty_empty(AREA.WHOLE, STATE.ACTIVE);
    const wholeInactive = empty_empty(AREA.WHOLE, STATE.INACTIVE);
    const topDefault = empty_empty(AREA.TOP, STATE.DEFAULT);
    const mainDefault = empty_empty(AREA.MAIN, STATE.DEFAULT);
    expect(wholeDefault).toBeUndefined();
    expect(wholeActive).toBeUndefined();
    expect(wholeInactive).toBeUndefined();
    expect(topDefault).toBeUndefined();
    expect(mainDefault).toBeUndefined();
  });
  test("empty_undef", () => {
    const wholeDefault = empty_undef(AREA.WHOLE, STATE.DEFAULT);
    const wholeActive = empty_undef(AREA.WHOLE, STATE.ACTIVE);
    const wholeInactive = empty_undef(AREA.WHOLE, STATE.INACTIVE);
    const topDefault = empty_undef(AREA.TOP, STATE.DEFAULT);
    const mainDefault = empty_undef(AREA.MAIN, STATE.DEFAULT);
    expect(wholeDefault).toBeUndefined();
    expect(wholeActive).toBeUndefined();
    expect(wholeInactive).toBeUndefined();
    expect(topDefault).toBeUndefined();
    expect(mainDefault).toBeUndefined();
  });

  // test("noPresetWithStyle", () => {
  //   const wholeDefault = noPresetWithStyle(AREA.WHOLE, STATE.DEFAULT);
  //   const wholeActive = noPresetWithStyle(AREA.WHOLE, STATE.ACTIVE);
  //   const wholeInactive = noPresetWithStyle(AREA.WHOLE, STATE.INACTIVE);
  //   const topDefault = noPresetWithStyle(AREA.TOP, STATE.DEFAULT);
  //   const mainDefault = noPresetWithStyle(AREA.MAIN, STATE.DEFAULT);
  //   expect(wholeDefault).toBe(`${style.whole?.const}`);
  //   expect(wholeActive).toBe(`${style.whole?.const} ${style.whole?.active}`);
  //   expect(wholeInactive).toBe(`${style.whole?.const}`);
  //   expect(topDefault).toBeUndefined();
  //   expect(mainDefault).toBe(`${style.main?.const}`);
  // });
  // test("noPresetEmptyStyle", () => {
  //   const wholeDefault = noPresetEmptyStyle(AREA.WHOLE, STATE.DEFAULT);
  //   const wholeActive = noPresetEmptyStyle(AREA.WHOLE, STATE.ACTIVE);
  //   const wholeInactive = noPresetEmptyStyle(AREA.WHOLE, STATE.INACTIVE);
  //   const topDefault = noPresetEmptyStyle(AREA.TOP, STATE.DEFAULT);
  //   const mainDefault = noPresetEmptyStyle(AREA.MAIN, STATE.DEFAULT);
  //   expect(wholeDefault).toBe(`${name} ${AREA.WHOLE}`);
  //   expect(wholeActive).toBe(`${name} ${AREA.WHOLE} ${STATE.ACTIVE}`);
  //   expect(wholeInactive).toBe(`${name} ${AREA.WHOLE} ${STATE.INACTIVE}`);
  //   expect(topDefault).toBe(`${name} ${AREA.TOP}`);
  //   expect(mainDefault).toBe(`${name} ${AREA.MAIN}`);
  // });
  // test("noPresetStrStyle", () => {
  //   const wholeDefault = noPresetStrStyle(AREA.WHOLE, STATE.DEFAULT);
  //   const wholeActive = noPresetStrStyle(AREA.WHOLE, STATE.ACTIVE);
  //   const wholeInactive = noPresetStrStyle(AREA.WHOLE, STATE.INACTIVE);
  //   const topDefault = noPresetStrStyle(AREA.TOP, STATE.DEFAULT);
  //   const mainDefault = noPresetStrStyle(AREA.MAIN, STATE.DEFAULT);
  //   expect(wholeDefault).toBe(`${strStyle} ${AREA.WHOLE}`);
  //   expect(wholeActive).toBe(`${strStyle} ${AREA.WHOLE} ${STATE.ACTIVE}`);
  //   expect(wholeInactive).toBe(`${strStyle} ${AREA.WHOLE} ${STATE.INACTIVE}`);
  //   expect(topDefault).toBe(`${strStyle} ${AREA.TOP}`);
  //   expect(mainDefault).toBe(`${strStyle} ${AREA.MAIN}`);
  // });
  // test("withPresetNoStyle", () => {
  //   const wholeDefault = withPresetNoStyle(AREA.WHOLE, STATE.DEFAULT);
  //   const wholeActive = withPresetNoStyle(AREA.WHOLE, STATE.ACTIVE);
  //   const wholeInactive = withPresetNoStyle(AREA.WHOLE, STATE.INACTIVE);
  //   const topDefault = withPresetNoStyle(AREA.TOP, STATE.DEFAULT);
  //   const mainDefault = withPresetNoStyle(AREA.MAIN, STATE.DEFAULT);
  //   expect(wholeDefault).toBe(`${preset.whole?.const} ${preset.whole?.default}`);
  //   expect(wholeActive).toBe(`${preset.whole?.const} ${preset.whole?.default}`);
  //   expect(wholeInactive).toBe(`${preset.whole?.const} ${preset.whole?.default}`);
  //   expect(topDefault).toBe(`${preset.top?.default}`);
  //   expect(mainDefault).toBeUndefined();
  // });
  // test("withPresetWithStyle", () => {
  //   const wholeDefault = withPresetWithStyle(AREA.WHOLE, STATE.DEFAULT);
  //   const wholeActive = withPresetWithStyle(AREA.WHOLE, STATE.ACTIVE);
  //   const wholeInactive = withPresetWithStyle(AREA.WHOLE, STATE.INACTIVE);
  //   const topDefault = withPresetWithStyle(AREA.TOP, STATE.DEFAULT);
  //   const mainDefault = withPresetWithStyle(AREA.MAIN, STATE.DEFAULT);
  //   expect(wholeDefault).toBe(`${style.whole?.const} ${preset.whole?.default}`);
  //   expect(wholeActive).toBe(`${style.whole?.const} ${style.whole?.active}`);
  //   expect(wholeInactive).toBe(`${style.whole?.const} ${preset.whole?.default}`);
  //   expect(topDefault).toBe(`${preset.top?.default}`);
  //   expect(mainDefault).toBe(`${style.main?.const}`);
  // });
  // test("withPresetEmptyStyle", () => {
  //   const wholeDefault = withPresetEmptyStyle(AREA.WHOLE, STATE.DEFAULT);
  //   const wholeActive = withPresetEmptyStyle(AREA.WHOLE, STATE.ACTIVE);
  //   const wholeInactive = withPresetEmptyStyle(AREA.WHOLE, STATE.INACTIVE);
  //   const topDefault = withPresetEmptyStyle(AREA.TOP, STATE.DEFAULT);
  //   const mainDefault = withPresetEmptyStyle(AREA.MAIN, STATE.DEFAULT);
  //   expect(wholeDefault).toBe(`${name} ${AREA.WHOLE}`);
  //   expect(wholeActive).toBe(`${name} ${AREA.WHOLE} ${STATE.ACTIVE}`);
  //   expect(wholeInactive).toBe(`${name} ${AREA.WHOLE} ${STATE.INACTIVE}`);
  //   expect(topDefault).toBe(`${name} ${AREA.TOP}`);
  //   expect(mainDefault).toBe(`${name} ${AREA.MAIN}`);
  // });
  // test("withPresetStrStyle", () => {
  //   const wholeDefault = withPresetStrStyle(AREA.WHOLE, STATE.DEFAULT);
  //   const wholeActive = withPresetStrStyle(AREA.WHOLE, STATE.ACTIVE);
  //   const wholeInactive = withPresetStrStyle(AREA.WHOLE, STATE.INACTIVE);
  //   const topDefault = withPresetStrStyle(AREA.TOP, STATE.DEFAULT);
  //   const mainDefault = withPresetStrStyle(AREA.MAIN, STATE.DEFAULT);
  //   expect(wholeDefault).toBe(`${strStyle} ${AREA.WHOLE}`);
  //   expect(wholeActive).toBe(`${strStyle} ${AREA.WHOLE} ${STATE.ACTIVE}`);
  //   expect(wholeInactive).toBe(`${strStyle} ${AREA.WHOLE} ${STATE.INACTIVE}`);
  //   expect(topDefault).toBe(`${strStyle} ${AREA.TOP}`);
  //   expect(mainDefault).toBe(`${strStyle} ${AREA.MAIN}`);
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
    expect(unique.id.length).toBe(4);
  });
  test("construct with len arg", () => {
    const unique = new UniqueId(7);
    expect(unique.id.length).toBe(7);
  });
  test("construct with invalid len arg", () => {
    const unique1 = new UniqueId(NaN);
    const unique2 = new UniqueId(-10);
    const unique3 = new UniqueId(2);
    expect(unique1.id.length).toBe(4);
    expect(unique2.id.length).toBe(4);
    expect(unique3.id.length).toBe(4);
  });
  test("ids are unique until limit", () => {
    const unique = new UniqueId();
    const count = 10000;
    const ids = new Set();
    for (let i = 0; i < count; i++) {
      ids.add(unique.id);
    }
    expect(ids.size).toBe(count);
  });
});
