"use client";
// list-source: custom_fields — returned by education.fc_set_list_scoped (lane7w5d_fc_set); the chair applies it

// features/flashcards/components/home/flashcardSetList.tsx
//
// /education/flashcards expressed as an entity-list config — the canonical
// list shell (lib/entity-list) instead of the hand-built card list it replaced
// (page-pass 2026-09-27). The shell brings what the bespoke list never had:
// sort and filter on every column, saved view preferences, scope lanes with
// real counts, the archive axis, a per-row right-click menu, Copy / Copy for
// AI, and phone cards.
//
// SERVICE: every read is server-side — `education.fc_set_list_scoped` /
// `fc_set_list_counts` / `fc_set_list_facets` (features/flashcards/data/
// deckListService.ts), hand-written from the template in
// lib/list-scope/FEATURE.md. Lane, archive axis, search, column filters,
// sort, paging, lane counts and facet options run in Postgres; the browser
// only ever holds the page on screen.
//
// LANES (THE VIEW LAW — RLS is the ceiling, the lane is declared in the RPC):
//   mine   → created_by = me
//   orgs   → someone else's deck, visibility >= internal, in one of MY orgs
//   shared → someone else's deck granted to me or my orgs (iam.permissions)
//   public → someone else's public deck

import type { EntityListConfig } from "@/lib/entity-list/config";
import type { EntityBulkSelection } from "@/lib/entity-list/selection";
import type { ShownTo } from "@/lib/row-access";
import type { EntityColumnSpec } from "@/lib/entity-list/columns";
import { Muted, TextCell, timeCell } from "@/lib/entity-list/columns";
import {
  NONE_VALUE,
  type EntityFacets,
  type EntityListQuery,
  type EntityListSort,
  type EntityScopeCounts,
} from "@/lib/entity-list/types";
import type { ListScopeKind } from "@/lib/list-scope/types";
import { withStandardLanes } from "@/lib/list-scope/types";
import { visibilityWords } from "@/lib/record-words";
import { PlayTapButton, ZapTapButton } from "@ai-matrx/design-system/tap-target/buttons";
import { Archive, ArchiveRestore, FolderInput, Users } from "lucide-react";
import { archiveRecord, restoreFromTrash } from "@/features/trash/service";
import { associationsService } from "@/features/scopes/service/associationsService";
import { EDGE_ROLE } from "@/features/flashcards/data/types";
import { saveDeckRowAccess } from "@/features/flashcards/components/sharing/DeckRowAccess";
import { SHOWN_TO_LABELS, shownToChoices, SHOWN_TO_LABEL } from "@/lib/row-access";
import { runPerRow } from "@/lib/entity-list/standardBulkActions";
import { archiveConfirmSentence } from "@/features/trash/archiveCopy";
import {
  fetchDeckFacets,
  fetchDeckLaneCounts,
  fetchDeckPage,
  type DeckLane,
  type DeckListQuery,
  type DeckListRow,
} from "../../data/deckListService";

import {
  FAST_FIRE_BASE,
  FLASHCARD_SETS_BASE,
  flashcardDeckHref,
  flashcardStudyHref,
} from "../../routes";

export {
  FAST_FIRE_BASE,
  FLASHCARD_SETS_BASE,
  flashcardDeckHref,
  flashcardStudyHref,
};
export const flashcardFastFireHref = (row: { id: string }) =>
  `${FAST_FIRE_BASE}?set=${row.id}`;

/** One row of the library: the deck plus what the list needs to file it. */
export interface FlashcardDeckListRow extends DeckListRow {
  /** True when the deck is archived (`deleted_at` set) — the archive axis. */
  archived: boolean;
}

/** Pinned name column width (px) — decks are named after chapters and run long. */
const FLASHCARD_NAME_WIDTH = 480;
/** About how many characters of a name fit in that column before "…". */
const FLASHCARD_NAME_VISIBLE_CHARS = 58;

