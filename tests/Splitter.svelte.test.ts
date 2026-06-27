import { describe, expect, test, vi } from "vitest";
import { userEvent } from "vitest/browser";
import { render } from "vitest-browser-svelte";
import { createRawSnippet, tick } from "svelte";
import Splitter from "#svs/Splitter.svelte";
import { PARTS, VARIANT } from "#svs/core";

const seed = "svs-splitter";
const leftid = "splitter-left-content";
const rightid = "splitter-right-content";
const handleid = "splitter-handle-content";

const left = createRawSnippet((variant: () => string) => ({
  render: () => `<span data-testid="${leftid}">left:${variant()}</span>`,
}));
const right = createRawSnippet((variant: () => string) => ({
  render: () => `<span data-testid="${rightid}">right:${variant()}</span>`,
}));
const handle = createRawSnippet((value: () => number, variant: () => string) => {
  const text = () => `${value()}:${variant()}`;
  return {
    render: () => `<span data-testid="${handleid}">${text()}</span>`,
    setup: (node: Element) => {
      $effect(() => {
        node.textContent = text();
      });
    },
  };
});

const root = (c: HTMLElement) => c.firstElementChild as HTMLDivElement;
const separator = (c: HTMLElement) => c.querySelector('[role="separator"]') as HTMLDivElement;

describe("Rendering and API", () => {
  test("renders panes, separator semantics, classes, and default size property", async () => {
    const { container } = render(Splitter, { left, right, children: handle });
    const whole = root(container);
    const sep = separator(container);
    const l = container.querySelector(`[data-testid="${leftid}"]`) as HTMLElement;
    const r = container.querySelector(`[data-testid="${rightid}"]`) as HTMLElement;

    expect(whole.children).toHaveLength(3);
    expect(whole.children[0]).toBe(l.parentElement);
    expect(whole.children[1]).toBe(sep);
    expect(whole.children[2]).toBe(r.parentElement);
    await expect.element(whole).toHaveClass(seed, PARTS.WHOLE, VARIANT.NEUTRAL);
    await expect.element(whole.children[0] as HTMLElement).toHaveClass(seed, PARTS.LEFT, VARIANT.NEUTRAL);
    await expect.element(sep).toHaveClass(seed, PARTS.MAIN, VARIANT.NEUTRAL);
    await expect.element(whole.children[2] as HTMLElement).toHaveClass(seed, PARTS.RIGHT, VARIANT.NEUTRAL);
    expect(whole.style.getPropertyValue("--svs-splitter")).toBe("50%");
    await expect.element(whole).toHaveAttribute("data-orientation", "horizontal");
    await expect.element(whole).not.toHaveAttribute("data-dragging");
    await expect.element(sep).toHaveAttribute("tabindex", "0");
    await expect.element(sep).toHaveAttribute("aria-orientation", "vertical");
    await expect.element(sep).toHaveAttribute("aria-valuenow", "50");
    await expect.element(sep).toHaveAttribute("aria-valuemin", "0");
    await expect.element(sep).toHaveAttribute("aria-valuemax", "100");
    await expect.element(sep).toHaveAttribute("aria-controls", whole.children[0].id);
    await expect.element(container.querySelector(`[data-testid="${handleid}"]`) as HTMLElement).toHaveTextContent("50:neutral");
  });

  test("custom props drive orientation, label, css var name, attrs, and styling", async () => {
    const attach = vi.fn((node: Element) => {
      (node as HTMLElement).dataset.attached = "1";
    });
    const { container } = render(Splitter, {
      left,
      right,
      orientation: "vertical",
      value: 35,
      min: 10,
      max: 90,
      label: "Resize panels",
      cssvar: { position: "--pane-size" },
      styling: "custom-splitter",
      variant: VARIANT.ACTIVE,
      class: "extra",
      "data-test": "kept",
      attach,
    });
    const whole = root(container);
    const sep = separator(container);

    expect(whole.style.getPropertyValue("--pane-size")).toBe("35%");
    expect(whole.style.getPropertyValue("--svs-splitter")).toBe("");
    await expect.element(whole).toHaveClass("custom-splitter", PARTS.WHOLE, VARIANT.ACTIVE, "extra");
    expect(whole.classList.contains(seed)).toBe(false);
    await expect.element(whole).toHaveAttribute("data-orientation", "vertical");
    await expect.element(whole).toHaveAttribute("data-test", "kept");
    expect(whole.dataset.attached).toBe("1");
    expect(attach).toHaveBeenCalled();
    await expect.element(sep).toHaveAttribute("aria-label", "Resize panels");
    await expect.element(sep).toHaveAttribute("aria-orientation", "horizontal");
    await expect.element(sep).toHaveAttribute("aria-valuemin", "10");
    await expect.element(sep).toHaveAttribute("aria-valuemax", "90");
  });

  test("component-owned semantics cannot be overridden by rest attributes", async () => {
    const { container } = render(Splitter, {
      left,
      right,
      role: "presentation",
      style: "color: red",
      "data-orientation": "wrong",
    } as any);
    const whole = root(container);
    const sep = separator(container);

    await expect.element(sep).toHaveAttribute("role", "separator");
    await expect.element(whole).toHaveAttribute("data-orientation", "horizontal");
    expect(whole.style.getPropertyValue("--svs-splitter")).toBe("50%");
    expect(whole.style.color).toBe("");
  });
});

describe("Value handling and keyboard", () => {
  test("normalizes min/max and clamps initial and reactive values", async () => {
    const props = $state({ left, right, value: 999, min: 80, max: 20 });
    const { container, rerender } = render(Splitter, props);
    await tick();

    expect(props.value).toBe(80);
    await expect.element(separator(container)).toHaveAttribute("aria-valuemin", "20");
    await expect.element(separator(container)).toHaveAttribute("aria-valuemax", "80");
    expect(root(container).style.getPropertyValue("--svs-splitter")).toBe("80%");

    props.value = -1;
    await rerender(props);
    await tick();
    expect(props.value).toBe(20);
    expect(root(container).style.getPropertyValue("--svs-splitter")).toBe("20%");
  });

  test("horizontal keyboard moves value by step and clamps at Home/End", async () => {
    const props = $state({ left, right, value: 50, min: 20, max: 80, step: 5 });
    const { container } = render(Splitter, props);
    const sep = separator(container);

    sep.focus();
    await userEvent.keyboard("{ArrowRight}");
    expect(props.value).toBe(55);
    await expect.element(sep).toHaveAttribute("aria-valuenow", "55");
    await userEvent.keyboard("{ArrowLeft}");
    expect(props.value).toBe(50);
    await userEvent.keyboard("{ArrowDown}");
    expect(props.value).toBe(50);
    await userEvent.keyboard("{End}");
    expect(props.value).toBe(80);
    await userEvent.keyboard("{ArrowRight}");
    expect(props.value).toBe(80);
    await userEvent.keyboard("{Home}");
    expect(props.value).toBe(20);
  });

  test("vertical keyboard uses up/down and ignores left/right", async () => {
    const props = $state({ left, right, orientation: "vertical" as const, value: 50, min: 0, max: 100, step: 10 });
    const { container } = render(Splitter, props);
    const sep = separator(container);

    sep.focus();
    await userEvent.keyboard("{ArrowDown}");
    expect(props.value).toBe(60);
    await userEvent.keyboard("{ArrowUp}");
    expect(props.value).toBe(50);
    await userEvent.keyboard("{ArrowRight}");
    expect(props.value).toBe(50);
  });
});
