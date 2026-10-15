/**
 * useUniverDocSurfaceTheme — push this app's theme INTO a Univer document's
 * canvas, on boot and on every theme flip.
 *
 * `useUniverDarkModeSync` is the other half and is NOT enough on its own:
 * `univerAPI.toggleDarkMode()` recolours Univer's chrome and nothing else.
 * The page and the desk it sits on are painted by
 * `@univerjs/engine-render`'s `DocBackground` from module-level LIGHT
 * constants, and the canvas element's own background is set once by
 * `DocsRenderService` to `#fafafa`. Neither ever hears about a theme. The full
 * argument, and the decision about what the page should look like in dark
 * mode, live in `../univer-doc-surface-theme.ts`.
 *
 * So the host states the colours. Every Matrx surface that mounts a Univer
 * document goes through `DocumentEditor`, and `DocumentEditor` goes through
 * this hook — the `/documents/[id]` route and the canvas pane's
 * `DocumentCanvasBody` therefore inherit it without knowing it exists.
 */
"use client";

import { useEffect } from "react";

import { useThemeMode } from "@/styles/themes/useThemeMode";
import { PAGE_COLOR_KEY } from "@/features/documents/document-page-style";

import {
  domTokenReader,
  univerDocSurfaceColors,
  type UniverDocSurfaceColors,
} from "@/features/documents/univer-doc-surface-theme";

/** Univer's key for the object that paints the desk, the page and its border. */
export const DOC_BACKGROUND_COMPONENT_KEY = "__Document_Render_Background__";

interface FillColorSetter {
  (
    backgroundFillColor?: string,
    pageFillColor?: string,
    pageStrokeColor?: string,
    marginStrokeColor?: string,
  ): void;
  /**
   * Present on the wrapper this module installs. Holds the colours the host
   * currently wants, so a theme flip updates the wrapper instead of stacking a
   * second one on top of it.
   */
  [HOST_COLORS]?: UniverDocSurfaceColors;
}

interface FillColorTarget {
  setFillColors?: FillColorSetter;
  /** `DocBackground.draw(ctx, bounds)` — wrapped once to put the paper shadow under each page. */
  draw?: (ctx: ShadowContext, bounds?: unknown) => unknown;
  _drawPageBackgroundImage?: (...args: unknown[]) => unknown;
  makeDirty?: (dirty: boolean) => void;
  /** `DocBackground` reads the document it paints through its skeleton. */
  getSkeleton?: () => {
    getViewModel?: () => {
      getDataModel?: () => {
        getSnapshot?: () => { documentStyle?: { documentFlavor?: number; [key: string]: unknown } };
      };
    };
  } | null;
}

/** `DocumentFlavor.MODERN` in `@univerjs/core` — a pageless document. */
const DOCUMENT_FLAVOR_MODERN = 2;

/**
 * A PAGELESS (modern-flavour) document has no sheet: Univer paints the whole
 * workspace with the "background" fill and draws the text straight onto it.
 * So for that flavour the workspace IS the paper — give it the page colour,
 * or the black ink lands on the dark desk and the document is unreadable in
 * dark mode (2026-10-03, measured on a modern document in the clone).
 */
export function surfaceColorsForFlavor(
  colors: UniverDocSurfaceColors,
  documentFlavor: number | undefined,
): UniverDocSurfaceColors {
  return documentFlavor === DOCUMENT_FLAVOR_MODERN
    ? { ...colors, frame: colors.page }
    : colors;
}

function styleOf(background: FillColorTarget) {
  return background.getSkeleton?.()?.getViewModel?.()?.getDataModel?.()?.getSnapshot?.()?.documentStyle;
}

function flavorOf(background: FillColorTarget): number | undefined {
  return styleOf(background)?.documentFlavor;
}

/** A page colour the person chose in Page setup (a light hex), else undefined. */
function pageColorOf(background: FillColorTarget): string | undefined {
  const c = styleOf(background)?.[PAGE_COLOR_KEY];
  return typeof c === "string" && /^#[0-9a-f]{6}$/i.test(c) ? c : undefined;
}

