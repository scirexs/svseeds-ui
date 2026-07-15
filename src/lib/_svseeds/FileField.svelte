<!--
  @component
  ### Usage
  Use standalone, or wrap `FileInput` to share state.
  ```svelte
  <FileField {...props} />

  <FileField {...props}>
    <FileInput {...props} />
  </FileField>
  ```
  ### Types
  default value: *`(value)`*
  ```ts
  interface FileFieldProps {
    content?: Snippet<[File[], boolean, string]>; // Snippet<[files,dragover,variant]>; zone content, presentational only
    label?: string;
    extra?: string;
    aux?: Snippet<[File[], string, HTMLInputElement | undefined]>; // Snippet<[files,variant,element]>
    left?: Snippet<[File[], string, HTMLInputElement | undefined]>; // Snippet<[files,variant,element]>
    right?: Snippet<[File[], string, HTMLInputElement | undefined]>; // Snippet<[files,variant,element]>
    bottom?: string;
    reserve?: boolean; // (false)
    files?: File[]; // bindable
    multiple?: boolean; // (false)
    constraints?: FileFieldConstraint[];
    validations?: FileFieldValidation[];
    name?: string;
    element?: HTMLInputElement; // bindable
    styling?: SVSClass;
    variant?: SVSVariant; // bindable (VARIANT.NEUTRAL)
    fileInput?: Omit<FileInputProps, FileInputReqdProps | FileInputBindProps | "multiple" | "name" | "variant" | "events">; // default <FileInput/> props
    children?: Snippet;
  }
  type FileFieldConstraint = (ctx: { file: File; files: File[]; reason?: FileRejectReason; validity: ValidityState; element: HTMLInputElement }) => string | undefined | null;
  type FileFieldValidation = SVSFieldValidation<File[]>;
  // When reason is set, the primitive already rejected the file and the constraint supplies a message only.
  // When reason is undefined, a returned message also vetoes that candidate before commit.
  // `content` is the default control's zone content only; when `children` is provided it is ignored.
  // `fileInput` configures the default `<FileInput/>` only; when `children` is provided the bag is ignored and the child control owns its own props.
  // When neither `content` nor `children` is given, the default control is not rendered.
  ```
  ### Anatomy
  ```svelte
  <div class="whole">
    <div class="top" conditional: label or aux>
      <label class="label" conditional>
        {label}
        <span class="extra" conditional>{extra}</span>
      </label>
      <span class="aux" conditional>{aux}</span>
    </div>
    <div class="middle">
      <span class="left" conditional>{left}</span>
      {#if children}{@render children()}{:else if content}<FileInput />{/if}
      <span class="right" conditional>{right}</span>
    </div>
    <div class="bottom" conditional: has text, or always when reserve; role="alert only on error">{bottom}</div>
  </div>
  ```
-->
<script module lang="ts">
  export interface FileFieldProps {
    content?: Snippet<[File[], boolean, string]>; // Snippet<[files,dragover,variant]>; zone content, presentational only
    label?: string;
    extra?: string;
    aux?: Snippet<[File[], string, HTMLInputElement | undefined]>; // Snippet<[files,variant,element]>
    left?: Snippet<[File[], string, HTMLInputElement | undefined]>; // Snippet<[files,variant,element]>
    right?: Snippet<[File[], string, HTMLInputElement | undefined]>; // Snippet<[files,variant,element]>
    bottom?: string;
    reserve?: boolean; // (false)
    files?: File[]; // bindable
    multiple?: boolean; // (false)
    constraints?: FileFieldConstraint[];
    validations?: FileFieldValidation[];
    name?: string;
    element?: HTMLInputElement; // bindable
    styling?: SVSClass;
    variant?: SVSVariant; // bindable (VARIANT.NEUTRAL)
    fileInput?: Omit<FileInputProps, FileInputReqdProps | FileInputBindProps | "multiple" | "name" | "variant" | "events">; // default <FileInput/> props
    children?: Snippet;
  }
  export type FileFieldReqdProps = never;
  export type FileFieldBindProps = "files" | "variant" | "element";
  export type FileFieldConstraint = (ctx: {
    file: File;
    files: File[];
    reason?: FileRejectReason;
    validity: ValidityState;
    element: HTMLInputElement;
  }) => string | undefined | null;
  export type FileFieldValidation = SVSFieldValidation<File[]>;

  export const _FILE_FIELD_PRESET = "svs-file-field";

  import { untrack } from "svelte";
  import { VARIANT, PARTS, _fieldAria, _fieldIds, _fieldMessage, _fnClass, _isNeutral, _verify } from "./_core";
  import FileInput, { _FILE_INPUT_PRESET, _setFileInputContext } from "./FileInput.svelte";
  import type { Snippet } from "svelte";
  import type { SVSClass, SVSVariant, SVSFieldValidation } from "./_core";
  import type {
    FileInputContext,
    FileInputProps,
    FileInputReqdProps,
    FileInputBindProps,
    FileRejection,
    FileRejectReason,
  } from "./FileInput.svelte";
</script>

