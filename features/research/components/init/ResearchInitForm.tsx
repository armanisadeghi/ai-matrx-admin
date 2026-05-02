"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Loader2,
  Plus,
  Zap,
  Hand,
  ChevronRight,
  LayoutTemplate,
  Check,
  FolderOpen,
  Building2,
  ChevronDown,
  AlertTriangle,
  Sparkles,
  FlaskConical,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { CreateProjectModal } from "@/features/projects/components/CreateProjectModal";
import { useResearchApi } from "../../hooks/useResearchApi";
import { TemplatePicker } from "./TemplatePicker";
import type {
  AutonomyLevel,
  ResearchTemplate,
  SuggestRequest,
  SuggestApplied,
} from "../../types";
import { keywordTemplatesFromJson } from "../../types";
import { useNavTree } from "@/features/agent-context/hooks/useNavTree";
import { useAppDispatch } from "@/lib/redux/hooks";
import { invalidateNavTree } from "@/features/agent-context/redux/hierarchySlice";
import TextArrayInput from "@/components/official/TextArrayInput";

type Mode = "manual" | "template" | "ai";

// ── AI state machine ──────────────────────────────────────────────────────────

type AiPhase =
  | { status: "idle" }
  | { status: "creating" }
  | { status: "suggesting"; topicId: string }
  | {
      status: "reviewing";
      topicId: string;
      appliedName: string | null;
      appliedDescription: string | null;
      applied: SuggestApplied;
    }
  | { status: "launching"; topicId: string }
  | { status: "error"; topicId: string | null; message: string };

// ── JSONL stream reader ───────────────────────────────────────────────────────

async function readJsonlStream(
  response: Response,
  onEvent: (event: Record<string, unknown>) => void,
): Promise<void> {
  if (!response.body) return;
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      try {
        onEvent(JSON.parse(trimmed) as Record<string, unknown>);
      } catch {
        // skip malformed lines
      }
    }
  }
}

// ── Helper ────────────────────────────────────────────────────────────────────

function deriveTopicName(description: string): string {
  const trimmed = description.trim();
  if (!trimmed) return "";
  const words = trimmed.split(/\s+/);
  return words.length <= 8 ? trimmed : words.slice(0, 8).join(" ") + "…";
}

// ── Step dots ─────────────────────────────────────────────────────────────────

function StepDots({ step }: { step: 1 | 2 }) {
  return (
    <div className="flex items-center gap-3 mb-8">
      <div className="flex items-center gap-2">
        <div
          className={cn(
            "h-2 w-2 rounded-full",
            step >= 1 ? "bg-primary" : "bg-border",
          )}
        />
        <div
          className={cn("h-px w-10", step >= 2 ? "bg-primary/50" : "bg-border")}
        />
        <div
          className={cn(
            "h-2 w-2 rounded-full",
            step >= 2 ? "bg-primary" : "bg-border",
          )}
        />
      </div>
      <span className="text-xs text-muted-foreground tabular-nums">
        {step} / 2
      </span>
    </div>
  );
}

// ── Project list (shared) ─────────────────────────────────────────────────────

interface ProjectListProps {
  selectedId: string | null;
  onSelect: (id: string, name: string) => void;
  onCreateNew: () => void;
  isLoading: boolean;
  projectsByOrg: {
    org: { id: string; name: string };
    projects: { id: string; name: string; org_id: string }[];
  }[];
  flatProjects: { id: string; name: string; org_id: string }[];
  showOrgHeaders: boolean;
}

