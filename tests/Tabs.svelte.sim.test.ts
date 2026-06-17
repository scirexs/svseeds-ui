import { describe, expect, test } from "vitest";
import { render, within } from "@testing-library/svelte";
import { userEvent } from "@testing-library/user-event";
import { createRawSnippet } from "svelte";
import Tabs, { type TabItem } from "#svs/Tabs.svelte";
import { PARTS, VARIANT } from "#svs/core";
import TabDummy from "./fixtures/TabDummy.svelte";

const seed = "svs-tabs";

const panelFn = (id: string, text: string) => createRawSnippet(() => ({ render: () => `<div data-testid="${id}">${text}</div>` }));
const labelFn = (id: string, text: string) => createRawSnippet(() => ({ render: () => `<span data-testid="${id}">${text}</span>` }));
const baseTabs = (): TabItem[] => [
  { value: "a", label: "Tab A", panel: panelFn("panel-a", "Panel A") },
  { value: "b", label: "Tab B", panel: panelFn("panel-b", "Panel B") },
  { value: "c", label: "Tab C", panel: panelFn("panel-c", "Panel C") },
];
const tabsIn = (tablist: HTMLElement) => within(tablist).getAllByRole("tab") as HTMLButtonElement[];
const panels = () => document.querySelectorAll('[role="tabpanel"]') as NodeListOf<HTMLElement>;
const visiblePanels = () => Array.from(panels()).filter((panel) => !panel.hasAttribute("hidden"));

describe("Rendering and API", () => {
  test("tabs array renders tablist, tabs, panels, and initial state", () => {
    const { getByRole, getAllByRole } = render(Tabs, { tabs: baseTabs() });

    const tablist = getByRole("tablist");
    const tabs = tabsIn(tablist);
    const allPanels = getAllByRole("tabpanel", { hidden: true });

    expect(tablist).toBeInTheDocument();
    expect(tabs).toHaveLength(3);
    expect(allPanels).toHaveLength(3);
    expect(tabs[0]).toHaveAttribute("aria-selected", "true");
    expect(tabs[0]).toHaveAttribute("tabindex", "0");
    expect(tabs[1]).toHaveAttribute("aria-selected", "false");
    expect(tabs[1]).toHaveAttribute("tabindex", "-1");
    expect(allPanels[0]).not.toHaveAttribute("hidden");
    expect(allPanels[1]).toHaveAttribute("hidden");
  });

  test("empty tabs render nothing", () => {
    const { container } = render(Tabs, { tabs: [] });
    expect(container.childElementCount).toBe(0);
  });

  test("string, snippet, and TabComponent labels render", () => {
    const tabs: TabItem[] = [
      { value: "text", label: "Text Label", panel: panelFn("panel-text", "Text Panel") },
      { value: "snippet", label: labelFn("snippet-label", "Snippet Label"), panel: panelFn("panel-snippet", "Snippet Panel") },
      {
        value: "component",
        label: { component: TabDummy, props: { text: "Component Label" } },
        panel: panelFn("panel-component", "Component Panel"),
      },
    ];

    const { getByRole, getByTestId } = render(Tabs, { tabs });

    expect(getByRole("tab", { name: "Text Label" })).toBeInTheDocument();
    expect(getByTestId("snippet-label")).toHaveTextContent("Snippet Label");
    expect(getByTestId("dummy")).toHaveTextContent("Component Label");
  });

  test("snippet and TabComponent panels render with props", () => {
    const tabs: TabItem[] = [
      { value: "snippet", label: "Snippet", panel: panelFn("snippet-panel", "Snippet Panel") },
      { value: "component", label: "Component", panel: { component: TabDummy, props: { text: "Component Panel" } } },
    ];

    const { getByTestId } = render(Tabs, { tabs, current: "component" });

    expect(getByTestId("snippet-panel")).toHaveTextContent("Snippet Panel");
    expect(getByTestId("dummy")).toHaveTextContent("Component Panel");
  });
});

