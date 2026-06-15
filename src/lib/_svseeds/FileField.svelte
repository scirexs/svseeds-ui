<!--
  @component
  ### Types
  default value: *`(files, variant, element)`*
  ```ts
  interface FileFieldProps {
    content: Snippet<[File[], boolean, string]>; // Snippet<[files,dragover,variant]>
    label?: string;
    extra?: string;
    aux?: Snippet<[File[], string, HTMLInputElement | undefined]>; // Snippet<[files,variant,element]>
    left?: Snippet<[File[], string, HTMLInputElement | undefined]>; // Snippet<[files,variant,element]>
    right?: Snippet<[File[], string, HTMLInputElement | undefined]>; // Snippet<[files,variant,element]>
    bottom?: string;
    reserve?: boolean; // (false)
    flip?: boolean; // (false)
    files?: File[]; // bindable
    multiple?: boolean; // (false)
    accept?: string;
    maxSize?: number;
    maxFiles?: number;
    zone?: boolean; // (false)
    constraints?: FileFieldConstraint[];
    validations?: FileFieldValidation[];
    name?: string;
    element?: HTMLInputElement; // bindable
    styling?: SVSClass;
    variant?: SVSVariant; // bindable (VARIANT.NEUTRAL)
    children?: Snippet;
  }
  type FileFieldConstraint = (ctx: { file: File; files: File[]; reason?: FileRejectReason; validity: ValidityState; element: HTMLInputElement }) => string | undefined | null;
  type FileFieldValidation = SVSFieldValidation<File[]>;
  // When reason is set, the primitive already rejected the file and the constraint supplies a message only.
  // When reason is undefined, a returned message also vetoes that candidate before commit.
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
      {#if children}{@render children()}{:else}<FileInput />{/if}
      <span class="right" conditional>{right}</span>
    </div>
    <div class="bottom" conditional: has text, or always when reserve; role="alert only on error">{bottom}</div>
  </div>
  ```
-->
<script module lang="ts">
  export interface FileFieldProps {
    content: Snippet<[File[], boolean, string]>; // Snippet<[files,dragover,variant]>; zone content, presentational only
    label?: string;
    extra?: string;
    aux?: Snippet<[File[], string, HTMLInputElement | undefined]>; // Snippet<[files,variant,element]>
    left?: Snippet<[File[], string, HTMLInputElement | undefined]>; // Snippet<[files,variant,element]>
    right?: Snippet<[File[], string, HTMLInputElement | undefined]>; // Snippet<[files,variant,element]>
    bottom?: string;
    reserve?: boolean; // (false)
    flip?: boolean; // (false)
    files?: File[]; // bindable
    multiple?: boolean; // (false)
    accept?: string;
    maxSize?: number;
    maxFiles?: number;
    zone?: boolean; // (false)
    constraints?: FileFieldConstraint[];
    validations?: FileFieldValidation[];
    name?: string;
    element?: HTMLInputElement; // bindable
    styling?: SVSClass;
    variant?: SVSVariant; // bindable (VARIANT.NEUTRAL)
    children?: Snippet;
  }
  export type FileFieldReqdProps = "content";
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

  import { type Snippet, untrack } from "svelte";
  import { type SVSClass, type SVSVariant, type SVSFieldValidation, VARIANT, PARTS, fnClass, isNeutral } from "./core";
  import FileInput, {
    _FILE_INPUT_PRESET,
    _setFileInputContext,
    type FileInputContext,
    type FileRejection,
    type FileRejectReason,
  } from "./_FileInput.svelte";
</script>

<script lang="ts">
  // prettier-ignore
  let { label, extra, aux, left, right, bottom, reserve = false, flip = false, files = $bindable([]), multiple = false, accept, maxSize, maxFiles, zone = false, content, constraints = [], validations = [], name, element = $bindable(), variant = $bindable(VARIANT.NEUTRAL), styling, children }: FileFieldProps = $props();

  // *** Initialize *** //
  const cls = $derived(fnClass(_FILE_FIELD_PRESET, styling));
  const uid = $props.id();
  const id = $derived(label?.trim() ? `${uid}-ctrl` : undefined);
  const idLabel = $derived(label?.trim() ? `${uid}-label` : undefined);
  const idDesc = $derived(bottom?.trim() ? `${uid}-desc` : undefined);
  const idErr = $derived(idDesc ?? `${uid}-err`);
  let errmsg = $state("");
  const message = $derived(variant === VARIANT.INACTIVE ? errmsg || bottom : bottom);
  const idMsg = $derived(variant === VARIANT.INACTIVE && message?.trim() ? idErr : undefined);

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
  let neutral = isNeutral(variant) ? variant : VARIANT.NEUTRAL;
  let adding = false;
  let addError = false;
  let touched = false;
  $effect(() => {
    neutral = isNeutral(variant) ? variant : neutral;
  });
  const live = $derived(variant === VARIANT.INACTIVE ? "alert" : undefined);
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
    if (!element) return;
    for (const v of validations) {
      const msg = v({ value: files, validity: element.validity, element });
      if (msg) return element.setCustomValidity(msg);
    }
    element.setCustomValidity("");
  }

  // *** Reactive Handlers *** //
  $effect.pre(() => {
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
  function onadd(detail: { candidates: File[]; rejected: FileRejection[]; files: File[] }): File[] {
    let msg: string | undefined;
    for (const { file, reason } of detail.rejected) {
      const m = check(file, reason);
      if (m && !msg) msg = m;
    }
    const vetoed: File[] = [];
    for (const file of detail.candidates) {
      const m = check(file);
      if (m) {
        vetoed.push(file);
        if (!msg) msg = m;
      }
    }
    const committed = detail.candidates.filter((f) => !vetoed.includes(f));
    const next = multiple ? [...detail.files, ...committed] : committed;
    const changed = next.length !== files.length || next.some((f, i) => f !== files[i]);
    addError = !!msg && changed;
    adding = true;
    variant = neutral;
    element?.setCustomValidity(msg ?? "");
    shift(false, msg);
    return vetoed;
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
    if (!isNeutral(variant)) shift();
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
  {@render desc(flip)}
  <div class={cls(PARTS.MIDDLE, variant)}>
    {@render side(PARTS.LEFT, left)}
    {#if children}
      {@render children()}
    {:else}
      <FileInput {multiple} {accept} {maxSize} {maxFiles} {zone} {name} children={content} />
    {/if}
    {@render side(PARTS.RIGHT, right)}
  </div>
  {@render desc(!flip)}
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
{#snippet desc(show: boolean)}
  {#if show && (reserve || message?.trim())}
    <div class={cls(PARTS.BOTTOM, variant)} id={idDesc ?? idErr} role={live}>{message}</div>
  {/if}
{/snippet}