export const FLASHCARD_SET_SCOPES: ListScopeKind[] = [
  "mine",
  "orgs",
  "shared",
  "public",
];

/** Short visibility labels for the column and the facet chips. */
const VISIBILITY_LABELS: Record<string, string> = {
  personal: "Only me",
  internal: "Organization",
  link: "Anyone with link",
  public: "Public",
};

export function visibilityLabel(value: string): string {
  return VISIBILITY_LABELS[value] ?? value;
}

function toDeckQuery(query: EntityListQuery): DeckListQuery {
  const scope = query.scope;
  return {
    lane: (withStandardLanes(FLASHCARD_SET_SCOPES).includes(scope.kind)
      ? scope.kind
      : "all") as DeckLane,
    // The page's organization filter (`?org_filter=`), never the active organization.
    orgId: query.orgId,
    search: query.search.trim(),
    filters: query.filters,
    archived: query.archived,
  };
}

/** The list service: three server calls, nothing held in the browser. */
export const flashcardDeckListService: EntityListConfig<FlashcardDeckListRow>["service"] =
  {
    async fetchPage(query: EntityListQuery, sort: EntityListSort) {
      const page = await fetchDeckPage(toDeckQuery(query), {
        sort: sort.sort,
        ascending: sort.direction === "asc",
        limit: sort.pageSize,
        offset: Math.max(0, (query.page - 1) * sort.pageSize),
      });
      return {
        rows: page.rows.map((r) => ({ ...r, archived: r.deleted_at !== null })),
        total: page.total,
      };
    },
    async fetchCounts(query: EntityListQuery): Promise<EntityScopeCounts> {
      const { lane: _lane, ...rest } = toDeckQuery(query);
      const byKind = await fetchDeckLaneCounts(rest);
      return { byKind, narrow: {} };
    },
    async fetchFacets(query: EntityListQuery): Promise<EntityFacets> {
      return { byKind: await fetchDeckFacets(toDeckQuery(query)) };
    },
  };

function formatDifficulty(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function StudyCell({ row }: { row: FlashcardDeckListRow }) {
  if (row.archived) return <Muted>Archived</Muted>;
  return (
    // The row itself opens the deck; these two are their own doors, so their
    // clicks never also open the row.
    <span
      className="flex items-center"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Phone card: labeled one-tap buttons; the grid: icons + tooltips. */}
      <span className="contents sm:hidden">
        <PlayTapButton
          href={flashcardStudyHref(row)}
          variant="transparent"
          label="Study"
          ariaLabel={`Study ${row.name}`}
        />
        <ZapTapButton
          href={flashcardFastFireHref(row)}
          variant="transparent"
          label="Fast Fire"
          ariaLabel={`Fast Fire ${row.name}`}
        />
      </span>
      <span className="hidden sm:contents">
        <PlayTapButton
          href={flashcardStudyHref(row)}
          variant="transparent"
          tooltip="Study"
          ariaLabel={`Study ${row.name}`}
        />
        <ZapTapButton
          href={flashcardFastFireHref(row)}
          variant="transparent"
          tooltip="Fast Fire drill"
          ariaLabel={`Fast Fire ${row.name}`}
        />
      </span>
    </span>
  );
}

