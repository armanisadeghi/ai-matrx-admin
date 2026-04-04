"use client";

import { useState, useRef, useMemo, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Bot,
  Search,
  X,
  ChevronDown,
  ArrowUpDown,
  Star,
  Archive,
  Tag,
  Folder,
  Loader2,
  RotateCcw,
  Check,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import { useAgentConsumer } from "@/features/agents/hooks/useAgentConsumer";
import {
  makeSelectFilteredAgents,
  selectAllAgentCategories,
  selectAllAgentTags,
} from "@/features/agents/redux/agent-consumers/selectors";
import {
  selectAgentsSliceStatus,
  selectActiveAgentId,
} from "@/features/agents/redux/agent-definition/selectors";
import { initializeChatAgents } from "@/features/agents/redux/agent-definition/thunks";
import { setActiveAgentId } from "@/features/agents/redux/agent-definition/slice";
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

const CONSUMER_ID = "agent-list-dropdown";

const SORT_OPTIONS: { value: AgentSortOption; label: string }[] = [
  { value: "updated-desc", label: "Recent" },
  { value: "created-desc", label: "Created" },
  { value: "name-asc", label: "A → Z" },
  { value: "name-desc", label: "Z → A" },
  { value: "category-asc", label: "Category" },
];

type SubView = "sort" | "categories" | "tags" | null;

interface AgentListDropdownProps {
  onSelect?: (agentId: string) => void;
  /** If provided, navigates to this path template (replaces {id}) instead of dispatching setActiveAgentId */
  navigateTo?: string;
  className?: string;
  /** Label shown on the trigger. Defaults to "Agents" */
  label?: string;
}

export function AgentListDropdown({
  onSelect,
  navigateTo,
  className,
  label = "Agents",
}: AgentListDropdownProps) {
  const isMobile = useIsMobile();
  const dispatch = useAppDispatch();
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [hasFetched, setHasFetched] = useState(false);
  const [subView, setSubView] = useState<SubView>(null);
  const [catSearch, setCatSearch] = useState("");
  const [tagSearch, setTagSearch] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const consumer = useAgentConsumer(CONSUMER_ID, {
    unregisterOnUnmount: true,
  });

  const selectFiltered = useMemo(
    () => makeSelectFilteredAgents(CONSUMER_ID),
    [],
  );
  const agents = useAppSelector(selectFiltered);
  const sliceStatus = useAppSelector(selectAgentsSliceStatus);
  const activeAgentId = useAppSelector(selectActiveAgentId);
  const allCategories = useAppSelector(selectAllAgentCategories);
  const allTags = useAppSelector(selectAllAgentTags);
  const isLoading = sliceStatus === "loading";

  const handleOpen = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (nextOpen && !hasFetched) {
      dispatch(initializeChatAgents());
      setHasFetched(true);
    }
    if (nextOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
    if (!nextOpen) {
      setSubView(null);
      setCatSearch("");
      setTagSearch("");
    }
  };

  const handleSelectAgent = (agent: AgentDefinitionRecord) => {
    if (onSelect) {
      onSelect(agent.id);
    } else if (navigateTo) {
      startTransition(() => router.push(navigateTo.replace("{id}", agent.id)));
    } else {
      dispatch(setActiveAgentId(agent.id));
    }
    setOpen(false);
  };

  const activeFilterCount =
    (consumer.sortBy !== "updated-desc" ? 1 : 0) +
    (consumer.includedCats.length > 0 ? 1 : 0) +
    (consumer.includedTags.length > 0 ? 1 : 0) +
    (consumer.favFilter !== "all" ? 1 : 0) +
    (consumer.archFilter !== "active" ? 1 : 0);

  const trigger = (
    <button
      className={cn(
        "inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md text-xs font-medium",
        "border border-border bg-background hover:bg-muted/50 transition-colors",
        "text-foreground/80 hover:text-foreground",
        className,
      )}
    >
      <Bot className="w-3.5 h-3.5 text-muted-foreground" />
      <span className="truncate max-w-[120px]">{label}</span>
      {activeFilterCount > 0 && (
        <span className="flex items-center justify-center w-4 h-4 rounded-full bg-primary text-primary-foreground text-[10px] font-bold">
          {activeFilterCount}
        </span>
      )}
      <ChevronDown className="w-3 h-3 text-muted-foreground/60" />
    </button>
  );

  const content = (
    <DropdownBody
      agents={agents}
      isLoading={isLoading}
      consumer={consumer}
      activeAgentId={activeAgentId}
      allCategories={allCategories}
      allTags={allTags}
      subView={subView}
      setSubView={setSubView}
      catSearch={catSearch}
      setCatSearch={setCatSearch}
      tagSearch={tagSearch}
      setTagSearch={setTagSearch}
      inputRef={inputRef}
      onSelectAgent={handleSelectAgent}
      onReset={consumer.resetFilters}
      activeFilterCount={activeFilterCount}
      isMobile={isMobile}
    />
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={handleOpen}>
        <DrawerTrigger asChild>{trigger}</DrawerTrigger>
        <DrawerContent className="max-h-[85dvh]">
          <DrawerTitle className="sr-only">Select Agent</DrawerTitle>
          <div className="flex flex-col overflow-hidden max-h-[calc(85dvh-2rem)]">
            {content}
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Popover open={open} onOpenChange={handleOpen}>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={4}
        className="w-[320px] p-0 overflow-hidden"
      >
        {content}
      </PopoverContent>
    </Popover>
  );
}

// ---------------------------------------------------------------------------
// Internal body component
// ---------------------------------------------------------------------------

interface DropdownBodyProps {
  agents: AgentDefinitionRecord[];
  isLoading: boolean;
  consumer: ReturnType<typeof useAgentConsumer>;
  activeAgentId: string | null;
  allCategories: string[];
  allTags: string[];
  subView: SubView;
  setSubView: (v: SubView) => void;
  catSearch: string;
  setCatSearch: (v: string) => void;
  tagSearch: string;
  setTagSearch: (v: string) => void;
  inputRef: React.RefObject<HTMLInputElement | null>;
  onSelectAgent: (a: AgentDefinitionRecord) => void;
  onReset: () => void;
  activeFilterCount: number;
  isMobile: boolean;
}

function DropdownBody({
  agents,
  isLoading,
  consumer,
  activeAgentId,
  allCategories,
  allTags,
  subView,
  setSubView,
  catSearch,
  setCatSearch,
  tagSearch,
  setTagSearch,
  inputRef,
  onSelectAgent,
  onReset,
  activeFilterCount,
  isMobile,
}: DropdownBodyProps) {
  if (subView === "sort") {
    return (
      <SubViewPanel
        title="Sort"
        onBack={() => setSubView(null)}
        isMobile={isMobile}
      >
        {SORT_OPTIONS.map((opt) => (
          <OptionRow
            key={opt.value}
            label={opt.label}
            selected={consumer.sortBy === opt.value}
            onClick={() => {
              consumer.setSortBy(opt.value);
              setSubView(null);
            }}
          />
        ))}
      </SubViewPanel>
    );
  }

  if (subView === "categories") {
    const filtered = allCategories.filter(
      (c) => !catSearch || c.toLowerCase().includes(catSearch.toLowerCase()),
    );
    return (
      <SubViewPanel
        title="Categories"
        onBack={() => {
          setSubView(null);
          setCatSearch("");
        }}
        isMobile={isMobile}
      >
        <div className="px-2 pb-1.5">
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
            className="mx-2 mb-1 h-6 rounded text-[11px] font-medium text-primary hover:bg-muted/50 transition-colors"
          >
            Clear ({consumer.includedCats.length})
          </button>
        )}
        <div className="overflow-y-auto max-h-[240px]">
          {filtered.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">
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
      </SubViewPanel>
    );
  }

  if (subView === "tags") {
    const filtered = allTags.filter(
      (t) => !tagSearch || t.toLowerCase().includes(tagSearch.toLowerCase()),
    );
    return (
      <SubViewPanel
        title="Tags"
        onBack={() => {
          setSubView(null);
          setTagSearch("");
        }}
        isMobile={isMobile}
      >
        <div className="px-2 pb-1.5">
          <SearchInput
            value={tagSearch}
            onChange={setTagSearch}
            placeholder="Filter tags..."
          />
        </div>
        {consumer.includedTags.length > 0 && (
          <button
            onClick={() => consumer.includedTags.forEach(consumer.toggleTag)}
            className="mx-2 mb-1 h-6 rounded text-[11px] font-medium text-primary hover:bg-muted/50 transition-colors"
          >
            Clear ({consumer.includedTags.length})
          </button>
        )}
        <div className="overflow-y-auto max-h-[240px]">
          {filtered.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">
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
      </SubViewPanel>
    );
  }

  return (
    <div className="flex flex-col">
      {/* Search */}
      <div className="px-2 pt-2 pb-1">
        <SearchInput
          ref={inputRef}
          value={consumer.searchTerm}
          onChange={consumer.setSearchTerm}
          placeholder="Search agents..."
        />
      </div>

      {/* Filter bar */}
      <div className="flex items-center gap-1 px-2 pb-1.5 overflow-x-auto scrollbar-none">
        <FilterChip
          icon={ArrowUpDown}
          label={
            SORT_OPTIONS.find((o) => o.value === consumer.sortBy)?.label ??
            "Sort"
          }
          active={consumer.sortBy !== "updated-desc"}
          onClick={() => setSubView("sort")}
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
        <FilterChip
          icon={Archive}
          label="Archived"
          active={consumer.archFilter !== "active"}
          onClick={() => {
            const next =
              consumer.archFilter === "active"
                ? "both"
                : consumer.archFilter === "both"
                  ? "archived"
                  : "active";
            consumer.setArchFilter(next as "active" | "archived" | "both");
          }}
        />
        {allCategories.length > 0 && (
          <FilterChip
            icon={Folder}
            label={
              consumer.includedCats.length > 0
                ? `${consumer.includedCats.length}`
                : "Cat"
            }
            active={consumer.includedCats.length > 0}
            onClick={() => setSubView("categories")}
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
            onClick={() => setSubView("tags")}
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

      <div className="h-px bg-border" />

      {/* Agent list */}
      <div className="overflow-y-auto max-h-[320px] md:max-h-[360px]">
        {isLoading ? (
          <div className="flex items-center justify-center py-8 gap-2 text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-xs">Loading...</span>
          </div>
        ) : agents.length === 0 ? (
          <div className="flex flex-col items-center py-8 text-muted-foreground">
            <Bot className="w-5 h-5 mb-1.5 opacity-40" />
            <span className="text-xs">No agents found</span>
          </div>
        ) : (
          <div className="py-0.5">
            {agents.map((agent) => (
              <AgentRow
                key={agent.id}
                agent={agent}
                isActive={agent.id === activeAgentId}
                onClick={() => onSelectAgent(agent)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Footer count */}
      <div className="h-px bg-border" />
      <div className="flex items-center justify-between px-2.5 py-1.5">
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
// Primitive building blocks
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
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1 h-6 px-1.5 rounded text-[11px] font-medium shrink-0 transition-colors",
        active
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
  onClick,
}: {
  agent: AgentDefinitionRecord;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-2.5 w-full px-2.5 py-1.5 text-left transition-colors",
        "hover:bg-muted/50 active:bg-muted/70",
        isActive && "bg-primary/5",
      )}
    >
      <div
        className={cn(
          "w-6 h-6 rounded shrink-0 flex items-center justify-center",
          isActive ? "bg-primary/15" : "bg-muted",
        )}
      >
        <Bot
          className={cn(
            "w-3.5 h-3.5",
            isActive ? "text-primary" : "text-muted-foreground",
          )}
        />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span
            className={cn(
              "text-xs font-medium truncate",
              isActive && "text-primary",
            )}
          >
            {agent.name || "Untitled"}
          </span>
          {agent.isFavorite && (
            <Star className="w-2.5 h-2.5 text-amber-500 fill-amber-500 shrink-0" />
          )}
          {agent.isOwner === false && (
            <span className="text-[9px] text-muted-foreground bg-muted px-1 rounded shrink-0">
              shared
            </span>
          )}
        </div>
        {agent.description && (
          <p className="text-[10px] text-muted-foreground truncate leading-tight mt-0.5">
            {agent.description}
          </p>
        )}
      </div>
      {agent.category && (
        <span className="text-[9px] text-muted-foreground/60 shrink-0 max-w-[60px] truncate">
          {agent.category}
        </span>
      )}
    </button>
  );
}

function SubViewPanel({
  title,
  onBack,
  children,
  isMobile,
}: {
  title: string;
  onBack: () => void;
  children: React.ReactNode;
  isMobile: boolean;
}) {
  return (
    <div className="flex flex-col">
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 px-2.5 py-2 text-xs font-medium text-foreground hover:bg-muted/30 transition-colors"
      >
        <ChevronRight className="w-3 h-3 rotate-180 text-muted-foreground" />
        {title}
      </button>
      <div className="h-px bg-border" />
      {children}
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
