<!--
  @component
  ### Usage
  Use standalone.
  ```svelte
  <ComboBox {...props} />
  ```
  ### Types
  default value: *`(value)`*
  ```ts
  interface ComboBoxProps extends Omit<HTMLInputAttributes, "type" | "value" | "list" | "role" | "aria-haspopup" | "aria-autocomplete" | "aria-controls" | "aria-expanded" | "aria-activedescendant"> {
    options: SvelteSet<string> | Set<string>;
    extra?: Snippet<[boolean, string]>; // Snippet<[expanded,variant]>
    value?: string; // bindable
    expanded?: boolean; // bindable
    search?: boolean // (true)
    attach?: Attachment<HTMLInputElement>;
    element?: HTMLInputElement; // bindable
    styling?: SVSClass;
    variant?: SVSVariant; // (VARIANT.NEUTRAL)
    // class & other HTMLInputAttributes are passed to <input> via ...rest (class is merged onto the control)
  }
  ```
  ### Anatomy
  ```svelte
  <span class="whole">
    <input class="main" {...rest} type="text" />
    <div class="extra" conditional>{extra}</div>
    <ul class="bottom">
      {#each options as option}
        <li class="label">{option}</li>
      {/each}
    </ul>
  </span>
  ```
  Open/close animations should be layered on the `bottom` part variant classes (`active` = open) with opacity, transform, or scale; the component keeps `visibility` as its structural default.
-->
<script module lang="ts">
  export interface ComboBoxProps extends Omit<
    HTMLInputAttributes,
    "type" | "value" | "list" | "role" | "aria-haspopup" | "aria-autocomplete" | "aria-controls" | "aria-expanded" | "aria-activedescendant"
  > {
    options: SvelteSet<string> | Set<string>;
    extra?: Snippet<[boolean, string]>; // Snippet<[expanded,variant]>
    value?: string; // bindable
    expanded?: boolean; // bindable
    search?: boolean; // (true)
    attach?: Attachment<HTMLInputElement>;
    element?: HTMLInputElement; // bindable
    styling?: SVSClass;
    variant?: SVSVariant; // (VARIANT.NEUTRAL)
  }
  export type ComboBoxReqdProps = "options";
  export type ComboBoxBindProps = "value" | "expanded" | "element";

  export const _COMBO_BOX_PRESET = "svs-combo-box";
  const NA = -1;

  import { tick } from "svelte";
  import { VARIANT, PARTS, fnClass } from "./core";
  import type { Snippet } from "svelte";
  import type { Attachment } from "svelte/attachments";
  import type { SvelteSet } from "svelte/reactivity";
  import type {
    HTMLInputAttributes,
    EventHandler,
    FormEventHandler,
    KeyboardEventHandler,
    FocusEventHandler,
    MouseEventHandler,
  } from "svelte/elements";
  import type { SVSClass, SVSVariant } from "./core";
</script>

