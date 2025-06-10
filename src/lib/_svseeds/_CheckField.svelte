<!--
  @component
  default value: `(value)`
  ```ts
  interface CheckFieldProps {
    options: SvelteMap<string, string> | Map<string, string>;
    label?: string;
    extra?: string;
    aux?: Snippet<[string[], string, HTMLInputElement[]]>; // Snippet<[values,variant,elements]>
    bottom?: string;
    descFirst?: boolean; // (false)
    values?: string[]; // bindable
    multiple?: boolean; // (true)
    validations?: CheckFieldValidation[];
    attributes?: HTMLInputAttributes;
    action?: Action;
    elements?: HTMLInputElement[]; // bindable
    styling?: SVSClass;
    variant?: string; // bindable (VARIANT.NEUTRAL)
  }
  type CheckFieldValidation = (values: string[], validity: ValidityState) => string | undefined;
  ```
-->
<script module lang="ts">
  export interface CheckFieldProps {
    options: SvelteMap<string, string> | Map<string, string>;
    label?: string;
    extra?: string;
    aux?: Snippet<[string[], string, HTMLInputElement[]]>; // Snippet<[values,variant,elements]>
    bottom?: string;
    descFirst?: boolean; // (false)
    values?: string[]; // bindable
    multiple?: boolean; // (true)
    validations?: CheckFieldValidation[];
    attributes?: HTMLInputAttributes;
    action?: Action;
    elements?: HTMLInputElement[]; // bindable
    styling?: SVSClass;
    variant?: string; // bindable (VARIANT.NEUTRAL)
  }
  export type CheckFieldReqdProps = "options";
  export type CheckFieldBindProps = "values" | "variant" | "elements";
  export type CheckFieldValidation = (values: string[], validity: ValidityState) => string | undefined;

  const preset = "svs-check-field";

  import { type Snippet, untrack } from "svelte";
  import { type Action } from "svelte/action";
  import { type SvelteMap } from "svelte/reactivity";
  import { type HTMLInputAttributes } from "svelte/elements";
  import { type SVSClass, VARIANT, PARTS, elemId, fnClass, isNeutral, omit } from "./core";
</script>

<script lang="ts">
  let { options, label, extra, aux, bottom, values = $bindable([]), multiple = true, descFirst = false, validations = [], attributes, action, elements = $bindable([]), styling, variant = $bindable("") }: CheckFieldProps = $props();

  // *** Initialize *** //
  if (!variant) variant = VARIANT.NEUTRAL;
  const cls = fnClass(preset, styling);
  const type = multiple ? "checkbox" : "radio";
  const name = attributes?.["name"] ? attributes?.["name"] : elemId.id;
  const idLabel = elemId.get(label?.trim());
  const idDesc = elemId.get(bottom?.trim());
  const idErr = idDesc ?? elemId.id;
  const attrs = omit(attributes, "class", "id", "type", "name", "value", "onchange", "oninvalid");
  const roleGroup = multiple ? "group" : "radiogroup";
  let message = $state(bottom);

  // *** Status *** //
  let neutral = $state(isNeutral(variant) ? variant : VARIANT.NEUTRAL);
  $effect(() => { neutral = isNeutral(variant) ? variant : neutral });
  let live = $derived(variant === VARIANT.INACTIVE ? "alert" : "status");
  let invalid = $derived(variant === VARIANT.INACTIVE ? true : undefined);
  let idMsg = $derived(variant === VARIANT.INACTIVE && message?.trim() ? idErr : undefined);
  function shift(oninvalid?: boolean) {
    const vmsg = elements[0]?.validationMessage ?? "";
    variant = oninvalid && vmsg ? VARIANT.INACTIVE : (!values.length || vmsg) ? neutral : VARIANT.ACTIVE;
    message = variant === VARIANT.INACTIVE ? vmsg ? vmsg : bottom : bottom;
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
  $effect(() => untrack(() => verify()));
</script>

<!---------------------------------------->

{#if opts.length}
  <div class={cls(PARTS.WHOLE, variant)} role="group" aria-labelledby={idLabel}>
    {#if aux}
      <div class={cls(PARTS.TOP, variant)}>
        {@render lbl()}
        <span class={cls(PARTS.AUX, variant)}>{@render aux(values, variant, elements)}</span>
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
    <span class={cls(PARTS.LABEL, variant)} id={idLabel}>
      {label}
      {#if extra?.trim()}
        <span class={cls(PARTS.EXTRA, variant)}>{extra}</span>
      {/if}
    </span>
  {/if}
{/snippet}
{#snippet main()}
  <div class={cls(PARTS.MIDDLE, variant)} role={roleGroup} aria-describedby={idDesc} aria-invalid={!multiple ? invalid : undefined} aria-errormessage={!multiple ? idMsg : undefined}>
    {#each opts as {value, text, checked}, i (value)}
      {@const stat = checked ? VARIANT.ACTIVE : neutral}
      <label class={cls(PARTS.MAIN, stat)}>
        {#if action}
          <input bind:this={elements[i]} class={cls(PARTS.LEFT, stat)} aria-invalid={multiple ? invalid : undefined} aria-errormessage={multiple ? idMsg : undefined} {value} {name} {type} {checked} {onchange} {oninvalid} {...attrs} use:action />
        {:else}
          <input bind:this={elements[i]} class={cls(PARTS.LEFT, stat)} aria-invalid={multiple ? invalid : undefined} aria-errormessage={multiple ? idMsg : undefined} {value} {name} {type} {checked} {onchange} {oninvalid} {...attrs} />
        {/if}
        <span class={cls(PARTS.RIGHT, stat)}>{text}</span>
      </label>
    {/each}
  </div>
{/snippet}
{#snippet desc(show: boolean)}
  {#if show && message?.trim()}
    <div class={cls(PARTS.BOTTOM, variant)} id={idDesc ?? idErr} role={live}>{message}</div>
  {/if}
{/snippet}
