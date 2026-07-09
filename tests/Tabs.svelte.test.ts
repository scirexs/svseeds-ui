import { describe, expect, test } from "vitest";
import { userEvent } from "vitest/browser";
import { render } from "vitest-browser-svelte";
import { createRawSnippet, tick } from "svelte";
import Tabs from "#svs/Tabs.svelte";
import { PARTS, VARIANT } from "#svs/core";
import TabDummy from "./fixtures/TabDummy.svelte";
import type { TabItem, TabsProps } from "#svs/Tabs.svelte";

const element = (target: Element | null | undefined) => expect.element(target as HTMLElement | null);
const byTabName = (root: ParentNode, name: string) =>
  [...root.querySelectorAll('[role="tab"]')].find((tab) => tab.textContent?.trim() === name) as HTMLButtonElement;
const seed = "svs-tabs";

const panelFn = (id: string, text: string) => createRawSnippet(() => ({ render: () => `<div data-testid="${id}">${text}</div>` }));
const labelFn = (id: string, text: string) => createRawSnippet(() => ({ render: () => `<span data-testid="${id}">${text}</span>` }));
const baseTabs = (): TabItem[] => [
  { value: "a", label: "Tab A", panel: panelFn("panel-a", "Panel A") },
  { value: "b", label: "Tab B", panel: panelFn("panel-b", "Panel B") },
  { value: "c", label: "Tab C", panel: panelFn("panel-c", "Panel C") },
];
const tabsIn = (tablist: HTMLElement) => [...tablist.querySelectorAll('[role="tab"]')] as HTMLButtonElement[];
const panels = (container: HTMLElement) => Array.from(container.querySelectorAll('[role="tabpanel"]')) as HTMLElement[];
const visiblePanels = (container: HTMLElement) => panels(container).filter((panel) => !panel.hasAttribute("hidden"));

describe("Rendering and API", async () => {
  test("tabs array renders tablist, tabs, panels, and initial state", async () => {
    const { container } = render(Tabs, { tabs: baseTabs() });

    const tablist = container.querySelector('[role="tablist"]') as HTMLDivElement;
    const tabs = tabsIn(tablist);
    const allPanels = panels(container);

    await element(tablist).toBeInTheDocument();
    expect(tabs).toHaveLength(3);
    expect(allPanels).toHaveLength(3);
    await element(tabs[0]).toHaveAttribute("aria-selected", "true");
    await element(tabs[0]).toHaveAttribute("tabindex", "0");
    await element(tabs[1]).toHaveAttribute("aria-selected", "false");
    await element(tabs[1]).toHaveAttribute("tabindex", "-1");
    expect(allPanels[0]).not.toHaveAttribute("hidden");
    await element(allPanels[1]).toHaveAttribute("hidden");
  });

  test("empty tabs render nothing", async () => {
    const { container } = render(Tabs, { tabs: [] });
    expect(container.childElementCount).toBe(0);
  });

  test("string, snippet, and TabComponent labels render", async () => {
    const tabs: TabItem[] = [
      { value: "text", label: "Text Label", panel: panelFn("panel-text", "Text Panel") },
      { value: "snippet", label: labelFn("snippet-label", "Snippet Label"), panel: panelFn("panel-snippet", "Snippet Panel") },
      {
        value: "component",
        label: { component: TabDummy, props: { text: "Component Label" } },
        panel: panelFn("panel-component", "Component Panel"),
      },
    ];

    const { container } = render(Tabs, { tabs });

    await element(byTabName(container, "Text Label")).toBeInTheDocument();
    await element(container.querySelector(`[data-testid="${"snippet-label"}"]`) as HTMLElement).toHaveTextContent("Snippet Label");
    await element(container.querySelector(`[data-testid="${"dummy"}"]`) as HTMLElement).toHaveTextContent("Component Label");
  });

  test("snippet and TabComponent panels render with props", async () => {
    const tabs: TabItem[] = [
      { value: "snippet", label: "Snippet", panel: panelFn("snippet-panel", "Snippet Panel") },
      { value: "component", label: "Component", panel: { component: TabDummy, props: { text: "Component Panel" } } },
    ];

    const { container } = render(Tabs, { tabs, current: "component" });

    await element(container.querySelector(`[data-testid="${"snippet-panel"}"]`) as HTMLElement).toHaveTextContent("Snippet Panel");
    await element(container.querySelector(`[data-testid="${"dummy"}"]`) as HTMLElement).toHaveTextContent("Component Panel");
  });
});

