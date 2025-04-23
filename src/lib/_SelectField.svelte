<script module lang="ts">
  export type SelectFieldProps = {
    options: SvelteMap<string, string> | Map<string, string>,
    label?: string,
    extra?: string,
    aux?: Snippet<[string, string, HTMLSelectElement | undefined]>, // Snippet<[status,value,element]>
    left?: Snippet<[string, string, HTMLSelectElement | undefined]>, // Snippet<[status,value,element]>
    right?: Snippet<[string, string, HTMLSelectElement | undefined]>, // Snippet<[status,value,element]>
    bottom?: string,
    value?: string, // bindable
    descFirst?: boolean, // <false>
    validations?: ((value: string, validity?: ValidityState) => string)[],
    status?: string, // bindable <STATE.DEFAULT>
    style?: ClassRuleSet | string,
    attributes?: HTMLSelectAttributes;
    action?: Action,
    element?: HTMLSelectElement, // bindable
  };
  export type SelectFieldReqdProps = "options";
  export type SelectFieldBindProps = "value" | "status" | "element";

  type SelectFieldTarget = { currentTarget: EventTarget & HTMLSelectElement };
  const svs = "svs-select-field";
  const preset: ClassRuleSet = {};

  import { type Snippet, untrack } from "svelte";
  import { type Action } from "svelte/action";
  import { type SvelteMap } from "svelte/reactivity";
  import { type HTMLSelectAttributes } from "svelte/elements";
  import { type ClassRuleSet, STATE, AREA, elemId, fnClass, isNeutral, omit } from "./core";
</script>

<script lang="ts">
  let { options, label, extra, aux, left, right, bottom, value = $bindable(""), descFirst = false, validations = [], status = $bindable(""), style, attributes, action, element = $bindable() }: SelectFieldProps = $props();

  // *** Initialize *** //
  if (!status) status = STATE.DEFAULT;
  const cls = fnClass(svs, preset, style);
  const id = attributes?.id ? attributes.id : elemId.get(label?.trim());
  const idLabel = elemId.get(label?.trim());
  const idDesc = elemId.get(bottom?.trim());
  const idErr = idDesc ?? elemId.id;
  const attrs = omit(attributes, "class", "id", "value", "oninvalid");
  let message = $state(bottom);

  // *** Status *** //
  let neutral = isNeutral(status) ? status : STATE.DEFAULT;
  $effect(() => { neutral = isNeutral(status) ? status : neutral });
  let live = $derived(status === STATE.INACTIVE ? "alert" : "status");
  let invalid = $derived(status === STATE.INACTIVE ? true : undefined);
  let errMsg = $derived(status === STATE.INACTIVE ? idErr : undefined);
  const toInvalid = (msg?: string) => shiftStatus(STATE.INACTIVE, msg);
  const toNonInvalid = (stat: string) => shiftStatus(stat);
  function shiftStatus(stat: string, msg?: string) {
    status = stat;
    message = msg ?? bottom;
    element?.setCustomValidity(msg ?? "");
  }
  function validate() {
    if (!value) return toNonInvalid(neutral);
    for (const v of validations) {
      const msg = v(value, element?.validity);
      if (msg) return toInvalid(msg);
    }
    toNonInvalid(STATE.ACTIVE);
  }

  // *** Bind Handlers *** //
  let opts = $derived([...options.entries().map(([val, text]) => ({ val, text, selected: val === value }))]);
  $effect.pre(() => {
    value;
    untrack(() => validate());
  });

  /*** Handle events ***/
  function oninvalid(ev: Event & SelectFieldTarget) {
    attributes?.oninvalid?.(ev);
    ev.preventDefault();
    validate();
    if (status !== STATE.INACTIVE) toInvalid(element?.validationMessage);
  }
</script>

<!---------------------------------------->

{#if opts.length}
  <div class={cls(AREA.WHOLE, status)} role="group" aria-labelledby={idLabel}>
    {#if aux}
      <div class={cls(AREA.TOP, status)}>
        {@render lbl()}
        <span class={cls(AREA.AUX, status)}>{@render aux(status, value, element)}</span>
      </div>
    {:else}
      {@render lbl()}
    {/if}
    {@render desc(descFirst)}
    <div class={cls(AREA.MIDDLE, status)}>
      {@render side(AREA.LEFT, left)}
      {@render main()}
      {@render side(AREA.RIGHT, right)}
    </div>
    {@render desc(!descFirst)}
  </div>
{/if}

{#snippet lbl()}
  {#if label?.trim()}
    <span class={cls(AREA.LABEL, status)} id={idLabel}>
      {label}
      {#if extra?.trim()}
        <span class={cls(AREA.EXTRA, status)}>{extra}</span>
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
  {@const c = cls(AREA.MAIN, status)}
  {@const msg = message?.trim() ? errMsg : undefined}
  {#if action}
    <select bind:value bind:this={element} class={c} {id} {oninvalid} {...attrs} aria-describedby={idDesc} aria-invalid={invalid} aria-errormessage={msg} use:action>
      {@render option()}
    </select>
  {:else}
    <select bind:value bind:this={element} class={c} {id} {oninvalid} {...attrs} aria-describedby={idDesc} aria-invalid={invalid} aria-errormessage={msg}>
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
    <div class={cls(AREA.BOTTOM, status)} id={idDesc ?? idErr} role={live}>{message}</div>
  {/if}
{/snippet}
