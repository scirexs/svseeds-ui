<!--
  @component
  ### Types
  default value: *`(value)`*
  ```ts
  interface ContextMenuProps extends Omit<HTMLAttributes<HTMLDivElement>, "children" | "style"> {
    children: Snippet<[string]>; // Snippet<[variant]>
    open?: boolean; // bindable (false); to observe state, not to control
    lock?: boolean; // (false)
    target?: HTMLElement;
    attach?: Attachment<HTMLDivElement>;
    element?: HTMLDivElement; // bindable
    styling?: SVSClass;
    variant?: SVSVariant; // (VARIANT.NEUTRAL)
    // other HTMLAttributes are passed to <div> via ...rest; `class` is merged onto root
    // `style` is used by the component for positioning, visibility, and z-index
  }
  ```
  ### Anatomy
  ```svelte
  <div class={["whole", class]} {...rest} style={dynStyle} bind:this={element} {@attach attach}>
    {children}
  </div>
  ```
-->
<script module lang="ts">
  export interface ContextMenuProps extends Omit<HTMLAttributes<HTMLDivElement>, "children" | "style"> {
    children: Snippet<[string]>; // Snippet<[variant]>
    open?: boolean; // bindable (false); to observe state, not to control
    lock?: boolean; // (false)
    target?: HTMLElement;
    attach?: Attachment<HTMLDivElement>;
    element?: HTMLDivElement; // bindable
    styling?: SVSClass;
    variant?: SVSVariant; // (VARIANT.NEUTRAL)
  }
  export type ContextMenuReqdProps = "children";
  export type ContextMenuBindProps = "open" | "element";

  const preset = "svs-context-menu";

  import { type Snippet } from "svelte";
  import { type Attachment } from "svelte/attachments";
  import { type HTMLAttributes, type KeyboardEventHandler } from "svelte/elements";
  import { on } from "svelte/events";
  import { type SVSClass, type SVSVariant, VARIANT, PARTS, fnClass } from "./core";
</script>

<!---------------------------------------->

<script lang="ts">
  // prettier-ignore
  let { children, open = $bindable(false), lock = false, target, attach, element = $bindable(), styling, variant = VARIANT.NEUTRAL, class: c, ...rest }: ContextMenuProps = $props();

  // *** Initialize *** //
  const cls = $derived(fnClass(preset, styling));
  let position = $state({ x: 0, y: 0 });
  $effect.pre(() => {
    const cleanups: (() => void)[] = [];
    cleanups.push(on(target ?? document, "contextmenu", show));
    if (target) cleanups.push(on(document, "contextmenu", hide));
    return () => cleanups.forEach((x) => x());
  });

  // *** Bind Handlers *** //
  let dynStyle = $derived(
    `position:fixed;left:${position.x}px;top:${position.y}px;${open ? "visibility:visible;" : "visibility:hidden;z-index:-9999;"}`,
  );

  // *** Event Handlers *** //
  function show(ev: Event) {
    if (lock) return;
    ev.preventDefault();
    ev.stopPropagation();

    const [x, y] = [(ev as MouseEvent).clientX, (ev as MouseEvent).clientY];
    const menu = { width: element?.offsetWidth ?? 0, height: element?.offsetHeight ?? 0 };
    position.x = window.innerWidth - x < menu.width ? (x < menu.width ? x : x - menu.width) : x;
    position.y = window.innerHeight - y < menu.height ? (y < menu.height ? y : y - menu.height) : y;
    open = true;
  }
  function hide() {
    if (!lock) open = false;
  }
  const hkeydown: KeyboardEventHandler<HTMLDocument> = (ev) => {
    if (ev.key === "Escape") hide();
  };
</script>

<!---------------------------------------->
<svelte:document onclick={hide} onkeydown={hkeydown} />

<div class={[cls(PARTS.WHOLE, variant), c]} {...rest} style={dynStyle} bind:this={element} {@attach attach}>
  {@render children(variant)}
</div>
