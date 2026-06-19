import { afterEach, describe, expect, test, vi } from "vitest";
import { render } from "@testing-library/svelte";
import { userEvent } from "@testing-library/user-event";
import { createRawSnippet, tick } from "svelte";
import Accordion, { type AccordionItem } from "#svs/Accordion.svelte";

const panelFn = (id: string, text: string) =>
  createRawSnippet<[string]>((variant) => ({ render: () => `<div data-testid="${id}" data-variant="${variant()}">${text}</div>` }));
const baseItems = (): AccordionItem[] => [
  { value: "a", label: "Section A", panel: panelFn("panel-a", "Panel A") },
  { value: "b", label: "Section B", panel: panelFn("panel-b", "Panel B") },
  { value: "c", label: "Section C", panel: panelFn("panel-c", "Panel C") },
];
const summariesIn = (container: HTMLElement) => Array.from(container.querySelectorAll("summary")) as HTMLElement[];
const bySummaryText = (container: HTMLElement, text: string) =>
  summariesIn(container).find((summary) => summary.textContent?.includes(text)) as HTMLElement;
const detailsBySummaryText = (container: HTMLElement, text: string) =>
  bySummaryText(container, text).closest("details") as HTMLDetailsElement;

afterEach(() => {
  vi.useRealTimers();
});

describe("Edge cases", () => {
  test("duration via disclosure is forwarded to Disclosure", async () => {
    vi.useFakeTimers();
    const props = $state({ items: baseItems(), current: "a" as string | undefined, disclosure: { duration: 100 } });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const { container } = render(Accordion, props);
    const details = detailsBySummaryText(container, "Section A");

    await user.click(bySummaryText(container, "Section A"));
    expect(props.current).toBeUndefined();
    expect(details.open).toBe(true);

    await vi.advanceTimersByTimeAsync(100);
    await tick();
    expect(details.open).toBe(false);
  });
});
