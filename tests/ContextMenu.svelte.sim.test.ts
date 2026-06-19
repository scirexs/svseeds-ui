import { afterEach, describe, expect, test, vi } from "vitest";
import { fireEvent, render } from "@testing-library/svelte";
import { createRawSnippet } from "svelte";
import ContextMenu from "#svs/ContextMenu.svelte";

const childrenSnippet = createRawSnippet(() => ({ render: () => "<div>Menu Item</div>" }));

function root(container: HTMLElement) {
  return container.firstChild as HTMLDivElement;
}

afterEach(() => {
  vi.restoreAllMocks();
});

Object.defineProperty(window, "innerWidth", {
  writable: true,
  configurable: true,
  value: 1024,
});

Object.defineProperty(window, "innerHeight", {
  writable: true,
  configurable: true,
  value: 768,
});

describe("ContextMenu jsdom-retained positioning", () => {
  test("adjusts position near edges without going negative", async () => {
    const props = $state({ children: childrenSnippet, open: false });
    const { container } = render(ContextMenu, props);
    const wrapper = root(container);

    Object.defineProperty(wrapper, "offsetWidth", { configurable: true, value: 200 });
    Object.defineProperty(wrapper, "offsetHeight", { configurable: true, value: 100 });

    await fireEvent.contextMenu(document, { clientX: 950, clientY: 700 });
    expect(wrapper).toHaveStyle("left: 750px");
    expect(wrapper).toHaveStyle("top: 600px");

    Object.defineProperty(wrapper, "offsetWidth", { configurable: true, value: 800 });
    await fireEvent.contextMenu(document, { clientX: 300, clientY: 50 });
    expect(wrapper).toHaveStyle("left: 300px");
    expect(wrapper).toHaveStyle("top: 50px");
  });
});
