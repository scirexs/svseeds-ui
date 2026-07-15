<!--
  @component
  ### Usage
  Use standalone, or wrap `NumberInput` to share state.
  ```svelte
  <NumberField {...props} />

  <NumberField {...props}>
    <NumberInput {...props} />
  </NumberField>
  ```
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
    value?: number; // bindable; undefined = empty
    validations?: NumberFieldValidation[];
    name?: string;
    element?: HTMLInputElement; // bindable
    styling?: SVSClass;
    variant?: SVSVariant; // bindable (VARIANT.NEUTRAL)
    numberInput?: Omit<NumberInputProps, NumberInputReqdProps | NumberInputBindProps | "name" | "variant">; // default <NumberInput/> props
    children?: Snippet;
  }
  type NumberFieldValidation = SVSFieldValidation<number | undefined>;
  // `numberInput` configures the default `<NumberInput/>` only; when `children` is provided the bag is ignored and the child control owns its own props.
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
    value?: number; // bindable; undefined = empty
    validations?: NumberFieldValidation[];
    name?: string;
    element?: HTMLInputElement; // bindable
    styling?: SVSClass;
    variant?: SVSVariant; // bindable (VARIANT.NEUTRAL)
    numberInput?: Omit<NumberInputProps, NumberInputReqdProps | NumberInputBindProps | "name" | "variant">; // default <NumberInput/> props
    children?: Snippet;
  }
  export type NumberFieldReqdProps = never;
  export type NumberFieldBindProps = "value" | "variant" | "element";
  export type NumberFieldValidation = SVSFieldValidation<number | undefined>;

  export const _NUMBER_FIELD_PRESET = "svs-number-field";

  import { onMount, untrack } from "svelte";
  import { VARIANT, PARTS, _fieldAria, _fieldIds, _fieldMessage, _fnClass, _isNeutral, _verify } from "./_core";
  import NumberInput, { _NUMBER_INPUT_PRESET, _setNumberInputContext } from "./NumberInput.svelte";
  import type { Snippet } from "svelte";
  import type { SVSClass, SVSVariant, SVSFieldValidation } from "./_core";
  import type { NumberInputContext, NumberInputProps, NumberInputReqdProps, NumberInputBindProps } from "./NumberInput.svelte";
</script>

<script lang="ts">
  // prettier-ignore
  let { label, extra, aux, left, right, bottom, reserve = false, value = $bindable(), validations = [], name, element = $bindable(), styling, variant = $bindable(VARIANT.NEUTRAL), numberInput, children }: NumberFieldProps = $props();

  // *** Initialize *** //
  const cls = $derived(_fnClass(_NUMBER_FIELD_PRESET, styling));
  const uid = $props.id();
  const id = $derived(label?.trim() ? `${uid}-ctrl` : undefined);
  const ids = $derived(_fieldIds(uid, label, bottom));
  const idLabel = $derived(ids.idLabel);
  const idDesc = $derived(ids.idDesc);
  const idErr = $derived(ids.idErr);
  let errmsg = $state("");
  const message = $derived(_fieldMessage(variant, errmsg, bottom));
  const aria = $derived(_fieldAria(variant, message, idErr));
  const idMsg = $derived(aria.idMsg);

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
  let neutral = _isNeutral(variant) ? variant : VARIANT.NEUTRAL;
  $effect(() => {
    neutral = _isNeutral(variant) ? variant : neutral;
  });
  const live = $derived(aria.live);
  function shift(oninvalid?: boolean) {
    const vmsg = element?.validationMessage ?? "";
    variant = value === undefined && !oninvalid ? neutral : vmsg ? VARIANT.INACTIVE : VARIANT.ACTIVE;
    errmsg = vmsg;
  }
  function verify() {
    _verify(element, validations, value);
  }

  // *** Reactive Handlers *** //
  $effect(() => {
    value;
    untrack(() => validate(true));
  });
  function validate(effect?: boolean) {
    if (effect && _isNeutral(variant)) return;
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
  <div class={cls(PARTS.MIDDLE, variant)}>
    {@render side(PARTS.LEFT, left)}
    {#if children}
      {@render children()}
    {:else}
      <NumberInput {...numberInput} {name} />
    {/if}
    {@render side(PARTS.RIGHT, right)}
  </div>
  {#if reserve || message?.trim()}
    <div class={cls(PARTS.BOTTOM, variant)} id={idErr} role={live}>{message}</div>
  {/if}
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
