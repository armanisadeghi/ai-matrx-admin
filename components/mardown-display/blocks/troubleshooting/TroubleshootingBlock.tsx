"use client";

// THE SHAPES COME FROM THE REGISTRY, via the parser that produces them —
// this renderer never re-declares them (`check:kind-type-twins`).
import { FullScreenPortal } from "../FullScreenPortal";
import { useClipboard } from "@ai-matrx/kit/clipboard";
import { copyNotify } from "@/lib/clipboard/copy-notify";
import { Button, Chip, Tile, Select } from "@ai-matrx/design-system/controls";
import type {
  TroubleshootingStep,
  TroubleshootingSolution,
  TroubleshootingIssue,
} from "./parseTroubleshootingMarkdown";
import React, { useState, useMemo, useRef, useCallback } from "react";
import {
  HelpCircle,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  CheckCircle2,
  Maximize2,
  Minimize2,
  Search,
  Filter,
  Lightbulb,
  ExternalLink,
  Bug,
  Wrench,
  Clock,
  Star,
  Copy,
  Check,
  ArrowRight,
  AlertCircle,
  Info,
  Target,
  MessageSquare,
  Upload,
  Printer,
  ArrowUpRight,
} from "lucide-react";
import { useCanvas } from "@/features/canvas/hooks/useCanvas";
import { useOpenArtifactInCanvas } from "@/features/canvas/hooks/useOpenArtifactInCanvas";
import { isMaterializedArtifactId } from "@/features/canvas/artifact-types/artifactId";
import { getArtifactDef } from "@/features/canvas/artifact-types/artifact-type-registry";
import ImportTasksModal from "@/features/tasks/components/ImportTasksModal";
import { convertTroubleshootingToTasks } from "@/features/tasks/utils/importConverters";
import { OutboundLink } from "@ai-matrx/kit/outbound-react";
import { CopySourceButton } from "../common/CopySourceButton";
import { useBlockHostSlot, useBlockTypeLabelSlot } from "@ai-matrx/rich-content/display/block-host";
import { BlockTypeLabel } from "@ai-matrx/rich-content/display/block-type-label";
import { BlockControlsButton, InlineControlText, useBlockControls } from "@ai-matrx/rich-content/display/block-controls/BlockControls";
import { useBlockEdit } from "@ai-matrx/rich-content/display/block-controls/block-edit";

interface TroubleshootingData {
  title: string;
  description?: string;
  issues: TroubleshootingIssue[];
  looseLines?: string[];
}

export interface TroubleshootingState {
  completedSteps: string[];
  expandedIssues: string[];
  expandedSolutions: string[];
}

interface TroubleshootingBlockProps {
  troubleshooting: TroubleshootingData;
  /** The block's own source text: what its Controls edit. */
  source?: string;
  taskId?: string; // Task ID for canvas deduplication
  artifactId?: string;
  conversationId?: string;
  messageId?: string;
  blockIndex?: number;
  /** Seed interaction state from persisted storage (optional). */
  initialState?: TroubleshootingState;
  /** Called whenever the user changes interaction state (optional). */
  onStateChange?: (state: TroubleshootingState) => void;
}

