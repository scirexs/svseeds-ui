import { describe, expect, test, vi } from "vitest";
import { userEvent } from "vitest/browser";
import { render } from "vitest-browser-svelte";
import { createRawSnippet, tick } from "svelte";
import DateInput from "#svs/DateInput.svelte";
import DateInputBindable from "./fixtures/DateInputBindable.svelte";
import DateInputCtxProvider from "./fixtures/DateInputCtxProvider.svelte";
import { PARTS, VARIANT } from "#svs/core";

const d = (text: string) => Temporal.PlainDate.from(text);
const input = (container: HTMLElement) => container.querySelector("input:not([type=hidden])") as HTMLInputElement;
const hidden = (container: HTMLElement) => container.querySelector("input[type=hidden]") as HTMLInputElement | null;
const day = (container: HTMLElement, text = "2026-06-21") =>
  container.querySelector(`[data-svs-calendar] [data-date="${text}"]`) as HTMLButtonElement;
const type = async (el: HTMLInputElement, text: string) => {
  await userEvent.click(el);
  await userEvent.clear(el);
  if (text) await userEvent.type(el, text);
};

describe("_DateInput rendering", () => {
  test("renders a readonly combobox with classes and passthrough attributes", async () => {
    const { container } = render(DateInput, { class: "x", placeholder: "Date" });
    const el = input(container);

    await expect.element(el).toHaveAttribute("role", "combobox");
    await expect.element(el).toHaveAttribute("aria-haspopup", "dialog");
    await expect.element(el).toHaveAttribute("aria-expanded", "false");
    await expect.element(el).toHaveAttribute("readonly");
    await expect.element(el).toHaveAttribute("placeholder", "Date");
    await expect.element(el).toHaveClass("svs-date-input", PARTS.MAIN, "x");
    expect(container.querySelector(`.${PARTS.WHOLE}`)?.tagName).toBe("SPAN");
  });

  test("is editable when parse is supplied", async () => {
    const { container } = render(DateInput, { parse: (text) => d(text) });
    expect(input(container).hasAttribute("readonly")).toBe(false);
  });

  test("left snippets receive the control, open state, and variant", async () => {
    let control: (() => { show: () => void; hide: () => void; toggle: () => void; clear: () => void }) | undefined;
    let opened: (() => boolean) | undefined;
    let variant: (() => string) | undefined;
    const left = createRawSnippet(
      (ctl: () => { show: () => void; hide: () => void; toggle: () => void; clear: () => void }, open: () => boolean, v: () => string) => {
        control = ctl;
        opened = open;
        variant = v;
        return { render: () => "<span>control</span>" };
      },
    );
    const { container } = render(DateInput, { left });

    expect(opened?.()).toBe(false);
    expect(variant?.()).toBe(VARIANT.NEUTRAL);
    expect(control?.()).toEqual(
      expect.objectContaining({
        show: expect.any(Function),
        hide: expect.any(Function),
        toggle: expect.any(Function),
        clear: expect.any(Function),
      }),
    );
    control?.().show();
    await tick();
    await expect.element(input(container)).toHaveAttribute("aria-expanded", "true");
  });
});

