"use client";

import { useClipboard } from "@ai-matrx/kit/clipboard";
import { copyNotify } from "@/lib/clipboard/copy-notify";
import { useState, useMemo, useEffect, useRef } from "react";
import {
  Save,
  AlertTriangle,
  Eye,
  Trash2,
  WrenchIcon,
  Settings2,
  Code2,
  SlidersHorizontal,
  ClipboardCopy,
  Braces,
  Loader2,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ErrorNotice } from "@ai-matrx/design-system";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  useModelControls,
  ControlDefinition,
  NormalizedControls,
} from "@ai-matrx/chat/agents/hooks/useModelControls";
import { useModelClassControls } from "@ai-matrx/chat/agents/identity/model-catalog";
import { useAppSelector, useAppDispatch } from "@/lib/redux/hooks";
import {
  selectAgentSettings,
  selectAgentModelId,
  selectAgentTools,
  selectAgentOutputSchema,
  selectAgentVariableDefinitions,
  selectAgentUiGates,
} from "@ai-matrx/chat/agents/redux/agent-definition/selectors";
import {
  setAgentControlBinding, setAgentSettings, setAgentField, setAgentTools,
} from "@/features/agents/redux/agent-builder.slice";
import { selectAllModels, selectModelFullyLoaded } from "@ai-matrx/agents/models";
import { getModelRecords, useModelRecords } from "@ai-matrx/chat/agents/identity/model-catalog";
import { useModelCatalog } from "@ai-matrx/agents/models/react";
import { withOfferingPin } from "@/features/ai-models/utils/offering-pin";
import type {
  LLMParams,
  FeLlmParams,
} from "@ai-matrx/chat/agents/types/agent-api-types";
import type { ModelConstraint } from "@/features/ai-models/types";
import { useConfigValidation } from "./validation/useConfigValidation";
import type { ValidationIssue } from "./validation/types";
import {
  applyAllFixableIssues,
  canFixIssue,
} from "./validation/apply-fix";
import {
  analyzeModelChange,
  planNeedsNoDecision,
  type ModelChangePlan,
} from "./reconciliation/analyze";
import { ModelChangeReconciliation } from "./reconciliation/ModelChangeReconciliation";
import { ModelSettingsPanel } from "@ai-matrx/agents/settings/react";
import { agentCapabilitiesTarget, agentSettingsTarget } from "./agent-settings-target";
import { SettingsJsonEditor } from "./json/SettingsJsonEditor";
import { OutputSchemaTab } from "./output-schema/OutputSchemaTab";
import { MatrxDirectivesTab } from "./matrx-directives/MatrxDirectivesTab";
import { validateOutputSchema } from "./output-schema/validateOutputSchema";
import { useSessionKnob } from "@/lib/scoped-config/sessionKnob";
import {
  CONTROL_BINDABLE_KNOB,
  readControlBindablePolicy,
} from "@ai-matrx/chat/agents/utils/control-variables";
import {
  buildSettingsDocument,
  parseSettingsDocument,
} from "./settings-document";
import { toast } from "@/lib/toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ErrorAlchemyMenu } from "@/components/errors/ErrorAlchemyMenu";
import { humanizeIdentifier } from "@ai-matrx/kit/text-case";
import { copyToClipboard } from "@/lib/clipboard/copy";

// ── Tab type ─────────────────────────────────────────────────────────────────
type SettingsTab =
  | "settings"
  | "raw"
  | "raw-edit"
  | "model-config"
  | "output-schema"
  | "matrx-directives";

// NOTE: media inputs (image_input, start_image, end_image, mask, etc.) do
// NOT belong on agent settings — they're per-run user inputs that flow
// through user message parts. See MEDIA_GENERATION_SETTINGS.md §13 for
// the architecture. The AgentSettingMediaPicker component is kept as a
// building block for the user-input side (where the engineer-overridable
// equivalents will be configured), not used here.

// ── HighlightedJson ──────────────────────────────────────────────────────────
// A read-only syntax-highlighted JSON viewer with a floating copy button.
interface HighlightedJsonProps {
  value: Record<string, unknown>;
  highlightKeys?: Record<string, "error" | "warning" | "info">;
}

