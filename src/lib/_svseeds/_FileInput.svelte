<!--
  @component
  ### Types
  default value: *`(files, dragover, variant)`*
  ```ts
  interface FileInputProps extends Omit<HTMLInputAttributes, "type" | "value" | "files" | "size" | "multiple" | "accept" | "children"> {
    children: Snippet<[File[], boolean, string]>; // required; Snippet<[files,dragover,variant]>; zone content, presentational only
    files?: File[]; // bindable
    multiple?: boolean; // (false)
    accept?: string;
    maxSize?: number; // bytes
    maxFiles?: number;
    zone?: boolean; // (false)
    rejectBy?: ("accept" | "maxSize" | "maxFiles")[]; // bindable
    flip?: boolean; // (false) - render aux before the zone instead of after
    aux?: Snippet<[File[], (file: File) => void, string]>; // Snippet<[files,remove,variant]>; rendered outside the label
    events?: FileInputEvents;
    attach?: Attachment;
    element?: HTMLInputElement; // bindable
    styling?: SVSClass;
    variant?: SVSVariant; // (VARIANT.NEUTRAL)
    // class & other HTMLInputAttributes are passed to <input> via ...rest (class is merged onto the control)
  }
  interface FileInputEvents {
    onadd?: (detail: { candidates: File[]; rejected: FileRejection[]; files: File[] }) => File[] | void;
  }
  interface FileRejection {
    file: File;
    reason: FileRejectReason;
  }
  type FileRejectReason = "accept" | "maxSize" | "maxFiles";
  ```
  ### Anatomy
  ```svelte
  <div class="whole">
    <div class="aux" if={aux && flip}>{aux}</div>
    <label class="middle" data-dragover>
      <input class="main" {...rest} type="file" style="sr-only" aria-invalid aria-errormessage />
      {children}
    </label>
    <div class="aux" if={aux && !flip}>{aux}</div>
  </div>
  ```

  Drag-over renders the local variant as `active`; `children` must be presentational and interactive controls belong in `aux`.
  `accept` is re-checked by the primitive because drag-drop bypasses the native picker filter.
  Very old Safari versions that cannot assign `input.files` may not submit dropped files programmatically.
-->
<script module lang="ts">
  export interface FileInputProps extends Omit<
    HTMLInputAttributes,
    "type" | "value" | "files" | "size" | "multiple" | "accept" | "children"
  > {
    children: Snippet<[File[], boolean, string]>; // Snippet<[files,dragover,variant]>
    files?: File[]; // bindable
    multiple?: boolean; // (false)
    accept?: string;
    maxSize?: number; // bytes
    maxFiles?: number;
    zone?: boolean; // (false)
    rejectBy?: FileRejectReason[]; // bindable
    flip?: boolean; // (false)
    aux?: Snippet<[File[], (file: File) => void, string]>; // Snippet<[files,remove,variant]>
    events?: FileInputEvents;
    attach?: Attachment;
    element?: HTMLInputElement; // bindable
    styling?: SVSClass;
    variant?: SVSVariant; // (VARIANT.NEUTRAL)
  }
  export type FileInputReqdProps = "children";
  export type FileInputBindProps = "files" | "rejectBy" | "element";
  export type FileRejectReason = "accept" | "maxSize" | "maxFiles";
  export interface FileRejection {
    file: File;
    reason: FileRejectReason;
  }
  export interface FileInputEvents {
    // Return the subset of candidates to additionally reject before commit.
    onadd?: (detail: { candidates: File[]; rejected: FileRejection[]; files: File[] }) => File[] | void;
  }

  export const _FILE_INPUT_PRESET = "svs-file-input";
  const SR_ONLY =
    "position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap;border:0;";

  export interface FileInputContext extends SVSContext {
    get files(): File[];
    set files(v: File[]);
    set element(v: HTMLInputElement | undefined);
    get ariaErrMsgId(): string | undefined;
    get id(): string | undefined;
    get describedby(): string | undefined;
    events?: FileInputEvents;
    onchange?: (ev: Event) => void;
    oninvalid?: (ev: Event) => void;
  }

  export const [_getFileInputContext, _setFileInputContext] = _createContext<FileInputContext>();

  import { type Snippet, untrack } from "svelte";
  import { type Attachment } from "svelte/attachments";
  import {
    type HTMLInputAttributes,
    type MouseEventHandler,
    type ChangeEventHandler,
    type DragEventHandler,
    type EventHandler,
  } from "svelte/elements";
  import { type SVSClass, type SVSVariant, type SVSContext, VARIANT, PARTS, fnClass, _createContext } from "./core";
</script>