describe("Key-string addressing and correction", () => {
  test("current selects by value", () => {
    const { getByRole, getByTestId } = render(Tabs, { tabs: baseTabs(), current: "b" });

    expect(getByRole("tab", { name: "Tab B" })).toHaveAttribute("aria-selected", "true");
    expect(getByTestId("panel-b").parentElement).not.toHaveAttribute("hidden");
  });

  test("unknown current resolves to first selectable", () => {
    const { getByRole } = render(Tabs, { tabs: baseTabs(), current: "zzz" });

    expect(getByRole("tab", { name: "Tab A" })).toHaveAttribute("aria-selected", "true");
    expect(visiblePanels()).toHaveLength(1);
  });

  test("reordering tabs keeps selection stable by value", async () => {
    const initial = baseTabs();
    const props = $state({ tabs: initial, current: "b" });
    const { getByRole, getByTestId, rerender } = render(Tabs, props);

    props.tabs = [initial[2], initial[1], initial[0]];
    await rerender(props);

    expect(tabsIn(getByRole("tablist")).map((tab) => tab.textContent)).toEqual(["Tab C", "Tab B", "Tab A"]);
    expect(getByRole("tab", { name: "Tab B" })).toHaveAttribute("aria-selected", "true");
    expect(getByTestId("panel-b").parentElement).not.toHaveAttribute("hidden");
  });

  test("tabs can be reactively added and removed", async () => {
    const props = $state({ tabs: baseTabs().slice(0, 2), current: "a" });
    const { getByRole, rerender } = render(Tabs, props);

    expect(tabsIn(getByRole("tablist"))).toHaveLength(2);
    props.tabs = [...props.tabs, baseTabs()[2]];
    await rerender(props);
    expect(tabsIn(getByRole("tablist"))).toHaveLength(3);
    props.tabs = props.tabs.filter((tab) => tab.value !== "b");
    await rerender(props);
    expect(tabsIn(getByRole("tablist"))).toHaveLength(2);
  });

  test("10+ tabs keep input order", () => {
    const tabs: TabItem[] = Array.from({ length: 12 }, (_, i) => ({
      value: String(i),
      label: `Tab ${i}`,
      panel: panelFn(`panel-${i}`, `Panel ${i}`),
    }));
    const { getByRole } = render(Tabs, { tabs });

    expect(tabsIn(getByRole("tablist")).map((tab) => tab.textContent)).toEqual(tabs.map((tab) => tab.label));
  });
});

describe("Activation modes", () => {
  test("automatic mode click selects a tab", async () => {
    const props = $state({ tabs: baseTabs(), current: "a" });
    const user = userEvent.setup();
    const { getByRole, getByTestId } = render(Tabs, props);

    await user.click(getByRole("tab", { name: "Tab C" }));

    expect(props.current).toBe("c");
    expect(getByTestId("panel-c").parentElement).not.toHaveAttribute("hidden");
  });

  test("automatic mode arrow moves focus and selection", async () => {
    const props = $state({ tabs: baseTabs(), current: "a" });
    const user = userEvent.setup();
    const { getByRole, getByTestId } = render(Tabs, props);
    const tabs = tabsIn(getByRole("tablist"));

    tabs[0].focus();
    await user.keyboard("{ArrowRight}");

    expect(document.activeElement).toBe(tabs[1]);
    expect(props.current).toBe("b");
    expect(getByTestId("panel-b").parentElement).not.toHaveAttribute("hidden");
  });

  test("manual mode arrow moves only focus", async () => {
    const props = $state({ tabs: baseTabs(), current: "a", manual: true });
    const user = userEvent.setup();
    const { getByRole, getByTestId } = render(Tabs, props);
    const tabs = tabsIn(getByRole("tablist"));

    tabs[0].focus();
    await user.keyboard("{ArrowRight}");

    expect(document.activeElement).toBe(tabs[1]);
    expect(props.current).toBe("a");
    expect(getByTestId("panel-a").parentElement).not.toHaveAttribute("hidden");
  });

  test("manual mode Enter and Space confirm selection", async () => {
    const props = $state({ tabs: baseTabs(), current: "a", manual: true });
    const user = userEvent.setup();
    const { getByRole } = render(Tabs, props);
    const tabs = tabsIn(getByRole("tablist"));

    tabs[0].focus();
    await user.keyboard("{ArrowRight}");
    await user.keyboard("{Enter}");
    expect(props.current).toBe("b");

    await user.keyboard("{ArrowRight}");
    await user.keyboard(" ");
    expect(props.current).toBe("c");
  });
});

