"use client";

/**
 * "This page" — the one window that says what a page holds, what can be done
 * on it, and which agents work on it. Opened from the header intelligence icon
 * and from the right-click menu (`surface:context`); `initialSection` picks the
 * tab. Everyone sees the same three sections in plain words and READ-ONLY;
 * admins also get the engineer's view (keys, rule editing, unwired targets,
 * counts, the Inspector) behind the admin selector.
 */

import { useClipboard } from "@ai-matrx/kit/clipboard";
import { copyNotify } from "@/lib/clipboard/copy-notify";
import { useEffect, useState } from "react";
import {
  Check,
  ChevronRight,
  CircleDot,
  Copy,
  Crosshair,
  FileText,
  RefreshCw,
  Search,
  ShieldCheck,
  TriangleAlert,
} from "lucide-react";
import {
  Badge,
  Button,
  EmptyState,
  Input,
  SegmentedControl,
  Tabs,
  type BadgeTone,
} from "@ai-matrx/design-system/controls";
import { CopyForAiButton } from "@/components/agent-copy/CopyForAiButton";
import { CopyForAiIcon } from "@/components/agent-copy/CopyForAiIcon";
import { WindowPanel } from "@/features/window-panels/WindowPanel";
import { getManifest } from "@/features/surfaces/manifests/registry";
import { SurfaceBoundAgentsList } from "@/features/surfaces/components/bind/SurfaceBoundAgentsList";
import { useOpenSurfaceContextInspector } from "@/features/overlays/openers/surfaceContextInspector";
import { getSurfaceDisplayLabel } from "@ai-matrx/chat/surfaces/utils/surface-display";
import { surfaceLevelPlace } from "@ai-matrx/chat/agents/redux/execution-system/context-rules/context-hierarchy";
import { useLiveSurfaceScope } from "@ai-matrx/chat/surfaces/runtime/useLiveSurfaceScope";
import { useAvailableHere } from "@ai-matrx/chat/surfaces/runtime/available-here";
import { locateSurfaceValueOnPage } from "@ai-matrx/chat/surfaces/utils/locate-on-page";
import { listLiveWriteTargets } from "@ai-matrx/chat/surfaces/runtime/surface-writeback";
import { surfaceAcceptsAgentBindings } from "@ai-matrx/chat/surfaces/runtime/registry";
import { useAgentLauncher } from "@ai-matrx/chat/agents/hooks/useAgentLauncher";
import { sourceFeatureFromSurfaceName } from "@ai-matrx/chat/agents/utils/source-feature-from-surface";
import type { ResolvedSurfaceValue } from "@ai-matrx/chat/surfaces/types";
import { AgentListDropdown } from "@ai-matrx/agents/catalog/react";
import { cn } from "@/lib/utils";
import { toast } from "@/lib/toast";
import { ErrorAlchemyMenu } from "@/components/errors/ErrorAlchemyMenu";
import { ReadFailure } from "@ai-matrx/design-system";
import { humanizeIdentifier } from "@ai-matrx/kit/text-case";
import { useIsMobile } from "@ai-matrx/kit/media-query";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import { ContextRulesTable, type ContextHierarchy } from "@ai-matrx/agents/context/react";
import { CONTEXT_RULES_FEATURE, DEFAULT_INLINE_CAP } from "@ai-matrx/agents/context";
import { ensureSurfaceFeatureLoaded } from "@ai-matrx/chat/surfaces/redux/userStateSlice";
import {
  saveContextRule,
  saveContextRules,
  selectSavedContextRuleRows,
} from "@ai-matrx/chat/agents/redux/execution-system/context-rules/context-rules.thunks";
import { surfaceContextRows } from "@ai-matrx/chat/agents/redux/execution-system/context-rules/surface-context-rows";
import { contextRowPlacer } from "@ai-matrx/chat/agents/redux/execution-system/context-rules/context-hierarchy";
import { selectIsAdmin } from "@/lib/redux/selectors/userSelectors";

export type SurfaceContextSection = "values" | "actions" | "agents";

export interface SurfaceContextWindowProps {
  isOpen: boolean;
  onClose: () => void;
  surfaceName: string;
  isEditable?: boolean;
  initialSection?: SurfaceContextSection;
}

function hasValue(value: unknown): boolean {
  if (value == null) return false;
  if (typeof value === "string") return value.length > 0;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "object") return Object.keys(value).length > 0;
  return true;
}

