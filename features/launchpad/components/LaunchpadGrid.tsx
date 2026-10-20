"use client";

// features/launchpad/components/LaunchpadGrid.tsx — a LaunchpadDoc drawn on THE GridCanvas (@ai-matrx/design-system):
// 12 columns on a desktop, 4 on a phone (reflowed when no phone placement was saved). Each widget sits in its
// frame (../widgets/frame.tsx) and fills its grid box. An unknown widget type renders a named "unavailable"
// box and is never dropped. In Edit mode the header is the drag handle, the corner resizes, arrows nudge.
import { useSyncExternalStore } from "react";
import { Cable, CircleSlash, Settings2, X } from "lucide-react";
import { Button } from "@ai-matrx/design-system/controls";
import { GridCanvas, type GridCanvasPlacements } from "@ai-matrx/design-system";
import { useIsMobile } from "@ai-matrx/kit/media-query";
import type { LaunchpadDoc, LaunchpadWidget } from "@/features/shell/shell-layout/contract";
import { getLaunchpadWidgetType } from "../widgets/registry";
import { describeLaunchpadWidget } from "../widgets/catalog";
import { WidgetFrame, WidgetList, WidgetNotice, widgetCapacity } from "../widgets/frame";
import { WidgetBusScope } from "../bus/react";

const noSubscription = () => () => {};
/** False in the server HTML and while hydrating, true after: widget bodies (their own reads, clocks and
 *  screen-size checks) draw only in the browser; the server draws each box with its loading rows. */
const useHydrated = () => useSyncExternalStore(noSubscription, () => true, () => false);

export interface LaunchpadGridEditing {
  selectedId: string | null;
  onPlace: (placements: GridCanvasPlacements[]) => void;
  onRemove: (id: string) => void;
  onConfigure: (id: string) => void;
}

export function LaunchpadGrid({
  doc,
  editing,
  previewing,
}: {
  doc: LaunchpadDoc;
  editing?: LaunchpadGridEditing | null;
  previewing?: boolean;
}) {
  const touch = useIsMobile();
  const items = doc.widgets.map((w) => {
    const sizes = getLaunchpadWidgetType(w.type)?.sizes;
    return {
      id: w.id,
      lg: w.layout.lg,
      sm: w.layout.sm,
      ...(sizes ? { minW: sizes.minW, minH: sizes.minH, maxW: sizes.maxW, maxH: sizes.maxH } : {}),
    };
  });
  const byId = new Map(doc.widgets.map((w) => [w.id, w]));
  return (
    // matrx-touch-targets: 44px tap floor for every control in the grid on a phone.
    <GridCanvas
      className="matrx-touch-targets -mx-1.5"
      aria-label="Launchpad"
      items={items}
      editable={Boolean(editing)}
      onChange={editing ? (next) => editing.onPlace(next) : undefined}
      itemLabel={(id) => {
        const w = byId.get(id);
        return w ? describeLaunchpadWidget(w) : id;
      }}
      renderItem={(id, state) => {
        const widget = byId.get(id);
        if (!widget) return null;
        const h = state.breakpoint === "sm" ? (widget.layout.sm?.h ?? widget.layout.lg.h) : widget.layout.lg.h;
        return (
          <WidgetBusScope widgetId={widget.id}>
            <LaunchpadSlot
              widget={widget}
              capacity={widgetCapacity(h, touch)}
              editing={editing ?? null}
              previewing={previewing ?? false}
              connection={editing ? connectionLine(doc, widget.id) : null}
            />
          </WidgetBusScope>
        );
      }}
    />
  );
}

/** "Filter from Table · Shown to Today" — this widget's page-bus connections in one line, or null. */
export function connectionLine(doc: LaunchpadDoc, widgetId: string): string | null {
  const name = (id: string) => {
    const w = doc.widgets.find((x) => x.id === id);
    return w ? describeLaunchpadWidget(w) : "a removed widget";
  };
  const portLabel = (id: string, key: string, side: "publishes" | "accepts") => {
    const w = doc.widgets.find((x) => x.id === id);
    return (w ? getLaunchpadWidgetType(w.type)?.[side]?.find((p) => p.key === key)?.label : undefined) ?? key;
  };
  const parts = (doc.bindings ?? []).flatMap((b) => [
    ...(b.to.widgetId === widgetId ? [`${portLabel(widgetId, b.to.key, "accepts")} from ${name(b.from.widgetId)}`] : []),
    ...(b.from.widgetId === widgetId ? [`${portLabel(widgetId, b.from.key, "publishes")} to ${name(b.to.widgetId)}`] : []),
  ]);
  return parts.length ? parts.join(" · ") : null;
}

function LaunchpadSlot({
  widget,
  capacity,
  editing,
  previewing,
  connection,
}: {
  widget: LaunchpadWidget;
  capacity: number;
  editing: LaunchpadGridEditing | null;
  previewing: boolean;
  /** This widget's connections in Edit mode (a quiet mark in the header; the line is its tooltip). */
  connection: string | null;
}) {
  const type = getLaunchpadWidgetType(widget.type);
  const hydrated = useHydrated();
  const controls = editing ? (
    <>
      {connection ? (
        <span
          className="flex h-7 w-7 shrink-0 items-center justify-center text-muted-foreground"
          title={connection}
          aria-label={connection}
          data-launchpad-connected
        >
          <Cable className="h-3.5 w-3.5" aria-hidden />
        </span>
      ) : null}
      <Button
        variant="quiet"
        icon={<Settings2 />}
        aria-label="Set up"
        pressed={editing.selectedId === widget.id}
        onClick={() => editing.onConfigure(widget.id)}
      />
      <Button variant="quiet" removes icon={<X />} aria-label="Remove" onClick={() => editing.onRemove(widget.id)} />
    </>
  ) : null;
  if (!type) {
    return (
      <WidgetFrame type={widget.type} icon={CircleSlash} title="Unavailable" controls={controls} editing={Boolean(editing)}>
        <WidgetNotice>{`"${widget.type}" is not available in this version`}</WidgetNotice>
      </WidgetFrame>
    );
  }
  const Body = type.Body;
  return (
    <WidgetFrame
      type={widget.type}
      icon={type.icon}
      title={type.describe(widget.config)}
      href={type.href?.(widget.config)}
      controls={controls}
      editing={Boolean(editing)}
      previewing={previewing}
    >
      {hydrated ? (
        <Body config={widget.config} editing={Boolean(editing)} capacity={capacity} />
      ) : (
        <WidgetList capacity={capacity} loading rows={[]} empty={null} />
      )}
    </WidgetFrame>
  );
}