describe("Key-string addressing and correction", async () => {
  test("current selects by value", async () => {
    const { container } = render(Tabs, { tabs: baseTabs(), current: "b" });

    await element(byTabName(container, "Tab B")).toHaveAttribute("aria-selected", "true");
    expect((container.querySelector(`[data-testid="${"panel-b"}"]`) as HTMLElement).parentElement).not.toHaveAttribute("hidden");
  });

  test("unknown current resolves to first selectable", async () => {
    const { container } = render(Tabs, { tabs: baseTabs(), current: "zzz" });

    await element(byTabName(container, "Tab A")).toHaveAttribute("aria-selected", "true");
    expect(visiblePanels(container)).toHaveLength(1);
  });

  test("reordering tabs keeps selection stable by value", async () => {
    const initial = baseTabs();
    const props = $state({ tabs: initial, current: "b" });
    const { container, rerender } = render(Tabs, props);

    props.tabs = [initial[2], initial[1], initial[0]];
    await rerender(props);

    expect(tabsIn(container.querySelector('[role="tablist"]') as HTMLDivElement).map((tab) => tab.textContent)).toEqual([
      "Tab C",
      "Tab B",
      "Tab A",
    ]);
    await element(byTabName(container, "Tab B")).toHaveAttribute("aria-selected", "true");
    expect((container.querySelector(`[data-testid="${"panel-b"}"]`) as HTMLElement).parentElement).not.toHaveAttribute("hidden");
  });

  test("tabs can be reactively added and removed", async () => {
    const props = $state({ tabs: baseTabs().slice(0, 2), current: "a" });
    const { container, rerender } = render(Tabs, props);

    expect(tabsIn(container.querySelector('[role="tablist"]') as HTMLDivElement)).toHaveLength(2);
    props.tabs = [...props.tabs, baseTabs()[2]];
    await rerender(props);
    expect(tabsIn(container.querySelector('[role="tablist"]') as HTMLDivElement)).toHaveLength(3);
    props.tabs = props.tabs.filter((tab) => tab.value !== "b");
    await rerender(props);
    expect(tabsIn(container.querySelector('[role="tablist"]') as HTMLDivElement)).toHaveLength(2);
  });

  test("10+ tabs keep input order", async () => {
    const tabs: TabItem[] = Array.from({ length: 12 }, (_, i) => ({
      value: String(i),
      label: `Tab ${i}`,
      panel: panelFn(`panel-${i}`, `Panel ${i}`),
    }));
    const { container } = render(Tabs, { tabs });

    expect(tabsIn(container.querySelector('[role="tablist"]') as HTMLDivElement).map((tab) => tab.textContent)).toEqual(
      tabs.map((tab) => tab.label),
    );
  });
});

describe("Activation modes", async () => {
  test("automatic mode click selects a tab", async () => {
    const props = $state({ tabs: baseTabs(), current: "a" });
    const { container } = render(Tabs, props);

    await userEvent.click(byTabName(container, "Tab C"));

    expect(props.current).toBe("c");
    expect((container.querySelector(`[data-testid="${"panel-c"}"]`) as HTMLElement).parentElement).not.toHaveAttribute("hidden");
  });

  test("automatic mode arrow moves focus and selection", async () => {
    const props = $state({ tabs: baseTabs(), current: "a" });
    const { container } = render(Tabs, props);
    const tabs = tabsIn(container.querySelector('[role="tablist"]') as HTMLDivElement);

    tabs[0].focus();
    await userEvent.keyboard("{ArrowRight}");

    await element(tabs[1]).toHaveFocus();
    expect(props.current).toBe("b");
    expect((container.querySelector(`[data-testid="${"panel-b"}"]`) as HTMLElement).parentElement).not.toHaveAttribute("hidden");
  });

  test("manual mode arrow moves only focus", async () => {
    const props = $state({ tabs: baseTabs(), current: "a", manual: true });
    const { container } = render(Tabs, props);
    const tabs = tabsIn(container.querySelector('[role="tablist"]') as HTMLDivElement);

    tabs[0].focus();
    await userEvent.keyboard("{ArrowRight}");

    await element(tabs[1]).toHaveFocus();
    expect(props.current).toBe("a");
    expect((container.querySelector(`[data-testid="${"panel-a"}"]`) as HTMLElement).parentElement).not.toHaveAttribute("hidden");
  });

  test("manual mode Enter and Space confirm selection", async () => {
    const props = $state({ tabs: baseTabs(), current: "a", manual: true });
    const { container } = render(Tabs, props);
    const tabs = tabsIn(container.querySelector('[role="tablist"]') as HTMLDivElement);

    tabs[0].focus();
    await userEvent.keyboard("{ArrowRight}");
    await userEvent.keyboard("{Enter}");
    expect(props.current).toBe("b");

    await userEvent.keyboard("{ArrowRight}");
    await userEvent.keyboard(" ");
    expect(props.current).toBe("c");
  });
});

