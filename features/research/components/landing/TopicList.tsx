"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import Link from "next/link";
import {
  Plus,
  Loader2,
  Trash2,
  ArrowRight,
  Sparkles,
  Search,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
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
import { cn } from "@/lib/utils";
import { useHierarchyFilter } from "@/components/hierarchy-filter";
import {
  HierarchyPills,
  EMPTY_SELECTION,
} from "@/features/agent-context/components/hierarchy-selection";
import type { HierarchySelection } from "@/features/agent-context/components/hierarchy-selection";
import {
  useTopicsForProject,
  useTopicsForProjects,
} from "../../hooks/useResearchState";
import { StatusBadge } from "../shared/StatusBadge";
import type { ResearchTopic } from "../../types";
import { supabase } from "@/utils/supabase/client";
import { CreateOrgModal } from "@/features/organizations";
import { ProjectFormSheet } from "@/features/projects";
import type { Project } from "@/features/projects";

function useFilteredTopics(filter: ReturnType<typeof useHierarchyFilter>) {
  const { selectedProjectId, filteredProjects } = filter;
  const projectIds = filteredProjects.map((p) => p.id);

  const singleProject = useTopicsForProject(selectedProjectId ?? undefined);
  const allProjects = useTopicsForProjects(selectedProjectId ? [] : projectIds);

  if (selectedProjectId) return singleProject;
  return allProjects;
}

export default function TopicList() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const filter = useHierarchyFilter();
  const searchQuery = searchParams.get("q") ?? "";
  const setSearchQuery = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set("q", value);
    } else {
      params.delete("q");
    }
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };
  const [navigatingId, setNavigatingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ResearchTopic | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [isNewOrgOpen, setIsNewOrgOpen] = useState(false);
  const [isNewProjectOpen, setIsNewProjectOpen] = useState(false);
  const [quickTopicName, setQuickTopicName] = useState("");
  const quickInputRef = useRef<HTMLInputElement>(null);

  const {
    data: topics,
    isLoading: topicsLoading,
    refresh,
  } = useFilteredTopics(filter);

  useEffect(() => {
    if (!topicsLoading && (topics ?? []).length === 0) {
      quickInputRef.current?.focus();
    }
  }, [topicsLoading, topics]);

  const filteredTopics = (topics ?? []).filter(
    (t) =>
      !searchQuery || t.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const handleQuickStart = () => {
    const name = quickTopicName.trim();
    if (!name) {
      router.push("/p/research/topics/new");
      return;
    }
    startTransition(() => {
      router.push(`/p/research/topics/new?topic=${encodeURIComponent(name)}`);
    });
  };

  const handleNavigateToTopic = (topicId: string, e?: React.MouseEvent) => {
    if (e && (e.metaKey || e.ctrlKey)) return;
    e?.preventDefault();
    if (navigatingId) return;
    setNavigatingId(topicId);
    startTransition(() => {
      router.push(`/p/research/topics/${topicId}`);
    });
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const { error } = await supabase
        .from("rs_topic")
        .delete()
        .eq("id", deleteTarget.id);
      if (error) throw error;
      refresh();
    } catch {
      // silently fail for now
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  const topicsLoaded = !filter.isLoading && !topicsLoading;
  const hasTopics = filteredTopics.length > 0;

  const projectNameMap = new Map(
    (filter.filteredProjects ?? []).map((p) => [p.id, p.name]),
  );

  return (
    <div className="h-[calc(100dvh-var(--header-height,2.5rem))] flex flex-col overflow-hidden bg-textured">
      {/* Static toolbar — renders instantly */}
      <div className="flex-shrink-0 px-3 sm:px-5 pt-2.5 pb-0">
        <div className="flex items-center gap-1.5 p-1 rounded-full">
          <HierarchyPills
            levels={["organization", "scope", "project"]}
            value={{
              ...EMPTY_SELECTION,
              organizationId: filter.selectedOrgId,
              projectId: filter.selectedProjectId,
            }}
            onChange={(sel) => {
              if (sel.organizationId !== filter.selectedOrgId)
                filter.selectOrg(sel.organizationId);
              if (sel.projectId !== filter.selectedProjectId)
                filter.selectProject(sel.projectId);
              if (!sel.organizationId && !sel.projectId) filter.resetAll();
            }}
          />
          <div className="w-px h-4 bg-border/30 mx-0.5" />
          <div className="flex-1 flex items-center gap-1.5 min-w-0 h-6 px-2 rounded-full bg-muted/30">
            <Search className="h-3 w-3 text-muted-foreground shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search topics..."
              className="flex-1 min-w-0 bg-transparent border-0 outline-none text-xs text-foreground placeholder:text-muted-foreground"
              style={{ fontSize: "16px" }}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="shrink-0 p-0.5 rounded-full hover:bg-muted/50 transition-colors"
              >
                <X className="h-2.5 w-2.5 text-muted-foreground" />
              </button>
            )}
          </div>
          <button
            onClick={() => router.push("/p/research/topics/new")}
            className="inline-flex items-center gap-1 h-6 px-2.5 rounded-full bg-primary text-primary-foreground text-[11px] font-medium hover:bg-primary/90 transition-colors shrink-0"
          >
            <Plus className="h-3 w-3" />
            <span className="hidden sm:inline">New Topic</span>
          </button>
        </div>
      </div>

      {/* Quick-start CTA — visually distinct from search */}
      <div className="flex-shrink-0 px-3 sm:px-5 py-2 border-b border-border/50">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Sparkles className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-primary/50 pointer-events-none" />
            <Input
              ref={quickInputRef}
              value={quickTopicName}
              onChange={(e) => setQuickTopicName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleQuickStart()}
              placeholder="Start a new research topic..."
              className="pl-9 h-9 text-sm bg-primary/[0.03] border-primary/20 focus:border-primary/40 placeholder:text-primary/40"
              style={{ fontSize: "16px" }}
            />
          </div>
          <Button
            size="sm"
            className="h-9 gap-1.5 shrink-0"
            onClick={handleQuickStart}
            disabled={isPending}
          >
            {isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <>
                <span className="hidden sm:inline text-xs">Start Research</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Dynamic content — only this region shows loading */}
      <div className="flex-1 overflow-y-auto px-3 sm:px-5 pb-4">
        {!topicsLoaded ? (
          <div className="space-y-2 pt-1">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-16 rounded-xl" />
            ))}
          </div>
        ) : hasTopics ? (
          <div className="space-y-1.5 pt-1">
            {filteredTopics.map((topic) => (
              <Link
                key={topic.id}
                href={`/p/research/topics/${topic.id}`}
                className={cn(
                  "group relative flex items-center gap-3 rounded-xl border border-border/50 bg-card/60 backdrop-blur-sm p-3 transition-all hover:border-primary/25 hover:bg-card/80 cursor-pointer min-h-[44px]",
                  navigatingId === topic.id && "opacity-60",
                  navigatingId &&
                    navigatingId !== topic.id &&
                    "pointer-events-none opacity-30",
                )}
                onClick={(e) => handleNavigateToTopic(topic.id, e)}
              >
                {navigatingId === topic.id && (
                  <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-background/40 backdrop-blur-sm">
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <h3 className="font-semibold text-sm leading-tight truncate">
                      {topic.name}
                    </h3>
                    <StatusBadge status={topic.status} />
                  </div>
                  {topic.description && (
                    <p className="text-[11px] text-muted-foreground/70 mt-0.5 line-clamp-1">
                      {topic.description}
                    </p>
                  )}
                  <div className="flex items-center gap-1.5 mt-0.5">
                    {!filter.selectedProjectId &&
                      projectNameMap.get(topic.project_id) && (
                        <span className="text-[9px] font-medium text-primary/60 bg-primary/5 rounded-full px-1.5 py-px">
                          {projectNameMap.get(topic.project_id)}
                        </span>
                      )}
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(topic.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <button
                  className="h-7 w-7 flex items-center justify-center rounded-lg opacity-0 group-hover:opacity-100 hover:bg-destructive/10 transition-all shrink-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeleteTarget(topic);
                  }}
                >
                  <Trash2 className="h-3 w-3 text-destructive/70" />
                </button>
              </Link>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="h-12 w-12 rounded-2xl bg-primary/8 flex items-center justify-center mb-3">
              <Sparkles className="h-6 w-6 text-primary/60" />
            </div>
            <h3 className="text-base font-semibold mb-1.5">No topics yet</h3>
            <p className="text-muted-foreground text-xs mb-5 max-w-sm mx-auto">
              Create a research topic to start gathering, analyzing, and
              synthesizing information.
            </p>
            <Button
              asChild
              size="sm"
              className="gap-1.5 rounded-full h-8 px-4 text-xs"
            >
              <Link href="/p/research/topics/new">
                <Plus className="h-3.5 w-3.5" />
                Create Topic
              </Link>
            </Button>
          </div>
        )}
      </div>

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Topic</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete &ldquo;{deleteTarget?.name}&rdquo;
              and all its sources, analyses, and documents. This cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <CreateOrgModal
        isOpen={isNewOrgOpen}
        onClose={() => setIsNewOrgOpen(false)}
        onSuccess={() => filter.refresh()}
      />

      <ProjectFormSheet
        open={isNewProjectOpen}
        onOpenChange={setIsNewProjectOpen}
        organizationId={filter.selectedOrgId ?? undefined}
        skipRedirect
        onSuccess={(project: Project) => {
          filter.refresh();
          filter.selectProject(project.id);
        }}
      />
    </div>
  );
}
