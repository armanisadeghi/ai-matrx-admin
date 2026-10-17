"use client";

import React, { useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import { Monitor } from "lucide-react";
import { cn } from "@/utils/cn";

/** A field a person types into in THIS document (the composer, a search box…). */
function isTypingField(el: Element | null): boolean {
  if (!el || !(el instanceof HTMLElement)) return false;
  if (el instanceof HTMLTextAreaElement) return true;
  if (el instanceof HTMLInputElement) return true;
  if (el.isContentEditable) return true;
  const editable = el.getAttribute("contenteditable");
  return (editable !== null && editable !== "false") || el.getAttribute("role") === "textbox";
}

/** How long after a person's own press or key a focus move counts as theirs. */
const PERSON_ACT_MS = 600;

/** A focus move into an open dialog or menu is that surface's own (a focus trap), never theft. */
const OWNS_FOCUS = "[aria-modal='true'], [role$='dialog'], [role='menu'], [role='listbox']";

/**
 * What the stream page says about its connection. THE STREAM PAGE CONTRACT
 * (2026-10-17): the page posts `{type:"matrx-stream", state}` to the origin
 * named by its `?parent=` query; the app draws its own status over the frame
 * until `connected` — the stream's own loading text is never shown.
 */
export type StreamState = "connecting" | "connected" | "reconnecting" | "disconnected";

/** Commands the app posts into the stream page. */
export type StreamCommand = "focus" | "keyboard-reset";

const STATES: readonly StreamState[] = ["connecting", "connected", "reconnecting", "disconnected"];

export function readStreamState(data: unknown): StreamState | null {
  if (!data || typeof data !== "object") return null;
  const msg = data as { type?: unknown; state?: unknown };
  if (msg.type !== "matrx-stream") return null;
  return STATES.includes(msg.state as StreamState) ? (msg.state as StreamState) : null;
}

/** The stream endpoint's origin: the only origin its messages may come from or go to. */
export function streamOrigin(src: string): string | null {
  try {
    return new URL(src).origin;
  } catch {
    return null;
  }
}

/** The frame's address: the endpoint plus `?parent=<this page's origin>`, so the page knows where to post. */
export function streamSrc(src: string, parentOrigin: string | null): string {
  if (!parentOrigin) return src;
  try {
    const url = new URL(src);
    url.searchParams.set("parent", parentOrigin);
    return url.toString();
  } catch {
    return src;
  }
}

/**
 * A stream page that never speaks (before the page that posts state ships)
 * is revealed this long after its `load` — its own loading screen stays hidden
 * behind ours for that time.
 */
export const SILENT_STREAM_REVEAL_MS = 8000;

const STATUS_WORDS: Record<Exclude<StreamState, "connected">, string> = {
  connecting: "Connecting…",
  reconnecting: "Reconnecting…",
  disconnected: "Disconnected",
};

/** What the Computer tab can ask of the live frame. */
export interface ScaledFrameHandle {
  /** Keys stopped reaching the machine while the mouse still works: focus the frame and reset its keyboard. */
  reconnectKeyboard: () => void;
}

/**
 * Draws a remote screen of a fixed size (the stream's viewport) scaled to fit
 * whatever box it is given, so a small thumbnail and the full view are the same
 * single live frame (the stream allows one viewer connection at a time).
 *
 * `interactive` turns input on WITHOUT remounting the frame: watching and
 * controlling are one connection. While interactive the frame owns the
 * keyboard — it is focused when control starts and on every press on it, and
 * a field elsewhere on the page that grabs focus by itself (an autofocusing
 * composer, 2026-10-17: typing into the machine did nothing) hands it straight
 * back. A focus move that follows the person's own press or key in the page is
 * theirs and is left alone. Keys typed into the frame never reach the page
 * (cross-origin document), so the app's shortcuts cannot fire while it has focus.
 */
export function ScaledFrame({
  src,
  width,
  height,
  title,
  interactive,
  onLoad,
  controlRef,
}: {
  src: string;
  width: number;
  height: number;
  title: string;
  interactive: boolean;
  onLoad?: () => void;
  controlRef?: React.Ref<ScaledFrameHandle>;
}) {
  const box = useRef<HTMLDivElement>(null);
  const frame = useRef<HTMLIFrameElement>(null);
  const [scale, setScale] = useState(0);
  const origin = useMemo(() => streamOrigin(src), [src]);
  const frameSrc = useMemo(
    () => streamSrc(src, typeof window === "undefined" ? null : window.location.origin),
    [src],
  );

  // OUR status over the frame until the stream says it is connected.
  const [state, setState] = useState<StreamState>("connecting");
  const heard = useRef(false);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    if (!origin) return;
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== origin) return;
      if (frame.current && event.source !== frame.current.contentWindow) return;
      const next = readStreamState(event.data);
      if (!next) return;
      heard.current = true;
      setState(next);
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [origin]);
  useEffect(() => {
    if (!loaded) return;
    const timer = window.setTimeout(() => {
      if (!heard.current) setState("connected");
    }, SILENT_STREAM_REVEAL_MS);
    return () => window.clearTimeout(timer);
  }, [loaded]);

  const post = useCallback(
    (cmd: StreamCommand) => {
      const win = frame.current?.contentWindow;
      if (!win || !origin) return;
      win.postMessage({ type: "matrx-stream-cmd", cmd }, origin);
    },
    [origin],
  );

  useImperativeHandle(
    controlRef,
    () => ({
      reconnectKeyboard: () => {
        frame.current?.focus({ preventScroll: true });
        post("keyboard-reset");
      },
    }),
    [post],
  );

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const measure = () => {
      const { clientWidth, clientHeight } = el;
      if (clientWidth > 0 && clientHeight > 0) {
        setScale(Math.min(clientWidth / width, clientHeight / height));
      }
    };
    measure();
    // Measure on the next frame, not inside the observer callback: a scale
    // set synchronously there re-lays out the panel mid-observation and the
    // browser reports "ResizeObserver loop completed with undelivered
    // notifications" (seen in the Error Inspector, 2026-10-16).
    let raf = 0;
    const observer = new ResizeObserver(() => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(measure);
    });
    observer.observe(el);
    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
    };
  }, [width, height]);

  // Control starts: the keyboard goes to the machine.
  useEffect(() => {
    if (!interactive) return;
    const iframe = frame.current;
    if (!iframe) return;
    iframe.focus({ preventScroll: true });

    let lastPersonAct = 0;
    const personActed = () => {
      lastPersonAct = Date.now();
    };
    const takeKeyboard = () => {
      iframe.focus({ preventScroll: true });
      post("focus");
    };
    const onFocusIn = (event: FocusEvent) => {
      const target = event.target as Element | null;
      if (!target || target === iframe) return;
      if (Date.now() - lastPersonAct < PERSON_ACT_MS) return;
      // A dialog or menu that opened takes focus as its own; anything else
      // (a self-focusing field, a toast, a button) taking it by itself while
      // the person drives is theft.
      if (!isTypingField(target) && target.closest(OWNS_FOCUS)) return;
      iframe.focus({ preventScroll: true });
    };
    // Back from another app or tab: the machine gets the keyboard again.
    const onWindowFocus = () => {
      if (Date.now() - lastPersonAct < PERSON_ACT_MS) return;
      takeKeyboard();
    };
    const onVisibility = () => {
      if (document.visibilityState === "visible") takeKeyboard();
    };
    // A press inside the stream moves focus into the frame (the page sees only
    // its own window blurring): tell the stream page to take the keyboard.
    const onWindowBlur = () => {
      window.setTimeout(() => {
        if (document.activeElement === iframe) post("focus");
      }, 0);
    };
    document.addEventListener("pointerdown", personActed, true);
    document.addEventListener("keydown", personActed, true);
    document.addEventListener("focusin", onFocusIn, true);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("focus", onWindowFocus);
    window.addEventListener("blur", onWindowBlur);
    return () => {
      document.removeEventListener("pointerdown", personActed, true);
      document.removeEventListener("keydown", personActed, true);
      document.removeEventListener("focusin", onFocusIn, true);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("focus", onWindowFocus);
      window.removeEventListener("blur", onWindowBlur);
    };
  }, [interactive, post]);

  const covered = state !== "connected";

  return (
    <div
      ref={box}
      className="relative h-full w-full overflow-hidden bg-muted"
      // A press on the letterbox around the picture still means "the machine".
      onPointerDown={
        interactive
          ? () => {
              frame.current?.focus({ preventScroll: true });
              post("focus");
            }
          : undefined
      }
    >
      <iframe
        ref={frame}
        src={frameSrc}
        title={title}
        aria-label={title}
        allow="autoplay; fullscreen; clipboard-read; clipboard-write; keyboard-map"
        referrerPolicy="no-referrer"
        tabIndex={interactive ? 0 : -1}
        onLoad={() => {
          // The page inside loaded after control began: focus it now.
          if (interactive) frame.current?.focus({ preventScroll: true });
          setLoaded(true);
          onLoad?.();
        }}
        className="absolute left-1/2 top-1/2 border-0"
        style={{
          width,
          height,
          transform: `translate(-50%, -50%) scale(${scale || 0.0001})`,
          transformOrigin: "center center",
          pointerEvents: interactive ? "auto" : "none",
          visibility: scale ? "visible" : "hidden",
        }}
      />
      {covered ? (
        // Over the frame, never beside it: the stream's own loading screen
        // stays hidden and nothing moves when the picture arrives.
        <div
          role="status"
          aria-live="polite"
          className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-muted text-muted-foreground"
        >
          <Monitor className="h-6 w-6" aria-hidden />
          <p
            className={cn(
              "text-xs font-medium",
              state !== "disconnected" && "animate-ssr-shimmer-opacity",
            )}
          >
            {STATUS_WORDS[state]}
          </p>
        </div>
      ) : null}
    </div>
  );
}
