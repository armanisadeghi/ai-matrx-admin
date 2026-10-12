"use client";

/**
 * Builder panel — the ONE admin window that shows everything a page has and can do:
 * Data (every published value), Workflow (the live run graph + proposed shapes), Mandates
 * (real + proposed), AI calls (Watch AI) and Provision (snapshots). Pages publish with
 * `useBuilderFeed` (hooks/useBuilderFeed.ts). FEATURE: features/builder-panel/FEATURE.md.
 */

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Select, Tabs, type SelectOption } from "@ai-matrx/design-system/controls";
import { WindowPanel } from "@/features/window-panels/WindowPanel";
import { useAppSelector } from "@/lib/redux/hooks";
import { selectDebugData } from "@/lib/redux/preferences/adminDebugSlice";
import { CopyButtons } from "@/components/agent-copy/CopyButtons";
import { feedEntries, feedSnapshot, feedsForRoute, refsOf, selectBuilderFeedList } from "@/features/builder-panel/selectors";
import { fetchProposals, type MandateProposal } from "@/features/builder-panel/data";
import type { BuilderEntry } from "@/features/builder-panel/types";
import { BuilderSidebar } from "@/features/builder-panel/components/BuilderSidebar";
import { BuilderEntryDetail } from "@/features/builder-panel/components/BuilderEntryDetail";
import { BuilderWorkflowTab } from "@/features/builder-panel/components/BuilderWorkflowTab";
import { BuilderMandatesTab } from "@/features/builder-panel/components/BuilderMandatesTab";
import { BuilderAiTab, BuilderProvisionTab } from "@/features/builder-panel/components/BuilderRunsTabs";

export type BuilderTab = "data" | "workflow" | "mandates" | "ai" | "provision";
const TABS: BuilderTab[] = ["data", "workflow", "mandates", "ai", "provision"];

interface BuilderPanelWindowProps {
  isOpen: boolean;
  onClose: () => void;
  initialSurfaceKey?: string | null;
  initialTab?: string | null;
  initialEntryKey?: string | null;
  initialRaw?: boolean;
}

export default function BuilderPanelWindow({ isOpen, ...rest }: BuilderPanelWindowProps) {
  if (!isOpen) return null;
  return <BuilderPanelInner {...rest} />;
}

