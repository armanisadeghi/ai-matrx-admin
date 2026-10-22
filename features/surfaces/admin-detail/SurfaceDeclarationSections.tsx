"use client";

/**
 * Surface declarations W5 — admin visibility (VISION A13–A15, PLAN W5).
 *
 * Everything an admin needs to see about one surface, for BOTH sources (code manifests
 * mirrored by the sync, database/applet surfaces declared in the DB; D1):
 * - the chain (AI Matrx › … › this surface), every level a door to its own page;
 * - the full declaration as readable tables plus one-click raw JSON (the Alchemy copy door);
 * - each level's intro and situation, own vs inherited, and the rendered situation with
 *   blanks filled from the latest probe (the editors stay in AgentIntroSection);
 * - the latest probe record (`last_check`) and the derived readiness with its rule;
 * - 30-day run supply (`ui.mv_surface_run_supply`);
 * - everything bound over the chain through the W4 read `ui.surface_intelligence` (agent
 *   bindings + mandate shortcuts, grouped by level and scope), plus the fixed jobs
 *   (`ui.ui_surface_agent_role`, role slots — not menu bindings) read directly.
 *
 * No key is rendered: every value, target, tool and surface shows its label
 * (`pnpm check:surface-chrome-labels` scans this file).
 */

import React, { useEffect, useState } from "react";
import { ChevronRight, ExternalLink, Loader2 } from "lucide-react";
import AppLink from "@/components/navigation/AppLink";
import { Badge } from "@/components/ui/badge";
import { PropertyRow } from "@ai-matrx/design-system/controls";
import { RecordId } from "@ai-matrx/design-system";
import { MatrxDataTable, type MatrxColumnDef } from "@ai-matrx/design-system/data-table";
import { CopyButtons } from "@/components/agent-copy/CopyButtons";
import { ErrorAlchemyMenu } from "@/components/errors/ErrorAlchemyMenu";
import { labelFromName } from "@ai-matrx/chat/surfaces/utils/surface-display";
import { surfaceAdminHref } from "@ai-matrx/chat/surfaces/utils/surface-hierarchy";
import { humanizeIdentifier } from "@ai-matrx/kit/text-case";
import {
  loadChainRoles,
  loadDeclaration,
  loadRunSupply,
  loadSurfaceChain,
  loadSurfaceFleetMetric,
  loadSurfaceIntelligence,
  type ChainSurface,
  type DeclaredAction,
  type DeclaredClientTool,
  type DeclaredValue,
  type DeclaredWriteTarget,
  type IntelligenceRow,
  type RunSupplyRow,
  type SurfaceDeclarationData,
  type SurfaceRoleRow,
} from "@/features/surfaces/services/surface-declaration.service";
import {
  isWriteTargetHandled,
  type SurfaceFleetMetric,
} from "@/features/surfaces/services/surface-fleet-metric";
import {
  deriveFleetReadiness,
  FLEET_READINESS_LABEL,
  FLEET_READINESS_RULE,
  readinessGaps,
} from "@/features/surfaces/utils/fleet-readiness";
import { parseProbeRecord, probeUrl, type SurfaceProbeRecord } from "@ai-matrx/chat/surfaces/utils/probe-record";
import { probePreviewValues, renderSituation } from "@ai-matrx/chat/surfaces/utils/situation-render";
import { splitRunSupplyKeys } from "@/features/surfaces/utils/run-supply-keys";
import { SurfaceReceivesSection } from "@/features/surfaces/admin-detail/SurfaceReceivesSection";

const ROOT_SURFACE = "matrx-default/default";

/** The one name a person sees for a surface. */
export function surfaceLabel(s: Pick<ChainSurface, "name" | "label">): string {
  if (s.name === ROOT_SURFACE) return "AI Matrx";
  return s.label?.trim() || labelFromName(s.name);
}

/** PropertyRow whose missing tag (named by `none`) shows only when the value is empty. */
function Prop({ none, value, ...rest }: Omit<React.ComponentProps<typeof PropertyRow>, "missing"> & { none?: string }) {
  const empty = value === null || value === undefined || value === "";
  return <PropertyRow {...rest} value={value} missing={empty ? (none ?? true) : undefined} />;
}