describe("Keyboard navigation", () => {
  test("horizontal arrows move with wrap and ignore vertical arrows", async () => {
    const props = $state({ tabs: baseTabs(), current: "a" });
    const user = userEvent.setup();
    const { getByRole } = render(Tabs, props);
    const tabs = tabsIn(getByRole("tablist"));

    tabs[0].focus();
    await user.keyboard("{ArrowRight}");
    expect(document.activeElement).toBe(tabs[1]);
    tabs[2].focus();
    await user.keyboard("{ArrowRight}");
    expect(document.activeElement).toBe(tabs[0]);
    await user.keyboard("{ArrowLeft}");
    expect(document.activeElement).toBe(tabs[2]);
    await user.keyboard("{ArrowDown}");
    expect(document.activeElement).toBe(tabs[2]);
  });

  test("vertical arrows move with wrap and ignore horizontal arrows", async () => {
    const props = $state({ tabs: baseTabs(), current: "a", orientation: "vertical" as const });
    const user = userEvent.setup();
    const { getByRole } = render(Tabs, props);
    const tabs = tabsIn(getByRole("tablist"));

    tabs[0].focus();
    await user.keyboard("{ArrowDown}");
    expect(document.activeElement).toBe(tabs[1]);
    await user.keyboard("{ArrowUp}");
    expect(document.activeElement).toBe(tabs[0]);
    await user.keyboard("{ArrowLeft}");
    expect(document.activeElement).toBe(tabs[0]);
  });

  test("Home and End focus and select edge tabs", async () => {
    const props = $state({ tabs: baseTabs(), current: "b" });
    const user = userEvent.setup();
    const { getByRole } = render(Tabs, props);
    const tabs = tabsIn(getByRole("tablist"));

    tabs[1].focus();
    await user.keyboard("{End}");
    expect(document.activeElement).toBe(tabs[2]);
    expect(props.current).toBe("c");
    await user.keyboard("{Home}");
    expect(document.activeElement).toBe(tabs[0]);
    expect(props.current).toBe("a");
  });

  test("roving tabindex follows focus in manual mode", async () => {
    const props = $state({ tabs: baseTabs(), current: "a", manual: true });
    const user = userEvent.setup();
    const { getByRole } = render(Tabs, props);
    const tabs = tabsIn(getByRole("tablist"));

    tabs[0].focus();
    await user.keyboard("{ArrowRight}");

    expect(tabs[0]).toHaveAttribute("tabindex", "-1");
    expect(tabs[1]).toHaveAttribute("tabindex", "0");
    expect(tabs[2]).toHaveAttribute("tabindex", "-1");
  });

  test("handled keys prevent default while ignored keys do not", () => {
    const { getByRole } = render(Tabs, { tabs: baseTabs() });
    const tabs = tabsIn(getByRole("tablist"));
    const handled = new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true, cancelable: true });
    const ignored = new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true, cancelable: true });

    tabs[0].dispatchEvent(handled);
    tabs[0].dispatchEvent(ignored);

    expect(handled.defaultPrevented).toBe(true);
    expect(ignored.defaultPrevented).toBe(false);
  });
});

