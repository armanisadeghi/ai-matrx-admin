"use client";

/**
 * The template gallery (Google's "Template gallery"): lanes, category
 * sections, search. Picking a tile creates a new workbook / document from it in
 * the active organization and opens it (or hands it to `onCreated`).
 */
import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { EmptyState, RegionSkeleton, SearchField, Select, Tabs } from "@ai-matrx/design-system/controls";
import { LayoutTemplate } from "lucide-react";

import { toast } from "@/lib/toast";
import { ErrorAlchemyMenu } from "@/components/errors/ErrorAlchemyMenu";
import {
  TEMPLATE_CATEGORIES,
  TEMPLATE_LANE_LABELS,
  type TemplateKind,
  type TemplateLane,
  type TemplateSummary,
} from "../types";
import { createFromTemplate, listTemplates } from "../template-service";
import { TemplateThumb } from "./TemplateThumb";

type LaneTab = TemplateLane | "all";
const LANE_TABS: readonly { value: LaneTab; label: string }[] = [
  { value: "all", label: "All" },
  ...(["featured", "mine", "org", "community"] as const).map((l) => ({ value: l, label: TEMPLATE_LANE_LABELS[l] })),
];
const ALL_CATEGORIES = "all";

export function recordHref(kind: TemplateKind, id: string): string {
  return kind === "workbook" ? `/workbooks/${id}` : `/documents/${id}`;
}

/** Create from a template and open it — the one door every tile uses. */
export function useCreateFromTemplate(onCreated?: (r: { kind: TemplateKind; id: string }) => void) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const create = async (template: TemplateSummary) => {
    if (busyId) return;
    setBusyId(template.id);
    try {
      const created = await createFromTemplate(template.id);
      if (onCreated) onCreated(created);
      else router.push(recordHref(created.kind, created.id));
    } catch (err) {
      toast.error(`Could not use "${template.name}"`, {
        description: err instanceof Error ? err.message : String(err),
      });
      setBusyId(null);
    }
  };
  return { create, busyId };
}

export function TemplateGallery({
  kind,
  initialCategory,
  onCreated,
}: {
  kind: TemplateKind;
  initialCategory?: string;
  onCreated?: (r: { kind: TemplateKind; id: string }) => void;
}): ReactNode {
  const [lane, setLane] = useState<LaneTab>("all");
  const [category, setCategory] = useState<string>(initialCategory ?? ALL_CATEGORIES);
  const [query, setQuery] = useState("");
  const [rows, setRows] = useState<TemplateSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { create, busyId } = useCreateFromTemplate(onCreated);

  useEffect(() => {
    let cancelled = false;
    setRows(null);
    setError(null);
    listTemplates(kind, lane === "all" ? {} : { lane })
      .then((r) => !cancelled && setRows(r))
      .catch((e) => !cancelled && setError(e instanceof Error ? e.message : String(e)));
    return () => {
      cancelled = true;
    };
  }, [kind, lane]);

  const q = query.trim().toLowerCase();
  const visible = (rows ?? []).filter(
    (t) =>
      (category === ALL_CATEGORIES || t.category === category) &&
      (!q || `${t.name} ${t.category} ${t.description ?? ""}`.toLowerCase().includes(q)),
  );
  const sections = [
    ...TEMPLATE_CATEGORIES,
    ...new Set(visible.map((t) => t.category).filter((c) => !(TEMPLATE_CATEGORIES as readonly string[]).includes(c))),
  ]
    .map((c) => ({ category: c, items: visible.filter((t) => t.category === c) }))
    .filter((s) => s.items.length > 0);

  return (
    <div className="flex min-w-0 flex-col gap-4" data-template-gallery={kind}>
      <div className="flex flex-wrap items-center gap-2">
        <Tabs variant="capsule" value={lane} onValueChange={setLane} data={LANE_TABS} aria-label="Template lanes" />
        <div className="ml-auto flex items-center gap-2">
          <Select
            value={category}
            onValueChange={setCategory}
            options={[{ value: ALL_CATEGORIES, label: "All categories" }, ...TEMPLATE_CATEGORIES.map((c) => ({ value: c, label: c }))]}
            aria-label="Category"
          />
          <SearchField
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search templates"
            width="md"
            aria-label="Search templates"
          />
        </div>
      </div>
      {error ? (
        <div className="flex items-center gap-2 text-sm text-destructive">
          <span>Templates did not load: {error}</span>
          <ErrorAlchemyMenu error={error} />
        </div>
      ) : rows === null ? (
        <RegionSkeleton shape="cards" count={6} aria-label="Loading templates" />
      ) : sections.length === 0 ? (
        <EmptyState
          icon={<LayoutTemplate />}
          title={q || category !== ALL_CATEGORIES ? "No matching templates" : "No templates here yet"}
          line={lane === "mine" ? "File › Save as template adds one." : undefined}
        />
      ) : (
        sections.map((s) => (
          <section key={s.category} className="flex flex-col gap-2">
            <h3 className="text-sm font-medium text-foreground">{s.category}</h3>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(9rem,1fr))] gap-x-4 gap-y-5">
              {s.items.map((t) => (
                <TemplateThumb
                  key={t.id}
                  template={t}
                  busy={busyId === t.id}
                  onSelect={(tpl) => void create(tpl)}
                  className="w-full"
                />
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}
