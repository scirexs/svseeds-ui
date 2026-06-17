<!--
  @component
  ### Types
  default value: *`(value)`*
  ```ts
  interface NumberFieldProps {
    label?: string;
    extra?: string;
    aux?: Snippet<[number | undefined, string, HTMLInputElement | undefined]>; // Snippet<[value,variant,element]>
    left?: Snippet<[number | undefined, string, HTMLInputElement | undefined]>; // Snippet<[value,variant,element]>
    right?: Snippet<[number | undefined, string, HTMLInputElement | undefined]>; // Snippet<[value,variant,element]>
    bottom?: string;
    reserve?: boolean; // (false)
    flip?: boolean; // (false)
    value?: number; // bindable; undefined = empty
    min?: number;
    max?: number;
    step?: number; // (1)
    integer?: boolean; // (false)
    spin?: boolean; // (false)
    stack?: boolean; // (false)
    options?: SvelteSet<number> | Set<number>;
    ariaDecLabel?: string;
    ariaIncLabel?: string;
    decrement?: Snippet<[string]>; // Snippet<[variant]> spin decrement button content
    increment?: Snippet<[string]>; // Snippet<[variant]> spin increment button content
    validations?: NumberFieldValidation[];
    name?: string;
    element?: HTMLInputElement; // bindable
    styling?: SVSClass;
    variant?: SVSVariant; // bindable (VARIANT.NEUTRAL)
    children?: Snippet;
  }
  type NumberFieldValidation = SVSFieldValidation<number | undefined>;
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
      {#if children}{@render children()}{:else}<NumberInput />{/if}
      <span class="right" conditional>{right}</span>
    </div>
    <div class="bottom" conditional: has text, or always when reserve; role="alert only on error">{bottom}</div>
  </div>
  ```
-->
<script module lang="ts">
  export interface NumberFieldProps {
    label?: string;
    extra?: string;
    aux?: Snippet<[number | undefined, string, HTMLInputElement | undefined]>; // Snippet<[value,variant,element]>
    left?: Snippet<[number | undefined, string, HTMLInputElement | undefined]>; // Snippet<[value,variant,element]>
    right?: Snippet<[number | undefined, string, HTMLInputElement | undefined]>; // Snippet<[value,variant,element]>
    bottom?: string;
    reserve?: boolean; // (false)
    flip?: boolean; // (false)
    value?: number; // bindable; undefined = empty
    min?: number;
    max?: number;
    step?: number; // (1)
    integer?: boolean; // (false)
    spin?: boolean; // (false)
    stack?: boolean; // (false)
    options?: SvelteSet<number> | Set<number>;
    ariaDecLabel?: string;
    ariaIncLabel?: string;
    decrement?: Snippet<[string]>; // Snippet<[variant]> spin decrement button content
    increment?: Snippet<[string]>; // Snippet<[variant]> spin increment button content
    validations?: NumberFieldValidation[];
    name?: string;
    element?: HTMLInputElement; // bindable
    styling?: SVSClass;
    variant?: SVSVariant; // bindable (VARIANT.NEUTRAL)
    children?: Snippet;
  }
  export type NumberFieldReqdProps = never;
  export type NumberFieldBindProps = "value" | "variant" | "element";
  export type NumberFieldValidation = SVSFieldValidation<number | undefined>;

  export const _NUMBER_FIELD_PRESET = "svs-number-field";

  import { onMount, untrack } from "svelte";
  import { VARIANT, PARTS, fnClass, isNeutral } from "./core";
  import NumberInput, { _NUMBER_INPUT_PRESET, _setNumberInputContext } from "./NumberInput.svelte";
  import type { Snippet } from "svelte";
  import type { SvelteSet } from "svelte/reactivity";
  import type { SVSClass, SVSVariant, SVSFieldValidation } from "./core";
  import type { NumberInputContext } from "./NumberInput.svelte";
</script>