describe("_DateInput display and typing", () => {
  test("uses default and custom formatting, and renders an empty value", async () => {
    const value = d("2026-06-21");
    const local = render(DateInput, { value });
    await expect.element(input(local.container)).toHaveValue(value.toLocaleString(undefined, { dateStyle: "medium" }));
    const custom = render(DateInput, { value, format: (date) => date.toString() });
    await expect.element(input(custom.container)).toHaveValue("2026-06-21");
    const empty = render(DateInput);
    await expect.element(input(empty.container)).toHaveValue("");
  });

  test("syncs external values while unfocused", async () => {
    const props = $state({ value: d("2026-06-20"), format: (date: Temporal.PlainDate) => date.toString() });
    const { container } = render(DateInputBindable, props);
    props.value = d("2026-06-21");
    await tick();
    await expect.element(input(container)).toHaveValue("2026-06-21");
  });

  test("commits valid text, clears empty text, and composes onchange", async () => {
    const onchange = vi.fn();
    const props = $state({
      value: d("2026-06-20") as Temporal.PlainDate | undefined,
      parse: (text: string) => d(text),
      format: (date: Temporal.PlainDate) => `D:${date}`,
      name: "date",
      onchange,
    });
    const { container } = render(DateInput, props);
    const el = input(container);

    await type(el, "2026-06-21");
    el.blur();
    await tick();
    expect(props.value?.toString()).toBe("2026-06-21");
    await expect.element(el).toHaveValue("D:2026-06-21");
    expect(onchange).toHaveBeenCalled();

    await type(el, "");
    el.blur();
    await tick();
    expect(props.value).toBeUndefined();
    expect(hidden(container)?.value).toBe("");
  });

  test("reverts invalid, thrown-parser, and out-of-range draft text", async () => {
    const props = $state({
      value: d("2026-06-20") as Temporal.PlainDate | undefined,
      parse: (text: string) =>
        text === "throw"
          ? (() => {
              throw new Error("bad");
            })()
          : d(text),
      format: (date: Temporal.PlainDate) => date.toString(),
      min: d("2026-06-20"),
      max: d("2026-06-21"),
      isDisabled: (date: Temporal.PlainDate) => date.equals(d("2026-06-21")),
    });
    const { container } = render(DateInput, props);
    const el = input(container);

    await type(el, "garbage");
    el.blur();
    await tick();
    await expect.element(el).toHaveValue("2026-06-20");
    await type(el, "throw");
    el.blur();
    await tick();
    await expect.element(el).toHaveValue("2026-06-20");
    await type(el, "2026-06-22");
    el.blur();
    await tick();
    await expect.element(el).toHaveValue("2026-06-20");
    await type(el, "2026-06-21");
    el.blur();
    await tick();
    await expect.element(el).toHaveValue("2026-06-20");
    expect(props.value?.toString()).toBe("2026-06-20");
  });
});

describe("_DateInput calendar and dismissal", () => {
  test("renders its private calendar only while open, picks a date, and returns focus", async () => {
    const props = $state({ value: d("2026-06-20") as Temporal.PlainDate | undefined, open: false });
    const { container } = render(DateInputBindable, props);
    const el = input(container);
    expect(container.querySelector("[data-svs-calendar]")).toBeNull();
    props.open = true;
    await tick();
    const overlay = container.querySelector("[data-svs-calendar]") as HTMLElement;
    expect(overlay).toBeTruthy();
    expect(el.getAttribute("aria-controls")).toBe(overlay.parentElement?.id);

    await userEvent.click(day(container));
    await tick();
    expect(props.value?.toString()).toBe("2026-06-21");
    expect(props.open).toBe(false);
    expect(document.activeElement).toBe(el);
    await expect.element(el).toHaveValue(d("2026-06-21").toLocaleString(undefined, { dateStyle: "medium" }));
    expect(el.hasAttribute("aria-controls")).toBe(false);
  });

  test("keeps the overlay open when closeOnSelect is false and forwards calendar bounds/configuration", async () => {
    const props = $state({
      value: d("2026-06-20") as Temporal.PlainDate | undefined,
      open: true,
      closeOnSelect: false,
      min: d("2026-06-20"),
      max: d("2026-06-21"),
      isDisabled: (date: Temporal.PlainDate) => date.equals(d("2026-06-23")),
      calendar: { outsideDays: true, value: d("2026-01-01") } as any,
    });
    const { container } = render(DateInputBindable, props);
    await tick();
    expect(input(container).value).toBe(d("2026-06-20").toLocaleString(undefined, { dateStyle: "medium" }));
    expect(container.querySelector("button[data-outside]")).toBeTruthy();
    await expect.element(day(container, "2026-06-19")).toHaveAttribute("data-disabled", "true");
    await expect.element(day(container, "2026-06-22")).toHaveAttribute("data-disabled", "true");
    await expect.element(day(container, "2026-06-23")).toHaveAttribute("data-disabled", "true");
    await userEvent.click(day(container));
    await tick();
    expect(props.value?.toString()).toBe("2026-06-21");
    expect(props.open).toBe(true);
  });

  test("notifies onchange once for calendar picks and exposed clears", async () => {
    let ctl: (() => { clear: () => void }) | undefined;
    const right = createRawSnippet((control: () => { clear: () => void }) => {
      ctl = control;
      return { render: () => "<span>clear</span>" };
    });
    const onchange = vi.fn();
    const props = $state({
      value: d("2026-06-20") as Temporal.PlainDate | undefined,
      open: true,
      closeOnSelect: false,
      right,
      onchange,
    });
    const { container } = render(DateInputBindable, props);

    await userEvent.click(day(container));
    await tick();
    expect(props.value?.toString()).toBe("2026-06-21");
    expect(onchange).toHaveBeenCalledTimes(1);
    expect(onchange.mock.calls[0][0]).toMatchObject({ type: "change" });

    ctl?.().clear();
    await tick();
    expect(props.value).toBeUndefined();
    expect(onchange).toHaveBeenCalledTimes(2);
    expect(onchange.mock.calls[1][0]).toMatchObject({ type: "change" });
  });

  test("opens on focus, closes on Escape and outside pointerdown, and clear resets value/text", async () => {
    let ctl: (() => { clear: () => void }) | undefined;
    const right = createRawSnippet((control: () => { clear: () => void }) => {
      ctl = control;
      return { render: () => "<span>clear</span>" };
    });
    const props = $state({ value: d("2026-06-20") as Temporal.PlainDate | undefined, open: false, openOnFocus: true, right });
    const { container } = render(DateInputBindable, props);
    const el = input(container);
    el.focus();
    await tick();
    expect(props.open).toBe(true);
    el.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    await tick();
    expect(props.open).toBe(false);
    expect(document.activeElement).toBe(el);

    props.open = true;
    await tick();
    document.body.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
    await tick();
    expect(props.open).toBe(false);
    ctl?.().clear();
    await tick();
    expect(props.value).toBeUndefined();
    await expect.element(el).toHaveValue("");
  });
});

