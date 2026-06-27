<!--
  @component
  ### Usage
  Use standalone.
  ```svelte
  <Image src="/photo.jpg" alt="Photo" />
  ```
  ### Types
  default value: *`(value)`*
  ```ts
  interface ImageProps extends Omit<HTMLImgAttributes, "src" | "alt" | "onload" | "onerror"> {
    src: string;
    alt: string; // empty string is valid for decorative images
    sources?: ImageSource[]; // alternate <source> candidates
    placeholder?: string; // CSS background shown until load
    firstView?: boolean; // (false); sets eager/high/default preload unless overridden
    preload?: boolean; // (firstView ?? false)
    onload?: EventHandler<Event, HTMLImageElement> | null;
    onerror?: EventHandler<Event, HTMLImageElement> | null;
    attach?: Attachment<HTMLImageElement>;
    element?: HTMLImageElement; // bindable
    styling?: SVSClass;
    variant?: SVSVariant; // bindable (VARIANT.NEUTRAL)
    // other HTMLImgAttributes are passed to <img> via ...rest; `class` is merged onto root <picture>
  }
  interface ImageSource {
    srcset: string;
    type?: string;
    media?: string;
    sizes?: string;
    width?: number;
    height?: number;
  }
  // Supply both width and height when possible to reserve aspect ratio and minimize layout shift.
  ```
  ### Anatomy
  ```svelte
  <picture class="whole">
    <source srcset type media sizes width height conditional:sources>
    <img class="main" {...rest} {src} {alt} loading fetchpriority decoding style onload onerror data-loaded data-error>
  </picture>
  ```
  ### Behavior
  `firstView` is sugar for eager loading, high fetch priority, and preload; native
  `loading`, `fetchpriority`, and `decoding` attrs in `...rest` override the
  defaults. Load sets `data-loaded` and `variant=ACTIVE`; error sets
  `data-error` and `variant=INACTIVE`; neutral state restores the caller's
  variant. A placeholder is emitted as the img background until load, then
  cleared. Missing `<source>` types are derived from the first `srcset`
  candidate's extension when known. Preload mirrors only the highest-priority
  candidate (`sources[0]` or the img), so art-direction fan-out is intentionally
  represented by a single preload link.
-->
<script module lang="ts">
  export interface ImageProps extends Omit<HTMLImgAttributes, "src" | "alt" | "onload" | "onerror"> {
    src: string;
    alt: string;
    sources?: ImageSource[];
    placeholder?: string;
    firstView?: boolean;
    preload?: boolean;
    onload?: EventHandler<Event, HTMLImageElement> | null;
    onerror?: EventHandler<Event, HTMLImageElement> | null;
    attach?: Attachment<HTMLImageElement>;
    element?: HTMLImageElement;
    styling?: SVSClass;
    variant?: SVSVariant;
  }
  export interface ImageSource {
    srcset: string;
    type?: string;
    media?: string;
    sizes?: string;
    width?: number;
    height?: number;
  }
  export type ImageReqdProps = "src" | "alt";
  export type ImageBindProps = "element" | "variant";

  export const _IMAGE_PRESET = "svs-image";

  import { VARIANT, PARTS, _fnClass } from "./_core";
  import type { Attachment } from "svelte/attachments";
  import type { EventHandler, HTMLImgAttributes } from "svelte/elements";
  import type { SVSClass, SVSVariant } from "./_core";
</script>

<script lang="ts">
  // prettier-ignore
  let { src, alt, sources, placeholder, firstView, preload, onload, onerror, attach, element = $bindable(), styling, variant = $bindable(VARIANT.NEUTRAL), class: c, style, ...rest }: ImageProps = $props();

  // *** Initialize *** //
  const cls = $derived(_fnClass(_IMAGE_PRESET, styling));
  const effPreload = $derived(preload ?? firstView ?? false);
  const effFetch = $derived(rest.fetchpriority ?? (firstView ? "high" : undefined));
  const headSource = $derived(sources?.[0]);
  const headSrcset = $derived(headSource ? headSource.srcset : rest.srcset);
  const headSizes = $derived(headSource ? (headSource.sizes ?? rest.sizes) : rest.sizes);
  const headType = $derived(headSource ? sourceType(headSource) : undefined);
  let lastSrc = $state<string | undefined>();

  // *** States *** //
  let loaded = $state(false);
  let errored = $state(false);
  let prevVariant: SVSVariant | undefined;

  // *** Reactive Handlers *** //
  const bg = $derived(!loaded && placeholder ? `background:${placeholder}` : undefined);
  const imgStyle = $derived([bg, style].filter(Boolean).join(";") || undefined);

  $effect(() => {
    if (lastSrc === undefined) {
      lastSrc = src;
      return;
    }
    if (src === lastSrc) return;
    loaded = false;
    errored = false;
    lastSrc = src;
  });

  $effect(() => {
    const next = loaded ? VARIANT.ACTIVE : errored ? VARIANT.INACTIVE : undefined;
    if (next) {
      if (variant !== next) {
        if (prevVariant === undefined) prevVariant = variant;
        variant = next;
      }
    } else if (prevVariant !== undefined) {
      variant = prevVariant;
      prevVariant = undefined;
    }
  });

  function sourceType(source: ImageSource): string | undefined {
    return source.type ?? srcsetType(source.srcset);
  }
  function srcsetType(srcset: string): string | undefined {
    const first = srcset
      .trim()
      .split(/[,\s]+/, 1)[0]
      ?.split(/[?#]/, 1)[0];
    const ext = first?.match(/\.([a-z0-9]+)$/i)?.[1]?.toLowerCase();
    if (ext === "avif") return "image/avif";
    if (ext === "webp") return "image/webp";
    if (ext === "svg") return "image/svg+xml";
    if (ext === "jpg" || ext === "jpeg") return "image/jpeg";
    if (ext === "png") return "image/png";
    if (ext === "apng") return "image/apng";
    if (ext === "gif") return "image/gif";
    return undefined;
  }

  // *** Event Handlers *** //
  const hload: EventHandler = (ev) => {
    loaded = true;
    errored = false;
    onload?.(ev as Parameters<NonNullable<ImageProps["onload"]>>[0]);
  };
  const herror: EventHandler = (ev) => {
    errored = true;
    loaded = false;
    onerror?.(ev as Parameters<NonNullable<ImageProps["onerror"]>>[0]);
  };
</script>

<!---------------------------------------->

<svelte:head>
  {#if effPreload}
    <link
      rel="preload"
      as="image"
      href={src}
      imagesrcset={headSrcset}
      imagesizes={headSizes}
      type={headType}
      media={headSource?.media}
      fetchpriority={effFetch}
    />
  {/if}
</svelte:head>

<picture class={[cls(PARTS.WHOLE, variant), c]}>
  {#each sources ?? [] as source}
    <source
      srcset={source.srcset}
      type={sourceType(source)}
      media={source.media}
      sizes={source.sizes}
      width={source.width}
      height={source.height}
    />
  {/each}
  <img
    bind:this={element}
    class={cls(PARTS.MAIN, variant)}
    {src}
    {alt}
    loading={firstView ? "eager" : "lazy"}
    fetchpriority={firstView ? "high" : undefined}
    decoding="async"
    {...rest}
    style={imgStyle}
    onload={hload}
    onerror={herror}
    data-loaded={loaded ? true : undefined}
    data-error={errored ? true : undefined}
    {@attach attach}
  />
</picture>
