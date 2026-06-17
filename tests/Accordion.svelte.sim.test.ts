import { afterEach, describe, expect, test, vi } from "vitest";
import { render, waitFor, within } from "@testing-library/svelte";
import { userEvent } from "@testing-library/user-event";
import { createRawSnippet, tick } from "svelte";
import Accordion, { type AccordionItem } from "#svs/Accordion.svelte";
import { PARTS, VARIANT } from "#svs/core";
import AccordionDeclarative from "./fixtures/AccordionDeclarative.svelte";
import TabDummy from "./fixtures/TabDummy.svelte";

const seed = "svs-accordion";
const disclosure = { duration: 0 };

const panelFn = (id: string, text: string) =>
  createRawSnippet<[string]>((variant) => ({ render: () => `<div data-testid="${id}" data-variant="${variant()}">${text}</div>` }));
const labelFn = (id: string, text: string) =>
  createRawSnippet<[boolean, string]>((open, variant) => ({
    render: () => `<span data-testid="${id}" data-open="${open()}" data-variant="${variant()}">${text}</span>`,
  }));
const baseItems = (): AccordionItem[] => [
  { value: "a", label: "Section A", panel: panelFn("panel-a", "Panel A") },
  { value: "b", label: "Section B", panel: panelFn("panel-b", "Panel B") },
  { value: "c", label: "Section C", panel: panelFn("panel-c", "Panel C") },
];
const groupIn = (container: HTMLElement) => container.querySelector('div[role="group"]') as HTMLDivElement;
const detailsIn = (container: HTMLElement) => Array.from(container.querySelectorAll("details")) as HTMLDetailsElement[];
const summariesIn = (container: HTMLElement) => Array.from(container.querySelectorAll("summary")) as HTMLElement[];
const bySummaryText = (container: HTMLElement, text: string) =>
  summariesIn(container).find((summary) => summary.textContent?.includes(text)) as HTMLElement;
const detailsBySummaryText = (container: HTMLElement, text: string) => bySummaryText(container, text).closest("details") as HTMLDetailsElement;

afterEach(() => {
  vi.useRealTimers();
});

describe("Rendering and API", () => {
  test("empty items render nothing", () => {
    const { container, queryByRole } = render(Accordion, { items: [] });

    expect(container.childElementCount).toBe(0);
    expect(queryByRole("group")).toBeNull();
    expect(container.querySelector("details")).toBeNull();
  });

  test("string labels and snippet panels render closed", () => {
    const { container, getByText, getByTestId } = render(Accordion, { items: baseItems(), disclosure });

    expect(groupIn(container)).toBeInTheDocument();
    expect(detailsIn(container)).toHaveLength(3);
    expect(getByText("Section A")).toBeInTheDocument();
    expect(getByText("Section B")).toBeInTheDocument();
    expect(getByTestId("panel-a")).toHaveTextContent("Panel A");
    expect(detailsIn(container).every((details) => !details.open)).toBe(true);
  });

  test("snippet label renders into summary", () => {
    const items = [{ value: "snippet", label: labelFn("label-snippet", "Snippet Label"), panel: panelFn("panel", "Panel") }];
    const { container, getByTestId } = render(Accordion, { items, disclosure });

    expect(within(bySummaryText(container, "Snippet Label")).getByTestId("label-snippet")).toHaveTextContent("Snippet Label");
    expect(getByTestId("label-snippet")).toHaveAttribute("data-open", "false");
  });

  test("component label forwards props into summary", () => {
    const items: AccordionItem[] = [{ value: "component", label: { component: TabDummy, props: { text: "Component Label" } }, panel: panelFn("panel", "Panel") }];
    const { container, getByTestId } = render(Accordion, { items, disclosure });

    expect(within(summariesIn(container)[0]).getByTestId("dummy")).toHaveTextContent("Component Label");
    expect(getByTestId("dummy")).toHaveTextContent("Component Label");
  });

  test("component panel forwards props into panel", () => {
    const items: AccordionItem[] = [{ value: "component", label: "Component", panel: { component: TabDummy, props: { text: "Component Panel" } } }];
    const { getByTestId } = render(Accordion, { items, disclosure });

    expect(getByTestId("dummy")).toHaveTextContent("Component Panel");
  });

  test("panel content remains present while closed", () => {
    const { getByTestId } = render(Accordion, { items: baseItems(), disclosure });

    expect(getByTestId("panel-b")).toBeInTheDocument();
  });
});

