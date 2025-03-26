// deno-fmt-ignore
export { CONST, STATE, AREA, elemId, theme, getClassFn, isUndef, omit, debounce, throttle, };
const CONST = "constant";
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
class RandomId {
    static #ALPHABETIC = [...Array.from(Array(25).keys(), (x) => x + 65), ...Array.from(Array(25).keys(), (x) => x + 97)];
    #store = new Set();
    get(v) {
        if (!v)
            return;
        if (this.#store.size > 10000)
            this.#store.clear();
        return this.#add();
    }
    #char() {
        return RandomId.#ALPHABETIC[Math.trunc(Math.random() * RandomId.#ALPHABETIC.length)];
    }
    #gen() {
        return String.fromCharCode(...Array(4).fill(null).map(() => this.#char()), 58);
    }
    #add() {
        let id = this.#gen();
        while (this.#store.has(id)) {
            id = this.#gen();
        }
        this.#store.add(id);
        return id;
    }
}
class ThemeSwitcher {
    static #DARK = "dark";
    static #LIGHT = "light";
    #styles = {};
    #current;
    get current() {
        return this.#current;
    }
    constructor() {
        this.#current = ThemeSwitcher.#setInitialTheme();
    }
    setPreset(preset) {
        this.#styles = ThemeSwitcher.#toCSSVarName(preset);
        this.#setColorScheme();
        return this;
    }
    toLight() {
        this.switch(ThemeSwitcher.#LIGHT);
    }
    toDark() {
        this.switch(ThemeSwitcher.#DARK);
    }
    switch(theme) {
        if (!this.#exists(theme))
            return;
        this.#current = theme;
        this.#apply();
    }
    #apply() {
        if (!window)
            return;
        const style = window.document.body.style;
        Object.entries(this.#styles[this.#current])
            .forEach(([name, value]) => style.setProperty(name, value));
    }
    #exists(theme) {
        return Object.keys(this.#styles).includes(theme);
    }
    #setColorScheme() {
        if (!window)
            return;
        const themes = Object.keys(this.#styles).filter((x) => x === ThemeSwitcher.#LIGHT || x === ThemeSwitcher.#DARK);
        window.document.documentElement.style.colorScheme = themes.join(" ");
    }
    static #toCSSVarName(styles) {
        return Object.fromEntries(Object.entries(styles)
            .map(([theme, obj]) => [theme, ThemeSwitcher.#renameProperties(obj)]));
    }
    static #renameProperties(obj) {
        return Object.fromEntries(Object.entries(obj)
            .map(([name, value]) => [`--${name.replaceAll("_", "-")}`, value]));
    }
    static #setInitialTheme() {
        return window?.matchMedia("(prefers-color-scheme: light)").matches ? ThemeSwitcher.#LIGHT : ThemeSwitcher.#DARK;
    }
}
const elemId = new RandomId();
const theme = new ThemeSwitcher();
function getClassFn(name, preset, style) {
    const rule = getRule(name, preset, style);
    if (typeof rule === "string") {
        return (area, status) => cssClass(rule, area, status);
    }
    else {
        return (area, status) => ruleClass(rule, area, status);
    }
}
function getRule(name, preset, style) {
    if (typeof style === "string")
        return style.trim() ? style : name;
    const rule = mergeRule(preset, style);
    return Object.keys(rule).length <= 0 ? name : rule;
}
function cssClass(name, area, status) {
    return `${name} ${area}${status === STATE.DEFAULT ? "" : ` ${status}`}`;
}
function ruleClass(rule, area, status) {
    const constant = rule[area]?.constant ?? "";
    const dynamic = rule[area]?.[status] ?? rule[area]?.default ?? "";
    return constant === "" && dynamic === "" ? undefined : `${constant}${constant && dynamic ? " " : ""}${dynamic}`;
}
function mergeRule(preset, style) {
    const presetKeys = Object.keys(preset);
    if (presetKeys.length <= 0)
        return style;
    const styleKeys = Object.keys(style);
    if (styleKeys.length <= 0)
        return preset;
    const result = {};
    new Set([...presetKeys, ...styleKeys]).forEach((key) => {
        result[key] = { ...preset[key] ?? {}, ...style[key] ?? {} };
    });
    return result;
}
function isUndef(v) {
    return v === void 0;
}
function omit(obj, ...keys) {
    if (Object.isFrozen(obj) || Object.isSealed(obj))
        return obj;
    keys.forEach((key) => delete obj[key]);
    return obj;
}
function debounce(delay, fn) {
    let timer;
    return (...args) => {
        if (timer)
            clearTimeout(timer);
        timer = setTimeout(() => {
            fn.call(null, ...args);
        }, delay);
    };
}
function throttle(interval, fn) {
    let timer;
    let last = 0;
    const elapsed = () => Date.now() - last;
    const run = (args) => {
        fn.call(null, ...args);
        last = Date.now();
    };
    return (...args) => {
        if (!last)
            return run(args);
        clearTimeout(timer);
        timer = setTimeout(() => {
            if (elapsed() >= interval)
                run(args);
        }, interval - elapsed());
    };
}
