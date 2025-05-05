<script module lang="ts">
  export type CheckFieldProps = {
    options: SvelteMap<string, string> | Map<string, string>,
    label?: string,
    extra?: string,
    aux?: Snippet<[string, string[], HTMLInputElement[]]>, // Snippet<[status,values,elements]>
    bottom?: string,
    descFirst?: boolean, // <false>
    values?: string[], // bindable
    multiple?: boolean, // <true>
    validations?: CheckFieldValidation[],
    status?: string, // bindable <STATE.DEFAULT>
    style?: SVSStyle,
    attributes?: HTMLInputAttributes,
    action?: Action,
    elements?: HTMLInputElement[], // bindable
  };
  export type CheckFieldReqdProps = "options";
  export type CheckFieldBindProps = "values" | "status" | "elements";
  export type CheckFieldValidation = (values: string[], validity: ValidityState) => string;

  const preset = "svs-check-field";

  import { type Snippet, untrack } from "svelte";
  import { type Action } from "svelte/action";
  import { type SvelteMap } from "svelte/reactivity";
  import { type HTMLInputAttributes } from "svelte/elements";
  import { type SVSStyle, STATE, AREA, elemId, fnClass, isNeutral, omit } from "./core";
</script>

<script lang="ts">
  let { options, label, extra, aux, bottom, values = $bindable([]), multiple = true, descFirst = false, validations = [], status = $bindable(""), style, attributes, action, elements = $bindable([])}: CheckFieldProps = $props();

  // *** Initialize *** //
  if (!status) status = STATE.DEFAULT;
  const cls = fnClass(preset, style);
  const type = multiple ? "checkbox" : "radio";
  const name = attributes?.["name"] ? attributes?.["name"] : elemId.id;
  const idLabel = elemId.get(label?.trim());
  const idDesc = elemId.get(bottom?.trim());
  const idErr = idDesc ?? elemId.id;
  const attrs = omit(attributes, "class", "id", "type", "name", "value", "onchange", "oninvalid");
  const roleGroup = multiple ? "group" : "radiogroup";
  let message = $state(bottom);

  // *** Status *** //
  let neutral = $state(isNeutral(status) ? status : STATE.DEFAULT);
  $effect(() => { neutral = isNeutral(status) ? status : neutral });
  let live = $derived(status === STATE.INACTIVE ? "alert" : "status");
  let invalid = $derived(status === STATE.INACTIVE ? true : undefined);
  let idMsg = $derived(status === STATE.INACTIVE && message?.trim() ? idErr : undefined);
  function shift(oninvalid?: boolean) {
    const vmsg = elements[0]?.validationMessage ?? "";
    status = oninvalid && vmsg ? STATE.INACTIVE : (!values.length || vmsg) ? neutral : STATE.ACTIVE;
    message = status === STATE.INACTIVE ? vmsg ? vmsg : bottom : bottom;
  }
  function verify() {
    if (!elements[0]) return;
    for (const v of validations) {
      const msg = v(values, elements[0].validity);
      if (msg) return elements[0].setCustomValidity(msg);
    }
    elements[0].setCustomValidity("");
  }

  // *** Bind Handlers *** //
  let opts = $derived([...options.entries().map(([value, text]) => ({ value, text, checked: values.includes(value) }))]);
  $effect.pre(() => {
    values;
    untrack(() => validate());
  });
  function validate() {
    verify();
    shift();
  }

  // *** Event Handlers *** //
  function onchange(ev: Event) {
    attributes?.onchange?.(ev as any);
    values = elements.filter((el) => el.checked).map((el) => el.value);
  }
  function oninvalid(ev: Event) {
    attributes?.oninvalid?.(ev as any);
    ev.preventDefault();
    shift(true);
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
  <div class={cls(AREA.MIDDLE, status)} role={roleGroup} aria-describedby={idDesc} aria-invalid={!multiple ? invalid : undefined} aria-errormessage={!multiple ? idMsg : undefined}>
    {#each opts as {value, text, checked}, i (value)}
      {@const stat = checked ? STATE.ACTIVE : neutral}
      <label class={cls(AREA.MAIN, stat)}>
        {#if action}
          <input bind:this={elements[i]} class={cls(AREA.LEFT, stat)} aria-invalid={multiple ? invalid : undefined} aria-errormessage={multiple ? idMsg : undefined} {value} {name} {type} {checked} {onchange} {oninvalid} {...attrs} use:action />
        {:else}
          <input bind:this={elements[i]} class={cls(AREA.LEFT, stat)} aria-invalid={multiple ? invalid : undefined} aria-errormessage={multiple ? idMsg : undefined} {value} {name} {type} {checked} {onchange} {oninvalid} {...attrs} />
        {/if}
        <span class={cls(AREA.RIGHT, stat)}>{text}</span>
      </label>
    {/each}
  </div>
{/snippet}
{#snippet desc(show: boolean)}
  {#if show && message?.trim()}
    <div class={cls(AREA.BOTTOM, status)} id={idDesc ?? idErr} role={live}>{message}</div>
  {/if}
{/snippet}
