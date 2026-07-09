import axe from "axe-core";
import { afterEach, describe, expect, test, vi } from "vitest";
import { render } from "vitest-browser-svelte";
import { tick } from "svelte";
import Image, { type ImageProps } from "#svs/Image.svelte";
import { PARTS, VARIANT } from "#svs/core";
import type { AxeMatchers } from "vitest-axe/matchers";

declare module "vitest" {
  interface Assertion<T = any> extends AxeMatchers {}
}

const has = (el: Element | null | undefined, ...names: string[]) =>
  expect([...(el?.classList ?? [])]).toEqual(expect.arrayContaining(names));
const lacks = (el: Element | null | undefined, name: string) => expect(el?.classList.contains(name)).toBe(false);
const attr = (el: Element, name: string, value?: string) => {
  if (value === undefined) expect(el.hasAttribute(name)).toBe(true);
  else expect(el.getAttribute(name)).toBe(value);
};
const noattr = (el: Element, name: string) => expect(el.hasAttribute(name)).toBe(false);
const img = (container: HTMLElement) => container.querySelector("img") as HTMLImageElement;
const pic = (container: HTMLElement) => container.querySelector("picture") as HTMLPictureElement;
const link = (href: string) => document.head.querySelector(`link[rel="preload"][as="image"][href="${href}"]`) as HTMLLinkElement | null;

afterEach(() => {
  document.head.querySelectorAll('link[rel="preload"][as="image"]').forEach((el) => el.remove());
});

describe("Image anatomy and attrs", () => {
  test("renders picture with accessible img and part classes", () => {
    const { container } = render(Image, { src: "/image.jpg", alt: "Image" });
    const root = pic(container);
    const main = img(container);

    expect(root).toBeTruthy();
    expect(root.firstElementChild).toBe(main);
    attr(main, "src", "/image.jpg");
    attr(main, "alt", "Image");
    has(root, "svs-image", PARTS.WHOLE, VARIANT.NEUTRAL);
    has(main, "svs-image", PARTS.MAIN, VARIANT.NEUTRAL);
  });

  test("preserves decorative empty alt", () => {
    const { container } = render(Image, { src: "/decorative.svg", alt: "" });

    attr(img(container), "alt", "");
  });

  test("defaults to lazy async image loading", () => {
    const { container } = render(Image, { src: "/default.jpg", alt: "Default" });
    const main = img(container);

    attr(main, "loading", "lazy");
    attr(main, "decoding", "async");
    noattr(main, "fetchpriority");
    expect(link("/default.jpg")).toBeNull();
  });

  test("firstView sets eager high loading and preload, while explicit attrs override image attrs", () => {
    const { container } = render(Image, {
      src: "/hero.jpg",
      alt: "Hero",
      firstView: true,
      loading: "lazy",
      fetchpriority: "low",
      decoding: "sync",
    });
    const main = img(container);
    const preload = link("/hero.jpg");

    attr(main, "loading", "lazy");
    attr(main, "fetchpriority", "low");
    attr(main, "decoding", "sync");
    expect(preload).toBeTruthy();
    attr(preload!, "fetchpriority", "low");
  });

  test("sources render before img and derive or honor source type", () => {
    const { container } = render(Image, {
      src: "/fallback.jpg",
      alt: "Picture",
      sources: [
        { srcset: "/pic.AVIF?cache=1 1x, /pic@2x.avif 2x", media: "(min-width: 800px)", sizes: "50vw" },
        { srcset: "/pic.jpg 1x" },
        { srcset: "/pic.custom 1x", type: "image/custom", width: 320, height: 180 },
        { srcset: "/pic.unknown 1x" },
      ],
    });
    const root = pic(container);
    const sources = [...container.querySelectorAll("source")];

    expect(root.children[0]).toBe(sources[0]);
    expect(root.lastElementChild).toBe(img(container));
    attr(sources[0]!, "srcset", "/pic.AVIF?cache=1 1x, /pic@2x.avif 2x");
    attr(sources[0]!, "media", "(min-width: 800px)");
    attr(sources[0]!, "sizes", "50vw");
    attr(sources[0]!, "type", "image/avif");
    attr(sources[1]!, "type", "image/jpeg");
    attr(sources[2]!, "type", "image/custom");
    attr(sources[2]!, "width", "320");
    attr(sources[2]!, "height", "180");
    noattr(sources[3]!, "type");
  });
});