<script lang="ts">
  // prettier-ignore
  let { label, extra, aux, left, right, bottom, reserve = false, flip = false, value = $bindable(), min, max, step = 1, integer = false, spin = false, stack = false, options, ariaDecLabel, ariaIncLabel, decrement, increment, validations = [], name, element = $bindable(), styling, variant = $bindable(VARIANT.NEUTRAL), children }: NumberFieldProps = $props();

  // *** Initialize *** //
  const cls = $derived(fnClass(_NUMBER_FIELD_PRESET, styling));
  const uid = $props.id();
  const id = $derived(label?.trim() ? `${uid}-ctrl` : undefined);
  const idLabel = $derived(label?.trim() ? `${uid}-label` : undefined);
  const idDesc = $derived(bottom?.trim() ? `${uid}-desc` : undefined);
  const idErr = $derived(idDesc ?? `${uid}-err`);
  let errmsg = $state("");
  const message = $derived(variant === VARIANT.INACTIVE ? errmsg || bottom : bottom);
  const idMsg = $derived(variant === VARIANT.INACTIVE && message?.trim() ? idErr : undefined);

  // *** Initialize Context *** //
  const ctx: NumberInputContext = {
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
      return `${_NUMBER_FIELD_PRESET} ${_NUMBER_INPUT_PRESET}`;
    },
    get id() {
      return id;
    },
    get describedby() {
      return idDesc;
    },
    onchange,
    oninvalid,
  };
  _setNumberInputContext(ctx);

  // *** States *** //
  let neutral = isNeutral(variant) ? variant : VARIANT.NEUTRAL;
  $effect(() => {
    neutral = isNeutral(variant) ? variant : neutral;
  });
  const live = $derived(variant === VARIANT.INACTIVE ? "alert" : undefined);
  function shift(oninvalid?: boolean) {
    const vmsg = element?.validationMessage ?? "";
    variant = value === undefined && !oninvalid ? neutral : vmsg ? VARIANT.INACTIVE : VARIANT.ACTIVE;
    errmsg = vmsg;
  }
  function verify() {
    if (!element) return;
    for (const v of validations) {
      const msg = v({ value, validity: element.validity, element });
      if (msg) return element.setCustomValidity(msg);
    }
    element.setCustomValidity("");
  }

  // *** Reactive Handlers *** //
  $effect.pre(() => {
    value;
    untrack(() => validate(true));
  });
  function validate(effect?: boolean) {
    if (effect && isNeutral(variant)) return;
    verify();
    shift();
  }

  // *** Event Handlers *** //
  function onchange(_ev: Event) {
    validate();
  }
  function oninvalid(ev: Event) {
    ev.preventDefault();
    shift(true);
  }
  onMount(() => verify());
</script>

<!---------------------------------------->

<div class={cls(PARTS.WHOLE, variant)} role="group" aria-labelledby={idLabel}>
  {#if label?.trim() || aux}
    <div class={cls(PARTS.TOP, variant)}>
      {@render lbl()}
      {#if aux}
        <span class={cls(PARTS.AUX, variant)}>{@render aux(value, variant, element)}</span>
      {/if}
    </div>
  {/if}
  {@render desc(flip)}
  <div class={cls(PARTS.MIDDLE, variant)}>
    {@render side(PARTS.LEFT, left)}
    {#if children}
      {@render children()}
    {:else}
      <NumberInput {min} {max} {step} {integer} {spin} {stack} {options} {ariaDecLabel} {ariaIncLabel} {decrement} {increment} {name} />
    {/if}
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
{#snippet side(area: string, body?: Snippet<[number | undefined, string, HTMLInputElement | undefined]>)}
  {#if body}
    <span class={cls(area, variant)}>{@render body(value, variant, element)}</span>
  {/if}
{/snippet}
{#snippet desc(show: boolean)}
  {#if show && (reserve || message?.trim())}
    <div class={cls(PARTS.BOTTOM, variant)} id={idDesc ?? idErr} role={live}>{message}</div>
  {/if}
{/snippet}
