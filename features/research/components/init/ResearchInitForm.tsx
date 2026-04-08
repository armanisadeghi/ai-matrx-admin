"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, ArrowRight, Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { CreateProjectModal } from "@/features/projects/components/CreateProjectModal";
import { useResearchApi } from "../../hooks/useResearchApi";
import { TemplatePicker } from "./TemplatePicker";
import { AutonomySelector } from "./AutonomySelector";
import type { AutonomyLevel, ResearchTemplate } from "../../types";
import { keywordTemplatesFromJson } from "../../types";
import {
  HierarchyCascade,
  EMPTY_SELECTION,
} from "@/features/context/components/hierarchy-selection";
import type { HierarchySelection } from "@/features/context/components/hierarchy-selection";
import { useAppDispatch } from "@/lib/redux/hooks";
import { invalidateNavTree } from "@/features/context/redux/hierarchySlice";

const STEPS = ["Project", "Topic", "Template", "Keywords", "Settings"] as const;

export default function ResearchInitForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const api = useResearchApi();
  const [isPending, startTransition] = useTransition();
  const dispatch = useAppDispatch();
  const [createProjectOpen, setCreateProjectOpen] = useState(false);

  const [step, setStep] = useState(0);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(
    null,
  );
  const [selectedProjectName, setSelectedProjectName] = useState<string | null>(
    null,
  );
  const [topicName, setTopicName] = useState(searchParams?.get("topic") ?? "");
  const [description, setDescription] = useState("");
  const [selectedTemplate, setSelectedTemplate] =
    useState<ResearchTemplate | null>(null);
  const [selectedKeywords, setSelectedKeywords] = useState<string[]>([]);
  const [customKeyword, setCustomKeyword] = useState("");
  const [autonomyLevel, setAutonomyLevel] = useState<AutonomyLevel>("semi");
  const [error, setError] = useState<string | null>(null);

  const handleTemplateSelect = (template: ResearchTemplate | null) => {
    setSelectedTemplate(template);
    const kws = template
      ? keywordTemplatesFromJson(template.keyword_templates)
      : [];
    if (kws.length > 0) {
      setSelectedKeywords((prev) => {
        const merged = new Set([...prev, ...kws]);
        return Array.from(merged);
      });
    }
  };

  const handleNext = () => {
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };

  const handleBack = () => setStep((s) => Math.max(s - 1, 0));

  const toggleKeyword = (kw: string) => {
    setSelectedKeywords((prev) =>
      prev.includes(kw) ? prev.filter((k) => k !== kw) : [...prev, kw],
    );
  };

  const addCustomKeyword = () => {
    const kw = customKeyword.trim();
    if (kw && !selectedKeywords.includes(kw)) {
      setSelectedKeywords((prev) => [...prev, kw]);
      setCustomKeyword("");
    }
  };

  const handleSubmit = () => {
    if (!selectedProjectId || selectedKeywords.length < 1) {
      setError("Missing required fields");
      return;
    }
    setError(null);

    startTransition(async () => {
      try {
        const response = await api.createTopic(selectedProjectId!, {
          name: topicName.trim(),
          description: description.trim() || null,
          autonomy_level: autonomyLevel,
          template_id: selectedTemplate?.id ?? null,
        });
        const topic = await response.json();

        await api.addKeywords(topic.id, { keywords: selectedKeywords });

        if (autonomyLevel === "auto") {
          api.runPipeline(topic.id).catch(() => {});
        }

        router.push(`/p/research/topics/${topic.id}`);
      } catch (err) {
        setError((err as Error).message);
      }
    });
  };

  const canProceed =
    step === 0
      ? !!selectedProjectId
      : step === 1
        ? topicName.trim().length > 0
        : step === 2
          ? true
          : step === 3
            ? selectedKeywords.length >= 1
            : true;

  return (
    <div className="flex flex-col items-center justify-start min-h-full py-8 px-4 sm:px-6">
      {/* Step Indicator */}
      <div className="flex items-center gap-2 mb-8">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className={cn(
                "flex items-center justify-center h-8 w-8 rounded-full text-xs font-semibold transition-colors",
                i === step
                  ? "bg-primary text-primary-foreground"
                  : i < step
                    ? "bg-primary/20 text-primary"
                    : "bg-muted text-muted-foreground",
              )}
            >
              {i + 1}
            </div>
            {i < STEPS.length - 1 && (
              <div
                className={cn(
                  "h-px w-6 sm:w-10",
                  i < step ? "bg-primary/40" : "bg-border",
                )}
              />
            )}
          </div>
        ))}
      </div>

      <div className="w-full max-w-2xl">
        {/* Step 0: Select Project */}
        {step === 0 && (
          <div className="space-y-6">
            <div className="text-center">
              <h1 className="text-2xl font-bold">Select a Project</h1>
              <p className="mt-2 text-muted-foreground">
                Research topics belong to a project. Pick one or create a new
                one.
              </p>
            </div>

            <div className="space-y-4">
              <HierarchyCascade
                levels={["organization", "project"]}
                value={{
                  ...EMPTY_SELECTION,
                  projectId: selectedProjectId,
                }}
                onChange={(sel: HierarchySelection) => {
                  setSelectedProjectId(sel.projectId);
                  setSelectedProjectName(sel.projectName);
                }}
                layout="vertical"
              />
              <button
                onClick={() => setCreateProjectOpen(true)}
                className="w-full flex items-center gap-3 rounded-xl border-2 border-dashed border-border p-4 text-left transition-colors hover:border-primary/30 min-h-[44px]"
              >
                <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
                  <Plus className="h-4 w-4 text-muted-foreground" />
                </div>
                <span className="text-sm font-medium text-muted-foreground">
                  Create New Project
                </span>
              </button>
            </div>
          </div>
        )}

        {/* Step 1: Topic Details */}
        {step === 1 && (
          <div className="space-y-6">
            <div className="text-center">
              <h1 className="text-2xl font-bold">Name Your Research Topic</h1>
              <p className="mt-2 text-muted-foreground">
                Project:{" "}
                <span className="font-semibold text-foreground">
                  {selectedProjectName}
                </span>
              </p>
            </div>

            <div className="space-y-3">
              <label className="text-sm font-medium">Topic Name</label>
              <Input
                value={topicName}
                onChange={(e) => setTopicName(e.target.value)}
                placeholder="e.g., All Green Brand Profile, ITAD Industry Trends..."
                className="text-base h-12"
                style={{ fontSize: "16px" }}
                autoFocus
                onKeyDown={(e) =>
                  e.key === "Enter" && canProceed && handleNext()
                }
              />
            </div>

            <div className="space-y-3">
              <label className="text-sm font-medium">
                Description (optional)
              </label>
              <p className="text-xs text-muted-foreground">
                A brief description of what this research covers. Helps AI
                agents understand scope and focus.
              </p>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g., Current brand identity, positioning, messaging, and visual language. Covers tone, target audience, and competitive differentiation."
                className="text-base resize-none"
                style={{ fontSize: "16px" }}
                rows={3}
              />
            </div>
          </div>
        )}

        {/* Step 2: Template */}
        {step === 2 && (
          <div className="space-y-6">
            <div className="text-center">
              <h1 className="text-2xl font-bold">Choose a Template</h1>
              <p className="mt-2 text-muted-foreground">
                Templates pre-fill keywords and wire up specialized AI agents.
                Optional.
              </p>
            </div>
            <TemplatePicker
              selected={selectedTemplate}
              onSelect={handleTemplateSelect}
            />
          </div>
        )}

        {/* Step 3: Keywords */}
        {step === 3 && (
          <div className="space-y-6">
            <div className="text-center">
              <h1 className="text-2xl font-bold">Add Keywords</h1>
              <p className="mt-2 text-muted-foreground">
                Keywords drive the search and analysis pipeline. Add at least
                one.
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex gap-2">
                <Input
                  value={customKeyword}
                  onChange={(e) => setCustomKeyword(e.target.value)}
                  placeholder="Type a keyword and press Enter..."
                  className="text-base flex-1"
                  style={{ fontSize: "16px" }}
                  autoFocus
                  onKeyDown={(e) => e.key === "Enter" && addCustomKeyword()}
                />
                <Button
                  variant="outline"
                  onClick={addCustomKeyword}
                  disabled={!customKeyword.trim()}
                  className="min-h-[44px]"
                >
                  Add
                </Button>
              </div>
              {selectedKeywords.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-2">
                  {selectedKeywords.map((kw) => (
                    <span
                      key={kw}
                      className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 text-primary px-3 py-1.5 text-sm font-medium"
                    >
                      {kw}
                      <button
                        onClick={() => toggleKeyword(kw)}
                        className="hover:text-destructive min-w-[28px] min-h-[28px] flex items-center justify-center"
                      >
                        &times;
                      </button>
                    </span>
                  ))}
                </div>
              )}
              {selectedKeywords.length === 0 && (
                <p className="text-xs text-muted-foreground italic pt-1">
                  No keywords yet. Add at least one to continue.
                </p>
              )}
            </div>
          </div>
        )}

        {/* Step 4: Settings */}
        {step === 4 && (
          <div className="space-y-6">
            <div className="text-center">
              <h1 className="text-2xl font-bold">How Much Automation?</h1>
              <p className="mt-2 text-muted-foreground">
                Choose how much the system does automatically.
              </p>
            </div>
            <AutonomySelector
              value={autonomyLevel}
              onChange={setAutonomyLevel}
            />
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mt-4 rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between mt-8 pt-6 border-t border-border">
          <Button
            variant="ghost"
            onClick={handleBack}
            disabled={step === 0}
            className="gap-2 min-h-[44px]"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          {step < STEPS.length - 1 ? (
            <Button
              onClick={handleNext}
              disabled={!canProceed}
              className="gap-2 min-h-[44px]"
            >
              Next
              <ArrowRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={isPending || !canProceed}
              className="gap-2 min-h-[44px]"
            >
              {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {autonomyLevel === "auto" ? "Start Research" : "Create Topic"}
            </Button>
          )}
        </div>
      </div>

      <CreateProjectModal
        isOpen={createProjectOpen}
        onClose={() => setCreateProjectOpen(false)}
        onSuccess={() => {
          dispatch(invalidateNavTree());
          setCreateProjectOpen(false);
        }}
      />
    </div>
  );
}
