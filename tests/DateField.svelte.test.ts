import { describe, expect, test, vi } from "vitest";
import { userEvent } from "vitest/browser";
import { render } from "vitest-browser-svelte";
import { createRawSnippet, tick } from "svelte";
import DateField from "#svs/DateField.svelte";
import DateFieldWithDateInput from "./fixtures/DateFieldWithDateInput.svelte";
import { PARTS, VARIANT } from "#svs/core";

type DateFieldElement = HTMLInputElement | undefined;
const d = (text: string) => Temporal.PlainDate.from(text);
const visible = (container: HTMLElement) => container.querySelector("input:not([hidden]):not([type=hidden])") as HTMLInputElement;
const participant = (container: HTMLElement) => container.querySelector("input[hidden]") as HTMLInputElement | null;
const nativeInput = (container: HTMLElement) => container.querySelector('input[type="date"]') as HTMLInputElement | null;
const day = (container: HTMLElement, text = "2026-06-21") =>
  container.querySelector(`[data-svs-calendar] [data-date="${text}"]`) as HTMLButtonElement;
const today = (container: HTMLElement) => container.querySelector("[data-svs-calendar] [data-today]") as HTMLButtonElement;
const snippet = (id: string) =>
  createRawSnippet((value: () => Temporal.PlainDate | undefined, variant: () => string, element: () => DateFieldElement) => ({
    render: () => `<span data-testid="${id}">${value()?.toString() ?? "empty"}:${variant()}:${element() ? "element" : "none"}</span>`,
  }));
const invalid = async (el: HTMLInputElement) => {
  el.dispatchEvent(new Event("invalid", { cancelable: true }));
  await tick();
};

describe("DateField chrome", () => {
  test("renders field chrome, ids, snippets, and the preset", async () => {
    const aux = vi.fn().mockImplementation(snippet("aux"));
    const left = vi.fn().mockImplementation(snippet("left"));
    const right = vi.fn().mockImplementation(snippet("right"));
    const { container } = render(DateField, {
      label: "Date",
      extra: "(optional)",
      aux,
      left,
      right,
      bottom: "Choose a date",
      value: d("2026-06-21"),
    });
    const group = container.querySelector('[role="group"]') as HTMLDivElement;
    const label = container.querySelector(`.${PARTS.LABEL}`) as HTMLLabelElement;
    const el = visible(container);

    await expect.element(group).toHaveClass("svs-date-field", PARTS.WHOLE);
    expect(group.getAttribute("aria-labelledby")).toBe(label.id);
    expect(label.htmlFor).toBe(el.id);
    await expect.element(el).toHaveAccessibleDescription("Choose a date");
    await expect.element(container.querySelector('[data-testid="aux"]')!.parentElement!).toHaveClass("svs-date-field", PARTS.AUX);
    await expect.element(container.querySelector('[data-testid="left"]')!.parentElement!).toHaveClass("svs-date-field", PARTS.LEFT);
    await expect.element(container.querySelector('[data-testid="right"]')!.parentElement!).toHaveClass("svs-date-field", PARTS.RIGHT);
    expect(aux).toHaveBeenCalled();
    expect(left).toHaveBeenCalled();
    expect(right).toHaveBeenCalled();
  });

  test("reserves the bottom part", async () => {
    const { container, rerender } = render(DateField, { reserve: true });
    const group = container.querySelector('[role="group"]') as HTMLDivElement;
    await expect.element(group.lastElementChild as HTMLElement).toHaveClass("svs-date-field", PARTS.BOTTOM);
    expect(group.lastElementChild?.textContent).toBe("");
    await rerender({ bottom: "Help" });
    expect(group.lastElementChild?.textContent).toBe("Help");
  });
});

