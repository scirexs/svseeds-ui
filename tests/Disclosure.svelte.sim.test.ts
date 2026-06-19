import { afterEach, describe, expect, test, vi } from "vitest";
import { render } from "@testing-library/svelte";
import { userEvent } from "@testing-library/user-event";
import { createRawSnippet } from "svelte";
import Disclosure from "#svs/Disclosure.svelte";

const label = "Disclosure Label";
const childrenContent = "Disclosure Content";
const childrenTestId = "test-children";

const childrenSnippet = createRawSnippet(() => {
  return { render: () => `<div data-testid="${childrenTestId}">${childrenContent}</div>` };
});

afterEach(() => {
  vi.useRealTimers();
});

describe("Disclosure jsdom-retained timing behavior", () => {
  test("toggle guard prevents rapid clicking", async () => {
    vi.useFakeTimers();
    const props = $state({
      label,
      children: childrenSnippet,
      open: false,
      duration: 100,
    });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const { getByText } = render(Disclosure, props);

    const summary = getByText(label);

    await user.click(summary);
    expect(props.open).toBe(true);

    await user.click(summary);
    expect(props.open).toBe(true);

    await vi.advanceTimersByTimeAsync(100);
    await user.click(summary);
    expect(props.open).toBe(false);
  });

  test("close is deferred by dur when duration is omitted", async () => {
    vi.useFakeTimers();
    const props = $state({ label, children: childrenSnippet, open: true });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const { getByRole, getByText } = render(Disclosure, props);
    const details = getByRole("group") as HTMLDetailsElement;
    const summary = getByText(label);

    expect(details.open).toBe(true);

    await user.click(summary);
    expect(props.open).toBe(false);

    await vi.advanceTimersByTimeAsync(50);
    expect(details.open).toBe(true);

    await vi.advanceTimersByTimeAsync(200);
    expect(details.open).toBe(false);
  });

  test.each([-1, 3.14, NaN])("invalid duration %s falls back to default close delay", async (duration) => {
    vi.useFakeTimers();
    const props = $state({ label, children: childrenSnippet, open: true, duration });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const { getByRole, getByText } = render(Disclosure, props);
    const details = getByRole("group") as HTMLDetailsElement;

    await user.click(getByText(label));
    expect(props.open).toBe(false);

    await vi.advanceTimersByTimeAsync(50);
    expect(details.open).toBe(true);

    await vi.advanceTimersByTimeAsync(200);
    expect(details.open).toBe(false);
  });
});
