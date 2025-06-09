<!--
  @component
  default value: `(value)`
  ```ts
  interface SelectFieldProps {
    options: SvelteMap<string, string> | Map<string, string>;
    label?: string;
    extra?: string;
    aux?: Snippet<[string, string, HTMLSelectElement | undefined]>; // Snippet<[status,value,element]>
    left?: Snippet<[string, string, HTMLSelectElement | undefined]>; // Snippet<[status,value,element]>
    right?: Snippet<[string, string, HTMLSelectElement | undefined]>; // Snippet<[status,value,element]>
    bottom?: string;
    descFirst?: boolean; // (false)
    value?: string; // bindable
    validations?: SelectFieldValidation[];
    status?: string; // bindable (STATE.NEUTRAL)
    style?: SVSStyle;
    attributes?: HTMLSelectAttributes;
    action?: Action;
    element?: HTMLSelectElement; // bindable
  }
  type SelectFieldValidation = (value: string, validity: ValidityState) => string | undefined;
  ```
-->
<script module lang="ts">
  export interface SelectFieldProps {
    options: SvelteMap<string, string> | Map<string, string>;
    label?: string;
    extra?: string;
    aux?: Snippet<[string, string, HTMLSelectElement | undefined]>; // Snippet<[status,value,element]>
    left?: Snippet<[string, string, HTMLSelectElement | undefined]>; // Snippet<[status,value,element]>
    right?: Snippet<[string, string, HTMLSelectElement | undefined]>; // Snippet<[status,value,element]>
    bottom?: string;
    descFirst?: boolean; // (false)
    value?: string; // bindable
    validations?: SelectFieldValidation[];
    status?: string; // bindable (STATE.NEUTRAL)
    style?: SVSStyle;
    attributes?: HTMLSelectAttributes;
    action?: Action;
    element?: HTMLSelectElement; // bindable
  }
  export type SelectFieldReqdProps = "options";
  export type SelectFieldBindProps = "value" | "status" | "element";
  export type SelectFieldValidation = (value: string, validity: ValidityState) => string | undefined;

  const preset = "svs-select-field";

  import { type Snippet, untrack } from "svelte";
  import { type Action } from "svelte/action";
  import { type SvelteMap } from "svelte/reactivity";
  import { type HTMLSelectAttributes } from "svelte/elements";
  import { type SVSStyle, STATE, PARTS, elemId, fnClass, isNeutral, omit } from "./core";
</script>

<script lang="ts">
  let { options, label, extra, aux, left, right, bottom, descFirst = false, value = $bindable(""), validations = [], status = $bindable(""), style, attributes, action, element = $bindable() }: SelectFieldProps = $props();

  // *** Initialize *** //
  if (!status) status = STATE.NEUTRAL;
  const cls = fnClass(preset, style);
  const id = attributes?.id ? attributes.id : elemId.get(label?.trim());
  const idLabel = elemId.get(label?.trim());
  const idDesc = elemId.get(bottom?.trim());
  const idErr = idDesc ?? elemId.id;
  const attrs = omit(attributes, "class", "id", "value", "oninvalid");
  let message = $state(bottom);

  // *** Status *** //
  let neutral = isNeutral(status) ? status : STATE.NEUTRAL;
  $effect(() => { neutral = isNeutral(status) ? status : neutral; });
  let live = $derived(status === STATE.INACTIVE ? "alert" : "status");
  let invalid = $derived(status === STATE.INACTIVE ? true : undefined);
  let idMsg = $derived(status === STATE.INACTIVE && message?.trim() ? idErr : undefined);
  function shift(oninvalid?: boolean) {
    const vmsg = element?.validationMessage ?? "";
    status = !value && !oninvalid ? neutral : vmsg ? STATE.INACTIVE : STATE.ACTIVE;
    message = status === STATE.INACTIVE ? vmsg ? vmsg : bottom : bottom;
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
  <div class={cls(PARTS.WHOLE, status)} role="group" aria-labelledby={idLabel}>
    {#if aux}
      <div class={cls(PARTS.TOP, status)}>
        {@render lbl()}
        <span class={cls(PARTS.AUX, status)}>{@render aux(status, value, element)}</span>
      </div>
    {:else}
      {@render lbl()}
    {/if}
    {@render desc(descFirst)}
    <div class={cls(PARTS.MIDDLE, status)}>
      {@render side(PARTS.LEFT, left)}
      {@render main()}
      {@render side(PARTS.RIGHT, right)}
    </div>
    {@render desc(!descFirst)}
  </div>
{/if}

{#snippet lbl()}
  {#if label?.trim()}
    <span class={cls(PARTS.LABEL, status)} id={idLabel}>
      {label}
      {#if extra?.trim()}
        <span class={cls(PARTS.EXTRA, status)}>{extra}</span>
      {/if}
    </span>
  {/if}
{/snippet}
{#snippet side(area: string, body?: Snippet<[string, string, HTMLSelectElement | undefined]>)}
  {#if body}
    <span class={cls(area, status)}>{@render body(status, value, element)}</span>
  {/if}
{/snippet}
{#snippet main()}
  {@const c = cls(PARTS.MAIN, status)}
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
    <div class={cls(PARTS.BOTTOM, status)} id={idDesc ?? idErr} role={live}>{message}</div>
  {/if}
{/snippet}
