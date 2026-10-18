"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Eye, EyeOff, ExternalLink, ListChecks } from "lucide-react";
import {
  MatrxDataTable,
  occurrenceGroup,
  occurrenceId,
  occurrenceRecordId,
  rowOccurrences,
  type MatrxColumnDef,
  type MatrxDataTableRead,
  type RowOccurrence,
} from "@ai-matrx/design-system/data-table";
import { recordToast, toast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { useTopicContext } from "../../context/ResearchContext";
import { useCurationData } from "../../hooks/useResearchState";
import {
  bulkUpdateSources,
  updateSource,
  addTagToSources,
  createTag,
} from "../../service";
import type { CurationRow, CurationAnalysisState } from "../../service";
import { sourceTypeFromDb } from "../../types";
import { authorityTier } from "../../constants";
import { StatusBadge } from "../shared/StatusBadge";
import { SourceTypeIcon } from "../shared/SourceTypeIcon";
import {
  ScoreCell,
  sourceScoreValues,
  compareSourcesByResearchScore,
  QUALITY_SCORE_LABEL,
  PRIORITY_SCORE_LABEL,
  POST_READ_SCORE_LABEL,
  AUTH_SCORE_LABEL,
} from "../sources/sourceScoreDisplay";
import { CurationBatchBar } from "./CurationBatchBar";
import { TextInputDialog } from "@ai-matrx/design-system";
import { ResearchFilterBar, type FilterDef } from "../shared/ResearchFilterBar";
import type { FilterOption } from "@/components/hierarchy-filter/HierarchyFilterPill";
import { OutboundLink } from "@ai-matrx/kit/outbound-react";

type GroupBy = "none" | "keyword" | "tag";

/** One drawn row: a source in one of its keyword/tag groups (`rowOccurrences`). */
type CurationOccurrence = RowOccurrence<CurationRow>;

/** Analysis outcome → a SORT weight (more complete = higher). */
const ANALYSIS_SORT: Record<CurationAnalysisState, number> = {
  content: 3,
  empty: 2,
  failed: 1,
  none: 0,
};

/**
 * Restrained analysis-state treatment — a small muted semantic dot + a plain
 * monochrome label, matching the data-console look (never a bright pill). These
 * are ANALYSIS REPORTS, so a failure is amber, never a loud red, and a successful
 * analysis gets a quiet blue accent rather than kindergarten green.
 */
type AnalysisTone = "report" | "warn" | "bad" | "muted";
const ANALYSIS_OUTCOME: Record<
  CurationAnalysisState,
  { label: string; tone: AnalysisTone }
> = {
  content: { label: "Report ready", tone: "report" },
  empty: { label: "No content", tone: "warn" },
  failed: { label: "Failed", tone: "bad" },
  none: { label: "—", tone: "muted" },
};

const ANALYSIS_TONE_DOT: Record<AnalysisTone, string> = {
  report: "bg-blue-500/70",
  warn: "bg-amber-500/70",
  bad: "bg-amber-600/70",
  muted: "bg-muted-foreground/40",
};

function AnalysisCell({ state }: { state: CurationAnalysisState }) {
  const { label, tone } = ANALYSIS_OUTCOME[state];
  if (state === "none")
    return <span className="type-meta text-muted-foreground/40">—</span>;
  return (
    <span className="inline-flex items-center gap-1.5 type-meta font-medium whitespace-nowrap text-muted-foreground">
      <span
        className={cn(
          "h-1.5 w-1.5 shrink-0 rounded-full",
          ANALYSIS_TONE_DOT[tone],
        )}
      />
      {label}
    </span>
  );
}

/** Restrained include/exclude marker — neutral muted dot, never a green chip. */
function IncludedCell({
  included,
  onToggle,
}: {
  included: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      aria-label={included ? "Exclude" : "Include"}
      title={
        included ? "Included — click to exclude" : "Excluded — click to include"
      }
      className={cn(
        "inline-flex items-center justify-center h-6 w-6 rounded-md transition-colors hover:bg-muted",
        included ? "text-foreground/70" : "text-muted-foreground/40",
      )}
    >
      {included ? (
        <Eye className="h-3.5 w-3.5" />
      ) : (
        <EyeOff className="h-3.5 w-3.5" />
      )}
    </button>
  );
}

/** Plain integer, comma-grouped — NO decimals, NO k/M. A size is a number; its
 *  unit ("chars") lives in the column header, never in the cell. */
function fmtInt(n: number | null | undefined): string {
  if (n == null) return "—";
  return Math.round(n).toLocaleString();
}

/** Tier order for sorting (high → low when descending). */
const TIER_ORDER: Record<string, number> = { high: 3, medium: 2, low: 1 };
function tierFromRow(r: CurationRow): string | null {
  return authorityTier(r.source.authority_tier, r.source.authority_score);
}

function rankInKeyword(row: CurationRow, keywordId: string): number | null {
  return (
    row.importance?.perKeyword.find((p) => p.keyword_id === keywordId)?.rank ??
    null
  );
}

export default function CurationTable() {
  const { topicId } = useTopicContext();
  const { data, isLoading, error: curationError, refresh } = useCurationData(topicId);

  const [search, setSearch] = useState("");
  const [groupBy, setGroupBy] = useState<GroupBy>("none");
  const [keywordFilter, setKeywordFilter] = useState<string | null>(null);
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const [includedFilter, setIncludedFilter] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  // Unique sources the table shows after ITS filters too (Read / Tier / Analysis / Tags / In).
  const [viewSourceCount, setViewSourceCount] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [createTagOpen, setCreateTagOpen] = useState(false);
  const [creatingTag, setCreatingTag] = useState(false);

  const rows = data?.rows ?? [];
  const keywords = data?.keywords ?? [];
  const tags = data?.tags ?? [];

  // The bar's facets (Show / Keyword / Tag) and its search compose (AND) with the table's own
  // column filters.
  const filtered = useMemo(() => {
    let items = rows;
    if (keywordFilter)
      items = items.filter((r) =>
        r.importance?.perKeyword?.some((p) => p.keyword_id === keywordFilter),
      );
    if (tagFilter)
      items = items.filter((r) => r.tags.some((t) => t.id === tagFilter));
    if (includedFilter === "included")
      items = items.filter((r) => r.source.is_included);
    else if (includedFilter === "excluded")
      items = items.filter((r) => !r.source.is_included);
    if (search) {
      const q = search.toLowerCase();
      items = items.filter(
        (r) =>
          (r.source.title ?? "").toLowerCase().includes(q) ||
          (r.source.hostname ?? "").toLowerCase().includes(q) ||
          (r.source.url ?? "").toLowerCase().includes(q),
      );
    }
    return items;
  }, [rows, keywordFilter, tagFilter, includedFilter, search]);

  // ONE SOURCE IN SEVERAL GROUPS: grouped by keyword (or tag), a source is drawn once under every
  // keyword it ranks for; its checkbox is the same everywhere (`occurrenceRecordId`). Ungrouped,
  // each source is one row. The rows arrive in the default order — the research score, or each
  // keyword's own search-rank when grouped by keyword — and a header sort reorders within groups.
  const occurrences = useMemo((): CurationOccurrence[] => {
    const groupsOf = (r: CurationRow): readonly string[] =>
      groupBy === "keyword"
        ? (r.importance?.perKeyword ?? []).map((p) => p.keyword_id)
        : groupBy === "tag"
          ? r.tags.map((t) => t.id)
          : [];
    const all = rowOccurrences(filtered, (r) => r.source.id, groupsOf);
    return all.sort((a, b) => {
      if (groupBy === "keyword") {
        const g = occurrenceGroup(a);
        if (g && g === occurrenceGroup(b))
          return (
            (rankInKeyword(a, g) ?? Infinity) - (rankInKeyword(b, g) ?? Infinity)
          );
      }
      return compareSourcesByResearchScore(a.source, b.source);
    });
  }, [filtered, groupBy]);

  // Section order = the keyword / tag list order; the "No keyword" / "Untagged" section is last.
  const groupList: { id: string; label: string }[] =
    groupBy === "keyword"
      ? keywords.map((k) => ({ id: k.id, label: k.keyword }))
      : groupBy === "tag"
        ? tags
            .map((t) => ({ id: t.id, label: t.name }))
        : [];
  const groupIndex = new Map(groupList.map((g, i) => [g.id, i]));
  const groupLabel = new Map(groupList.map((g) => [g.id, g.label]));
  const emptyGroupLabel = groupBy === "keyword" ? "No keyword" : "Untagged";

  const visibleSourceCount =
    viewSourceCount ?? new Set(filtered.map((r) => r.source.id)).size;

  const runBulk = async (
    action: "include" | "exclude" | "mark_stale" | "mark_complete",
    label: string,
  ) => {
    if (selected.size === 0) return;
    setBusy(true);
    try {
      await bulkUpdateSources(topicId, {
        action,
        source_ids: [...selected],
      });
      toast.success(`${label} ${selected.size} source(s)`);
      refresh();
      // Keep the selection so the user can chain actions (tag, then exclude…).
    } catch (err) {
      toast.error(
        `Bulk action failed: ${err instanceof Error ? err.message : "unknown"}`,
      );
    } finally {
      setBusy(false);
    }
  };

  const handleAddTag = async (tagId: string) => {
    if (selected.size === 0) return;
    setBusy(true);
    try {
      await addTagToSources(tagId, [...selected]);
      const name = tags.find((t) => t.id === tagId)?.name ?? "tag";
      recordToast.success(
        { type: "research_tag", id: tagId, title: name },
        `Tagged ${selected.size} source(s) with "${name}"`,
      );
      refresh();
    } catch (err) {
      toast.error(
        `Tagging failed: ${err instanceof Error ? err.message : "unknown error"}`,
      );
    } finally {
      setBusy(false);
    }
  };

  const handleCreateTag = async (name: string) => {
    setCreatingTag(true);
    try {
      const tag = await createTag(topicId, { name });
      await addTagToSources(tag.id, [...selected]);
      recordToast.success(
        { type: "research_tag", id: tag.id, title: tag.name },
        `Created "${tag.name}" · tagged ${selected.size} source(s)`,
      );
      setCreateTagOpen(false);
      refresh();
    } catch (err) {
      toast.error(
        `Couldn't create tag: ${err instanceof Error ? err.message : "unknown error"}`,
      );
    } finally {
      setCreatingTag(false);
    }
  };

  const toggleIncluded = async (id: string, current: boolean) => {
    try {
      await updateSource(id, { is_included: !current });
      refresh();
    } catch (err) {
      toast.error(
        `Couldn't update: ${err instanceof Error ? err.message : "unknown"}`,
      );
    }
  };

  // Top bar keeps GROUPING + the broad facet filters. The per-column filters (Read / Authority
  // tier / Analysis / Tags / In) live in each column's header menu and compose (AND) with these.
  const filterDefs: FilterDef[] = useMemo(() => {
    const opt = (
      key: string,
      label: string,
      allLabel: string,
      options: FilterOption[],
      selectedId: string | null,
      onSelect: (id: string | null) => void,
    ): FilterDef => ({ key, label, allLabel, options, selectedId, onSelect });

    const defs: FilterDef[] = [
      opt(
        "group",
        "Group",
        "No grouping",
        [
          { id: "keyword", label: "By keyword" },
          { id: "tag", label: "By tag" },
        ],
        groupBy === "none" ? null : groupBy,
        (id) => setGroupBy((id as GroupBy) ?? "none"),
      ),
      opt(
        "included",
        "Show",
        "All",
        [
          { id: "included", label: "Included" },
          { id: "excluded", label: "Excluded" },
        ],
        includedFilter,
        setIncludedFilter,
      ),
    ];
    if (keywords.length > 0)
      defs.push(
        opt(
          "keyword",
          "Keyword",
          "All keywords",
          keywords.map((k) => ({ id: k.id, label: k.keyword })),
          keywordFilter,
          setKeywordFilter,
        ),
      );
    if (tags.length > 0)
      defs.push(
        opt(
          "tag",
          "Tag",
          "All tags",
          tags.map((t) => ({ id: t.id, label: t.name })),
          tagFilter,
          setTagFilter,
        ),
      );
    return defs;
  }, [groupBy, includedFilter, keywordFilter, tagFilter, keywords, tags]);

  const columns: MatrxColumnDef<CurationOccurrence>[] = [
    {
      // The section a row is drawn in (grouped views only). Numeric so sections keep the
      // keyword / tag list order; the header names it.
      id: "group",
      header: groupBy === "tag" ? "Tag group" : "Keyword group",
      label: groupBy === "tag" ? "Tag group" : "Keyword group",
      hidden: true,
      accessorFn: (r) => {
        const g = occurrenceGroup(r);
        return g ? (groupIndex.get(g) ?? null) : null;
      },
      copyValue: (r) => groupLabel.get(occurrenceGroup(r)) ?? emptyGroupLabel,
      filter: false, // table-filter-off: the section column; the bar's Keyword / Tag filters narrow it
    },
    {
      // Sorts by the source's BEST rank across all keywords (`importance.bestRank`) — the SAME
      // number the `#N` cell shows — never a mixed per-keyword rank.
      id: "rank",
      header: "Best",
      label: "Best",
      width: 64,
      format: { id: "integer" },
      accessorFn: (r) => r.importance?.bestRank ?? null,
      cell: (r) => (
        <div
          title={
            r.importance
              ? `Importance ${r.importance.score} across ${r.importance.keywordCount} keyword${r.importance.keywordCount === 1 ? "" : "s"}`
              : "Not ranked for any keyword"
          }
        >
          {r.importance?.bestRank != null ? (
            <>
              <div className="type-title tabular-nums leading-none">
                #{r.importance.bestRank}
              </div>
              {r.importance.keywordCount > 1 && (
                <div className="mt-0.5 text-[9px] text-muted-foreground tabular-nums">
                  in {r.importance.keywordCount} kw
                </div>
              )}
            </>
          ) : (
            <span className="type-meta text-muted-foreground">—</span>
          )}
        </div>
      ),
    },
    {
      id: "source",
      header: "Source",
      label: "Source",
      width: 360,
      accessorFn: (r) => r.source.title || r.source.hostname || r.source.url,
      sortValue: (r) =>
        (r.source.hostname ?? r.source.title ?? r.source.url ?? "").toLowerCase(),
      cell: (r) => {
        const s = r.source;
        return (
          <div className="flex items-center gap-2 min-w-0">
            <SourceTypeIcon type={sourceTypeFromDb(s.source_type)} source={s} size={20} />
            <div className="min-w-0">
              <Link
                href={`/research/topics/${topicId}/sources/${s.id}`}
                onClick={(e) => e.stopPropagation()}
                className="type-secondary font-medium truncate max-w-[22rem] block hover:text-primary "
              >
                {s.title || s.hostname || s.url}
              </Link>
              <div className="flex items-center gap-1 type-meta text-muted-foreground">
                <span className="truncate max-w-[16rem]">{s.hostname}</span>
                <OutboundLink
                  href={s.url}
                  onClick={(e) => e.stopPropagation()}
                  className="hover:text-foreground"
                >
                  <ExternalLink className="h-2.5 w-2.5" />
                </OutboundLink>
              </div>
            </div>
          </div>
        );
      },
    },
    {
      id: "scrape",
      header: "Read",
      label: "Read",
      width: 110,
      accessorFn: (r) => r.source.scrape_status ?? null,
      format: { id: "choice" },
      filter: "select",
      filterSingle: true,
      filterOptions: [
        { value: "success", label: "Success" },
        { value: "complete", label: "Complete" },
        { value: "thin", label: "Thin" },
        { value: "failed", label: "Failed" },
        { value: "pending", label: "Pending" },
      ],
      cell: (r) => <StatusBadge status={r.source.scrape_status} />,
    },
    {
      id: "pre",
      header: PRIORITY_SCORE_LABEL,
      label: PRIORITY_SCORE_LABEL,
      width: 84,
      align: "right",
      format: { id: "number" },
      accessorFn: (r) => r.source.pre_read_score ?? null,
      cell: (r) => (
        <ScoreCell value={sourceScoreValues(r.source, r.importance?.bestRank ?? null).priority} />
      ),
    },
    {
      id: "authority",
      header: AUTH_SCORE_LABEL,
      label: AUTH_SCORE_LABEL,
      width: 84,
      align: "right",
      accessorFn: (r) => r.source.authority_score ?? null,
      // Filtered by authority TIER (high / medium / low), sorted by the score.
      filterValue: (r) => tierFromRow(r),
      filter: "select",
      filterSingle: true,
      filterOptions: [
        { value: "high", label: "High" },
        { value: "medium", label: "Medium" },
        { value: "low", label: "Low" },
      ],
      cell: (r) => <ScoreCell value={sourceScoreValues(r.source).auth} />,
    },
    {
      id: "post",
      header: POST_READ_SCORE_LABEL,
      label: POST_READ_SCORE_LABEL,
      width: 72,
      align: "right",
      format: { id: "number" },
      accessorFn: (r) => r.source.post_read_score ?? null,
      cell: (r) => <ScoreCell value={sourceScoreValues(r.source).post} />,
    },
    {
      id: "verdict",
      header: QUALITY_SCORE_LABEL,
      label: QUALITY_SCORE_LABEL,
      width: 84,
      align: "right",
      format: { id: "number" },
      accessorFn: (r) => r.source.final_source_score ?? null,
      cell: (r) => <ScoreCell value={sourceScoreValues(r.source).quality} />,
    },
    {
      id: "chars",
      header: "Chars",
      label: "Chars",
      width: 84,
      align: "right",
      format: { id: "integer" },
      accessorFn: (r) => r.charCount ?? null,
      cell: (r) => (
        <span className="type-meta tabular-nums whitespace-nowrap text-muted-foreground">
          {fmtInt(r.charCount)}
        </span>
      ),
    },
    {
      id: "analysis",
      header: "Analysis",
      label: "Analysis",
      width: 120,
      accessorFn: (r) => r.analysis,
      sortValue: (r) => ANALYSIS_SORT[r.analysis],
      copyValue: (r) =>
        r.analysis === "none" ? "Not analyzed" : ANALYSIS_OUTCOME[r.analysis].label,
      format: { id: "choice" },
      filter: "select",
      filterSingle: true,
      filterOptions: [
        { value: "content", label: "Report ready" },
        { value: "empty", label: "No content" },
        { value: "failed", label: "Failed" },
        { value: "none", label: "Not analyzed" },
      ],
      cell: (r) => <AnalysisCell state={r.analysis} />,
    },
    {
      id: "tags",
      header: "Tags",
      label: "Tags",
      width: 180,
      accessorFn: (r) => r.tags.map((t) => t.name).join(", "),
      sortValue: (r) => r.tags.length,
      filterValue: (r) => r.tags.map((t) => t.id),
      filter: "select",
      filterSingle: true,
      filterOptions: tags.map((t) => ({ value: t.id, label: t.name })),
      cell: (r) => (
        <div className="flex flex-wrap gap-1 max-w-[14rem]">
          {r.tags.map((t) => (
            <span
              key={t.id}
              className="inline-flex rounded border border-border/60 bg-muted/30 px-1.5 py-px type-meta text-muted-foreground truncate max-w-[8rem]"
            >
              {t.name}
            </span>
          ))}
        </div>
      ),
    },
    {
      id: "included",
      header: "In",
      label: "Included",
      width: 48,
      align: "center",
      compact: true,
      format: { id: "boolean" },
      accessorFn: (r) => !!r.source.is_included,
      sortValue: (r) => (r.source.is_included ? 1 : 0),
      cell: (r) => (
        <IncludedCell
          included={!!r.source.is_included}
          onToggle={() => void toggleIncluded(r.source.id, !!r.source.is_included)}
        />
      ),
    },
  ];

  const tableRead: MatrxDataTableRead = curationError
    ? {
        status: "error",
        error: curationError,
        onRetry: refresh,
        what: "this topic's sources",
      }
    : { status: isLoading ? "loading" : "ready" };

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="flex-shrink-0 px-3 sm:px-4 pt-3 pb-2">
        <ResearchFilterBar
          title="Curate"
          count={isLoading ? "—" : `${visibleSourceCount}/${rows.length}`}
          read={{ status: curationError ? "error" : "ready", error: curationError }}
          filters={filterDefs}
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search title, host, url…"
        />
        <p className="mt-1 type-meta text-muted-foreground">
          Clean up the set — exclude the junk, keep the best — then run the
          final synthesis on what remains.
        </p>
      </div>

      <div className="flex-1 min-h-0 flex flex-col px-3 sm:px-4 pb-3">
        <MatrxDataTable<CurationOccurrence>
          tableId={`research/curation/${topicId}`}
          data={occurrences}
          columns={columns}
          getRowId={occurrenceId}
          viewTabs={false}
          frameHeight="fill"
          fitToWidth="grow"
          isLoading={isLoading}
          read={tableRead}
          // The bar above owns this list's search (title, host, url).
          toolbar={{ search: false }}
          rowClick="none"
          getRowHref={(r) => `/research/topics/${topicId}/sources/${r.source.id}`}
          onViewChange={(view) =>
            setViewSourceCount(new Set(view.map(occurrenceRecordId)).size)
          }
          rowClassName={(r) => (!r.source.is_included ? "opacity-50" : undefined)}
          grouping={
            groupBy === "none"
              ? undefined
              : {
                  columnId: "group",
                  groupableColumnIds: ["group"],
                  order: "value-asc",
                  emptyLabel: emptyGroupLabel,
                  rowNoun: "source",
                  renderLabel: (group) =>
                    groupLabel.get(occurrenceGroup(group.rows[0]!)) ?? emptyGroupLabel,
                }
          }
          selection={{
            selectedIds: [...selected],
            onSelectedIdsChange: (ids) => setSelected(new Set(ids)),
            getSelectionId: occurrenceRecordId,
            noun: "source",
            actions: () => (
              <CurationBatchBar
                tags={tags}
                onInclude={() => runBulk("include", "Included")}
                onExclude={() => runBulk("exclude", "Excluded")}
                onAddTag={handleAddTag}
                onCreateTag={() => setCreateTagOpen(true)}
                busy={busy}
              />
            ),
          }}
          emptyState={
            rows.length === 0
              ? {
                  icon: <ListChecks />,
                  title: "No sources yet — run search to populate the workbench.",
                }
              : { icon: <ListChecks />, title: "No sources match these filters" }
          }
        />
      </div>

      <TextInputDialog
        open={createTagOpen}
        onOpenChange={(o) => !creatingTag && setCreateTagOpen(o)}
        title="New tag dimension"
        description={`Create a tag and assign the ${selected.size} selected source(s) to it.`}
        placeholder="e.g. Economic Impact"
        confirmLabel="Create & tag"
        busy={creatingTag}
        onConfirm={handleCreateTag}
      />
    </div>
  );
}