describe("Keyboard navigation", async () => {
  test("horizontal arrows move with wrap and ignore vertical arrows", async () => {
    const props = $state({ tabs: baseTabs(), current: "a" });
    const { container } = render(Tabs, props);
    const tabs = tabsIn(container.querySelector('[role="tablist"]') as HTMLDivElement);

    tabs[0].focus();
    await userEvent.keyboard("{ArrowRight}");
    await element(tabs[1]).toHaveFocus();
    tabs[2].focus();
    await userEvent.keyboard("{ArrowRight}");
    await element(tabs[0]).toHaveFocus();
    await userEvent.keyboard("{ArrowLeft}");
    await element(tabs[2]).toHaveFocus();
    await userEvent.keyboard("{ArrowDown}");
    await element(tabs[2]).toHaveFocus();
  });

  test("vertical arrows move with wrap and ignore horizontal arrows", async () => {
    const props = $state({ tabs: baseTabs(), current: "a", orientation: "vertical" as const });
    const { container } = render(Tabs, props);
    const tabs = tabsIn(container.querySelector('[role="tablist"]') as HTMLDivElement);

    tabs[0].focus();
    await userEvent.keyboard("{ArrowDown}");
    await element(tabs[1]).toHaveFocus();
    await userEvent.keyboard("{ArrowUp}");
    await element(tabs[0]).toHaveFocus();
    await userEvent.keyboard("{ArrowLeft}");
    await element(tabs[0]).toHaveFocus();
  });

  test("Home and End focus and select edge tabs", async () => {
    const props = $state({ tabs: baseTabs(), current: "b" });
    const { container } = render(Tabs, props);
    const tabs = tabsIn(container.querySelector('[role="tablist"]') as HTMLDivElement);

    tabs[1].focus();
    await userEvent.keyboard("{End}");
    await element(tabs[2]).toHaveFocus();
    expect(props.current).toBe("c");
    await userEvent.keyboard("{Home}");
    await element(tabs[0]).toHaveFocus();
    expect(props.current).toBe("a");
  });

  test("roving tabindex follows focus in manual mode", async () => {
    const props = $state({ tabs: baseTabs(), current: "a", manual: true });
    const { container } = render(Tabs, props);
    const tabs = tabsIn(container.querySelector('[role="tablist"]') as HTMLDivElement);

    tabs[0].focus();
    await userEvent.keyboard("{ArrowRight}");

    await element(tabs[0]).toHaveAttribute("tabindex", "-1");
    await element(tabs[1]).toHaveAttribute("tabindex", "0");
    await element(tabs[2]).toHaveAttribute("tabindex", "-1");
  });

  test("handled keys prevent default while ignored keys do not", async () => {
    const { container } = render(Tabs, { tabs: baseTabs() });
    const tabs = tabsIn(container.querySelector('[role="tablist"]') as HTMLDivElement);
    const handled = new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true, cancelable: true });
    const ignored = new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true, cancelable: true });

    tabs[0].dispatchEvent(handled);
    tabs[0].dispatchEvent(ignored);

    expect(handled.defaultPrevented).toBe(true);
    expect(ignored.defaultPrevented).toBe(false);
  });
});

