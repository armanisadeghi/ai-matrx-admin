"use client";

import { useState, useRef, useCallback } from "react";
import Link from "next/link";
import {
  Search,
  X,
  ChevronDown,
  ArrowUpDown,
  Star,
  Tag,
  Folder,
  Loader2,
  RotateCcw,
  Check,
  ChevronRight,
  Users,
  Clock,
  Globe,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAgentConsumer } from "@/features/agents/hooks/useAgentConsumer";
import type { AgentSortOption } from "@/features/agents/redux/agent-consumers/slice";
import type { AgentDefinitionRecord } from "@/features/agents/types/agent-definition.types";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import {
  Drawer,
  DrawerTrigger,
  DrawerContent,
  DrawerTitle,
} from "@/components/ui/drawer";
import { useAgentListCore } from "./useAgentListCore";

const CONSUMER_ID = "agent-list-dropdown";

const SORT_OPTIONS: { value: AgentSortOption; label: string }[] = [
  { value: "updated-desc", label: "Recent" },
  { value: "created-desc", label: "Created" },
  { value: "name-asc", label: "A → Z" },
  { value: "name-desc", label: "Z → A" },
  { value: "category-asc", label: "Category" },
];

type RightPanel = "detail" | "sort" | "categories" | "tags" | null;

interface AgentListDropdownProps {
  onSelect?: (agentId: string) => void;
  navigateTo?: string;
  className?: string;
  label?: string;
  /** Custom trigger element — replaces the default text button. */
  triggerSlot?: React.ReactNode;
}

const PANEL_HEIGHT = "528px";
const LIST_MAX_HEIGHT = "528px";