<script lang="ts">
  // prettier-ignore
  let { files = $bindable([]), multiple = false, accept, maxSize, maxFiles, zone = false, rejectBy = $bindable([]), flip = false, children, aux, events, variant = VARIANT.NEUTRAL, element = $bindable(), class: c, id: idProp, "aria-describedby": ariaDescribedbyProp, "aria-invalid": ariaInvalid, onchange: onchangeProp, oninvalid: oninvalidProp, onclick: onclickProp, attach, styling, ...rest }: FileInputProps = $props();
  const ctx = _getFileInputContext();

  // *** States *** //
  let dragover = $state(false);

  // *** Initialize *** //
  const cls = $derived(fnClass(_FILE_INPUT_PRESET, styling ?? ctx?.styling));
  const effVariant = $derived(dragover ? VARIANT.ACTIVE : ctx ? ctx.variant : variant);
  const effFiles = $derived(ctx ? ctx.files : files);
  const effId = $derived(ctx ? ctx.id : idProp);
  const effDescribedby = $derived(ctx ? ctx.describedby : ariaDescribedbyProp);
  const effAriaErrMsgId = $derived(ctx ? ctx.ariaErrMsgId : undefined);
  const cap = $derived(multiple ? (maxFiles ?? Infinity) : 1);

  function setFiles(v: File[]) {
    if (ctx) ctx.files = v;
    else files = v;
  }
  function matchesAccept(file: File): boolean {
    if (!accept?.trim()) return true;
    const name = file.name.toLowerCase();
    const type = file.type.toLowerCase();
    for (const token of accept
      .split(",")
      .map((x) => x.trim().toLowerCase())
      .filter(Boolean)) {
      if (token === "*") return true;
      if (token.startsWith(".") && name.endsWith(token)) return true;
      if (token.endsWith("/*") && type.startsWith(token.slice(0, -1))) return true;
      if (token === type) return true;
    }
    return false;
  }
  function withinSize(file: File): boolean {
    return maxSize === undefined || file.size <= maxSize;
  }
  function sameFiles(list: FileList | null, arr: File[]): boolean {
    if (!list || list.length !== arr.length) return false;
    return arr.every((file, i) => list.item(i) === file);
  }
  function sameFileArray(a: File[], b: File[]): boolean {
    return a.length === b.length && a.every((file, i) => b[i] === file);
  }

  // *** Reactive Handlers *** //
  $effect(() => {
    if (ctx) ctx.element = element;
  });
  $effect(() => {
    effFiles;
    untrack(() => syncInputFiles());
  });
  function syncInputFiles() {
    if (!element || typeof DataTransfer === "undefined") return;
    if (sameFiles(element.files, effFiles)) return;
    const dt = new DataTransfer();
    for (const f of effFiles) dt.items.add(f);
    element.files = dt.files;
  }

  // *** Event Handlers *** //
  function addFiles(incoming: File[]) {
    const current = multiple ? effFiles : [];
    const accepted: File[] = [];
    const rejected: FileRejection[] = [];
    for (const file of incoming) {
      if (current.length + accepted.length >= cap) rejected.push({ file, reason: "maxFiles" });
      else if (!matchesAccept(file)) rejected.push({ file, reason: "accept" });
      else if (!withinSize(file)) rejected.push({ file, reason: "maxSize" });
      else accepted.push(file);
    }
    const detail = { candidates: accepted, rejected, files: current };
    const vetoed = new Set<File>();
    for (const f of events?.onadd?.(detail) ?? []) vetoed.add(f);
    for (const f of ctx?.events?.onadd?.(detail) ?? []) vetoed.add(f);
    const committed = accepted.filter((f) => !vetoed.has(f));
    const next = multiple ? [...current, ...committed] : committed;
    if (!sameFileArray(effFiles, next)) setFiles(next);
    rejectBy = [...new Set(rejected.map((r) => r.reason))];
  }
  const remove = (file: File) => {
    const next = effFiles.filter((f) => f !== file);
    if (!sameFileArray(effFiles, next)) setFiles(next);
  };
  const hclick: MouseEventHandler<HTMLInputElement> = (ev) => {
    onclickProp?.(ev);
    if (element) element.value = "";
  };
  const hcancel: EventHandler<Event, HTMLInputElement> = () => syncInputFiles();
  const hchange: ChangeEventHandler<HTMLInputElement> = (ev) => {
    addFiles([...(element?.files ?? [])]);
    onchangeProp?.(ev);
    ctx?.onchange?.(ev);
  };
  const hinvalid: EventHandler<Event, HTMLInputElement> = (ev) => {
    oninvalidProp?.(ev);
    ctx?.oninvalid?.(ev);
  };
  const hdragenter: DragEventHandler<HTMLLabelElement> = (ev) => {
    if (rest.disabled) return;
    ev.preventDefault();
    dragover = true;
  };
  const hdragover: DragEventHandler<HTMLLabelElement> = hdragenter;
  const hdragleave: DragEventHandler<HTMLLabelElement> = (ev) => {
    if (rest.disabled) return;
    const target = ev.currentTarget;
    const next = ev.relatedTarget;
    if (target instanceof Node && next instanceof Node && target.contains(next)) return;
    dragover = false;
  };
  const hdrop: DragEventHandler<HTMLLabelElement> = (ev) => {
    if (rest.disabled) return;
    ev.preventDefault();
    dragover = false;
    addFiles([...(ev.dataTransfer?.files ?? [])]);
  };
</script>

<!---------------------------------------->

<div class={cls(PARTS.WHOLE, effVariant)}>
  {#if aux && flip}
    <div class={cls(PARTS.AUX, effVariant)}>{@render aux(effFiles, remove, effVariant)}</div>
  {/if}
  <label
    class={cls(PARTS.MIDDLE, effVariant)}
    data-dragover={dragover || undefined}
    ondragenter={zone ? hdragenter : undefined}
    ondragover={zone ? hdragover : undefined}
    ondragleave={zone ? hdragleave : undefined}
    ondrop={zone ? hdrop : undefined}
  >
    <input
      bind:this={element}
      class={[cls(PARTS.MAIN, effVariant), c]}
      {...rest}
      type="file"
      {multiple}
      {accept}
      id={effId}
      onchange={hchange}
      oncancel={hcancel}
      oninvalid={hinvalid}
      onclick={hclick}
      aria-describedby={effDescribedby}
      aria-invalid={ariaInvalid ?? (effAriaErrMsgId ? true : undefined)}
      aria-errormessage={effAriaErrMsgId}
      style={SR_ONLY}
      {@attach attach}
    />
    {@render children(effFiles, dragover, effVariant)}
  </label>
  {#if aux && !flip}
    <div class={cls(PARTS.AUX, effVariant)}>{@render aux(effFiles, remove, effVariant)}</div>
  {/if}
</div>