/** The slice of Univer's rendering context the paper shadow touches. */
interface ShadowContext {
  translate: (x: number, y: number) => void;
  shadowColor: string;
  shadowBlur: number;
  shadowOffsetX: number;
  shadowOffsetY: number;
}

/**
 * Google Docs' paper shadow, in CSS pixels: a soft 1px drop with a hairline ring
 * (`0 1px 3px 1px rgba(60,64,67,.15), 0 1px 2px rgba(60,64,67,.3)` collapsed to one canvas shadow).
 * Canvas shadows ignore the context transform, so a device-pixel value stays the same at every zoom.
 */
const PAGE_SHADOW = {
  light: "rgba(60, 64, 67, 0.38)",
  dark: "rgba(0, 0, 0, 0.7)",
  blurCssPx: 5,
  offsetYCssPx: 1,
} as const;

/** A fully transparent stroke: the page's own outline, replaced by the shadow. */
export const PAGE_EDGE_NONE = "rgba(255, 255, 255, 0)";

const SHADOW_INSTALLED = Symbol.for("matrx.univerDocPageShadow");

/**
 * Put a soft shadow under every page of a paged document.
 *
 * `DocBackground.draw` paints the desk, then for each page does `ctx.save(); ctx.translate(page);
 * Rect.drawWith(page)` followed by `_drawPageBackgroundImage`. The wrapper arms the shadow on that
 * per-page `translate` (so the paper and its border cast it) and disarms it in
 * `_drawPageBackgroundImage` (so the margin guides do not). The pageless flavour never calls
 * `translate`, so it stays flat.
 */
function installPageShadow(background: FillColorTarget, mode: "light" | "dark"): void {
  const holder = background as FillColorTarget & { [SHADOW_INSTALLED]?: "light" | "dark" };
  const already = holder[SHADOW_INSTALLED] !== undefined;
  holder[SHADOW_INSTALLED] = mode;
  if (already) return;
  const draw = background.draw;
  if (typeof draw !== "function") return;
  const dpr = () => (typeof window === "undefined" ? 1 : window.devicePixelRatio || 1);
  background.draw = function (this: unknown, ctx: ShadowContext, bounds?: unknown) {
    const translate = ctx.translate;
    // The first `translate` of a draw belongs to the desk fill, never to a page; arming it would
    // shadow the desk rectangle's own edge.
    let deskDone = false;
    ctx.translate = function (this: ShadowContext, x: number, y: number) {
      translate.call(ctx, x, y);
      if (!deskDone) {
        deskDone = true;
        return;
      }
      ctx.shadowColor = PAGE_SHADOW[holder[SHADOW_INSTALLED] ?? "light"];
      ctx.shadowBlur = PAGE_SHADOW.blurCssPx * dpr();
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = PAGE_SHADOW.offsetYCssPx * dpr();
    };
    try {
      return draw.call(this, ctx, bounds);
    } finally {
      // Own property assigned above; removing it restores the prototype method.
      delete (ctx as Partial<ShadowContext>).translate;
    }
  };
  const image = background._drawPageBackgroundImage;
  if (typeof image === "function") {
    background._drawPageBackgroundImage = function (this: unknown, ...args: unknown[]) {
      const ctx = args[0] as ShadowContext | undefined;
      if (ctx) {
        ctx.shadowColor = "transparent";
        ctx.shadowBlur = 0;
        ctx.shadowOffsetY = 0;
      }
      return image.apply(this, args);
    };
  }
}

/** Marks (and carries the state of) the wrapper installed below. */
const HOST_COLORS = Symbol.for("matrx.univerDocSurfaceColors");

/** The narrow slice of Univer's `IRender` this needs. Structural on purpose. */
export interface UniverDocRenderLike {
  engine?: {
    getCanvas?: () => { getCanvasEle?: () => HTMLElement | null | undefined } | null;
  } | null;
  components?: { get(key: string): unknown } | null;
  mainComponent?: { makeDirty?: (dirty: boolean) => void } | null;
  scene?: { makeDirty?: (dirty: boolean) => void } | null;
}

