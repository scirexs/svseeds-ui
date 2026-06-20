// Retained in jsdom: confirm's 500ms commit is driven by vi.useFakeTimers(), which fights the real timer/event loop in chromium (see .ref/migration-test.md §"What to KEEP in jsdom").
import { afterEach, describe, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render } from "@testing-library/svelte";
import { tick } from "svelte";
import SortableBasic from "./fixtures/SortableBasic.svelte";
import { VARIANT } from "#svs/core";

afterEach(() => {
  vi.useRealTimers();
  cleanup();
});

describe("_Sortable confirm", () => {
  test("confirm delays the move and can be cancelled by leaving", async () => {
    vi.useFakeTimers();
    const { getByTestId } = render(SortableBasic, { items: ["a", "b", "c"], confirm: true });

    await fireEvent.pointerDown(getByTestId("item-a"), { button: 0, buttons: 1, clientX: 0, clientY: 0 });
    await tick();
    await fireEvent.pointerMove(window, { buttons: 1, clientX: 20, clientY: 20 });
    await vi.advanceTimersByTimeAsync(20);
    await tick();
    await fireEvent.pointerOver(getByTestId("item-c"), { buttons: 1 });
    await tick();
    expect(getByTestId("item-c")).toHaveAttribute("data-variant", VARIANT.ACTIVE);
    await vi.advanceTimersByTimeAsync(400);
    await fireEvent.pointerOut(getByTestId("item-c"));
    await vi.advanceTimersByTimeAsync(200);

    expect(getByTestId("value-readout")).toHaveTextContent("a,b,c");

    await fireEvent.pointerOver(getByTestId("item-c"), { buttons: 1 });
    await vi.advanceTimersByTimeAsync(500);
    await tick();
    expect(getByTestId("value-readout")).toHaveTextContent("b,c,a");
    await fireEvent.pointerUp(window);
  });
});
