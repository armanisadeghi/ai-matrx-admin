"use client";

// features/launchpad/bus/react.tsx — THE PAGE BUS IN REACT. One `PageBusProvider` per launchpad page (it owns
// one `createPageBus` store for the page's life), one `WidgetBusScope` per widget slot. A widget body reads
// its connected inputs with `usePageInput(key, kind)` and offers values with `usePageOutput(key)`.
//
// Render rule: every hook subscribes to ONE address (`useSyncExternalStore`), so a publish re-renders only
// the widgets wired to it — never the grid, never an unconnected widget. Nothing here creates a fresh
// array or object as a snapshot (the "Maximum update depth" class).
import { createContext, useContext, useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import type { LaunchpadBinding, LaunchpadDoc } from "@/features/shell/shell-layout/contract";
import { getLaunchpadWidgetSpec } from "../widgets/catalog";
import { bindingInto, coercePageValue, type PageValueKind, type PageValueOf } from "./ports";
import { createPageBus, type PageBus } from "./store";

interface BusContextValue {
  bus: PageBus;
  doc: LaunchpadDoc;
}

const BusContext = createContext<BusContextValue | null>(null);
const WidgetIdContext = createContext<string | null>(null);

const noSubscription = () => () => {};
const nothing = () => undefined;

/** The page bus for one launchpad page. `busKey` (the launchpad key) keeps this tab's values across a reload. */
export function PageBusProvider({ busKey, doc, children }: { busKey: string; doc: LaunchpadDoc; children: ReactNode }) {
  const [bus] = useState(() => createPageBus(busKey));
  return <BusContext.Provider value={{ bus, doc }}>{children}</BusContext.Provider>;
}

/** Marks which widget the hooks below belong to. */
export function WidgetBusScope({ widgetId, children }: { widgetId: string; children: ReactNode }) {
  return <WidgetIdContext.Provider value={widgetId}>{children}</WidgetIdContext.Provider>;
}

/** The kind a widget publishes under `key` (from its type's catalog entry), or null. */
function publishedKind(doc: LaunchpadDoc, widgetId: string, key: string): PageValueKind | null {
  const widget = doc.widgets.find((w) => w.id === widgetId);
  const port = widget ? getLaunchpadWidgetSpec(widget.type)?.publishes?.find((p) => p.key === key) : undefined;
  return port?.kind ?? null;
}

/** The raw value feeding this widget's input `key` (subscribed to that one address), and its kind. */
function useFeed(key: string): { raw: unknown; from: PageValueKind | null; binding: LaunchpadBinding | null } {
  const ctx = useContext(BusContext);
  const widgetId = useContext(WidgetIdContext);
  const binding = ctx && widgetId ? bindingInto(ctx.doc, widgetId, key) : null;
  const sourceId = binding?.from.widgetId ?? null;
  const sourceKey = binding?.from.key ?? null;
  const bus = ctx?.bus ?? null;
  const subscribe = (listener: () => void) =>
    bus && sourceId && sourceKey ? bus.subscribe(sourceId, sourceKey, listener) : noSubscription();
  const snapshot = () => (bus && sourceId && sourceKey ? bus.read(sourceId, sourceKey) : undefined);
  const raw = useSyncExternalStore(subscribe, snapshot, nothing);
  const from = ctx && binding ? publishedKind(ctx.doc, binding.from.widgetId, binding.from.key) : null;
  return { raw, from, binding };
}

/**
 * This widget's input `key` as a value of `kind`: what the connected widget published, shaped for this
 * input (`coercePageValue`), or `undefined` when nothing is connected or nothing is chosen there.
 */
export function usePageInput<K extends PageValueKind>(key: string, kind: K): PageValueOf[K] | undefined {
  const { raw, from } = useFeed(key);
  return from ? coercePageValue(raw, from, kind) : undefined;
}

/** True when this widget's input `key` has a connection (whether or not a value has arrived). */
export function usePageInputConnected(key: string): boolean {
  const ctx = useContext(BusContext);
  const widgetId = useContext(WidgetIdContext);
  return Boolean(ctx && widgetId && bindingInto(ctx.doc, widgetId, key));
}

export interface PageOutput<T> {
  /** What this widget last offered under `key` (this tab's session). */
  value: T | undefined;
  /** Offer a value (`null` clears it). */
  publish: (value: T | null) => void;
  /** Some other widget on the page gets this value. Unconnected widgets keep their normal behavior. */
  connected: boolean;
}

/** This widget's published value `key`. */
export function usePageOutput<T>(key: string): PageOutput<T> {
  const ctx = useContext(BusContext);
  const widgetId = useContext(WidgetIdContext);
  const bus = ctx?.bus ?? null;
  const subscribe = (listener: () => void) => (bus && widgetId ? bus.subscribe(widgetId, key, listener) : noSubscription());
  const snapshot = () => (bus && widgetId ? bus.read(widgetId, key) : undefined);
  const value = useSyncExternalStore(subscribe, snapshot, nothing) as T | undefined;
  const connected = Boolean(ctx?.doc.bindings?.some((b) => b.from.widgetId === widgetId && b.from.key === key));
  return {
    value,
    connected,
    publish: (next) => {
      if (bus && widgetId) bus.publish(widgetId, key, next);
    },
  };
}

/** The values an Applet on the page reads and sets (`@ai-matrx/applets` `AppletPageValues`). */
export interface AppletPageValuesPort {
  read(name: string): unknown;
  subscribe(listener: (name: string) => void): () => void;
  publish(name: string, value: unknown): void;
}

/**
 * THE APPLET BRIDGE: this widget's inputs become the Applet's surface values by input key (the Applet reads
 * `useValue("in_record")`), and a value the Applet sets under one of this widget's published keys
 * (`useValue("out_record")[1](…)`) is published to the page. The returned object is stable for the
 * widget's life (the Applet host is built once); it always reads the page's current connections.
 */
export function useAppletPageValues(): AppletPageValuesPort | null {
  const ctx = useContext(BusContext);
  const widgetId = useContext(WidgetIdContext);
  const latest = useRef<BusContextValue | null>(ctx);
  useEffect(() => {
    latest.current = ctx;
  });
  const [listeners] = useState(() => new Set<(name: string) => void>());
  const [port] = useState<AppletPageValuesPort | null>(() =>
    ctx && widgetId
      ? {
          read(name) {
            const c = latest.current;
            const accept = c ? acceptsOf(c.doc, widgetId).find((p) => p.key === name) : undefined;
            if (!c || !accept) return undefined;
            const binding = bindingInto(c.doc, widgetId, name);
            if (!binding) return undefined;
            const from = publishedKind(c.doc, binding.from.widgetId, binding.from.key);
            return from ? coercePageValue(c.bus.read(binding.from.widgetId, binding.from.key), from, accept.kind) : undefined;
          },
          subscribe(listener) {
            listeners.add(listener);
            return () => listeners.delete(listener);
          },
          publish(name, value) {
            const c = latest.current;
            const widget = c?.doc.widgets.find((w) => w.id === widgetId);
            const out = widget ? getLaunchpadWidgetSpec(widget.type)?.publishes?.some((p) => p.key === name) : false;
            if (c && out) c.bus.publish(widgetId, name, value ?? null);
          },
        }
      : null,
  );
  // Hear every source this widget's inputs are connected to; a change (or a re-wiring) re-announces the input.
  const bindings = ctx && widgetId ? acceptsOf(ctx.doc, widgetId).map((p) => ({ key: p.key, from: bindingInto(ctx.doc, widgetId, p.key)?.from ?? null })) : [];
  const wiring = JSON.stringify(bindings);
  const bus = ctx?.bus ?? null;
  useEffect(() => {
    if (!bus) return;
    const wired = JSON.parse(wiring) as { key: string; from: { widgetId: string; key: string } | null }[];
    for (const w of wired) for (const l of [...listeners]) l(w.key);
    const stops = wired.flatMap((w) =>
      w.from ? [bus.subscribe(w.from.widgetId, w.from.key, () => listeners.forEach((l) => l(w.key)))] : [],
    );
    return () => stops.forEach((s) => s());
  }, [bus, wiring, listeners]);
  return port;
}

function acceptsOf(doc: LaunchpadDoc, widgetId: string) {
  const widget = doc.widgets.find((w) => w.id === widgetId);
  return (widget ? getLaunchpadWidgetSpec(widget.type)?.accepts : undefined) ?? [];
}