function ProjectList({
  selectedId,
  onSelect,
  onCreateNew,
  isLoading,
  projectsByOrg,
  flatProjects,
  showOrgHeaders,
}: ProjectListProps) {
  return (
    <div className="space-y-1.5">
      {isLoading ? (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : flatProjects.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">
          No projects yet. Create one below to get started.
        </p>
      ) : (
        <>
          {projectsByOrg.map(({ org, projects }) => (
            <div key={org.id} className="space-y-1.5">
              {showOrgHeaders && (
                <p className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground uppercase tracking-wider px-1 pt-2 pb-0.5">
                  <Building2 className="h-3 w-3" />
                  {org.name}
                </p>
              )}
              {projects.map((project) => {
                const isSelected = selectedId === project.id;
                return (
                  <button
                    key={project.id}
                    type="button"
                    onClick={() => onSelect(project.id, project.name)}
                    className={cn(
                      "w-full flex items-center gap-3 rounded-xl border p-4 text-left transition-all duration-150",
                      isSelected
                        ? "border-primary/40 bg-primary/5 shadow-sm"
                        : "border-border/60 bg-card hover:border-primary/20 hover:bg-muted/40",
                    )}
                  >
                    <div
                      className={cn(
                        "h-8 w-8 rounded-lg flex items-center justify-center shrink-0 transition-colors",
                        isSelected
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground",
                      )}
                    >
                      {isSelected ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <FolderOpen className="h-4 w-4" />
                      )}
                    </div>
                    <span className="font-medium text-sm">{project.name}</span>
                  </button>
                );
              })}
            </div>
          ))}
        </>
      )}
      <button
        type="button"
        onClick={onCreateNew}
        className="w-full flex items-center gap-3 rounded-xl border-2 border-dashed border-border/60 p-4 text-left transition-colors hover:border-primary/30 mt-2"
      >
        <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
          <Plus className="h-4 w-4 text-muted-foreground" />
        </div>
        <span className="text-sm font-medium text-muted-foreground">
          Create New Project
        </span>
      </button>
    </div>
  );
}

// ── AI Phase UIs ──────────────────────────────────────────────────────────────

function AiProcessing({ phase }: { phase: "creating" | "suggesting" }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 space-y-5 text-center">
      <div className="relative">
        <div className="h-16 w-16 rounded-2xl bg-violet-500/10 flex items-center justify-center">
          <Zap className="h-7 w-7 text-violet-500 animate-pulse" />
        </div>
        <div className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-violet-500 flex items-center justify-center">
          <Loader2 className="h-2.5 w-2.5 animate-spin text-white" />
        </div>
      </div>
      <div className="space-y-1.5">
        <p className="font-semibold text-lg">
          {phase === "creating"
            ? "Creating your topic…"
            : "AI is shaping your research…"}
        </p>
        <p className="text-sm text-muted-foreground max-w-xs">
          {phase === "creating"
            ? "Setting up your research topic"
            : "Analyzing your subject, generating a title, description, and the best search keywords"}
        </p>
      </div>
    </div>
  );
}

interface AiReviewProps {
  phase: Extract<AiPhase, { status: "reviewing" }>;
  onStart: () => void;
  onViewFirst: () => void;
  isLaunching: boolean;
}

