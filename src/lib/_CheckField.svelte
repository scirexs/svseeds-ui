<script module lang="ts">
  export type CheckFieldProps = {
    options: SvelteMap<string, string> | Map<string, string>,
    label?: string,
    extra?: string,
    aux?: Snippet<[string, string[], HTMLInputElement[] | undefined]>, // Snippet<[status,values,elements]>
    bottom?: string, // bindable
    values?: string[], // bindable
    multiple?: boolean, // <true>
    descFirst?: boolean, // <false>
    validations?: ((values: string[], validities?: ValidityState[]) => string)[],
    status?: string, // bindable <STATE.DEFAULT>
    style?: ClassRuleSet | string,
    attributes?: HTMLInputAttributes,
    action?: Action,
    elements?: HTMLInputElement[], // bindable
  };
  export type CheckFieldReqdProps = "options";
  export type CheckFieldBindProps = "bottom" | "values" | "status" | "elements";

  type CheckFieldTarget = { currentTarget: EventTarget & HTMLInputElement };
  const svs = "svs-check-field";
  const preset: ClassRuleSet = {};

  import { type Snippet, untrack } from "svelte";
  import { type Action } from "svelte/action";
  import { type SvelteMap } from "svelte/reactivity";
  import { type HTMLInputAttributes } from "svelte/elements";
  import { type ClassRuleSet, STATE, AREA, elemId, fnClass, isNeutral, omit } from "./core";
</script>

<script lang="ts">
  let { options, label, extra, aux, bottom = $bindable(), values = $bindable([]), multiple = true, descFirst = false, validations = [], status = $bindable(""), style, attributes, action, elements = $bindable([])}: CheckFieldProps = $props();

  // *** Initialize *** //
  if (!status) status = STATE.DEFAULT;
  const cls = fnClass(svs, preset, style);
  const type = multiple ? "checkbox" : "radio";
  const name = attributes?.["name"] ? attributes?.["name"] : elemId.id;
  const idLabel = elemId.get(label?.trim());
  const idDesc = elemId.get(bottom?.trim());
  const idErr = idDesc ?? elemId.id;
  const attrs = omit(attributes, "class", "id", "type", "name", "value", "onchange", "oninvalid");
  const roleGroup = multiple ? "group" : "radiogroup";
  const description = bottom;

  // *** Status *** //
  const phase = { change: false, submit: false };
  let neutral = isNeutral(status) ? status : STATE.DEFAULT;
  $effect(() => { neutral = isNeutral(status) ? status : neutral });
  let live = $derived(status === STATE.INACTIVE ? "alert" : "status");
  let invalid = $derived(status === STATE.INACTIVE ? true : undefined);
  let errMsg = $derived(status === STATE.INACTIVE ? idErr : undefined);
  const toInvalid = (msg?: string) => shiftStatus(phase.submit ? STATE.INACTIVE : neutral, msg);
  const toNonInvalid = () => shiftStatus(phase.change && values.length ? STATE.ACTIVE : neutral);
  function shiftStatus(stat: string, msg?: string) {
    status = stat;
    bottom = stat === STATE.INACTIVE ? msg ?? description : description;
    elements[0]?.setCustomValidity(msg ?? "");
  }
  function validate() {
    if (!values.length) return toNonInvalid();
    const validities = elements.map((x) => x.validity);
    for (const v of validations) {
      const msg = v(values, validities);
      if (msg) return toInvalid(msg);
    }
    toNonInvalid();
  }

  // *** Bind Handlers *** //
  let opts = $derived([...options.entries().map(([value, text]) => ({ value, text, checked: values.includes(value) }))]);
  $effect.pre(() => {
    values;
    untrack(() => validate());
  });

  // *** Event Handlers *** //
  function onchange(ev: Event & CheckFieldTarget) {
    attributes?.onchange?.(ev);
    values = elements.filter((elem) => elem.checked).map((elem) => elem.value);
    phase.change = true;
  }
  function oninvalid(ev: Event & CheckFieldTarget) {
    attributes?.oninvalid?.(ev);
    ev.preventDefault();
    phase.submit = true;
    if (status !== STATE.INACTIVE) toInvalid(elements[0]?.validationMessage);
  }
</script>

<!---------------------------------------->

{#if opts.length}
  <div class={cls(AREA.WHOLE, status)} role="group" aria-labelledby={idLabel}>
    {#if aux}
      <div class={cls(AREA.TOP, status)}>
        {@render lbl()}
        <span class={cls(AREA.AUX, status)}>{@render aux(status, values, elements)}</span>
      </div>
    {:else}
      {@render lbl()}
    {/if}
    {@render desc(descFirst)}
    {@render main()}
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
{#snippet main()}
  <div class={cls(AREA.MIDDLE, status)} role={roleGroup} aria-describedby={idDesc} aria-invalid={!multiple ? invalid : undefined} aria-errormessage={!multiple && bottom?.trim() ? errMsg : undefined}>
    {#each opts as {value, text, checked}, i (value)}
      <label class={cls(AREA.MAIN, status)}>
        {#if action}
          <input bind:this={elements[i]} class={cls(AREA.LEFT, status)} aria-invalid={multiple ? invalid : undefined} {value} {name} {type} {checked} {onchange} {oninvalid} {...attrs} use:action />
        {:else}
          <input bind:this={elements[i]} class={cls(AREA.LEFT, status)} aria-invalid={multiple ? invalid : undefined} {value} {name} {type} {checked} {onchange} {oninvalid} {...attrs} />
        {/if}
        <span class={cls(AREA.RIGHT, status)}>{text}</span>
      </label>
    {/each}
  </div>
{/snippet}
{#snippet desc(show: boolean)}
  {#if show && bottom?.trim()}
    <div class={cls(AREA.BOTTOM, status)} id={idDesc ?? idErr} role={live}>{bottom}</div>
  {/if}
{/snippet}
