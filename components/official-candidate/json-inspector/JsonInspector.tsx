"use client";

// CANONICAL: This is the canonical application-wide JSON Display component.

import React, { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import {
  Braces,
  ChevronLeft,
  Compass,
  FilePen,
  ListTree,
  Maximize2,
  Minimize2,
  Minus,
  Plus,
  Scissors,
} from "lucide-react";

import { Tabs, TabsContent } from "@/components/ui/tabs";
import type { AgentPayloadInput } from "@/components/agent-copy/buildAgentPayload";
import { CopyButtons } from "@/components/agent-copy/CopyButtons";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import {
  cleanJson,
  formatJson,
  formatJsonAtExpandDepth,
  getJsonStructuralDepth,
} from "@ai-matrx/kit/json-format";
import { cn } from "@/lib/utils";
// FRAGMENTATION LAW: the three light panes are ONE inspector surface, always
// reached beneath an existing ssr:false boundary (~14 admin/debug windows) —
// static keeps them one piece. Only JsonEditorPane keeps a boundary (it drags
// the CodeMirror graph, the one genuinely heavy dep here).
import RawJsonExplorer from "@/components/official/json-explorer/RawJsonExplorer";
import { JsonTreeViewer } from "@/components/official/json-explorer/JsonTreeViewer";
import { KindDataGate } from "@/components/official/structured-value/KindDataGate";
import { JsonTruncator } from "@/components/official-candidate/json-truncator/JsonTruncator";


const PaneFallback = () => (
  <div className="p-2 text-xs text-muted-foreground">Loading…</div>
);

const JsonEditorPane = dynamic(
  () => import("./JsonEditorPane").then((m) => ({ default: m.JsonEditorPane })),
  { ssr: false, loading: () => <PaneFallback /> },
);

export type JsonInspectorView =
  "json" | "explorer" | "tree" | "truncator" | "edit";

/** Raw JSON tab expand depth: 0 = minified, max = fully pretty-printed. */
export type JsonRawExpandDepth = number;

export interface JsonInspectorProps {
  /** Any JSON-serializable value to inspect. */
  data: unknown;
  /** Optional label rendered to the left of the tabs (e.g. a slice/key name). */
  label?: React.ReactNode;
  /** When provided, renders a back chevron that calls this on click. */
  onBack?: () => void;
  /** Tooltip for the back chevron. */
  backLabel?: string;
  /** Initial view. Defaults to "json". */
  defaultView?: JsonInspectorView;
  /**
   * Initial Raw JSON expand depth (0 = compact, structural max = full).
   * Defaults to full depth for `data` so the payload is shown as-is until
   * the user picks a compaction level.
   */
  defaultExpandDepth?: JsonRawExpandDepth;
  /**
   * When provided, an additional "Edit" tab appears with a real JSON text
   * editor (CodeMirror 6 — JSON syntax, inline lint squigglies). The handler
   * is called with the parsed value on **blur** when the buffer holds valid
   * JSON. Local edits never propagate up keystroke-by-keystroke and never
   * cause re-renders that move the caret.
   */
  onUpdate?: (next: unknown) => void;
  /** When true (default), the edit tab is read-only. Ignored without onUpdate. */
  editorReadOnly?: boolean;
  /**
   * The Copy-for-AI payload of the one Alchemy copy menu (the standard agent
   * envelope — live URL/route/timestamp + JSON dump). Called at click time.
   * Without it the menu still copies the JSON and text, and offers no AI copy.
   */
  agentCopy?: AgentPayloadInput | (() => AgentPayloadInput);
  /**
   * When true (requires `onUpdate`), skip inspect tabs and render the CodeMirror
   * editor pane directly — for form fields where editing must be obvious.
   */
  editOnly?: boolean;
  /** Forwarded to the outer wrapper. */
  className?: string;
  /**
   * A deliberate source view (admin debug, a "Raw" tab, kind authoring): data
   * carrying a `__kind` is inspected as written. Default false — kind data is
   * drawn as its kind (`AnswerValueView`) and the caller is reported. An
   * editable inspector (`onUpdate`) is always a source view.
   */
  showSource?: boolean;
}

// Every interactive cell in the header is the same 20×20 square. Differences
// are limited to background/border (active tab, list border, etc.) so the
// buttons read as a single uniform row.
const CELL_CLS =
  "shrink-0 h-5 w-5 flex items-center justify-center rounded transition-colors";

const ICON_BUTTON_CLS = cn(
  CELL_CLS,
  "text-muted-foreground hover:text-foreground hover:bg-muted",
);


const ICON_CLS = "h-3.5 w-3.5";

const VIEW_BUTTONS = [
  { value: "json", title: "Formatted JSON", Icon: Braces },
  { value: "explorer", title: "Path Explorer", Icon: Compass },
  { value: "tree", title: "Tree Viewer", Icon: ListTree },
  { value: "truncator", title: "Truncator", Icon: Scissors },
  { value: "edit", title: "Edit JSON", Icon: FilePen },
] as const;

const PANE_CLS =
  "flex-1 min-h-0 overflow-auto mt-0 border-none outline-none ring-0 bg-gray-50 dark:bg-zinc-900";

const JSON_PANE_CLS = cn(
  PANE_CLS,
  "overflow-hidden flex flex-col data-[state=active]:flex data-[state=active]:flex-col",
);

const RAW_DEPTH_BTN_CLS = cn(
  "inline-flex items-center justify-center rounded px-1.5 py-0.5 text-[10px] leading-none min-w-[1.35rem] transition-colors",
  "text-muted-foreground hover:text-foreground hover:bg-muted",
);

const RAW_DEPTH_BTN_ACTIVE_CLS = "bg-muted text-foreground font-medium";

const RAW_DEPTH_STEPPER_BTN_CLS = cn(
  CELL_CLS,
  "w-4 text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-40",
);

const TRUNCATOR_PANE_CLS =
  "flex-1 min-h-0 overflow-hidden mt-0 border-none outline-none ring-0 data-[state=active]:flex data-[state=active]:flex-col";

const EDITOR_PANE_CLS =
  "flex-1 min-h-0 overflow-hidden mt-0 border-none outline-none ring-0 data-[state=active]:flex data-[state=active]:flex-col bg-white dark:bg-zinc-900";

function clampExpandDepth(depth: number, maxDepth: number): number {
  return Math.min(Math.max(0, depth), maxDepth);
}

function resolveDefaultExpandDepth(
  data: unknown,
  maxDepth: number,
  defaultExpandDepth?: JsonRawExpandDepth,
): number {
  if (defaultExpandDepth !== undefined) {
    return clampExpandDepth(defaultExpandDepth, maxDepth);
  }
  return maxDepth;
}

export function JsonInspector(props: JsonInspectorProps) {
  // Expand: the same inspector, full size on top of everything, and back down again.
  const [expanded, setExpanded] = useState(false);
  return (
    <KindDataGate
      component="JsonInspector"
      data={props.data}
      showSource={props.showSource || typeof props.onUpdate === "function"}
    >
      <JsonInspectorBody {...props} onToggleExpand={() => setExpanded(true)} />
      {expanded ? (
        <Dialog open onOpenChange={setExpanded}>
          <DialogContent className="flex h-[85dvh] w-[95vw] max-w-[95vw] flex-col gap-0 overflow-hidden p-0 sm:max-w-[95vw]">
            <DialogTitle className="sr-only">
              {typeof props.label === "string" && props.label ? props.label : "JSON"}
            </DialogTitle>
            <JsonInspectorBody
              {...props}
              className="h-full min-h-0 rounded-none"
              expanded
              onToggleExpand={() => setExpanded(false)}
            />
          </DialogContent>
        </Dialog>
      ) : null}
    </KindDataGate>
  );
}

interface JsonInspectorBodyProps extends JsonInspectorProps {
  expanded?: boolean;
  onToggleExpand: () => void;
}

function JsonInspectorBody({
  data,
  label,
  onBack,
  backLabel = "Back",
  defaultView = "json",
  defaultExpandDepth,
  onUpdate,
  editorReadOnly = false,
  editOnly = false,
  agentCopy,
  className,
  expanded = false,
  onToggleExpand,
}: JsonInspectorBodyProps) {
  const editable = typeof onUpdate === "function";
  const showEditOnly = editOnly && editable;

  const prettyJson = useMemo(() => formatJson(data, 2), [data]);
  const maxExpandDepth = useMemo(
    () => getJsonStructuralDepth(cleanJson(data)),
    [data],
  );
  const truncatorValue = useMemo(
    () => (typeof data === "string" ? data : JSON.stringify(data, null, 2)),
    [data],
  );

  // The local Tabs primitive force-mounts every TabsContent (preserves panel
  // state across switches). Track which views have been activated so the
  // dynamically-imported heavy panels only load on first visit, then stay
  // mounted afterwards.
  const [value, setValue] = useState<JsonInspectorView>(defaultView);
  const [seen, setSeen] = useState<Set<JsonInspectorView>>(
    () => new Set<JsonInspectorView>([defaultView]),
  );
  const resolvedDefaultExpandDepth = useMemo(
    () => resolveDefaultExpandDepth(data, maxExpandDepth, defaultExpandDepth),
    [data, maxExpandDepth, defaultExpandDepth],
  );
  const [expandDepthTouched, setExpandDepthTouched] = useState(false);
  const [expandDepth, setExpandDepth] = useState(resolvedDefaultExpandDepth);

  useEffect(() => {
    if (!expandDepthTouched) {
      setExpandDepth(resolvedDefaultExpandDepth);
      return;
    }
    setExpandDepth((current) => Math.min(current, maxExpandDepth));
  }, [data, maxExpandDepth, resolvedDefaultExpandDepth, expandDepthTouched]);

  const handleExpandDepthChange = (
    next: number | ((current: number) => number),
  ) => {
    setExpandDepthTouched(true);
    setExpandDepth(next);
  };

  const rawJsonText = useMemo(
    () => formatJsonAtExpandDepth(data, expandDepth),
    [data, expandDepth],
  );

  const depthLabel =
    expandDepth <= 0
      ? "Compact"
      : expandDepth >= maxExpandDepth
        ? "Full"
        : String(expandDepth);

  const showDepthToolbar = maxExpandDepth > 0;
  const showDepthStepper = maxExpandDepth > 5;
  const depthOptions = useMemo(
    () => Array.from({ length: maxExpandDepth + 1 }, (_, depth) => depth),
    [maxExpandDepth],
  );

  const handleValueChange = (next: string) => {
    const v = next as JsonInspectorView;
    setValue(v);
    setSeen((prev) => {
      if (prev.has(v)) return prev;
      const updated = new Set(prev);
      updated.add(v);
      return updated;
    });
  };

  const copyLabel =
    typeof label === "string" && label ? label : "JSON";

  if (showEditOnly) {
    return (
      <div
        className={cn(
          "h-full flex flex-col bg-white dark:bg-zinc-800 rounded-lg overflow-hidden min-h-0",
          className,
        )}
      >
        <div className="flex items-center gap-1.5 px-1.5 py-0.5 border-b border-border flex-shrink-0">
          {onBack && (
            <button
              onClick={onBack}
              className={ICON_BUTTON_CLS}
              title={backLabel}
              aria-label={backLabel}
            >
              <ChevronLeft className={ICON_CLS} />
            </button>
          )}
          {label !== undefined && label !== null && label !== "" && (
            <h2 className="text-xs font-semibold text-gray-800 dark:text-gray-200 truncate shrink-0">
              {label}
            </h2>
          )}
          <div className="flex-1" />
          <span className="text-[10px] text-muted-foreground">
            Changes apply on blur
          </span>
        </div>
        <JsonEditorPane
          value={data}
          onUpdate={onUpdate}
          readOnly={editorReadOnly}
          className="flex-1 min-h-0"
        />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "h-full flex flex-col bg-white dark:bg-zinc-800 rounded-lg overflow-hidden min-h-0",
        className,
      )}
    >
      <Tabs
        value={value}
        onValueChange={handleValueChange}
        className="flex-1 flex flex-col min-h-0 overflow-hidden"
      >
        <div
          className={cn(
            "flex items-center gap-1.5 px-1.5 py-1 border-b border-border flex-shrink-0",
            expanded && "pr-14",
          )}
        >
          {onBack && (
            <button
              onClick={onBack}
              className={ICON_BUTTON_CLS}
              title={backLabel}
              aria-label={backLabel}
            >
              <ChevronLeft className={ICON_CLS} />
            </button>
          )}
          {label !== undefined && label !== null && label !== "" && (
            <h2 className="text-xs font-semibold text-gray-800 dark:text-gray-200 truncate shrink-0">
              {label}
            </h2>
          )}
          {/* Plain 20px icon buttons, not tap-target tabs: a dense header, flush with the row below. */}
          <div role="tablist" className="flex shrink-0 items-center gap-0.5">
            {VIEW_BUTTONS.filter((b) => b.value !== "edit" || editable).map(({ value: v, title, Icon }) => (
              <button
                key={v}
                type="button"
                role="tab"
                aria-selected={value === v}
                title={title}
                aria-label={title}
                onClick={() => handleValueChange(v)}
                className={cn(ICON_BUTTON_CLS, value === v && "bg-muted text-foreground")}
              >
                <Icon className={ICON_CLS} />
              </button>
            ))}
          </div>
          <div className="flex-1" />
          <CopyButtons
            label={copyLabel}
            size="xs"
            human={() => (value === "json" ? rawJsonText : prettyJson)}
            json={() => data}
            {...(agentCopy ? { agent: agentCopy } : { hide: ["ai" as const] })}
          />
          <button
            type="button"
            onClick={onToggleExpand}
            className={ICON_BUTTON_CLS}
            title={expanded ? "Back to normal size" : "Expand to full size"}
            aria-label={expanded ? "Back to normal size" : "Expand to full size"}
          >
            {expanded ? (
              <Minimize2 className={ICON_CLS} />
            ) : (
              <Maximize2 className={ICON_CLS} />
            )}
          </button>
        </div>

        <TabsContent value="json" className={JSON_PANE_CLS}>
          {showDepthToolbar && (
            <div className="flex items-center gap-0.5 px-1.5 py-0.5 border-b border-border flex-shrink-0 bg-white dark:bg-zinc-800">
              {showDepthStepper ? (
                <>
                  <button
                    type="button"
                    onClick={() => handleExpandDepthChange(0)}
                    className={cn(
                      RAW_DEPTH_BTN_CLS,
                      expandDepth === 0 && RAW_DEPTH_BTN_ACTIVE_CLS,
                    )}
                    title="Compact — single line"
                    aria-label="Compact JSON"
                    aria-pressed={expandDepth === 0}
                  >
                    Compact
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      handleExpandDepthChange((depth) => Math.max(0, depth - 1))
                    }
                    disabled={expandDepth <= 0}
                    className={RAW_DEPTH_STEPPER_BTN_CLS}
                    title="Collapse one level"
                    aria-label="Collapse one level"
                  >
                    <Minus className="h-3 w-3" />
                  </button>
                  <span
                    className="px-1 text-[10px] tabular-nums text-muted-foreground"
                    title={`Expand depth ${expandDepth} of ${maxExpandDepth}`}
                  >
                    {depthLabel}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      handleExpandDepthChange((depth) =>
                        Math.min(maxExpandDepth, depth + 1),
                      )
                    }
                    disabled={expandDepth >= maxExpandDepth}
                    className={RAW_DEPTH_STEPPER_BTN_CLS}
                    title="Expand one level"
                    aria-label="Expand one level"
                  >
                    <Plus className="h-3 w-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleExpandDepthChange(maxExpandDepth)}
                    className={cn(
                      RAW_DEPTH_BTN_CLS,
                      expandDepth >= maxExpandDepth && RAW_DEPTH_BTN_ACTIVE_CLS,
                    )}
                    title="Full — expand every level"
                    aria-label="Full JSON"
                    aria-pressed={expandDepth >= maxExpandDepth}
                  >
                    Full
                  </button>
                </>
              ) : (
                depthOptions.map((depth) => {
                  const label =
                    depth === 0
                      ? "Compact"
                      : depth === maxExpandDepth
                        ? "Full"
                        : String(depth);
                  return (
                    <button
                      key={depth}
                      type="button"
                      onClick={() => handleExpandDepthChange(depth)}
                      className={cn(
                        RAW_DEPTH_BTN_CLS,
                        expandDepth === depth && RAW_DEPTH_BTN_ACTIVE_CLS,
                      )}
                      title={
                        depth === 0
                          ? "Compact — single line"
                          : depth === maxExpandDepth
                            ? "Full — expand every level"
                            : `Expand ${depth} level${depth === 1 ? "" : "s"}`
                      }
                      aria-label={`JSON depth ${label}`}
                      aria-pressed={expandDepth === depth}
                    >
                      {label}
                    </button>
                  );
                })
              )}
            </div>
          )}
          <pre /* rich-content-exempt: debug or inspector output: logs, JSON, code or source view */
            className={cn(
              "flex-1 min-h-0 overflow-auto p-2 text-xs text-gray-800 dark:text-gray-300",
              expandDepth <= 0
                ? "whitespace-pre"
                : "whitespace-pre-wrap break-words",
            )}
          >
            {rawJsonText}
          </pre>
        </TabsContent>

        <TabsContent value="explorer" className={PANE_CLS}>
          {seen.has("explorer") ? (
            <RawJsonExplorer pageData={data} showSource />
          ) : (
            <PaneFallback />
          )}
        </TabsContent>

        <TabsContent value="tree" className={PANE_CLS}>
          {seen.has("tree") ? <JsonTreeViewer data={data} showSource header={false} /> : <PaneFallback />}
        </TabsContent>

        <TabsContent value="truncator" className={TRUNCATOR_PANE_CLS}>
          {seen.has("truncator") ? (
            <JsonTruncator
              initialValue={truncatorValue}
              tabbed
              defaultTab="fields"
              className="flex-1 min-h-0"
              allowLayoutToggle
            />
          ) : (
            <PaneFallback />
          )}
        </TabsContent>

        {editable && (
          <TabsContent value="edit" className={EDITOR_PANE_CLS}>
            {seen.has("edit") ? (
              <JsonEditorPane
                value={data}
                onUpdate={onUpdate}
                readOnly={editorReadOnly}
              />
            ) : (
              <PaneFallback />
            )}
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}

export default JsonInspector;
