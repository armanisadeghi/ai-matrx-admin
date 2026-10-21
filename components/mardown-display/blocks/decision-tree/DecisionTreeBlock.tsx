"use client";

import { FullScreenPortal } from "../FullScreenPortal";
import { useBlockMakeReal } from "@/features/rich-content-host/block-make-real";
import { NotebookPen } from "lucide-react";
import { decisionTreeToMarkdown } from "@/features/rich-content-host/block-note-markdown";
import { Button, Badge } from "@ai-matrx/design-system/controls";
import type { KIND_KEY } from "@ai-matrx/content-ir";
// THE SHAPES COME FROM THE REGISTRY (`pnpm shape:types`) — this file never
// re-declares a registered kind's fields (`check:kind-type-twins`).
import type {
  DecisionNode as DecisionNodeKind,
  DecisionTree,
} from "@/features/content-ir/kinds/generated/kinds.generated";
import React, { useState, useMemo, useRef, useCallback } from "react";
import {
  GitBranch,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Maximize2,
  Minimize2,
  RotateCcw,
  Home,
  HelpCircle,
  Target,
  Info,
  ChevronRight,
  ChevronDown,
  Clock,
  ExternalLink,
  Printer,
} from "lucide-react";
import { useCanvas } from "@/features/canvas/hooks/useCanvas";
import { useOpenArtifactInCanvas } from "@/features/canvas/hooks/useOpenArtifactInCanvas";
import { isMaterializedArtifactId } from "@/features/canvas/artifact-types/artifactId";
import { getArtifactDef } from "@/features/canvas/artifact-types/artifact-type-registry";
import { IconButton } from "@ai-matrx/design-system";
import { useCanvasPresentation } from "@ai-matrx/canvas/react";
import { decisionBranchesSideBySide } from "@ai-matrx/rich-content/display/blocks/canvas-adaptive";
import { CopySourceButton } from "../common/CopySourceButton";
import { useBlockHostSlot } from "@ai-matrx/rich-content/display/block-host";
import { BlockControlsButton, InlineControlText, useBlockControls } from "@ai-matrx/rich-content/display/block-controls/BlockControls";
import { useBlockEdit } from "@ai-matrx/rich-content/display/block-controls/block-edit";

export type DecisionNode = Omit<
  DecisionNodeKind,
  typeof KIND_KEY | "yes" | "no" | "priority"
> & {
  /** A render key the wire format has no reason to carry. */
  id: string;
  yes?: DecisionNode;
  no?: DecisionNode;
  priority?: "low" | "medium" | "high";
  type?: "question" | "action" | "info";
};

export type DecisionTreeData = Omit<
  DecisionTree,
  typeof KIND_KEY | "root" | "additionalDetails"
> & { root: DecisionNode };

export interface DecisionTreeState {
  currentNodeId: string;
  history: NavigationStep[];
  completedPaths: string[];
}

interface DecisionTreeBlockProps {
  decisionTree: DecisionTreeData;
  /** The block's own source text: what its Controls edit. */
  source?: string;
  taskId?: string; // Task ID for canvas deduplication
  artifactId?: string;
  conversationId?: string;
  messageId?: string;
  blockIndex?: number;
  /** Seed navigation/completion state from persisted storage (optional). */
  initialState?: DecisionTreeState;
  /** Called whenever the user changes interaction state (optional). */
  onStateChange?: (state: DecisionTreeState) => void;
}

interface NavigationStep {
  nodeId: string;
  choice?: "yes" | "no";
  question?: string;
  timestamp: number;
}

/** Walk the tree and return the node with the given id, or null. */
function findNodeById(root: DecisionNode, id: string): DecisionNode | null {
  if (root.id === id) return root;
  if (root.yes) {
    const found = findNodeById(root.yes, id);
    if (found) return found;
  }
  if (root.no) {
    const found = findNodeById(root.no, id);
    if (found) return found;
  }
  return null;
}

const STAT_ITEMS = [
  { key: "totalNodes", label: "Nodes", icon: GitBranch },
  { key: "questionNodes", label: "Questions", icon: HelpCircle },
  { key: "actionNodes", label: "Actions", icon: Target },
  { key: "completedPaths", label: "Completed", icon: CheckCircle2 },
] as const;

const navBtnClass =
  "inline-flex h-11 w-11 items-center justify-center gap-1 rounded-md border p-1.5 text-xs font-medium transition-colors md:h-auto md:w-auto md:px-2 md:py-1.5";

