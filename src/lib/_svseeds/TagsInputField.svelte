<!--
  @component
  ### Types
  default value: *`(value)`*
  ```ts
  interface TagsInputFieldProps {
    label?: string;
    extra?: string;
    aux?: Snippet<[string[], string, HTMLInputElement | undefined]>; // Snippet<[values,variant,element]>
    left?: Snippet<[string[], string, HTMLInputElement | undefined]>; // Snippet<[values,variant,element]>
    right?: Snippet<[string[], string, HTMLInputElement | undefined]>; // Snippet<[values,variant,element]>
    bottom?: string;
    reserve?: boolean; // (false)
    flip?: boolean; // (false)
    values?: string[]; // bindable
    constraints?: TagsInputFieldConstraint[];
    validations?: TagsInputFieldValidation[];
    name?: string;
    element?: HTMLInputElement; // bindable
    styling?: SVSClass;
    variant?: SVSVariant; // bindable (VARIANT.NEUTRAL)
    children?: Snippet;
  }
  type TagsInputFieldConstraint = SVSFieldConstraint;
  type TagsInputFieldValidation = SVSFieldValidation<string[]>;
  // Migration: min -> validations fn `({ value }) => value.length < N ? msg : null`; max -> constraints fn `({ values }) => values.length >= N ? msg : null`.
  ```
  ### Anatomy
  ```svelte
  <div class="whole">
    <div class="top" conditional: label or aux>
      <label class="label" conditional>
        {label}
        <span class="extra" conditional>{extra}</span>
      </label>
      <span class="aux" conditional>{aux}</span>
    </div>
    <div class="middle">
      <span class="left" conditional>{left}</span>
      {#if children}{@render children()}{:else}<TagsInput />{/if}
      <span class="right" conditional>{right}</span>
    </div>
    <div class="bottom" conditional: has text, or always when reserve; role="alert only on error">{bottom}</div>
  </div>
  ```
-->
<script module lang="ts">
  export interface TagsInputFieldProps {
    label?: string;
    extra?: string;
    aux?: Snippet<[string[], string, HTMLInputElement | undefined]>; // Snippet<[values,variant,element]>
    left?: Snippet<[string[], string, HTMLInputElement | undefined]>; // Snippet<[values,variant,element]>
    right?: Snippet<[string[], string, HTMLInputElement | undefined]>; // Snippet<[values,variant,element]>
    bottom?: string;
    reserve?: boolean; // (false)
    flip?: boolean; // (false)
    values?: string[]; // bindable
    constraints?: TagsInputFieldConstraint[];
    validations?: TagsInputFieldValidation[];
    name?: string;
    element?: HTMLInputElement; // bindable
    styling?: SVSClass;
    variant?: SVSVariant; // bindable (VARIANT.NEUTRAL)
    children?: Snippet;
  }
  export type TagsInputFieldReqdProps = never;
  export type TagsInputFieldBindProps = "values" | "variant" | "element";
  export type TagsInputFieldConstraint = SVSFieldConstraint;
  export type TagsInputFieldValidation = SVSFieldValidation<string[]>;

  export const _TAGS_INPUT_FIELD_PRESET = "svs-tags-input-field";

  import { type Snippet, untrack } from "svelte";
  import { type SVSClass, type SVSVariant, type SVSFieldValidation, type SVSFieldConstraint, VARIANT, PARTS, fnClass, isNeutral } from "./core";
  import TagsInput, { _TAGS_INPUT_PRESET, _setTagsInputContext, type TagsInputContext } from "./_TagsInput.svelte";
</script>

