<!--
  @component
  ### Types
  default value: *`(value)`*
  ```ts
  interface ColorPickerProps {
    value?: string; // bindable ("#000000")
    alpha?: number; // bindable (1)
    attributes?: HTMLInputAttributes;
    action?: Action;
    element?: HTMLInputElement; // bindable
    styling?: SVSClass;
    variant?: string; // bindable (VARIANT.NEUTRAL)
  }
  ```
  ### Anatomy
  ```svelte
  <label class="whole">
    <div class="middle"> // this middle element is background for transparency color
      <div class="main"> // this main element is color sample
        <input type="color" {...attributes} bind:value bind:this={element} use:action />
      </div>
    </div>
  </label>
  ```
  ### Exports
  ```ts
  type RgbColor = [number, number, number];
  function getHex(rgb: RgbColor): string
  // getHex([255, 123, 34])  => "#ff7b22"
  // getHex([255, 255, 255]) => "#ffffff"
  ```
-->
<script module lang="ts">
  export interface ColorPickerProps {
    value?: string; // bindable ("#000000")
    alpha?: number; // bindable (1)
    attributes?: HTMLInputAttributes;
    action?: Action;
    element?: HTMLInputElement; // bindable
    styling?: SVSClass;
    variant?: string; // bindable (VARIANT.NEUTRAL)
  }
  export type ColorPickerReqdProps = never;
  export type ColorPickerBindProps = "value" | "alpha" | "variant" | "element";
  export function getHex(rgb: RgbColor): string {
    if (!isValidRgb(rgb)) return DEFAULT_COLOR;
    return "#" + (1 << 24 | rgb[0] << 16 | rgb[1] << 8 | rgb[2]).toString(16).slice(1);
  }

  type RgbColor = [number, number, number];
  const DEFAULT_COLOR = "#000000";
  const preset = "svs-color-picker";

  function castValidHex(hex: string): string | undefined {
    return `#${formatHex(hex)?.filter((x) => x.length === 2).join("")}`;
  }
  function castHexToRgb(hex: string): RgbColor {
    const rgb = formatHex(hex)?.filter((x) => x.length === 2);
    return rgb ? rgb.map((x) => Number.parseInt(x, 16)) as RgbColor : [0, 0, 0];
  }
  function formatHex(hex: string): RegExpExecArray | null {
    if (hex.startsWith("#")) hex = hex.substring(1);
    hex = hex.replace(/^([a-f\d])([a-f\d])([a-f\d])$/i, (_, r, g, b) => r+r + g+g + b+b);
    return /^([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  }
  function isValidRgb(rgb: RgbColor): boolean {
    return rgb.every((x) => x >= 0 && x <= 255);
  }
  function correctAlpha(alpha: number): number {
    if (alpha <= 0) return 0;
    if (alpha >= 1) return 1;
    return alpha;
  }

  import { type Action } from "svelte/action";
  import { type HTMLInputAttributes } from "svelte/elements";
  import { type SVSClass, VARIANT, PARTS, fnClass, omit } from "./core";
</script>

<script lang="ts">
  let { value = $bindable(DEFAULT_COLOR), alpha = $bindable(1), attributes, action, element = $bindable(), styling, variant = $bindable("") }: ColorPickerProps = $props();

  // *** Initialize *** //
  if (!variant) variant = VARIANT.NEUTRAL;
  const cls = fnClass(preset, styling);
  const attrs = omit(attributes, "type");
  value = castValidHex(value) ?? DEFAULT_COLOR;

  // *** Bind Handlers *** //
  let rgb = $derived(castHexToRgb(value));
  let alp = $derived(correctAlpha(alpha));
</script>

<!---------------------------------------->

<label class={cls(PARTS.WHOLE, variant)}>
  <div  class={cls(PARTS.MIDDLE, variant)} style="display: inline-block; background-image: linear-gradient(45deg,#ccc 25%,transparent 25%),linear-gradient(-45deg,#ccc 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#ccc 75%),linear-gradient(-45deg,transparent 75%,#ccc 75%); background-size: 20px 20px; background-position: 0 0,0 10px,10px -10px,-10px 0px;">
    <div class={cls(PARTS.MAIN, variant)} style={`background-color: rgba(${rgb[0]},${rgb[1]},${rgb[2]},${alp})`}>
      {#if action}
        <input bind:value bind:this={element} type="color" style="visibility: hidden;" {...attrs} use:action />
      {:else}
        <input bind:value bind:this={element} type="color" style="visibility: hidden;" {...attrs} />
      {/if}
    </div>
  </div>
</label>