describe("Image preload", () => {
  test("preload without sources mirrors img srcset and sizes", () => {
    render(Image, {
      src: "/preload-img.jpg",
      alt: "Preload",
      preload: true,
      srcset: "/preload-img.jpg 1x, /preload-img@2x.jpg 2x",
      sizes: "100vw",
    });
    const preload = link("/preload-img.jpg");

    expect(preload).toBeTruthy();
    attr(preload!, "imagesrcset", "/preload-img.jpg 1x, /preload-img@2x.jpg 2x");
    attr(preload!, "imagesizes", "100vw");
    noattr(preload!, "type");
  });

  test("preload with sources mirrors the first source as highest-priority candidate", () => {
    render(Image, {
      src: "/preload-fallback.jpg",
      alt: "Preload",
      preload: true,
      sizes: "100vw",
      sources: [
        { srcset: "/preload.avif 1x, /preload@2x.avif 2x", media: "(min-width: 900px)", sizes: "60vw" },
        { srcset: "/preload.webp 1x" },
      ],
    });
    const preload = link("/preload-fallback.jpg");

    expect(preload).toBeTruthy();
    attr(preload!, "imagesrcset", "/preload.avif 1x, /preload@2x.avif 2x");
    attr(preload!, "imagesizes", "60vw");
    attr(preload!, "type", "image/avif");
    attr(preload!, "media", "(min-width: 900px)");
  });

  test("does not emit preload when neither preload nor firstView is set", () => {
    render(Image, { src: "/no-preload.jpg", alt: "No preload" });

    expect(link("/no-preload.jpg")).toBeNull();
  });
});

describe("Image state", () => {
  test("placeholder merges with caller style and clears after load", async () => {
    const { container } = render(Image, {
      src: "/placeholder.jpg",
      alt: "Placeholder",
      placeholder: "url(data:image/gif;base64,AAAA)",
      style: "object-fit:cover",
    });
    const main = img(container);

    expect(main.style.background).toContain("data:image/gif;base64,AAAA");
    expect(main.style.objectFit).toBe("cover");

    main.dispatchEvent(new Event("load"));
    await tick();

    expect(main.style.background).toBe("");
    expect(main.style.objectFit).toBe("cover");
  });

  test("load sets data-loaded, drives ACTIVE variant, and re-dispatches onload", async () => {
    const onload = vi.fn();
    const props = $state<ImageProps>({ src: "/load.jpg", alt: "Load", variant: VARIANT.NEUTRAL, onload });
    const { container } = render(Image, props);
    const root = pic(container);
    const main = img(container);

    main.dispatchEvent(new Event("load"));
    await tick();

    attr(main, "data-loaded", "true");
    noattr(main, "data-error");
    expect(props.variant).toBe(VARIANT.ACTIVE);
    has(root, "svs-image", PARTS.WHOLE, VARIANT.ACTIVE);
    has(main, "svs-image", PARTS.MAIN, VARIANT.ACTIVE);
    expect(onload).toHaveBeenCalledTimes(1);
  });

  test("error sets data-error, drives INACTIVE variant, and re-dispatches onerror", async () => {
    const onerror = vi.fn();
    const props = $state<ImageProps>({ src: "/error.jpg", alt: "Error", variant: VARIANT.NEUTRAL, onerror });
    const { container } = render(Image, props);
    const main = img(container);

    main.dispatchEvent(new Event("error"));
    await tick();

    attr(main, "data-error", "true");
    noattr(main, "data-loaded");
    expect(props.variant).toBe(VARIANT.INACTIVE);
    has(main, "svs-image", PARTS.MAIN, VARIANT.INACTIVE);
    expect(onerror).toHaveBeenCalledTimes(1);
  });

  test("changing src resets state and restores caller variant", async () => {
    const props = $state<ImageProps>({ src: "/reset-a.jpg", alt: "Reset", variant: VARIANT.NEUTRAL });
    const { container, rerender } = render(Image, props);
    const main = img(container);

    main.dispatchEvent(new Event("load"));
    await tick();
    expect(props.variant).toBe(VARIANT.ACTIVE);
    attr(main, "data-loaded", "true");

    props.src = "/reset-b.jpg";
    await rerender(props);
    await tick();

    noattr(main, "data-loaded");
    noattr(main, "data-error");
    expect(props.variant).toBe(VARIANT.NEUTRAL);
    has(main, "svs-image", PARTS.MAIN, VARIANT.NEUTRAL);
    lacks(main, VARIANT.ACTIVE);
  });

  test("element bind and attach run", async () => {
    const attach = vi.fn();
    const props = $state<ImageProps>({ src: "/bind.jpg", alt: "Bind", element: undefined, attach });
    const { container } = render(Image, props);
    const main = img(container);
    await tick();

    expect(props.element).toBe(main);
    expect(attach).toHaveBeenCalled();
  });
});

describe("accessibility (axe)", () => {
  test("audits the default image", async () => {
    const { container } = render(Image, { src: "/image.jpg", alt: "Image" });

    expect(await axe.run(container)).toHaveNoViolations();
  });

  test("audits a loaded image state", async () => {
    const { container } = render(Image, { src: "/load.jpg", alt: "Load" });
    const main = img(container);

    main.dispatchEvent(new Event("load"));
    await tick();

    expect(await axe.run(container)).toHaveNoViolations();
  });
});