<script lang="ts">
  // prettier-ignore
  let { label, extra, aux, left, right, bottom, reserve = false, flip = false, values = $bindable([]), constraints = [], validations = [], name, element = $bindable(), styling, variant = $bindable(VARIANT.NEUTRAL), children }: TagsInputFieldProps = $props();

  // *** Initialize *** //
  const cls = $derived(fnClass(_TAGS_INPUT_FIELD_PRESET, styling));
  const uid = $props.id();
  const id = $derived(label?.trim() ? `${uid}-ctrl` : undefined);
  const idLabel = $derived(label?.trim() ? `${uid}-label` : undefined);
  const idDesc = $derived(bottom?.trim() ? `${uid}-desc` : undefined);
  const idErr = $derived(idDesc ?? `${uid}-err`);
  let errmsg = $state("");
  let value = $state("");
  const message = $derived(variant === VARIANT.INACTIVE ? errmsg || bottom : bottom);
  const idMsg = $derived(variant === VARIANT.INACTIVE && message?.trim() ? idErr : undefined);

  // *** Initialize Context *** //
  const ctx: TagsInputContext = {
    get values() {
      return values;
    },
    set values(v) {
      values = v;
    },
    get value() {
      return value;
    },
    set value(v) {
      value = v;
    },
    get variant() {
      return variant;
    },
    set element(v: HTMLInputElement | undefined) {
      element = v;
    },
    get ariaErrMsgId() {
      return idMsg;
    },
    get styling() {
      return `${_TAGS_INPUT_FIELD_PRESET} ${_TAGS_INPUT_PRESET}`;
    },
    get id() {
      return id;
    },
    get describedby() {
      return idDesc;
    },
    events: { onadd },
    onchange,
    oninvalid,
  };
  _setTagsInputContext(ctx);

  // *** States *** //
  let neutral = isNeutral(variant) ? variant : VARIANT.NEUTRAL;
  $effect(() => {
    neutral = isNeutral(variant) ? variant : neutral;
  });
  const live = $derived(variant === VARIANT.INACTIVE ? "alert" : undefined);
  function shift(oninvalid: boolean = false, msg?: string) {
    const vmsg = element?.validationMessage ?? "";
    variant = getStatus(oninvalid, vmsg, msg);
    errmsg = msg ? msg : vmsg;
  }
  function getStatus(oninvalid: boolean, vmsg: string, msg?: string): string {
    if (msg || (oninvalid && vmsg)) return VARIANT.INACTIVE;
    if (!values.length || vmsg) return neutral;
    return VARIANT.ACTIVE;
  }
  function verify() {
    if (!element) return;
    for (const v of validations) {
      const msg = v({ value: values, validity: element.validity, element });
      if (msg) return element.setCustomValidity(msg);
    }
    element.setCustomValidity("");
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
  function onadd(detail: { values: string[]; added: string[] }): string[] | void {
    const value = detail.added[0];
    if (!value) return;
    variant = neutral;
    shift(false, check(value));
    if (variant === VARIANT.INACTIVE) return [];
  }
  function check(value: string): string | undefined {
    if (!element) return;
    for (const c of constraints) {
      const msg = c({ value, values, validity: element.validity, element });
      if (msg) return msg;
    }
  }
  function onchange(_ev: Event) {
    if (!isNeutral(variant)) shift();
  }
  function oninvalid(ev: Event) {
    ev.preventDefault();
    shift(true);
  }
  $effect(() => untrack(() => verify()));
</script>

<!---------------------------------------->

<div class={cls(PARTS.WHOLE, variant)} role="group" aria-labelledby={idLabel}>
  {#if label?.trim() || aux}
    <div class={cls(PARTS.TOP, variant)}>
      {@render lbl()}
      {#if aux}
        <span class={cls(PARTS.AUX, variant)}>{@render aux(values, variant, element)}</span>
      {/if}
    </div>
  {/if}
  {@render desc(flip)}
  <div class={cls(PARTS.MIDDLE, variant)}>
    {@render side(PARTS.LEFT, left)}
    {@render fnForm()}
    {#if children}{@render children()}{:else}<TagsInput />{/if}
    {@render side(PARTS.RIGHT, right)}
  </div>
  {@render desc(!flip)}
</div>

{#snippet lbl()}
  {#if label?.trim()}
    <label class={cls(PARTS.LABEL, variant)} for={id} id={idLabel}>
      {label}
      {#if extra?.trim()}
        <span class={cls(PARTS.EXTRA, variant)}>{extra}</span>
      {/if}
    </label>
  {/if}
{/snippet}
{#snippet side(area: string, body?: Snippet<[string[], string, HTMLInputElement | undefined]>)}
  {#if body}
    <span class={cls(area, variant)}>{@render body(values, variant, element)}</span>
  {/if}
{/snippet}
{#snippet desc(show: boolean)}
  {#if show && (reserve || message?.trim())}
    <div class={cls(PARTS.BOTTOM, variant)} id={idDesc ?? idErr} role={live}>{message}</div>
  {/if}
{/snippet}
{#snippet fnForm()}
  {#if name}
    {#each values as value}
      <input type="hidden" {name} {value} />
    {/each}
  {/if}
{/snippet}
