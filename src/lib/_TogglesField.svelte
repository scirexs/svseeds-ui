<script module lang="ts">
  export type TogglesFieldProps = {
    options: SvelteMap<string, string> | Map<string, string>,
    label?: string,
    extra?: string,
    aux?: Snippet<[string, string[], HTMLButtonElement[] | undefined]>, // Snippet<[status,values,elements]>
    bottom?: string, // bindable
    values?: string[], // bindable
    multiple?: boolean, // <true>
    descFirst?: boolean, // <false>
    validations?: ((values: string[], validities?: ValidityState[]) => string)[],
    status?: string, // bindable <STATE.DEFAULT>
    style?: ClassRuleSet | string,
    attributes?: HTMLButtonAttributes;
    action?: Action,
    elements?: HTMLButtonElement[], // bindable
  };
  export type TogglesFieldReqdProps = "options";
  export type TogglesFieldBindProps = "bottom" | "values" | "status" | "elements";

  type TogglesFieldTarget = { currentTarget: EventTarget & HTMLButtonElement };
  const svs = "svs-toggles-field";
  const preset: ClassRuleSet = {};

  import { type Snippet, untrack } from "svelte";
  import { type Action } from "svelte/action";
  import { type SvelteMap } from "svelte/reactivity";
  import { type HTMLButtonAttributes } from "svelte/elements";
  import { type ClassRuleSet, STATE, AREA, elemId, fnClass, isNeutral, omit } from "./core";
</script>

<script lang="ts">
  let { options, label, extra, aux, bottom = $bindable(), values = $bindable([]), multiple = true, descFirst = false, validations = [], status = $bindable(""), style, attributes, action, elements = $bindable([]) }: TogglesFieldProps = $props();

  // *** Initialize *** //
  if (!status) status = STATE.DEFAULT;
  const cls = fnClass(svs, preset, style);
  const role = multiple ? "checkbox" : "radio";
  const idLabel = elemId.get(label?.trim());
  const idDesc = elemId.get(bottom?.trim());
  const idErr = idDesc ?? elemId.id;
  const attrs = omit(attributes, "class", "id", "type", "role", "aria-checked", "onclick", "oninvalid");
  const roleGroup = multiple ? "group" : "radiogroup";
  const description = bottom;
  let elem: HTMLInputElement | undefined = $state();

  // *** Status *** //
  const phase = { change: false, submit: false };
  let neutral = isNeutral(status) ? status : STATE.DEFAULT;
  $effect(() => { neutral = isNeutral(status) ? status : neutral });
  let alert = $derived(status === STATE.INACTIVE ? "alert" : undefined);
  let invalid = $derived(status === STATE.INACTIVE ? true : undefined);
  let errMsg = $derived(status === STATE.INACTIVE ? idErr : undefined);
  const toInvalid = (msg?: string) => shiftStatus(phase.submit ? STATE.INACTIVE : neutral, msg);
  const toNonInvalid = () => shiftStatus(phase.change && values.length ? STATE.ACTIVE : neutral);
  function shiftStatus(stat: string, msg?: string) {
    status = stat;
    bottom = stat === STATE.INACTIVE ? msg ?? description : description;
    elem?.setCustomValidity(msg ?? "");
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
  function updateValues(value: string): (ev: MouseEvent & TogglesFieldTarget) => void {
    return (ev) => {
      if (!multiple) return values = [value];
      values = values.includes(value) ? values.filter((x) => x !== value) : opts.map((x) => x.value).filter((x) => [...values, value].includes(x));
      attributes?.onclick?.(ev);
      phase.change = true;
    };
  }
  function oninvalid(ev: Event) {
    attributes?.oninvalid?.(ev as any);
    ev.preventDefault();
    phase.submit = true;
    if (status !== STATE.INACTIVE) toInvalid(elem?.validationMessage);
  }
</script>

<!---------------------------------------->

{#if opts.length}
  {#if label?.trim() || aux || bottom?.trim()}
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
  {:else}
    {@render main()}
  {/if}
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
  {@const c = cls(AREA.MAIN, status)}
  <input bind:this={elem} style="display: none;" aria-hidden="true" {oninvalid} />
  <div class={cls(AREA.MIDDLE, status)} role={roleGroup} aria-describedby={idDesc} aria-invalid={!multiple ? invalid : undefined} aria-errormessage={!multiple && bottom?.trim() ? errMsg : undefined}>
    {#each opts as { value, text, checked }, i (value)}
      {#if action}
        <button bind:this={elements[i]} class={c} aria-checked={checked} aria-invalid={multiple ? invalid : undefined} onclick={updateValues(value)} type="button" {role} {...attrs} use:action>
          {text}
        </button>
      {:else}
        <button bind:this={elements[i]} class={c} aria-checked={checked} aria-invalid={multiple ? invalid : undefined} onclick={updateValues(value)} type="button" {role} {...attrs}>
          {text}
        </button>
      {/if}
    {/each}
  </div>
{/snippet}
{#snippet desc(show: boolean)}
  {#if show && bottom?.trim()}
    <div class={cls(AREA.BOTTOM, status)} id={idDesc ?? idErr} role={alert}>{bottom}</div>
  {/if}
{/snippet}
