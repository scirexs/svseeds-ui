<!--
  @component
  ### Types
  default value: *`(value)`*
  ```ts
  interface ButtonProps extends Omit<HTMLButtonAttributes, "children" | "form" | "type" | "onclick"> {
    children: Snippet<[string]>; // Snippet<[variant]>
    left?: Snippet<[string, HTMLButtonElement | undefined]>; // Snippet<[variant,element]>
    right?: Snippet<[string, HTMLButtonElement | undefined]>; // Snippet<[variant,element]>
    type?: "submit" | "reset" | "button"; // ("button")
    onclick?: MouseEventHandler<HTMLButtonElement> | null;
    form?: HTMLFormElement;
    attach?: Attachment;
    element?: HTMLButtonElement; // bindable
    styling?: SVSClass;
    variant?: SVSVariant; // (VARIANT.NEUTRAL)
    // other HTMLButtonAttributes are passed to <button> via ...rest; `class` is merged onto root <button>
  }
  ```
  ### Anatomy
  ```svelte
  <button class={["whole", class]} {type} {onclick} {...rest} bind:this={element} {@attach attach}>
    <span class="left" conditional>{left}</span>
    <span class="main">{children}</span>
    <span class="right" conditional>{right}</span>
  </button>
  ```
-->
<script module lang="ts">
  export interface ButtonProps extends Omit<HTMLButtonAttributes, "children" | "form" | "type"> {
    children: Snippet<[string]>; // Snippet<[variant]>
    left?: Snippet<[string, HTMLButtonElement | undefined]>; // Snippet<[variant,element]>
    right?: Snippet<[string, HTMLButtonElement | undefined]>; // Snippet<[variant,element]>
    type?: "submit" | "reset" | "button"; // ("button")
    form?: HTMLFormElement;
    attach?: Attachment<HTMLButtonElement>;
    element?: HTMLButtonElement; // bindable
    styling?: SVSClass;
    variant?: SVSVariant; // (VARIANT.NEUTRAL)
  }
  export type ButtonReqdProps = "children";
  export type ButtonBindProps = "element";

  const preset = "svs-button";

  import { type Snippet } from "svelte";
  import { type Attachment } from "svelte/attachments";
  import { type HTMLButtonAttributes, type MouseEventHandler } from "svelte/elements";
  import { type SVSClass, type SVSVariant, VARIANT, PARTS, fnClass } from "./core";
</script>

<script lang="ts">
  // prettier-ignore
  let { children, left, right, type = "button", onclick, form, attach, element = $bindable(), styling, variant = VARIANT.NEUTRAL, class: c, ...rest }: ButtonProps = $props();

  // *** Initialize *** //
  const cls = $derived(fnClass(preset, styling));
  const idForm = $derived(form?.id || undefined);

  // *** Event Handlers *** //
  const hclick: MouseEventHandler<HTMLButtonElement> = (ev) => {
    if (form?.checkValidity() ?? true) onclick?.(ev);
  };
</script>

<!---------------------------------------->

<button bind:this={element} class={[cls(PARTS.WHOLE, variant), c]} {type} onclick={hclick} form={idForm} {...rest} {@attach attach}>
  {@render whole()}
</button>

{#snippet side(area: string, body?: Snippet<[string, HTMLButtonElement | undefined]>)}
  {#if body}
    <span class={cls(area, variant)}>{@render body(variant, element)}</span>
  {/if}
{/snippet}
{#snippet whole()}
  {@render side(PARTS.LEFT, left)}
  <span class={cls(PARTS.MAIN, variant)}>
    {@render children(variant)}
  </span>
  {@render side(PARTS.RIGHT, right)}
{/snippet}
