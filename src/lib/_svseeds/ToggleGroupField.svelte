<script module lang="ts">
  export type ToggleGroupFieldProps = {
    options: SvelteMap<string, string> | Map<string, string>,
    label?: string,
    extra?: string,
    aux?: Snippet<[string, string[]]>, // Snippet<[status,values]>
    left?: Snippet<[string, string[]]>, // Snippet<[status,values]>
    right?: Snippet<[string, string[]]>, // Snippet<[status,values]>
    bottom?: string,
    descFirst?: boolean, // <false>
    values?: string[], // bindable
    multiple?: boolean, // <true>
    validations?: ToggleGroupFieldValidation[],
    status?: string, // bindable <STATE.DEFAULT>
    style?: SVSStyle,
    deps?: ToggleGroupFieldDeps,
    [key: string]: unknown | Snippet,
  };
  export type ToggleGroupFieldDeps = {
    svsToggleGroup?: Omit<ToggleGroupProps, ToggleGroupReqdProps | ToggleGroupBindProps | "ariaDescId" | "multiple">,
  };
  export type ToggleGroupFieldReqdProps = "options";
  export type ToggleGroupFieldBindProps = "values" | "status";
  export type ToggleGroupFieldValidation = (values: string[]) => string;

  const preset = "svs-toggle-group-field";

  import { type Snippet, untrack } from "svelte";
  import { type Action } from "svelte/action";
  import { type SvelteMap } from "svelte/reactivity";
  import { type SVSStyle, STATE, PARTS, elemId, fnClass, isNeutral } from "./core";
  import ToggleGroup, { type ToggleGroupProps, type ToggleGroupReqdProps, type ToggleGroupBindProps } from "./_ToggleGroup.svelte";
</script>

<script lang="ts">
  let { options, label, extra, aux, left, right, bottom, descFirst = false, values = $bindable([]), multiple = true, validations = [], status = $bindable(""), style, attributes, elements = $bindable([]), deps, ...rest }: ToggleGroupFieldProps = $props();

  // *** Initialize *** //
  if (!status) status = STATE.DEFAULT;
  const cls = fnClass(preset, style);
  const idLabel = elemId.get(label?.trim());
  const idDesc = elemId.get(bottom?.trim());
  const idErr = idDesc ?? elemId.id;
  let message = $state(bottom);
  let element: HTMLInputElement | undefined = $state();

  // *** Initialize Deps *** //
  const svsToggleGroup = {
    ...Object.fromEntries(Object.entries(rest).filter(([_, v]) => typeof v === "function")),
    ariaDescId: idDesc,
    style: deps?.svsToggleGroup?.style as SVSStyle ?? `${preset} svs-toggle-group`,
    action: deps?.svsToggleGroup?.action as Action,
  };

  // *** Status *** //
  let neutral = $state(isNeutral(status) ? status : STATE.DEFAULT);
  $effect(() => { neutral = isNeutral(status) ? status : neutral });
  let live = $derived(status === STATE.INACTIVE ? "alert" : "status");
  let idMsg = $derived(status === STATE.INACTIVE && message?.trim() ? idErr : undefined);
  function shift(oninvalid?: boolean) {
    const vmsg = element?.validationMessage ?? "";
    status = oninvalid && vmsg ? STATE.INACTIVE : (!values.length || vmsg) ? neutral : STATE.ACTIVE;
    message = status === STATE.INACTIVE ? vmsg ? vmsg : bottom : bottom;
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
    shift(true)
  }
  $effect(() => untrack(() => verify()));
</script>

<!---------------------------------------->

{#if options.size}
  <div class={cls(PARTS.WHOLE, status)} role="group" aria-labelledby={idLabel}>
    {#if aux}
      <div class={cls(PARTS.TOP, status)}>
        {@render lbl()}
        <span class={cls(PARTS.AUX, status)}>{@render aux(status, values)}</span>
      </div>
    {:else}
      {@render lbl()}
    {/if}
    {@render desc(descFirst)}
    <div class={cls(PARTS.MIDDLE, status)}>
      {@render side(PARTS.LEFT, left)}
      <input bind:this={element} style="display: none;" aria-hidden="true" {oninvalid} />
      <ToggleGroup bind:values bind:ariaErrMsgId={idMsg} bind:status={neutral} {options} {multiple} {...svsToggleGroup} />
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
{#snippet side(area: string, body?: Snippet<[string, string[]]>)}
  {#if body}
    <span class={cls(area, status)}>{@render body(status, values)}</span>
  {/if}
{/snippet}
{#snippet desc(show: boolean)}
  {#if show && message?.trim()}
    <div class={cls(PARTS.BOTTOM, status)} id={idDesc ?? idErr} role={live}>{message}</div>
  {/if}
{/snippet}