describe("DateField default DateInput and participant", () => {
  test("uses a text DateInput and carries one canonical hidden participant", async () => {
    const { container } = render(DateField, { name: "date", value: d("2026-06-21") });
    const el = visible(container);
    const proxy = participant(container);

    expect(el.type).toBe("text");
    expect(nativeInput(container)).toBeNull();
    expect(el.hasAttribute("name")).toBe(false);
    expect(proxy?.hasAttribute("hidden")).toBe(true);
    expect(proxy?.name).toBe("date");
    expect(proxy?.value).toBe("2026-06-21");
  });

  test("only creates the participant when it has a form or validation responsibility", () => {
    expect(participant(render(DateField).container)).toBeNull();
    expect(participant(render(DateField, { validations: [() => ""] }).container)).not.toBeNull();
  });

  test("announces required and validates readonly controls through the participant", async () => {
    const { container } = render(DateField, { required: true });
    const el = visible(container);
    const proxy = participant(container) as HTMLInputElement;

    await expect.element(el).toHaveAttribute("aria-required", "true");
    expect(el.readOnly).toBe(true);
    expect(el.willValidate).toBe(false);
    expect(proxy.validity.valueMissing).toBe(true);
    expect(proxy.checkValidity()).toBe(false);
    await invalid(proxy);
    await expect.element(container.querySelector('[role="alert"]') as HTMLElement).toHaveTextContent(proxy.validationMessage);
  });

  test("makes a required participant valid after the field receives a date", async () => {
    const props = $state({ name: "date", required: true, value: undefined as Temporal.PlainDate | undefined });
    const { container } = render(DateField, props);
    const proxy = participant(container) as HTMLInputElement;

    expect(proxy.validity.valueMissing).toBe(true);
    props.value = d("2026-06-21");
    await tick();
    expect(proxy.value).toBe("2026-06-21");
    expect(proxy.validity.valueMissing).toBe(false);
    expect(proxy.checkValidity()).toBe(true);
  });

  test("sets custom errors on the participant and drives the variant", async () => {
    const props = $state({
      value: undefined as Temporal.PlainDate | undefined,
      variant: VARIANT.NEUTRAL,
      validations: [({ value }: { value: Temporal.PlainDate | undefined }) => (value ? "" : "required date")],
    });
    const { container } = render(DateField, props);
    const proxy = participant(container) as HTMLInputElement;

    await invalid(proxy);
    expect(proxy.validity.customError).toBe(true);
    expect(proxy.validationMessage).toBe("required date");
    expect(props.variant).toBe(VARIANT.INACTIVE);
    await expect.element(container.querySelector('[role="alert"]') as HTMLElement).toHaveTextContent("required date");
  });

  test("forwards owned bounds and disabled state without allowing the bag to override them", async () => {
    const { container } = render(DateField, {
      min: d("2026-06-21"),
      max: d("2026-06-21"),
      disabled: true,
      name: "date",
      dateInput: { min: d("2026-01-01"), max: d("2026-12-31") } as never,
    });
    const el = visible(container);
    const proxy = participant(container) as HTMLInputElement;

    expect(el.disabled).toBe(true);
    expect(proxy.disabled).toBe(true);
  });

  test("uses field-owned bounds instead of bounds supplied through the DateInput bag", async () => {
    const { container } = render(DateField, {
      value: d("2026-06-21"),
      min: d("2026-06-20"),
      max: d("2026-06-21"),
      dateInput: { min: d("2026-01-01"), max: d("2026-12-31"), openOnFocus: true } as never,
    });

    visible(container).focus();
    await tick();
    await expect.element(day(container, "2026-06-19")).toHaveAttribute("data-disabled", "true");
    await expect.element(day(container, "2026-06-22")).toHaveAttribute("data-disabled", "true");
  });

  test("omits a disabled participant from form data", () => {
    const { container } = render(DateField, { name: "date", value: d("2026-06-21"), disabled: true });
    const form = document.createElement("form");
    form.append(container);

    expect(participant(container)?.disabled).toBe(true);
    expect(new FormData(form).has("date")).toBe(false);
  });

  test("picking a calendar day syncs the field value and participant", async () => {
    const props = $state({ value: undefined as Temporal.PlainDate | undefined, name: "date", dateInput: { openOnFocus: true } });
    const { container } = render(DateField, props);
    visible(container).focus();
    await tick();
    const cell = today(container);
    const iso = cell.getAttribute("data-date")!;
    await userEvent.click(cell);
    await tick();

    expect(props.value?.toString()).toBe(iso);
    expect(participant(container)?.value).toBe(iso);
  });

  test("re-runs custom validations and blocks submit when a calendar day is picked", async () => {
    const props = $state({
      value: undefined as Temporal.PlainDate | undefined,
      variant: VARIANT.NEUTRAL,
      name: "date",
      validations: [({ value }: { value: Temporal.PlainDate | undefined }) => (value ? "blocked date" : "")],
      dateInput: { openOnFocus: true },
    });
    const { container } = render(DateField, props);
    const proxy = participant(container) as HTMLInputElement;

    visible(container).focus();
    await tick();
    const cell = today(container);
    const iso = cell.getAttribute("data-date")!;
    await userEvent.click(cell);
    await tick();

    expect(props.value?.toString()).toBe(iso);
    expect(proxy.validity.customError).toBe(true);
    expect(proxy.validationMessage).toBe("blocked date");
    expect(proxy.checkValidity()).toBe(false);
    expect(props.variant).toBe(VARIANT.INACTIVE);
  });
});