describe("Key-string addressing and correction", () => {
  test("initial current opens the matching item", () => {
    const { container } = render(Accordion, { items: baseItems(), current: "b", disclosure });

    expect(detailsBySummaryText(container, "Section A").open).toBe(false);
    expect(detailsBySummaryText(container, "Section B").open).toBe(true);
    expect(detailsBySummaryText(container, "Section C").open).toBe(false);
  });

  test("unknown current normalizes to all closed", async () => {
    const props = $state({ items: baseItems(), current: "nope" as string | undefined, disclosure });
    const { container } = render(Accordion, props);

    await waitFor(() => expect(props.current).toBeUndefined());
    expect(detailsIn(container).every((details) => !details.open)).toBe(true);
  });

  test("disabled current normalizes to all closed", async () => {
    const items = baseItems().map((item) => (item.value === "b" ? { ...item, disabled: true } : item));
    const props = $state({ items, current: "b" as string | undefined, disclosure });
    const { container } = render(Accordion, props);

    await waitFor(() => expect(props.current).toBeUndefined());
    expect(detailsIn(container).every((details) => !details.open)).toBe(true);
  });

  test("programmatic current change opens by value", async () => {
    const props = $state({ items: baseItems(), current: "a" as string | undefined, disclosure });
    const { container, rerender } = render(Accordion, props);

    props.current = "c";
    await rerender(props);

    await waitFor(() => {
      expect(detailsBySummaryText(container, "Section A").open).toBe(false);
      expect(detailsBySummaryText(container, "Section C").open).toBe(true);
    });
  });

  test("programmatic clear closes the open item", async () => {
    const props = $state({ items: baseItems(), current: "a" as string | undefined, disclosure });
    const { container, rerender } = render(Accordion, props);

    props.current = undefined;
    await rerender(props);

    await waitFor(() => expect(detailsIn(container).every((details) => !details.open)).toBe(true));
  });

  test("10+ items keep input order and panel pairing", async () => {
    const items: AccordionItem[] = Array.from({ length: 10 }, (_, i) => ({
      value: `v${i + 1}`,
      label: `L${i + 1}`,
      panel: panelFn(`panel-${i + 1}`, `PANEL-${i + 1}`),
    }));
    const props = $state({ items, current: undefined as string | undefined, disclosure });
    const { container, getByTestId, rerender } = render(Accordion, props);

    expect(summariesIn(container).map((summary) => summary.textContent)).toEqual(items.map((item) => item.label));
    props.current = "v10";
    await rerender(props);
    expect(detailsBySummaryText(container, "L10").open).toBe(true);
    expect(getByTestId("panel-10")).toHaveTextContent("PANEL-10");
  });

  test("reordering items keeps the same value open", async () => {
    const initial = baseItems();
    const props = $state({ items: initial, current: "b" as string | undefined, disclosure });
    const { container, rerender } = render(Accordion, props);

    props.items = [initial[2], initial[1], initial[0]];
    await rerender(props);

    expect(summariesIn(container).map((summary) => summary.textContent)).toEqual(["Section C", "Section B", "Section A"]);
    expect(detailsBySummaryText(container, "Section B").open).toBe(true);
  });

  test("items can be reactively added and removed", async () => {
    const all = baseItems();
    const props = $state({ items: all.slice(0, 1), disclosure });
    const { container, rerender } = render(Accordion, props);

    expect(detailsIn(container)).toHaveLength(1);
    props.items = all.slice(0, 2);
    await rerender(props);
    expect(detailsIn(container)).toHaveLength(2);
    props.items = all.slice(1, 2);
    await rerender(props);
    expect(detailsIn(container)).toHaveLength(1);
    expect(bySummaryText(container, "Section B")).toBeInTheDocument();
  });

  test("removing the current item clears current and closes all", async () => {
    const all = baseItems();
    const props = $state({ items: all, current: "b" as string | undefined, disclosure });
    const { container, rerender } = render(Accordion, props);

    await waitFor(() => expect(detailsBySummaryText(container, "Section B").open).toBe(true));

    props.items = all.filter((item) => item.value !== "b");
    await rerender(props);

    await waitFor(() => {
      expect(props.current).toBeUndefined();
      expect(detailsIn(container).every((details) => !details.open)).toBe(true);
    });
  });
});

