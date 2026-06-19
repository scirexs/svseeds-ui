import { afterEach, describe, expect, test, vi } from "vitest";
import { fireEvent, render, waitFor } from "@testing-library/svelte";
import MenuListCtxProvider from "./fixtures/MenuListCtxProvider.svelte";

const root = (c: HTMLElement) => c.querySelector('[role="menu"]') as HTMLDivElement;

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("MenuList navigation", () => {
  test("typeahead matches prefixes and resets after idle", async () => {
    vi.useFakeTimers();
    const { container } = render(MenuListCtxProvider, { open: true });
    await waitFor(() => expect(document.activeElement).toHaveTextContent("Cut"));

    await fireEvent.keyDown(root(container), { key: "c" });
    expect(document.activeElement).toHaveTextContent("Cut");

    await fireEvent.keyDown(root(container), { key: "o" });
    expect(document.activeElement).toHaveTextContent("Copy");

    vi.advanceTimersByTime(500);

    await fireEvent.keyDown(root(container), { key: "d" });
    expect(document.activeElement).toHaveTextContent("Delete");
  });
});