describe("_DateInput overlay overflow flip", () => {
  const overlay = (container: HTMLElement) => container.querySelector(`.${PARTS.BOTTOM}`) as HTMLDivElement;

  test("keeps the default anchor when the overlay does not overflow", async () => {
    const props = $state({ open: true });
    const { container } = render(DateInputBindable, props);

    await tick();
    await tick();
    expect(overlay(container).getAttribute("style")).toMatch(/^position:\s*absolute;$/);
  });

  test("flips both axes when the overlay overflows at the bottom-right", async () => {
    const props = $state({ open: false });
    const { container } = render(DateInputBindable, props);
    container.style.position = "fixed";
    container.style.left = `${window.innerWidth - 16}px`;
    container.style.top = `${window.innerHeight - 16}px`;
    props.open = true;

    await tick();
    await tick();
    expect(overlay(container).getAttribute("style")).toMatch(/right:\s*0%/);
    expect(overlay(container).getAttribute("style")).toMatch(/bottom:\s*100%/);
  });

  test("flips only the y axis when the overlay overflows at the bottom", async () => {
    const props = $state({ open: false });
    const { container } = render(DateInputBindable, props);
    container.style.position = "fixed";
    container.style.left = "8px";
    container.style.top = `${window.innerHeight - 16}px`;
    props.open = true;

    await tick();
    await tick();
    expect(overlay(container).getAttribute("style")).not.toMatch(/right:\s*0%/);
    expect(overlay(container).getAttribute("style")).toMatch(/bottom:\s*100%/);
  });

  test("re-measures from the default anchor when re-opened", async () => {
    const props = $state({ open: false });
    const { container } = render(DateInputBindable, props);
    container.style.position = "fixed";
    container.style.left = `${window.innerWidth - 16}px`;
    container.style.top = `${window.innerHeight - 16}px`;
    props.open = true;
    await tick();
    await tick();
    expect(overlay(container).getAttribute("style")).toMatch(/right:\s*0%/);
    expect(overlay(container).getAttribute("style")).toMatch(/bottom:\s*100%/);

    props.open = false;
    await tick();
    container.style.left = "8px";
    container.style.top = "8px";
    props.open = true;
    await tick();
    await tick();
    expect(overlay(container).getAttribute("style")).toMatch(/^position:\s*absolute;$/);
  });

  test("does not close or re-measure on scroll or resize", async () => {
    const props = $state({ open: false });
    const { container } = render(DateInputBindable, props);
    container.style.position = "fixed";
    container.style.left = "8px";
    container.style.top = "8px";
    props.open = true;
    await tick();
    await tick();
    expect(overlay(container).getAttribute("style")).toMatch(/^position:\s*absolute;$/);

    container.style.left = `${window.innerWidth - 16}px`;
    container.style.top = `${window.innerHeight - 16}px`;
    document.dispatchEvent(new Event("scroll"));
    window.dispatchEvent(new Event("resize"));
    await tick();
    expect(props.open).toBe(true);
    expect(overlay(container)).toBeTruthy();
    expect(overlay(container).getAttribute("style")).toMatch(/^position:\s*absolute;$/);
  });

  test("opens, closes, and re-opens without errors", async () => {
    const props = $state({ open: false });
    const { container } = render(DateInputBindable, props);

    props.open = true;
    await tick();
    expect(overlay(container)).toBeTruthy();
    props.open = false;
    await tick();
    props.open = true;
    await tick();
    expect(overlay(container)).toBeTruthy();
  });
});