describe("Exclusive behavior", () => {
  test("click opens one item exclusively", async () => {
    const props = $state({ items: baseItems(), current: undefined as string | undefined, disclosure });
    const user = userEvent.setup();
    const { container } = render(Accordion, props);

    await user.click(bySummaryText(container, "Section A"));
    await waitFor(() => expect(detailsBySummaryText(container, "Section A").open).toBe(true));
    expect(props.current).toBe("a");

    await user.click(bySummaryText(container, "Section B"));
    await waitFor(() => {
      expect(detailsBySummaryText(container, "Section A").open).toBe(false);
      expect(detailsBySummaryText(container, "Section B").open).toBe(true);
    });
    expect(props.current).toBe("b");
  });

  test("clicking the open item closes it", async () => {
    const props = $state({ items: baseItems(), current: "a" as string | undefined, disclosure });
    const user = userEvent.setup();
    const { container } = render(Accordion, props);

    await user.click(bySummaryText(container, "Section A"));

    await waitFor(() => expect(detailsBySummaryText(container, "Section A").open).toBe(false));
    expect(props.current).toBeUndefined();
  });

  test("opening another item does not overwrite current with undefined", async () => {
    const props = $state({ items: baseItems(), current: "a" as string | undefined, disclosure });
    const user = userEvent.setup();
    const { container } = render(Accordion, props);

    await user.click(bySummaryText(container, "Section B"));

    await waitFor(() => expect(detailsBySummaryText(container, "Section B").open).toBe(true));
    expect(props.current).toBe("b");
  });
});

describe("Disabled", () => {
  test("disabled item cannot open via click", async () => {
    const items = baseItems().map((item) => (item.value === "b" ? { ...item, disabled: true } : item));
    const props = $state({ items, current: "a" as string | undefined, disclosure });
    const user = userEvent.setup();
    const { container } = render(Accordion, props);

    await user.click(bySummaryText(container, "Section B"));

    expect(detailsBySummaryText(container, "Section B").open).toBe(false);
    expect(props.current).toBe("a");
  });

  test("disabled item exposes aria-disabled and inactive styling", () => {
    const items = baseItems().map((item) => (item.value === "b" ? { ...item, disabled: true } : item));
    const { container } = render(Accordion, { items, disclosure });
    const details = detailsBySummaryText(container, "Section B");

    expect(bySummaryText(container, "Section B")).toHaveAttribute("aria-disabled", "true");
    expect(details).toHaveClass(VARIANT.INACTIVE);
  });

  test("enabled items still open and close in a mixed list", async () => {
    const items = baseItems().map((item) => (item.value === "b" ? { ...item, disabled: true } : item));
    const props = $state({ items, current: undefined as string | undefined, disclosure });
    const user = userEvent.setup();
    const { container } = render(Accordion, props);

    await user.click(bySummaryText(container, "Section C"));

    await waitFor(() => expect(detailsBySummaryText(container, "Section C").open).toBe(true));
    expect(props.current).toBe("c");
  });

  test("disabling the current item reactively clears current and collapses it", async () => {
    const props = $state({ items: baseItems(), current: "b" as string | undefined, disclosure });
    const { container, rerender } = render(Accordion, props);

    await waitFor(() => expect(detailsBySummaryText(container, "Section B").open).toBe(true));

    props.items = props.items.map((item) => (item.value === "b" ? { ...item, disabled: true } : item));
    await rerender(props);

    await waitFor(() => {
      expect(props.current).toBeUndefined();
      expect(detailsBySummaryText(container, "Section B").open).toBe(false);
      expect(bySummaryText(container, "Section B")).toHaveAttribute("aria-disabled", "true");
      expect(detailsBySummaryText(container, "Section B")).toHaveClass(VARIANT.INACTIVE);
    });
  });
});