function HighlightedJson({ value, highlightKeys = {} }: HighlightedJsonProps) {
  const { copyText } = useClipboard({
    notify: copyNotify,
  });
  const [copied, setCopied] = useState(false);

  const raw = useMemo(() => JSON.stringify(value, null, 2), [value]);
  const lines = useMemo(() => raw.split("\n"), [raw]);

  const handleCopy = () => {
    copyText(raw).then((copied) => {
      if (!copied) return;
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  return (
    <div className="relative group">
      {/* Copy button — floats top-right, visible on hover */}
      <button
        onClick={handleCopy}
        className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity
          flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium
          bg-card border border-border text-muted-foreground hover:text-foreground
          shadow-sm"
      >
        {copied ? "Copied!" : "Copy"}
      </button>

      <pre
        className="type-secondary font-mono leading-5 overflow-auto rounded p-3 select-text
 bg-zinc-100 dark:bg-zinc-800
 text-zinc-800 dark:text-zinc-200"
      >
        {lines.map((line, i) => {
          const keyMatch = line.match(/^\s*"([^"]+)":/);
          const key = keyMatch?.[1];
          const highlight = key ? highlightKeys[key] : undefined;
          const colored = colorizeJsonLine(line);

          if (highlight) {
            const cls =
              highlight === "error"
                ? "bg-red-100 dark:bg-red-950/50 border-l-4 border-red-500 dark:border-red-400"
                : highlight === "warning"
                  ? "bg-yellow-100 dark:bg-yellow-900 border-l-4 border-yellow-500 dark:border-yellow-400"
                  : "bg-blue-100 dark:bg-blue-950/40 border-l-4 border-blue-500 dark:border-blue-400";
            return (
              <span key={i} className={`block -mx-3 px-3 ${cls}`}>
                <span dangerouslySetInnerHTML={{ __html: colored }} />
                {"\n"}
              </span>
            );
          }

          return (
            <span key={i}>
              <span dangerouslySetInnerHTML={{ __html: colored }} />
              {"\n"}
            </span>
          );
        })}
      </pre>
    </div>
  );
}

/**
 * Tokenize a single JSON.stringify(…, null, 2) line into colored HTML spans.
 * Works for both light and dark. The key and the value are split ONCE and each
 * is colored whole — never pattern-replaced inside a string, which rewrote an
 * aspect ratio "16:9" as "16: 9" in the Raw Settings view.
 */
function colorizeJsonLine(line: string): string {
  const esc = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  const colorValue = (text: string): string => {
    const m = text.match(/^(.*?)(,?)$/);
    const body = m ? m[1] : text;
    const comma = m ? m[2] : "";
    let cls: string | null = null;
    if (/^"(?:[^"\\]|\\.)*"$/.test(body)) {
      cls = "text-emerald-700 dark:text-emerald-400";
    } else if (body === "true" || body === "false") {
      cls = "text-violet-700 dark:text-violet-400";
    } else if (body === "null") {
      cls = "text-zinc-500";
    } else if (/^-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?$/.test(body)) {
      cls = "text-amber-700 dark:text-amber-400";
    }
    return cls
      ? `<span class="${cls}">${esc(body)}</span>${comma}`
      : esc(text);
  };

  const keyed = line.match(/^(\s*)("(?:[^"\\]|\\.)*")(\s*:\s*)(.*)$/);
  if (keyed) {
    const [, indent, key, sep, rest] = keyed;
    return `${indent}<span class="text-sky-700 dark:text-sky-400">${esc(key)}</span>${sep}${colorValue(rest)}`;
  }
  const indentMatch = line.match(/^(\s*)(.*)$/);
  return `${indentMatch?.[1] ?? ""}${colorValue(indentMatch?.[2] ?? line)}`;
}

// ── IssueTable ────────────────────────────────────────────────────────────────

interface IssueTableProps {
  issues: ValidationIssue[];
  diagnosticPayload?: Record<string, unknown>;
  onView: (key: string) => void;
  onRemove: (key: string) => void;
  onFixEnum: (key: string) => void;
  onFixAll?: () => void;
  onRemoveAllUnknown?: () => void;
  onResetAll?: () => void;
  fixableCount?: number;
  unknownCount?: number;
}