<script lang="ts">
  // prettier-ignore
  let { label, extra, aux, left, right, bottom, reserve = false, files = $bindable([]), multiple = false, content, constraints = [], validations = [], name, element = $bindable(), variant = $bindable(VARIANT.NEUTRAL), styling, fileInput, children }: FileFieldProps = $props();

  // *** Initialize *** //
  const cls = $derived(_fnClass(_FILE_FIELD_PRESET, styling));
  const uid = $props.id();
  const id = $derived(label?.trim() ? `${uid}-ctrl` : undefined);
  const ids = $derived(_fieldIds(uid, label, bottom));
  const idLabel = $derived(ids.idLabel);
  const idDesc = $derived(ids.idDesc);
  const idErr = $derived(ids.idErr);
  let errmsg = $state("");
  const message = $derived(_fieldMessage(variant, errmsg, bottom));
  const aria = $derived(_fieldAria(variant, message, idErr));
  const idMsg = $derived(aria.idMsg);

  // *** Initialize Context *** //
  const ctx: FileInputContext = {
    get files() {
      return files;
    },
    set files(v) {
      files = v;
    },
    get variant() {
      return variant;
    },
    set element(v: HTMLInputElement | undefined) {
      element = v;
    },
    get ariaErrMsgId() {
      return idMsg;
    },
    get styling() {
      return `${_FILE_FIELD_PRESET} ${_FILE_INPUT_PRESET}`;
    },
    get id() {
      return id;
    },
    get describedby() {
      return idDesc;
    },
    events: { onadd },
    onchange,
    oninvalid,
  };
  _setFileInputContext(ctx);

  // *** States *** //
  let neutral = _isNeutral(variant) ? variant : VARIANT.NEUTRAL;
  let adding = false;
  let addError = false;
  let touched = false;
  $effect(() => {
    neutral = _isNeutral(variant) ? variant : neutral;
  });
  const live = $derived(aria.live);
  function shift(oninvalid: boolean = false, msg?: string) {
    const vmsg = element?.validationMessage ?? "";
    if (files.length) touched = true;
    variant = getStatus(oninvalid, vmsg, msg);
    errmsg = msg ? msg : vmsg;
  }
  function getStatus(oninvalid: boolean, vmsg: string, msg?: string): string {
    if (msg || (oninvalid && vmsg)) return VARIANT.INACTIVE;
    if (!files.length) return touched && vmsg ? VARIANT.INACTIVE : neutral;
    return vmsg ? VARIANT.INACTIVE : VARIANT.ACTIVE;
  }
  function verify() {
    _verify(element, validations, files);
  }

  // *** Reactive Handlers *** //
  $effect(() => {
    files;
    untrack(() => validate());
  });
  function validate() {
    if (addError) {
      addError = false;
      return;
    }
    verify();
    shift();
  }

  // *** Event Handlers *** //
  function onadd(detail: { values: File[]; added: File[]; rejected: FileRejection[] }): File[] {
    let msg: string | undefined;
    for (const { file, reason } of detail.rejected) {
      const m = check(file, reason);
      if (m && !msg) msg = m;
    }
    let committed = detail.added;
    for (const file of detail.added) {
      const m = check(file);
      if (m) {
        committed = committed.filter((f) => f !== file);
        if (!msg) msg = m;
      }
    }
    const next = multiple ? [...detail.values, ...committed] : committed;
    const changed = next.length !== files.length || next.some((f, i) => f !== files[i]);
    addError = !!msg && changed;
    adding = true;
    variant = neutral;
    element?.setCustomValidity(msg ?? "");
    shift(false, msg);
    return committed;
  }
  function check(file: File, reason?: FileRejectReason): string | undefined {
    if (!element) return;
    for (const c of constraints) {
      const msg = c({ file, files, reason, validity: element.validity, element });
      if (msg) return msg;
    }
  }
  function onchange(_ev: Event) {
    if (adding) {
      adding = false;
      return;
    }
    if (!_isNeutral(variant)) shift();
  }
  function oninvalid(ev: Event) {
    ev.preventDefault();
    shift(true);
  }
  $effect(() => untrack(() => verify()));
</script>

<!---------------------------------------->

<div class={cls(PARTS.WHOLE, variant)} role="group" aria-labelledby={idLabel}>
  {#if label?.trim() || aux}
    <div class={cls(PARTS.TOP, variant)}>
      {@render lbl()}
      {#if aux}
        <span class={cls(PARTS.AUX, variant)}>{@render aux(files, variant, element)}</span>
      {/if}
    </div>
  {/if}
  <div class={cls(PARTS.MIDDLE, variant)}>
    {@render side(PARTS.LEFT, left)}
    {#if children}
      {@render children()}
    {:else if content}
      <FileInput {...fileInput} {multiple} {name} children={content} />
    {/if}
    {@render side(PARTS.RIGHT, right)}
  </div>
  {#if reserve || message?.trim()}
    <div class={cls(PARTS.BOTTOM, variant)} id={idErr} role={live}>{message}</div>
  {/if}
</div>

{#snippet lbl()}
  {#if label?.trim()}
    <label class={cls(PARTS.LABEL, variant)} for={id} id={idLabel}>
      {label}
      {#if extra?.trim()}
        <span class={cls(PARTS.EXTRA, variant)}>{extra}</span>
      {/if}
    </label>
  {/if}
{/snippet}
{#snippet side(area: string, body?: Snippet<[File[], string, HTMLInputElement | undefined]>)}
  {#if body}
    <span class={cls(area, variant)}>{@render body(files, variant, element)}</span>
  {/if}
{/snippet}
