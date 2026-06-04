<!--
  @component
  ### Types
  default value: *`(value)`*
  ```ts
  interface CheckFieldProps extends Omit<HTMLInputAttributes, "type" | "value"> {
    options: SvelteMap<string, string> | Map<string, string>;
    label?: string;
    extra?: string;
    aux?: Snippet<[string[], string, HTMLInputElement[]]>; // Snippet<[values,variant,elements]>
    bottom?: string;
    descFirst?: boolean; // (false)
    values?: string[]; // bindable
    multiple?: boolean; // (true)
    validations?: CheckFieldValidation[];
    attach?: Attachment;
    elements?: HTMLInputElement[]; // bindable
    styling?: SVSClass;
    variant?: SVSVariant; // bindable (VARIANT.NEUTRAL)
    // class & other HTMLInputAttributes are passed to each <input> via ...rest (class is merged onto each input)
  }
  type CheckFieldValidation = (values: string[], validity: ValidityState) => string | undefined;
  ```
  ### Anatomy
  ```svelte
  <div class="whole">
    <div class="top" conditional>
      <span class="label" conditional>
        {label}
        <span class="extra" conditional>{extra}</span>
      </span>
      <span class="aux" conditional>{aux}</span>
    </div>
    <div class="middle">
      {#each options as { value, text }, i}
        <label class="main">
          <input class={["left", class]} bind:this={elements[i]} {@attach attach} />
          <span class="right">{text}</span>
        </label>
      {/each}
    </div>
    <div class="bottom" conditional>{bottom}</div>
  </div>
  ```
-->
<script module lang="ts">
  export interface CheckFieldProps extends Omit<HTMLInputAttributes, "type" | "value" | "id"> {
    options: SvelteMap<string, string> | Map<string, string>;
    label?: string;
    extra?: string;
    aux?: Snippet<[string[], string, HTMLInputElement[]]>; // Snippet<[values,variant,elements]>
    bottom?: string;
    descFirst?: boolean; // (false)
    values?: string[]; // bindable
    multiple?: boolean; // (true)
    validations?: CheckFieldValidation[];
    attach?: Attachment<HTMLInputElement>;
    elements?: HTMLInputElement[]; // bindable
    styling?: SVSClass;
    variant?: SVSVariant; // bindable (VARIANT.NEUTRAL)
  }
  export type CheckFieldReqdProps = "options";
  export type CheckFieldBindProps = "values" | "variant" | "elements";
  export type CheckFieldValidation = (values: string[], validity: ValidityState) => string | undefined;

  const preset = "svs-check-field";

  import { type Snippet, untrack } from "svelte";
  import { type Attachment } from "svelte/attachments";
  import { type SvelteMap } from "svelte/reactivity";
  import { type HTMLInputAttributes, type ChangeEventHandler, type EventHandler } from "svelte/elements";
  import { type SVSClass, type SVSVariant, VARIANT, PARTS, fnClass, isNeutral } from "./core";
</script>

<script lang="ts">
  // prettier-ignore
  let { options, label, extra, aux, bottom, values = $bindable([]), multiple = true, descFirst = false, validations = [], name, onchange, oninvalid, attach, elements = $bindable([]), styling, variant = $bindable(VARIANT.NEUTRAL), class: c, ...rest }: CheckFieldProps = $props();

  // *** Initialize *** //
  const cls = $derived(fnClass(preset, styling));
  const type = $derived(multiple ? "checkbox" : "radio");
  const uid = $props.id();
  const nm = $derived(name?.trim() ? name : `${uid}-name`);
  const idLabel = $derived(label?.trim() ? `${uid}-label` : undefined);
  const idDesc = $derived(bottom?.trim() ? `${uid}-desc` : undefined);
  const idErr = $derived(idDesc ?? `${uid}-err`);
  const roleGroup = $derived(multiple ? "group" : "radiogroup");
  // svelte-ignore state_referenced_locally
  let message = $state(bottom);

  // *** States *** //
  let neutral = $state(isNeutral(variant) ? variant : VARIANT.NEUTRAL);
  $effect(() => {
    neutral = isNeutral(variant) ? variant : neutral;
  });
  const live = $derived(variant === VARIANT.INACTIVE ? "alert" : "status");
  const invalid = $derived(variant === VARIANT.INACTIVE ? true : undefined);
  const idMsg = $derived(variant === VARIANT.INACTIVE && message?.trim() ? idErr : undefined);
  function shift(oninvalid?: boolean) {
    const vmsg = elements[0]?.validationMessage ?? "";
    variant = oninvalid && vmsg ? VARIANT.INACTIVE : !values.length || vmsg ? neutral : VARIANT.ACTIVE;
    message = variant === VARIANT.INACTIVE ? (vmsg ? vmsg : bottom) : bottom;
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
  function hchange(ev: Parameters<ChangeEventHandler<HTMLInputElement>>[0]) {
    onchange?.(ev);
    values = elements.filter((el) => el.checked).map((el) => el.value);
  }
  function hinvalid(ev: Parameters<EventHandler<Event, HTMLInputElement>>[0]) {
    oninvalid?.(ev);
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
  <div
    class={cls(PARTS.MIDDLE, variant)}
    role={roleGroup}
    aria-describedby={idDesc}
    aria-invalid={!multiple ? invalid : undefined}
    aria-errormessage={!multiple ? idMsg : undefined}
  >
    {#each opts as { value, text, checked }, i (value)}
      {@const stat = checked ? VARIANT.ACTIVE : neutral}
      <label class={cls(PARTS.MAIN, stat)}>
        <input
          bind:this={elements[i]}
          class={[cls(PARTS.LEFT, stat), c]}
          {...rest}
          aria-invalid={multiple ? invalid : undefined}
          aria-errormessage={multiple ? idMsg : undefined}
          {value}
          name={nm}
          {type}
          {checked}
          onchange={hchange}
          oninvalid={hinvalid}
          {@attach attach}
        />
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