export function buildFlashcardDeckColumns(
  folderName: (id: string) => string,
): EntityColumnSpec<FlashcardDeckListRow>[] {
  const formatFolder = (value: string) =>
    value === NONE_VALUE ? "No folder" : folderName(value);
  return [
    {
      id: "name",
      label: "Name",
      locked: true,
      phone: "title",
      column: {
        id: "name",
        // The name is what people scan for: give it the room, cap the rest.
        // Its width is pinned up to FLASHCARD_NAME_WIDTH (config
        // nameColumnMaxWidth) — the old 26rem cell cap cut it off while
        // mostly-empty columns held the space.
        width: FLASHCARD_NAME_WIDTH,
        className: "overflow-hidden",
        accessorKey: "name",
        header: "Name",
        filter: "text",
        href: flashcardDeckHref,
        entityToken: "fc_set",
        cell: (row) => <TextCell value={row.name} className="font-medium" />,
      },
    },
    {
      id: "study",
      label: "Study",
      locked: true,
      phone: "actions",
      // Ordered right after the name (page-pass 2026-09-27): the main action
      // stays on screen at 800px instead of behind Topic and Folders.
      column: {
        id: "study",
        width: 96,
        header: "Study",
        filter: false,
        sortable: false,
        cell: (row) => <StudyCell row={row} />,
      },
    },
    {
      id: "topic",
      label: "Topic",
      phone: "primary",
      column: {
        id: "topic",
        width: 220,
        className: "max-w-[14rem] overflow-hidden",
        accessorKey: "topic",
        header: "Topic",
        filter: "text",
        cell: (row) => <TextCell value={row.topic} />,
      },
    },
    {
      id: "lesson",
      label: "Lesson",
      defaultHidden: true,
      column: {
        id: "lesson",
        accessorKey: "lesson",
        header: "Lesson",
        filter: "text",
        cell: (row) => <TextCell value={row.lesson} />,
      },
    },
    {
      id: "description",
      label: "Description",
      defaultHidden: true,
      phone: "rest",
      column: {
        id: "description",
        accessorKey: "description",
        header: "Description",
        filter: "text",
        cell: (row) => <TextCell value={row.description} />,
      },
    },
    {
      id: "difficulty",
      label: "Difficulty",
      facet: "difficulty",
      formatFacetValue: formatDifficulty,
      phone: "off",
      column: {
        id: "difficulty",
        accessorKey: "difficulty",
        header: "Difficulty",
        filter: "select",
        cell: (row) =>
          row.difficulty ? (
            <span>{formatDifficulty(row.difficulty)}</span>
          ) : (
            <Muted>—</Muted>
          ),
      },
    },
    {
      id: "folders",
      label: "Folders",
      facet: "folders",
      formatFacetValue: formatFolder,
      phone: "off",
      column: {
        id: "folders",
        width: 160,
        className: "max-w-[10rem] overflow-hidden",
        header: "Folders",
        filter: "select",
        sortable: false,
        accessorFn: (row) => row.folder_ids.map(folderName).join(", "),
        cell: (row) =>
          row.folder_ids.length ? (
            <TextCell value={row.folder_ids.map(folderName).join(", ")} />
          ) : (
            <Muted>—</Muted>
          ),
      },
    },
    {
      id: "visibility",
      label: "Who can see it",
      facet: "visibility",
      formatFacetValue: visibilityLabel,
      phone: "off",
      column: {
        id: "visibility",
        accessorKey: "visibility",
        header: "Who can see it",
        filter: "select",
        cell: (row) => (
          <span
            className="block truncate"
            title={visibilityWords(row.visibility) ?? undefined}
          >
            {visibilityLabel(row.visibility)}
          </span>
        ),
      },
    },
    {
      id: "updated",
      label: "Last edited",
      phone: "meta",
      column: {
        id: "updated",
        accessorKey: "updated_at",
        header: "Last edited",
        filter: "date",
        cell: (row) => timeCell(row.updated_at),
      },
    },
    {
      id: "created",
      label: "Created",
      defaultHidden: true,
      column: {
        id: "created",
        accessorKey: "created_at",
        header: "Created",
        filter: "date",
        cell: (row) => timeCell(row.created_at),
      },
    },
  ];
}

