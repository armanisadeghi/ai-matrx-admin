"use client";

// features/launchpad/widgets/KindInstancePicker.tsx — choose a saved shape for the Shape widget: first the shape
// (the kind catalog's own read, `listAllKinds`), then one of its saved instances (the studio's own list,
// `listKindInstances`). No second list service.
import { useEffect, useState } from "react";
import { Select } from "@ai-matrx/design-system/controls";
import { ErrorAlchemyMenu } from "@/components/errors/ErrorAlchemyMenu";
import { listAllKinds, type KindCatalogEntry } from "@/features/content-ir/registry/kind-catalog";
import { listKindInstances, type KindInstanceListEntry } from "@/features/content-ir/studio/instance-service";

export interface KindInstanceChoice {
  kind: string;
  kindDefinitionId: string;
  instanceId: string;
  title: string;
}

/** Shapes a person saves instances of: a database row, not switched off, never a machine contract (`*_io`). */
export function shapeChoices(entries: readonly Pick<KindCatalogEntry, "kind" | "label" | "dbRowId" | "isActive" | "family">[]): { value: string; label: string; kind: string }[] {
  return entries
    .filter((e) => e.dbRowId && e.isActive !== false && !(e.family ?? "").endsWith("_io"))
    .map((e) => ({ value: e.dbRowId!, label: e.label || e.kind, kind: e.kind }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

const errorText = (e: unknown) => (e instanceof Error ? e.message : String(e));

export function KindInstancePicker({ kindDefinitionId, value, onChange }: { kindDefinitionId: string; value: string; onChange: (choice: KindInstanceChoice) => void }) {
  const [shapes, setShapes] = useState<{ list: ReturnType<typeof shapeChoices> | null; error: string | null }>({ list: null, error: null });
  const [shapeId, setShapeId] = useState(kindDefinitionId);
  const [instances, setInstances] = useState<{ shapeId: string; list: KindInstanceListEntry[] | null; error: string | null } | null>(null);
  useEffect(() => {
    let live = true;
    listAllKinds().then(
      (all) => live && setShapes({ list: shapeChoices(all), error: null }),
      (e: unknown) => live && setShapes({ list: [], error: errorText(e) }),
    );
    return () => {
      live = false;
    };
  }, []);
  useEffect(() => {
    if (!shapeId) return;
    let live = true;
    listKindInstances(shapeId, "active").then(
      (list) => live && setInstances({ shapeId, list, error: null }),
      (e: unknown) => live && setInstances({ shapeId, list: [], error: errorText(e) }),
    );
    return () => {
      live = false;
    };
  }, [shapeId]);
  const failure = shapes.error ?? (instances?.shapeId === shapeId ? instances.error : null);
  if (failure) return <p className="text-xs text-destructive">{failure}<ErrorAlchemyMenu error={failure} /></p>;
  const shape = shapes.list?.find((s) => s.value === shapeId);
  const list = instances?.shapeId === shapeId ? instances.list : null;
  return (
    <span className="flex flex-col gap-2">
      <Select
        aria-label="Shape"
        value={shapeId}
        disabled={!shapes.list}
        options={shapes.list ?? [{ value: shapeId, label: "Loading shapes" }]}
        onValueChange={setShapeId}
      />
      {shapeId ? (
        list && list.length === 0 ? (
          <span className="text-xs text-muted-foreground">No saved {shape?.label ?? "shapes"} yet</span>
        ) : (
          <Select
            aria-label="Saved shape"
            value={list?.some((i) => i.id === value) ? value : ""}
            disabled={!list || !shape}
            options={list ? list.map((i) => ({ value: i.id, label: i.title || "Untitled" })) : [{ value: "", label: "Loading saved shapes" }]}
            onValueChange={(id) =>
              shape && onChange({ kind: shape.kind, kindDefinitionId: shapeId, instanceId: id, title: list?.find((i) => i.id === id)?.title || shape.label })
            }
          />
        )
      ) : null}
    </span>
  );
}