describe("_DateInput form, context, and motion", () => {
  test("routes name and canonical ISO value exclusively to its hidden input", () => {
    const named = render(DateInput, { name: "date", value: d("2026-06-21") });
    expect(hidden(named.container)?.value).toBe("2026-06-21");
    expect(input(named.container).hasAttribute("name")).toBe(false);
    expect(hidden(render(DateInput).container)).toBeNull();
  });

  test("uses context values, mirrors its element, routes writes, and composes field handlers", async () => {
    const callerChange = vi.fn();
    const ctxChange = vi.fn();
    const callerInvalid = vi.fn();
    const ctxInvalid = vi.fn();
    const state = $state({
      value: d("2026-06-20") as Temporal.PlainDate | undefined,
      variant: VARIANT.ACTIVE,
      element: undefined as HTMLInputElement | undefined,
      ariaErrMsgId: "ctx-error" as string | undefined,
      styling: undefined,
      id: "ctx-id" as string | undefined,
      describedby: "ctx-desc" as string | undefined,
    });
    const inputProps = {
      parse: (text: string) => d(text),
      format: (date: Temporal.PlainDate) => date.toString(),
      onchange: callerChange,
      oninvalid: callerInvalid,
    };
    const { container } = render(DateInputCtxProvider, { state, hooks: { onchange: ctxChange, oninvalid: ctxInvalid }, input: inputProps });
    const el = input(container);
    await expect.element(el).toHaveValue("2026-06-20");
    await expect.element(el).toHaveAttribute("id", "ctx-id");
    await expect.element(el).toHaveAttribute("aria-describedby", "ctx-desc");
    await expect.element(el).toHaveAttribute("aria-errormessage", "ctx-error");
    await expect.element(el).toHaveAttribute("aria-invalid", "true");
    await expect.element(el).toHaveClass(VARIANT.ACTIVE);
    expect(state.element).toBe(el);

    await type(el, "2026-06-21");
    el.dispatchEvent(new Event("change", { bubbles: true }));
    await tick();
    expect(state.value?.toString()).toBe("2026-06-21");
    expect(callerChange).toHaveBeenCalled();
    expect(ctxChange).toHaveBeenCalled();
    el.dispatchEvent(new Event("invalid"));
    await tick();
    expect(callerInvalid).toHaveBeenCalled();
    expect(ctxInvalid).toHaveBeenCalled();
  });

  test("neutralizes custom transitions when reduced motion is requested", async () => {
    vi.stubGlobal("matchMedia", () => ({
      matches: true,
      media: "",
      onchange: null,
      addEventListener() {},
      removeEventListener() {},
      addListener() {},
      removeListener() {},
      dispatchEvent: () => false,
    }));
    const fn = vi.fn(() => ({}));
    const props = $state({ value: d("2026-06-20"), open: false, transition: { fn } });
    render(DateInput, props);
    props.open = true;
    await tick();
    expect(fn).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });
});
