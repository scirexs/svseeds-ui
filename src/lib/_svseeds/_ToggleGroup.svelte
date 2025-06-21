<!--
  @component
  ### Types
  default value: *`(value)`*
  ```ts
  interface ToggleGroupProps {
    options: SvelteMap<string, string> | Map<string, string>;
    children?: Snippet<[string, string, string]>; // Snippet<[value,text,variant]>
    values?: string[]; // bindable
    multiple?: boolean; // (true)
    ariaDescId?: string;
    ariaErrMsgId?: string; // bindable
    action?: Action;
    elements?: HTMLButtonElement[]; // bindable
    styling?: SVSClass;
    variant?: string; // bindable (VARIANT.NEUTRAL)
  }
  ```
  ### Anatomy
  ```svelte
  <span class="whole" aria-describedby={ariaDescId} aria-errormessage={ariaErrMsgId}>
    {#each options as { value, text }}
      <button class="main" use:action>
        {text} or {children}
      </button>
    {/each}
  </span>
  ```
-->
<script module lang="ts">
  export interface ToggleGroupProps {
    options: SvelteMap<string, string> | Map<string, string>;
    children?: Snippet<[string, string, string]>; // Snippet<[value,text,variant]>
    values?: string[]; // bindable
    multiple?: boolean; // (true)
    ariaDescId?: string;
    ariaErrMsgId?: string; // bindable
    action?: Action;
    elements?: HTMLButtonElement[]; // bindable
    styling?: SVSClass;
    variant?: string; // bindable (VARIANT.NEUTRAL)
  }
  export type ToggleGroupReqdProps = "options";
  export type ToggleGroupBindProps = "values" | "ariaErrMsgId" | "elements" | "variant";

  const preset = "svs-toggle-group";

  import { type Snippet } from "svelte";
  import { type Action } from "svelte/action";
  import { type SvelteMap } from "svelte/reactivity";
  import { type SVSClass, VARIANT, PARTS, fnClass } from "./core";
</script>

<script lang="ts">
  let { options, children, values = $bindable([]), multiple = true, ariaDescId, ariaErrMsgId = $bindable(), action, elements = $bindable([]), styling, variant = $bindable("") }: ToggleGroupProps = $props();

  // *** Initialize *** //
  if (!variant) variant = VARIANT.NEUTRAL;
  const cls = fnClass(preset, styling);
  const role = multiple ? "checkbox" : "radio";
  const roleGroup = multiple ? "group" : "radiogroup";

  // *** Bind Handlers *** //
  let opts = $derived([...options.entries().map(([value, text]) => ({ value, text, checked: values.includes(value) }))]);
  let invalid = $derived(ariaErrMsgId ? true : undefined);

  // *** Event Handlers *** //
  const update = multiple
    ? (value: string) => (values.includes(value) ? values.filter((x) => x !== value) : opts.map((x) => x.value).filter((x) => [...values, value].includes(x)))
    : (value: string) => (values.includes(value) ? [] : [value]);
  function updateValues(value: string): () => void {
    return () => values = update(value);
  }
</script>

<!---------------------------------------->

{#if opts.length}
  <span class={cls(PARTS.WHOLE, variant)} role={roleGroup} aria-describedby={ariaDescId} aria-invalid={!multiple ? invalid : undefined} aria-errormessage={!multiple ? ariaErrMsgId : undefined}>
    {#each opts as { value, text, checked }, i (value)}
      {@const v = checked ? VARIANT.ACTIVE : variant}
      {@const c = cls(PARTS.MAIN, v)}
      {#if action}
        <button bind:this={elements[i]} class={c} aria-checked={checked} aria-invalid={multiple ? invalid : undefined} aria-errormessage={multiple ? ariaErrMsgId : undefined} onclick={updateValues(value)} type="button" {role} use:action>
          {@render content(value, text, v)}
        </button>
      {:else}
        <button bind:this={elements[i]} class={c} aria-checked={checked} aria-invalid={multiple ? invalid : undefined} aria-errormessage={multiple ? ariaErrMsgId : undefined} onclick={updateValues(value)} type="button" {role}>
          {@render content(value, text, v)}
        </button>
      {/if}
    {/each}
  </span>
{/if}

{#snippet content(value: string, text: string, variant: string)}
  {#if children}
    {@render children(value, text, variant)}
  {:else}
    {text}
  {/if}
{/snippet}