function Heading({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</h2>
      {children}
    </div>
  );
}

function when(iso: string | null | undefined): string | null {
  return iso ? new Date(iso).toLocaleString() : null;
}

function effective(override: string | null, code: string | null): string | null {
  if (override && override.trim()) return override;
  return code && code.trim() ? code : null;
}

interface Loaded {
  chain: ChainSurface[];
  declaration: SurfaceDeclarationData;
  intelligence: IntelligenceRow[];
  roles: SurfaceRoleRow[];
  metric: SurfaceFleetMetric | null;
  supply: RunSupplyRow | null;
}

/** Loads the chain first, then everything declared over it. */
function useSurfaceDeclaration(surfaceName: string, reloadKey: unknown) {
  const [data, setData] = useState<Loaded | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    setError(null);
    void (async () => {
      try {
        const chain = await loadSurfaceChain(surfaceName);
        const names = chain.map((c) => c.name);
        const [declaration, intelligence, roles, metric, supply] = await Promise.all([
          loadDeclaration(names),
          loadSurfaceIntelligence(surfaceName),
          loadChainRoles(names),
          loadSurfaceFleetMetric(surfaceName),
          loadRunSupply(surfaceName),
        ]);
        if (alive) setData({ chain, declaration, intelligence, roles, metric, supply });
      } catch (e) {
        if (alive) setError(e instanceof Error ? e.message : "Surface declaration not loaded");
      }
    })();
    return () => {
      alive = false;
    };
  }, [surfaceName, reloadKey]);
  return { data, error };
}

// ─── Chain ───────────────────────────────────────────────────────────────────