<script lang="ts">
  // prettier-ignore
  let { options, extra, value = $bindable(""), expanded = $bindable(false), search = true, attach, element = $bindable(), styling, variant = VARIANT.NEUTRAL, class: c, onclick, onkeydown, oninput, onfocus, onblur, ...rest }: ComboBoxProps = $props();

  // *** Initialize *** //
  const cls = $derived(fnClass(_COMBO_BOX_PRESET, styling));
  const uid = $props.id();
  const idList = `${uid}-list`;
  let selected = $state(NA);
  let typed = $state(false);
  let wasExpanded = expanded;
  let overflow = $state({ x: false, y: false });
  let listElem = $state<HTMLUListElement>();

  // *** Reactive Handlers *** //
  const listboxStyle = $derived(
    `position:absolute;cursor:default;user-select:none;visibility: ${expanded ? "visible" : "hidden"};${overflow.x ? "right:0%;" : ""}${overflow.y ? "bottom:100%;" : ""}`,
  );
  const opts = $derived([...options.keys()]);
  const view = $derived(search && typed && value ? opts.filter((x) => x.toLowerCase().startsWith(value.toLowerCase())) : opts);

  $effect.pre(() => {
    if (wasExpanded && !expanded) {
      selected = NA;
      typed = false;
    }
    wasExpanded = expanded;
  });
  $effect(() => {
    if (!expanded || selected <= NA || !listElem) return;
    listElem.children[selected]?.scrollIntoView?.({ block: "nearest" });
  });

  // *** Event Handlers *** //
  function open(activate: boolean = false, bottom: boolean = false) {
    if (expanded) return;
    typed = false;
    selected = view.indexOf(value);
    if (activate && selected === NA) selected = bottom ? view.length - 1 : 0;
    expanded = true;
    observeOverflow();
  }
  async function observeOverflow() {
    overflow = { x: false, y: false };
    await tick();
    if (!listElem || typeof window === "undefined") return;
    const rect = listElem.getBoundingClientRect();
    overflow.x = window.innerWidth < rect.right;
    overflow.y = window.innerHeight < rect.bottom;
  }
  function apply() {
    if (!expanded) return;
    if (selected === NA || selected >= view.length) return;
    value = view[selected];
    if (element) element.selectionStart = value.length;
    close();
  }
  function close() {
    expanded = false;
    selected = NA;
    typed = false;
  }
  const hfocus: FocusEventHandler<HTMLInputElement> = (ev) => {
    onfocus?.(ev);
    open();
  };
  const hblur: FocusEventHandler<HTMLInputElement> = (ev) => {
    onblur?.(ev);
    close();
  };
  const hclick: MouseEventHandler<HTMLInputElement> = (ev) => {
    onclick?.(ev);
    if (!expanded) open();
  };
  const hinput: FormEventHandler<HTMLInputElement> = (ev) => {
    oninput?.(ev);
    if ((ev as Parameters<EventHandler<InputEvent, HTMLInputElement>>[0]).isComposing) return;
    typed = true;
    selected = options.has(value) ? view.indexOf(value) : NA;
  };
  const hkeydown: KeyboardEventHandler<HTMLInputElement> = (ev) => {
    onkeydown?.(ev);
    if (ev.isComposing) return;
    if (ev.ctrlKey || ev.shiftKey || ev.metaKey) return;
    switch (ev.key) {
      case "Escape":
        if (!ev.altKey && expanded) close();
        break;
      case "Enter":
        if (!ev.altKey && expanded && selected > NA) {
          ev.preventDefault();
          apply();
        }
        break;
      case "ArrowDown":
        caseArrowDown(ev, ev.altKey);
        break;
      case "ArrowUp":
        caseArrowUp(ev, ev.altKey);
        break;
    }
  };
  function caseArrowDown(ev: KeyboardEvent, alt: boolean) {
    if (alt && expanded) return;
    ev.preventDefault();
    if (alt && !expanded) return open();
    if (!alt && !expanded) return open(true);
    if (!view.length) return (selected = NA);
    if (selected < view.length - 1) selected++;
  }
  function caseArrowUp(ev: KeyboardEvent, alt: boolean) {
    if (alt && !expanded) return;
    ev.preventDefault();
    if (alt && expanded) return close();
    if (!alt && !expanded) return open(true, true);
    if (!view.length) return (selected = NA);
    if (selected > 0) selected--;
    if (selected === NA) selected = view.length - 1;
  }
</script>

<!---------------------------------------->
<svelte:document onscroll={() => close()} />

{#if options.size}
  <span class={cls(PARTS.WHOLE, variant)} style="position:relative;">
    <input
      bind:value
      bind:this={element}
      class={[cls(PARTS.MAIN, variant), c]}
      {...rest}
      type="text"
      role="combobox"
      aria-haspopup="listbox"
      aria-autocomplete="list"
      aria-controls={idList}
      aria-expanded={expanded}
      aria-activedescendant={selected > NA ? `${idList}-${selected}` : undefined}
      onfocus={hfocus}
      onblur={hblur}
      onclick={hclick}
      onkeydown={hkeydown}
      oninput={hinput}
      {@attach attach}
    />
    {#if extra}
      <div class={cls(PARTS.EXTRA, variant)} style="position:absolute;top:50%;right:0%;transform:translateY(-50%);pointer-events:none;">
        {@render extra(expanded, variant)}
      </div>
    {/if}
    <ul bind:this={listElem} class={cls(PARTS.BOTTOM, expanded ? VARIANT.ACTIVE : variant)} id={idList} role="listbox" style={listboxStyle}>
      {#each view as opt, i (opt)}
        {@const isSelected = i === selected}
        {@const labelStatus = isSelected ? VARIANT.ACTIVE : variant}
        {@const onpointerenter = () => (selected = i)}
        <li
          id={`${idList}-${i}`}
          class={cls(PARTS.LABEL, labelStatus)}
          aria-selected={isSelected}
          role="option"
          onpointerdown={apply}
          {onpointerenter}
        >
          {opt}
        </li>
      {/each}
    </ul>
  </span>
{/if}