export function AgentListDropdown({
  onSelect,
  navigateTo,
  className,
  label = "Agents",
  triggerSlot,
}: AgentListDropdownProps) {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  const [rightPanel, setRightPanel] = useState<RightPanel>(null);
  const [catSearch, setCatSearch] = useState("");
  const [tagSearch, setTagSearch] = useState("");
  const [mobileDetailAgent, setMobileDetailAgent] =
    useState<AgentDefinitionRecord | null>(null);
  const [mobileSubView, setMobileSubView] = useState<
    "sort" | "categories" | "tags" | null
  >(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const {
    agents,
    isLoading,
    activeAgentId,
    allCategories,
    allTags,
    consumer,
    activeFilterCount,
    hoveredAgent,
    ensureLoaded,
    handleSelectAgent: coreSelectAgent,
    handleAgentHover: coreAgentHover,
    handleAgentHoverEnd: coreAgentHoverEnd,
    handleDetailPanelMouseEnter,
    handleDetailPanelMouseLeave: coreDetailMouseLeave,
  } = useAgentListCore({ consumerId: CONSUMER_ID, onSelect, navigateTo });

  const handleOpen = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (nextOpen) {
      ensureLoaded();
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setRightPanel(null);
      setCatSearch("");
      setTagSearch("");
      setMobileDetailAgent(null);
      setMobileSubView(null);
    }
  };

  const handleSelectAgent = (agent: AgentDefinitionRecord) => {
    coreSelectAgent(agent);
    setOpen(false);
  };

  const handleFilterChipClick = (panel: "sort" | "categories" | "tags") => {
    if (isMobile) {
      setMobileSubView(panel);
    } else {
      setRightPanel(rightPanel === panel ? null : panel);
    }
  };

  const handleAgentHover = useCallback(
    (agent: AgentDefinitionRecord) => {
      if (isMobile) return;
      const filterPanelOpen =
        rightPanel === "sort" ||
        rightPanel === "categories" ||
        rightPanel === "tags";
      coreAgentHover(agent, filterPanelOpen);
      if (!filterPanelOpen) setRightPanel("detail");
    },
    [isMobile, rightPanel, coreAgentHover],
  );

  const handleAgentHoverEnd = useCallback(
    (agent: AgentDefinitionRecord) => {
      if (isMobile) return;
      if (rightPanel !== "detail") return;
      coreAgentHoverEnd(agent, () => setRightPanel(null));
    },
    [isMobile, rightPanel, coreAgentHoverEnd],
  );

  const handleDetailPanelMouseLeave = useCallback(() => {
    coreDetailMouseLeave(() => setRightPanel(null));
  }, [coreDetailMouseLeave]);

  const hasRightPanel = rightPanel !== null;

  const trigger = triggerSlot ?? (
    <button
      className={cn(
        "inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md text-xs font-medium",
        "border border-border bg-background hover:bg-muted/50 transition-colors",
        "text-foreground/80 hover:text-foreground",
        className,
      )}
    >
      <span className="truncate max-w-[120px]">{label}</span>
      {activeFilterCount > 0 && (
        <span className="flex items-center justify-center w-4 h-4 rounded-full bg-primary text-primary-foreground text-[10px] font-bold">
          {activeFilterCount}
        </span>
      )}
      <ChevronDown className="w-3 h-3 text-muted-foreground/60" />
    </button>
  );

  const listPanel = (
    <ListPanel
      agents={agents}
      isLoading={isLoading}
      consumer={consumer}
      activeAgentId={activeAgentId}
      allCategories={allCategories}
      allTags={allTags}
      inputRef={inputRef}
      onSelectAgent={handleSelectAgent}
      onReset={consumer.resetFilters}
      activeFilterCount={activeFilterCount}
      isMobile={isMobile}
      hoveredAgent={hoveredAgent}
      onAgentHover={handleAgentHover}
      onAgentHoverEnd={handleAgentHoverEnd}
      onDetailPress={setMobileDetailAgent}
      onFilterChipClick={handleFilterChipClick}
      rightPanel={rightPanel}
    />
  );

  // ── Mobile ──
  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={handleOpen}>
        <DrawerTrigger asChild>{trigger}</DrawerTrigger>
        <DrawerContent className="max-h-[85dvh]">
          <DrawerTitle className="sr-only">Select Agent</DrawerTitle>
          <div className="flex flex-col overflow-hidden max-h-[calc(85dvh-2rem)]">
            {mobileDetailAgent ? (
              <div className="flex flex-col overflow-hidden">
                <button
                  onClick={() => setMobileDetailAgent(null)}
                  className="flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium text-primary hover:bg-muted/30 transition-colors border-b border-border shrink-0"
                >
                  <ChevronRight className="w-4 h-4 rotate-180" />
                  Back
                </button>
                <div className="overflow-y-auto">
                  <AgentDetailCard
                    agent={mobileDetailAgent}
                    onSelect={() => handleSelectAgent(mobileDetailAgent)}
                  />
                </div>
              </div>
            ) : mobileSubView ? (
              <MobileSubView
                view={mobileSubView}
                consumer={consumer}
                allCategories={allCategories}
                allTags={allTags}
                catSearch={catSearch}
                setCatSearch={setCatSearch}
                tagSearch={tagSearch}
                setTagSearch={setTagSearch}
                onBack={() => {
                  setMobileSubView(null);
                  setCatSearch("");
                  setTagSearch("");
                }}
              />
            ) : (
              listPanel
            )}
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  // ── Desktop ──
  return (
    <Popover open={open} onOpenChange={handleOpen}>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={4}
        className={cn(
          "p-0 overflow-hidden",
          hasRightPanel ? "w-[680px]" : "w-[340px]",
        )}
        style={{
          height: hasRightPanel ? PANEL_HEIGHT : undefined,
          maxHeight: LIST_MAX_HEIGHT,
        }}
      >
        <div className="flex h-full">
          <div
            className={cn(
              "flex flex-col min-w-0",
              hasRightPanel
                ? "w-[340px] shrink-0 border-r border-border"
                : "flex-1",
            )}
          >
            {listPanel}
          </div>
          {hasRightPanel && (
            <div
              className="w-[340px] shrink-0 overflow-hidden flex flex-col"
              style={{ height: PANEL_HEIGHT }}
              onMouseEnter={
                rightPanel === "detail"
                  ? handleDetailPanelMouseEnter
                  : undefined
              }
              onMouseLeave={
                rightPanel === "detail"
                  ? handleDetailPanelMouseLeave
                  : undefined
              }
            >
              {rightPanel === "detail" && hoveredAgent && (
                <AgentDetailCard
                  agent={hoveredAgent}
                  onSelect={() => handleSelectAgent(hoveredAgent)}
                />
              )}
              {rightPanel === "sort" && (
                <SideSortPanel
                  consumer={consumer}
                  onClose={() => setRightPanel(null)}
                />
              )}
              {rightPanel === "categories" && (
                <SideCategoriesPanel
                  consumer={consumer}
                  allCategories={allCategories}
                  search={catSearch}
                  setSearch={setCatSearch}
                  onClose={() => {
                    setRightPanel(null);
                    setCatSearch("");
                  }}
                />
              )}
              {rightPanel === "tags" && (
                <SideTagsPanel
                  consumer={consumer}
                  allTags={allTags}
                  search={tagSearch}
                  setSearch={setTagSearch}
                  onClose={() => {
                    setRightPanel(null);
                    setTagSearch("");
                  }}
                />
              )}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

// ---------------------------------------------------------------------------
// Detail card
// ---------------------------------------------------------------------------

function AgentDetailCard({
  agent,
  onSelect,
}: {
  agent: AgentDefinitionRecord;
  onSelect: () => void;
}) {
  const updatedDate = agent.updatedAt ? new Date(agent.updatedAt) : null;
  const createdDate = agent.createdAt ? new Date(agent.createdAt) : null;

  const formatDate = (d: Date | null) => {
    if (!d) return null;
    return d.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 pt-4 pb-3">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0"></div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-foreground leading-tight truncate">
              {agent.name || "Untitled"}
            </h3>
            {agent.isFavorite && (
              <div className="flex items-center gap-1 mt-0.5">
                <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                <span className="text-[11px] text-amber-600 dark:text-amber-400">
                  Favorite
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="h-px bg-border mx-3" />

      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {agent.description && (
          <div>
            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1">
              Description
            </p>
            <p className="text-xs text-foreground/80 leading-relaxed">
              {agent.description}
            </p>
          </div>
        )}

        {agent.category && (
          <div className="flex items-center gap-2">
            <Folder className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            <span className="text-xs text-foreground/80">{agent.category}</span>
          </div>
        )}

        {agent.tags && agent.tags.length > 0 && (
          <div>
            <div className="flex items-center gap-1.5 mb-1.5">
              <Tag className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <span className="text-[11px] font-medium text-muted-foreground">
                Tags
              </span>
            </div>
            <div className="flex flex-wrap gap-1">
              {agent.tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center h-5 px-1.5 rounded text-[10px] font-medium bg-muted text-muted-foreground"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {agent.accessLevel && (
          <div className="flex items-center gap-2">
            {agent.isOwner === false ? (
              <Users className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            ) : (
              <Globe className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            )}
            <div className="flex flex-col">
              <span className="text-xs text-foreground/80 capitalize">
                {agent.accessLevel === "owner"
                  ? "You own this"
                  : `Shared — ${agent.accessLevel}`}
              </span>
              {agent.sharedByEmail && (
                <span className="text-[10px] text-muted-foreground">
                  by {agent.sharedByEmail}
                </span>
              )}
            </div>
          </div>
        )}

        {agent.modelId && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-foreground/80 font-mono truncate">
              {agent.modelId}
            </span>
          </div>
        )}

        {(updatedDate || createdDate) && (
          <div className="pt-1 space-y-1">
            {updatedDate && (
              <div className="flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                <span className="text-[11px] text-muted-foreground">
                  Updated {formatDate(updatedDate)}
                </span>
              </div>
            )}
            {createdDate && (
              <div className="flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-muted-foreground/50 shrink-0" />
                <span className="text-[11px] text-muted-foreground/70">
                  Created {formatDate(createdDate)}
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="h-px bg-border mx-3 mt-auto" />
      <div className="px-3 py-2 shrink-0 flex items-center gap-1.5">
        <button
          onClick={onSelect}
          className="flex-1 h-7 rounded-md bg-primary text-primary-foreground text-[11px] font-medium hover:bg-primary/90 active:bg-primary/80 transition-colors"
        >
          Select
        </button>
        <Link
          href={`/agents/${agent.id}`}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          title="Open in new tab"
          className="flex items-center justify-center h-7 w-7 rounded-md border border-border bg-background text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors shrink-0"
        >
          <ExternalLink className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Side panels for desktop (sort, categories, tags)
// ---------------------------------------------------------------------------

function SidePanelHeader({
  title,
  onClose,
}: {
  title: string;
  onClose: () => void;
}) {
  return (
    <div className="flex items-center justify-between px-3 py-2 border-b border-border shrink-0">
      <span className="text-xs font-semibold text-foreground">{title}</span>
      <button
        onClick={onClose}
        className="w-5 h-5 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

function SideSortPanel({
  consumer,
  onClose,
}: {
  consumer: ReturnType<typeof useAgentConsumer>;
  onClose: () => void;
}) {
  return (
    <div className="flex flex-col h-full">
      <SidePanelHeader title="Sort By" onClose={onClose} />
      <div className="overflow-y-auto flex-1">
        {SORT_OPTIONS.map((opt) => (
          <OptionRow
            key={opt.value}
            label={opt.label}
            selected={consumer.sortBy === opt.value}
            onClick={() => consumer.setSortBy(opt.value)}
          />
        ))}
      </div>
    </div>
  );
}

function SideCategoriesPanel({
  consumer,
  allCategories,
  search,
  setSearch,
  onClose,
}: {
  consumer: ReturnType<typeof useAgentConsumer>;
  allCategories: string[];
  search: string;
  setSearch: (v: string) => void;
  onClose: () => void;
}) {
  const filtered = allCategories.filter(
    (c) => !search || c.toLowerCase().includes(search.toLowerCase()),
  );
  return (
    <div className="flex flex-col h-full">
      <SidePanelHeader title="Categories" onClose={onClose} />
      <div className="px-2 pt-2 pb-1 shrink-0">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Filter categories..."
        />
      </div>
      {consumer.includedCats.length > 0 && (
        <button
          onClick={() => consumer.includedCats.forEach(consumer.toggleCategory)}
          className="mx-2 mb-1 h-6 rounded text-[11px] font-medium text-primary hover:bg-muted/50 transition-colors text-left shrink-0"
        >
          Clear ({consumer.includedCats.length})
        </button>
      )}
      <div className="overflow-y-auto flex-1">
        {filtered.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-6">
            No categories
          </p>
        ) : (
          filtered.map((cat) => (
            <CheckRow
              key={cat}
              label={cat}
              checked={consumer.includedCats.includes(cat)}
              onClick={() => consumer.toggleCategory(cat)}
            />
          ))
        )}
      </div>
    </div>
  );
}

function SideTagsPanel({
  consumer,
  allTags,
  search,
  setSearch,
  onClose,
}: {
  consumer: ReturnType<typeof useAgentConsumer>;
  allTags: string[];
  search: string;
  setSearch: (v: string) => void;
  onClose: () => void;
}) {
  const filtered = allTags.filter(
    (t) => !search || t.toLowerCase().includes(search.toLowerCase()),
  );
  return (
    <div className="flex flex-col h-full">
      <SidePanelHeader title="Tags" onClose={onClose} />
      <div className="px-2 pt-2 pb-1 shrink-0">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Filter tags..."
        />
      </div>
      {consumer.includedTags.length > 0 && (
        <button
          onClick={() => consumer.includedTags.forEach(consumer.toggleTag)}
          className="mx-2 mb-1 h-6 rounded text-[11px] font-medium text-primary hover:bg-muted/50 transition-colors text-left shrink-0"
        >
          Clear ({consumer.includedTags.length})
        </button>
      )}
      <div className="overflow-y-auto flex-1">
        {filtered.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-6">
            No tags
          </p>
        ) : (
          filtered.map((tag) => (
            <CheckRow
              key={tag}
              label={tag}
              checked={consumer.includedTags.includes(tag)}
              onClick={() => consumer.toggleTag(tag)}
            />
          ))
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Mobile sub-view (replaces list — iOS drill-down for sort/categories/tags)
// ---------------------------------------------------------------------------

function MobileSubView({
  view,
  consumer,
  allCategories,
  allTags,
  catSearch,
  setCatSearch,
  tagSearch,
  setTagSearch,
  onBack,
}: {
  view: "sort" | "categories" | "tags";
  consumer: ReturnType<typeof useAgentConsumer>;
  allCategories: string[];
  allTags: string[];
  catSearch: string;
  setCatSearch: (v: string) => void;
  tagSearch: string;
  setTagSearch: (v: string) => void;
  onBack: () => void;
}) {
  const title =
    view === "sort" ? "Sort" : view === "categories" ? "Categories" : "Tags";

  return (
    <div className="flex flex-col">
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium text-primary hover:bg-muted/30 transition-colors border-b border-border shrink-0"
      >
        <ChevronRight className="w-4 h-4 rotate-180" />
        {title}
      </button>
      {view === "sort" &&
        SORT_OPTIONS.map((opt) => (
          <OptionRow
            key={opt.value}
            label={opt.label}
            selected={consumer.sortBy === opt.value}
            onClick={() => {
              consumer.setSortBy(opt.value);
              onBack();
            }}
          />
        ))}
      {view === "categories" && (
        <>
          <div className="px-2 pt-2 pb-1">
            <SearchInput
              value={catSearch}
              onChange={setCatSearch}
              placeholder="Filter categories..."
            />
          </div>
          {consumer.includedCats.length > 0 && (
            <button
              onClick={() =>
                consumer.includedCats.forEach(consumer.toggleCategory)
              }
              className="mx-2 mb-1 h-6 rounded text-[11px] font-medium text-primary hover:bg-muted/50 transition-colors text-left"
            >
              Clear ({consumer.includedCats.length})
            </button>
          )}
          <div className="overflow-y-auto max-h-[300px]">
            {allCategories
              .filter(
                (c) =>
                  !catSearch ||
                  c.toLowerCase().includes(catSearch.toLowerCase()),
              )
              .map((cat) => (
                <CheckRow
                  key={cat}
                  label={cat}
                  checked={consumer.includedCats.includes(cat)}
                  onClick={() => consumer.toggleCategory(cat)}
                />
              ))}
          </div>
        </>
      )}
      {view === "tags" && (
        <>
          <div className="px-2 pt-2 pb-1">
            <SearchInput
              value={tagSearch}
              onChange={setTagSearch}
              placeholder="Filter tags..."
            />
          </div>
          {consumer.includedTags.length > 0 && (
            <button
              onClick={() => consumer.includedTags.forEach(consumer.toggleTag)}
              className="mx-2 mb-1 h-6 rounded text-[11px] font-medium text-primary hover:bg-muted/50 transition-colors text-left"
            >
              Clear ({consumer.includedTags.length})
            </button>
          )}
          <div className="overflow-y-auto max-h-[300px]">
            {allTags
              .filter(
                (t) =>
                  !tagSearch ||
                  t.toLowerCase().includes(tagSearch.toLowerCase()),
              )
              .map((tag) => (
                <CheckRow
                  key={tag}
                  label={tag}
                  checked={consumer.includedTags.includes(tag)}
                  onClick={() => consumer.toggleTag(tag)}
                />
              ))}
          </div>
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// List panel (always visible on desktop, primary view on mobile)
// ---------------------------------------------------------------------------

interface ListPanelProps {
  agents: AgentDefinitionRecord[];
  isLoading: boolean;
  consumer: ReturnType<typeof useAgentConsumer>;
  activeAgentId: string | null;
  allCategories: string[];
  allTags: string[];
  inputRef: React.RefObject<HTMLInputElement | null>;
  onSelectAgent: (a: AgentDefinitionRecord) => void;
  onReset: () => void;
  activeFilterCount: number;
  isMobile: boolean;
  hoveredAgent: AgentDefinitionRecord | null;
  onAgentHover: (a: AgentDefinitionRecord) => void;
  onAgentHoverEnd: (a: AgentDefinitionRecord) => void;
  onDetailPress: (a: AgentDefinitionRecord) => void;
  onFilterChipClick: (panel: "sort" | "categories" | "tags") => void;
  rightPanel: RightPanel;
}

function ListPanel({
  agents,
  isLoading,
  consumer,
  activeAgentId,
  allCategories,
  allTags,
  inputRef,
  onSelectAgent,
  onReset,
  activeFilterCount,
  isMobile,
  hoveredAgent,
  onAgentHover,
  onAgentHoverEnd,
  onDetailPress,
  onFilterChipClick,
  rightPanel,
}: ListPanelProps) {
  return (
    <div className="flex flex-col h-full">
      {/* Search */}
      <div className="px-2 pt-2 pb-1 shrink-0">
        <SearchInput
          ref={inputRef}
          value={consumer.searchTerm}
          onChange={consumer.setSearchTerm}
          placeholder="Search agents..."
        />
      </div>

      {/* Filter bar */}
      <div className="flex items-center gap-1 px-2 pb-1.5 overflow-x-auto scrollbar-none shrink-0">
        <FilterChip
          icon={ArrowUpDown}
          label={
            SORT_OPTIONS.find((o) => o.value === consumer.sortBy)?.label ??
            "Sort"
          }
          active={consumer.sortBy !== "updated-desc"}
          focused={!isMobile && rightPanel === "sort"}
          onClick={() => onFilterChipClick("sort")}
        />
        <FilterChip
          icon={Star}
          label={
            consumer.favFilter === "yes"
              ? "Favs"
              : consumer.favFilter === "no"
                ? "No Favs"
                : "Favs"
          }
          active={consumer.favFilter !== "all"}
          onClick={() => {
            const next =
              consumer.favFilter === "all"
                ? "yes"
                : consumer.favFilter === "yes"
                  ? "no"
                  : "all";
            consumer.setFavFilter(next as "all" | "yes" | "no");
          }}
        />
        {allCategories.length > 0 && (
          <FilterChip
            icon={Folder}
            label={
              consumer.includedCats.length > 0
                ? `${consumer.includedCats.length}`
                : "Category"
            }
            active={consumer.includedCats.length > 0}
            focused={!isMobile && rightPanel === "categories"}
            onClick={() => onFilterChipClick("categories")}
          />
        )}
        {allTags.length > 0 && (
          <FilterChip
            icon={Tag}
            label={
              consumer.includedTags.length > 0
                ? `${consumer.includedTags.length}`
                : "Tags"
            }
            active={consumer.includedTags.length > 0}
            focused={!isMobile && rightPanel === "tags"}
            onClick={() => onFilterChipClick("tags")}
          />
        )}
        {activeFilterCount > 0 && (
          <button
            onClick={onReset}
            className="flex items-center gap-0.5 h-6 px-1.5 rounded text-[11px] text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors shrink-0"
          >
            <RotateCcw className="w-3 h-3" />
          </button>
        )}
      </div>

      <div className="h-px bg-border shrink-0" />

      {/* Agent list */}
      <div className="overflow-y-auto flex-1 min-h-0">
        {isLoading ? (
          <div className="flex items-center justify-center py-8 gap-2 text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-xs">Loading...</span>
          </div>
        ) : agents.length === 0 ? (
          <div className="flex flex-col items-center py-8 text-muted-foreground">
            <span className="text-xs">No agents found</span>
          </div>
        ) : (
          <div className="py-0.5">
            {agents.map((agent) => (
              <AgentRow
                key={agent.id}
                agent={agent}
                isActive={agent.id === activeAgentId}
                isHovered={hoveredAgent?.id === agent.id}
                isMobile={isMobile}
                onClick={() => onSelectAgent(agent)}
                onHover={() => onAgentHover(agent)}
                onHoverEnd={() => onAgentHoverEnd(agent)}
                onDetailPress={() => onDetailPress(agent)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Footer count */}
      <div className="h-px bg-border shrink-0" />
      <div className="flex items-center justify-between px-2.5 py-1.5 shrink-0">
        <span className="text-[10px] text-muted-foreground tabular-nums">
          {agents.length} agent{agents.length !== 1 ? "s" : ""}
        </span>
        {consumer.searchTerm && (
          <button
            onClick={() => consumer.setSearchTerm("")}
            className="text-[10px] text-muted-foreground hover:text-foreground transition-colors"
          >
            Clear search
          </button>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Primitives
// ---------------------------------------------------------------------------

const SearchInput = ({
  ref,
  value,
  onChange,
  placeholder,
}: {
  ref?: React.Ref<HTMLInputElement>;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) => (
  <div className="flex items-center gap-1.5 h-7 px-2 rounded-md bg-muted/40 border border-border/50">
    <Search className="w-3 h-3 text-muted-foreground shrink-0" />
    <input
      ref={ref}
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="flex-1 bg-transparent text-xs text-foreground placeholder:text-muted-foreground/50 outline-none min-w-0"
      style={{ fontSize: "16px" }}
    />
    {value && (
      <button
        onClick={() => onChange("")}
        className="text-muted-foreground hover:text-foreground"
      >
        <X className="w-3 h-3" />
      </button>
    )}
  </div>
);

function FilterChip({
  icon: Icon,
  label,
  active,
  focused,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  active: boolean;
  focused?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1 h-6 px-1.5 rounded text-[11px] font-medium shrink-0 transition-colors",
        focused
          ? "bg-primary/15 text-primary border border-primary/30 ring-1 ring-primary/20"
          : active
            ? "bg-primary/10 text-primary border border-primary/20"
            : "text-muted-foreground hover:text-foreground hover:bg-muted/50 border border-transparent",
      )}
    >
      <Icon className="w-3 h-3" />
      <span>{label}</span>
    </button>
  );
}

function AgentRow({
  agent,
  isActive,
  isHovered,
  isMobile,
  onClick,
  onHover,
  onHoverEnd,
  onDetailPress,
}: {
  agent: AgentDefinitionRecord;
  isActive: boolean;
  isHovered: boolean;
  isMobile: boolean;
  onClick: () => void;
  onHover: () => void;
  onHoverEnd: () => void;
  onDetailPress: () => void;
}) {
  return (
    <div
      className={cn(
        "flex items-center w-full text-left transition-colors group",
        "hover:bg-muted/50 active:bg-muted/70",
        isActive && "bg-primary/5",
        !isMobile && isHovered && "bg-muted/40",
      )}
      onMouseEnter={isMobile ? undefined : onHover}
      onMouseLeave={isMobile ? undefined : onHoverEnd}
    >
      <Link
        href={`/agents/${agent.id}`}
        onClick={(e) => {
          if (e.metaKey || e.ctrlKey) return;
          e.preventDefault();
          onClick();
        }}
        className="flex items-center gap-2 flex-1 min-w-0 px-3 py-2"
      >
        {agent.isFavorite && (
          <Star className="w-3 h-3 text-amber-500 fill-amber-500 shrink-0" />
        )}
        <span
          className={cn(
            "text-[13px] font-medium truncate",
            isActive ? "text-primary" : "text-foreground",
          )}
        >
          {agent.name || "Untitled"}
        </span>
        {agent.isOwner === false && (
          <span className="text-[9px] text-muted-foreground bg-muted px-1 py-px rounded shrink-0 ml-auto">
            shared
          </span>
        )}
      </Link>
      {isMobile && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDetailPress();
          }}
          className="flex items-center justify-center w-10 h-full shrink-0 text-muted-foreground/40 active:text-muted-foreground"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

function OptionRow({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center w-full px-3 py-2 text-xs transition-colors",
        "hover:bg-muted/50 active:bg-muted/70",
        selected && "text-primary font-medium",
      )}
    >
      <span className="flex-1 text-left">{label}</span>
      {selected && <Check className="w-3.5 h-3.5 text-primary shrink-0" />}
    </button>
  );
}

function CheckRow({
  label,
  checked,
  onClick,
}: {
  label: string;
  checked: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 w-full px-3 py-1.5 text-xs hover:bg-muted/50 active:bg-muted/70 transition-colors"
    >
      <div
        className={cn(
          "w-3.5 h-3.5 rounded-sm border flex items-center justify-center shrink-0 transition-colors",
          checked ? "bg-primary border-primary" : "border-muted-foreground/30",
        )}
      >
        {checked && <Check className="w-2.5 h-2.5 text-primary-foreground" />}
      </div>
      <span className="flex-1 text-left truncate">{label}</span>
    </button>
  );
}