function IssueTable({
  issues,
  diagnosticPayload,
  onView,
  onRemove,
  onFixEnum,
  onFixAll,
  onRemoveAllUnknown,
  onResetAll,
  fixableCount = 0,
  unknownCount = 0,
}: IssueTableProps) {
  const [copied, setCopied] = useState(false);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);

  if (issues.length === 0) return null;

  const handleCopyDiagnostic = () => {
    if (!diagnosticPayload) return;
    void copyToClipboard(JSON.stringify(diagnosticPayload, null, 2)).then((ok) => {
      if (!ok) return;
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  return (
    <TooltipProvider delayDuration={300}>
      <div className="rounded border border-yellow-400 dark:border-yellow-600 overflow-hidden mb-3">
        {/* Warning section header */}
        <div className="flex items-center gap-2 px-2.5 py-1.5 bg-yellow-50 dark:bg-yellow-950/40 border-b border-yellow-300 dark:border-yellow-700">
          <AlertTriangle className="h-3.5 w-3.5 text-yellow-600 dark:text-yellow-400 flex-shrink-0" />
          <span className="type-secondary font-semibold text-yellow-800 dark:text-yellow-300">
            Settings Warnings
          </span>
          <div className="ml-auto flex items-center gap-1.5">
            <span className="type-meta text-yellow-600 dark:text-yellow-500">
              {issues.length} issue{issues.length !== 1 ? "s" : ""} detected
            </span>
            {/* In the header bar that owns this section — never a row of its own. */}
            <ErrorAlchemyMenu error={issues} operation="Validate this agent's settings" />
            {diagnosticPayload && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={handleCopyDiagnostic}
                    className="h-5 w-5 flex items-center justify-center rounded text-yellow-600 dark:text-yellow-400 hover:bg-yellow-200 dark:hover:bg-yellow-900/40 transition-colors"
                  >
                    <ClipboardCopy className="h-3 w-3" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="type-secondary">
                  {copied ? "Copied!" : "Copy full diagnostic payload"}
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        </div>

        {/* Bulk action toolbar */}
        {(onFixAll || onRemoveAllUnknown || onResetAll) && (
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-yellow-50/40 dark:bg-yellow-950/30 border-b border-yellow-200 dark:border-yellow-800/50 flex-wrap">
            {onFixAll && fixableCount > 0 && (
              <Button
                variant="outline"
                onClick={onFixAll}
                title="Apply the suggested fix to every fixable issue"
              >
                Fix all fixable ({fixableCount})
              </Button>
            )}
            {onRemoveAllUnknown && unknownCount > 0 && (
              <Button
                variant="outline"
                onClick={onRemoveAllUnknown}
                title="Remove every unknown/unsupported key"
              >
                Remove all unknown ({unknownCount})
              </Button>
            )}
            {onResetAll && (
              <Button
                variant="outline"
                className="ml-auto"
                onClick={() => setResetConfirmOpen(true)}
                title="Clear every setting — starts from an empty object"
              >
                Reset all settings
              </Button>
            )}
          </div>
        )}

        {/* Column headers — 4 columns: setting | detail | type | actions */}
        <div className="grid grid-cols-[120px_1fr_80px_48px] items-center gap-2 px-2.5 py-1 bg-yellow-50/60 dark:bg-yellow-950/20 border-b border-yellow-200 dark:border-yellow-800/50">
          <span className="type-meta font-semibold uppercase tracking-wide text-yellow-700 dark:text-yellow-500">
            Setting
          </span>
          <span className="type-meta font-semibold uppercase tracking-wide text-yellow-700 dark:text-yellow-500">
            Issue Detail
          </span>
          <span className="type-meta font-semibold uppercase tracking-wide text-yellow-700 dark:text-yellow-500">
            Type
          </span>
          <span className="type-meta font-semibold uppercase tracking-wide text-yellow-700 dark:text-yellow-500 text-right">
            Options
          </span>
        </div>

        {issues.map((issue, idx) => {
          const isLast = idx === issues.length - 1;
          const isUnrecognized = issue.category === "unrecognized_key";

          return (
            <div
              key={`${issue.ruleId}-${issue.key}`}
              className={`grid grid-cols-[120px_1fr_80px_48px] items-center gap-2 px-2.5 py-1.5 ${
                !isLast
                  ? "border-b border-yellow-200 dark:border-yellow-800/40"
                  : ""
              } ${
                isUnrecognized
                  ? "bg-yellow-50/30 dark:bg-yellow-950/15"
                  : "bg-orange-50/30 dark:bg-orange-950/15"
              }`}
            >
              {/* setting key */}
              <span className="type-secondary text-foreground truncate">
                {humanizeIdentifier(issue.key)}
              </span>

              {/* detail */}
              <span className="type-secondary text-foreground/80 leading-snug">
                {issue.message || "—"}
              </span>

              {/* type — plain text, no badge */}
              <span
                className={`text-xs font-medium ${isUnrecognized ? "text-yellow-700 dark:text-yellow-400" : "text-orange-700 dark:text-orange-400"}`}
              >
                {isUnrecognized ? "Unknown Key" : "Invalid Value"}
              </span>

              {/* actions: View + Remove/Fix */}
              <div className="flex items-center gap-0 flex-shrink-0 justify-end">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      icon={<Eye />} aria-label="View in Raw JSON"
                      variant="quiet"
                      onClick={() => onView(issue.key)}
                    />
                  </TooltipTrigger>
                  <TooltipContent side="top" className="type-secondary">
                    View in Raw JSON
                  </TooltipContent>
                </Tooltip>

                {isUnrecognized ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        icon={<Trash2 />} aria-label="Remove this key"
                        variant="quiet"
                        onClick={() => onRemove(issue.key)}
                      />
                    </TooltipTrigger>
                    <TooltipContent side="top" className="type-secondary">
                      Remove this key
                    </TooltipContent>
                  </Tooltip>
                ) : (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        icon={<WrenchIcon />} aria-label="Reset to default value"
                        variant="quiet"
                        onClick={() => onFixEnum(issue.key)}
                      />
                    </TooltipTrigger>
                    <TooltipContent side="top" className="type-secondary">
                      Reset to default value
                    </TooltipContent>
                  </Tooltip>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <AlertDialog open={resetConfirmOpen} onOpenChange={setResetConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset all settings?</AlertDialogTitle>
            <AlertDialogDescription>
              This clears every setting on this agent to an empty object. The
              model stays the same. You can re-enable individual settings
              afterward, or pick defaults from the new model.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setResetConfirmOpen(false);
                onResetAll?.();
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Reset everything
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </TooltipProvider>
  );
}

// ── ModelConfigViewer ─────────────────────────────────────────────────────────
function ModelConfigViewer({
  normalizedControls,
}: {
  normalizedControls: NormalizedControls;
}) {
  const entries = useMemo(() => {
    const result: { key: string; control: ControlDefinition }[] = [];
    Object.entries(normalizedControls).forEach(([key, val]) => {
      if (key === "rawControls" || key === "unmappedControls") return;
      if (val && typeof val === "object" && "type" in val) {
        result.push({ key, control: val as ControlDefinition });
      }
    });
    return result.sort((a, b) => a.key.localeCompare(b.key));
  }, [normalizedControls]);

  const unmapped = useMemo(
    () => Object.entries(normalizedControls.unmappedControls),
    [normalizedControls],
  );

  return (
    <div className="space-y-3">
      {/* Parameters this model exposes; they drive which settings appear in the Settings tab. */}
      {entries.length === 0 ? (
        <p className="type-secondary text-muted-foreground italic">
          No controls defined for this model.
        </p>
      ) : (
        <div className="rounded border border-border overflow-hidden">
          {/* Fixed columns — Range/Options column scrolls horizontally per-row */}
          <div className="grid grid-cols-[1fr_70px_160px_70px] gap-2 px-2.5 py-1 bg-muted/50 border-b border-border">
            <span className="type-meta font-semibold uppercase tracking-wide text-muted-foreground">
              Key
            </span>
            <span className="type-meta font-semibold uppercase tracking-wide text-muted-foreground">
              Type
            </span>
            <span className="type-meta font-semibold uppercase tracking-wide text-muted-foreground">
              Range / Options
            </span>
            <span className="type-meta font-semibold uppercase tracking-wide text-muted-foreground">
              Default
            </span>
          </div>
          {entries.map(({ key, control }, idx) => {
            const rangeOrOptions =
              control.type === "enum" && control.enum?.length
                ? control.enum.join(", ")
                : control.min !== undefined && control.max !== undefined
                  ? `${control.min} – ${control.max}`
                  : "—";

            return (
              <div
                key={key}
                className={`grid grid-cols-[1fr_70px_160px_70px] gap-2 px-2.5 py-1.5 text-xs items-center ${
                  idx < entries.length - 1 ? "border-b border-border" : ""
                } ${idx % 2 === 0 ? "bg-background" : "bg-muted/20"}`}
              >
                <span className="font-mono text-foreground truncate">
                  {key}
                </span>
                <span className="text-muted-foreground">{control.type}</span>
                {/* scrollable horizontally so long enum lists are never cut off */}
                <div className="overflow-x-auto">
                  <span className="text-muted-foreground type-meta whitespace-nowrap">
                    {rangeOrOptions}
                  </span>
                </div>
                <span className="font-mono text-muted-foreground type-meta truncate">
                  {control.default !== undefined && control.default !== null
                    ? String(control.default)
                    : "—"}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {unmapped.length > 0 && (
        <div>
          <p className="type-meta font-semibold uppercase tracking-wide text-muted-foreground mb-1">
            Unmapped controls
          </p>
          {/* Full JSON, no height cap — everything visible */}
          <pre className="type-meta font-mono bg-muted/30 rounded p-2 overflow-x-auto text-muted-foreground whitespace-pre-wrap break-all">
            {JSON.stringify(Object.fromEntries(unmapped), null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}

// ── VSCode-style Tab Bar ──────────────────────────────────────────────────────
interface TabBarProps {
  active: SettingsTab;
  onChange: (tab: SettingsTab) => void;
  issueCount: number;
}

function TabBar({ active, onChange, issueCount }: TabBarProps) {
  const tabs: { id: SettingsTab; label: string; icon: React.ReactNode }[] = [
    {
      id: "settings",
      label: "Settings",
      icon: <SlidersHorizontal className="h-3 w-3" />,
    },
    {
      id: "raw",
      label: "Raw Settings",
      icon: <Code2 className="h-3 w-3" />,
    },
    {
      id: "raw-edit",
      label: "Raw Editable",
      icon: <Save className="h-3 w-3" />,
    },
    {
      id: "model-config",
      label: "Model Config",
      icon: <Settings2 className="h-3 w-3" />,
    },
    {
      id: "output-schema",
      label: "Output Schema",
      icon: <Braces className="h-3 w-3" />,
    },
    {
      id: "matrx-directives",
      label: "Matrx Directives",
      icon: <Zap className="h-3 w-3" />,
    },
  ];

  return (
    <div className="flex overflow-x-auto border-b border-border flex-shrink-0 -mx-3 px-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {tabs.map((tab) => {
        const isActive = active === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={`relative flex shrink-0 items-center gap-1.5 whitespace-nowrap px-3 py-2 text-xs font-medium transition-colors select-none ${
              isActive
                ? "text-foreground border-b-2 border-primary -mb-px"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.icon}
            {tab.label}
            {tab.id === "settings" && issueCount > 0 && (
              <span className="ml-0.5 inline-flex items-center justify-center w-3.5 h-3.5 rounded-full bg-yellow-500 text-[9px] font-bold text-white leading-none">
                {issueCount > 9 ? "9+" : issueCount}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

// ── AgentSettingsCore ────────────────────────────────────────────────────────

interface AgentSettingsCoreProps {
  agentId: string;
  /**
   * Reports whether the currently-open JSON editor (Raw Editable / Output
   * Schema) has unapplied edits — buffer changes that will be lost unless the
   * user clicks Apply. Lets the host (modal) warn before closing.
   */
  onUnappliedEditsChange?: (dirty: boolean) => void;
}

export function AgentSettingsCore({
  agentId,
  onUnappliedEditsChange,
}: AgentSettingsCoreProps) {
  const dispatch = useAppDispatch();

  const settings = useAppSelector((state) =>
    selectAgentSettings(state, agentId),
  );
  const modelId = useAppSelector((state) => selectAgentModelId(state, agentId));
  const agentTools = useAppSelector((state) =>
    selectAgentTools(state, agentId),
  );
  const models = useModelRecords(selectAllModels);
  const variableDefinitions = useAppSelector((state) =>
    selectAgentVariableDefinitions(state, agentId),
  );
  // Which controls this organization lets an agent expose as run inputs.
  const bindablePolicy = readControlBindablePolicy(
    useSessionKnob(CONTROL_BINDABLE_KNOB),
  );
  const outputSchema = useAppSelector((state) =>
    selectAgentOutputSchema(state, agentId),
  );
  const uiGates = useAppSelector((state) => selectAgentUiGates(state, agentId));
  const isModelFull = useModelRecords((state) =>
    selectModelFullyLoaded(state, modelId),
  );
  const registryLoading = useModelRecords((s) => s.isLoading);
  const registryError = useModelRecords((s) => s.error);

  // Settings need the model's full controls blob. The registry may only hold
  // lightweight options (or nothing) until explicitly fetched — same pattern as
  // the chat's ConversationModelSettings and the canonical model picker.
  useEffect(() => {
    getModelRecords().loadOptions();
  }, [dispatch]);

  useEffect(() => {
    if (modelId && !isModelFull && !registryLoading) {
      getModelRecords().loadModel(modelId);
    }
  }, [dispatch, modelId, isModelFull, registryLoading]);

  // The pinned CLASS's controls (Matrx Lightning ≠ Matrx Fast), not the
  // preferred class's.
  const classControls = useModelClassControls(
    modelId,
    typeof settings?.offering_id === "string" ? settings.offering_id : null,
  );
  const { normalizedControls, error } = useModelControls(
    models,
    modelId ?? "",
    classControls,
  );

  // Model catalog (ai.model_offering tiers) — the client source of each
  // model's offering uuids. The model-swap reconciliation checks a pinned
  // settings.offering_id against the NEW model's offerings and clears stale
  // pins (an ai.offering is model × endpoint × api — it belongs to exactly
  // one model, so a pin never survives a genuine model change).
  const { models: catalogModels } = useModelCatalog("user");
  const offeringIdsByModel = useMemo(() => {
    // Not loaded (or failed) → null: the offering check is skipped rather than
    // guess-clearing a pin without data.
    if (catalogModels.length === 0) return null;
    const map = new Map<string, string[]>();
    for (const m of catalogModels) {
      map.set(
        m.id,
        m.tiers.map((t) => t.offeringId),
      );
    }
    return map;
  }, [catalogModels]);

  // `settings` is null until the agent record hydrates (selectAgentSettings →
  // `record?.settings ?? null`). Hooks below read this nullable value directly
  // (they already tolerate null); the render body reads the guaranteed-non-null
  // `currentSettings`, declared AFTER the hydration guard near the early returns
  // so an edit made before hydration can never round-trip `{ ...{}, key: value }`
  // back to Redux and silently drop every other real setting on save.

  const modelConstraints = useMemo(() => {
    if (!modelId) return null;
    const model = models.find((m) => m.id === modelId);
    const raw = model?.constraints;
    if (!Array.isArray(raw) || raw.length === 0) return null;
    return raw as import("@/features/ai-models/types").ModelConstraint[];
  }, [modelId, models]);

  const [activeTab, setActiveTab] = useState<SettingsTab>("settings");

  // Unapplied-edits tracking for the JSON editors (Raw Editable / Output
  // Schema). Only one editor is mounted at a time; switching tabs discards any
  // pending buffer, so reset on tab change and report the state to the host.
  const [editorDirty, setEditorDirty] = useState(false);
  useEffect(() => {
    setEditorDirty(false);
  }, [activeTab]);
  useEffect(() => {
    onUnappliedEditsChange?.(editorDirty);
  }, [editorDirty, onUnappliedEditsChange]);

  const [jsonText, setJsonText] = useState("");

  // ── Validation engine ──────────────────────────────────────────────────────
  // useConfigValidation accepts `FeLlmParams | null` and handles the null
  // (pre-hydration) case, so pass the nullable selector value straight through.
  const { validation, highlightMap: jsonHighlights } = useConfigValidation({
    settings,
    modelId,
    normalizedControls,
    constraints: modelConstraints,
  });
  const allIssues = validation.issues;
  // A set value the model does not carry natively is KEPT — the server
  // translates it (settings-translation K7). THE panel draws it under
  // "Translated for this model" (`extraSettingKeys`), never as a warning.
  const warningIssues = allIssues.filter(
    (i) => i.category !== "unsupported_by_model",
  );

  const diagnosticPayload = useMemo(() => {
    if (allIssues.length === 0) return undefined;
    const model = models.find((m) => m.id === modelId);
    return {
      model_id: modelId,
      model_name: model?.name ?? null,
      raw_settings: settings,
      constraints: modelConstraints,
      issues: allIssues.map((i) => ({
        rule: i.ruleId,
        key: i.key,
        severity: i.severity,
        category: i.category,
        message: i.message,
        current_value: i.value,
        suggestion: i.suggestion,
      })),
    };
  }, [allIssues, modelId, models, settings, modelConstraints]);

  // ── Model change reconciliation ───────────────────────────────────────────
  const [pendingModelChange, setPendingModelChange] = useState<{
    newModelId: string;
    newModelName: string;
    oldModelName: string;
    plan: ModelChangePlan;
    /** The class picked with the model; written only on commit, so the old
     *  model is never paired with the new model's class while this waits. */
    offeringPin?: { offeringId: string | undefined };
  } | null>(null);

  // Handlers run only after hydration (the panel renders a loader while
  // settings === null), so they read the store's settings directly.
  const hydratedSettings = (settings ?? {}) as FeLlmParams;

  // A class belongs to exactly one model: the new model runs on the class
  // picked with it, or on none (its preferred class) — never the old model's.
  const commitClassWithModel = (
    clickPin: { offeringId: string | undefined } | undefined,
  ) => {
    if (!clickPin && hydratedSettings.offering_id == null) return;
    dispatch(
      setAgentSettings({
        id: agentId,
        settings: withOfferingPin(hydratedSettings, clickPin?.offeringId),
      }),
    );
  };

  const commitModelChange = (
    newModelId: string,
    clickPin: { offeringId: string | undefined } | undefined,
  ) => {
    const planSettings: FeLlmParams = clickPin
      ? withOfferingPin(hydratedSettings, clickPin.offeringId)
      : hydratedSettings;

    const newModel = models.find((m) => m.id === newModelId);
    if (!newModel) {
      dispatch(
        setAgentField({ id: agentId, field: "modelId", value: newModelId }),
      );
      commitClassWithModel(clickPin);
      return;
    }

    // `useModelControls` is a pure function despite the "use" prefix — safe to
    // call on-demand for any model, not just the currently selected one.
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const { normalizedControls: newControls } = useModelControls(
      models,
      newModelId,
    );
    const newConstraints: ModelConstraint[] | null = Array.isArray(
      newModel.constraints,
    )
      ? (newModel.constraints as ModelConstraint[])
      : null;

    const plan = analyzeModelChange(
      planSettings,
      newModelId,
      newModel,
      newControls,
      newConstraints,
      // Catalog loaded but model absent → [] (pin can't belong to it → clear).
      // Catalog not loaded → null (check skipped, never guess-clear).
      offeringIdsByModel
        ? (offeringIdsByModel.get(newModelId) ?? [])
        : null,
    );

    if (planNeedsNoDecision(plan)) {
      // Nothing to decide: every set value is kept, and any the new model
      // lacks is translated by the server — commit model and class together.
      dispatch(
        setAgentField({ id: agentId, field: "modelId", value: newModelId }),
      );
      commitClassWithModel(clickPin);
      return;
    }

    const oldModel = models.find((m) => m.id === modelId);
    setPendingModelChange({
      newModelId,
      newModelName: newModel.common_name ?? newModel.name ?? newModelId,
      oldModelName: oldModel?.common_name ?? oldModel?.name ?? "current model",
      plan,
      ...(clickPin ? { offeringPin: clickPin } : {}),
    });
  };

  // The picker reports the class (offering pin) and the model in the SAME
  // click, in either order. Both are parked for that click and applied once
  // its handlers have run: a model change carries the class into its commit
  // (immediate or after the reconciliation dialog); a class-only change is
  // written directly. The class is never written ahead of its model — that
  // interim pair (old model + new model's class) is refused by
  // ai.resolve_model_config / ai.model_message_flag_profile with P0002.
  const clickRef = useRef<{
    modelId?: string;
    pin?: { offeringId: string | undefined };
  } | null>(null);

  const parkForClick = (update: {
    modelId?: string;
    pin?: { offeringId: string | undefined };
  }) => {
    if (!clickRef.current) {
      clickRef.current = {};
      queueMicrotask(() => {
        const click = clickRef.current;
        clickRef.current = null;
        if (!click) return;
        if (click.modelId) {
          commitModelChange(click.modelId, click.pin);
        } else if (click.pin) {
          dispatch(
            setAgentSettings({
              id: agentId,
              settings: withOfferingPin(hydratedSettings, click.pin.offeringId),
            }),
          );
        }
      });
    }
    Object.assign(clickRef.current, update);
  };

  const handleOfferingPinChange = (offeringId: string | undefined) => {
    // settings === null → the agent record hasn't hydrated; writing over it
    // would drop every real setting on save (same guard as the builder row).
    if (settings === null) {
      console.error(
        `[AgentSettingsCore] Refused to pin offering ${String(offeringId)} — agent ${agentId} settings not hydrated yet.`,
      );
      return;
    }
    parkForClick({ pin: { offeringId } });
  };

  const handleModelChange = (newModelId: string) => {
    if (!newModelId || newModelId === modelId) return;
    parkForClick({ modelId: newModelId });
  };

  const handleReconciliationCommit = (nextSettings: LLMParams) => {
    if (!pendingModelChange) return;
    dispatch(
      setAgentField({
        id: agentId,
        field: "modelId",
        value: pendingModelChange.newModelId,
      }),
    );
    // The class chosen with the model survives every resolution (incl. reset
    // to the new model's defaults); with none chosen the old model's class is
    // dropped — it can never be a class of the new model.
    const { offeringPin } = pendingModelChange;
    dispatch(
      setAgentSettings({
        id: agentId,
        settings: withOfferingPin(nextSettings, offeringPin?.offeringId),
      }),
    );
    setPendingModelChange(null);
  };

  const handleReconciliationCancel = () => {
    // Nothing was written yet — the model and its class commit together.
    setPendingModelChange(null);
  };

  // NormalizedControls has ~50 individually-optional named fields (plus two
  // Record<string, unknown> escape-hatch fields that are never controls) and
  // no index signature — `key in normalizedControls` proves a runtime key is
  // actually one of the named control fields before indexing.
  const getControl = (key: string): ControlDefinition | undefined => {
    if (
      !normalizedControls ||
      key === "rawControls" ||
      key === "unmappedControls" ||
      !(key in normalizedControls)
    ) {
      return undefined;
    }
    return normalizedControls[
      key as Exclude<keyof NormalizedControls, "rawControls" | "unmappedControls">
    ];
  };

  // THE settings document — the one projection Raw Settings renders and Raw
  // Editable edits (see ./settings-document.ts). Bound controls appear as
  // `{ "$var": name, "default": value }`; `model_id` is always the agent's own.
  const buildFullSettingsJson = () =>
    JSON.stringify(
      buildSettingsDocument({
        modelId,
        tools: agentTools,
        settings: currentSettings as Record<string, unknown>,
        variableDefinitions,
      }),
      null,
      2,
    );

  // Sync JSON text whenever tab changes to either raw tab
  useEffect(() => {
    if (activeTab === "raw" || activeTab === "raw-edit") {
      setJsonText(buildFullSettingsJson());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  // Issue table handlers
  const handleIssueView = (key: string) => {
    void key;
    setJsonText(buildFullSettingsJson());
    setActiveTab("raw");
  };

  // ── Bulk IssueTable handlers ─────────────────────────────────────────────

  const fixableIssues = useMemo(
    () => allIssues.filter((i) => canFixIssue(i, normalizedControls)),
    [allIssues, normalizedControls],
  );
  const unknownIssues = useMemo(
    () => allIssues.filter((i) => i.category === "unrecognized_key"),
    [allIssues],
  );

  // ── Hydration guard ───────────────────────────────────────────────────────
  // Placed after ALL hooks (the last is the useMemo above) so an early return
  // never skips a hook. selectAgentSettings returns null until the agent record
  // hydrates; rendering the editor against null would let a field edit round-
  // trip `{ ...{}, key: value }` back to Redux/Postgres and silently drop every
  // OTHER real setting on save. Mirrors AgentSettingsForm's `if (!agent)` block
  // (same centered muted-text container) and this component's own Loader2 idiom.
  if (settings === null) {
    return (
      <div className="flex items-center justify-center gap-2 h-full text-muted-foreground type-body">
        <Loader2 className="h-4 w-4 animate-spin shrink-0" />
        Loading agent settings…
      </div>
    );
  }

  // `settings` is now narrowed non-null. LLMParams is structurally assignable to
  // the FeLlmParams superset (every extra key is optional) — no cast, and no
  // `?? {}` fallback that could mask the pre-hydration null and drop settings.
  const currentSettings: FeLlmParams = settings;

  // Where every row's change lands: this agent (./agent-settings-target.ts). The chat's
  // "Model and overrides" renders the same panel over its own target.
  const target = agentSettingsTarget({
    agentId,
    dispatch,
    settings: currentSettings,
    variableDefinitions,
    outputSchema,
    bindablePolicy,
    issuesByKey: validation.issuesByKey,
    allIssues,
    normalizedControls,
  });
  const capabilities = agentCapabilitiesTarget(agentId, uiGates, dispatch);

  const handleFixAll = () => {
    const next = applyAllFixableIssues(
      fixableIssues,
      currentSettings,
      normalizedControls,
    );
    dispatch(setAgentSettings({ id: agentId, settings: next }));
  };

  const handleRemoveAllUnknown = () => {
    const next = { ...currentSettings } as Record<string, unknown>;
    for (const issue of unknownIssues) {
      delete next[issue.key];
    }
    dispatch(setAgentSettings({ id: agentId, settings: next as LLMParams }));
  };

  const handleResetAll = () => {
    dispatch(setAgentSettings({ id: agentId, settings: {} as LLMParams }));
  };

  // Gentle (non-blocking) reminder: response_format is json_schema but no
  // usable output schema exists yet. Surfaces a nudge on the Settings tab that
  // links to the Output Schema tab. Not enforced — just a hint.
  const responseFormat = (currentSettings as Record<string, unknown>)
    .response_format;
  const wantsJsonSchema =
    responseFormat === "json_schema" ||
    (typeof responseFormat === "object" &&
      responseFormat !== null &&
      (responseFormat as Record<string, unknown>).type === "json_schema");
  const outputSchemaUsable =
    outputSchema != null && validateOutputSchema(outputSchema).ok;
  const showSchemaReminder = wantsJsonSchema && !outputSchemaUsable;

  // ── Early returns ─────────────────────────────────────────────────────────
  if (modelId && !isModelFull) {
    if (registryError && !registryLoading) {
      return (
        <div className="type-secondary text-red-600 dark:text-red-400 px-1 py-2">
          Error loading model controls: {registryError}
          <ErrorAlchemyMenu error={registryError} />
        </div>
      );
    }
    return (
      <div className="flex items-center gap-2 type-secondary text-muted-foreground px-1 py-2">
        <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" />
        Loading model settings…
      </div>
    );
  }

  // A controls problem (refused class pin, model missing from the catalog) is
  // shown INSIDE the panel, never instead of it: the model picker, the class
  // pin and Raw Edit must stay reachable so the person can fix the setting.
  const classPinRefused = classControls?.failed === true;
  const noControls = !normalizedControls;
  // With a controls problem the panel still opens on Settings, where the
  // notice and the model picker are; every other tab stays reachable.
  const controlsReady = !noControls;
  const settingsTabOpen = activeTab === "settings" || (noControls && !error);
  const tabsReachable = controlsReady || Boolean(error);

  // ── Main render ───────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full">
      {/* Tab bar */}
      {tabsReachable && (
        <TabBar
          active={activeTab}
          onChange={setActiveTab}
          issueCount={warningIssues.length}
        />
      )}

      {/* Tab content — fills remaining height */}
      <div
        className={`flex-1 min-h-0 ${activeTab === "raw-edit" || activeTab === "output-schema" ? "flex flex-col" : "overflow-y-auto"} pt-3`}
      >
        {/* ── SETTINGS TAB ───────────────────────────────────────────────── */}
        {settingsTabOpen && (
          <div className="space-y-1.5">
            {error && (
              <ErrorNotice
                size="compact"
                message={
                  classPinRefused
                    ? "Pinned class is not offered for this model"
                    : error
                }
                error={error}
                operation="Load this model's settings"
                actions={
                  classPinRefused ? (
                    <Button
                      variant="outline"
                      onClick={() => handleOfferingPinChange(undefined)}
                    >
                      Use Auto
                    </Button>
                  ) : undefined
                }
              />
            )}
            {/* THE model-settings panel — the same rows the chat's "Model and
                overrides" renders; only `target` (this agent) differs. */}
            <ModelSettingsPanel
              controls={
                // MATRX-EXCEPTION: buildSettingsRows validates each field at read time; see lookupControl.
                normalizedControls as unknown as Record<string, unknown> | null
              }
              values={currentSettings as Record<string, unknown>}
              target={target}
              idPrefix={`agent-${agentId}`}
              model={{
                value: modelId,
                change: handleModelChange,
                pinnedOfferingId: settings?.offering_id,
                changePin: handleOfferingPinChange,
              }}
              emptyNote={noControls && !error ? "Select a model to see available settings." : undefined}
              capabilities={capabilities}
              notices={
                <>
                  {!noControls && warningIssues.length > 0 && (
                    <IssueTable
                      issues={warningIssues}
                      diagnosticPayload={diagnosticPayload}
                      onView={handleIssueView}
                      onRemove={(key) => target.clear(key)}
                      onFixEnum={(key) => target.fix?.(key)}
                      onFixAll={handleFixAll}
                      onRemoveAllUnknown={handleRemoveAllUnknown}
                      onResetAll={handleResetAll}
                      fixableCount={fixableIssues.length}
                      unknownCount={unknownIssues.length}
                    />
                  )}
                  {/* Gentle, non-blocking reminder: json_schema selected but no
                      usable output schema yet. Whole banner links to the tab. */}
                  {!noControls && showSchemaReminder && (
                    <button
                      type="button"
                      onClick={() => setActiveTab("output-schema")}
                      className="my-1 flex w-full items-start gap-2 rounded-md border border-info/40 bg-info/10 px-3 py-2 text-left type-secondary text-info-ink"
                    >
                      <Braces className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                      <span className="flex-1 leading-snug">
                        Response format is{" "}
                        <code className="font-mono">json_schema</code>, but{" "}
                        {outputSchema == null
                          // read-gate-exempt: wording about the local schema value; nothing is read
                          ? "no output schema is set"
                          : "the output schema has issues"}
                        . Open the{" "}
                        <span className="font-semibold underline">Output Schema</span>{" "}
                        tab to add one.
                      </span>
                    </button>
                  )}
                </>
              }
            />
          </div>
        )}

        {/* ── RAW SETTINGS TAB (colorful read-only viewer) ───────────────── */}
        {activeTab === "raw" && (
          <div className="flex flex-col gap-2">
            <p className="type-meta text-muted-foreground">
              {/* Run inputs show as { "$var": name, "default": value }. */}
              Read-only view of stored settings.{" "}
              {allIssues.length > 0 && (
                <span className="text-yellow-600 dark:text-yellow-400">
                  Highlighted lines have issues.
                </span>
              )}
            </p>
            <div className="rounded border border-border overflow-hidden">
              <HighlightedJson
                value={(() => {
                  try {
                    return JSON.parse(buildFullSettingsJson());
                  } catch {
                    return {};
                  }
                })()}
                highlightKeys={jsonHighlights}
              />
            </div>
          </div>
        )}

        {/* ── RAW EDITABLE TAB (forgiving JSON editor) ─────────────────────── */}
        {activeTab === "raw-edit" && (
          <div className="flex flex-col h-full gap-2">
            <p className="type-meta text-muted-foreground flex-shrink-0">
              Edit the JSON, then apply
            </p>

            <SettingsJsonEditor
              initialValue={jsonText}
              onApply={(parsed) => {
                const next = parseSettingsDocument(
                  parsed,
                  {
                    settings: currentSettings as Record<string, unknown>,
                    variableDefinitions,
                  },
                  (k) => getControl(k) ?? null,
                );
                if (next.errors.length > 0) {
                  toast.error(
                    `Settings not applied — ${next.errors.join(" ")}`,
                  );
                  return;
                }
                if (typeof next.modelId === "string" && next.modelId) {
                  dispatch(
                    setAgentField({
                      id: agentId,
                      field: "modelId",
                      value: next.modelId,
                    }),
                  );
                }
                if (Array.isArray(next.tools)) {
                  dispatch(
                    setAgentTools({
                      id: agentId,
                      tools: next.tools as string[],
                    }),
                  );
                }
                // Settings and bindings move together (one undo step) when a
                // binding changed; otherwise only settings are written.
                if (next.bindingsChanged) {
                  dispatch(
                    setAgentControlBinding({
                      id: agentId,
                      settings: next.settings as LLMParams,
                      variableDefinitions: next.variableDefinitions,
                    }),
                  );
                } else {
                  dispatch(
                    setAgentSettings({
                      id: agentId,
                      settings: next.settings as LLMParams,
                    }),
                  );
                }
                setActiveTab("settings");
              }}
              onReset={() => setJsonText(buildFullSettingsJson())}
              onDirtyChange={setEditorDirty}
              minHeight={360}
            />
          </div>
        )}

        {/* ── MODEL CONFIG TAB ───────────────────────────────────────────── */}
        {activeTab === "model-config" && normalizedControls && (
          <ModelConfigViewer normalizedControls={normalizedControls} />
        )}

        {/* ── OUTPUT SCHEMA TAB ──────────────────────────────────────────── */}
        {activeTab === "output-schema" && (
          <OutputSchemaTab agentId={agentId} onDirtyChange={setEditorDirty} />
        )}

        {/* ── MATRX ACTIONS TAB ──────────────────────────────────────────── */}
        {activeTab === "matrx-directives" && <MatrxDirectivesTab agentId={agentId} />}
      </div>

      {/* Model-change reconciliation dialog */}
      {pendingModelChange && (
        <ModelChangeReconciliation
          isOpen={true}
          onClose={handleReconciliationCancel}
          oldModelName={pendingModelChange.oldModelName}
          newModelName={pendingModelChange.newModelName}
          oldSettings={currentSettings}
          plan={pendingModelChange.plan}
          onCommit={handleReconciliationCommit}
        />
      )}
    </div>
  );
}