export function SurfaceChainCrumbs({ chain }: { chain: ChainSurface[] }) {
  const items = chain[0]?.name === ROOT_SURFACE ? chain : [{ name: ROOT_SURFACE, label: "AI Matrx" }, ...chain];
  return (
    <nav aria-label="Surface chain" className="flex flex-wrap items-center gap-1 text-sm" data-testid="surface-chain">
      {items.map((s, i) => {
        const last = i === items.length - 1;
        return (
          <React.Fragment key={s.name}>
            {i > 0 && <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
            {last ? (
              <span className="font-medium text-foreground">{surfaceLabel(s)}</span>
            ) : (
              <AppLink href={surfaceAdminHref(s.name)} className="text-muted-foreground hover:text-primary hover:underline">
                {surfaceLabel(s)}
              </AppLink>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
}

function DeclaredOn({ surfaceName, chain, self }: { surfaceName: string; chain: ChainSurface[]; self: string }) {
  if (surfaceName === self) return <span className="text-muted-foreground">This page</span>;
  const row = chain.find((c) => c.name === surfaceName) ?? { name: surfaceName, label: null };
  return (
    <AppLink href={surfaceAdminHref(surfaceName)} className="text-foreground hover:text-primary hover:underline">
      {surfaceLabel(row)}
    </AppLink>
  );
}

// ─── Main export ─────────────────────────────────────────────────────────────

export function SurfaceDeclarationSections({
  surface,
  reloadKey,
  editors,
}: {
  /** The page's live `ui_surface` row (overrides update it after a save). */
  surface: {
    name: string;
    label?: string | null;
    declared_by?: string | null;
    last_check?: unknown;
    intro: string | null;
    intro_override?: string | null;
    situation?: string | null;
    situation_override?: string | null;
  } & Record<string, unknown>;
  reloadKey?: unknown;
  /** The intro and situation editors, placed right under the chain's texts. */
  editors?: React.ReactNode;
}) {
  const { data, error } = useSurfaceDeclaration(surface.name, reloadKey);

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2 rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-xs text-destructive-ink">
          {error}
          <ErrorAlchemyMenu error={error} />
        </div>
        {editors}
      </div>
    );
  }
  if (!data) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2 py-2 text-xs text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading declaration…
        </div>
        {editors}
      </div>
    );
  }

  // The page's row is fresher than the chain read for its own overrides.
  const chain = data.chain.map((c) =>
    c.name === surface.name
      ? {
          ...c,
          intro: surface.intro,
          intro_override: surface.intro_override ?? null,
          situation: surface.situation ?? null,
          situation_override: surface.situation_override ?? null,
        }
      : c,
  );
  const labels: Record<string, string> = {};
  for (const v of data.declaration.values) {
    if (!labels[v.name]) labels[v.name] = v.label?.trim() || humanizeIdentifier(v.name);
  }
  const probe = parseProbeRecord(surface.last_check);

  return (
    <div className="space-y-6" data-testid="surface-declaration-sections">
      <SurfaceChainCrumbs chain={chain} />
      <SituationChainSection chain={chain} self={surface.name} probe={probe} labels={labels} />
      {editors}
      <ProbeSection probe={probe} metric={data.metric} labels={labels} />
      <SurfaceReceivesSection key={surface.name} surfaceName={surface.name} />
      <RunSupplySection supply={data.supply} metric={data.metric} labels={labels} chain={chain} />
      <DeclarationSection surface={surface} chain={chain} declaration={data.declaration} labels={labels} />
      <BindingsSection chain={chain} self={surface.name} intelligence={data.intelligence} roles={data.roles} />
    </div>
  );
}

// ─── Situation and intro over the chain ─────────────────────────────────────

function SituationChainSection({
  chain,
  self,
  probe,
  labels,
}: {
  chain: ChainSurface[];
  self: string;
  probe: SurfaceProbeRecord | null;
  labels: Record<string, string>;
}) {
  // The nearest level (self first) with a situation is the one the agent gets.
  const nearest = [...chain].reverse().find((c) => effective(c.situation_override, c.situation));
  const template = nearest ? effective(nearest.situation_override, nearest.situation) : null;
  const source = !nearest ? "None" : nearest.name === self ? "Own" : "Inherited";
  const preview = probePreviewValues(probe, labels);
  const rendered = template ? renderSituation(template, preview.values, labels) : null;

  return (
    <section className="space-y-2" data-testid="surface-situation-chain">
      <Heading title="Situation and intro">
        <Badge variant="outline" className="text-[10px]">
          Situation: {source}
        </Badge>
      </Heading>
      <div className="space-y-3 rounded-md border border-border bg-card p-3">
        <Prop
          label="Rendered situation"
          help={
            preview.source === "probe-values"
              ? "Blanks filled from the latest probe's values"
              : preview.source === "probe-keys"
                ? "Blanks the latest probe supplied show as [Label]; others show their fallback"
                : "No probe yet: every blank shows its fallback"
          }
          value={rendered ? <span className="whitespace-pre-wrap">{rendered}</span> : null}
          none="No situation on this chain"
        />
        {nearest && nearest.name !== self && (
          <Prop label="Inherited from" value={<DeclaredOn surfaceName={nearest.name} chain={chain} self={self} />} />
        )}
        <div className="divide-y divide-border">
          {[...chain].reverse().map((c) => {
            const intro = effective(c.intro_override, c.intro);
            const situation = effective(c.situation_override, c.situation);
            return (
              <div key={c.name} className="space-y-2 py-2">
                <div className="flex items-center gap-2 text-xs">
                  <DeclaredOn surfaceName={c.name} chain={chain} self={self} />
                  {c.intro_override?.trim() || c.situation_override?.trim() ? (
                    <Badge variant="secondary" className="text-[10px]">Edited here</Badge>
                  ) : null}
                </div>
                <Prop
                  label="Situation"
                  value={situation ? <span className="whitespace-pre-wrap font-mono text-xs">{situation}</span> : null}
                  none="None"
                />
                <Prop
                  label="Intro"
                  value={intro ? <span className="line-clamp-3 whitespace-pre-wrap text-xs">{intro}</span> : null}
                  expanded={intro ? <pre className="whitespace-pre-wrap font-mono text-xs">{intro}</pre> : undefined}
                  none="None"
                />
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ─── Probe + readiness ──────────────────────────────────────────────────────

function labelList(keys: string[], labels: Record<string, string>): string {
  return keys.map((k) => labels[k] ?? humanizeIdentifier(k)).join(", ");
}

function ProbeSection({
  probe,
  metric,
  labels,
}: {
  probe: SurfaceProbeRecord | null;
  metric: SurfaceFleetMetric | null;
  labels: Record<string, string>;
}) {
  const readiness = deriveFleetReadiness(metric ?? undefined);
  const gaps = readinessGaps(metric ?? undefined);
  const url = probe ? probeUrl(probe) : null;
  return (
    <section className="space-y-2" data-testid="surface-probe">
      <Heading title="Latest probe and readiness" />
      <div className="grid gap-3 rounded-md border border-border bg-card p-3 md:grid-cols-2">
        <div className="space-y-3">
          <Prop
            label="Readiness"
            help={FLEET_READINESS_RULE}
            value={
              <Badge variant={readiness === "ready" ? "default" : "outline"} data-testid="surface-readiness">
                {FLEET_READINESS_LABEL[readiness]}
              </Badge>
            }
          />
          <Prop
            label="Still needed"
            value={gaps.length ? <ul className="list-disc pl-4 text-sm">{gaps.map((g) => <li key={g}>{g}</li>)}</ul> : null}
            none="Nothing"
          />
          <Prop
            label="Status"
            value={
              probe ? (
                <Badge variant={probe.status === "pass" ? "default" : "outline"}>
                  {probe.status === "pass" ? "Pass" : probe.status === "fail" ? "Fail" : humanizeIdentifier(probe.status)}
                </Badge>
              ) : null
            }
            none="Never probed"
          />
          <Prop label="When" value={when(probe?.at)} none="Never probed" />
          <Prop
            label="Route"
            value={
              url ? (
                <AppLink href={url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 hover:text-primary hover:underline">
                  <span className="truncate">{probe?.route}</span>
                  <ExternalLink className="h-3 w-3 shrink-0" />
                </AppLink>
              ) : null
            }
            mono
            none="None"
          />
          <Prop label="Record" value={probe?.recordId ? <RecordId value={probe.recordId} label="Record" href={url} /> : null} none="None" />
          <Prop
            label="Probed as"
            value={
              probe?.probedAs ? (
                <span className="inline-flex items-center gap-2">
                  {probe.probedAs.email}
                  {probe.probedAs.role && <Badge variant="outline" className="text-[10px]">{humanizeIdentifier(probe.probedAs.role)}</Badge>}
                  {probe.probedAs.userId && <RecordId value={probe.probedAs.userId} label="Person" token="user" />}
                </span>
              ) : null
            }
            none="Unknown"
          />
        </div>
        <div className="space-y-3">
          <Prop
            label={`Declared on (${probe?.declaredOn.length ?? 0})`}
            value={probe?.declaredOn.length ? labelList(probe.declaredOn, labels) : null}
            none="None"
          />
          <Prop
            label={`Supplied (${probe?.suppliedValues.length ?? 0})`}
            value={probe?.suppliedValues.length ? labelList(probe.suppliedValues, labels) : null}
            none="None"
          />
          <Prop
            label={`Supplied empty (${probe?.suppliedEmpty.length ?? 0})`}
            value={probe?.suppliedEmpty.length ? labelList(probe.suppliedEmpty, labels) : null}
            none="None"
          />
          <Prop
            label={`Missing (${probe?.missing.length ?? 0})`}
            value={probe?.missing.length ? labelList(probe.missing, labels) : null}
            none="None"
          />
          <Prop
            label={`Conditional, not seen (${probe?.conditionalMissing.length ?? 0})`}
            value={probe?.conditionalMissing.length ? labelList(probe.conditionalMissing, labels) : null}
            none="None"
          />
        </div>
      </div>
    </section>
  );
}

// ─── Run supply ─────────────────────────────────────────────────────────────

function RunSupplySection({
  supply,
  metric,
  labels,
  chain,
}: {
  supply: RunSupplyRow | null;
  metric: SurfaceFleetMetric | null;
  labels: Record<string, string>;
  chain: ChainSurface[];
}) {
  // Qualified keys from screens open beside this one are not this surface's values.
  const { own, others } = splitRunSupplyKeys(supply?.supplied_keys ?? [], chain.map((c) => c.name));
  const otherLabel = (o: { surface: string | null; name: string }) =>
    o.surface ? `${labelFromName(o.surface)}: ${humanizeIdentifier(o.name)}` : `Window: ${o.name}`;
  return (
    <section className="space-y-2" data-testid="surface-run-supply">
      <Heading title="Run supply, last 30 days" />
      <div className="grid gap-3 rounded-md border border-border bg-card p-3 md:grid-cols-2">
        <div className="space-y-3">
          <Prop label="Runs" value={supply ? String(supply.runs_30d) : null} none="No runs" />
          <Prop label="Last run" value={when(supply?.last_run_at ?? metric?.last_run_at)} none="No runs" />
          <Prop
            label="On values supplied"
            value={metric ? `${metric.values_supplied} of ${metric.values_declared_on}` : null}
            none="Unknown"
          />
          <Prop label="Rolled up" value={when(supply?.refreshed_at ?? metric?.supply_refreshed_at)} none="Never" />
        </div>
        <div className="space-y-3">
          <Prop
            label={`Values seen (${own.length})`}
            value={own.length ? labelList(own.map((o) => o.name), labels) : null}
            none="None"
          />
          {others.length > 0 && (
            <Prop
              label={`From other open screens (${others.length})`}
              help="Values from screens open beside this one during a run"
              value={others.map(otherLabel).join(", ")}
            />
          )}
        </div>
      </div>
    </section>
  );
}

// ─── Declaration ────────────────────────────────────────────────────────────

function yesNo(v: boolean | null | undefined, yes = "Yes", no = "No"): string {
  return v === null || v === undefined ? "—" : v ? yes : no;
}

function DeclarationSection({
  surface,
  chain,
  declaration,
  labels,
}: {
  surface: { name: string } & Record<string, unknown>;
  chain: ChainSurface[];
  declaration: SurfaceDeclarationData;
  labels: Record<string, string>;
}) {
  const self = surface.name;
  const byName = new Map(chain.map((c) => [c.name, c]));
  const declaredBy = (n: string) => byName.get(n)?.declared_by ?? null;
  const own = <T extends { surface_name: string }>(rows: T[]) => rows.filter((r) => r.surface_name === self);

  // The raw declaration: the surface row plus every row it declares, and what it inherits.
  const rawJson = () => ({
    surface,
    chain: chain.map((c) => c.name),
    values: own(declaration.values),
    writeTargets: own(declaration.writeTargets),
    clientTools: own(declaration.clientTools),
    actions: own(declaration.actions),
    itemTypes: own(declaration.itemTypes),
    inherited: {
      values: declaration.values.filter((r) => r.surface_name !== self),
      writeTargets: declaration.writeTargets.filter((r) => r.surface_name !== self),
      clientTools: declaration.clientTools.filter((r) => r.surface_name !== self),
      actions: declaration.actions.filter((r) => r.surface_name !== self),
      itemTypes: declaration.itemTypes.filter((r) => r.surface_name !== self),
    },
  });

  const declaredOnCol = <T extends { surface_name: string }>(): MatrxColumnDef<T> => ({
    id: "declaredOn",
    header: "Declared on",
    accessorFn: (r) => (r.surface_name === self ? "This page" : surfaceLabel(byName.get(r.surface_name) ?? { name: r.surface_name, label: null })),
    filter: "select",
    width: 160,
    cell: (r) => <DeclaredOn surfaceName={r.surface_name} chain={chain} self={self} />,
  });

  const valueCols: MatrxColumnDef<DeclaredValue>[] = [
    { id: "label", header: "Value", accessorFn: (v) => v.label || humanizeIdentifier(v.name), width: 220 },
    { id: "on", header: "On by default", accessorFn: (v) => yesNo(v.auto_context !== false, "On", "Off"), filter: "select", width: 110 },
    { id: "always", header: "Always there", accessorFn: (v) => yesNo(v.always_available), filter: "select", width: 110 },
    { id: "type", header: "Type", accessorFn: (v) => (v.value_type ? humanizeIdentifier(v.value_type) : "—"), filter: "select", width: 110 },
    { id: "inline", header: "Inline limit", accessorFn: (v) => v.max_inline_chars ?? 0, width: 100, cell: (v) => <span className="tabular-nums">{v.max_inline_chars ?? "—"}</span> },
    { id: "itemType", header: "Item type", accessorFn: (v) => (v.item_type ? humanizeIdentifier(v.item_type) : "—"), filter: "select", width: 120 },
    declaredOnCol<DeclaredValue>(),
  ];

  const targetCols: MatrxColumnDef<DeclaredWriteTarget>[] = [
    { id: "label", header: "Write target", accessorFn: (t) => t.label || humanizeIdentifier(t.name), width: 220 },
    {
      id: "handler",
      header: "Handler",
      accessorFn: (t) => {
        const h = isWriteTargetHandled(t.surface_name, declaredBy(t.surface_name), t.name);
        return h === null ? "Unknown" : h ? "Handled" : "Missing";
      },
      filter: "select",
      width: 100,
    },
    { id: "patchable", header: "Patchable", accessorFn: (t) => yesNo(t.patchable), filter: "select", width: 100 },
    { id: "mode", header: "Mode", accessorFn: (t) => (t.mode ? humanizeIdentifier(t.mode) : "—"), filter: "select", width: 100 },
    { id: "type", header: "Type", accessorFn: (t) => (t.value_type ? humanizeIdentifier(t.value_type) : "—"), filter: "select", width: 110 },
    { id: "updates", header: "Updates value", accessorFn: (t) => (t.updates_value ? labels[t.updates_value] ?? humanizeIdentifier(t.updates_value) : "—"), width: 160 },
    declaredOnCol<DeclaredWriteTarget>(),
  ];

  const toolCols: MatrxColumnDef<DeclaredClientTool>[] = [
    { id: "label", header: "Client tool", accessorFn: (t) => t.label || humanizeIdentifier(t.name), width: 220 },
    { id: "mode", header: "Mode", accessorFn: (t) => (t.mode ? humanizeIdentifier(t.mode) : "—"), filter: "select", width: 110 },
    { id: "description", header: "Description", accessorFn: (t) => t.description ?? "", width: 320, cell: (t) => <span className="block truncate text-muted-foreground">{t.description || "—"}</span> },
    declaredOnCol<DeclaredClientTool>(),
  ];

  const actionCols: MatrxColumnDef<DeclaredAction>[] = [
    { id: "label", header: "Action", accessorFn: (a) => a.label || humanizeIdentifier(a.name), width: 220 },
    { id: "category", header: "Category", accessorFn: (a) => (a.category ? humanizeIdentifier(a.category) : "—"), filter: "select", width: 120 },
    { id: "runs", header: "Runs", accessorFn: (a) => (a.runs ? humanizeIdentifier(a.runs) : "—"), filter: "select", width: 110 },
    { id: "policy", header: "Policy", accessorFn: (a) => (a.policy ? humanizeIdentifier(a.policy) : "—"), filter: "select", width: 110 },
    { id: "itemType", header: "Item type", accessorFn: (a) => (a.item_type ? humanizeIdentifier(a.item_type) : "—"), filter: "select", width: 120 },
    declaredOnCol<DeclaredAction>(),
  ];

  const tables: { key: string; title: string; node: React.ReactNode; count: number }[] = [
    {
      key: "values",
      title: "Values",
      count: declaration.values.length,
      node: (
        <MatrxDataTable<DeclaredValue>
          tableId="surface-admin-declared-values"
          data={declaration.values}
          columns={valueCols}
          getRowId={(v) => `${v.surface_name}|${v.item_type ?? ""}|${v.name}`}
          emptyState={{ title: "No values declared" }}
          detail={{ enabled: false }}
        />
      ),
    },
    {
      key: "targets",
      title: "Write targets",
      count: declaration.writeTargets.length,
      node: (
        <MatrxDataTable<DeclaredWriteTarget>
          tableId="surface-admin-declared-write-targets"
          data={declaration.writeTargets}
          columns={targetCols}
          getRowId={(t) => `${t.surface_name}|${t.item_type ?? ""}|${t.name}`}
          emptyState={{ title: "No write targets declared" }}
          detail={{ enabled: false }}
        />
      ),
    },
    {
      key: "tools",
      title: "Client tools",
      count: declaration.clientTools.length,
      node: (
        <MatrxDataTable<DeclaredClientTool>
          tableId="surface-admin-declared-client-tools"
          data={declaration.clientTools}
          columns={toolCols}
          getRowId={(t) => `${t.surface_name}|${t.name}`}
          emptyState={{ title: "No client tools declared" }}
          detail={{ enabled: false }}
        />
      ),
    },
    {
      key: "actions",
      title: "Actions",
      count: declaration.actions.length,
      node: (
        <MatrxDataTable<DeclaredAction>
          tableId="surface-admin-declared-actions"
          data={declaration.actions}
          columns={actionCols}
          getRowId={(a) => `${a.surface_name}|${a.item_type}|${a.name}`}
          emptyState={{ title: "No actions declared" }}
          detail={{ enabled: false }}
        />
      ),
    },
  ];

  return (
    <section className="space-y-3" data-testid="surface-declaration">
      <Heading title="Declaration">
        <Badge variant="outline" className="text-[10px]">
          {declaredBy(self) === "code" ? "From code" : "From database"}
        </Badge>
        <div className="ml-auto">
          <CopyButtons
            size="sm"
            label={`${surfaceLabel(byName.get(self) ?? { name: self, label: null })} declaration`}
            data={rawJson}
            dataType="Surface declaration"
            defaultCopy="raw"
          />
        </div>
      </Heading>
      {tables.map((t) => (
        <div key={t.key} className="space-y-1.5">
          <div className="flex items-center gap-1.5 text-xs font-medium text-foreground">
            {t.title}
            <Badge variant="outline" className="text-[10px] tabular-nums">{t.count}</Badge>
          </div>
          {t.node}
        </div>
      ))}
    </section>
  );
}

// ─── Bindings ───────────────────────────────────────────────────────────────

const LEVEL_LABEL: Record<string, string> = { page: "This page", module: "Module", ai_matrx: "AI Matrx" };
const SCOPE_LABEL: Record<string, string> = { person: "Person", organization: "Organization", system: "System" };

function BindingsSection({
  chain,
  self,
  intelligence,
  roles,
}: {
  chain: ChainSurface[];
  self: string;
  intelligence: IntelligenceRow[];
  roles: SurfaceRoleRow[];
}) {
  const byName = new Map(chain.map((c) => [c.name, c]));
  const onLabel = (n: string | null) =>
    !n ? "—" : n === self ? "This page" : n === "*" ? "Every page" : surfaceLabel(byName.get(n) ?? { name: n, label: null });

  const bindingCols: MatrxColumnDef<IntelligenceRow>[] = [
    {
      id: "level",
      header: "Level",
      accessorFn: (b) => LEVEL_LABEL[b.group_level] ?? humanizeIdentifier(b.group_level),
      filter: "select",
      width: 110,
    },
    {
      id: "scope",
      header: "Scope",
      accessorFn: (b) => SCOPE_LABEL[b.scope] ?? humanizeIdentifier(b.scope),
      filter: "select",
      width: 120,
    },
    {
      id: "name",
      header: "Name",
      accessorFn: (b) => b.label || "Unnamed",
      width: 240,
      cell: (b) =>
        b.source === "agent_binding" && b.agent_id ? (
          <AppLink
            href={`/agents/go/${b.agent_id}/surfaces?surface=${encodeURIComponent(b.bound_surface ?? self)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-foreground hover:text-primary hover:underline"
          >
            <span className="truncate">{b.label || "Unnamed agent"}</span>
            <ExternalLink className="h-3 w-3 shrink-0" />
          </AppLink>
        ) : b.mandate_id ? (
          <span className="inline-flex items-center gap-1.5">
            <span className="truncate">{b.label || "Unnamed shortcut"}</span>
            <RecordId value={b.mandate_id} label="Mandate" token="mandate" />
          </span>
        ) : (
          <span>{b.label || "Unnamed"}</span>
        ),
    },
    {
      id: "kind",
      header: "Kind",
      accessorFn: (b) => (b.source === "agent_binding" ? "Agent" : "Shortcut"),
      filter: "select",
      width: 100,
    },
    { id: "autoRun", header: "Auto-run", accessorFn: (b) => yesNo(b.auto_run), filter: "select", width: 100 },
    {
      id: "boundOn",
      header: "Bound on",
      accessorFn: (b) => onLabel(b.bound_surface),
      filter: "select",
      width: 160,
      cell: (b) =>
        b.bound_surface && byName.has(b.bound_surface) ? (
          <DeclaredOn surfaceName={b.bound_surface} chain={chain} self={self} />
        ) : (
          onLabel(b.bound_surface)
        ),
    },
  ];

  const roleCols: MatrxColumnDef<SurfaceRoleRow>[] = [
    { id: "label", header: "Job", accessorFn: (r) => r.label || humanizeIdentifier(r.name), width: 220 },
    { id: "kind", header: "Kind", accessorFn: (r) => (r.kind ? humanizeIdentifier(r.kind) : "—"), filter: "select", width: 110 },
    { id: "mandate", header: "Mandate", accessorFn: (r) => (r.mandate_key ? humanizeIdentifier(r.mandate_key) : "—"), width: 200 },
    {
      id: "agent",
      header: "Default agent",
      accessorFn: (r) => r.default_agent_id ?? "",
      width: 140,
      cell: (r) => (r.default_agent_id ? <RecordId value={r.default_agent_id} label="Agent" token="agent" /> : "—"),
    },
    { id: "autoRun", header: "Auto-run", accessorFn: (r) => (r.auto_run ? humanizeIdentifier(r.auto_run) : "—"), filter: "select", width: 100 },
    {
      id: "declaredOn",
      header: "Declared on",
      accessorFn: (r) => onLabel(r.surface_name),
      filter: "select",
      width: 160,
      cell: (r) => <DeclaredOn surfaceName={r.surface_name} chain={chain} self={self} />,
    },
  ];

  return (
    <section className="space-y-3" data-testid="surface-bindings">
      <Heading title="Bindings" />
      <div className="space-y-1.5">
        <div className="flex items-center gap-1.5 text-xs font-medium text-foreground">
          Intelligence on this page
          <Badge variant="outline" className="text-[10px] tabular-nums">{intelligence.length}</Badge>
        </div>
        <MatrxDataTable<IntelligenceRow>
          tableId="surface-admin-chain-intelligence"
          data={intelligence}
          columns={bindingCols}
          getRowId={(b) => `${b.source}|${b.binding_id}`}
          grouping={{ columnId: "level", thenColumnIds: ["scope"], order: "first-seen", rowNoun: "binding" }}
          emptyState={{ title: "Nothing bound here or above" }}
          detail={{ enabled: false }}
        />
      </div>
      <div className="space-y-1.5">
        <div className="flex items-center gap-1.5 text-xs font-medium text-foreground">
          Fixed jobs
          <Badge variant="outline" className="text-[10px] tabular-nums">{roles.length}</Badge>
        </div>
        <MatrxDataTable<SurfaceRoleRow>
          tableId="surface-admin-chain-roles"
          data={roles}
          columns={roleCols}
          getRowId={(r) => `${r.surface_name}|${r.name}`}
          emptyState={{ title: "No fixed jobs here or above" }}
          detail={{ enabled: false }}
        />
      </div>
    </section>
  );
}