describe("Disabled tabs", () => {
  test("disabled tab is not activatable and exposes aria-disabled", async () => {
    const props = $state({ tabs: baseTabs().map((tab) => (tab.value === "b" ? { ...tab, disabled: true } : tab)), current: "a" });
    const user = userEvent.setup();
    const { getByRole } = render(Tabs, props);
    const disabled = getByRole("tab", { name: "Tab B" });

    await user.click(disabled);

    expect(disabled).toHaveAttribute("aria-disabled", "true");
    expect(props.current).toBe("a");
  });

  test("navigation skips disabled tabs and wraps", async () => {
    const props = $state({ tabs: baseTabs().map((tab) => (tab.value === "b" ? { ...tab, disabled: true } : tab)), current: "a" });
    const user = userEvent.setup();
    const { getByRole } = render(Tabs, props);
    const tabs = tabsIn(getByRole("tablist"));

    tabs[0].focus();
    await user.keyboard("{ArrowRight}");
    expect(document.activeElement).toBe(tabs[2]);
    await user.keyboard("{ArrowRight}");
    expect(document.activeElement).toBe(tabs[0]);
  });

  test("disabled tabs are excluded from default selection", () => {
    const tabs = baseTabs().map((tab) => (tab.value === "a" ? { ...tab, disabled: true } : tab));
    const { getByRole } = render(Tabs, { tabs });

    expect(getByRole("tab", { name: "Tab B" })).toHaveAttribute("aria-selected", "true");
  });

  test("current pointing to a disabled tab resolves to the first enabled tab", () => {
    const props = $state({ tabs: baseTabs().map((tab) => (tab.value === "b" ? { ...tab, disabled: true } : tab)), current: "b" });
    const { getByRole, getByTestId } = render(Tabs, props);

    expect(getByRole("tab", { name: "Tab B" })).toHaveAttribute("aria-selected", "false");
    expect(getByRole("tab", { name: "Tab A" })).toHaveAttribute("aria-selected", "true");
    expect(getByTestId("panel-a").parentElement).not.toHaveAttribute("hidden");
    expect(props.current).toBe("a");
  });

  test("all disabled tabs remain unselected", () => {
    const props = $state({ tabs: baseTabs().map((tab) => ({ ...tab, disabled: true })), current: "b" });
    const { getByRole } = render(Tabs, props);

    expect(tabsIn(getByRole("tablist")).every((tab) => tab.getAttribute("aria-selected") === "false")).toBe(true);
    expect(visiblePanels()).toHaveLength(0);
    expect(props.current).toBeUndefined();
  });
});

describe("Accessibility wiring", () => {
  test("ARIA relationships are correctly wired", () => {
    const { getByRole, getAllByRole } = render(Tabs, { tabs: baseTabs(), current: "b" });
    const tabs = tabsIn(getByRole("tablist"));
    const allPanels = getAllByRole("tabpanel", { hidden: true });

    tabs.forEach((tab, i) => {
      expect(tab).toHaveAttribute("role", "tab");
      expect(tab).toHaveAttribute("type", "button");
      expect(tab).toHaveAttribute("aria-controls", allPanels[i].id);
      expect(allPanels[i]).toHaveAttribute("role", "tabpanel");
      expect(allPanels[i]).toHaveAttribute("tabindex", "0");
      expect(allPanels[i]).toHaveAttribute("aria-labelledby", tab.id);
    });
    expect(tabs[1]).toHaveAttribute("aria-selected", "true");
    expect(allPanels[1]).not.toHaveAttribute("hidden");
    expect(allPanels[0]).toHaveAttribute("hidden");
    expect(allPanels[0]).toHaveStyle({ display: "none" });
  });

  test("aria-orientation is reflected", async () => {
    const { getByRole, rerender } = render(Tabs, { tabs: baseTabs() });
    expect(getByRole("tablist")).toHaveAttribute("aria-orientation", "horizontal");

    await rerender({ tabs: baseTabs(), orientation: "vertical" });
    expect(getByRole("tablist")).toHaveAttribute("aria-orientation", "vertical");
  });

  test("panel visibility toggles on selection change", async () => {
    const props = $state({ tabs: baseTabs(), current: "a" });
    const user = userEvent.setup();
    const { getByRole } = render(Tabs, props);

    expect(panels()[0]).not.toHaveAttribute("hidden");
    expect(panels()[1]).toHaveAttribute("hidden");

    await user.click(getByRole("tab", { name: "Tab B" }));

    expect(panels()[0]).toHaveAttribute("hidden");
    expect(panels()[0]).toHaveStyle({ display: "none" });
    expect(panels()[1]).not.toHaveAttribute("hidden");
    expect(panels()[1]).not.toHaveStyle({ display: "none" });
  });
});