/**
 * Present but empty (`[]`, `{}`, `""`, `null`): the page answered with nothing.
 * It counts as supplied, never as missing (page-pass 2026-09-28).
 */
function isPresentEmpty(value: unknown): boolean {
  return value !== undefined && !hasValue(value);
}

function displayValue(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") return value;
  if (typeof value === "object") {
    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return "[Value cannot be serialized]";
    }
  }
  return String(value);
}

/** One line a person can scan: text trimmed, lists and records counted. */
function previewValue(value: unknown): string {
  if (!hasValue(value)) return "Empty";
  if (typeof value === "string") {
    const line = value.replace(/\s+/g, " ").trim();
    return line.length > 140 ? `${line.slice(0, 140)}…` : line;
  }
  if (Array.isArray(value)) return `${value.length} ${value.length === 1 ? "item" : "items"}`;
  if (typeof value === "object") {
    const n = Object.keys(value as object).length;
    return `${n} ${n === 1 ? "field" : "fields"}`;
  }
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return String(value);
}

type ApplyPolicy = "manual" | "ask" | "auto";

const POLICY_WORDS: Record<ApplyPolicy, { label: string; tone: BadgeTone }> = {
  ask: { label: "Needs your OK", tone: "warning" },
  manual: { label: "You do it", tone: "neutral" },
  auto: { label: "Applied automatically", tone: "success" },
};

function statusPresentation(status: ReturnType<typeof useLiveSurfaceScope>["status"]) {
  if (status === "live") {
    return { label: "Live", className: "text-emerald-600 dark:text-emerald-400" };
  }
  if (status === "snapshot") {
    return { label: "Snapshot", className: "text-amber-600 dark:text-amber-400" };
  }
  if (status === "error") {
    return { label: "Runtime error", className: "text-destructive" };
  }
  return { label: "No runtime", className: "text-muted-foreground" };
}

type ValueItem = {
  key: string;
  label: string;
  declaration: ResolvedSurfaceValue | null;
};

function ListRow({
  title,
  line,
  trailing,
  onPress,
  expanded,
  children,
}: {
  title: string;
  line?: string;
  trailing?: React.ReactNode;
  onPress?: () => void;
  expanded?: boolean;
  children?: React.ReactNode;
}) {
  const body = (
    <>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">{title}</span>
        {line ? (
          <span className="block truncate text-xs text-muted-foreground" title={line}>
            {line}
          </span>
        ) : null}
      </span>
      {trailing}
      {onPress ? (
        <ChevronRight
          className={cn(
            "h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform",
            expanded && "rotate-90",
          )}
        />
      ) : null}
    </>
  );
  return (
    <li className="border-b border-border last:border-b-0">
      {onPress ? (
        <button
          type="button"
          data-clickable
          onClick={onPress}
          aria-expanded={expanded}
          className="flex min-h-11 w-full items-center gap-2 px-3 py-1.5 text-left hover:bg-accent/50 sm:min-h-9"
        >
          {body}
        </button>
      ) : (
        <div className="flex min-h-11 items-center gap-2 px-3 py-1.5 sm:min-h-9">{body}</div>
      )}
      {expanded ? children : null}
    </li>
  );
}

function SectionHeading({ title, count }: { title: string; count?: number }) {
  return (
    <div className="flex items-center gap-2 px-3 pb-1 pt-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
      <span>{title}</span>
      {count !== undefined ? <span className="font-normal">{count}</span> : null}
    </div>
  );
}