function AiReview({ phase, onStart, onViewFirst, isLaunching }: AiReviewProps) {
  const { applied, appliedName, appliedDescription } = phase;
  const hasQuotaDrop = applied.keywords_dropped_by_quota.length > 0;
  const hasSkipped = applied.keywords_skipped_duplicate.length > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-2">
        <div className="h-7 w-7 rounded-lg bg-violet-500/10 flex items-center justify-center">
          <Sparkles className="h-3.5 w-3.5 text-violet-500" />
        </div>
        <span className="text-xs font-medium text-violet-500 uppercase tracking-wider">
          AI Review
        </span>
      </div>

      <div className="space-y-1">
        <h2 className="text-2xl font-bold tracking-tight">
          Your topic is ready
        </h2>
        <p className="text-sm text-muted-foreground">
          Review what the AI prepared, then start or edit first.
        </p>
      </div>

      {/* Topic card */}
      <div className="rounded-2xl border border-border/60 bg-card p-5 space-y-3">
        <div>
          <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium mb-1">
            Topic name
          </p>
          <p className="font-semibold text-foreground text-lg leading-snug">
            {appliedName ?? deriveTopicName(phase.appliedDescription ?? "")}
          </p>
          {appliedDescription && (
            <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">
              {appliedDescription}
            </p>
          )}
        </div>

        {applied.keywords_saved.length > 0 && (
          <div>
            <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium mb-2">
              Keywords ({applied.keywords_saved.length})
            </p>
            <div className="flex flex-wrap gap-1.5">
              {applied.keywords_saved.map((kw) => (
                <span
                  key={kw}
                  className="inline-flex items-center rounded-full bg-violet-500/10 text-violet-700 dark:text-violet-400 px-2.5 py-0.5 text-xs font-medium"
                >
                  {kw}
                </span>
              ))}
            </div>
          </div>
        )}

        {hasSkipped && (
          <p className="text-xs text-muted-foreground">
            {applied.keywords_skipped_duplicate.length} keyword
            {applied.keywords_skipped_duplicate.length !== 1 ? "s" : ""} already
            existed and were kept.
          </p>
        )}
      </div>

      {/* Quota banner */}
      {hasQuotaDrop && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 flex items-start gap-3">
          <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
          <div className="space-y-1 min-w-0">
            <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
              {applied.keywords_dropped_by_quota.length} keyword
              {applied.keywords_dropped_by_quota.length !== 1 ? "s" : ""}{" "}
              dropped by quota
            </p>
            <p className="text-xs text-muted-foreground">
              Your topic&apos;s limit is {applied.max_keywords} keywords. Raise
              the cap in topic settings to include:{" "}
              <span className="font-medium text-foreground">
                {applied.keywords_dropped_by_quota.join(", ")}
              </span>
            </p>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
        <Button
          onClick={onStart}
          disabled={isLaunching}
          className="gap-2 bg-violet-600 hover:bg-violet-700 text-white flex-1 sm:flex-none sm:px-6 min-h-[44px]"
        >
          {isLaunching ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <FlaskConical className="h-4 w-4" />
          )}
          Start Research
        </Button>
        <Button
          variant="outline"
          onClick={onViewFirst}
          disabled={isLaunching}
          className="min-h-[44px]"
        >
          View &amp; Edit First
        </Button>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function ResearchInitForm() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const api = useResearchApi();
  const dispatch = useAppDispatch();
  const [, startTransition] = useTransition();
  const [createProjectOpen, setCreateProjectOpen] = useState(false);
  const [showAdditionalInstructions, setShowAdditionalInstructions] =
    useState(false);

  // ── URL-derived step / mode ───────────────────────────────────────────────
  const modeParam = searchParams.get("mode") as Mode | null;
  const stepParam = searchParams.get("step");
  const currentMode = modeParam;
  // AI path only uses step 1 URL; reviewing/processing are internal states
  const currentStep: 0 | 1 | 2 = !modeParam
    ? 0
    : modeParam !== "ai" && stepParam === "2"
      ? 2
      : 1;

  // ── Form state ────────────────────────────────────────────────────────────
  const [topicName, setTopicName] = useState(searchParams.get("topic") ?? "");
  const [description, setDescription] = useState("");
  const [subjectDescription, setSubjectDescription] = useState(""); // AI: subject_name_or_description
  const [additionalInstructions, setAdditionalInstructions] = useState(""); // AI: user_input
  const [selectedKeywords, setSelectedKeywords] = useState<string[]>([]);
  const [selectedTemplate, setSelectedTemplate] =
    useState<ResearchTemplate | null>(null);

  // ── Project state ─────────────────────────────────────────────────────────
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(
    null,
  );
  const [selectedProjectName, setSelectedProjectName] = useState<string | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);

  // ── AI state machine ──────────────────────────────────────────────────────
  const [aiPhase, setAiPhase] = useState<AiPhase>({ status: "idle" });

  // ── Hierarchy data ────────────────────────────────────────────────────────
  const { orgs, flatProjects, isLoading: projectsLoading } = useNavTree();
  const projectsByOrg = orgs
    .map((org) => ({
      org,
      projects: flatProjects.filter((p) => p.org_id === org.id),
    }))
    .filter((g) => g.projects.length > 0);
  const showOrgHeaders = orgs.length > 1;

  // ── Navigation helpers ────────────────────────────────────────────────────
  const goToStep = (mode: Mode, step: number) => {
    const params = new URLSearchParams();
    params.set("mode", mode);
    if (step >= 2) params.set("step", "2");
    const topic = searchParams.get("topic");
    if (topic) params.set("topic", topic);
    router.push(`${pathname}?${params.toString()}`);
  };

  const handleModeSelect = (mode: Mode) => {
    const params = new URLSearchParams();
    params.set("mode", mode);
    const topic = searchParams.get("topic");
    if (topic) params.set("topic", topic);
    router.push(`${pathname}?${params.toString()}`);
  };

  const handleContinue = () => {
    if (!currentMode) return;
    setError(null);
    goToStep(currentMode, 2);
  };

  const handleBack = () => {
    setError(null);
    // If AI is in processing state, reset to idle (stay on same URL)
    if (currentMode === "ai" && aiPhase.status !== "idle") {
      setAiPhase({ status: "idle" });
      return;
    }
    router.back();
  };

  // ── Template handling ─────────────────────────────────────────────────────
  const handleTemplateSelect = (template: ResearchTemplate | null) => {
    setSelectedTemplate(template);
    if (template) {
      const kws = keywordTemplatesFromJson(template.keyword_templates);
      if (kws.length > 0) setSelectedKeywords(Array.from(new Set(kws)));
    }
  };

  // ── Manual / Template submit ──────────────────────────────────────────────
  const handleManualSubmit = () => {
    const name = topicName.trim();
    if (!name) {
      setError("Please provide a topic name.");
      return;
    }
    if (!selectedProjectId) {
      setError("Please select a project.");
      return;
    }
    if (currentMode === "manual" && selectedKeywords.length < 1) {
      setError("Add at least one keyword to continue.");
      return;
    }
    setError(null);

    const autonomyLevel: AutonomyLevel = "semi";

    startTransition(async () => {
      try {
        const response = await api.createTopic(selectedProjectId, {
          name,
          description: description.trim() || null,
          autonomy_level: autonomyLevel,
          template_id: selectedTemplate?.id ?? null,
        });
        const topic: { id: string } = await response.json();

        if (selectedKeywords.length > 0) {
          await api.addKeywords(topic.id, { keywords: selectedKeywords });
        }

        router.push(`/research/topics/${topic.id}`);
      } catch (err) {
        setError((err as Error).message);
      }
    });
  };

  // ── AI submit (sequential: create → suggest → review) ────────────────────
  const handleAiSubmit = async () => {
    if (!selectedProjectId) {
      setError("Please select a project.");
      return;
    }
    if (!subjectDescription.trim()) {
      setError("Please describe your research subject.");
      return;
    }
    setError(null);

    setAiPhase({ status: "creating" });

    try {
      // Step 1: Create placeholder topic with the raw user input as name
      const createRes = await api.createTopic(selectedProjectId, {
        name: subjectDescription.trim(),
        autonomy_level: "auto",
        template_id: null,
      });
      if (!createRes.ok) {
        const body = await createRes.text();
        throw new Error(`Failed to create topic: ${body}`);
      }
      const topic: { id: string } = await createRes.json();
      const topicId = topic.id;

      setAiPhase({ status: "suggesting", topicId });

      // Step 2: Stream suggest WITH topic_id so backend auto-applies results
      const suggestBody: SuggestRequest = {
        subject_name_or_description: subjectDescription.trim(),
        topic_id: topicId,
        use_user_agent_overrides: false,
      };
      if (additionalInstructions.trim()) {
        suggestBody.user_input = additionalInstructions.trim();
      }

      const suggestRes = await api.suggest(suggestBody);
      if (!suggestRes.ok) {
        const body = await suggestRes.text();
        throw new Error(`AI analysis failed: ${body}`);
      }

      // Collect stream events
      let appliedName: string | null = null;
      let appliedDescription: string | null = null;
      let applied: SuggestApplied | null = null;

      await readJsonlStream(suggestRes, (ev) => {
        if (ev.type === "record_update" && ev.table === "rs_topic") {
          const rec = ev.record as
            | { name?: string; description?: string }
            | undefined;
          if (rec?.name) appliedName = rec.name;
          if (rec?.description) appliedDescription = rec.description;
        }
        if (ev.type === "suggest_applied") {
          applied = ev as unknown as SuggestApplied;
        }
      });

      if (!applied) {
        throw new Error(
          "AI did not return suggestions. The topic was created — you can find it in your topic list.",
        );
      }

      setAiPhase({
        status: "reviewing",
        topicId,
        appliedName,
        appliedDescription,
        applied,
      });
    } catch (err) {
      setAiPhase((prev) => ({
        status: "error",
        topicId:
          "topicId" in prev ? (prev as { topicId: string }).topicId : null,
        message: (err as Error).message,
      }));
    }
  };

  // ── AI review actions ─────────────────────────────────────────────────────
  const handleStartResearch = () => {
    if (aiPhase.status !== "reviewing") return;
    const { topicId } = aiPhase;
    setAiPhase({ status: "launching", topicId });
    startTransition(() => {
      api.runPipeline(topicId).catch(() => {});
      router.push(`/research/topics/${topicId}`);
    });
  };

  const handleViewTopicFirst = () => {
    if (aiPhase.status !== "reviewing" && aiPhase.status !== "error") return;
    const topicId =
      aiPhase.status === "reviewing" ? aiPhase.topicId : aiPhase.topicId;
    if (topicId) router.push(`/research/topics/${topicId}`);
  };

  // ── Validation ────────────────────────────────────────────────────────────
  const canContinue =
    currentStep === 1
      ? currentMode === "manual"
        ? topicName.trim().length > 0 && selectedKeywords.length >= 1
        : currentMode === "template"
          ? selectedTemplate !== null && topicName.trim().length > 0
          : /* ai step 1 */ subjectDescription.trim().length > 10
      : /* step 2 manual/template */ !!selectedProjectId;

  const aiIsProcessing =
    aiPhase.status === "creating" ||
    aiPhase.status === "suggesting" ||
    aiPhase.status === "launching";

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col items-center justify-start min-h-full py-10 px-4 sm:px-6">
      {/* ── Step 0: Mode Selection ── */}
      {currentStep === 0 && (
        <div className="w-full max-w-2xl space-y-10">
          <div className="text-center space-y-3">
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
              Start a Research Topic
            </h1>
            <p className="text-muted-foreground text-lg">
              How would you like to approach this?
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <button
              type="button"
              onClick={() => handleModeSelect("manual")}
              className="group relative flex flex-col gap-4 rounded-2xl border-2 border-border bg-card p-6 text-left transition-all duration-200 hover:border-blue-500/40 hover:bg-blue-500/5 hover:shadow-lg min-h-[210px]"
            >
              <div className="h-11 w-11 rounded-xl bg-blue-500/10 flex items-center justify-center group-hover:bg-blue-500/20 transition-colors">
                <Hand className="h-5 w-5 text-blue-500" />
              </div>
              <div className="space-y-1.5">
                <h2 className="text-base font-semibold">
                  I&apos;ll build it myself
                </h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Define your topic name and keywords precisely.
                </p>
              </div>
              <ChevronRight className="absolute bottom-4 right-4 h-4 w-4 text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>

            <button
              type="button"
              onClick={() => handleModeSelect("template")}
              className="group relative flex flex-col gap-4 rounded-2xl border-2 border-border bg-card p-6 text-left transition-all duration-200 hover:border-amber-500/40 hover:bg-amber-500/5 hover:shadow-lg min-h-[210px]"
            >
              <div className="h-11 w-11 rounded-xl bg-amber-500/10 flex items-center justify-center group-hover:bg-amber-500/20 transition-colors">
                <LayoutTemplate className="h-5 w-5 text-amber-500" />
              </div>
              <div className="space-y-1.5">
                <h2 className="text-base font-semibold">
                  I&apos;ll use a template
                </h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Pre-built keyword sets for common research types.
                </p>
              </div>
              <ChevronRight className="absolute bottom-4 right-4 h-4 w-4 text-amber-500 opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>

            <button
              type="button"
              onClick={() => handleModeSelect("ai")}
              className="group relative flex flex-col gap-4 rounded-2xl border-2 border-border bg-card p-6 text-left transition-all duration-200 hover:border-violet-500/40 hover:bg-violet-500/5 hover:shadow-lg min-h-[210px]"
            >
              <div className="h-11 w-11 rounded-xl bg-violet-500/10 flex items-center justify-center group-hover:bg-violet-500/20 transition-colors">
                <Zap className="h-5 w-5 text-violet-500" />
              </div>
              <div className="space-y-1.5">
                <h2 className="text-base font-semibold">Help me shape this</h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Describe your subject. AI structures the research.
                </p>
              </div>
              <ChevronRight className="absolute bottom-4 right-4 h-4 w-4 text-violet-500 opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
          </div>
        </div>
      )}

      {/* ── Step 1a: Manual ── */}
      {currentStep === 1 && currentMode === "manual" && (
        <div className="w-full max-w-2xl">
          <StepDots step={1} />
          <div className="space-y-8">
            <div className="space-y-2">
              <div className="flex items-center gap-2 mb-1">
                <div className="h-6 w-6 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <Hand className="h-3.5 w-3.5 text-blue-500" />
                </div>
                <span className="text-xs font-medium text-blue-500 uppercase tracking-wider">
                  Manual
                </span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
                What are you researching?
              </h1>
              <p className="text-muted-foreground">
                Give your topic a name and add the keywords you want to track.
              </p>
            </div>

            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-medium">Topic Name</label>
                <Input
                  value={topicName}
                  onChange={(e) => setTopicName(e.target.value)}
                  placeholder="e.g., EV Battery Technology Trends"
                  className="h-14 text-base px-4"
                  style={{ fontSize: "16px" }}
                  autoFocus
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Keywords</label>
                <p className="text-xs text-muted-foreground">
                  Add at least one. Press Enter or use commas to add multiple.
                </p>
                <TextArrayInput
                  value={selectedKeywords}
                  onChange={setSelectedKeywords}
                  placeholder="Type a keyword and press Enter…"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">
                  Description{" "}
                  <span className="font-normal text-xs">(optional)</span>
                </label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Brief context about what this research covers…"
                  className="text-base resize-none"
                  style={{ fontSize: "16px" }}
                  rows={2}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Step 1b: Template ── */}
      {currentStep === 1 && currentMode === "template" && (
        <div className="w-full max-w-2xl">
          <StepDots step={1} />
          <div className="space-y-8">
            <div className="space-y-2">
              <div className="flex items-center gap-2 mb-1">
                <div className="h-6 w-6 rounded-lg bg-amber-500/10 flex items-center justify-center">
                  <LayoutTemplate className="h-3.5 w-3.5 text-amber-500" />
                </div>
                <span className="text-xs font-medium text-amber-500 uppercase tracking-wider">
                  Template
                </span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
                Choose a template
              </h1>
              <p className="text-muted-foreground">
                Templates pre-fill keywords for common research types.
              </p>
            </div>

            <TemplatePicker
              selected={selectedTemplate}
              onSelect={handleTemplateSelect}
            />

            {selectedTemplate && (
              <div className="space-y-4 pt-4 border-t border-border/60">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Topic Name</label>
                  <Input
                    value={topicName}
                    onChange={(e) => setTopicName(e.target.value)}
                    placeholder={`e.g., ${selectedTemplate.name} — Q2 2026`}
                    className="h-14 text-base px-4"
                    style={{ fontSize: "16px" }}
                    autoFocus
                  />
                </div>
                {selectedKeywords.length > 0 && (
                  <div className="rounded-xl bg-amber-500/5 border border-amber-500/20 p-4">
                    <p className="text-xs font-medium text-amber-600 dark:text-amber-400 mb-2">
                      Keywords from template
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedKeywords.map((kw) => (
                        <span
                          key={kw}
                          className="inline-flex items-center rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400 px-2.5 py-0.5 text-xs font-medium"
                        >
                          {kw}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">
                    Add more keywords{" "}
                    <span className="font-normal text-xs">(optional)</span>
                  </label>
                  <TextArrayInput
                    value={selectedKeywords}
                    onChange={setSelectedKeywords}
                    placeholder="Add additional keywords…"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Step 1c: AI — subject + project (combined) ── */}
      {currentStep === 1 && currentMode === "ai" && (
        <div className="w-full max-w-2xl">
          {/* Show AI state machine when processing */}
          {aiPhase.status === "creating" || aiPhase.status === "suggesting" ? (
            <AiProcessing phase={aiPhase.status} />
          ) : aiPhase.status === "reviewing" ? (
            <AiReview
              phase={aiPhase}
              onStart={handleStartResearch}
              onViewFirst={handleViewTopicFirst}
              isLaunching={false}
            />
          ) : aiPhase.status === "launching" ? (
            <AiProcessing phase="suggesting" />
          ) : aiPhase.status === "error" ? (
            <div className="space-y-6 py-8">
              <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-5 space-y-2">
                <p className="font-semibold text-destructive">
                  Something went wrong
                </p>
                <p className="text-sm text-muted-foreground">
                  {aiPhase.message}
                </p>
              </div>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setAiPhase({ status: "idle" })}
                >
                  Try again
                </Button>
                {aiPhase.topicId && (
                  <Button onClick={handleViewTopicFirst}>
                    View topic anyway
                  </Button>
                )}
              </div>
            </div>
          ) : (
            /* idle — show the subject + project setup */
            <div className="space-y-8">
              <div className="space-y-2">
                <div className="flex items-center gap-2 mb-1">
                  <div className="h-6 w-6 rounded-lg bg-violet-500/10 flex items-center justify-center">
                    <Zap className="h-3.5 w-3.5 text-violet-500" />
                  </div>
                  <span className="text-xs font-medium text-violet-500 uppercase tracking-wider">
                    AI-Assisted
                  </span>
                </div>
                <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
                  What are you curious about?
                </h1>
                <p className="text-muted-foreground">
                  Describe your subject freely — a name, a question, or a
                  paragraph.
                </p>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Subject</label>
                  <Textarea
                    value={subjectDescription}
                    onChange={(e) => setSubjectDescription(e.target.value)}
                    placeholder="e.g., How electric vehicle adoption is reshaping the used car market — pricing trends, consumer sentiment, and which brands are winning…"
                    className="text-base resize-none min-h-[160px]"
                    style={{ fontSize: "16px" }}
                    autoFocus
                    rows={6}
                  />
                </div>

                <div className="rounded-xl bg-violet-500/5 border border-violet-500/15 p-4 space-y-2">
                  <p className="text-sm font-medium">AI will handle:</p>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    {[
                      "Polish the topic name and write a description",
                      "Generate and save relevant search keywords",
                      "The pipeline runs only when you say go",
                    ].map((item) => (
                      <li key={item} className="flex items-center gap-2">
                        <Check className="h-3.5 w-3.5 text-violet-500 shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <button
                    type="button"
                    onClick={() => setShowAdditionalInstructions((v) => !v)}
                    className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <ChevronDown
                      className={cn(
                        "h-4 w-4 transition-transform",
                        showAdditionalInstructions && "rotate-180",
                      )}
                    />
                    Additional instructions
                    <span className="text-xs">(optional)</span>
                  </button>
                  {showAdditionalInstructions && (
                    <div className="mt-3">
                      <Textarea
                        value={additionalInstructions}
                        onChange={(e) =>
                          setAdditionalInstructions(e.target.value)
                        }
                        placeholder="Any extra context, constraints, or focus areas for the AI agent…"
                        className="text-base resize-none"
                        style={{ fontSize: "16px" }}
                        rows={3}
                      />
                    </div>
                  )}
                </div>

                {/* Project selection inline for AI path */}
                <div className="space-y-3 pt-2 border-t border-border/60">
                  <div>
                    <label className="text-sm font-medium">Project</label>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Which project should this topic live in?
                    </p>
                  </div>
                  <ProjectList
                    selectedId={selectedProjectId}
                    onSelect={(id, name) => {
                      setSelectedProjectId(id);
                      setSelectedProjectName(name);
                    }}
                    onCreateNew={() => setCreateProjectOpen(true)}
                    isLoading={projectsLoading}
                    projectsByOrg={projectsByOrg}
                    flatProjects={flatProjects}
                    showOrgHeaders={showOrgHeaders}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Step 2: Project Selection (manual / template) ── */}
      {currentStep === 2 &&
        (currentMode === "manual" || currentMode === "template") && (
          <div className="w-full max-w-2xl">
            <StepDots step={2} />
            <div className="space-y-8">
              <div className="space-y-2">
                <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
                  Choose a Project
                </h1>
                <p className="text-muted-foreground">
                  Research topics live inside a project.
                </p>
              </div>

              {/* Topic summary */}
              <div className="rounded-xl bg-muted/40 border border-border/60 p-4 space-y-1">
                <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">
                  Creating topic
                </p>
                <p className="font-semibold text-foreground">
                  {topicName || "Untitled"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {selectedKeywords.length} keyword
                  {selectedKeywords.length !== 1 ? "s" : ""}
                  {selectedTemplate ? ` · ${selectedTemplate.name}` : ""} ·
                  semi-automated
                </p>
              </div>

              <ProjectList
                selectedId={selectedProjectId}
                onSelect={(id, name) => {
                  setSelectedProjectId(id);
                  setSelectedProjectName(name);
                }}
                onCreateNew={() => setCreateProjectOpen(true)}
                isLoading={projectsLoading}
                projectsByOrg={projectsByOrg}
                flatProjects={flatProjects}
                showOrgHeaders={showOrgHeaders}
              />
            </div>
          </div>
        )}

      {/* ── Error ── */}
      {error && (
        <div className="w-full max-w-2xl mt-4 rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* ── Navigation ── */}
      {currentStep > 0 &&
        !aiIsProcessing &&
        aiPhase.status !== "reviewing" &&
        aiPhase.status !== "error" && (
          <div className="w-full max-w-2xl flex items-center justify-between mt-8 pt-6 border-t border-border">
            <Button
              variant="ghost"
              onClick={handleBack}
              className="gap-2 min-h-[44px]"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>

            {currentMode === "ai" ? (
              /* AI path: single-step, the CTA triggers the state machine */
              <Button
                onClick={handleAiSubmit}
                disabled={!canContinue || !selectedProjectId}
                className="gap-2 min-h-[44px] bg-violet-600 hover:bg-violet-700 text-white px-6"
              >
                <Zap className="h-4 w-4" />
                Build with AI
              </Button>
            ) : currentStep === 1 ? (
              <Button
                onClick={handleContinue}
                disabled={!canContinue}
                className="gap-2 min-h-[44px]"
              >
                Continue
                <ArrowRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                onClick={handleManualSubmit}
                disabled={!canContinue}
                className="gap-2 min-h-[44px] px-6"
              >
                Create Topic
              </Button>
            )}
          </div>
        )}

      <CreateProjectModal
        isOpen={createProjectOpen}
        onClose={() => setCreateProjectOpen(false)}
        redirectOnSuccess={false}
        onSuccess={(project) => {
          dispatch(invalidateNavTree());
          setSelectedProjectId(project.id);
          setSelectedProjectName(project.name);
          setCreateProjectOpen(false);
        }}
      />
    </div>
  );
}