/**
 * Paint one document render in `colors`, and make the statement STICK.
 *
 * ─── WHY A WRAPPER AND NOT JUST A CALL ──────────────────────────────────────
 * `DocRenderController._syncCanvasBackground()` (docs-ui 0.25.1) re-pins the
 * canvas element's CSS background to `#fafafa` and calls
 * `setFillColors(undefined, undefined, undefined, undefined)`, which resets all
 * four fills to Univer's own light constants. It runs on EVERY
 * `RichTextEditingMutation` — that is, on every keystroke — and again whenever
 * the skeleton is rebuilt. A host that states its colours once watches the page
 * turn white the moment the Expert starts typing.
 *
 * So the host's colours become the DEFAULTS: the setter is wrapped once, and
 * every slot Univer passes as `undefined` is filled from the host's palette
 * instead of from Univer's light constants. The wrapper re-asserts the canvas
 * element's background at the same time, because the same method resets it.
 * A theme flip updates the wrapper's palette rather than adding a second layer.
 *
 * Returns what it could not reach, never an empty success it did not earn —
 * the caller announces a miss rather than leaving a surface silently wearing
 * Univer's light defaults.
 */
export function applyUniverDocSurfaceColors(
  render: UniverDocRenderLike | null | undefined,
  colors: UniverDocSurfaceColors,
  mode: "light" | "dark" = "light",
): { applied: boolean; unreached: string[] } {
  if (!render) return { applied: false, unreached: ["render"] };
  const unreached: string[] = [];

  const background = render.components?.get(DOC_BACKGROUND_COMPONENT_KEY) as
    | FillColorTarget
    | undefined;
  // The flavour is read at every paint: a document can switch between paged
  // and pageless, and Univer re-runs `setFillColors` when it does.
  const forDocument = (palette: UniverDocSurfaceColors) => {
    if (!background) return palette;
    const chosen = pageColorOf(background);
    const flavored = surfaceColorsForFlavor(chosen ? { ...palette, page: chosen } : palette, flavorOf(background));
    // A paged sheet is edged by its shadow, like Google Docs — a stroke would cast the shadow INWARD.
    return flavored.frame === palette.frame ? { ...flavored, pageStroke: PAGE_EDGE_NONE } : flavored;
  };

  // The canvas ELEMENT's CSS background is what shows wherever the renderer
  // has not painted — the bright L-shaped margin in cold walk 18's screenshot.
  const canvasEle = render.engine?.getCanvas?.()?.getCanvasEle?.();
  const paintCanvasElement = () => {
    if (canvasEle && "style" in canvasEle) {
      canvasEle.style.backgroundColor = forDocument(colors).frame;
      return true;
    }
    return false;
  };
  if (!paintCanvasElement()) unreached.push("canvas element");

  const setter = background?.setFillColors;
  if (background && typeof setter === "function") {
    if (setter[HOST_COLORS]) {
      // Already wrapped — just move the palette it defaults to.
      setter[HOST_COLORS] = colors;
    } else {
      const original = setter.bind(background);
      const wrapped: FillColorSetter = (frame, page, stroke, margin) => {
        const host = forDocument(wrapped[HOST_COLORS] ?? colors);
        if (canvasEle && "style" in canvasEle) {
          canvasEle.style.backgroundColor = host.frame;
        }
        original(
          frame ?? host.frame,
          page ?? host.page,
          stroke ?? host.pageStroke,
          margin ?? host.marginStroke,
        );
      };
      wrapped[HOST_COLORS] = colors;
      background.setFillColors = wrapped;
    }
    installPageShadow(background, mode);
    const stated = forDocument(colors);
    background.setFillColors?.(
      stated.frame,
      stated.page,
      stated.pageStroke,
      stated.marginStroke,
    );
    // `setFillColors` only marks itself dirty when a value actually moved, and
    // the docs scene caches its layers — ask for the repaint explicitly so a
    // theme flip lands on a document nobody is typing into.
    background.makeDirty?.(true);
  } else {
    unreached.push(DOC_BACKGROUND_COMPONENT_KEY);
  }

  render.mainComponent?.makeDirty?.(true);
  render.scene?.makeDirty?.(true);

  return { applied: unreached.length === 0, unreached };
}

