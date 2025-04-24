import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { AREA, CONST, debounce, elemId, fnClass, omit, STATE, type SVSStyle, throttle, UniqueId } from "../lib/core.ts";

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
  const name = "cmp-name";
  const strStyle = "style";
  const preset: SVSStyle = {
    [AREA.WHOLE]: {
      [CONST]: "preset-wc",
      [STATE.DEFAULT]: "preset-wd",
    },
    [AREA.TOP]: {
      [STATE.DEFAULT]: "preset-tc",
    },
  };
  const style: SVSStyle = {
    [AREA.WHOLE]: {
      [CONST]: "style-wc",
      [STATE.ACTIVE]: "style-wa",
    },
    [AREA.MAIN]: {
      [CONST]: "style-mc",
    },
  };

  const noPresetNoStyle = fnClass(name, {}, {});
  const noPresetWithStyle = fnClass(name, {}, style);
  const noPresetEmptyStyle = fnClass(name, {}, "");
  const noPresetStrStyle = fnClass(name, {}, strStyle);
  const withPresetNoStyle = fnClass(name, preset, {});
  const withPresetWithStyle = fnClass(name, preset, style);
  const withPresetEmptyStyle = fnClass(name, preset, "");
  const withPresetStrStyle = fnClass(name, preset, strStyle);
  test("noPresetNoStyle", () => {
    const wholeDefault = noPresetNoStyle(AREA.WHOLE, STATE.DEFAULT);
    const wholeActive = noPresetNoStyle(AREA.WHOLE, STATE.ACTIVE);
    const wholeInactive = noPresetNoStyle(AREA.WHOLE, STATE.INACTIVE);
    const topDefault = noPresetNoStyle(AREA.TOP, STATE.DEFAULT);
    const mainDefault = noPresetNoStyle(AREA.MAIN, STATE.DEFAULT);
    expect(wholeDefault).toBe(`${name} ${AREA.WHOLE}`);
    expect(wholeActive).toBe(`${name} ${AREA.WHOLE} ${STATE.ACTIVE}`);
    expect(wholeInactive).toBe(`${name} ${AREA.WHOLE} ${STATE.INACTIVE}`);
    expect(topDefault).toBe(`${name} ${AREA.TOP}`);
    expect(mainDefault).toBe(`${name} ${AREA.MAIN}`);
  });
  test("noPresetWithStyle", () => {
    const wholeDefault = noPresetWithStyle(AREA.WHOLE, STATE.DEFAULT);
    const wholeActive = noPresetWithStyle(AREA.WHOLE, STATE.ACTIVE);
    const wholeInactive = noPresetWithStyle(AREA.WHOLE, STATE.INACTIVE);
    const topDefault = noPresetWithStyle(AREA.TOP, STATE.DEFAULT);
    const mainDefault = noPresetWithStyle(AREA.MAIN, STATE.DEFAULT);
    expect(wholeDefault).toBe(`${style.whole?.const}`);
    expect(wholeActive).toBe(`${style.whole?.const} ${style.whole?.active}`);
    expect(wholeInactive).toBe(`${style.whole?.const}`);
    expect(topDefault).toBeUndefined();
    expect(mainDefault).toBe(`${style.main?.const}`);
  });
  test("noPresetEmptyStyle", () => {
    const wholeDefault = noPresetEmptyStyle(AREA.WHOLE, STATE.DEFAULT);
    const wholeActive = noPresetEmptyStyle(AREA.WHOLE, STATE.ACTIVE);
    const wholeInactive = noPresetEmptyStyle(AREA.WHOLE, STATE.INACTIVE);
    const topDefault = noPresetEmptyStyle(AREA.TOP, STATE.DEFAULT);
    const mainDefault = noPresetEmptyStyle(AREA.MAIN, STATE.DEFAULT);
    expect(wholeDefault).toBe(`${name} ${AREA.WHOLE}`);
    expect(wholeActive).toBe(`${name} ${AREA.WHOLE} ${STATE.ACTIVE}`);
    expect(wholeInactive).toBe(`${name} ${AREA.WHOLE} ${STATE.INACTIVE}`);
    expect(topDefault).toBe(`${name} ${AREA.TOP}`);
    expect(mainDefault).toBe(`${name} ${AREA.MAIN}`);
  });
  test("noPresetStrStyle", () => {
    const wholeDefault = noPresetStrStyle(AREA.WHOLE, STATE.DEFAULT);
    const wholeActive = noPresetStrStyle(AREA.WHOLE, STATE.ACTIVE);
    const wholeInactive = noPresetStrStyle(AREA.WHOLE, STATE.INACTIVE);
    const topDefault = noPresetStrStyle(AREA.TOP, STATE.DEFAULT);
    const mainDefault = noPresetStrStyle(AREA.MAIN, STATE.DEFAULT);
    expect(wholeDefault).toBe(`${strStyle} ${AREA.WHOLE}`);
    expect(wholeActive).toBe(`${strStyle} ${AREA.WHOLE} ${STATE.ACTIVE}`);
    expect(wholeInactive).toBe(`${strStyle} ${AREA.WHOLE} ${STATE.INACTIVE}`);
    expect(topDefault).toBe(`${strStyle} ${AREA.TOP}`);
    expect(mainDefault).toBe(`${strStyle} ${AREA.MAIN}`);
  });
  test("withPresetNoStyle", () => {
    const wholeDefault = withPresetNoStyle(AREA.WHOLE, STATE.DEFAULT);
    const wholeActive = withPresetNoStyle(AREA.WHOLE, STATE.ACTIVE);
    const wholeInactive = withPresetNoStyle(AREA.WHOLE, STATE.INACTIVE);
    const topDefault = withPresetNoStyle(AREA.TOP, STATE.DEFAULT);
    const mainDefault = withPresetNoStyle(AREA.MAIN, STATE.DEFAULT);
    expect(wholeDefault).toBe(`${preset.whole?.const} ${preset.whole?.default}`);
    expect(wholeActive).toBe(`${preset.whole?.const} ${preset.whole?.default}`);
    expect(wholeInactive).toBe(`${preset.whole?.const} ${preset.whole?.default}`);
    expect(topDefault).toBe(`${preset.top?.default}`);
    expect(mainDefault).toBeUndefined();
  });
  test("withPresetWithStyle", () => {
    const wholeDefault = withPresetWithStyle(AREA.WHOLE, STATE.DEFAULT);
    const wholeActive = withPresetWithStyle(AREA.WHOLE, STATE.ACTIVE);
    const wholeInactive = withPresetWithStyle(AREA.WHOLE, STATE.INACTIVE);
    const topDefault = withPresetWithStyle(AREA.TOP, STATE.DEFAULT);
    const mainDefault = withPresetWithStyle(AREA.MAIN, STATE.DEFAULT);
    expect(wholeDefault).toBe(`${style.whole?.const} ${preset.whole?.default}`);
    expect(wholeActive).toBe(`${style.whole?.const} ${style.whole?.active}`);
    expect(wholeInactive).toBe(`${style.whole?.const} ${preset.whole?.default}`);
    expect(topDefault).toBe(`${preset.top?.default}`);
    expect(mainDefault).toBe(`${style.main?.const}`);
  });
  test("withPresetEmptyStyle", () => {
    const wholeDefault = withPresetEmptyStyle(AREA.WHOLE, STATE.DEFAULT);
    const wholeActive = withPresetEmptyStyle(AREA.WHOLE, STATE.ACTIVE);
    const wholeInactive = withPresetEmptyStyle(AREA.WHOLE, STATE.INACTIVE);
    const topDefault = withPresetEmptyStyle(AREA.TOP, STATE.DEFAULT);
    const mainDefault = withPresetEmptyStyle(AREA.MAIN, STATE.DEFAULT);
    expect(wholeDefault).toBe(`${name} ${AREA.WHOLE}`);
    expect(wholeActive).toBe(`${name} ${AREA.WHOLE} ${STATE.ACTIVE}`);
    expect(wholeInactive).toBe(`${name} ${AREA.WHOLE} ${STATE.INACTIVE}`);
    expect(topDefault).toBe(`${name} ${AREA.TOP}`);
    expect(mainDefault).toBe(`${name} ${AREA.MAIN}`);
  });
  test("withPresetStrStyle", () => {
    const wholeDefault = withPresetStrStyle(AREA.WHOLE, STATE.DEFAULT);
    const wholeActive = withPresetStrStyle(AREA.WHOLE, STATE.ACTIVE);
    const wholeInactive = withPresetStrStyle(AREA.WHOLE, STATE.INACTIVE);
    const topDefault = withPresetStrStyle(AREA.TOP, STATE.DEFAULT);
    const mainDefault = withPresetStrStyle(AREA.MAIN, STATE.DEFAULT);
    expect(wholeDefault).toBe(`${strStyle} ${AREA.WHOLE}`);
    expect(wholeActive).toBe(`${strStyle} ${AREA.WHOLE} ${STATE.ACTIVE}`);
    expect(wholeInactive).toBe(`${strStyle} ${AREA.WHOLE} ${STATE.INACTIVE}`);
    expect(topDefault).toBe(`${strStyle} ${AREA.TOP}`);
    expect(mainDefault).toBe(`${strStyle} ${AREA.MAIN}`);
  });
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
