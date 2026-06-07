<!--
  @component
  ### Types
  default value: *`(value)`*
  ```ts
  interface ToggleGroupFieldProps {
    options: SvelteMap<string, string | ToggleOption> | Map<string, string | ToggleOption>;
    label?: string;
    extra?: string;
    aux?: Snippet<[string[], string]>; // Snippet<[values,variant]>
    left?: Snippet<[string[], string]>; // Snippet<[values,variant]>
    right?: Snippet<[string[], string]>; // Snippet<[values,variant]>
    bottom?: string;
    descFirst?: boolean; // (false)
    values?: string[]; // bindable
    multiple?: boolean; // (true)
    validations?: ToggleGroupFieldValidation[];
    name?: string;
    elements?: HTMLButtonElement[];
    styling?: SVSClass;
    variant?: SVSVariant; // bindable (VARIANT.NEUTRAL)
    deps?: ToggleGroupFieldDeps;
  }
  interface ToggleGroupFieldDeps {
    svsToggleGroup?: Omit<ToggleGroupProps, ToggleGroupReqdProps | ToggleGroupBindProps | "ariaDescId" | "multiple">;
  }
  type ToggleGroupFieldValidation = (values: string[]) => string | undefined;
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
      <ToggleGroup {options} {multiple} {...deps.svsToggleGroup} {...restProps} bind:values />
      <span class="right" conditional>{right}</span>
    </div>
    <div class="bottom" conditional>{bottom}</div>
  </div>
  ```
-->
<script module lang="ts">
  export interface ToggleGroupFieldProps {
    options: SvelteMap<string, string | ToggleOption> | Map<string, string | ToggleOption>;
    label?: string;
    extra?: string;
    aux?: Snippet<[string[], string]>; // Snippet<[values,variant]>
    left?: Snippet<[string[], string]>; // Snippet<[values,variant]>
    right?: Snippet<[string[], string]>; // Snippet<[values,variant]>
    bottom?: string;
    descFirst?: boolean; // (false)
    values?: string[]; // bindable
    multiple?: boolean; // (true)
    validations?: ToggleGroupFieldValidation[];
    name?: string;
    elements?: HTMLButtonElement[]; // bindable
    styling?: SVSClass;
    variant?: SVSVariant; // bindable (VARIANT.NEUTRAL)
    deps?: ToggleGroupFieldDeps;
  }
  export interface ToggleGroupFieldDeps {
    svsToggleGroup?: Omit<ToggleGroupProps, ToggleGroupReqdProps | ToggleGroupBindProps | "ariaDescId" | "multiple">;
  }
  export type ToggleGroupFieldReqdProps = "options";
  export type ToggleGroupFieldBindProps = "values" | "variant";
  export type ToggleGroupFieldValidation = (values: string[]) => string | undefined;

  const preset = "svs-toggle-group-field";

  import { type Snippet, untrack } from "svelte";
  import { type Attachment } from "svelte/attachments";
  import { type SvelteMap } from "svelte/reactivity";
  import { type SVSClass, type SVSVariant, VARIANT, PARTS, fnClass, isNeutral } from "./core";
  import ToggleGroup, {
    type ToggleOption,
    type ToggleGroupProps,
    type ToggleGroupReqdProps,
    type ToggleGroupBindProps,
  } from "./_ToggleGroup.svelte";
</script>

<script lang="ts">
  // prettier-ignore
  let { options, label, extra, aux, left, right, bottom, descFirst = false, values = $bindable([]), multiple = true, validations = [], name, elements = $bindable([]), styling, variant = $bindable(VARIANT.NEUTRAL), deps }: ToggleGroupFieldProps = $props();

  // *** Initialize *** //
  const cls = $derived(fnClass(preset, styling));
  const uid = $props.id();
  // svelte-ignore state_referenced_locally
  const idLabel = label?.trim() ? `${uid}-label` : undefined;
  // svelte-ignore state_referenced_locally
  const idDesc = bottom?.trim() ? `${uid}-desc` : undefined;
  const idErr = idDesc ?? `${uid}-err`;
  // svelte-ignore state_referenced_locally
  let message = $state(bottom);
  let element: HTMLInputElement | undefined = $state();

  // *** Initialize Deps *** //
  // svelte-ignore state_referenced_locally
  const svsToggleGroup = {
    children: deps?.svsToggleGroup?.children,
    ariaDescId: idDesc,
    styling: (deps?.svsToggleGroup?.styling as SVSClass) ?? `${preset} svs-toggle-group`,
    attach: deps?.svsToggleGroup?.attach as Attachment,
  };

  // *** States *** //
  let neutral = $state(isNeutral(variant) ? variant : VARIANT.NEUTRAL);
  $effect(() => {
    neutral = isNeutral(variant) ? variant : neutral;
  });
  let live = $derived(variant === VARIANT.INACTIVE ? "alert" : "status");
  let idMsg = $derived(variant === VARIANT.INACTIVE && message?.trim() ? idErr : undefined);
  function shift(oninvalid?: boolean) {
    const vmsg = element?.validationMessage ?? "";
    variant = oninvalid && vmsg ? VARIANT.INACTIVE : !values.length || vmsg ? neutral : VARIANT.ACTIVE;
    message = variant === VARIANT.INACTIVE ? (vmsg ? vmsg : bottom) : bottom;
  }
  function verify() {
    if (!element) return;
    for (const v of validations) {
      const msg = v(values);
      if (msg) return element.setCustomValidity(msg);
    }
    element.setCustomValidity("");
  }

  // *** Bind Handlers *** //
  $effect.pre(() => {
    values;
    untrack(() => validate());
  });
  function validate() {
    verify();
    shift();
  }

  // *** Event Handlers *** //
  function oninvalid(ev: Event) {
    ev.preventDefault();
    shift(true);
  }
  $effect(() => untrack(() => verify()));
</script>

<!---------------------------------------->

{#if options.size}
  <div class={cls(PARTS.WHOLE, variant)} role="group" aria-labelledby={idLabel}>
    {#if aux}
      <div class={cls(PARTS.TOP, variant)}>
        {@render lbl()}
        <span class={cls(PARTS.AUX, variant)}>{@render aux(values, variant)}</span>
      </div>
    {:else}
      {@render lbl()}
    {/if}
    {@render desc(descFirst)}
    <div class={cls(PARTS.MIDDLE, variant)}>
      {@render side(PARTS.LEFT, left)}
      {@render fnForm()}
      <ToggleGroup bind:values bind:elements ariaErrMsgId={idMsg} variant={neutral} {options} {multiple} {...svsToggleGroup} />
      {@render side(PARTS.RIGHT, right)}
    </div>
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
{#snippet side(area: string, body?: Snippet<[string[], string]>)}
  {#if body}
    <span class={cls(area, variant)}>{@render body(values, variant)}</span>
  {/if}
{/snippet}
{#snippet desc(show: boolean)}
  {#if show && message?.trim()}
    <div class={cls(PARTS.BOTTOM, variant)} id={idDesc ?? idErr} role={live}>{message}</div>
  {/if}
{/snippet}
{#snippet fnForm()}
  <input bind:this={element} style="display: none;" aria-hidden="true" {oninvalid} />
  {#if name}
    {#each values as value}
      <input type="hidden" {name} {value} />
    {/each}
  {/if}
{/snippet}