describe("DateField native mode", () => {
  test("uses the native input as the only form participant", async () => {
    const { container } = render(DateField, {
      native: true,
      name: "date",
      required: true,
      min: d("2026-01-01"),
      max: d("2026-12-31"),
      value: d("2026-06-21"),
    });
    const el = nativeInput(container) as HTMLInputElement;

    expect(el.type).toBe("date");
    expect(el.name).toBe("date");
    expect(el.required).toBe(true);
    expect(el.min).toBe("2026-01-01");
    expect(el.max).toBe("2026-12-31");
    expect(el.value).toBe("2026-06-21");
    expect(participant(container)).toBeNull();
  });

  test("ignores DateInput-only configuration in native mode", async () => {
    const { container } = render(DateField, {
      native: true,
      dateInput: { openOnFocus: true, parse: (text) => d(text) },
    });

    visible(container).focus();
    await tick();
    expect(container.querySelector('input[type="text"]')).toBeNull();
    expect(container.querySelector("[data-svs-calendar]")).toBeNull();
  });

  test("bridges ISO values to Temporal and surfaces native range errors", async () => {
    const props = $state({
      native: true,
      value: d("2026-06-21") as Temporal.PlainDate | undefined,
      max: d("2026-06-30"),
      variant: VARIANT.NEUTRAL,
    });
    const { container } = render(DateField, props);
    const el = nativeInput(container) as HTMLInputElement;

    el.value = "2026-07-01";
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
    await tick();
    expect(props.value?.toString()).toBe("2026-07-01");
    expect(el.validity.rangeOverflow).toBe(true);
    expect(props.variant).toBe(VARIANT.INACTIVE);
  });
});

describe("DateField children override", () => {
  test("uses a caller-written DateInput while preserving field context and participant", async () => {
    const { container } = render(DateFieldWithDateInput, {
      field: { name: "date", value: d("2026-06-21") },
      child: { format: (value) => value.toString() },
    });
    const el = visible(container);

    await expect.element(el).toHaveValue("2026-06-21");
    await expect.element(el).toHaveClass("svs-date-field", "svs-date-input");
    expect(participant(container)?.value).toBe("2026-06-21");
  });

  test("leaves native children and form participation to the caller", () => {
    const { container } = render(DateFieldWithDateInput, {
      field: { native: true, name: "date", required: true },
      child: { format: (value) => value.toString() },
    });

    expect(visible(container).type).toBe("text");
    expect(nativeInput(container)).toBeNull();
    expect(participant(container)).toBeNull();
  });
});
