<!--
  @component
  ### Types
  default value: *`(value)`*
  ```ts
  interface SelectFieldProps {
    options: SvelteMap<string, string> | Map<string, string>;
    label?: string;
    extra?: string;
    aux?: Snippet<[string, string, HTMLSelectElement | undefined]>; // Snippet<[value,variant,element]>
    left?: Snippet<[string, string, HTMLSelectElement | undefined]>; // Snippet<[value,variant,element]>
    right?: Snippet<[string, string, HTMLSelectElement | undefined]>; // Snippet<[value,variant,element]>
    bottom?: string;
    descFirst?: boolean; // (false)
    value?: string; // bindable
    validations?: SelectFieldValidation[];
    attributes?: HTMLSelectAttributes;
    action?: Action;
    element?: HTMLSelectElement; // bindable
    styling?: SVSClass;
    variant?: string; // bindable (VARIANT.NEUTRAL)
  }
  type SelectFieldValidation = (value: string, validity: ValidityState) => string | undefined;
  ```
  ### Anatomy
  ```svelte
  <div class="whole">
    <div class="top" conditional>
      <label class="label" conditional>
        {label}
        <span class="extra" conditional>{extra}</span>
      </label>
      <span class="aux" conditional>{aux}</span>
    </div>
    <div class="middle">
      <span class="left" conditional>{left}</span>
      <select class="main" {...attributes} bind:value bind:this={element} use:action>
        {#each options as { option, text }}
          <option value={option}>{text}</option>
        {/each}
      </select>
      <span class="right" conditional>{right}</span>
    </div>
    <div class="bottom" conditional>{bottom}</div>
  </div>
  ```
-->
<script module lang="ts">
  export interface SelectFieldProps {
    options: SvelteMap<string, string> | Map<string, string>;
    label?: string;
    extra?: string;
    aux?: Snippet<[string, string, HTMLSelectElement | undefined]>; // Snippet<[value,variant,element]>
    left?: Snippet<[string, string, HTMLSelectElement | undefined]>; // Snippet<[value,variant,element]>
    right?: Snippet<[string, string, HTMLSelectElement | undefined]>; // Snippet<[value,variant,element]>
    bottom?: string;
    descFirst?: boolean; // (false)
    value?: string; // bindable
    validations?: SelectFieldValidation[];
    attributes?: HTMLSelectAttributes;
    action?: Action;
    element?: HTMLSelectElement; // bindable
    styling?: SVSClass;
    variant?: string; // bindable (VARIANT.NEUTRAL)
  }
  export type SelectFieldReqdProps = "options";
  export type SelectFieldBindProps = "value" | "variant" | "element";
  export type SelectFieldValidation = (value: string, validity: ValidityState) => string | undefined;

  const preset = "svs-select-field";

  import { type Snippet, untrack } from "svelte";
  import { type Action } from "svelte/action";
  import { type SvelteMap } from "svelte/reactivity";
  import { type HTMLSelectAttributes } from "svelte/elements";
  import { type SVSClass, VARIANT, PARTS, elemId, fnClass, isNeutral, omit } from "./core";
</script>

<script lang="ts">
  let { options, label, extra, aux, left, right, bottom, descFirst = false, value = $bindable(""), validations = [], attributes, action, element = $bindable(), styling, variant = $bindable("") }: SelectFieldProps = $props();

  // *** Initialize *** //
  if (!variant) variant = VARIANT.NEUTRAL;
  const cls = fnClass(preset, styling);
  const id = attributes?.id ? attributes.id : elemId.get(label?.trim());
  const idLabel = elemId.get(label?.trim());
  const idDesc = elemId.get(bottom?.trim());
  const idErr = idDesc ?? elemId.id;
  const attrs = omit(attributes, "class", "id", "value", "oninvalid");
  let message = $state(bottom);

  // *** States *** //
  let neutral = isNeutral(variant) ? variant : VARIANT.NEUTRAL;
  $effect(() => { neutral = isNeutral(variant) ? variant : neutral; });
  let live = $derived(variant === VARIANT.INACTIVE ? "alert" : "status");
  let invalid = $derived(variant === VARIANT.INACTIVE ? true : undefined);
  let idMsg = $derived(variant === VARIANT.INACTIVE && message?.trim() ? idErr : undefined);
  function shift(oninvalid?: boolean) {
    const vmsg = element?.validationMessage ?? "";
    variant = !value && !oninvalid ? neutral : vmsg ? VARIANT.INACTIVE : VARIANT.ACTIVE;
    message = variant === VARIANT.INACTIVE ? vmsg ? vmsg : bottom : bottom;
  }
  function verify() {
    if (!element) return;
    for (const v of validations) {
      const msg = v(value, element.validity);
      if (msg) return element.setCustomValidity(msg);
    }
    element.setCustomValidity("");
  }

  // *** Bind Handlers *** //
  let opts = $derived([...options.entries().map(([val, text]) => ({ val, text, selected: val === value }))]);
  $effect.pre(() => {
    value;
    untrack(() => validate());
  });
  function validate() {
    verify();
    shift();
  }

  /*** Handle events ***/
  function oninvalid(ev: Event) {
    attributes?.oninvalid?.(ev as any);
    ev.preventDefault();
    shift(true);
  }
  $effect(() => untrack(() => verify()));
</script>

<!---------------------------------------->

{#if opts.length}
  <div class={cls(PARTS.WHOLE, variant)} role="group" aria-labelledby={idLabel}>
    {#if aux}
      <div class={cls(PARTS.TOP, variant)}>
        {@render lbl()}
        <span class={cls(PARTS.AUX, variant)}>{@render aux(value, variant, element)}</span>
      </div>
    {:else}
      {@render lbl()}
    {/if}
    {@render desc(descFirst)}
    <div class={cls(PARTS.MIDDLE, variant)}>
      {@render side(PARTS.LEFT, left)}
      {@render main()}
      {@render side(PARTS.RIGHT, right)}
    </div>
    {@render desc(!descFirst)}
  </div>
{/if}

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
{#snippet side(area: string, body?: Snippet<[string, string, HTMLSelectElement | undefined]>)}
  {#if body}
    <span class={cls(area, variant)}>{@render body(value, variant, element)}</span>
  {/if}
{/snippet}
{#snippet main()}
  {@const c = cls(PARTS.MAIN, variant)}
  {#if action}
    <select bind:value bind:this={element} class={c} {id} {oninvalid} {...attrs} aria-describedby={idDesc} aria-invalid={invalid} aria-errormessage={idMsg} use:action>
      {@render option()}
    </select>
  {:else}
    <select bind:value bind:this={element} class={c} {id} {oninvalid} {...attrs} aria-describedby={idDesc} aria-invalid={invalid} aria-errormessage={idMsg}>
      {@render option()}
    </select>
  {/if}
{/snippet}
{#snippet option()}
  {#each opts as { val, text, selected } (val)}
    <option value={val} {selected}>{text}</option>
  {/each}
{/snippet}
{#snippet desc(show: boolean)}
  {#if show && message?.trim()}
    <div class={cls(PARTS.BOTTOM, variant)} id={idDesc ?? idErr} role={live}>{message}</div>
  {/if}
{/snippet}