describe("Variant propagation", () => {
  test("closed items reflect Accordion variant and update", async () => {
    const props = $state({ items: baseItems(), variant: VARIANT.NEUTRAL as string, disclosure });
    const { container, rerender } = render(Accordion, props);

    detailsIn(container).forEach((details) => expect(details).toHaveClass(seed, "svs-disclosure", PARTS.WHOLE, VARIANT.NEUTRAL));

    props.variant = "custom-variant";
    await rerender(props);

    await waitFor(() => detailsIn(container).forEach((details) => expect(details).toHaveClass("custom-variant")));
  });

  test("open item shows active while the rest keep Accordion variant", async () => {
    const props = $state({ items: baseItems(), current: undefined as string | undefined, variant: "custom-variant", disclosure });
    const user = userEvent.setup();
    const { container } = render(Accordion, props);

    await user.click(bySummaryText(container, "Section A"));

    await waitFor(() => expect(detailsBySummaryText(container, "Section A")).toHaveClass(VARIANT.ACTIVE));
    expect(detailsBySummaryText(container, "Section B")).toHaveClass("custom-variant");
  });

});

describe("Styling", () => {
  test("default styling", () => {
    const { container } = render(Accordion, { items: baseItems(), disclosure });

    expect(groupIn(container)).toHaveClass(seed, PARTS.WHOLE, VARIANT.NEUTRAL);
    expect(detailsIn(container)[0]).toHaveClass(seed, "svs-disclosure", PARTS.WHOLE, VARIANT.NEUTRAL);
  });

  test("string styling", () => {
    const { container } = render(Accordion, { items: baseItems(), styling: "custom-accordion", disclosure });

    expect(groupIn(container)).toHaveClass("custom-accordion", PARTS.WHOLE, VARIANT.NEUTRAL);
  });

  test("object styling", async () => {
    const styling = { whole: { base: "custom-base", neutral: "custom-neutral", active: "custom-active" } };
    const props = $state({ items: baseItems(), styling, variant: VARIANT.NEUTRAL as string, disclosure });
    const { container, rerender } = render(Accordion, props);

    expect(groupIn(container)).toHaveClass("custom-base", "custom-neutral");
    props.variant = VARIANT.ACTIVE;
    await rerender(props);
    expect(groupIn(container)).toHaveClass("custom-base", "custom-active");
  });

  test("disclosure.styling overrides the default Disclosure styling", () => {
    const localDisclosure = { duration: 0, styling: "custom-disclosure" };
    const { container } = render(Accordion, { items: baseItems(), disclosure: localDisclosure });

    expect(detailsIn(container)[0]).toHaveClass("custom-disclosure");
    expect(detailsIn(container)[0]).not.toHaveClass(seed);
  });
});

describe("Accessibility", () => {
  test("roles and structure use native details and summary", () => {
    const { container, getAllByRole } = render(Accordion, { items: baseItems(), disclosure });

    expect(getAllByRole("group")[0]).toBe(groupIn(container));
    detailsIn(container).forEach((details) => expect(details.tagName).toBe("DETAILS"));
    summariesIn(container).forEach((summary) => expect(summary.tagName).toBe("SUMMARY"));
  });

  test("disabled item remains discoverable in the DOM", () => {
    const items = baseItems().map((item) => (item.value === "b" ? { ...item, disabled: true } : item));
    const { container } = render(Accordion, { items, disclosure });

    expect(bySummaryText(container, "Section B")).toBeInTheDocument();
    expect(bySummaryText(container, "Section B")).toHaveAttribute("aria-disabled", "true");
  });

  test.skip("keyboard activation relies on native summary behavior not simulated in jsdom", async () => {
    const props = $state({ items: baseItems(), current: undefined as string | undefined, disclosure });
    const user = userEvent.setup();
    const { container } = render(Accordion, props);

    bySummaryText(container, "Section A").focus();
    await user.keyboard("{Enter}");

    await waitFor(() => expect(detailsBySummaryText(container, "Section A").open).toBe(true));
  });
});

