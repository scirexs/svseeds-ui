import { describe, expect, test } from "vitest";
import { render } from "@testing-library/svelte";
import { createRawSnippet } from "svelte";
import Button from "#svs/Button.svelte";

describe("Switching existence of elements", () => {
  test("handles snippet errors gracefully", () => {
    const errorSnippet = createRawSnippet(() => {
      throw new Error("Snippet error");
    });

    expect(() => render(Button, { children: errorSnippet })).toThrow();
  });
});
