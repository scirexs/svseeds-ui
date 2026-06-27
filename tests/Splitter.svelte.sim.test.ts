import { describe, expect, test, vi } from "vitest";
import { fireEvent, render } from "@testing-library/svelte";
import { createRawSnippet, tick } from "svelte";
import Splitter from "#svs/Splitter.svelte";

const left = createRawSnippet(() => ({ render: () => "<span>left</span>" }));
const right = createRawSnippet(() => ({ render: () => "<span>right</span>" }));

const rect = (left: number, top: number, width: number, height: number) =>
  ({ left, top, width, height, x: left, y: top, right: left + width, bottom: top + height, toJSON: () => ({}) }) as DOMRect;
const root = (c: HTMLElement) => c.firstElementChild as HTMLDivElement;
const separator = (c: HTMLElement) => c.querySelector('[role="separator"]') as HTMLDivElement;
const capture = (node: HTMLDivElement) => {
  const set = vi.fn();
  const release = vi.fn();
  Object.defineProperty(node, "setPointerCapture", { configurable: true, value: set });
  Object.defineProperty(node, "hasPointerCapture", { configurable: true, value: () => true });
  Object.defineProperty(node, "releasePointerCapture", { configurable: true, value: release });
  return { set, release };
};

describe("Splitter pointer drag", () => {
  test("horizontal drag maps clientX to percentage, snaps, and clears drag state", async () => {
    const props = $state({ left, right, value: 50, snap: [25, 74] });
    const { container } = render(Splitter, props);
    const whole = root(container);
    const sep = separator(container);
    const calls = capture(sep);
    vi.spyOn(whole, "getBoundingClientRect").mockReturnValue(rect(10, 20, 200, 100));

    await fireEvent.pointerDown(sep, { button: 0, pointerId: 7, clientX: 10, clientY: 20 });
    await tick();
    expect(calls.set).toHaveBeenCalledWith(7);
    expect(whole).toHaveAttribute("data-dragging");

    await fireEvent.pointerMove(sep, { pointerId: 7, clientX: 158, clientY: 20 });
    await tick();
    expect(props.value).toBe(74);
    expect(whole.style.getPropertyValue("--svs-splitter")).toBe("74%");

    await fireEvent.pointerUp(sep, { pointerId: 7 });
    await tick();
    expect(calls.release).toHaveBeenCalledWith(7);
    expect(whole).not.toHaveAttribute("data-dragging");
  });

  test("vertical drag maps clientY to percentage and clamps to bounds", async () => {
    const props = $state({ left, right, orientation: "vertical" as const, value: 50, min: 20, max: 80 });
    const { container } = render(Splitter, props);
    const whole = root(container);
    const sep = separator(container);
    vi.spyOn(whole, "getBoundingClientRect").mockReturnValue(rect(10, 20, 200, 100));

    await fireEvent.pointerDown(sep, { button: 0, pointerId: 1, clientX: 10, clientY: 20 });
    await fireEvent.pointerMove(sep, { pointerId: 1, clientX: 10, clientY: 120 });
    await tick();

    expect(props.value).toBe(80);
    expect(whole.style.getPropertyValue("--svs-splitter")).toBe("80%");
  });

  test("lost pointer capture ends dragging", async () => {
    const props = $state({ left, right, value: 50 });
    const { container } = render(Splitter, props);
    const whole = root(container);
    const sep = separator(container);
    capture(sep);
    vi.spyOn(whole, "getBoundingClientRect").mockReturnValue(rect(0, 0, 100, 100));

    await fireEvent.pointerDown(sep, { button: 0, pointerId: 2, clientX: 0, clientY: 0 });
    await tick();
    expect(whole).toHaveAttribute("data-dragging");

    await fireEvent.lostPointerCapture(sep, { pointerId: 2 });
    await tick();
    expect(whole).not.toHaveAttribute("data-dragging");
  });
});