const TroubleshootingBlock: React.FC<TroubleshootingBlockProps> = ({
  troubleshooting,
  source,
  taskId,
  artifactId,
  conversationId,
  messageId,
  blockIndex,
  initialState,
  onStateChange,
}) => {
  const { copyText } = useClipboard({
    notify: copyNotify,
  });
  const [isFullScreen, setIsFullScreen] = useState(false);
  const host = useBlockHostSlot();
  // The kind host's type label joins this header: ONE header row (review 5, G1).
  const typeLabel = useBlockTypeLabelSlot();
  const controls = useBlockControls("troubleshooting", source ?? "", useBlockEdit());
  const blockContentRef = useRef<HTMLDivElement>(null);
  const [isPrinting, setIsPrinting] = useState(false);
  const handlePrint = useCallback(async () => {
    if (!blockContentRef.current || isPrinting) return;
    setIsPrinting(true);
    try {
      const [{ captureDocumentPdf }, { downloadFile }] = await Promise.all([
        import("@ai-matrx/alchemy/operate/capture"),
        import("@ai-matrx/kit/download"),
      ]);
      const filename = troubleshooting.title.replace(/\s+/g, "-").toLowerCase() || "troubleshooting";
      downloadFile(`${filename}.pdf`, await captureDocumentPdf(blockContentRef.current, { orientation: "portrait" }), "application/pdf");
    } catch (err) {
      console.error("[TroubleshootingBlock] Print failed:", err);
    } finally {
      setIsPrinting(false);
    }
  }, [troubleshooting.title, isPrinting]);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [expandedIssues, setExpandedIssues] = useState<Set<string>>(
    () => initialState ? new Set(initialState.expandedIssues) : new Set(["issue-0"]),
  );
  const [expandedSolutions, setExpandedSolutions] = useState<Set<string>>(
    () => initialState ? new Set(initialState.expandedSolutions) : new Set(),
  );
  const [expandedSteps, setExpandedSteps] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSeverity, setSelectedSeverity] = useState<string>("all");
  const [copiedCommands, setCopiedCommands] = useState<Set<string>>(new Set());
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(
    () => initialState ? new Set(initialState.completedSteps) : new Set(),
  );
  const { open: openCanvas } = useCanvas();
  const { openArtifact } = useOpenArtifactInCanvas();

  const handleOpenCanvas = () => {
    const def = getArtifactDef("troubleshooting");

    if (def?.materializable && isMaterializedArtifactId(artifactId)) {
      void openArtifact({
        canvasType: "troubleshooting",
        title: troubleshooting.title,
        content: JSON.stringify(troubleshooting),
        conversationId,
        messageId,
        artifactId,
        artifactIndex: blockIndex && blockIndex > 0 ? blockIndex : 1,
      });
      return;
    }

    openCanvas({
      type: "troubleshooting",
      data: troubleshooting,
      metadata: {
        title: troubleshooting.title,
        sourceTaskId: taskId,
      },
    });
  };

  // Keep a stable ref to onStateChange so closures don't go stale.
  const onStateChangeRef = useRef(onStateChange);
  onStateChangeRef.current = onStateChange;

  // Convert troubleshooting to tasks format
  const convertedTasks = useMemo(() => {
    return convertTroubleshootingToTasks(
      troubleshooting.title,
      troubleshooting.issues,
    );
  }, [troubleshooting]);

  // Build checkbox state from completed steps
  const checkboxState = useMemo(() => {
    const state: Record<string, boolean> = {};
    convertedTasks.forEach((task) => {
      state[task.id] = task.checked || false;
      if (task.children) {
        task.children.forEach((child) => {
          state[child.id] = child.checked || false;
        });
      }
    });
    return state;
  }, [convertedTasks]);

  // Filter issues based on search and severity
  const filteredIssues = useMemo(() => {
    return troubleshooting.issues.filter((issue) => {
      const matchesSearch =
        searchQuery === "" ||
        issue.symptom.toLowerCase().includes(searchQuery.toLowerCase()) ||
        issue.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        issue.causes.some((cause) =>
          cause.toLowerCase().includes(searchQuery.toLowerCase()),
        ) ||
        issue.solutions.some(
          (solution) =>
            solution.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            solution.description
              ?.toLowerCase()
              .includes(searchQuery.toLowerCase()),
        );

      const matchesSeverity =
        selectedSeverity === "all" || issue.severity === selectedSeverity;

      return matchesSearch && matchesSeverity;
    });
  }, [troubleshooting.issues, searchQuery, selectedSeverity]);

  /** Emit the current interaction state to the persistence layer. */
  const emitState = useCallback(
    (
      steps: Set<string>,
      issues: Set<string>,
      solutions: Set<string>,
    ) => {
      onStateChangeRef.current?.({
        completedSteps: Array.from(steps),
        expandedIssues: Array.from(issues),
        expandedSolutions: Array.from(solutions),
      });
    },
    [],
  );

  const toggleIssue = (issueId: string) => {
    const newExpanded = new Set(expandedIssues);
    if (newExpanded.has(issueId)) {
      newExpanded.delete(issueId);
    } else {
      newExpanded.add(issueId);
    }
    setExpandedIssues(newExpanded);
    emitState(completedSteps, newExpanded, expandedSolutions);
  };

  const toggleSolution = (solutionId: string) => {
    const newExpanded = new Set(expandedSolutions);
    if (newExpanded.has(solutionId)) {
      newExpanded.delete(solutionId);
    } else {
      newExpanded.add(solutionId);
    }
    setExpandedSolutions(newExpanded);
    emitState(completedSteps, expandedIssues, newExpanded);
  };

  const toggleStep = (stepId: string) => {
    const newExpanded = new Set(expandedSteps);
    if (newExpanded.has(stepId)) {
      newExpanded.delete(stepId);
    } else {
      newExpanded.add(stepId);
    }
    setExpandedSteps(newExpanded);
  };

  const toggleStepCompletion = (stepId: string) => {
    const newCompleted = new Set(completedSteps);
    if (newCompleted.has(stepId)) {
      newCompleted.delete(stepId);
    } else {
      newCompleted.add(stepId);
    }
    setCompletedSteps(newCompleted);
    emitState(newCompleted, expandedIssues, expandedSolutions);
  };

  const copyCommand = async (command: string, commandId: string) => {
    if (!(await copyText(command))) return;
    setCopiedCommands(new Set([...copiedCommands, commandId]));
    setTimeout(() => {
      setCopiedCommands((prev) => {
        const newSet = new Set(prev);
        newSet.delete(commandId);
        return newSet;
      });
    }, 2000);
  };

  const totalSolutions = troubleshooting.issues.reduce((sum, issue) => sum + issue.solutions.length, 0);
  const totalSteps = troubleshooting.issues.reduce(
    (sum, issue) => sum + issue.solutions.reduce((sSum, solution) => sSum + solution.steps.length, 0),
    0,
  );


  const getSeverityIcon = (severity: string | undefined) => {
    switch (severity) {
      case "critical":
        return <AlertTriangle className="h-4 w-4" />;
      case "high":
        return <AlertCircle className="h-4 w-4" />;
      case "medium":
        return <Info className="h-4 w-4" />;
      case "low":
        return <CheckCircle2 className="h-4 w-4" />;
      default:
        return <HelpCircle className="h-4 w-4" />;
    }
  };

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

  const getDifficultyColor = (difficulty: string | undefined) => {
    switch (difficulty) {
      case "hard":
        return "text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30";
      case "medium":
        return "text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-950/30";
      case "easy":
        return "text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/30";
      default:
        return "text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-950/30";
    }
  };

  const renderSuccessRate = (rate: number) => {
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-3 w-3 ${
              star <= Math.round(rate / 20)
                ? "text-yellow-500 fill-yellow-500"
                : "text-gray-300 dark:text-gray-600"
            }`}
          />
        ))}
        <span className="text-xs text-gray-600 dark:text-gray-400 ml-1">
          {rate}%
        </span>
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
        className={`w-full ${isFullScreen ? "fixed inset-0 z-50 flex items-center justify-center p-4" : "my-3"}`}
      >
        <div
          data-block-frame="troubleshooting"
          className={`@container max-w-6xl mx-auto ${isFullScreen ? "bg-textured rounded-2xl shadow-2xl h-full max-h-[95dvh] w-full flex flex-col overflow-hidden" : `overflow-hidden rounded-lg border bg-card transition-colors ${host.selected ? "border-primary" : "border-border"}`}`}
        >
          {/* The block's one header: title left, actions right (Controls, "</>" and Copy come from the shared slot) */}
          {!isFullScreen && (
            <div data-block-header className="flex flex-wrap items-center justify-between gap-x-2 gap-y-0.5 border-b border-border bg-muted/50 px-3 py-1.5">
              <div className="flex min-w-[9rem] flex-1 items-center gap-2">
                <HelpCircle className="h-3.5 w-3.5 shrink-0 text-primary" />
                <InlineControlText controls={controls} fieldKey="title" value={troubleshooting.title} className="truncate text-sm font-medium text-foreground">
                  {troubleshooting.title}
                </InlineControlText>
                {typeLabel ? <BlockTypeLabel>{typeLabel}</BlockTypeLabel> : null}
              </div>
              <div className="flex shrink-0 items-center gap-0.5">
                <Button variant="quiet" icon={<Upload />} aria-label="Import to Tasks" title="Import to Tasks" onClick={() => setIsImportModalOpen(true)} />
                <Button variant="quiet" icon={<ArrowUpRight />} aria-label="Canvas" title="Canvas" onClick={handleOpenCanvas} />
                <Button variant="quiet" icon={<Printer />} aria-label="Print" title="Print" onClick={handlePrint} />
                <Button variant="quiet" icon={<Maximize2 />} aria-label="Debug mode" title="Debug mode" onClick={() => setIsFullScreen(true)} />
                <CopySourceButton source={source} />
                <BlockControlsButton controls={controls} title="Troubleshooting controls" />
                {host.actions}
              </div>
            </div>
          )}
          {/* Fullscreen Header */}
          {isFullScreen && (
            <div className="flex-shrink-0 px-6 py-4 border-b border-border flex flex-wrap items-center justify-between gap-2 bg-muted/50">
              <div className="flex items-center gap-3">
                <HelpCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
                <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200">
                  Troubleshooting Guide
                </h3>
              </div>
              <Button variant="quiet" icon={<Minimize2 />} onClick={() => setIsFullScreen(false)}>
                <span>Exit</span>
              </Button>
            </div>
          )}

          {/* Scrollable Content */}
          <div className={isFullScreen ? "flex-1 overflow-y-auto" : ""}>
            <div className="p-3 space-y-4">
              {/* Header Section */}
              <div className="space-y-3">
                {(isFullScreen || troubleshooting.description) && (
                <div className="flex flex-col gap-4 @4xl:flex-row @4xl:items-start @4xl:justify-between">
                  <div className="flex items-start gap-4">
                    {isFullScreen && (
                      <HelpCircle className="mt-1 h-6 w-6 flex-shrink-0 text-primary" />
                    )}
                    <div className="flex-1">
                      {isFullScreen && (
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                          <InlineControlText controls={controls} fieldKey="title" value={troubleshooting.title}>
                            {troubleshooting.title}
                          </InlineControlText>
                        </h1>
                      )}
                      {troubleshooting.description && (
                        <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                          {troubleshooting.description}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
                )}

                {/* Controls */}
                <div className="flex flex-col items-stretch justify-between gap-4 sm:flex-row sm:items-center">
                  <div className="flex w-full flex-col items-stretch gap-4 sm:w-auto sm:flex-row sm:items-center">
                    <div className="relative w-full sm:w-auto">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Search issues or solutions..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="min-h-11 w-full rounded-lg border-border bg-textured py-2 pl-10 pr-4 text-base text-gray-900 placeholder-gray-500 focus:border-transparent focus:ring-2 focus:ring-red-500 dark:text-gray-100 dark:placeholder-gray-400 sm:min-h-0 sm:w-auto sm:text-sm"
                      />
                    </div>

                    <Select
                      value={selectedSeverity}
                      onValueChange={setSelectedSeverity}
                      aria-label="Severity"
                      className="w-full sm:w-auto"
                      options={[
                        { value: "all", label: "All Severities" },
                        { value: "critical", label: "Critical" },
                        { value: "high", label: "High" },
                        { value: "medium", label: "Medium" },
                        { value: "low", label: "Low" },
                      ]}
                    />
                  </div>

                  {troubleshooting.issues.length > 0 && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-600 dark:text-gray-400" data-troubleshooting-found="">
                        {filteredIssues.length} issue
                        {filteredIssues.length !== 1 ? "s" : ""} found
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Issues List */}
              <div ref={blockContentRef} className="space-y-4">
                {troubleshooting.issues.length === 0 && troubleshooting.looseLines && (
                  <ul className="list-disc space-y-1 pl-5 text-sm text-foreground" data-testid="troubleshooting-loose-lines">
                    {troubleshooting.looseLines.map((text, index) => (
                      <li key={index}>{text}</li>
                    ))}
                  </ul>
                )}
                {filteredIssues.map((issue) => {
                  const isExpanded = expandedIssues.has(issue.id);
                  const severityIcon = getSeverityIcon(issue.severity);

                  return (
                    <div
                      key={issue.id}
                      className="overflow-hidden rounded-md border border-border"
                    >
                      {/* Issue Header */}
                      <Tile
                        wrapTitle
                        variant="quiet"
                        onClick={() => toggleIssue(issue.id)}
                        icon={severityIcon}
                        title={issue.symptom}
                        line={[issue.description, issue.severity, `${issue.solutions.length} solution${issue.solutions.length !== 1 ? "s" : ""}`].filter(Boolean).join(" · ")}
                        end={isExpanded ? <ChevronDown /> : <ChevronRight />}
                      />

                      {/* Issue Content */}
                      {isExpanded && (
                        <div className="border-t border-border p-6 space-y-6">
                          {/* Possible Causes */}
                          {issue.causes.length > 0 && (
                            <div>
                              <h3 className="text-md font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
                                <Bug className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                                Possible Causes
                              </h3>
                              <ul className="space-y-2">
                                {issue.causes.map((cause, index) => (
                                  <li
                                    key={index}
                                    className="flex items-start gap-2"
                                  >
                                    <ArrowRight className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                                    <span className="text-sm text-gray-700 dark:text-gray-300">
                                      {cause}
                                    </span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {/* Solutions */}
                          <div>
                            <h3 className="text-md font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                              <Wrench className="h-4 w-4 text-green-600 dark:text-green-400" />
                              Solutions
                            </h3>
                            <div className="space-y-4">
                              {issue.solutions.map((solution) => {
                                const isSolutionExpanded =
                                  expandedSolutions.has(solution.id);
                                const priorityColor = getPriorityColor(
                                  solution.priority,
                                );

                                return (
                                  <div
                                    key={solution.id}
                                    className="bg-gray-50 dark:bg-gray-900/50 rounded-lg border-border"
                                  >
                                    <Tile
                                      wrapTitle
                                      variant="quiet"
                                      onClick={() => toggleSolution(solution.id)}
                                      icon={<Lightbulb />}
                                      title={solution.title}
                                      line={[solution.description, solution.priority ? `${solution.priority} priority` : null, `${solution.steps.length} step${solution.steps.length !== 1 ? "s" : ""}`].filter(Boolean).join(" · ")}
                                      end={isSolutionExpanded ? <ChevronDown /> : <ChevronRight />}
                                    />

                                    {/* Solution Steps */}
                                    {isSolutionExpanded && (
                                      <div className="border-t border-border p-4">
                                        <div className="space-y-3">
                                          {solution.steps.map(
                                            (step, stepIndex) => {
                                              const isStepExpanded =
                                                expandedSteps.has(step.id);
                                              const isStepCompleted =
                                                completedSteps.has(step.id);
                                              const difficultyColor =
                                                getDifficultyColor(
                                                  step.difficulty,
                                                );

                                              return (
                                                <div
                                                  key={step.id}
                                                  className={`border rounded-lg ${
                                                    isStepCompleted
                                                      ? "border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-950/20"
                                                      : "border-gray-200 dark:border-gray-700 bg-textured"
                                                  }`}
                                                >
                                                  <div className="flex items-start gap-3 p-3">
                                                    <button
                                                      onClick={() =>
                                                        toggleStepCompletion(
                                                          step.id,
                                                        )
                                                      }
                                                      className="flex-shrink-0 mt-0.5"
                                                    >
                                                      {isStepCompleted ? (
                                                        <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                                                      ) : (
                                                        <div className="h-5 w-5 border-2 border-gray-300 dark:border-gray-600 rounded-full hover:border-green-500 dark:hover:border-green-400 transition-colors" />
                                                      )}
                                                    </button>

                                                    <div className="flex-1 min-w-0">
                                                      <div className="flex items-center justify-between">
                                                        <h5
                                                          className={`font-medium ${
                                                            isStepCompleted
                                                              ? "line-through text-green-700 dark:text-green-300"
                                                              : "text-gray-900 dark:text-gray-100"
                                                          }`}
                                                        >
                                                          {stepIndex + 1}.{" "}
                                                          {step.title}
                                                        </h5>
                                                        <Button variant="quiet" icon={isStepExpanded ? (
                                                            <ChevronDown />
                                                          ) : (
                                                            <ChevronRight />
                                                          )} onClick={() =>
                                                            toggleStep(step.id)
                                                          } aria-label={isStepExpanded ? "Collapse" : "Expand"} aria-expanded={isStepExpanded} className="ml-2" />
                                                      </div>

                                                      <p
                                                        className={`text-sm mt-1 ${
                                                          isStepCompleted
                                                            ? "line-through text-green-600 dark:text-green-400"
                                                            : "text-gray-600 dark:text-gray-400"
                                                        }`}
                                                      >
                                                        {step.description}
                                                      </p>

                                                      <div className="flex items-center gap-2 mt-2">
                                                        {step.difficulty && (
                                                          <span
                                                            className={`px-2 py-0.5 text-xs font-medium rounded-full ${difficultyColor}`}
                                                          >
                                                            {step.difficulty}
                                                          </span>
                                                        )}
                                                        {step.estimatedTime && (
                                                          <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                                                            <Clock className="h-3 w-3" />
                                                            {step.estimatedTime}
                                                          </div>
                                                        )}
                                                      </div>

                                                      {/* Step Details */}
                                                      {isStepExpanded && (
                                                        <div className="mt-3 space-y-3">
                                                          {/* Commands */}
                                                          {step.commands &&
                                                            step.commands
                                                              .length > 0 && (
                                                              <div>
                                                                <h6 className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                                                  Commands:
                                                                </h6>
                                                                <div className="space-y-2">
                                                                  {step.commands.map(
                                                                    (
                                                                      command,
                                                                      cmdIndex,
                                                                    ) => {
                                                                      const commandId = `${step.id}-cmd-${cmdIndex}`;
                                                                      const isCopied =
                                                                        copiedCommands.has(
                                                                          commandId,
                                                                        );

                                                                      return (
                                                                        <div
                                                                          key={
                                                                            cmdIndex
                                                                          }
                                                                          className="relative"
                                                                        >
                                                                          <pre className="bg-gray-900 dark:bg-gray-950 text-green-400 dark:text-green-300 p-3 rounded-lg text-xs overflow-x-auto">
                                                                            <code>
                                                                              {
                                                                                command
                                                                              }
                                                                            </code>
                                                                          </pre>
                                                                          <Button variant="quiet" icon={isCopied ? (
                                                                              <Check />
                                                                            ) : (
                                                                              <Copy />
                                                                            )} glyphTone={isCopied ? "success" : undefined} onClick={() =>
                                                                              copyCommand(
                                                                                command,
                                                                                commandId,
                                                                              )
                                                                            } aria-label="Copy" className="absolute top-2 right-2" />
                                                                        </div>
                                                                      );
                                                                    },
                                                                  )}
                                                                </div>
                                                              </div>
                                                            )}

                                                          {/* Links */}
                                                          {step.links &&
                                                            step.links.length >
                                                              0 && (
                                                              <div>
                                                                <h6 className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                                                  References:
                                                                </h6>
                                                                <div className="space-y-1">
                                                                  {step.links.map(
                                                                    (
                                                                      link,
                                                                      linkIndex,
                                                                    ) => (
                                                                      <OutboundLink
                                                                        key={
                                                                          linkIndex
                                                                        }
                                                                        href={
                                                                          link.url
                                                                        }
                                                                        className="flex items-center gap-2 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
                                                                      >
                                                                        <ExternalLink className="h-3 w-3" />
                                                                        {
                                                                          link.title
                                                                        }
                                                                      </OutboundLink>
                                                                    ),
                                                                  )}
                                                                </div>
                                                              </div>
                                                            )}
                                                        </div>
                                                      )}
                                                    </div>
                                                  </div>
                                                </div>
                                              );
                                            },
                                          )}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                          {/* Related Issues */}
                          {issue.relatedIssues &&
                            issue.relatedIssues.length > 0 && (
                              <div>
                                <h3 className="text-md font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
                                  <MessageSquare className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                  Related Issues
                                </h3>
                                <div className="flex flex-wrap gap-2">
                                  {issue.relatedIssues.map(
                                    (relatedIssue, index) => (
                                      <Chip key={index} tone="blue" label={relatedIssue} />
                                    ),
                                  )}
                                </div>
                              </div>
                            )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Totals: one quiet line; steps only when there are any; nothing when the source named no issue (never "0 issues") */}
              {troubleshooting.issues.length > 0 && (
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-border pt-3 text-sm text-muted-foreground" data-troubleshooting-totals="">
                <span className="inline-flex items-center gap-1.5 whitespace-nowrap"><Target className="h-3.5 w-3.5" />{troubleshooting.issues.length} {troubleshooting.issues.length === 1 ? "issue" : "issues"}</span>
                <span className="inline-flex items-center gap-1.5 whitespace-nowrap"><Wrench className="h-3.5 w-3.5" />{totalSolutions} {totalSolutions === 1 ? "solution" : "solutions"}</span>
                {totalSteps > 0 && (
                  <span className="inline-flex items-center gap-1.5 whitespace-nowrap"><CheckCircle2 className="h-3.5 w-3.5" />{completedSteps.size} of {totalSteps} steps done</span>
                )}
              </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Import Modal */}
      <ImportTasksModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        tasks={convertedTasks}
        checkboxState={checkboxState}
      />
    </FullScreenPortal>
  );
};

export default TroubleshootingBlock;
