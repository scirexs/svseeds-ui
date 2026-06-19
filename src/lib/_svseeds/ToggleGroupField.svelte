<!--
  @component
  ### Usage
  Use standalone, or wrap `ToggleGroup` to share state.
  ```svelte
  <ToggleGroupField {...props} />

  <ToggleGroupField {...props}>
    <ToggleGroup {...props} />
  </ToggleGroupField>
  ```
  ### Types
  default value: *`(value)`*
  ```ts
  interface ToggleOption {
    text: string;
    disabled?: boolean;
    // other button attributes
  }
  interface ToggleGroupFieldProps {
    options?: SvelteMap<string, string | ToggleOption> | Map<string, string | ToggleOption>;
    label?: string;
    extra?: string;
    aux?: Snippet<[string[], string]>; // Snippet<[values,variant]>
    left?: Snippet<[string[], string]>; // Snippet<[values,variant]>
    right?: Snippet<[string[], string]>; // Snippet<[values,variant]>
    bottom?: string;
    reserve?: boolean; // (false)
    values?: string[]; // bindable
    multiple?: boolean; // (true)
    validations?: ToggleGroupFieldValidation[];
    constraints?: ToggleGroupFieldConstraint[];
    name?: string;
    elements?: HTMLButtonElement[]; // bindable
    styling?: SVSClass;
    variant?: SVSVariant; // bindable (VARIANT.NEUTRAL)
    toggleGroup?: Omit<
      ToggleGroupProps,
      ToggleGroupReqdProps | ToggleGroupBindProps | "ariaDescId" | "ariaErrMsgId" | "multiple" | "variant" | "events"
    >;
    children?: Snippet;
  }
  type ToggleGroupFieldValidation = SVSFieldValidation<string[]>;
  type ToggleGroupFieldConstraint = SVSFieldConstraint;
  ```
  ### Anatomy
  ```svelte
  <div class="whole">
    <div class="top" conditional: label or aux>
      <span class="label" conditional>
        {label}
        <span class="extra" conditional>{extra}</span>
      </span>
      <span class="aux" conditional>{aux}</span>
    </div>
    <div class="middle">
      <span class="left" conditional>{left}</span>
      <input style="display:none" aria-hidden="true" oninvalid />
      {#if name}{#each values as value}<input type="hidden" {name} {value} />{/each}{/if}
      {#if children}{@render children()}{:else if options}<ToggleGroup {options} {multiple} {...toggleGroup} />{/if}
      <span class="right" conditional>{right}</span>
    </div>
    <div class="bottom" conditional: has text, or always when reserve>{bottom}</div>
  </div>
  ```
  When a declarative child is supplied, the field's `multiple` and `toggleGroup` props are ignored.
-->
<script module lang="ts">
  export interface ToggleGroupFieldProps {
    options?: SvelteMap<string, string | ToggleOption> | Map<string, string | ToggleOption>;
    label?: string;
    extra?: string;
    aux?: Snippet<[string[], string]>; // Snippet<[values,variant]>
    left?: Snippet<[string[], string]>; // Snippet<[values,variant]>
    right?: Snippet<[string[], string]>; // Snippet<[values,variant]>
    bottom?: string;
    reserve?: boolean; // (false)
    values?: string[]; // bindable
    multiple?: boolean; // (true)
    validations?: ToggleGroupFieldValidation[];
    constraints?: ToggleGroupFieldConstraint[];
    name?: string;
    elements?: HTMLButtonElement[]; // bindable
    styling?: SVSClass;
    variant?: SVSVariant; // bindable (VARIANT.NEUTRAL)
    toggleGroup?: Omit<
      ToggleGroupProps,
      ToggleGroupReqdProps | ToggleGroupBindProps | "ariaDescId" | "ariaErrMsgId" | "multiple" | "variant" | "events"
    >;
    children?: Snippet;
  }
  export type ToggleGroupFieldReqdProps = never;
  export type ToggleGroupFieldBindProps = "values" | "variant" | "elements";
  export type ToggleGroupFieldValidation = SVSFieldValidation<string[]>;
  export type ToggleGroupFieldConstraint = SVSFieldConstraint;
  export type { ToggleOption };

  export const _TOGGLE_GROUP_FIELD_PRESET = "svs-toggle-group-field";

  import { untrack } from "svelte";
  import { VARIANT, PARTS, _fnClass, _isNeutral } from "./_core";
  import ToggleGroup, { _TOGGLE_GROUP_PRESET, _setToggleGroupContext } from "./ToggleGroup.svelte";
  import type { Snippet } from "svelte";
  import type { SvelteMap } from "svelte/reactivity";
  import type { SVSClass, SVSVariant, SVSFieldValidation, SVSFieldConstraint } from "./_core";
  import type {
    ToggleGroupContext,
    ToggleOption,
    ToggleGroupProps,
    ToggleGroupReqdProps,
    ToggleGroupBindProps,
  } from "./ToggleGroup.svelte";