export function buildFlashcardDeckListConfig(input: {
  userId: string;
  useRowActions: EntityListConfig<FlashcardDeckListRow>["useRowActions"];
  folderName: (id: string) => string;
  /** The person's folders, for "Add to folder…". Absent: that verb is not offered. */
  folders?: readonly { id: string; name: string }[];
  foldersKey: string;
}): EntityListConfig<FlashcardDeckListRow> {
  return {
    surfaceKey: "education-flashcard-sets",
    // Where the list OPENS is the landing-tab knob lists.landing_tab/fc_set
    // (Mine; overridable per organization and person), never a literal here
    // and never "Shown to by default" (access.shown_to_default/fc_set stays
    // "everyone" — Arman 2026-09-29: visible to all, editable by the owner).
    // Which tab opens is a separate choice from who sees a deck.
    registryToken: "fc_set",
    entityLabel: { singular: "deck", plural: "decks" },
    sourceFeature: "education-flashcards",
    scopes: FLASHCARD_SET_SCOPES,
    service: flashcardDeckListService,
    serviceKey: `${input.userId}:${input.foldersKey}`,
    columns: buildFlashcardDeckColumns(input.folderName),
    // Page-pass 2026-09-28: Topic, Difficulty and Folders were "—" on almost
    // every row. A column empty (or identical) on every loaded row hides by
    // default; it stays in the column picker, and one a person shows stays.
    autoHideUniformColumns: true,
    nameColumnMaxWidth: FLASHCARD_NAME_WIDTH,
    // Names that read the same once cut off ("AP Chemistry Nomenclature: the
    // Absolute Core -…") get the "Created …" note too, not only identical ones.
    lookalike: { visibleChars: FLASHCARD_NAME_VISIBLE_CHARS },
    prefsVersion: 1,
    prefsDefaults: { sort: "updated", direction: "desc" },
    getRowId: (row) => row.id,
    getRowName: (row) => row.name,
    getRowEntity: (row) => ({
      type: "fc_set",
      id: row.id,
      title: row.name,
      resourceType: "fc_set",
    }),
    door: { token: "fc_set", column: "name", hrefFor: flashcardDeckHref },
    useRowActions: input.useRowActions,
    // Ticking rows (page-pass 2026-09-27): the person — and the agent, through
    // selected_deck_ids — can act on several of their own decks at once.
    bulkActions: [
      {
        id: "archive",
        label: "Archive",
        icon: Archive,
        variant: "outline",
        confirm: (selection) => ({
          title: `Archive ${selection.count === 1 ? "this deck" : `${selection.count} decks`}?`,
          // The list's Filters panel carries Archived, so restore lives there (verify-7 #2).
          description: `${archiveConfirmSentence(
            selection.count === 1 ? "this deck" : `${selection.count} decks`,
            { count: selection.count, restoreFrom: "list_filters" },
          )} Cards and study history are kept.`,
          confirmLabel: "Archive",
        }),
        // The limits live here, not on the checkbox: a deck that is not the
        // person's own, or is already archived, is skipped and named.
        run: (selection) =>
          runPerRow(
            selection,
            async (id, row) => {
              if (row && row.created_by !== input.userId)
                throw new Error("not your deck");
              if (row?.archived) throw new Error("already archived");
              await archiveRecord("fc_set", id, "deck");
            },
            {
              done: "Archived",
              noun: "deck",
              labelOf: (row) => row.name,
              removesRows: true,
            },
            (row) => row.id,
          ),
      },
      {
        // The row menu's Restore (`restoreFromTrash`), many at a time. Same id as the
        // built-in, so it replaces it and skips decks that are not archived.
        id: "restore",
        label: "Restore",
        icon: ArchiveRestore,
        run: (selection) =>
          runPerRow(
            selection,
            async (id, row) => {
              if (row && !row.archived) throw new Error("not archived");
              await restoreFromTrash("fc_set", id);
            },
            { done: "Restored", noun: "deck", labelOf: (row) => row.name, removesRows: true },
            (row) => row.id,
          ),
      },
      ...(input.folders && input.folders.length > 0
        ? [
            {
              // The row's Folders picker adds a folder tag (a `theme` edge); this adds one folder to many.
              id: "add-to-folder",
              label: "Add to folder…",
              icon: FolderInput,
              confirm: (selection: { count: number }) => ({
                title: `Add ${selection.count === 1 ? "this deck" : `${selection.count} decks`} to a folder?`,
                description: "Decks stay in any folders they are already in.",
                confirmLabel: "Add to folder",
                ask: {
                  kind: "choice" as const,
                  label: "Folder",
                  options: (input.folders ?? []).map((f) => ({ value: f.id, label: f.name })),
                },
              }),
              run: (selection: EntityBulkSelection<FlashcardDeckListRow>, bulkInput?: { value?: string }) =>
                runPerRow(
                  selection,
                  async (id, row) => {
                    const folderId = bulkInput?.value;
                    if (!folderId) throw new Error("no folder picked");
                    if (row && row.created_by !== input.userId) throw new Error("not your deck");
                    if (row?.archived) throw new Error("archived — restore it first");
                    if (row?.folder_ids.includes(folderId)) throw new Error("already in that folder");
                    const result = await associationsService.add({
                      sourceType: "fc_set",
                      sourceId: id,
                      targetType: "category",
                      targetId: folderId,
                      role: EDGE_ROLE.theme,
                    });
                    if (!result.ok) throw new Error(result.error.message ?? "Not added");
                  },
                  { done: "Added to folder", noun: "deck", labelOf: (row) => row.name },
                  (row) => row.id,
                ),
            },
          ]
        : []),
      {
        // The row's "Shown to" (`saveDeckRowAccess`), one value for every selected deck.
        id: "shown-to",
        label: `${SHOWN_TO_LABEL}…`,
        icon: Users,
        confirm: (selection) => ({
          title: `Change who sees ${selection.count === 1 ? "this deck" : `${selection.count} decks`}?`,
          description: "Only your own decks change; the rest are skipped and named.",
          confirmLabel: "Change",
          ask: {
            kind: "choice",
            label: SHOWN_TO_LABEL,
            options: shownToChoices(false).map((v) => ({ value: v, label: SHOWN_TO_LABELS[v] })),
          },
        }),
        run: (selection, bulkInput) =>
          runPerRow(
            selection,
            async (id, row) => {
              const value = bulkInput?.value;
              if (!value) throw new Error("nothing picked");
              if (row && row.created_by !== input.userId) throw new Error("not your deck");
              if (row?.archived) throw new Error("archived — restore it first");
              await saveDeckRowAccess(id, { shownTo: value as ShownTo });
            },
            { done: "Visibility changed", noun: "deck", labelOf: (row) => row.name },
            (row) => row.id,
          ),
      },
    ],
    // Archive IS the soft delete behind the built-in "Move to Trash"
    // (archiveRecord sets deleted_at), so the built-in is off: one button.
    standardBulkActions: { trash: false },
    bulkSelection: {
      noun: "deck",
    },
    searchPlaceholder: "Search decks by name, topic, lesson or description…",
    facetSections: [
      {
        facet: "folders",
        filterId: "folders",
        label: "Folders",
        noneLabel: "No folder",
        formatValue: (v) =>
          v === NONE_VALUE ? "No folder" : input.folderName(v),
      },
      {
        facet: "difficulty",
        filterId: "difficulty",
        label: "Difficulty",
        noneLabel: "No difficulty",
        formatValue: formatDifficulty,
      },
      {
        facet: "visibility",
        filterId: "visibility",
        label: "Who can see it",
        noneLabel: "Not set",
        formatValue: visibilityLabel,
      },
    ],
    copy: {
      label: "Deck",
      listLabel: "Flashcard decks",
      location: FLASHCARD_SETS_BASE,
      rowKind: "flashcard-deck",
      listKind: "flashcard-deck-list",
      humanRow: (row) =>
        [
          row.name,
          [row.topic, row.lesson].filter(Boolean).join(" — "),
          row.difficulty ? `difficulty ${row.difficulty}` : "",
          `edited ${row.updated_at.slice(0, 10)}`,
        ]
          .filter(Boolean)
          .join(" · "),
    },
    emptyState: {
      title: "No flashcard decks yet",
      description:
        "A deck is a set of cards you study with spaced repetition, Fast Fire and tests. Create one from a topic, a document, or an import.",
    },
  };
}
