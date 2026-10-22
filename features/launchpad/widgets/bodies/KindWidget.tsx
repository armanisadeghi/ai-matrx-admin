"use client";

// features/launchpad/widgets/bodies/KindWidget.tsx — ANY registered kind (a Shape) as a widget (custom-experience
// §5.6: kinds become widgets). The value draws through the ONE kind pipeline — `KindInstanceRender` (the
// content-ir binding over `@ai-matrx/content-ir/react`), the same path every stored instance renders through —
// never a second renderer. Two sources:
//   • the page: a connected "Shape" input (an Applet's value carrying `__kind`) wins while it is wired;
//   • a saved shape: a kind instance chosen in Set up, read through the studio's own list read
//     (`listKindInstances`, both stores), never a new data path.
// The renderer loads through ONE next/dynamic edge, so a launchpad without a Shape widget never fetches it.
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { RegionSkeleton } from "@ai-matrx/design-system/controls";
import { ErrorAlchemyMenu } from "@/components/errors/ErrorAlchemyMenu";
import { instanceDataAsRecord, listKindInstances } from "@/features/content-ir/studio/instance-service";
import { usePageInput, usePageInputConnected } from "../../bus/react";
import { asShapeValue } from "../../bus/ports";
import { WidgetNotice } from "../frame";
import { configText, type LaunchpadWidgetBodyProps } from "../types";

const KindInstanceRender = dynamic(() => import("@/features/content-ir/studio/components/KindInstanceRender"), {
  ssr: false,
  loading: () => <RegionSkeleton shape="rows" count={3} aria-label="Loading the shape" />,
});

type Saved = { key: string; value: Record<string, unknown> | null; error: string | null };

/** The saved instance's value, read through the studio's list of that kind's instances. */
function useSavedShape(kindDefinitionId: string, instanceId: string): Saved | null {
  const key = `${kindDefinitionId}:${instanceId}`;
  const [saved, setSaved] = useState<Saved | null>(null);
  useEffect(() => {
    if (!kindDefinitionId || !instanceId) return;
    let live = true;
    listKindInstances(kindDefinitionId, "active").then(
      (entries) => {
        if (!live) return;
        const hit = entries.find((e) => e.id === instanceId);
        setSaved({ key, value: hit ? instanceDataAsRecord(hit.data) : null, error: null });
      },
      (e: unknown) => live && setSaved({ key, value: null, error: e instanceof Error ? e.message : String(e) }),
    );
    return () => {
      live = false;
    };
  }, [kindDefinitionId, instanceId, key]);
  return saved?.key === key ? saved : null;
}

export function KindWidget({ config, editing }: LaunchpadWidgetBodyProps) {
  const connected = usePageInputConnected("value");
  const fed = usePageInput("value", "shape");
  const kindDefinitionId = configText(config, "kindDefinitionId");
  const instanceId = configText(config, "instanceId");
  const saved = useSavedShape(connected ? "" : kindDefinitionId, connected ? "" : instanceId);

  if (connected) {
    if (!fed) return <WidgetNotice>Waiting for a shape from the connected widget</WidgetNotice>;
    return <ShapeBody kind={fed.__kind} value={fed} />;
  }
  if (!instanceId) return <WidgetNotice>{editing ? "Set up to choose a saved shape" : "No shape chosen"}</WidgetNotice>;
  if (!saved) return <RegionSkeleton shape="rows" count={3} aria-label="Loading the shape" />;
  if (saved.error)
    return (
      <WidgetNotice tone="error">
        {saved.error}
        <ErrorAlchemyMenu error={saved.error} />
      </WidgetNotice>
    );
  if (!saved.value) return <WidgetNotice>This saved shape is gone or not shared with you</WidgetNotice>;
  // The stored value carries its `__kind`; the chosen kind answers for a value saved before the marker law.
  const kind = asShapeValue(saved.value)?.__kind ?? configText(config, "kind");
  return <ShapeBody kind={kind} value={saved.value} />;
}

function ShapeBody({ kind, value }: { kind: string; value: unknown }) {
  return (
    <div className="h-full overflow-y-auto px-2 pb-1">
      <KindInstanceRender kind={kind} value={value} variant="bare" />
    </div>
  );
}