</script>

<script lang="ts">
  // prettier-ignore
  let { options, label, extra, aux, left, right, bottom, reserve = false, values = $bindable([]), multiple = true, validations = [], constraints = [], name, elements = $bindable([]), styling, variant = $bindable(VARIANT.NEUTRAL), toggleGroup, children }: ToggleGroupFieldProps = $props();

  // *** Initialize *** //
  const cls = $derived(_fnClass(_TOGGLE_GROUP_FIELD_PRESET, styling));
  const uid = $props.id();
  const idLabel = $derived(label?.trim() ? `${uid}-label` : undefined);
  const idDesc = $derived(bottom?.trim() ? `${uid}-desc` : undefined);
  const idErr = $derived(idDesc ?? `${uid}-err`);
  let errmsg = $state("");
  const message = $derived(variant === VARIANT.INACTIVE ? errmsg || bottom : bottom);
  let element: HTMLInputElement | undefined = $state();

  // *** Initialize Context *** //
  const ctx: ToggleGroupContext = {
    get values() {
      return values;
    },
    set values(v) {
      values = v;
    },
    set elements(v: HTMLButtonElement[]) {
      elements = v;
    },
    get variant() {
      return neutral;
    },
    get styling() {
      return `${_TOGGLE_GROUP_FIELD_PRESET} ${_TOGGLE_GROUP_PRESET}`;
    },
    get ariaDescId() {
      return idDesc;
    },
    get ariaErrMsgId() {
      return idMsg;
    },
    events: { onadd: hadd },
  };
  _setToggleGroupContext(ctx);

  // *** States *** //
  let neutral = $state(_isNeutral(variant) ? variant : VARIANT.NEUTRAL);
  $effect(() => {
    neutral = _isNeutral(variant) ? variant : neutral;
  });
  const live = $derived(variant === VARIANT.INACTIVE ? "alert" : undefined);
  const idMsg = $derived(variant === VARIANT.INACTIVE && message?.trim() ? idErr : undefined);
  function shift(oninvalid: boolean = false, msg?: string) {
    const vmsg = element?.validationMessage ?? "";
    variant = msg ? VARIANT.INACTIVE : oninvalid && vmsg ? VARIANT.INACTIVE : !values.length || vmsg ? neutral : VARIANT.ACTIVE;
    errmsg = msg ? msg : vmsg;
  }
  function verify() {
    if (!element) return;
    for (const v of validations) {
      const msg = v({ value: values, validity: element.validity, element });
      if (msg) return element.setCustomValidity(msg);
    }
    element.setCustomValidity("");
  }
  function check(value: string): string {
    if (!element) return "";
    for (const c of constraints) {
      const msg = c({ value, values, validity: element.validity, element });
      if (msg) return msg;
    }
    return "";
  }
  function hadd(detail: { values: string[]; added: string[] }): string[] | void {
    const value = detail.added[0];
    if (!value) return;
    const msg = check(value);
    if (msg) {
      shift(false, msg);
      return [];
    }
  }

  // *** Reactive Handlers *** //
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
    shift(true);
  }
  $effect(() => untrack(() => verify()));
</script>

<!---------------------------------------->

{#if children || options?.size}
  <div class={cls(PARTS.WHOLE, variant)} role="group" aria-labelledby={idLabel}>
    {#if label?.trim() || aux}
      <div class={cls(PARTS.TOP, variant)}>
        {@render lbl()}
        {#if aux}
          <span class={cls(PARTS.AUX, variant)}>{@render aux(values, variant)}</span>
        {/if}
      </div>
    {/if}
    <div class={cls(PARTS.MIDDLE, variant)}>
      {@render side(PARTS.LEFT, left)}
      {@render fnForm()}
      {#if children}
        {@render children()}
      {:else if options}
        <ToggleGroup {...toggleGroup} {options} {multiple} />
      {/if}
      {@render side(PARTS.RIGHT, right)}
    </div>
    {#if reserve || message?.trim()}
      <div class={cls(PARTS.BOTTOM, variant)} id={idDesc ?? idErr} role={live}>{message}</div>
    {/if}
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
{#snippet fnForm()}
  <input bind:this={element} style="display: none;" aria-hidden="true" {oninvalid} />
  {#if name}
    {#each values as value}
      <input type="hidden" {name} {value} />
    {/each}
  {/if}
{/snippet}