describe("Disabled tabs", async () => {
  test("disabled tab is not activatable and exposes aria-disabled", async () => {
    const props = $state({ tabs: baseTabs().map((tab) => (tab.value === "b" ? { ...tab, disabled: true } : tab)), current: "a" });
    const { container } = render(Tabs, props);
    const disabled = byTabName(container, "Tab B");

    disabled.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    await tick();

    await element(disabled).toHaveAttribute("aria-disabled", "true");
    expect(props.current).toBe("a");
  });

  test("navigation skips disabled tabs and wraps", async () => {
    const props = $state({ tabs: baseTabs().map((tab) => (tab.value === "b" ? { ...tab, disabled: true } : tab)), current: "a" });
    const { container } = render(Tabs, props);
    const tabs = tabsIn(container.querySelector('[role="tablist"]') as HTMLDivElement);

    tabs[0].focus();
    await userEvent.keyboard("{ArrowRight}");
    await element(tabs[2]).toHaveFocus();
    await userEvent.keyboard("{ArrowRight}");
    await element(tabs[0]).toHaveFocus();
  });

  test("disabled tabs are excluded from default selection", async () => {
    const tabs = baseTabs().map((tab) => (tab.value === "a" ? { ...tab, disabled: true } : tab));
    const { container } = render(Tabs, { tabs });

    await element(byTabName(container, "Tab B")).toHaveAttribute("aria-selected", "true");
  });

  test("current pointing to a disabled tab resolves to the first enabled tab", async () => {
    const props = $state({ tabs: baseTabs().map((tab) => (tab.value === "b" ? { ...tab, disabled: true } : tab)), current: "b" });
    const { container } = render(Tabs, props);

    await element(byTabName(container, "Tab B")).toHaveAttribute("aria-selected", "false");
    await element(byTabName(container, "Tab A")).toHaveAttribute("aria-selected", "true");
    expect((container.querySelector(`[data-testid="${"panel-a"}"]`) as HTMLElement).parentElement).not.toHaveAttribute("hidden");
    expect(props.current).toBe("a");
  });

  test("all disabled tabs remain unselected", async () => {
    const props = $state({ tabs: baseTabs().map((tab) => ({ ...tab, disabled: true })), current: "b" });
    const { container } = render(Tabs, props);

    expect(
      tabsIn(container.querySelector('[role="tablist"]') as HTMLDivElement).every((tab) => tab.getAttribute("aria-selected") === "false"),
    ).toBe(true);
    expect(visiblePanels(container)).toHaveLength(0);
    expect(props.current).toBeUndefined();
  });
});

describe("Accessibility wiring", () => {
  test("aria-label passes through to the tablist", async () => {
    const { container } = render(Tabs, { tabs: baseTabs(), "aria-label": "Sections" });

    await element(container.querySelector('[role="tablist"]') as HTMLDivElement).toHaveAttribute("aria-label", "Sections");
  });

  test("aria-labelledby passes through to the tablist", async () => {
    const { container } = render(Tabs, { tabs: baseTabs(), "aria-labelledby": "ext-id" });

    await element(container.querySelector('[role="tablist"]') as HTMLDivElement).toHaveAttribute("aria-labelledby", "ext-id");
  });

  test("caller class merges onto the tablist", async () => {
    const { container } = render(Tabs, { tabs: baseTabs(), class: "my-tabs" });
    const tablist = container.querySelector('[role="tablist"]') as HTMLDivElement;

    await element(tablist).toHaveClass("my-tabs");
    await element(tablist).toHaveClass(seed, PARTS.TOP);
  });

  test("component-owned tablist attributes are not overridable", async () => {
    const props = { tabs: baseTabs(), role: "presentation", "aria-orientation": "vertical" } as unknown as TabsProps;
    const { container } = render(Tabs, props);

    await element(container.querySelector('[role="tablist"]') as HTMLDivElement).toHaveAttribute("role", "tablist");
    await element(container.querySelector('[role="tablist"]') as HTMLDivElement).toHaveAttribute("aria-orientation", "horizontal");
  });

  test("ARIA relationships are correctly wired", async () => {
    const { container } = render(Tabs, { tabs: baseTabs(), current: "b" });
    const tabs = tabsIn(container.querySelector('[role="tablist"]') as HTMLDivElement);
    const allPanels = panels(container);

    for (const [i, tab] of tabs.entries()) {
      await element(tab).toHaveAttribute("role", "tab");
      await element(tab).toHaveAttribute("type", "button");
      await element(tab).toHaveAttribute("aria-controls", allPanels[i].id);
      await element(allPanels[i]).toHaveAttribute("role", "tabpanel");
      await element(allPanels[i]).toHaveAttribute("tabindex", "0");
      await element(allPanels[i]).toHaveAttribute("aria-labelledby", tab.id);
    }
    await element(tabs[1]).toHaveAttribute("aria-selected", "true");
    expect(allPanels[1]).not.toHaveAttribute("hidden");
    await element(allPanels[0]).toHaveAttribute("hidden");
    await element(allPanels[0]).toHaveStyle({ display: "none" });
  });

  test("aria-orientation is reflected", async () => {
    const { container, rerender } = render(Tabs, { tabs: baseTabs() });
    await element(container.querySelector('[role="tablist"]') as HTMLDivElement).toHaveAttribute("aria-orientation", "horizontal");

    await rerender({ tabs: baseTabs(), orientation: "vertical" });
    await element(container.querySelector('[role="tablist"]') as HTMLDivElement).toHaveAttribute("aria-orientation", "vertical");
  });

  test("panel visibility toggles on selection change", async () => {
    const props = $state({ tabs: baseTabs(), current: "a" });
    const { container } = render(Tabs, props);

    expect(panels(container)[0]).not.toHaveAttribute("hidden");
    await element(panels(container)[1]).toHaveAttribute("hidden");

    await userEvent.click(byTabName(container, "Tab B"));

    await element(panels(container)[0]).toHaveAttribute("hidden");
    await element(panels(container)[0]).toHaveStyle({ display: "none" });
    expect(panels(container)[1]).not.toHaveAttribute("hidden");
    expect(panels(container)[1]).not.toHaveStyle({ display: "none" });
  });
});

