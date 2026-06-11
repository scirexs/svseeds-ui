<!--
  @component
  ### Types
  default value: *`(value)`*
  ```ts
  interface ColorPickerProps extends Omit<HTMLInputAttributes, "type" | "value"> {
    value?: string; // bindable ("#000000")
    alpha?: number; // (1)
    checkered?: boolean; // (true)
    attach?: Attachment;
    element?: HTMLInputElement; // bindable
    styling?: SVSClass;
    variant?: SVSVariant; // (VARIANT.NEUTRAL)
    // class & other HTMLInputAttributes are passed to <input> via ...rest (class is merged onto the control)
  }
  ```
  ### Anatomy
  ```svelte
  <label class="whole">
    <div class="middle"> // this middle element can provide the default transparency background when checkered is true
      <div class="main"> // this main element is color sample and positions the transparent, focusable native input overlay
        <input class={class} type="color" {...rest} bind:value bind:this={element} {@attach attach} />
      </div>
    </div>
  </label>
  ```
  ### Exports
  ```ts
  // Converts RGB color values to hexadecimal color code.
  //
  // *@param* rgb - Array of RGB values [red, green, blue] where each value is 0-255
  // *@returns* Hexadecimal color code string starting with '#'
  //
  // *@example*
  // getHex([255, 123, 34])  // "#ff7b22"
  // getHex([255, 255, 255]) // "#ffffff"
  function getHex(rgb: [number, number, number]): string
  ```
-->
<script module lang="ts">
  export interface ColorPickerProps extends Omit<HTMLInputAttributes, "type" | "value" | "alpha"> {
    value?: string; // bindable ("#000000")
    alpha?: number; // (1)
    checkered?: boolean; // (true)
    attach?: Attachment;
    element?: HTMLInputElement; // bindable
    styling?: SVSClass;
    variant?: SVSVariant; // (VARIANT.NEUTRAL)
  }
  export type ColorPickerReqdProps = never;
  export type ColorPickerBindProps = "value" | "element";
  export function getHex(rgb: RgbColor): string {
    if (!isValidRgb(rgb)) return DEFAULT_COLOR;
    return "#" + ((1 << 24) | (rgb[0] << 16) | (rgb[1] << 8) | rgb[2]).toString(16).slice(1);
  }

  type RgbColor = [number, number, number];
  const DEFAULT_COLOR = "#000000";
  const CHECKERED =
    "background-image: linear-gradient(45deg,#ccc 25%,transparent 25%),linear-gradient(-45deg,#ccc 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#ccc 75%),linear-gradient(-45deg,transparent 75%,#ccc 75%); background-size: 20px 20px; background-position: 0 0,0 10px,10px -10px,-10px 0px;";
  const preset = "svs-color-picker";

  function parseHex(hex: string): RgbColor | undefined {
    const rgb = formatHex(hex)?.filter((x) => x.length === 2);
    if (!rgb || rgb.length !== 3) return undefined;
    return rgb.map((x) => Number.parseInt(x, 16)) as RgbColor;
  }
  function normalizeHex(hex: string): string {
    const rgb = parseHex(hex);
    return rgb ? getHex(rgb) : DEFAULT_COLOR;
  }
  function formatHex(hex: string): RegExpExecArray | null {
    if (hex.startsWith("#")) hex = hex.substring(1);
    hex = hex.replace(/^([a-f\d])([a-f\d])([a-f\d])$/i, (_, r, g, b) => r + r + g + g + b + b);
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

  import { type Attachment } from "svelte/attachments";
  import { type HTMLInputAttributes } from "svelte/elements";
  import { type SVSClass, type SVSVariant, VARIANT, PARTS, fnClass } from "./core";
</script>

<script lang="ts">
  // prettier-ignore
  let { value = $bindable(DEFAULT_COLOR), alpha = 1, checkered = true, attach, element = $bindable(), styling, variant = VARIANT.NEUTRAL, class: c, ...rest }: ColorPickerProps = $props();

  // *** Initialize *** //
  const cls = $derived(fnClass(preset, styling));
  value = normalizeHex(value);
  $effect.pre(() => {
    const n = normalizeHex(value);
    if (n !== value) value = n;
  });

  // *** Reactive Handlers *** //
  const rgb = $derived(parseHex(value) ?? [0, 0, 0]);
  const alp = $derived(correctAlpha(alpha));
</script>

<!---------------------------------------->

<label class={cls(PARTS.WHOLE, variant)}>
  <div class={cls(PARTS.MIDDLE, variant)} style={`display: inline-block;${checkered ? CHECKERED : ""}`}>
    <div class={cls(PARTS.MAIN, variant)} style={`position: relative; background-color: rgba(${rgb[0]},${rgb[1]},${rgb[2]},${alp})`}>
      <input
        bind:value
        bind:this={element}
        class={c}
        {...rest}
        type="color"
        style="position: absolute; inset: 0; width: 100%; height: 100%; opacity: 0; cursor: pointer;"
        {@attach attach}
      />
    </div>
  </div>
</label>
