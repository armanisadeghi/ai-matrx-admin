"use client";

// PLAYGROUND: THE FLOW VIEW (owner, 2026-10-21: "the flow of the routes so I can see what is
// going on … the big picture and how everything is going to relate to each other"). Built from
// features/shell/frame/flows/*.json with design-system pieces only:
//   FlowView   — one product: its numbers, a Map of its sidebar sections and their pages, its
//                Journeys (click a step to find the page on the Map), and its Problems.
//   BigPicture — every family → product → section, with page counts, on one screen.
import { Fragment, useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";
import { Badge, Button, Tabs, KpiTile } from "@ai-matrx/design-system/controls";
import type { BadgeTone } from "@ai-matrx/design-system/controls";
import { cn } from "@ai-matrx/design-system/cn";
import { ProductMark } from "@/features/shell/frame/ProductMark";
import { FLOWS, FLOWS_OUTSIDE_THE_GRID, flowCounts, flowForTile } from "@/features/shell/frame/flows";
import type { FlowPage, FlowProduct, FlowRole } from "@/features/shell/frame/flows";
import type { FrameProduct, ProductFamily } from "@/features/shell/frame/types";

type FlowTab = "map" | "journeys" | "problems";

const ROLE_LABEL: Record<FlowRole, string> = {
  list: "List",
  record: "Record",
  create: "Create",
  tool: "Tool",
  settings: "Settings",
  report: "Report",
  redirect: "Redirect",
  legacy: "Legacy",
  placeholder: "Placeholder",
};
const ROLE_TONE: Record<FlowRole, BadgeTone> = {
  list: "neutral",
  record: "neutral",
  create: "primary",
  tool: "info",
  settings: "neutral",
  report: "info",
  redirect: "neutral",
  legacy: "warning",
  placeholder: "warning",
};

export const sectionAnchor = (index: number) => `flow-section-${index}`;

export function FlowView({
  flow,
  focusSection,
}: {
  flow: FlowProduct;
  /** The sidebar row the person picked: its section is scrolled to and outlined on the Map. */
  focusSection: number | null;
}) {
  const [tab, setTab] = useState<FlowTab>("map");
  const [highlight, setHighlight] = useState<string | null>(null);
  const counts = flowCounts(flow);
  const buriedDepth = new Map((flow.buried ?? []).map((b) => [b.route, b.depth]));
  const titleOf = (route: string) =>
    flow.sections.flatMap((s) => s.pages).find((p) => p.route === route)?.title ?? route;

  // A picked sidebar row or journey step: show the Map and bring that place into view.
  useEffect(() => {
    if (focusSection === null) return;
    const frame = window.requestAnimationFrame(() => {
      setTab("map");
      document.getElementById(sectionAnchor(focusSection))?.scrollIntoView({ block: "start", behavior: "smooth" });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [focusSection]);
  useEffect(() => {
    if (!highlight || tab !== "map") return;
    const frame = window.requestAnimationFrame(() => {
      document.querySelector(`[data-flow-route="${CSS.escape(highlight)}"]`)?.scrollIntoView({ block: "center", behavior: "smooth" });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [highlight, tab]);

  return (
    <div className="mx-auto w-full max-w-[1400px] space-y-4 px-6 py-6" data-testid="flow-view">
      <p className="type-body max-w-3xl text-muted-foreground">{flow.summary}</p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
        <KpiTile label="Pages" value={counts.pages} title="Real pages in this product's sections" />
        <KpiTile label="Unreachable" value={counts.stranded} tone={counts.stranded ? "warn" : "neutral"} title="No menu or link reaches these pages" />
        <KpiTile label="Buried" value={counts.buried} tone={counts.buried ? "warn" : "neutral"} title="Important pages too many clicks deep" />
        <KpiTile label="Legacy" value={counts.legacy} title="Redirects, old copies and bake-offs" />
        <KpiTile label="Not in the tree" value={counts.missing} tone={counts.missing ? "warn" : "neutral"} title="Real areas the product tree does not name yet" />
        <KpiTile label="Duplicates" value={counts.duplicates} tone={counts.duplicates ? "warn" : "neutral"} title="The same job offered in more than one place" />
      </div>

      <Tabs<FlowTab>
        variant="underline"
        aria-label="Flow view"
        value={tab}
        onValueChange={setTab}
        data={[
          { value: "map", label: "Map" },
          { value: "journeys", label: `Journeys (${flow.journeys?.length ?? 0})` },
          { value: "problems", label: "Problems" },
        ]}
      />

      {tab === "map" ? (
        flow.sections.length === 0 ? (
          <p className="type-secondary text-muted-foreground">No pages yet</p>
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] items-start gap-3">
            {flow.sections.map((section, i) => (
              <section
                key={`${section.name}-${i}`}
                id={sectionAnchor(i)}
                aria-label={section.name}
                className={cn(
                  "scroll-mt-4 rounded-lg border border-border p-3",
                  focusSection === i && "ring-2 ring-ring",
                )}
              >
                <div className="flex items-baseline gap-2">
                  <h3 className="type-title min-w-0 flex-1 truncate" title={section.route}>
                    {section.name}
                  </h3>
                  <span className="type-meta text-muted-foreground">{section.pages.length}</span>
                </div>
                {section.why ? (
                  <p className="type-secondary truncate text-muted-foreground" title={section.why}>
                    {section.why}
                  </p>
                ) : null}
                <ul className="mt-2 space-y-0.5">
                  {section.pages.map((page) => (
                    <PageRow
                      key={page.route}
                      page={page}
                      depth={buriedDepth.get(page.route)}
                      highlighted={highlight === page.route}
                    />
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )
      ) : null}

      {tab === "journeys" ? (
        <div className="space-y-3">
          {(flow.journeys ?? []).length === 0 ? (
            <p className="type-secondary text-muted-foreground">No journeys written yet</p>
          ) : null}
          {(flow.journeys ?? []).map((journey) => (
            <div key={journey.name} className="rounded-lg border border-border p-3">
              <h3 className="type-title">{journey.name}</h3>
              <ol className="mt-2 flex flex-wrap items-center gap-1">
                {journey.steps.map((step, i) => (
                  <Fragment key={`${step}-${i}`}>
                    {i > 0 ? <ArrowRight className="size-3.5 text-muted-foreground" aria-hidden /> : null}
                    <li>
                      <Button
                        variant="outline"
                        title={step}
                        onClick={() => {
                          setHighlight(step);
                          setTab("map");
                        }}
                      >
                        {titleOf(step)}
                      </Button>
                    </li>
                  </Fragment>
                ))}
              </ol>
            </div>
          ))}
        </div>
      ) : null}

      {tab === "problems" ? <Problems flow={flow} /> : null}
    </div>
  );
}

function PageRow({ page, depth, highlighted }: { page: FlowPage; depth?: number; highlighted: boolean }) {
  return (
    <li
      data-flow-route={page.route}
      title={page.route}
      className={cn("flex items-center gap-2 rounded-md px-1.5 py-1", highlighted && "bg-accent ring-1 ring-ring")}
    >
      <span className="type-body min-w-0 flex-1 truncate">{page.title}</span>
      {depth ? <Badge tone="warning">{depth} deep</Badge> : null}
      <Badge tone={ROLE_TONE[page.role] ?? "neutral"}>{ROLE_LABEL[page.role] ?? page.role}</Badge>
    </li>
  );
}

function Problems({ flow }: { flow: FlowProduct }) {
  const groups: { label: string; rows: { key: string; route: string; why: string }[] }[] = [
    { label: "Unreachable", rows: (flow.stranded ?? []).map((s) => ({ key: s.route, route: s.route, why: s.why })) },
    {
      label: "Buried",
      rows: (flow.buried ?? []).map((b) => ({ key: b.route, route: b.route, why: `${b.depth} clicks deep. ${b.why}` })),
    },
    {
      label: "Duplicates",
      rows: (flow.duplicates ?? []).map((d) => ({ key: d.routes.join("|"), route: d.routes.join(" · "), why: d.note })),
    },
    { label: "Legacy", rows: (flow.legacy ?? []).map((l) => ({ key: l.route, route: l.route, why: l.note ?? l.kind })) },
    {
      label: "Not in the tree",
      rows: (flow.missingFromTree ?? []).map((m) => ({ key: m.name, route: m.route ?? m.name, why: m.why })),
    },
  ];
  const any = groups.some((g) => g.rows.length > 0);
  if (!any) return <p className="type-secondary text-muted-foreground">No problems found</p>;
  return (
    <div className="grid gap-3 lg:grid-cols-2">
      {groups
        .filter((g) => g.rows.length > 0)
        .map((g) => (
          <section key={g.label} aria-label={g.label} className="rounded-lg border border-border p-3">
            <h3 className="type-title">
              {g.label} <span className="type-meta text-muted-foreground">{g.rows.length}</span>
            </h3>
            <ul className="mt-2 space-y-1.5">
              {g.rows.map((r) => (
                <li key={r.key} className="min-w-0">
                  <p className="type-body truncate font-mono" title={r.route}>
                    {r.route}
                  </p>
                  <p className="type-secondary truncate text-muted-foreground" title={r.why}>
                    {r.why}
                  </p>
                </li>
              ))}
            </ul>
          </section>
        ))}
    </div>
  );
}

/** Every family → product → section, with page counts, on one screen. */
export function BigPicture({
  products,
  families,
  onPick,
}: {
  products: readonly FrameProduct[];
  families: readonly { id: ProductFamily; label: string }[];
  onPick: (productId: string) => void;
}) {
  const outside = FLOWS.filter((f) => f.product in FLOWS_OUTSIDE_THE_GRID);
  return (
    <div className="w-full space-y-4 px-6 py-6" data-testid="big-picture">
      <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] items-start gap-3">
        {families.map((family) => (
          <section key={family.id} aria-label={family.label} className="space-y-2">
            <h3 className="type-label text-muted-foreground">{family.label}</h3>
            {products
              .filter((p) => p.family === family.id)
              .map((p) => {
                const flow = flowForTile(p.name);
                const counts = flow ? flowCounts(flow) : null;
                return (
                  <a
                    key={p.id}
                    href={p.homeHref}
                    data-clickable
                    onClick={(e) => {
                      if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
                      e.preventDefault();
                      onPick(p.id);
                    }}
                    className="block w-full rounded-lg border border-border p-2.5 text-left hover:bg-accent"
                  >
                    <span className="flex items-center gap-2">
                      <ProductMark product={p} size="inline" />
                      <span className="type-title min-w-0 flex-1 truncate">{p.name}</span>
                      <span className="type-meta text-muted-foreground">{counts ? `${counts.pages} pages` : "No flow"}</span>
                    </span>
                    {flow && flow.sections.length > 0 ? (
                      <span className="mt-1.5 flex flex-wrap gap-1">
                        {flow.sections.map((s, i) => (
                          <span key={`${s.name}-${i}`} className="type-meta rounded border border-border px-1.5 text-muted-foreground">
                            {s.name} {s.pages.length}
                          </span>
                        ))}
                      </span>
                    ) : null}
                  </a>
                );
              })}
          </section>
        ))}
        <section aria-label="Outside the grid" className="space-y-2">
          <h3 className="type-label text-muted-foreground">Outside the grid</h3>
          {outside.map((f) => (
            <div key={f.product} className="rounded-lg border border-border p-2.5">
              <span className="flex items-center gap-2">
                <span className="type-title min-w-0 flex-1 truncate">{f.product}</span>
                <span className="type-meta text-muted-foreground">{flowCounts(f).pages} pages</span>
              </span>
              <span className="type-meta text-muted-foreground">In {FLOWS_OUTSIDE_THE_GRID[f.product]}</span>
            </div>
          ))}
        </section>
      </div>
    </div>
  );
}