describe("Styling", () => {
  test("default styling classes are applied to parts", () => {
    const { getByRole } = render(Tabs, { tabs: baseTabs() });
    const tablist = getByRole("tablist");
    const tabs = tabsIn(tablist);
    const panel = panels()[0];

    expect(tablist.parentElement).toHaveClass(seed, PARTS.WHOLE, VARIANT.NEUTRAL);
    expect(tablist).toHaveClass(seed, PARTS.TOP, VARIANT.NEUTRAL);
    expect(tabs[0]).toHaveClass(seed, PARTS.LABEL, VARIANT.ACTIVE);
    expect(tabs[1]).toHaveClass(seed, PARTS.LABEL, VARIANT.NEUTRAL);
    expect(panel).toHaveClass(seed, PARTS.MAIN, VARIANT.NEUTRAL);
  });

  test("string styling classes are applied to parts", () => {
    const styleId = "custom-tabs";
    const { getByRole } = render(Tabs, { tabs: baseTabs(), styling: styleId });
    const tablist = getByRole("tablist");
    const tabs = tabsIn(tablist);
    const panel = panels()[0];

    expect(tablist.parentElement).toHaveClass(styleId, PARTS.WHOLE, VARIANT.NEUTRAL);
    expect(tablist).toHaveClass(styleId, PARTS.TOP, VARIANT.NEUTRAL);
    expect(tabs[0]).toHaveClass(styleId, PARTS.LABEL, VARIANT.ACTIVE);
    expect(tabs[1]).toHaveClass(styleId, PARTS.LABEL, VARIANT.NEUTRAL);
    expect(panel).toHaveClass(styleId, PARTS.MAIN, VARIANT.NEUTRAL);
  });

  test("object styling classes are applied to parts", () => {
    const dynObj = { base: "base-class", neutral: "neutral-class", active: "active-class", inactive: "inactive-class" };
    const styling = { whole: dynObj, top: dynObj, label: dynObj, main: dynObj };
    const { getByRole } = render(Tabs, { tabs: baseTabs(), styling });
    const tablist = getByRole("tablist");
    const tabs = tabsIn(tablist);
    const panel = panels()[0];

    expect(tablist.parentElement).toHaveClass(dynObj.base, dynObj.neutral);
    expect(tablist).toHaveClass(dynObj.base, dynObj.neutral);
    expect(tabs[0]).toHaveClass(dynObj.base, dynObj.active);
    expect(tabs[1]).toHaveClass(dynObj.base, dynObj.neutral);
    expect(panel).toHaveClass(dynObj.base, dynObj.neutral);
  });

  test("variant prop propagates to whole, top, main, and non-selected labels", () => {
    const { getByRole } = render(Tabs, { tabs: baseTabs(), variant: VARIANT.INACTIVE });
    const tablist = getByRole("tablist");
    const tabs = tabsIn(tablist);
    const panel = panels()[0];

    expect(tablist.parentElement).toHaveClass(seed, PARTS.WHOLE, VARIANT.INACTIVE);
    expect(tablist).toHaveClass(seed, PARTS.TOP, VARIANT.INACTIVE);
    expect(tabs[0]).toHaveClass(seed, PARTS.LABEL, VARIANT.ACTIVE);
    expect(tabs[1]).toHaveClass(seed, PARTS.LABEL, VARIANT.INACTIVE);
    expect(panel).toHaveClass(seed, PARTS.MAIN, VARIANT.INACTIVE);
  });
});
