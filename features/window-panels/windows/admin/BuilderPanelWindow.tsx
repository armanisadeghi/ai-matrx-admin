"use client";

/**
 * Builder panel — the ONE admin window that shows everything a page has and did:
 * Data (every published value, raw; computed values only under Derived) · Requests (every request
 * in the flow — the page's own and every external call the server's steps made — exact request and
 * exact response) · Activity (what was done, in order, with time and cost) · Workflow (the stored
 * runs and steps + proposed shapes) · Mandates (real + proposed) · AI calls · Provision (every
 * snapshot for this page's runs and records). Pages publish with `useBuilderFeed`
 * (hooks/useBuilderFeed.ts). FEATURE: features/builder-panel/FEATURE.md.
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
import { installRequestLog } from "@/features/builder-panel/requestLog";
import { useRequestLog } from "@/features/builder-panel/hooks/useRequestLog";
import { useRunTruth } from "@/features/builder-panel/hooks/useRunTruth";
import { activityRows, allRequestRows, pageRequestRows, serverRequestRows } from "@/features/builder-panel/requests";
import { BuilderSidebar } from "@/features/builder-panel/components/BuilderSidebar";
import { BuilderEntryDetail } from "@/features/builder-panel/components/BuilderEntryDetail";
import { BuilderWorkflowTab } from "@/features/builder-panel/components/BuilderWorkflowTab";
import { BuilderMandatesTab } from "@/features/builder-panel/components/BuilderMandatesTab";
import { BuilderAiTab, BuilderProvisionTab } from "@/features/builder-panel/components/BuilderRunsTabs";
import { BuilderRequestsTab, type RequestFilter } from "@/features/builder-panel/components/BuilderRequestsTab";
import { BuilderActivityTab } from "@/features/builder-panel/components/BuilderActivityTab";

export type BuilderTab = "data" | "requests" | "activity" | "workflow" | "mandates" | "ai" | "provision";
const TABS: BuilderTab[] = ["data", "requests", "activity", "workflow", "mandates", "ai", "provision"];

interface BuilderPanelWindowProps {
  isOpen: boolean;
  onClose: () => void;
  initialSurfaceKey?: string | null;
  initialTab?: string | null;
  initialEntryKey?: string | null;
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
}: Omit<BuilderPanelWindowProps, "isOpen">) {
  useEffect(() => installRequestLog(), []);
  const pathname = usePathname();
  const feeds = useAppSelector(selectBuilderFeedList);
  const debugData = useAppSelector(selectDebugData);
  const requestLog = useRequestLog();
  const [surfacePick, setSurfacePick] = useState<string | null>(initialSurfaceKey ?? null);
  const [tab, setTab] = useState<BuilderTab>(TABS.includes(initialTab as BuilderTab) ? (initialTab as BuilderTab) : "data");
  const [entryKey, setEntryKey] = useState<string | null>(initialEntryKey ?? null);
  const [requestId, setRequestId] = useState<string | null>(null);
  const [requestFilter, setRequestFilter] = useState<RequestFilter>("all");
  const [stepFocus, setStepFocus] = useState<{ runId: string; nodeId: string | null } | null>(null);
  const [snapshotFocus, setSnapshotFocus] = useState<string | null>(null);

  // This page's surfaces first; any other surface still in memory stays reachable.
  const here = feedsForRoute(feeds, pathname);
  const feed = feeds.find((f) => f.surfaceKey === surfacePick) ?? here[0] ?? feeds[0] ?? null;
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
    runId: ref.id,
    label: ref.label ?? entry.label,
    at: entry.firstAt,
  }));
  const subjectIds = [
    ...new Set(
      refsOf(entries, "record").map(({ ref }) => ref.id),
    ),
  ];
  const { truth, error: truthError } = useRunTruth(
    [...new Set(workflowRuns.map((r) => r.runId))],
    subjectIds,
  );

  const aiRuns = refsOf(entries, "ai_run");
  const publishedSnapshots = refsOf(entries, "provision_snapshot").map(({ entry, ref }) => ({
    id: ref.id,
    label: entry.label,
    at: entry.at,
  }));
  const snapshots = [
    ...(truth?.snapshots ?? []).map((s) => ({ id: s.id, label: s.pointKey, at: Date.parse(s.createdAt) })),
    ...publishedSnapshots.filter((p) => !truth?.snapshots.some((s) => s.id === p.id)),
  ];
  const mandateRefs = refsOf(entries, "mandate");
  const mandateKeys = [...new Set(mandateRefs.map((m) => m.ref.mandateKey).filter((k): k is string => Boolean(k)))];
  const provisionKeys = [
    ...new Set([
      ...mandateRefs.map((m) => m.ref.provisionKey).filter((k): k is string => Boolean(k)),
      ...(truth?.snapshots ?? []).map((s) => s.pointKey),
    ]),
  ];

  const pageRows = pageRequestRows(requestLog, feed?.route ?? pathname);
  const serverRows = serverRequestRows(truth?.outcomes ?? []);
  const requestRows = allRequestRows(pageRows, serverRows);
  const activity = activityRows(requestRows, truth?.runs ?? [], truth?.outcomes ?? [], truth?.snapshots ?? [], {});

  const openRequest = (id: string) => {
    setRequestFilter("all");
    setRequestId(id);
    setTab("requests");
  };
  const openStep = (runId: string, nodeId: string | null) => {
    setStepFocus({ runId, nodeId });
    setTab("workflow");
  };
  const openSource = (nodeId: string) => {
    // The newest run that has this step.
    const outcome = [...(truth?.outcomes ?? [])].reverse().find((o) => o.nodeId === nodeId);
    openStep(outcome?.runId ?? workflowRuns[workflowRuns.length - 1]?.runId ?? "", nodeId);
  };

  const collectData = (): Record<string, unknown> => ({
    surfaceKey,
    tab,
    entryKey: selected?.key ?? null,
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
      width={1080}
      height={720}
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
          <CopyButtons
            label={`Builder feed: ${feed.surfaceKey}`}
            sourceId={`builder:${feed.surfaceKey}`}
            json={() => ({ ...feedSnapshot(feed), requests: requestRows, runs: truth })}
          />
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
              { value: "requests", label: "Requests", count: requestRows.length || null },
              { value: "activity", label: "Activity", count: activity.length || null },
              { value: "workflow", label: "Workflow", count: workflowRuns.length || null },
              { value: "mandates", label: "Mandates", count: mandateKeys.length + (proposals?.length ?? 0) || null },
              { value: "ai", label: "AI calls", count: aiRuns.length || null },
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
        selected ? (
          <BuilderEntryDetail key={selected.key} entry={selected} onOpenSource={openSource} />
        ) : (
          <p className="p-3 text-xs text-muted-foreground">Nothing published on this page yet</p>
        )
      ) : null}
      {tab === "requests" ? (
        <BuilderRequestsTab
          rows={requestRows}
          selectedId={requestId}
          onSelect={setRequestId}
          filter={requestFilter}
          onFilter={setRequestFilter}
          error={truthError}
        />
      ) : null}
      {tab === "activity" ? (
        <BuilderActivityTab
          rows={activity}
          onOpenRequest={openRequest}
          onOpenStep={openStep}
          onOpenSnapshot={(id) => {
            setSnapshotFocus(id);
            setTab("provision");
          }}
        />
      ) : null}
      {tab === "workflow" ? (
        <BuilderWorkflowTab
          key={stepFocus ? `${stepFocus.runId}:${stepFocus.nodeId ?? ""}` : "runs"}
          runs={workflowRuns}
          truth={truth}
          truthError={truthError}
          focus={stepFocus}
          proposals={proposals}
          proposalsError={proposalsError}
        />
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
      {tab === "ai" ? <BuilderAiTab aiRuns={aiRuns} /> : null}
      {tab === "provision" ? <BuilderProvisionTab snapshots={snapshots} focusId={snapshotFocus} /> : null}
    </WindowPanel>
  );
}
