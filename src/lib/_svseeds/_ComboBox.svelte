<!--
  @component
  ### Types
  default value: *`(value)`*
  ```ts
  interface ComboBoxProps extends Omit<HTMLInputAttributes, "type" | "value" | "list" | "role" | "aria-haspopup" | "aria-autocomplete" | "aria-controls" | "aria-expanded"> {
    options: SvelteSet<string> | Set<string>;
    extra?: Snippet<[boolean, string]>; // Snippet<[expanded,variant]>
    value?: string; // bindable
    expanded?: boolean; // bindable
    search?: boolean // (true)
    attach?: Attachment;
    element?: HTMLInputElement; // bindable
    styling?: SVSClass;
    variant?: SVSVariant; // (VARIANT.NEUTRAL)
    // class & other HTMLInputAttributes are passed to <input> via ...rest (class is merged onto the control)
  }
  ```
  ### Anatomy
  ```svelte
  <span class="whole">
    <input class={["main", class]} type="text" {...rest} bind:value bind:this={element} {@attach attach} />
    <div class="extra" conditional>{extra}</div>
    <ul class="bottom">
      {#each options as option}
        <li class="label">{option}</li>
      {/each}
    </ul>
  </span>
  ```
-->
<script module lang="ts">
  export interface ComboBoxProps extends Omit<
    HTMLInputAttributes,
    "type" | "value" | "list" | "role" | "aria-haspopup" | "aria-autocomplete" | "aria-controls" | "aria-expanded"
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

  const preset = "svs-combo-box";
  const NA = -1;

  import { type Snippet } from "svelte";
  import { type Attachment } from "svelte/attachments";
  import { type SvelteSet } from "svelte/reactivity";
  import {
    type HTMLInputAttributes,
    type EventHandler,
    type FormEventHandler,
    type KeyboardEventHandler,
    type FocusEventHandler,
  } from "svelte/elements";
  import { type SVSClass, type SVSVariant, VARIANT, PARTS, fnClass } from "./core";
</script>

<script lang="ts">
  // prettier-ignore
  let { options, extra, value = $bindable(""), expanded = $bindable(false), search = true, attach, element = $bindable(), styling, variant = VARIANT.NEUTRAL, class: c, onkeydown, oninput, onfocus, onblur, ...rest }: ComboBoxProps = $props();

  // *** Initialize *** //
  const cls = $derived(fnClass(preset, styling));
  const uid = $props.id();
  const idList = `${uid}-list`;
  let selected = $state(NA);
  let overflow = $state({ x: false, y: false });
  let listElem = $state<HTMLUListElement>();

  // *** Bind Handlers *** //
  const listboxStyle = $derived(
    `position:absolute;cursor:default;user-select:none;visibility: ${expanded ? "visible" : "hidden"};${overflow.x ? "right:0%;" : ""}${overflow.y ? "bottom:100%;" : ""}`,
  );
  const opts = $derived([...options.keys()]);
  const maxlen = $derived(opts.reduce((max, x) => Math.max(max, [...x].length), 0));

  // *** Event Handlers *** //
  function open(activate: boolean = false, bottom: boolean = false) {
    if (expanded) return;
    selected = opts.indexOf(value);
    if (activate && selected === NA) selected = bottom ? opts.length - 1 : 0;
    observeOverflow();
    expanded = true;
  }
  function observeOverflow() {
    if (!listElem || !window) return;
    const rect = listElem.getBoundingClientRect();
    overflow.x = window.innerWidth < rect.right;
    overflow.y = window.innerHeight < rect.bottom;
  }
  function apply() {
    if (!expanded) return;
    value = opts[selected];
    if (element) element.selectionStart = value.length;
    close();
  }
  function close() {
    expanded = false;
    selected = NA;
  }
  function hfocus(ev: Parameters<FocusEventHandler<HTMLInputElement>>[0]) {
    onfocus?.(ev);
    open();
  }
  function hblur(ev: Parameters<FocusEventHandler<HTMLInputElement>>[0]) {
    onblur?.(ev);
    close();
  }
  function hinput(ev: Parameters<FormEventHandler<HTMLInputElement>>[0]) {
    oninput?.(ev);
    if ((ev as Parameters<EventHandler<InputEvent, HTMLInputElement>>[0]).isComposing) return;
    if ([...value].length > maxlen) return;
    if (options.has(value)) {
      selected = opts.indexOf(value);
      return;
    }
    if (!search) return;
    selected = opts.findIndex((x) => x.startsWith(value));
  }
  function hkeydown(ev: Parameters<KeyboardEventHandler<HTMLInputElement>>[0]) {
    onkeydown?.(ev);
    if (ev.isComposing) return;
    if (ev.ctrlKey || ev.shiftKey || ev.metaKey) return;
    switch (ev.key) {
      case "Escape":
        if (!ev.altKey && expanded) close();
        break;
      case "Enter":
        if (!ev.altKey && expanded && selected > NA) apply();
        break;
      case "ArrowDown":
        caseArrowDown(ev, ev.altKey);
        break;
      case "ArrowUp":
        caseArrowUp(ev, ev.altKey);
        break;
    }
  }
  function caseArrowDown(ev: KeyboardEvent, alt: boolean) {
    if (alt && expanded) return;
    ev.preventDefault();
    if (alt && !expanded) return open();
    if (!alt && !expanded) return open(true);
    if (selected < opts.length - 1) selected++;
    if (selected === NA) selected = 0;
  }
  function caseArrowUp(ev: KeyboardEvent, alt: boolean) {
    if (alt && !expanded) return;
    ev.preventDefault();
    if (alt && expanded) return close();
    if (!alt && !expanded) return open(true, true);
    if (selected > 0) selected--;
    if (selected === NA) selected = opts.length - 1;
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
      aria-autocomplete="none"
      aria-controls={idList}
      aria-expanded={expanded}
      onfocus={hfocus}
      onblur={hblur}
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
      {#each opts as opt, i (opt)}
        {@const isSelected = i === selected}
        {@const labelStatus = isSelected ? VARIANT.ACTIVE : variant}
        {@const onpointerenter = () => (selected = i)}
        <li class={cls(PARTS.LABEL, labelStatus)} aria-selected={isSelected} role="option" onpointerdown={apply} {onpointerenter}>
          {opt}
        </li>
      {/each}
    </ul>
  </span>
{/if}