const DecisionTreeBlock: React.FC<DecisionTreeBlockProps> = ({
  decisionTree,
  source,
  taskId,
  artifactId,
  conversationId,
  messageId,
  blockIndex,
  initialState,
  onStateChange,
}) => {
  const [isFullScreen, setIsFullScreen] = useState(false);
  const host = useBlockHostSlot();
  const controls = useBlockControls("decision_tree", source ?? "", useBlockEdit());
  const blockContentRef = useRef<HTMLDivElement>(null);
  const [isPrinting, setIsPrinting] = useState(false);
  const makeReal = useBlockMakeReal();
  const handlePrint = useCallback(async () => {
    if (!blockContentRef.current || isPrinting) return;
    setIsPrinting(true);
    try {
      const [{ captureDocumentPdf }, { downloadFile }] = await Promise.all([
        import("@ai-matrx/alchemy/operate/capture"),
        import("@ai-matrx/kit/download"),
      ]);
      const filename = decisionTree.title.replace(/\s+/g, "-").toLowerCase() || "decision-tree";
      downloadFile(`${filename}.pdf`, await captureDocumentPdf(blockContentRef.current, { orientation: "landscape" }), "application/pdf");
    } catch (err) {
      console.error("[DecisionTreeBlock] Print failed:", err);
    } finally {
      setIsPrinting(false);
    }
  }, [decisionTree.title, isPrinting]);
  const [currentNode, setCurrentNode] = useState<DecisionNode>(() => {
    if (initialState?.currentNodeId) {
      const restored = findNodeById(decisionTree.root, initialState.currentNodeId);
      if (restored) return restored;
    }
    return decisionTree.root;
  });
  const [navigationHistory, setNavigationHistory] = useState<NavigationStep[]>(
    () => initialState?.history ?? [],
  );
  const [completedPaths, setCompletedPaths] = useState<Set<string>>(
    () => new Set(initialState?.completedPaths ?? []),
  );
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(
    new Set(["root"]),
  );
  const [showFullTree, setShowFullTree] = useState(false);
  const { open: openCanvas } = useCanvas();
  const { openArtifact } = useOpenArtifactInCanvas();

  const handleOpenCanvas = () => {
    const def = getArtifactDef("decision-tree");

    if (def?.materializable && isMaterializedArtifactId(artifactId)) {
      void openArtifact({
        canvasType: "decision-tree",
        title: decisionTree.title,
        content: JSON.stringify(decisionTree),
        conversationId,
        messageId,
        artifactId,
        artifactIndex: blockIndex && blockIndex > 0 ? blockIndex : 1,
      });
      return;
    }

    openCanvas({
      type: "decision-tree",
      data: decisionTree,
      metadata: {
        title: decisionTree.title,
        sourceTaskId: taskId,
      },
    });
  };

  // Keep a stable ref to onStateChange so closures don't go stale.
  const onStateChangeRef = useRef(onStateChange);
  onStateChangeRef.current = onStateChange;

  /** Emit the current navigation + completion state to the persistence layer. */
  const emitState = useCallback(
    (
      node: DecisionNode,
      history: NavigationStep[],
      paths: Set<string>,
    ) => {
      onStateChangeRef.current?.({
        currentNodeId: node.id,
        history,
        completedPaths: Array.from(paths),
      });
    },
    [],
  );

  // Calculate tree statistics
  const treeStats = useMemo(() => {
    const stats = {
      totalNodes: 0,
      questionNodes: 0,
      actionNodes: 0,
      maxDepth: 0,
      completedPaths: completedPaths.size,
    };

    const traverse = (node: DecisionNode, depth = 0) => {
      if (!node) return;

      stats.totalNodes++;
      stats.maxDepth = Math.max(stats.maxDepth, depth);

      if (node.question) stats.questionNodes++;
      if (node.action) stats.actionNodes++;

      if (node.yes) traverse(node.yes, depth + 1);
      if (node.no) traverse(node.no, depth + 1);
    };

    traverse(decisionTree.root);
    return stats;
  }, [decisionTree.root, completedPaths]);

  const handleChoice = (choice: "yes" | "no") => {
    const nextNode = choice === "yes" ? currentNode.yes : currentNode.no;

    if (nextNode) {
      // Add to navigation history
      const step: NavigationStep = {
        nodeId: currentNode.id,
        choice,
        question: currentNode.question,
        timestamp: Date.now(),
      };

      const newHistory = [...navigationHistory, step];

      setNavigationHistory(newHistory);
      setCurrentNode(nextNode);
      // Reaching an action is not completing it: only "Mark as Completed" adds to the count.
      emitState(nextNode, newHistory, completedPaths);
    }
  };

  const goBack = () => {
    if (navigationHistory.length > 0) {
      const newHistory = [...navigationHistory];
      newHistory.pop();
      setNavigationHistory(newHistory);

      // Navigate back to previous node
      let node = decisionTree.root;
      for (const step of newHistory) {
        node = step.choice === "yes" ? node.yes || node : node.no || node;
      }
      setCurrentNode(node);
      emitState(node, newHistory, completedPaths);
    }
  };

  const resetTree = () => {
    setCurrentNode(decisionTree.root);
    setNavigationHistory([]);
    setCompletedPaths(new Set());
    emitState(decisionTree.root, [], new Set());
  };

  const goToRoot = () => {
    setCurrentNode(decisionTree.root);
    setNavigationHistory([]);
    emitState(decisionTree.root, [], completedPaths);
  };

  const toggleNodeExpansion = (nodeId: string) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(nodeId)) {
      newExpanded.delete(nodeId);
    } else {
      newExpanded.add(nodeId);
    }
    setExpandedNodes(newExpanded);
  };

  const getNodeIcon = (node: DecisionNode) => {
    if (node.question) return HelpCircle;
    if (node.action) return Target;
    return Info;
  };

  // One plain card (review 4): every node is a quiet bordered row in design-system tokens; the
  // current question is marked by its border and icon, never a saturated or tinted panel.
  const getNodeColor = (_node: DecisionNode, isActive = false) =>
    isActive ? "border border-primary bg-muted/40 text-foreground" : "border border-border text-foreground";

  const getPriorityColor = (priority: string | undefined) => {
    switch (priority) {
      case "high":
        return "text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30";
      case "medium":
        return "text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-950/30";
      case "low":
        return "text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/30";
      default:
        return "text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-950/30";
    }
  };

  const getFullTreeNodeColor = (node: DecisionNode) => {
    if (node.question) {
      return "bg-card border border-border border-l-[3px] border-l-primary text-foreground";
    }
    if (node.action) {
      const isCompleted = completedPaths.has(node.id);
      return isCompleted
        ? "bg-card border border-border border-l-[3px] border-l-muted-foreground text-foreground"
        : "bg-card border border-border border-l-[3px] border-l-border text-foreground";
    }
    return "bg-card border border-border text-foreground";
  };

  const branchLabelClass = (choice: "yes" | "no") =>
    choice === "yes"
      ? "text-green-700 dark:text-green-400 border-green-300 dark:border-green-700 bg-green-50/90 dark:bg-green-950/50"
      : "text-red-700 dark:text-red-400 border-red-300 dark:border-red-700 bg-red-50/90 dark:bg-red-950/50";

  // The full tree grows top to bottom in a portrait canvas pane (and outside
  // the canvas); a wide pane puts each question's Yes and No side by side for
  // the first two levels, where columns are still wide enough to read.
  const branchesSideBySide = decisionBranchesSideBySide(useCanvasPresentation());

  const renderTreeNode = (node: DecisionNode, depth = 0) => {
    if (!node) return null;

    const isExpanded = expandedNodes.has(node.id);
    const isActive = currentNode.id === node.id;
    const isCompleted = completedPaths.has(node.id);
    const hasChildren = !!(node.yes || node.no);
    const IconComponent = getNodeIcon(node);

    const cardColor =
      isActive || !showFullTree
        ? getNodeColor(node, isActive)
        : getFullTreeNodeColor(node);

    return (
      <div key={node.id} className="min-w-0">
        <div
          className={`rounded-md transition-all ${cardColor} ${
            isActive && node.question ? "p-3" : "p-2"
          }`}
        >
          {isActive && node.question ? (
            <div className="space-y-2">
              <div className="flex gap-2 text-sm">
                <span className="relative flex-shrink-0 mt-[calc(0.5*(1.375em-0.875rem))]">
                  <IconComponent className="h-6 w-6 text-primary" />
                  {isCompleted && (
                    <CheckCircle2 className="h-3 w-3 text-green-500 absolute -top-0.5 -right-0.5" />
                  )}
                </span>
                <p className="text-sm font-semibold leading-snug flex-1 min-w-0 pt-1">
                  {node.question}
                </p>
                {hasChildren && showFullTree && (
                  <Button variant="quiet" icon={isExpanded ? (
                      <ChevronDown />
                    ) : (
                      <ChevronRight />
                    )} onClick={() => toggleNodeExpansion(node.id)} aria-label={isExpanded ? "Collapse" : "Expand"} aria-expanded={isExpanded} />
                )}
              </div>

              {node.description && (
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {node.description}
                </p>
              )}

              {(node.priority || node.category || node.estimatedTime) && (
                <div className="flex items-center gap-1.5 flex-wrap">
                  {node.priority && (
                    <span
                      className={`px-1.5 py-0.5 text-[10px] font-medium rounded-full ${getPriorityColor(node.priority)}`}
                    >
                      {node.priority}
                    </span>
                  )}
                  {node.category && (
                    <span className="px-1.5 py-0.5 text-[10px] bg-muted text-muted-foreground rounded-full">
                      {node.category}
                    </span>
                  )}
                  {node.estimatedTime && (
                    <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {node.estimatedTime}
                    </div>
                  )}
                </div>
              )}

              <div className="flex gap-2 pt-0.5">
                <Button variant="success" icon={<CheckCircle2 />} onClick={() => handleChoice("yes")} disabled={!node.yes} title="Yes" className="shrink-0">
                  Yes
                </Button>
                <Button variant="danger" icon={<XCircle />} onClick={() => handleChoice("no")} disabled={!node.no} title="No" className="shrink-0">
                  No
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-2 min-w-0">
              <span className="relative flex-shrink-0 mt-0.5">
                <IconComponent className="h-3.5 w-3.5 text-muted-foreground" />
                {isCompleted && (
                  <CheckCircle2 className="h-2.5 w-2.5 text-green-500 absolute -top-0.5 -right-0.5" />
                )}
              </span>

              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium leading-snug">
                  {node.question || node.action || "Decision Point"}
                </div>
                {node.description && (
                  <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                    {node.description}
                  </p>
                )}

                {(node.priority || node.category || node.estimatedTime) && (
                  <div className="flex items-center gap-1.5 flex-wrap mt-1">
                    {node.priority && (
                      <span
                        className={`px-1.5 py-0.5 text-[10px] font-medium rounded-full ${getPriorityColor(node.priority)}`}
                      >
                        {node.priority}
                      </span>
                    )}
                    {node.category && (
                      <span className="px-1.5 py-0.5 text-[10px] bg-muted text-muted-foreground rounded-full">
                        {node.category}
                      </span>
                    )}
                    {node.estimatedTime && (
                      <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {node.estimatedTime}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {hasChildren && showFullTree && (
                <Button variant="quiet" icon={isExpanded ? (
                    <ChevronDown />
                  ) : (
                    <ChevronRight />
                  )} onClick={() => toggleNodeExpansion(node.id)} aria-label={isExpanded ? "Collapse" : "Expand"} aria-expanded={isExpanded} />
              )}
            </div>
          )}
        </div>

        {hasChildren && (showFullTree ? isExpanded : isActive) && (
          <div
            data-decision-branches={
              showFullTree && branchesSideBySide && depth < 2
                ? "side-by-side"
                : "stacked"
            }
            className={
              showFullTree && branchesSideBySide && depth < 2
                ? "mt-1.5 grid grid-cols-2 items-start gap-2"
                : "mt-1.5 space-y-2"
            }
          >
            {showFullTree ? (
              <>
                {node.yes && (
                  <div className="pl-2 border-l-2 border-green-500/60 dark:border-green-600/60">
                    <span
                      className={`inline-block text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded border mb-1 ${branchLabelClass("yes")}`}
                    >
                      Yes
                    </span>
                    <div>{renderTreeNode(node.yes, depth + 1)}</div>
                  </div>
                )}
                {node.no && (
                  <div className="pl-2 border-l-2 border-red-500/60 dark:border-red-600/60">
                    <span
                      className={`inline-block text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded border mb-1 ${branchLabelClass("no")}`}
                    >
                      No
                    </span>
                    <div>{renderTreeNode(node.no, depth + 1)}</div>
                  </div>
                )}
              </>
            ) : (
              <>
                {node.yes && renderTreeNode(node.yes, depth + 1)}
                {node.no && renderTreeNode(node.no, depth + 1)}
              </>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <FullScreenPortal active={isFullScreen}>
      {/* Fullscreen Backdrop */}
      {isFullScreen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
          onClick={() => setIsFullScreen(false)}
        />
      )}

      <div
        className={`w-full ${isFullScreen ? "fixed inset-0 z-50 flex items-center justify-center p-2" : `my-3 overflow-hidden rounded-lg border bg-card transition-colors ${host.selected ? "border-primary" : "border-border"}`}`}
      >
        <div
          data-block-frame="decision_tree"
          className={`max-w-6xl mx-auto ${isFullScreen ? "bg-textured rounded-2xl shadow-2xl h-full max-h-[95dvh] w-full flex flex-col overflow-hidden" : ""}`}
        >
          {/* The block's one header: title left, actions right (Controls, "</>" and Copy come from the shared slot) */}
          {!isFullScreen && (
            <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-0.5 border-b border-border bg-muted/50 px-3 py-1.5">
              <div className="flex min-w-[9rem] flex-1 items-center gap-2">
                <GitBranch className="h-3.5 w-3.5 shrink-0 text-primary" />
                <InlineControlText controls={controls} fieldKey="title" value={decisionTree.title} className="truncate text-sm font-medium text-foreground">
                  {decisionTree.title}
                </InlineControlText>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <IconButton
                  icon={NotebookPen}
                  tooltip="Save to notes"
                  onClick={() => makeReal.saveToNotes(decisionTree.title, decisionTreeToMarkdown(decisionTree))}
                />
                <IconButton
                  icon={Printer}
                  tooltip={isPrinting ? "Saving…" : "Print / Save as PDF"}
                  onClick={handlePrint}
                  disabled={isPrinting}
                />
                <IconButton
                  icon={ExternalLink}
                  tooltip="Open Canvas"
                  onClick={handleOpenCanvas}
                />
                <IconButton
                  icon={Maximize2}
                  tooltip="Expand to full screen"
                  onClick={() => setIsFullScreen(true)}
                />
                <CopySourceButton source={source} />
                <BlockControlsButton controls={controls} title="Decision tree controls" />
                {host.actions}
              </div>
            </div>
          )}
          {/* Fullscreen Header */}
          {isFullScreen && (
            <div className="flex-shrink-0 px-3 py-2 border-b border-border flex flex-wrap items-center justify-between gap-2 bg-muted/50">
              <div className="flex items-center gap-2 min-w-0">
                <GitBranch className="h-4 w-4 flex-shrink-0 text-primary" />
                <h3 className="text-sm font-semibold text-foreground truncate">
                  {decisionTree.title}
                </h3>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <IconButton
                  icon={Printer}
                  tooltip={isPrinting ? "Saving…" : "Print / Save as PDF"}
                  onClick={handlePrint}
                  disabled={isPrinting}
                />
                <IconButton
                  icon={Minimize2}
                  tooltip="Exit full screen"
                  onClick={() => setIsFullScreen(false)}
                  variant="outline"
                />
              </div>
            </div>
          )}

          {/* Scrollable Content */}
          <div className={isFullScreen ? "flex-1 overflow-y-auto" : ""}>
            <div ref={blockContentRef} className="p-2 space-y-3">
              {/* Header Section */}
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-start gap-2 flex-1 min-w-0">
                    {isFullScreen && <GitBranch className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />}
                    <div className="flex-1 min-w-0">
                      {isFullScreen && (
                        <h1 className="text-sm font-bold text-foreground leading-tight line-clamp-2">
                          <InlineControlText controls={controls} fieldKey="title" value={decisionTree.title}>
                            {decisionTree.title}
                          </InlineControlText>
                        </h1>
                      )}
                      {decisionTree.description && (
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                          {decisionTree.description}
                        </p>
                      )}
                    </div>
                  </div>

                </div>

                {/* Navigation Controls — first row to wrap on narrow widths */}
                <div className="flex items-center gap-1 flex-wrap mb-2">
                  <button
                    type="button"
                    onClick={goToRoot}
                    title="Start Over"
                    aria-label="Start over"
                    className={`${navBtnClass} bg-background/60 hover:bg-background text-foreground border-border`}
                  >
                    <Home className="h-3.5 w-3.5 flex-shrink-0" />
                    <span className="hidden md:inline">Start</span>
                  </button>

                  <button
                    type="button"
                    onClick={goBack}
                    disabled={navigationHistory.length === 0}
                    title="Back"
                    aria-label="Go back"
                    className={`${navBtnClass} bg-background/60 hover:bg-background disabled:opacity-50 disabled:cursor-not-allowed text-foreground border-border`}
                  >
                    <ArrowLeft className="h-3.5 w-3.5 flex-shrink-0" />
                    <span className="hidden md:inline">Back</span>
                  </button>

                  <button
                    type="button"
                    onClick={resetTree}
                    title="Reset"
                    aria-label="Reset decision tree"
                    className={`${navBtnClass} bg-background/60 hover:bg-background text-foreground border-border`}
                  >
                    <RotateCcw className="h-3.5 w-3.5 flex-shrink-0" />
                    <span className="hidden md:inline">Reset</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowFullTree(!showFullTree)}
                    title={showFullTree ? "Hide full tree" : "Show full tree"}
                    aria-label={showFullTree ? "Hide full tree" : "Show full tree"}
                    className={`${navBtnClass} border ${
                      showFullTree
                        ? "bg-muted text-foreground border-primary"
                        : "bg-background/60 hover:bg-background text-foreground border-border"
                    }`}
                  >
                    <GitBranch className="h-3.5 w-3.5 flex-shrink-0" />
                    <span className="hidden md:inline">Full</span>
                  </button>

                  <div
                    className={`${navBtnClass} bg-background/60 text-muted-foreground border-border tabular-nums`}
                    title={`Step ${navigationHistory.length + 1}`}
                  >
                    <span className="hidden md:inline">Step</span>
                    {navigationHistory.length + 1}
                  </div>
                </div>

                {/* Progress Stats: one quiet line, never a row of tiles */}
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm" data-decision-tree-stats="">
                  {STAT_ITEMS.map(({ key, label, icon: StatIcon }) => (
                    <span key={key} className="inline-flex items-center gap-1.5 whitespace-nowrap">
                      <StatIcon className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" />
                      <span className="text-muted-foreground">{label}</span>
                      <span className="font-medium text-foreground tabular-nums">{treeStats[key]}</span>
                    </span>
                  ))}
                </div>
              </div>

              {/* Navigation Breadcrumbs */}
              {navigationHistory.length > 0 && (
                <div className="border-t border-border pt-2">
                  <h3 className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1.5">
                    <ArrowRight className="h-3.5 w-3.5" />
                    Decision Path
                  </h3>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge tone="primary">Start</Badge>
                    {navigationHistory.map((step, index) => (
                      <React.Fragment key={index}>
                        <ArrowRight className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                        <div className="flex items-center gap-1 min-w-0">
                          <span className="text-xs text-muted-foreground max-w-[8rem] sm:max-w-xs truncate">
                            {step.question}
                          </span>
                          <Badge className="shrink-0" tone={step.choice === "yes" ? "success" : "destructive"}>
                            {step.choice?.toUpperCase()}
                          </Badge>
                        </div>
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              )}

              {/* Decision Tree Visualization */}
              <div className="border-t border-border">
                <div className="pt-2">
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <h2 className="text-sm font-semibold text-foreground flex items-center gap-1.5 min-w-0">
                      <GitBranch className="h-4 w-4 text-primary flex-shrink-0" />
                      <span className="truncate">
                        {showFullTree
                          ? "Full Decision Tree"
                          : "Current Decision Point"}
                      </span>
                    </h2>

                    {currentNode.action && (
                      <Badge className="shrink-0" tone="success" title="Decision Complete" icon={<CheckCircle2 />}>
                        <span className="hidden sm:inline">Decision Complete</span>
                      </Badge>
                    )}
                  </div>

                  <div className="decision-tree-container">
                    {renderTreeNode(
                      showFullTree ? decisionTree.root : currentNode,
                    )}
                  </div>
                </div>
              </div>

              {/* Final Action Display */}
              {currentNode.action && (
                <div className="border-t border-border pt-3">
                  <div className="flex items-start gap-3">
                    <Target className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-semibold text-foreground mb-1">
                        Recommended Action
                      </h3>
                      <p className="text-foreground text-sm mb-2">
                        {currentNode.action}
                      </p>
                      {currentNode.description && (
                        <p className="text-muted-foreground text-xs mb-2">
                          {currentNode.description}
                        </p>
                      )}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <Button variant="success" icon={<CheckCircle2 />} onClick={() => {
                            const newPaths = new Set([...completedPaths, currentNode.id]);
                            setCompletedPaths(newPaths);
                            emitState(currentNode, navigationHistory, newPaths);
                          }} title="Mark as Completed">
                          <span className="hidden sm:inline">
                            Mark as Completed
                          </span>
                        </Button>
                        <Button variant="outline" icon={<RotateCcw />} onClick={goToRoot} title="Start New Decision">
                          <span className="hidden sm:inline">
                            Start New Decision
                          </span>
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </FullScreenPortal>
  );
};

export default DecisionTreeBlock;