function BuilderPanelInner({
  onClose,
  initialSurfaceKey,
  initialTab,
  initialEntryKey,
  initialRaw,
}: Omit<BuilderPanelWindowProps, "isOpen">) {
  const pathname = usePathname();
  const feeds = useAppSelector(selectBuilderFeedList);
  const debugData = useAppSelector(selectDebugData);
  const [surfacePick, setSurfacePick] = useState<string | null>(initialSurfaceKey ?? null);
  const [tab, setTab] = useState<BuilderTab>(TABS.includes(initialTab as BuilderTab) ? (initialTab as BuilderTab) : "data");
  const [entryKey, setEntryKey] = useState<string | null>(initialEntryKey ?? null);
  const [raw, setRaw] = useState(initialRaw === true);

  // This page's surfaces first; any other surface still in memory stays reachable.
  const here = feedsForRoute(feeds, pathname);
  const feed =
    feeds.find((f) => f.surfaceKey === surfacePick) ?? here[0] ?? feeds[0] ?? null;
  const surfaceKey = feed?.surfaceKey ?? null;

  // useDebugContext lines (debug mode) join the feed as "Other" entries — one panel, one store.
  const debugEntries: BuilderEntry[] = Object.entries(debugData).map(([key, data]) => ({
    key: `debug:${key}`,
    label: key,
    group: "other",
    data,
    source: "Debug context",
    at: 0,
    firstAt: 0,
    history: [],
  }));
  const entries = [...feedEntries(feed), ...debugEntries];
  const selected = entries.find((e) => e.key === entryKey) ?? entries[0] ?? null;

  // "New" highlight clock: re-read when the feed moves (never Date.now() during render).
  const [now, setNow] = useState(0);
  const feedUpdatedAt = feed?.updatedAt ?? 0;
  useEffect(() => setNow(Date.now()), [feedUpdatedAt]);

  const [proposals, setProposals] = useState<MandateProposal[] | null>(null);
  const [proposalsError, setProposalsError] = useState<string | null>(null);
  useEffect(() => {
    if (!surfaceKey) return;
    let live = true;
    setProposals(null);
    setProposalsError(null);
    fetchProposals(surfaceKey)
      .then((rows) => live && setProposals(rows))
      .catch((e: unknown) => live && setProposalsError(e instanceof Error ? e.message : String(e)));
    return () => {
      live = false;
    };
  }, [surfaceKey]);

  const workflowRuns = refsOf(entries, "workflow_run").map(({ entry, ref }) => ({
    entry,
    runId: ref.id,
    label: ref.label ?? entry.label,
  }));
  const aiRuns = refsOf(entries, "ai_run");
  const snapshots = refsOf(entries, "provision_snapshot").map(({ entry, ref }) => ({ entry, id: ref.id }));
  const mandateRefs = refsOf(entries, "mandate");
  const mandateKeys = [...new Set(mandateRefs.map((m) => m.ref.mandateKey).filter((k): k is string => Boolean(k)))];
  const provisionKeys = [...new Set(mandateRefs.map((m) => m.ref.provisionKey).filter((k): k is string => Boolean(k)))];
  const proposalCount = proposals?.length ?? 0;

  const collectData = (): Record<string, unknown> => ({
    surfaceKey,
    tab,
    entryKey: selected?.key ?? null,
    raw,
  });

  const surfaceOptions: SelectOption<string>[] = feeds.map((f) => ({
    value: f.surfaceKey,
    label: f.route === pathname ? f.surfaceKey : `${f.surfaceKey} · ${f.route ?? ""}`,
  }));

  return (
    <WindowPanel
      title="Builder"
      id="builder-panel-window"
      minWidth={520}
      minHeight={360}
      width={980}
      height={680}
      position="top-right"
      onClose={onClose}
      overlayId="builderPanelWindow"
      onCollectData={collectData}
      sidebar={
        <BuilderSidebar
          entries={entries}
          selectedKey={tab === "data" ? selected?.key ?? null : null}
          onSelect={(key) => {
            setEntryKey(key);
            setTab("data");
          }}
          now={now}
        />
      }
      sidebarDefaultSize={240}
      actionsRight={
        feed ? (
          <CopyButtons label={`Builder feed: ${feed.surfaceKey}`} sourceId={`builder:${feed.surfaceKey}`} json={() => feedSnapshot(feed)} />
        ) : null
      }
      bodyClassName="flex min-h-0 flex-1 flex-col overflow-hidden p-0"
    >
      <div className="flex shrink-0 items-center gap-2 border-b border-border px-3">
        <div className="min-w-0 flex-1 overflow-x-auto">
        <Tabs
          aria-label="Builder sections"
          rule={false}
          value={tab}
          onValueChange={(v) => setTab(v)}
          data={[
            { value: "data", label: "Data", count: entries.length },
            { value: "workflow", label: "Workflow", count: workflowRuns.length || null },
            { value: "mandates", label: "Mandates", count: mandateKeys.length + proposalCount || null },
            { value: "ai", label: "AI calls", count: aiRuns.length + workflowRuns.length || null },
            { value: "provision", label: "Provision", count: snapshots.length || null },
          ]}
        />
        </div>
        {feeds.length > 1 && surfaceKey ? (
          <Select
            aria-label="Surface"
            className="hidden shrink-0 sm:flex"
            align="end"
            value={surfaceKey}
            onValueChange={(v) => {
              setSurfacePick(v);
              setEntryKey(null);
            }}
            options={surfaceOptions}
          />
        ) : surfaceKey ? (
          <span className="hidden max-w-[40%] shrink-0 truncate font-mono text-[11px] text-muted-foreground sm:inline">{surfaceKey}</span>
        ) : null}
      </div>
      {tab === "data" ? (
        selected && surfaceKey ? (
          <BuilderEntryDetail key={selected.key} entry={selected} surfaceKey={surfaceKey} raw={raw} onRaw={setRaw} />
        ) : (
          <p className="p-3 text-xs text-muted-foreground">Nothing published on this page yet</p>
        )
      ) : null}
      {tab === "workflow" ? (
        <BuilderWorkflowTab runs={workflowRuns} proposals={proposals} proposalsError={proposalsError} />
      ) : null}
      {tab === "mandates" && surfaceKey ? (
        <BuilderMandatesTab
          surfaceKey={surfaceKey}
          mandateKeys={mandateKeys}
          provisionKeys={provisionKeys}
          proposals={proposals}
          proposalsError={proposalsError}
        />
      ) : null}
      {tab === "ai" ? <BuilderAiTab aiRuns={aiRuns} workflowRuns={workflowRuns} /> : null}
      {tab === "provision" ? <BuilderProvisionTab snapshots={snapshots} /> : null}
    </WindowPanel>
  );
}
