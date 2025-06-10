<!--
  @component
  default value: `(value)`
  ```ts
  interface ToggleGroupFieldProps {
    options: SvelteMap<string, string> | Map<string, string>;
    label?: string;
    extra?: string;
    aux?: Snippet<[string[], string]>; // Snippet<[values,variant]>
    left?: Snippet<[string[], string]>; // Snippet<[values,variant]>
    right?: Snippet<[string[], string]>; // Snippet<[values,variant]>
    bottom?: string;
    descFirst?: boolean; // (false)
    values?: string[]; // bindable
    multiple?: boolean; // (true)
    validations?: ToggleGroupFieldValidation[];
    name?: string;
    styling?: SVSClass;
    variant?: string; // bindable (VARIANT.NEUTRAL)
    deps?: ToggleGroupFieldDeps;
    [key: string]: unknown | Snippet;
  }
  interface ToggleGroupFieldDeps {
    svsToggleGroup?: Omit<ToggleGroupProps, ToggleGroupReqdProps | ToggleGroupBindProps | "ariaDescId" | "multiple">;
  }
  type ToggleGroupFieldValidation = (values: string[]) => string | undefined;
  ```
-->
<script module lang="ts">
  export interface ToggleGroupFieldProps {
    options: SvelteMap<string, string> | Map<string, string>;
    label?: string;
    extra?: string;
    aux?: Snippet<[string[], string]>; // Snippet<[values,variant]>
    left?: Snippet<[string[], string]>; // Snippet<[values,variant]>
    right?: Snippet<[string[], string]>; // Snippet<[values,variant]>
    bottom?: string;
    descFirst?: boolean; // (false)
    values?: string[]; // bindable
    multiple?: boolean; // (true)
    validations?: ToggleGroupFieldValidation[];
    name?: string;
    styling?: SVSClass;
    variant?: string; // bindable (VARIANT.NEUTRAL)
    deps?: ToggleGroupFieldDeps;
    [key: string]: unknown | Snippet;
  }
  export interface ToggleGroupFieldDeps {
    svsToggleGroup?: Omit<ToggleGroupProps, ToggleGroupReqdProps | ToggleGroupBindProps | "ariaDescId" | "multiple">;
  }
  export type ToggleGroupFieldReqdProps = "options";
  export type ToggleGroupFieldBindProps = "values" | "variant";
  export type ToggleGroupFieldValidation = (values: string[]) => string | undefined;

  const preset = "svs-toggle-group-field";

  import { type Snippet, untrack } from "svelte";
  import { type Action } from "svelte/action";
  import { type SvelteMap } from "svelte/reactivity";
  import { type SVSClass, VARIANT, PARTS, elemId, fnClass, isNeutral } from "./core";
  import ToggleGroup, { type ToggleGroupProps, type ToggleGroupReqdProps, type ToggleGroupBindProps } from "./_ToggleGroup.svelte";
</script>

<script lang="ts">
  let { options, label, extra, aux, left, right, bottom, descFirst = false, values = $bindable([]), multiple = true, validations = [], name, styling, variant = $bindable(""), deps, ...rest }: ToggleGroupFieldProps = $props();

  // *** Initialize *** //
  if (!variant) variant = VARIANT.NEUTRAL;
  const cls = fnClass(preset, styling);
  const idLabel = elemId.get(label?.trim());
  const idDesc = elemId.get(bottom?.trim());
  const idErr = idDesc ?? elemId.id;
  let message = $state(bottom);
  let element: HTMLInputElement | undefined = $state();

  // *** Initialize Deps *** //
  const svsToggleGroup = {
    ...Object.fromEntries(Object.entries(rest).filter(([_, v]) => typeof v === "function")),
    ariaDescId: idDesc,
    styling: deps?.svsToggleGroup?.styling as SVSClass ?? `${preset} svs-toggle-group`,
    action: deps?.svsToggleGroup?.action as Action,
  };

  // *** Status *** //
  let neutral = $state(isNeutral(variant) ? variant : VARIANT.NEUTRAL);
  $effect(() => { neutral = isNeutral(variant) ? variant : neutral });
  let live = $derived(variant === VARIANT.INACTIVE ? "alert" : "status");
  let idMsg = $derived(variant === VARIANT.INACTIVE && message?.trim() ? idErr : undefined);
  function shift(oninvalid?: boolean) {
    const vmsg = element?.validationMessage ?? "";
    variant = oninvalid && vmsg ? VARIANT.INACTIVE : (!values.length || vmsg) ? neutral : VARIANT.ACTIVE;
    message = variant === VARIANT.INACTIVE ? vmsg ? vmsg : bottom : bottom;
  }
  function verify() {
    if (!element) return;
    for (const v of validations) {
      const msg = v(values);
      if (msg) return element.setCustomValidity(msg);
    }
    element.setCustomValidity("");
  }

  // *** Bind Handlers *** //
  $effect.pre(() => {
    values;
    untrack(() => validate());
  });
  function validate() {
    verify();
    shift();
  }

  // *** Event Handlers *** //
  function oninvalid(ev: Event) {
    ev.preventDefault();
    shift(true)
  }
  $effect(() => untrack(() => verify()));
</script>

<!---------------------------------------->

{#if options.size}
  <div class={cls(PARTS.WHOLE, variant)} role="group" aria-labelledby={idLabel}>
    {#if aux}
      <div class={cls(PARTS.TOP, variant)}>
        {@render lbl()}
        <span class={cls(PARTS.AUX, variant)}>{@render aux(values, variant)}</span>
      </div>
    {:else}
      {@render lbl()}
    {/if}
    {@render desc(descFirst)}
    <div class={cls(PARTS.MIDDLE, variant)}>
      {@render side(PARTS.LEFT, left)}
      {@render fnForm()}
      <ToggleGroup bind:values bind:ariaErrMsgId={idMsg} bind:variant={neutral} {options} {multiple} {...svsToggleGroup} />
      {@render side(PARTS.RIGHT, right)}
    </div>
    {@render desc(!descFirst)}
  </div>
{/if}

{#snippet lbl()}
  {#if label?.trim()}
    <span class={cls(PARTS.LABEL, variant)} id={idLabel}>
      {label}
      {#if extra?.trim()}
        <span class={cls(PARTS.EXTRA, variant)}>{extra}</span>
      {/if}
    </span>
  {/if}
{/snippet}
{#snippet side(area: string, body?: Snippet<[string[], string]>)}
  {#if body}
    <span class={cls(area, variant)}>{@render body(values, variant)}</span>
  {/if}
{/snippet}
{#snippet desc(show: boolean)}
  {#if show && message?.trim()}
    <div class={cls(PARTS.BOTTOM, variant)} id={idDesc ?? idErr} role={live}>{message}</div>
  {/if}
{/snippet}
{#snippet fnForm()}
  <input bind:this={element} style="display: none;" aria-hidden="true" {oninvalid} />
  {#each values as value}
    <input type="hidden" {name} {value} />
  {/each}
{/snippet}
