import { describe, expect, test } from "vitest";
import { dedupeExportNames, extractExportNames, extractSvelteDependencies } from "../src/script/prep";

describe("prep export extraction", () => {
  test("extracts generic type and interface names without truncating defaults", () => {
    const code = `
export type SortableProps<T = string> = { value: T };
export interface Foo<T> extends Bar {}
export interface Baz extends Qux {}
`;

    expect(extractExportNames(code, ".ts")).toEqual(["type SortableProps", "type Foo", "type Baz"]);
  });

  test("extracts plain type and interface declarations", () => {
    const code = `
export type PlainType = { value: string };
export interface PlainInterface {}
`;

    expect(extractExportNames(code, ".ts")).toEqual(["type PlainType", "type PlainInterface"]);
  });

  test("extracts bulk and value exports from ts sources", () => {
    const code = `
const local = "";
export { local as renamed, other };
export function helper() {}
export class Thing {}
export const VALUE = 1;
`;

    expect(extractExportNames(code, ".ts")).toEqual(["local as renamed", "other", "helper", "Thing", "VALUE"]);
  });

  test("dedupes export names across in-memory source strings with first wins", () => {
    const first = `
export const Dup = 1;
export { value as Shared };
`;
    const second = `
export const Dup = 2;
export const Shared = 3;
export type Later = string;
`;

    expect(dedupeExportNames([...extractExportNames(first, ".ts"), ...extractExportNames(second, ".ts")])).toEqual([
      "value as Shared",
      "Dup",
      "type Later",
    ]);
  });

  test("extracts the svelte default and public module exports, excluding internal `_`-prefixed exports", () => {
    const code = `
<script module lang="ts">
  export interface InputProps<T = string> extends HTMLInputAttributes {}
  export const inputBase = "svs-input";
  export const _INPUT_PRESET = "svs-input";
</script>
`;

    expect(extractExportNames(code, ".svelte")).toEqual(["default as Input", "type InputProps", "inputBase"]);
  });
});

describe("prep dependency extraction", () => {
  test("dedupes svelte imports and drops self references", () => {
    const code = `
<script lang="ts">
  import Input from "./Input.svelte";
  import type { InputProps } from "./Input.svelte";
  import Self from "./Field.svelte";
  import Label from "./Label.svelte";
</script>
`;

    expect(extractSvelteDependencies(code, "Field.svelte")).toEqual(["Input.svelte", "Label.svelte"]);
  });
});