describe("Declarative mode", () => {
  test("children win over items", () => {
    const items = [{ value: "item", label: "Item Label", panel: panelFn("panel-item", "Item Panel") }];
    const { container, queryByTestId, queryByText } = render(AccordionDeclarative, { items });

    expect(bySummaryText(container, "Section A")).toBeInTheDocument();
    expect(bySummaryText(container, "Section B")).toBeInTheDocument();
    expect(queryByText("Item Label")).toBeNull();
    expect(queryByTestId("panel-item")).toBeNull();
  });

  test("declarative children coordinate via context", async () => {
    const props = $state({ current: undefined as string | undefined, variant: VARIANT.NEUTRAL as string });
    const user = userEvent.setup();
    const { container } = render(AccordionDeclarative, props);

    await user.click(bySummaryText(container, "Section A"));
    await waitFor(() => {
      expect(props.current).toBe("a");
      expect(detailsBySummaryText(container, "Section A").open).toBe(true);
    });

    await user.click(bySummaryText(container, "Section B"));
    await waitFor(() => {
      expect(props.current).toBe("b");
      expect(detailsBySummaryText(container, "Section A").open).toBe(false);
      expect(detailsBySummaryText(container, "Section B").open).toBe(true);
    });
  });

  test("current binding works both ways in declarative mode", async () => {
    const props = $state({ current: undefined as string | undefined, variant: VARIANT.NEUTRAL as string });
    const { container, rerender } = render(AccordionDeclarative, props);

    props.current = "a";
    await rerender(props);

    await waitFor(() => expect(detailsBySummaryText(container, "Section A").open).toBe(true));

    props.current = undefined;
    await rerender(props);

    await waitFor(() => expect(detailsBySummaryText(container, "Section A").open).toBe(false));

    props.current = "unknown";
    await rerender(props);

    await waitFor(() => {
      expect(props.current).toBe("unknown");
      expect(detailsIn(container).every((details) => !details.open)).toBe(true);
    });
  });

  test("base variant reaches declarative children", async () => {
    const props = $state({ current: undefined as string | undefined, variant: "accordion-base", inactiveB: true as string | boolean | undefined });
    const { container } = render(AccordionDeclarative, props);

    await waitFor(() => {
      expect(detailsBySummaryText(container, "Section A")).toHaveClass("accordion-base");
      expect(detailsBySummaryText(container, "Section B")).toHaveClass(VARIANT.INACTIVE);
    });
  });

  test("base variant updates declarative children", async () => {
    const props = $state({ current: undefined as string | undefined, variant: "accordion-base", inactiveB: undefined as string | boolean | undefined });
    const { container, rerender } = render(AccordionDeclarative, props);

    await waitFor(() => expect(detailsBySummaryText(container, "Section A")).toHaveClass("accordion-base"));

    props.variant = "accordion-next";
    await rerender(props);

    await waitFor(() => {
      expect(detailsBySummaryText(container, "Section A")).toHaveClass("accordion-next");
      expect(detailsBySummaryText(container, "Section B")).toHaveClass("accordion-next");
    });
  });
});

describe("Edge cases", () => {
  test("duplicate values are caller responsibility", () => {
    const items: AccordionItem[] = [
      { value: "same", label: "First", panel: panelFn("panel-first", "First Panel") },
      { value: "same", label: "Second", panel: panelFn("panel-second", "Second Panel") },
    ];

    // Accordion does not add deduplication logic; Svelte keyed each requires unique keys.
    expect(new Set(items.map((item) => item.value)).size).not.toBe(items.length);
  });

  test("all disabled items cannot open and current normalizes", async () => {
    const props = $state({ items: baseItems().map((item) => ({ ...item, disabled: true })), current: "a" as string | undefined, disclosure });
    const user = userEvent.setup();
    const { container } = render(Accordion, props);

    await waitFor(() => expect(props.current).toBeUndefined());
    await user.click(bySummaryText(container, "Section B"));
    expect(detailsIn(container).every((details) => !details.open)).toBe(true);
  });

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
