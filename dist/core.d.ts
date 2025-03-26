export { type StateName, type AreaName, type ClassRule, type ClassRuleSet, type ThemePreset, CONST, STATE, AREA, elemId, theme, getClassFn, isUndef, omit, debounce, throttle, };
type valueof<T> = T[keyof T];
type StateName = valueof<typeof STATE>;
type AreaName = valueof<typeof AREA>;
type ClassRule = Partial<Record<StateName | typeof CONST, string>>;
type ClassRuleSet = Partial<Record<AreaName, ClassRule>>;
type CssVarSet = Record<string, string>;
type ThemePreset = Record<string, CssVarSet>;
declare const CONST = "constant";
declare const STATE: Readonly<{
    DEFAULT: "default";
    ACTIVE: "active";
    INACTIVE: "inactive";
}>;
declare const AREA: Readonly<{
    WHOLE: "whole";
    MIDDLE: "middle";
    MAIN: "main";
    TOP: "top";
    LEFT: "left";
    RIGHT: "right";
    BOTTOM: "bottom";
    LABEL: "label";
    AUX: "aux";
    EXTRA: "extra";
}>;
declare class RandomId {
    #private;
    get(v: unknown): string | undefined;
}
declare class ThemeSwitcher {
    #private;
    get current(): string;
    constructor();
    setPreset(preset: ThemePreset): ThemeSwitcher;
    toLight(): void;
    toDark(): void;
    switch(theme: string): void;
}
declare const elemId: RandomId;
declare const theme: ThemeSwitcher;
type ClassFn = (area: AreaName, status: StateName) => string | undefined;
declare function getClassFn(name: string, preset: ClassRuleSet, style: ClassRuleSet | string): ClassFn;
declare function isUndef(v: unknown): boolean;
declare function omit<T extends Record<string, unknown>, K extends keyof T>(obj: T, ...keys: K[]): Omit<T, K>;
declare function debounce<Args extends unknown[], R>(delay: number, fn: (...args: Args) => R): (...args: Args) => void;
declare function throttle<Args extends unknown[], R>(interval: number, fn: (...args: Args) => R): (...args: Args) => void;