interface InjectorLike {
  get: <T>(token: unknown) => T | undefined;
}

type UniverLike = { __getInjector?: () => InjectorLike | undefined } | null;

/** The slice of `IRenderManagerService` this needs. Structural on purpose. */
export interface RenderManagerLike {
  /**
   * Univer 1.0's name (0.x called it `getRenderById`; after the 1.0 upgrade the
   * old optional call returned nothing, every document warned "could not
   * reach: render", and no host colour was ever applied — 2026-10-03).
   */
  getRenderUnitById?: (id: string) => UniverDocRenderLike | null | undefined;
  /** Emits every render the instance creates, for as long as it lives. */
  created$?: {
    subscribe: (next: (render: UniverDocRenderLike) => void) => {
      unsubscribe: () => void;
    };
  };
}

/**
 * Resolve the render manager out of a booted Univer instance.
 *
 * The injector is the same door `registerUniverFacadeDependencies` and the
 * collab session already use; `IRenderManagerService` is imported lazily so a
 * surface that never mounts a document never pays for it.
 */
async function resolveRenderManager(
  univer: UniverLike,
): Promise<RenderManagerLike | null> {
  const injector = univer?.__getInjector?.();
  if (!injector) return null;
  const { IRenderManagerService } = await import("@univerjs/engine-render");
  return injector.get<RenderManagerLike>(IRenderManagerService as unknown) ?? null;
}

/**
 * @param univerRef  Ref holding the Univer instance (set once it boots).
 * @param unitId     The document unit whose render should be painted.
 * @param ready      True once the instance has booted and created its document.
 */
export function useUniverDocSurfaceTheme(
  univerRef: React.RefObject<unknown>,
  unitId: string,
  ready: boolean,
): void {
  const mode = useThemeMode();

  useEffect(() => {
    if (!ready) return undefined;
    let cancelled = false;
    let subscription: { unsubscribe: () => void } | null = null;

    (async () => {
      const colors = univerDocSurfaceColors(mode, domTokenReader());
      const manager = await resolveRenderManager(univerRef.current as UniverLike);
      if (cancelled) return;

      const paint = (render: UniverDocRenderLike | null) => {
        const result = applyUniverDocSurfaceColors(render, colors, mode);
        if (!result.applied) {
          // NOTHING FAILS SILENTLY. A miss here means the document is wearing
          // Univer's hardcoded light page and desk inside whatever theme the
          // person actually chose — the cold walk 18 defect, back. It is
          // cosmetic, so it does not take the editor down, but it says so.
          console.warn(
            `[document] theme not applied to the page surface (could not reach: ${result.unreached.join(", ")}) — the page may keep Univer's light defaults in dark mode`,
          );
        }
      };

      paint(manager?.getRenderUnitById?.(unitId) ?? null);

      // A DOCUMENT RENDER IS NOT CREATED ONCE. Autosave's realtime echo, a
      // remote snapshot and the history viewer all re-run `createUniverDoc`,
      // and every new render arrives wearing Univer's hardcoded light fills
      // with `DocsRenderService` re-pinning the canvas element's CSS
      // background to `#fafafa`. Painting only the render that existed when
      // this effect ran is how a dark document turned white mid-sentence.
      // `created$` is the one place that hears about all of them.
      subscription =
        manager?.created$?.subscribe((render) => {
          // `DocsRenderService` sets its canvas background from the SAME
          // event; land after it rather than racing it.
          queueMicrotask(() => {
            if (!cancelled) paint(render);
          });
          requestAnimationFrame(() => {
            if (!cancelled) paint(render);
          });
        }) ?? null;
    })();

    return () => {
      cancelled = true;
      subscription?.unsubscribe();
    };
  }, [univerRef, unitId, ready, mode]);
}
