"use client";

// THE SHAPES COME FROM THE REGISTRY, via the parser that produces them —
// this renderer never re-declares them (`check:kind-type-twins`).
import { FullScreenPortal } from "../FullScreenPortal";
import type {
  ResourceItem,
  ResourceCategory,
  ResourceCollectionData,
} from "./parseResourcesMarkdown";
import React, { useState, useMemo, useRef, useCallback } from "react";
import {
  FolderOpen,
  ExternalLink,
  Star,
  BookOpen,
  Video,
  FileText,
  Maximize2,
  Minimize2,
  Search,
  Check,
  Clock,
  Award,
  Play,
  Globe,
  Zap,
  Users,
  TrendingUp,
  Heart,
  Printer,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { useCanvas } from "@/features/canvas/hooks/useCanvas";
import { useOpenArtifactInCanvas } from "@/features/canvas/hooks/useOpenArtifactInCanvas";
import { isMaterializedArtifactId } from "@ai-matrx/kit/artifact-id";
import { getArtifactDef } from "@/features/canvas/artifact-types/artifact-type-registry";
import { IconButton } from "@ai-matrx/design-system";
import { matchesSearch as matchesSearchScoring } from "@ai-matrx/kit/search-scoring";

import { DisclosureHeader, Select } from "@ai-matrx/design-system/controls";
import { OutboundLink } from "@ai-matrx/kit/outbound-react";
import { useBlockHostSlot, useBlockTypeLabelSlot } from "@ai-matrx/rich-content/display/block-host";
import { BlockTypeLabel } from "@ai-matrx/rich-content/display/block-type-label";
import { BlockControlsButton, InlineControlText, useBlockControls } from "@ai-matrx/rich-content/display/block-controls/BlockControls";
import { useBlockEdit } from "@ai-matrx/rich-content/display/block-controls/block-edit";
interface ResourceCollectionBlockProps {
  collection: ResourceCollectionData;
  /** The block's own source text: what its Controls edit. */
  source?: string;
  taskId?: string;
  artifactId?: string;
  conversationId?: string;
  messageId?: string;
  blockIndex?: number;
}

const STAT_ITEMS = [
  { key: "total", label: "Items", icon: BookOpen },
  { key: "completed", label: "Done", icon: Check },
  { key: "favorites", label: "Saved", icon: Heart },
  { key: "progress", label: "Progress", icon: TrendingUp, suffix: "%" },
] as const;

const TYPE_ICONS = {
  documentation: BookOpen,
  tool: Zap,
  video: Video,
  article: FileText,
  course: Users,
  book: BookOpen,
  tutorial: Play,
  other: Globe,
} as const;

const TYPE_ICON_COLORS: Record<string, string> = {
  documentation: "text-blue-600 dark:text-blue-400",
  tool: "text-purple-600 dark:text-purple-400",
  video: "text-red-600 dark:text-red-400",
  article: "text-green-600 dark:text-green-400",
  course: "text-orange-600 dark:text-orange-400",
  book: "text-indigo-600 dark:text-indigo-400",
  tutorial: "text-pink-600 dark:text-pink-400",
  other: "text-muted-foreground",
};

const ResourceCollectionBlock: React.FC<ResourceCollectionBlockProps> = ({
  collection,
  source,
  taskId,
  artifactId,
  conversationId,
  messageId,
  blockIndex,
}) => {
  const [isFullScreen, setIsFullScreen] = useState(false);
  const host = useBlockHostSlot();
  // The kind host's type label joins this header: ONE header row (review 5, G1).
  const typeLabel = useBlockTypeLabelSlot();
  const controls = useBlockControls("resources", source ?? "", useBlockEdit());
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
      const filename = collection.title.replace(/\s+/g, "-").toLowerCase() || "resources";
      downloadFile(`${filename}.pdf`, await captureDocumentPdf(blockContentRef.current, { orientation: "portrait" }), "application/pdf");
    } catch (err) {
      console.error("[ResourceCollectionBlock] Print failed:", err);
    } finally {
      setIsPrinting(false);
    }
  }, [collection.title, isPrinting]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>("all");
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [completed, setCompleted] = useState<Set<string>>(new Set());
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    () =>
      new Set(
        collection.categories[0]?.id ? [collection.categories[0].id] : [],
      ),
  );
  const { open: openCanvas } = useCanvas();
  const { openArtifact } = useOpenArtifactInCanvas();

  const handleOpenCanvas = () => {
    const def = getArtifactDef("resources");

    if (def?.materializable && isMaterializedArtifactId(artifactId)) {
      void openArtifact({
        canvasType: "resources",
        title: collection.title,
        content: JSON.stringify(collection),
        conversationId,
        messageId,
        artifactId,
        artifactIndex: blockIndex && blockIndex > 0 ? blockIndex : 1,
      });
      return;
    }

    openCanvas({
      type: "resources",
      data: collection,
      metadata: {
        title: collection.title,
        sourceTaskId: taskId,
      },
    });
  };

  // Get all unique types and difficulties
  const allTypes = useMemo(() => {
    const types = new Set<string>();
    collection.categories.forEach((cat) => {
      cat.resources.forEach((res) => types.add(res.type));
    });
    return Array.from(types);
  }, [collection.categories]);

  const allDifficulties = useMemo(() => {
    const difficulties = new Set<string>();
    collection.categories.forEach((cat) => {
      cat.resources.forEach((res) => {
        if (res.difficulty) difficulties.add(res.difficulty);
      });
    });
    return Array.from(difficulties);
  }, [collection.categories]);

  // Filter resources
  const filteredCategories = useMemo(() => {
    return collection.categories
      .map((category) => ({
        ...category,
        resources: category.resources.filter((resource) => {
          const matchesSearch =
            searchQuery === "" ||
            matchesSearchScoring(resource, searchQuery, [
              { get: (r) => r.title, weight: "title" },
              { get: (r) => r.description, weight: "body" },
              { get: (r) => r.tags, weight: "tag" },
            ]);

          const matchesType =
            selectedType === "all" || resource.type === selectedType;
          const matchesDifficulty =
            selectedDifficulty === "all" ||
            resource.difficulty === selectedDifficulty;

          return matchesSearch && matchesType && matchesDifficulty;
        }),
      }))
      .filter((category) => category.resources.length > 0);
  }, [collection.categories, searchQuery, selectedType, selectedDifficulty]);

  // Calculate progress
  const totalResources = collection.categories.reduce(
    (sum, cat) => sum + cat.resources.length,
    0,
  );
  const completedCount = completed.size;
  const progressPercentage =
    totalResources > 0
      ? Math.round((completedCount / totalResources) * 100)
      : 0;

  const stats = useMemo(
    () => ({
      total: totalResources,
      completed: completedCount,
      favorites: favorites.size,
      progress: progressPercentage,
    }),
    [totalResources, completedCount, favorites.size, progressPercentage],
  );

  const toggleFavorite = (resourceId: string) => {
    const newFavorites = new Set(favorites);
    if (newFavorites.has(resourceId)) {
      newFavorites.delete(resourceId);
    } else {
      newFavorites.add(resourceId);
    }
    setFavorites(newFavorites);
  };

  const toggleCompleted = (resourceId: string) => {
    const newCompleted = new Set(completed);
    if (newCompleted.has(resourceId)) {
      newCompleted.delete(resourceId);
    } else {
      newCompleted.add(resourceId);
    }
    setCompleted(newCompleted);
  };

  const toggleCategory = (categoryId: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId);
    } else {
      newExpanded.add(categoryId);
    }
    setExpandedCategories(newExpanded);
  };

  const getTypeIcon = (type: string) => {
    const IconComponent = TYPE_ICONS[type as keyof typeof TYPE_ICONS] ?? Globe;
    const color = TYPE_ICON_COLORS[type] ?? TYPE_ICON_COLORS.other;
    return <IconComponent className={`h-3.5 w-3.5 flex-shrink-0 ${color}`} />;
  };

  const getDifficultyColor = (difficulty: string) => {
    const colorMap = {
      beginner:
        "text-green-700 dark:text-green-300 bg-green-100 dark:bg-green-950/30",
      intermediate:
        "text-yellow-700 dark:text-yellow-300 bg-yellow-100 dark:bg-yellow-950/30",
      advanced: "text-red-700 dark:text-red-300 bg-red-100 dark:bg-red-950/30",
    };
    return colorMap[difficulty as keyof typeof colorMap] || "";
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-3 w-3 ${
              star <= rating
                ? "text-yellow-500 fill-yellow-500"
                : "text-gray-300 dark:text-gray-600"
            }`}
          />
        ))}
      </div>
    );
  };

  return (
    <FullScreenPortal active={isFullScreen}>
      {isFullScreen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
          onClick={() => setIsFullScreen(false)}
        />
      )}

      <div
        data-block-frame="resources"
        className={isFullScreen ? "fixed inset-0 z-50 flex w-full items-center justify-center p-2" : `my-3 w-full overflow-hidden rounded-lg border bg-card transition-colors ${host.selected ? "border-primary" : "border-border"}`}
      >
        <div
          className={`max-w-6xl mx-auto ${isFullScreen ? "bg-textured rounded-xl shadow-2xl h-full max-h-[95dvh] w-full flex flex-col overflow-hidden border border-border" : ""}`}
        >
          {isFullScreen && (
            <div className="flex-shrink-0 px-3 py-2 border-b border-border flex flex-wrap items-center justify-between gap-2 bg-muted/50">
              <div className="flex items-center gap-2 min-w-0">
                <FolderOpen className="h-4 w-4 flex-shrink-0 text-violet-600 dark:text-violet-400" />
                <h3 className="text-sm font-semibold text-foreground truncate">
                  {collection.title}
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

          {/* ONE frame (review 2 N3 class): the card's single header row — title left (always
              visible: the actions wrap under it on a phone), every action right. */}
          {!isFullScreen && (
            <div
              data-block-header
              className="flex flex-wrap items-center justify-between gap-x-2 gap-y-0.5 border-b border-border bg-muted/50 px-3 py-1.5"
            >
              <div className="flex min-w-[9rem] flex-1 items-center gap-2">
                <FolderOpen className="h-3.5 w-3.5 shrink-0 text-primary" />
                <h1 className="min-w-0 text-sm font-medium leading-tight text-foreground">
                  <InlineControlText controls={controls} fieldKey="title" value={collection.title}>
                    {collection.title}
                  </InlineControlText>
                </h1>
                {typeLabel ? <BlockTypeLabel>{typeLabel}</BlockTypeLabel> : null}
              </div>
              <div className="flex shrink-0 flex-wrap items-center gap-0.5">
                <IconButton
                  icon={Printer}
                  tooltip={isPrinting ? "Saving…" : "Print / Save as PDF"}
                  onClick={handlePrint}
                  disabled={isPrinting}
                />
                <IconButton icon={ExternalLink} tooltip="Open Canvas" onClick={handleOpenCanvas} />
                <IconButton icon={Maximize2} tooltip="Expand to full screen" onClick={() => setIsFullScreen(true)} />
                <BlockControlsButton controls={controls} title="Resources controls" />
                {host.actions}
              </div>
            </div>
          )}

          <div className={isFullScreen ? "flex-1 overflow-y-auto" : ""}>
            <div ref={blockContentRef} className="p-2 space-y-3">
              {/* Summary: description, counts, search */}
              <div>
                {collection.description && (
                  <p className="mb-2 text-xs text-muted-foreground line-clamp-2">{collection.description}</p>
                )}

                {/* Stats */}
                <div className="grid grid-cols-4 gap-1.5 mb-2">
                  {STAT_ITEMS.map((item) => {
                    const { key, label, icon: StatIcon } = item;
                    const suffix = "suffix" in item ? item.suffix : "";
                    return (
                      <div
                        key={key}
                        className="rounded-md border border-border bg-background/50 px-1.5 py-1.5 text-center"
                      >
                        <div className="flex items-center justify-center gap-1 text-muted-foreground">
                          <StatIcon className="h-3 w-3 flex-shrink-0" />
                          <span className="text-[10px] font-medium truncate hidden md:inline">
                            {label}
                          </span>
                        </div>
                        <div className="text-sm font-semibold text-foreground tabular-nums">
                          {stats[key]}
                          {suffix}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Progress bar */}
                <div className="mb-2">
                  <div className="flex justify-between text-[10px] text-muted-foreground mb-0.5">
                    <span className="hidden sm:inline">Progress</span>
                    <span className="tabular-nums">
                      {completedCount}/{totalResources}
                    </span>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-violet-500 dark:bg-violet-600 transition-all duration-300 rounded-full"
                      style={{ width: `${progressPercentage}%` }}
                    />
                  </div>
                </div>

                {/* Search & filters */}
                <div className="flex flex-col sm:flex-row gap-1.5">
                  <div className="flex-1 relative min-w-0">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <input
                      type="text"
                      placeholder="Search…"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-8 pr-2 py-1.5 text-base sm:text-xs rounded-md border border-border bg-background text-foreground placeholder:text-muted-foreground focus:ring-1 focus:ring-violet-500 focus:border-transparent"
                      style={{ fontSize: "16px" }}
                    />
                  </div>
                  <div className="flex gap-1.5">
                    <Select
                      value={selectedType}
                      onValueChange={setSelectedType}
                      aria-label="Type"
                      className="flex-1 sm:flex-none"
                      options={[
                        { value: "all", label: "All types" },
                        ...allTypes.map((type) => ({
                          value: type,
                          label: type.charAt(0).toUpperCase() + type.slice(1),
                        })),
                      ]}
                    />
                    {allDifficulties.length > 0 && (
                      <Select
                        value={selectedDifficulty}
                        onValueChange={setSelectedDifficulty}
                        aria-label="Level"
                        className="flex-1 sm:flex-none"
                        options={[
                          { value: "all", label: "All levels" },
                          ...allDifficulties.map((difficulty) => ({
                            value: difficulty,
                            label: difficulty.charAt(0).toUpperCase() + difficulty.slice(1),
                          })),
                        ]}
                      />
                    )}
                  </div>
                </div>
              </div>

              {/* Categories */}
              <div className="space-y-2">
                {filteredCategories.map((category) => {
                  const isExpanded = expandedCategories.has(category.id);
                  return (
                    <div
                      key={category.id}
                      className="rounded-lg border border-border bg-background/50 overflow-hidden"
                    >
                      <DisclosureHeader
                        chevron="end"
                        className="w-full"
                        open={isExpanded}
                        onClick={() => toggleCategory(category.id)}
                        title={category.name}
                        meta={category.description || undefined}
                        end={category.resources.length}
                      />

                      {isExpanded && (
                        <div className="border-t border-border p-2">
                          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 items-stretch">
                            {category.resources.map((resource) => {
                              const isDone = completed.has(resource.id);
                              const isFav = favorites.has(resource.id);
                              return (
                                <div
                                  key={resource.id}
                                  className={`flex flex-col h-full rounded-md border p-2 transition-colors ${
                                    isDone
                                      ? "border-green-300 dark:border-green-700 bg-green-50/50 dark:bg-green-950/20"
                                      : "border-border bg-card hover:border-violet-300 dark:hover:border-violet-700"
                                  }`}
                                >
                                  <div className="flex items-start gap-2 min-w-0 flex-1">
                                    {getTypeIcon(resource.type)}
                                    <div className="flex-1 min-w-0">
                                      <h3
                                        className={`text-sm font-medium leading-snug line-clamp-2 ${
                                          isDone
                                            ? "line-through text-green-700 dark:text-green-300"
                                            : "text-foreground"
                                        }`}
                                      >
                                        {resource.title}
                                      </h3>
                                      <p
                                        className={`text-xs text-muted-foreground mt-0.5 line-clamp-3 ${
                                          isDone ? "line-through" : ""
                                        }`}
                                      >
                                        {resource.description}
                                      </p>
                                      {(resource.difficulty ||
                                        resource.duration) && (
                                        <div className="flex items-center gap-1.5 flex-wrap mt-1">
                                          {resource.difficulty && (
                                            <span
                                              className={`px-1.5 py-0.5 text-[10px] font-medium rounded-full ${getDifficultyColor(resource.difficulty)}`}
                                            >
                                              {resource.difficulty}
                                            </span>
                                          )}
                                          {resource.duration && (
                                            <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                                              <Clock className="h-3 w-3" />
                                              {resource.duration}
                                            </span>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                    <div className="flex flex-col gap-0.5 flex-shrink-0">
                                      <IconButton
                                        icon={Heart}
                                        tooltip={
                                          isFav
                                            ? "Remove from saved"
                                            : "Save resource"
                                        }
                                        onClick={() =>
                                          toggleFavorite(resource.id)
                                        }
                                        glyphTone={isFav ? "destructive" : undefined}
                                      />
                                      <IconButton
                                        icon={Check}
                                        tooltip={
                                          isDone
                                            ? "Mark incomplete"
                                            : "Mark complete"
                                        }
                                        onClick={() =>
                                          toggleCompleted(resource.id)
                                        }
                                        className={
                                          isDone
                                            ? "text-green-600 dark:text-green-400"
                                            : "text-muted-foreground"
                                        }
                                      />
                                    </div>
                                  </div>

                                  <div className="mt-auto pt-2 flex flex-col gap-1.5">
                                    {resource.rating != null && (
                                      <div className="flex justify-center">
                                        {renderStars(resource.rating)}
                                      </div>
                                    )}
                                    <OutboundLink
                                      href={resource.url}
                                      className="flex items-center justify-center gap-1 w-full py-1.5 px-2 bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-medium rounded-md transition-colors"
                                    >
                                      <ExternalLink className="h-3 w-3" />
                                      <span className="hidden sm:inline">
                                        Open
                                      </span>
                                    </OutboundLink>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {progressPercentage === 100 && totalResources > 0 && (
                <div className="rounded-lg p-3 border border-green-300 dark:border-green-700">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-500 dark:bg-green-600 rounded-full flex-shrink-0">
                      <Award className="h-4 w-4 text-white" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-sm font-semibold text-green-900 dark:text-green-100">
                        Collection complete
                      </h3>
                      <p className="text-xs text-green-700 dark:text-green-300">
                        All resources in {collection.title} are done.
                      </p>
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

export default ResourceCollectionBlock;