describe("Styling", async () => {
  test("default styling classes are applied to parts", async () => {
    const { container } = render(Tabs, { tabs: baseTabs() });
    const tablist = container.querySelector('[role="tablist"]') as HTMLDivElement;
    const tabs = tabsIn(tablist);
    const panel = panels(container)[0];

    await element(tablist.parentElement).toHaveClass(seed, PARTS.WHOLE, VARIANT.NEUTRAL);
    await element(tablist).toHaveClass(seed, PARTS.TOP, VARIANT.NEUTRAL);
    await element(tabs[0]).toHaveClass(seed, PARTS.LABEL, VARIANT.ACTIVE);
    await element(tabs[1]).toHaveClass(seed, PARTS.LABEL, VARIANT.NEUTRAL);
    await element(panel).toHaveClass(seed, PARTS.MAIN, VARIANT.NEUTRAL);
  });

  test("string styling classes are applied to parts", async () => {
    const styleId = "custom-tabs";
    const { container } = render(Tabs, { tabs: baseTabs(), styling: styleId });
    const tablist = container.querySelector('[role="tablist"]') as HTMLDivElement;
    const tabs = tabsIn(tablist);
    const panel = panels(container)[0];

    await element(tablist.parentElement).toHaveClass(styleId, PARTS.WHOLE, VARIANT.NEUTRAL);
    await element(tablist).toHaveClass(styleId, PARTS.TOP, VARIANT.NEUTRAL);
    await element(tabs[0]).toHaveClass(styleId, PARTS.LABEL, VARIANT.ACTIVE);
    await element(tabs[1]).toHaveClass(styleId, PARTS.LABEL, VARIANT.NEUTRAL);
    await element(panel).toHaveClass(styleId, PARTS.MAIN, VARIANT.NEUTRAL);
  });

  test("object styling classes are applied to parts", async () => {
    const dynObj = { base: "base-class", neutral: "neutral-class", active: "active-class", inactive: "inactive-class" };
    const styling = { whole: dynObj, top: dynObj, label: dynObj, main: dynObj };
    const { container } = render(Tabs, { tabs: baseTabs(), styling });
    const tablist = container.querySelector('[role="tablist"]') as HTMLDivElement;
    const tabs = tabsIn(tablist);
    const panel = panels(container)[0];

    await element(tablist.parentElement).toHaveClass(dynObj.base, dynObj.neutral);
    await element(tablist).toHaveClass(dynObj.base, dynObj.neutral);
    await element(tabs[0]).toHaveClass(dynObj.base, dynObj.active);
    await element(tabs[1]).toHaveClass(dynObj.base, dynObj.neutral);
    await element(panel).toHaveClass(dynObj.base, dynObj.neutral);
  });

  test("variant prop propagates to whole, top, main, and non-selected labels", async () => {
    const { container } = render(Tabs, { tabs: baseTabs(), variant: VARIANT.INACTIVE });
    const tablist = container.querySelector('[role="tablist"]') as HTMLDivElement;
    const tabs = tabsIn(tablist);
    const panel = panels(container)[0];

    await element(tablist.parentElement).toHaveClass(seed, PARTS.WHOLE, VARIANT.INACTIVE);
    await element(tablist).toHaveClass(seed, PARTS.TOP, VARIANT.INACTIVE);
    await element(tabs[0]).toHaveClass(seed, PARTS.LABEL, VARIANT.ACTIVE);
    await element(tabs[1]).toHaveClass(seed, PARTS.LABEL, VARIANT.INACTIVE);
    await element(panel).toHaveClass(seed, PARTS.MAIN, VARIANT.INACTIVE);
  });
});