export default function SurfaceContextWindow({
  isOpen,
  onClose,
  surfaceName,
  isEditable = false,
  initialSection = "values",
}: SurfaceContextWindowProps) {
  const { copyText: copyTextKit } = useClipboard({ notify: copyNotify });
  const live = useLiveSurfaceScope({ enabled: isOpen, surfaceName });
  const isAdmin = useAppSelector(selectIsAdmin);
  const availableHere = useAvailableHere({ surfaceName, enabled: isOpen });
  const manifest = getManifest(surfaceName);
  const declared = manifest?.values ?? [];
  const declaredNames = new Set(declared.map((value) => value.name));
  const runtimeOnlyKeys = Object.keys(live.scope).filter((key) => !declaredNames.has(key));

  const dispatch = useAppDispatch();
  const isMobile = useIsMobile();
  const { launchAgent } = useAgentLauncher();
  const openInspector = useOpenSurfaceContextInspector();

  useEffect(() => {
    if (isOpen && isAdmin) void dispatch(ensureSurfaceFeatureLoaded(CONTEXT_RULES_FEATURE));
  }, [dispatch, isOpen, isAdmin]);
  const savedRules = useAppSelector(selectSavedContextRuleRows);
  const contextRows = surfaceContextRows(surfaceName, live.scope, savedRules);
  const hierarchy: ContextHierarchy = { place: contextRowPlacer(surfaceName) };

  const [section, setSection] = useState<SurfaceContextSection>(initialSection);
  // A second open of the singleton with another section lands on it.
  useEffect(() => {
    setSection(initialSection);
  }, [initialSection]);
  const [valuesMode, setValuesMode] = useState<"values" | "rules">("values");
  const [query, setQuery] = useState("");
  const [openKey, setOpenKey] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const friendlySurfaceName = surfaceName ? getSurfaceDisplayLabel(surfaceName) : "This page";

  // ── What's here ─────────────────────────────────────────────────────────
  const items: ValueItem[] = [
    ...declared.map((declaration) => ({
      key: declaration.name,
      label: declaration.label,
      declaration,
    })),
    ...(isAdmin
      ? runtimeOnlyKeys.map((key) => ({
          key,
          label: humanizeIdentifier(key),
          declaration: null,
        }))
      : []),
  ];
  // A person reads what the page actually holds; admins also see what is absent.
  const shownItems = items.filter(
    (item) => isAdmin || live.scope[item.key] !== undefined,
  );
  const normalizedQuery = query.trim().toLowerCase();
  const filteredItems = normalizedQuery
    ? shownItems.filter((item) =>
        [item.label, isAdmin ? item.key : ""].some((v) =>
          v.toLowerCase().includes(normalizedQuery),
        ),
      )
    : shownItems;
  const filteredKeys = new Set(filteredItems.map((item) => item.key));
  const tableRows = contextRows.rows.filter((row) => filteredKeys.has(row.key));

  const supplied = declared.filter((value) => live.scope[value.name] !== undefined).length;
  const suppliedEmpty = declared.filter((value) => isPresentEmpty(live.scope[value.name])).length;
  const missingRequiredNames = declared
    .filter((value) => value.alwaysAvailable && live.scope[value.name] === undefined)
    .map((value) => value.label);

  // ── What can be done ────────────────────────────────────────────────────
  const liveWriteTargets = listLiveWriteTargets().filter(
    (entry) => !surfaceName || entry.surfaceName === surfaceName,
  );
  // A target whose read twin is a view-only value absent right now belongs to
  // another view of this page; its handler mounts with that view.
  const onOtherView = (entry: (typeof liveWriteTargets)[number]) => {
    const twin = entry.target.updatesValue;
    if (!twin) return false;
    const declaredTwin = declared.find((value) => value.name === twin);
    return Boolean(declaredTwin && !declaredTwin.alwaysAvailable && live.scope[twin] === undefined);
  };
  const wiredTargets = liveWriteTargets.filter((entry) => entry.hasHandler);
  const otherViewTargets = liveWriteTargets.filter((entry) => !entry.hasHandler && onOtherView(entry));
  const unwiredTargets = liveWriteTargets.filter((entry) => !entry.hasHandler && !onOtherView(entry));
  const clientTools = manifest?.clientTools ?? [];

  // What one more declared key would unlock — admin footer only.
  const missingKeyTally = new Map<string, number>();
  for (const item of availableHere.unavailable) {
    if (item.refusal.kind !== "missing_keys") continue;
    for (const key of item.refusal.missing) {
      missingKeyTally.set(key, (missingKeyTally.get(key) ?? 0) + 1);
    }
  }
  const topMissingKeys = [...missingKeyTally.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 8);

  const presentation = statusPresentation(live.status);
  const liveRuntimeFailed = live.status === "error";
  const actionCount = wiredTargets.length + availableHere.available.length + clientTools.length;

  const copyText = async (text: string, key: string) => {
    if (!(await copyTextKit(text))) return;
    setCopied(key);
    window.setTimeout(() => setCopied(null), 1200);
  };

  const locate = (key: string) => {
    if (!locateSurfaceValueOnPage(key)) {
      toast.message("Not shown on this page");
    }
  };

  const runAgent = async (agentId: string) => {
    try {
      await launchAgent(agentId, {
        surfaceKey: `surface-chrome:${surfaceName}:${agentId}`,
        sourceFeature: sourceFeatureFromSurfaceName(surfaceName) ?? "ai-results",
        config: { displayMode: "flexible-panel", allowChat: true, showVariablePanel: true },
        runtime: { surfaceName, applicationScope: live.scope },
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not run agent");
    }
  };

  if (!isOpen) return null;

  const valuesSection = (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 items-center gap-2 border-b border-border p-2">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-2 top-1/2 z-10 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            adornment="start"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Find a value"
            aria-label="Find a value"
          />
        </div>
        {isAdmin ? (
          <SegmentedControl
            aria-label="Values view"
            value={valuesMode}
            onValueChange={setValuesMode}
            data={[
              { value: "values", label: "Values" },
              { value: "rules", label: "Edit rules" },
            ]}
          />
        ) : null}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {live.status === "error" && shownItems.length === 0 ? (
          <ReadFailure error={live.error ?? true} what="this page's values" />
        ) : isAdmin && valuesMode === "rules" ? (
          <ContextRulesTable
            rows={tableRows}
            cap={DEFAULT_INLINE_CAP}
            hierarchy={hierarchy}
            density={isMobile ? "comfortable" : "compact"}
            selectedKey={null}
            onOpenRow={(key) => {
              setOpenKey(key);
              setValuesMode("values");
            }}
            onChange={(key, surfaceKey, next) =>
              void dispatch(saveContextRule({ surfaceKey, key, rule: next }))
            }
            onSetInclude={(changes) => void dispatch(saveContextRules(changes))}
            renderRowLead={(row) => {
              const state = contextRows.status[row.key];
              if (!state) return null;
              if (!state.declared) return <Badge tone="warning">Undeclared</Badge>;
              return (
                <span
                  title={
                    state.supplied === "present"
                      ? "Supplied"
                      : state.supplied === "empty"
                        ? "Supplied, empty"
                        : state.required
                          ? "Required, not supplied"
                          : "Not supplied"
                  }
                  className={cn(
                    "h-2 w-2 rounded-full",
                    state.supplied === "present"
                      ? "bg-emerald-500"
                      : state.supplied === "empty"
                        ? "border border-emerald-500 bg-transparent"
                        : state.required
                          ? "bg-destructive"
                          : "bg-muted-foreground/30",
                  )}
                />
              );
            }}
            renderRowTrail={(row) => <code className="text-xs">{row.key}</code>}
          />
        ) : filteredItems.length === 0 ? (
          <EmptyState
            icon={<FileText />}
            title={normalizedQuery ? "No match" : "Nothing here yet"}
          />
        ) : (
          <ul>
            {filteredItems.map((item) => {
              const raw = live.scope[item.key];
              const expanded = openKey === item.key;
              const supplied_ = raw !== undefined;
              return (
                <ListRow
                  key={item.key}
                  title={item.label}
                  line={supplied_ ? previewValue(raw) : "Not available"}
                  onPress={() => setOpenKey(expanded ? null : item.key)}
                  expanded={expanded}
                  trailing={
                    isAdmin ? (
                      <code className="hidden max-w-[40%] shrink-0 truncate text-xs text-muted-foreground sm:block">
                        {item.key}
                      </code>
                    ) : null
                  }
                >
                  <div className="space-y-2 bg-muted/15 px-3 pb-3 pt-1">
                    {hasValue(raw) ? (
                      <pre className="max-h-64 overflow-auto whitespace-pre-wrap break-words rounded-md border border-border bg-card p-3 font-mono text-xs leading-relaxed">
                        {displayValue(raw)}
                      </pre>
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        {supplied_ ? "Empty" : "Not available"}
                      </p>
                    )}
                    <div className="flex items-center gap-1.5">
                      <Button
                        variant="quiet"
                        icon={<Crosshair />}
                        onClick={() => locate(item.key)}
                      >
                        Locate
                      </Button>
                      <Button
                        variant="quiet"
                        icon={copied === item.key ? <Check /> : <Copy />}
                        disabled={!hasValue(raw)}
                        onClick={() => void copyText(displayValue(raw), item.key)}
                      >
                        Copy
                      </Button>
                    </div>
                  </div>
                </ListRow>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );

  const actionsSection = (
    <div className="min-h-0 flex-1 overflow-y-auto pb-2">
      {/* Declared descriptions are agent-facing prompts; never rendered to a person. */}
      <SectionHeading title="Changes" count={wiredTargets.length} />
      {wiredTargets.length === 0 ? (
        <p className="px-3 py-2 text-xs text-muted-foreground">Nothing to change here.</p>
      ) : (
        <ul>
          {wiredTargets.map((entry) => {
            const policy = POLICY_WORDS[(entry.target.applyPolicy ?? "manual") as ApplyPolicy];
            return (
              <ListRow
                key={`${entry.surfaceName}:${entry.target.name}`}
                title={entry.target.label}
                trailing={<Badge tone={policy.tone}>{policy.label}</Badge>}
              />
            );
          })}
        </ul>
      )}
      {isAdmin && unwiredTargets.length + otherViewTargets.length > 0 ? (
        <>
          <SectionHeading title="Not wired" count={unwiredTargets.length + otherViewTargets.length} />
          <ul>
            {[...unwiredTargets, ...otherViewTargets].map((entry) => (
              <ListRow
                key={`${entry.surfaceName}:${entry.target.name}`}
                title={entry.target.label}
                line={entry.target.name}
                trailing={
                  <Badge tone={unwiredTargets.includes(entry) ? "destructive" : "neutral"}>
                    {unwiredTargets.includes(entry) ? "No handler" : "Other view"}
                  </Badge>
                }
              />
            ))}
          </ul>
        </>
      ) : null}

      <SectionHeading title="Shortcuts" count={availableHere.available.length} />
      {availableHere.available.length === 0 ? (
        <p className="px-3 py-2 text-xs text-muted-foreground">
          {availableHere.settled ? "No shortcuts here." : "Loading…"}
        </p>
      ) : (
        <ul>
          {availableHere.available.map((item) => (
            <ListRow key={item.id} title={item.label} />
          ))}
        </ul>
      )}

      <SectionHeading title="Page tools" count={clientTools.length} />
      {clientTools.length === 0 ? (
        <p className="px-3 py-2 text-xs text-muted-foreground">No page tools.</p>
      ) : (
        <ul>
          {clientTools.map((tool) => (
            <ListRow
              key={tool.name}
              title={tool.label}
              trailing={tool.mode ? <Badge>{tool.mode === "ui" ? "On screen" : tool.mode === "draft" ? "Draft" : "Saves"}</Badge> : null}
            />
          ))}
        </ul>
      )}
    </div>
  );

  const agentsSection = (
    <div className="min-h-0 flex-1 overflow-y-auto p-3">
      {surfaceName && surfaceAcceptsAgentBindings(surfaceName) ? (
        <SurfaceBoundAgentsList
          key={surfaceName}
          surfaceName={surfaceName}
          isEditable={isEditable}
          onRunAgent={(agentId) => runAgent(agentId)}
          addLabel="Bind an agent to this page"
          emptyMessage="No agents bound yet."
        />
      ) : surfaceName ? (
        <AgentListDropdown
          onSelect={(agentId: string) => void runAgent(agentId)}
          label="Run an agent on this page…"
          compact
        />
      ) : (
        <EmptyState icon={<FileText />} title="No agents on this page" />
      )}
    </div>
  );

  return (
    <WindowPanel
      id="surface-context-window"
      overlayId="surfaceContextWindow"
      onClose={onClose}
      titleNode={
        <div className="flex min-w-0 items-center gap-1.5">
          <FileText className="h-4 w-4 shrink-0 text-primary" />
          <span
            className="truncate text-sm font-semibold"
            data-surface-name={surfaceName || undefined}
          >
            This page
          </span>
          <span className="truncate text-xs text-muted-foreground">
            {surfaceName ? surfaceLevelPlace(surfaceName).path.join(" › ") : friendlySurfaceName}
          </span>
        </div>
      }
      width={560}
      height={640}
      minWidth={340}
      minHeight={360}
      position="center"
      bodyClassName="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden p-0"
      actionsRight={
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            onClick={live.refresh}
            className="grid h-6 w-6 place-items-center rounded text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            title="Refresh"
            aria-label="Refresh"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
          {isAdmin ? (
            <>
              <button
                type="button"
                onClick={() =>
                  openInspector({
                    surfaceName: surfaceName || null,
                    isEditable,
                    preferRuntime: true,
                  })
                }
                className="grid h-6 w-6 place-items-center rounded text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                title="Open the Inspector"
                aria-label="Open the Inspector"
              >
                <ShieldCheck className="h-3.5 w-3.5" />
              </button>
              <CopyForAiButton
                compact
                icon={CopyForAiIcon}
                label={`${friendlySurfaceName} page context`}
                agent={() => ({
                  kind: "surface-context",
                  location: `${friendlySurfaceName} — This page`,
                  description:
                    "The current live values and declared variable contract for this page surface.",
                  attributes: {
                    status: live.status,
                    declared: declared.length,
                    supplied,
                    suppliedEmpty,
                    writeTargets: liveWriteTargets.length,
                    unwiredWriteTargets: unwiredTargets.length,
                    availableHere: availableHere.available.length,
                  },
                  context: {
                    surface: friendlySurfaceName,
                    surface_key: surfaceName || undefined,
                    editable: isEditable,
                  },
                  data: {
                    liveValues: live.scope,
                    declarations: declared,
                    runtimeOnlyKeys,
                    missingRequired: missingRequiredNames.length,
                    runtimeError: live.error,
                    writeTargets: liveWriteTargets.map((entry) => ({
                      name: entry.target.name,
                      label: entry.target.label,
                      mode: entry.target.mode,
                      applyPolicy: entry.target.applyPolicy ?? "manual",
                      updatesValue: entry.target.updatesValue ?? null,
                      description: entry.target.description,
                      hasHandler: entry.hasHandler,
                    })),
                    availableHere: availableHere.available.map((item) => ({
                      label: item.label,
                      requirements: item.requirements,
                      mandate: item.mandateKey,
                    })),
                    missingKeyUnlocks: Object.fromEntries(topMissingKeys),
                  },
                })}
              />
              <button
                type="button"
                onClick={() => void copyText(JSON.stringify(live.scope, null, 2), "all")}
                className="grid h-6 w-6 place-items-center rounded text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                title="Copy all values"
                aria-label="Copy all values"
              >
                {copied === "all" ? (
                  <Check className="h-3.5 w-3.5 text-emerald-500" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
              </button>
            </>
          ) : null}
        </div>
      }
      footerLeft={
        <div className="flex flex-wrap items-center gap-x-3 text-[11px] text-muted-foreground">
          <span className={cn("flex items-center gap-1", presentation.className)}>
            {live.status === "live" ? <CircleDot className="h-2.5 w-2.5 fill-current" /> : null}
            {presentation.label}
          </span>
          {isAdmin ? (
            <>
              <span>
                <b className="text-foreground">{supplied}</b>/{declared.length} supplied
                {suppliedEmpty > 0 ? ` (${suppliedEmpty} empty)` : ""}
              </span>
              {missingRequiredNames.length > 0 ? (
                <span
                  className="flex items-center gap-1 text-destructive"
                  title={`Promised on every open but absent: ${missingRequiredNames.join(", ")}`}
                >
                  <TriangleAlert className="h-3 w-3" />
                  {missingRequiredNames.length} required missing
                </span>
              ) : null}
              {!liveRuntimeFailed && unwiredTargets.length > 0 ? (
                <span className="flex items-center gap-1 text-destructive">
                  <TriangleAlert className="h-3 w-3" />
                  {unwiredTargets.length} unwired
                </span>
              ) : null}
              {!liveRuntimeFailed && runtimeOnlyKeys.length > 0 ? (
                <span>{runtimeOnlyKeys.length} runtime-only</span>
              ) : null}
              {availableHere.loaded && topMissingKeys.length > 0 ? (
                <span
                  className="text-amber-600 dark:text-amber-400"
                  title={topMissingKeys.map(([key, count]) => `${key}: unlocks ${count}`).join("\n")}
                >
                  {missingKeyTally.size} keys short
                </span>
              ) : null}
            </>
          ) : null}
        </div>
      }
      footerRight={
        isAdmin && surfaceName ? (
          <code className="max-w-[260px] truncate font-mono text-xs text-muted-foreground">
            {surfaceName}
          </code>
        ) : null
      }
    >
      <div className="shrink-0 px-2">
        <Tabs
          aria-label="This page"
          value={section}
          onValueChange={setSection}
          data={[
            { value: "values", label: "What's here", count: shownItems.length },
            { value: "actions", label: "What can be done", count: actionCount },
            { value: "agents", label: "Agents" },
          ]}
        />
      </div>
      {section === "values" ? valuesSection : section === "actions" ? actionsSection : agentsSection}
      {live.error ? (
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 rounded-md border border-destructive/30 bg-background px-3 py-2 text-xs text-destructive shadow-lg">
          {live.error}
          <ErrorAlchemyMenu error={live.error} />
        </div>
      ) : null}
    </WindowPanel>
  );
}
