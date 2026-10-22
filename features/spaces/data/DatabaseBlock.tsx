"use client";

// features/spaces/data/DatabaseBlock.tsx — Notion's inline / full-page database and "Linked view of
// database" (C24, C25, F1–F9) and chart view (C26, G1–G4), on @ai-matrx/records-ui.
//
// The block stores where its records come from (`source`), its views and which one is showing
// (data/sources.ts). Records are drawn by records-ui's `ViewSwitcher` (table, board, gallery, list,
// calendar, timeline), `DashboardCanvas` (dashboard) and data/ChartView (chart); a record opens in
// records-ui's `Peek` as a side peek, a center peek or a full page. The store decides what a person
// may read and write — this block is a filter, never a permission.

import { readVersionNow, updateRecordAt } from "@/lib/records/record-versions";
import { Popover, PopoverContent, PopoverTrigger } from "@ai-matrx/design-system";
import { Button, Input, Switch } from "@ai-matrx/design-system/controls";
import { ConditionGroup, DashboardCanvas, FieldEditor, FormBuilder, FormLookFrame, NotifyRuleEditor, Peek, RecordForm, ViewSwitcher } from "@/features/data-tables/records-ui-host/recordsUiLazy";
import type { ConditionField } from "@ai-matrx/records-ui";
import type { PublicForm } from "@/features/forms/service";
import { PublicFormRunner } from "@/app/(link)/f/[formId]/PublicFormRunner";
import { spacesFormForAnswering } from "./form-actions";
import { AutomationsPanel } from "./Automations";
import type { RuleExpression } from "@ai-matrx/records";
import { tableShapeChanged, useFields, useRecord, useRecordsClient, useTable, type Field } from "@ai-matrx/records/react";
import {
  AppWindow,
  ArrowDownUp,
  ArrowUpRight,
  BarChart3,
  ChartNoAxesColumn,
  Database,
  GanttChart,
  Kanban,
  List,
  ListFilter,
  Maximize2,
  PanelRight,
  Pencil,
  Zap,
  PieChart,
  Plus,
  Search,
  Square,
  SlidersHorizontal,
  Table2,
  X,
  FileText,
} from "lucide-react";
import { useContext, useEffect, useState, type ReactNode } from "react";

import { AGENT_ICON } from "@/components/icons/domain-icons";
import { buildSeedHref, tableReference } from "@/features/applets-host/builder/build-seed";
import { openOutbound } from "@ai-matrx/kit/outbound";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { toast } from "@/lib/toast";

import { DataMount } from "./DataMount";
import { RowOpenerContext } from "./row-opener";
import { usePublishedEntities, usePublishedRows } from "./published-rows";
import { EntityDatabase } from "./EntityDatabase";
import { useDatabaseDesigner } from "../ai/DatabaseDesigner";
import { AutofillRows } from "./ai-autofill";
import { designMarkdown } from "./designed-database";
import { FieldList, MenuRow, SidePeek, ViewerSaveBar, ViewerSortButton, ViewTab, filtersDiffer, shownFilters, shownSorts, type FilterChoice, type SortChoice, NewButton } from "./menu-parts";
import { ChartView, choicesOfField } from "./ChartView";
import { DEFAULT_CHART } from "./first-reads";
import { CARD_SIZES, LOAD_LIMITS, blockPageSize, blockQuestion, cardSizeFromLook, effectiveHidden, kindOf, viewSpec, type ViewWithSummaries } from "./view-spec";
import { primeOwningRow, useOwningRow } from "./owning-row";
import { newRowData, readRowTemplates, setDefaultRowTemplate, startNewRow, startTemplatePage, templateFor, type NewRowPick, type RowTemplateChoice } from "./row-templates";
import type { RowPageDb } from "../embed/row-page";
import { createClient } from "@/utils/supabase/client";
import { RecordBodySpace } from "../embed/RecordBodySpace";
import { resolveThisRow, thisRowValues, THIS_ROW, THIS_ROW_LABEL, usesThisRow } from "./this-row";
import { BlockRecordsSeed } from "../page/space-seed-context";
import { NewPropertyPanel } from "./NewProperty";
import { LAYOUTS, viewIcon, type Layout } from "./view-icons";
import { useUrlView } from "./url-view";
import { useStructureEdit } from "../page/structure";
import { DatabaseLoadingBox } from "../editor/database-loading-box";
import { ReservedBody } from "./database-body-reserve";
import { frameControls, type TabControl, type ToolControl } from "./database-frame-shape";
import { newViewId, readDatabaseProps, type ChartSettings, type DatabaseBlockProps, type SpaceDbView, type SpaceViewLayout } from "./sources";

export interface DatabaseBlockViewProps {
  blockId: string;
  props: Record<string, unknown>;
  onChange: (next: Record<string, unknown>) => void;
  editable: boolean;
}

export function DatabaseBlock({ blockId, props: stored, onChange: write, editable }: DatabaseBlockViewProps) {
  // A link to this block with a view (the tiered breadcrumb) shows that view until the database is edited.
  const urlView = useUrlView(blockId);
  const named = urlView.viewId && Array.isArray(stored.views) && stored.views.some((v) => (v as { id?: unknown }).id === urlView.viewId);
  const raw = named ? { ...stored, activeViewId: urlView.viewId } : stored;
  const onChange = (next: Record<string, unknown>) => {
    urlView.drop();
    write(next);
  };
  const props = readDatabaseProps(raw);
  const publishedEntities = usePublishedEntities();
  const publishedRows = usePublishedRows() !== null;
  if (!props) return <div className="spaces-db-frame spaces-db-note">This database has no source.</div>;
  if (props.source.kind === "entity") {
    // A page on the web: the rows the page itself published for this block, never a live read.
    const published = publishedEntities?.get(blockId);
    if (publishedEntities && !published) return <div className="spaces-db-frame spaces-db-note">This database isn’t published with this page.</div>;
    return <EntityDatabase token={props.source.token} props={props} raw={raw} onChange={onChange} editable={editable} published={published} />;
  }
  const tableId = props.source.tableId;
  return (
    <DataMount
      sample={props.sample ?? null}
      tableId={tableId}
      held={(line, retry) => (
        // Still resolving where the table opens: the frame's own shape, never a bare box (DB-BLOCK-CHROME).
        line ? (
          <div className="spaces-db-frame spaces-db-note">
            {line}
            {retry ? (
              <Button variant="quiet" onClick={retry}>
                Try again
              </Button>
            ) : null}
          </div>
        ) : (
          <DatabaseLoadingBox blockId={blockId} p={raw} editable={editable} published={publishedRows} />
        )
      )}
    >
      <BlockRecordsSeed>
        <DatabaseFrame tableId={tableId} props={props} raw={raw} onChange={onChange} editable={editable} sample={Boolean(props.sample)} />
      </BlockRecordsSeed>
    </DataMount>
  );
}

function DatabaseFrame({
  tableId,
  props,
  raw,
  onChange,
  editable,
  sample,
}: {
  tableId: string;
  props: DatabaseBlockProps;
  raw: Record<string, unknown>;
  onChange: (next: Record<string, unknown>) => void;
  editable: boolean;
  sample: boolean;
}) {
  const client = useRecordsClient();
  const table = useTable(tableId);
  // Structure (views, properties, layout, automations, saved filters) is Full access / Can edit only (Notion);
  // a content editor adds and edits rows. The database enforces it; this only stops offering it.
  const structure = useStructureEdit();
  const shape = editable && structure;
  // On a page published to the web the rows are the page's own read-only copy: no automations, charts count rows.
  const published = usePublishedRows() !== null;
  const fields = useFields(tableId).data ?? [];
  const sourceName = table.data?.name ?? props.title ?? "Untitled";
  const views: SpaceDbView[] = props.views?.length ? props.views : [{ id: "view-all", name: "All", layout: "grid" }];
  const active = views.find((v) => v.id === props.activeViewId) ?? views[0];
  const [open, setOpen] = useState<string | null>(null);
  /** The row "+ New" just made: its peek opens with the cursor in its title. */
  const [fresh, setFresh] = useState<string | null>(null);
  // A row a button made in ANOTHER table (an "Add task" on a project) opens in this block's peek too.
  const [elsewhere, setElsewhere] = useState<{ tableId: string; recordId: string } | null>(null);
  const opener = useContext(RowOpenerContext);
  useEffect(() => {
    if (!opener) return;
    return opener.register((rowTable, recordId) => {
      if (rowTable === tableId) {
        setElsewhere(null);
        setFresh(recordId);
        setOpen(recordId);
      } else {
        setOpen(null);
        setFresh(recordId);
        setElsewhere({ tableId: rowTable, recordId });
      }
    });
  }, [opener, tableId]);
  /** The whole-record form (a required column refused the bare write), with the New menu's pick. */
  const [creating, setCreating] = useState<{ template: RowTemplateChoice | null; initial: Record<string, unknown> } | null>(null);
  const [expanded, setExpanded] = useState(false);
  // The toolbar sort is this viewer's own, per view, never written to the view (Notion): it reaches the
  // grid as `sortOverride` (null = the view's saved sort); charts and boards read it from the spec.
  const [sortChoices, setSortChoices] = useState<Record<string, SortChoice>>({});
  const choice = sortChoices[active.id];
  // The toolbar filter is the viewer's own the same way, until an editor saves it for everyone.
  const [filterChoices, setFilterChoices] = useState<Record<string, FilterChoice>>({});
  const asked: SpaceDbView = { ...active, sorts: shownSorts(active, choice), filters: shownFilters(active, filterChoices[active.id]) };
  // "This page's row" (data/this-row.ts): resolved to the row this page belongs to before the store is asked.
  const owning = useOwningRow(usesThisRow(asked.filters));
  const ownerId = owning.state === "found" ? owning.row.recordId : owning.state === "none" || owning.state === "failed" ? null : undefined;
  const resolved = resolveThisRow(asked.filters, ownerId);
  const shown: SpaceDbView = resolved.state === "plain" || resolved.state === "resolved" ? { ...asked, filters: resolved.filters } : asked;
  const sortOverride = choice ?? null;
  // The viewer's search (the table's magnifier), per view, beside the sort and filter: never saved,
  // asked of the store's search by the grid (records-ui searchOverride).
  const [searchChoices, setSearchChoices] = useState<Record<string, string>>({});
  const [searchOpen, setSearchOpen] = useState<Record<string, boolean>>({});
  const search = {
    value: searchChoices[active.id] ?? "",
    onChange: (term: string) => setSearchChoices((prev) => (prev[active.id] === term ? prev : { ...prev, [active.id]: term })),
  };

  const save = (patch: Partial<DatabaseBlockProps>) => onChange({ ...raw, ...patch });
  const saveView = (patch: Partial<SpaceDbView>) => save({ views: views.map((v) => (v.id === active.id ? { ...v, ...patch } : v)), activeViewId: active.id });
  const isChart = active.layout === "chart";
  // The controls this frame draws for this person: the same decision its loading shape draws from.
  const controls = frameControls(isChart, { shape, published });
  const tabControl = (c: TabControl) => controls.tabs.includes(c);
  const tool = (c: ToolControl) => controls.tools?.includes(c) ?? false;

  // "+ New record" (F7): Notion adds a row in place and opens it. A refused empty row (a required
  // column, a read-only sample) falls back to the whole-record form, which says why.
  // Notion's "New ▾" (data/row-templates.ts): plain New starts from the table's default row template, a
  // picked template from that one (its preset values on the row, its body on the row's page), "Empty page" from
  // nothing. The row's page is made before the row opens, through the one row-page path.
  const tableOrg = (table.data as { organization_id?: string } | null)?.organization_id ?? null;
  const rowPageDb = () => createClient() as unknown as RowPageDb;
  const loadTemplates = () => (tableOrg ? readRowTemplates(rowPageDb(), tableOrg, tableId) : Promise.resolve([]));
  const addRow = (pick: NewRowPick = { kind: "default" }) => {
    // A row added in a "This page's row" view starts linked to that row, so it stays in the view.
    const viewValues = thisRowValues(asked.filters, ownerId);
    const refused = (template: RowTemplateChoice | null = null) =>
      sample ? toast.info("The sample is read-only. Add your own table to add rows.") : setCreating({ template, initial: newRowData(template, viewValues) });
    if (sample || !tableOrg) {
      void client.recordWrite({ table_id: tableId, data: viewValues }).then((res) => {
        if (res.ok) {
          setFresh(res.data);
          setOpen(res.data);
        } else refused();
      });
      return;
    }
    const db = rowPageDb();
    let template: RowTemplateChoice | null = null;
    void (pick.kind === "empty" ? Promise.resolve([]) : readRowTemplates(db, tableOrg, tableId))
      .then((templates) => {
        template = templateFor(pick, templates);
        return startNewRow(db, {
          organizationId: tableOrg,
          tableId,
          template,
          viewValues,
          writeRow: async (data) => {
            const res = await client.recordWrite({ table_id: tableId, data });
            return res.ok ? { ok: true, id: res.data } : { ok: false, message: res.error.message };
          },
          onPage: (spaceId, recordId) => primeOwningRow(spaceId, { recordId, tableId, organizationId: tableOrg }),
        });
      })
      .then(
        (res) => {
          if (res.ok) {
            if (res.pageError) toast.error(res.pageError);
            setFresh(res.recordId);
            setOpen(res.recordId);
          } else refused(template);
        },
        (err: unknown) => toast.error(err instanceof Error ? err.message : "The new row's page could not be started."),
      );
  };

  // A row added in the view starts linked to this page's row (records-ui newRowValues), so it stays in the view.
  const newRowValues = thisRowValues(asked.filters, ownerId);
  const body =
    resolved.state === "waiting" ? (
      <div className="spaces-db-loading" />
    ) : resolved.state === "no-row" ? (
      <div className="spaces-db-note" data-this-row="none">
        {owning.state === "failed" ? "This page’s row can’t be read right now." : "Shows the rows of this page’s row — this page isn’t a row."}
      </div>
    ) : (
    <DatabaseBody
      tableId={tableId}
      view={shown}
      newRowValues={newRowValues}
      fields={fields}
      onOpenRecord={setOpen}
      editable={editable}
      sample={sample}
      overRows={sample || published}
      sortOverride={sortOverride}
      search={search}
      shape={shape}
      onSummaries={shape && !sample && !published ? (summaries) => saveView({ summaries } as Partial<SpaceDbView>) : undefined}
      onFormId={(formId) => saveView({ formId })}
      onLook={saveView}
    />
  );

  return (
    <div className="spaces-db-frame" data-layout={active.layout}>
      {props.showTitle !== false && !isChart ? (
        <div className="spaces-db-title">
          {props.linked ? <ArrowUpRight size={14} strokeWidth={2} className="spaces-db-linked" /> : null}
          {shape && !sample ? (
            // Notion: the database's title is typed in place.
            <Input
              variant="bare"
              key={props.title || sourceName}
              defaultValue={props.title || sourceName}
              aria-label="Database title"
              className="spaces-db-title-input"
              onBlur={(e) => {
                const next = e.target.value.trim();
                if (!next || next === (props.title || sourceName)) return;
                save({ title: next });
                // Notion: an inline database's title IS the database's name (relation pickers, search, the sidebar).
                // A linked view keeps a title of its own.
                if (!props.linked && next !== table.data?.name)
                  void readVersionNow(client, tableId).then((seen) => updateRecordAt(client, { record_id: tableId, patch: { name: next, label_singular: next, label_plural: next }, version: seen })).then((renamed) => {
                    if (renamed.ok) tableShapeChanged(tableId);
                    else toast.error(`Database not renamed: ${renamed.error.message}`);
                  });
              }}
              onKeyDown={(e) => e.key === "Enter" && (e.currentTarget as HTMLInputElement).blur()}
            />
          ) : (
            <span>{props.title || sourceName}</span>
          )}
        </div>
      ) : null}
      <div className="spaces-db-bar">
        <div className="spaces-db-tabs" role="tablist">
          {views.map((v) => {

            return (
              <ViewTab
                key={v.id}
                view={v}
                icon={viewIcon(v, isChart ? 16 : 14)}
                active={v.id === active.id}
                pill={isChart}
                editable={shape}
                onSelect={() => save({ activeViewId: v.id })}
                onRename={(name) => save({ views: views.map((x) => (x.id === v.id ? { ...x, name } : x)), activeViewId: v.id })}
                onDuplicate={() => {
                  const copy = { ...v, id: newViewId(), name: `${v.name} (copy)` };
                  save({ views: [...views, copy], activeViewId: copy.id });
                }}
                onDelete={
                  views.length > 1
                    ? () => {
                        const rest = views.filter((x) => x.id !== v.id);
                        save({ views: rest, activeViewId: rest[0].id });
                      }
                    : undefined
                }
              />
            );
          })}
          {tabControl("settings") ? (
            <ViewSettings tableId={tableId} sample={sample} view={active} fields={fields} props={props} onView={saveView} onBlock={save} editable={shape} compact />
          ) : null}
          {tabControl("chartTools") ? (
            // Notion's chart view keeps its view's filter and sort: the tile counts and orders what they show.
            <span className="spaces-db-chart-tools">
              <FilterButton
                view={active}
                fields={fields}
                choice={filterChoices[active.id]}
                onChoice={(c) => setFilterChoices((all) => ({ ...all, [active.id]: c }))}
                canSave={shape}
                onSave={(filters) => saveView({ filters })}
              />
              <ViewerSortButton
                view={active}
                fields={fields}
                choice={sortChoices[active.id]}
                onChoice={(c) => setSortChoices((all) => ({ ...all, [active.id]: c }))}
                canSave={shape}
                onSave={(sorts) => saveView({ sorts })}
                icon={<ArrowDownUp size={14} strokeWidth={1.8} />}
              />
            </span>
          ) : null}
          {tabControl("addView") ? (
            <Button variant="quiet" icon={<Plus size={14} />} aria-label="Add view" onClick={() => {
                const v: SpaceDbView = { id: newViewId(), name: "Table", layout: "grid" };
                save({ views: [...views, v], activeViewId: v.id });
              }} />
          ) : null}
        </div>
        {controls.tools ? (
          <div className="spaces-db-tools">
            <FilterButton
              view={active}
              fields={fields}
              choice={filterChoices[active.id]}
              onChoice={(c) => setFilterChoices((all) => ({ ...all, [active.id]: c }))}
              canSave={shape}
              onSave={(filters) => saveView({ filters })}
              onSaveWhere={shape && !sample && !published ? (where) => saveView({ where }) : undefined}
            />
            <ViewerSortButton
              view={active}
              fields={fields}
              choice={sortChoices[active.id]}
              onChoice={(c) => setSortChoices((all) => ({ ...all, [active.id]: c }))}
              canSave={shape}
              onSave={(sorts) => saveView({ sorts })}
              icon={<ArrowDownUp size={15} strokeWidth={1.8} />}
            />
            {!tool("automations") ? null : <AutomationsButton tableId={tableId} sample={sample} fields={fields} organizationId={(table.data as { organization_id?: string } | null)?.organization_id ?? null} />}
            {/* Notion's magnifier sits in this icon row and opens in place (records-ui's own box is hidden by spaces.css). */}
            {searchOpen[active.id] || search.value ? (
              <div className="spaces-db-search">
                <Search size={14} strokeWidth={1.8} aria-hidden />
                <Input
                  autoFocus
                  type="search"
                  aria-label="Search this database"
                  placeholder="Type to search…"
                  value={search.value}
                  onChange={(e) => search.onChange(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") {
                      search.onChange("");
                      setSearchOpen((all) => ({ ...all, [active.id]: false }));
                    }
                  }}
                  onBlur={() => {
                    if (!search.value) setSearchOpen((all) => ({ ...all, [active.id]: false }));
                  }}
                />
                {search.value ? (
                  <Button
                    variant="quiet"
                    icon={<X size={13} />}
                    aria-label="Clear search"
                    onClick={() => {
                      search.onChange("");
                      setSearchOpen((all) => ({ ...all, [active.id]: false }));
                    }}
                  />
                ) : null}
              </div>
            ) : (
              <Button variant="quiet" icon={<Search size={15} strokeWidth={1.8} />} aria-label="Search" title="Search" onClick={() => setSearchOpen((all) => ({ ...all, [active.id]: true }))} />
            )}
            <Button variant="quiet" icon={<Maximize2 size={15} strokeWidth={1.8} />} aria-label="Open as full page" title="Open as full page" onClick={() => setExpanded(true)} />
            {tool("settings") ? <ViewSettings tableId={tableId} sample={sample} view={active} fields={fields} props={props} onView={saveView} onBlock={save} editable={shape} /> : null}
            {!tool("new") ? null : (
              <NewButton
                onNew={(pick) => addRow(pick)}
                loadTemplates={loadTemplates}
                onSetDefault={shape && tableOrg ? (id) => setDefaultRowTemplate(rowPageDb(), tableOrg, tableId, id) : undefined}
                templatesOff={sample ? "Templates open once this template is in your workspace" : undefined}
              />
            )}
          </div>
        ) : null}
      </div>
      {body}

      {open ? <RecordOpen tableId={tableId} recordId={open} as={props.openAs ?? "side"} fresh={open === fresh} editable={editable} onClose={() => setOpen(null)} /> : null}
      {elsewhere ? <RecordOpen tableId={elsewhere.tableId} recordId={elsewhere.recordId} as={props.openAs ?? "side"} fresh={elsewhere.recordId === fresh} editable={editable} onClose={() => setElsewhere(null)} /> : null}

      <Dialog open={creating !== null} onOpenChange={(o) => (o ? null : setCreating(null))}>
        <DialogContent size="lg">
          <DialogTitle>New {table.data?.name ? `in ${table.data.name}` : "page"}</DialogTitle>
          {creating ? (
            <RecordForm
              tableId={tableId}
              initial={creating.initial}
              focusFirstRequired
              onCancel={() => setCreating(null)}
              onSaved={(recordId) => {
                const pickTemplate = creating.template;
                setCreating(null);
                // The row exists: its page starts from the pick (Empty page / no template = empty), then it opens.
                const started = tableOrg
                  ? startTemplatePage(rowPageDb(), { organizationId: tableOrg, tableId, recordId, template: pickTemplate, onPage: (spaceId) => primeOwningRow(spaceId, { recordId, tableId, organizationId: tableOrg }) })
                  : Promise.resolve("");
                // The row exists either way: it opens, and a page that could not start is said.
                void started
                  .catch((err: unknown) => toast.error(err instanceof Error ? err.message : "The new row's page could not be started."))
                  .then(() => setOpen(recordId));
              }}
            />
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={expanded} onOpenChange={setExpanded}>
        <DialogContent size="2xl" height="tall" className="spaces-db-expanded overflow-auto">
          <DialogTitle>{props.title || sourceName}</DialogTitle>
          {resolved.state === "plain" || resolved.state === "resolved" ? <DatabaseBody tableId={tableId} titleField={(table.data as { title_field?: string | null } | null)?.title_field ?? null} view={shown} newRowValues={newRowValues} fields={fields} onOpenRecord={setOpen} editable={editable} shape={shape} sample={sample} overRows={sample || published} sortOverride={sortOverride} search={search} onSummaries={shape && !sample && !published ? (summaries) => saveView({ summaries } as Partial<SpaceDbView>) : undefined} onFormId={(formId) => saveView({ formId })} onLook={saveView} /> : body}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function DatabaseBody({
  tableId,
  view,
  newRowValues,
  fields,
  onOpenRecord,
  editable,
  shape,
  sample,
  overRows,
  sortOverride,
  search,
  onSummaries,
  onFormId,
  onLook,
  titleField,
}: {
  tableId: string;
  /** The table's own title column (`title_field`): every card (gallery, board) is named by it (ADVERSARIAL-4 N1). */
  titleField?: string | null;
  view: ViewWithSummaries;
  /** What a row added in this view starts with (the relation to the page's row). */
  newRowValues: Record<string, string[]>;
  fields: Field[];
  onOpenRecord: (id: string) => void;
  editable: boolean;
  /** Full access / Can edit: the Form view's builder (a content editor, commenter or viewer answers it). */
  shape: boolean;
  sample: boolean;
  /** The store has no aggregate door (the sample, a published page): charts count read rows. */
  overRows: boolean;
  sortOverride: { field: string; direction: "asc" | "desc" } | null;
  search: { value: string; onChange: (term: string) => void };
  /** The person picked a column's footer measure (absent: nothing is kept — a reader, the sample). */
  onSummaries?: (summaries: Record<string, string>) => void;
  /** A Form view keeps the form it edits (made on first open). */
  onFormId: (formId: string) => void;
  /** The grid's column widths / order, kept on the view. */
  onLook: (look: Partial<SpaceDbView>) => void;
}) {
  if (view.layout === "chart") {
    const settings = { ...DEFAULT_CHART, ...view.chart };
    // The chart counts what its view shows: the view's saved filters plus the viewer's unsaved ones (`shown`).
    // and its sort when that sort is on the grouped field (data/ChartView.tsx orderPoints).
    return <ChartView tableId={tableId} settings={settings} title={view.name} overRows={overRows} filter={view.filters ?? {}} sorts={view.sorts ?? []} />;
  }
  if ((view.layout as Layout) === "dashboard") return <DashboardCanvas tableId={tableId} />;
  if ((view.layout as Layout) === "form") return <FormViewBody tableId={tableId} view={view} editable={shape && !overRows} onFormId={onFormId} />;
  const needsGroup = view.layout === "kanban" && !view.groupField;
  const group = needsGroup ? fields.find((f) => ["select", "status", "list"].includes(kindOf(f)))?.key : undefined;
  const needsDate = (view.layout === "calendar" || view.layout === "timeline") && !view.dateField;
  // Notion: a calendar reads any date property, Created time and Last edited time included.
  const date = needsDate ? (fields.find((f) => ["datetime", "date"].includes(kindOf(f))) ?? fields.find((f) => ["created_time", "modified_time"].includes(kindOf(f))))?.key : undefined;
  const spec = viewSpec(tableId, { ...view, groupField: view.groupField ?? group ?? null, dateField: view.dateField ?? date ?? null }, fields);
  // Notion's inline database: records-ui's embedded grid (no tick-boxes, Actions column or pager; one-line
  // rows; its own "New record" line, which writes the row in place). The magnifier is this block's own, in
  // its toolbar row beside filter and sort (searchBox={false}; N-19).
  return (
    <ReservedBody grid={view.layout === "grid"}>
      <ViewSwitcher
        view={spec}
        chooser={false}
        embedded
        {...(blockPageSize(view) ? { pageSize: blockPageSize(view) } : {})}
        titleField={titleField ?? null}
        // A table's row is a "record" (canonical vocabulary); "New page" stays on the Spaces-native entity database.
        newRowLabel={editable ? "New record" : undefined}
        {...(Object.keys(newRowValues).length ? { newRowValues } : {})}
        sortOverride={sortOverride}
        searchOverride={search.value || null}
        onSearchChange={search.onChange}
        searchBox={false}
        hideRefusedRowActions
        onOpenRecord={onOpenRecord}
        filter={blockQuestion(view, fields)}
        onViewChange={
          onSummaries
            ? (patch) => {
                const next = patch.presentation?.summaries;
                if (next && JSON.stringify(next) !== JSON.stringify(view.summaries ?? {})) onSummaries(next);
                // N5: a dragged column width / order is the view's (Notion keeps both per view).
                const widths = patch.presentation?.widths;
                const columnOrder = patch.presentation?.columnOrder;
                const look: Partial<SpaceDbView> = {};
                if (widths && JSON.stringify(widths) !== JSON.stringify(view.widths ?? {})) look.widths = widths;
                if (columnOrder && JSON.stringify(columnOrder) !== JSON.stringify(view.columnOrder ?? [])) look.columnOrder = columnOrder;
                // N5 "Wrap column": present means these columns wrap; absent from a look patch means none do.
                const wrapColumns = patch.presentation ? (patch.presentation.wrapColumns ?? []) : undefined;
                if (wrapColumns && JSON.stringify(wrapColumns) !== JSON.stringify(view.wrapColumns ?? [])) look.wrapColumns = wrapColumns;
                // Notion's "Card size": a size picked on the gallery's own S / M / L (or a board's) is the view's.
                const cardSize = cardSizeFromLook(view.layout, patch.presentation as Record<string, unknown> | undefined);
                if (cardSize && cardSize !== (view.cardSize ?? "medium")) look.cardSize = cardSize;
                if (Object.keys(look).length) onLook(look);
              }
            : // A view this block cannot save onto (preview, published, read-only): the change is kept for the
              // visit by records-ui's own state. Handing a no-op keeps its "nowhere to save" line off the page
              // (ADVERSARIAL-1 #5: developer prose under every board).
              KEEP_FOR_THE_VISIT
        }
      />
    </ReservedBody>
  );
}

/** Notion's card size words. */
const CARD_SIZE_WORDS: Record<(typeof CARD_SIZES)[number], string> = { small: "Small", medium: "Medium", large: "Large" };

/** records-ui's onViewChange for a view nothing saves: its own state already keeps the change. */
const KEEP_FOR_THE_VISIT = () => undefined;

/**
 * Notion's lightning (F3): the table's automations — records-ui's rule editor ("when a row …, tell …")
 * over this table, and the table's own page for the rest. The in-memory sample has no store to keep a
 * rule in, and says so.
 */
function AutomationsButton({ tableId, sample, fields, organizationId }: { tableId: string; sample: boolean; fields: Field[]; organizationId: string | null }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="quiet" icon={<Zap size={15} strokeWidth={1.8} />} aria-label="Automations" title="Automations" />
      </PopoverTrigger>
      <PopoverContent surface="solid" align="end" width="md" padding="sm">
        {sample ? (
          <p className="type-secondary text-muted-foreground">This preview keeps no automations.</p>
        ) : (
          <div className="flex flex-col gap-2">
            <AutomationsPanel tableId={tableId} organizationId={organizationId} fields={fields} />
            <NotifyRuleEditor tableId={tableId} />
            <a className="type-secondary text-muted-foreground underline-offset-2 hover:underline" href={`/data/${tableId}?rail=notifications`}>
              Open the table’s automations
            </a>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

/** The toolbar filter (Notion): anyone may filter for themselves; an editor may save it for everyone. */
/**
 * N8 — Notion's Form view: the table's own form (records-ui FormBuilder over `custom.forms` /
 * `custom.form_declare`, the same form the public link `/f/<id>` answers): pick the properties asked,
 * each question's title, description and required, conditions, then publish and share the link.
 * An answer is a row of this table. The view keeps its form; the first open makes one.
 */
function FormViewBody({ tableId, view, editable, onFormId }: { tableId: string; view: SpaceDbView; editable: boolean; onFormId: (formId: string) => void }) {
  if (!editable) return <FormToAnswer formId={view.formId ?? null} />;
  return (
    <div className="spaces-db-body spaces-db-form">
      <FormBuilder
        tableId={tableId as never}
        activeFormId={(view.formId ?? null) as never}
        startWithOne={!view.formId}
        onActiveForm={(form) => {
          if (form.id && form.id !== view.formId) onFormId(String(form.id));
        }}
      />
    </div>
  );
}

/**
 * N8 — Notion: anyone who can open the page fills in the form. The form is the forms system's public
 * form (same door and same rule as its `/f/<id>` link); an answer is a row of this table.
 */
function FormToAnswer({ formId }: { formId: string | null }) {
  const [form, setForm] = useState<PublicForm | null | undefined>(formId ? undefined : null);
  useEffect(() => {
    if (!formId) return;
    let live = true;
    void spacesFormForAnswering(formId).then(
      (got) => live && setForm(got),
      () => live && setForm(null),
    );
    return () => {
      live = false;
    };
  }, [formId]);
  if (form === undefined) return <div className="spaces-db-body spaces-db-form" aria-busy="true" />;
  if (!form) return <div className="spaces-db-note">This form is not open for answers.</div>;
  if (form.state !== "open") return <div className="spaces-db-note">{form.message || "This form is closed."}</div>;
  return (
    <div className="spaces-db-body spaces-db-form" data-testid="spaces-form-answer">
      <FormLookFrame look={null} title={form.title}>
        <PublicFormRunner form={form} />
      </FormLookFrame>
    </div>
  );
}

/** How many rules a nested question holds (the Filter icon is "on" when any is). */
function conditionCount(expr: unknown): number {
  if (!expr || typeof expr !== "object" || Array.isArray(expr)) return 0;
  const node = expr as { op?: unknown; args?: unknown };
  if ((node.op === "and" || node.op === "or" || node.op === "not") && Array.isArray(node.args)) return node.args.reduce<number>((n, a) => n + conditionCount(a), 0);
  return 1;
}

/** Notion's advanced filter depth: a group, and a group inside it. */
const ADVANCED_FILTER_DEPTH = 2;

/**
 * N7 — Notion's advanced filter: rules joined by And / Or, filter groups two levels deep, saved with
 * the view. The builder is records-ui's one condition builder; the draft applies with one press.
 */
function AdvancedFilter({ view, fields, onSave, onClose }: { view: SpaceDbView; fields: Field[]; onSave?: (where: Record<string, unknown> | null) => void; onClose: () => void }) {
  const [draft, setDraft] = useState<RuleExpression | null>((view.where ?? null) as RuleExpression | null);
  const conditionFields: ConditionField[] = fields.map((f) => ({ id: f.id, key: f.key, label: f.label || f.key, field: f }));
  const changed = JSON.stringify(draft) !== JSON.stringify(view.where ?? null);
  return (
    <div className="spaces-db-advanced" data-testid="spaces-advanced-filter">
      <ConditionGroup lead="Where" expr={draft} fields={conditionFields} onChange={setDraft} emptyLabel="every row" maxDepth={ADVANCED_FILTER_DEPTH} />
      {onSave ? (
        <div className="spaces-db-advanced-bar">
          <Button
            variant="quiet"
            onClick={() => {
              setDraft(null);
              onSave(null);
              onClose();
            }}
          >
            Delete filter
          </Button>
          <Button variant="primary" disabled={!changed} onClick={() => onSave(draft as unknown as Record<string, unknown> | null)}>
            Apply
          </Button>
        </div>
      ) : null}
    </div>
  );
}

/** A relation column: its filter can name "This page's row". */
function isRelationField(f: Field | undefined): boolean {
  return !!f && (kindOf(f) === "relation" || String(f.type) === "relation");
}

function FilterButton({
  view,
  fields,
  choice,
  onChoice,
  canSave,
  onSave,
  onSaveWhere,
}: {
  view: SpaceDbView;
  fields: Field[];
  choice: FilterChoice;
  onChoice: (next: FilterChoice) => void;
  canSave: boolean;
  onSave: (filters: NonNullable<SpaceDbView["filters"]>) => void;
  /** Save the view's advanced filter (N7); left out, the advanced filter is read-only words. */
  onSaveWhere?: (where: Record<string, unknown> | null) => void;
}) {
  const [field, setField] = useState<string | null>(null);
  const [value, setValue] = useState("");
  const [advanced, setAdvanced] = useState(false);
  const filters = shownFilters(view, choice);
  const onView = (p: { filters: NonNullable<SpaceDbView["filters"]> }) => onChoice(p.filters);
  const count = Object.keys(filters).length + conditionCount(view.where);
  const showAdvanced = advanced || (!!view.where && !!onSaveWhere);
  return (
    <Popover onOpenChange={(o) => !o && setAdvanced(false)}>
      <PopoverTrigger asChild>
        <Button variant="quiet" icon={<ListFilter size={15} strokeWidth={1.8} />} aria-label="Filter" title="Filter" data-on={count ? "true" : undefined} />
      </PopoverTrigger>
      <PopoverContent surface="solid" align="end" width={showAdvanced ? "xl" : "md"} padding={showAdvanced ? "sm" : "xs"}>
        {showAdvanced ? <AdvancedFilter view={view} fields={fields} onSave={onSaveWhere} onClose={() => setAdvanced(false)} /> : null}
        {showAdvanced ? null : Object.entries(filters).map(([k, v]) => (
          <MenuRow
            key={k}
            label={`${fields.find((f) => f.key === k)?.label ?? k} is ${v === THIS_ROW ? THIS_ROW_LABEL : String(v)}`}
            end={<X size={14} />}
            onClick={() => {
              const { [k]: _gone, ...rest } = filters;
              onView({ filters: rest });
            }}
          />
        ))}
        {showAdvanced ? null : (
          field && choicesOfField(fields.find((f) => f.key === field)).length ? (
            <div className="flex flex-col p-1">
              <span className="px-1 pb-1 type-secondary text-muted-foreground">{fields.find((f) => f.key === field)?.label} is</span>
              {choicesOfField(fields.find((f) => f.key === field)).map((c) => (
                <MenuRow
                  key={c.value}
                  label={c.value}
                  icon={<span className="spaces-db-choice-dot" data-color={c.color ?? "gray"} />}
                  onClick={() => {
                    onView({ filters: { ...filters, [field]: c.value } });
                    setField(null);
                  }}
                />
              ))}
            </div>
          ) : field ? (
            <div className="flex flex-col gap-2 p-1">
              <span className="type-secondary text-muted-foreground">{fields.find((f) => f.key === field)?.label} is</span>
              {isRelationField(fields.find((f) => f.key === field)) ? (
                <MenuRow
                  label={THIS_ROW_LABEL}
                  icon={<FileText size={15} />}
                  onClick={() => {
                    onView({ filters: { ...filters, [field]: THIS_ROW } });
                    setField(null);
                  }}
                />
              ) : null}
              <Input
                autoFocus
                value={value}
                aria-label="Filter value"
                onChange={(e) => setValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && value.trim()) {
                    onView({ filters: { ...filters, [field]: value.trim() } });
                    setField(null);
                    setValue("");
                  }
                }}
              />
            </div>
          ) : (
            <>
              <FieldList fields={fields} onPick={setField} />
              {onSaveWhere ? <MenuRow icon={<Plus size={15} />} label="Add advanced filter" onClick={() => setAdvanced(true)} /> : null}
            </>
          )
        )}
        {filtersDiffer(view, choice) ? (
          <ViewerSaveBar
            canSave={canSave}
            onReset={() => onChoice(undefined)}
            onSave={() => {
              onSave(filters);
              onChoice(undefined);
            }}
          />
        ) : null}
      </PopoverContent>
    </Popover>
  );
}


const CHART_TYPES: Array<{ id: ChartSettings["type"]; label: string; icon: typeof PieChart }> = [
  { id: "bar", label: "Vertical bar", icon: ChartNoAxesColumn },
  { id: "hbar", label: "Horizontal bar", icon: BarChart3 },
  { id: "line", label: "Line", icon: GanttChart },
  { id: "donut", label: "Donut", icon: PieChart },
];
const OPS: Array<{ id: ChartSettings["op"]; label: string }> = [
  { id: "count", label: "Count" },
  { id: "sum", label: "Sum" },
  { id: "avg", label: "Average" },
  { id: "min", label: "Min" },
  { id: "max", label: "Max" },
];

function ViewSettings({
  tableId,
  sample,
  view,
  fields,
  props,
  onView,
  onBlock,
  editable,
  compact,
}: {
  tableId: string;
  sample: boolean;
  view: SpaceDbView;
  fields: Field[];
  props: DatabaseBlockProps;
  onView: (p: Partial<SpaceDbView>) => void;
  onBlock: (p: Partial<DatabaseBlockProps>) => void;
  editable: boolean;
  compact?: boolean;
}) {
  // N5 — Notion's property editor: the table's own column panel (records-ui FieldEditor: name, type,
  // choices and their colors, relation, number format, default, look) for one property or a new one.
  const [editing, setEditing] = useState<Field | "new" | null>(null);
  const canShape = editable && !sample;
  const designer = useDatabaseDesigner();
  const client = useRecordsClient();
  const table = useTable(tableId);
  const tableOrg = (table.data as { organization_id?: string } | null)?.organization_id ?? null;
  const tableName = (table.data as { name?: string } | null)?.name ?? null;
  const [page, setPage] = useState<"main" | "layout" | "group" | "subgroup" | "limit" | "cardsize" | "x" | "yfield" | "props" | "newprop">("main");
  const chart = { ...DEFAULT_CHART, ...view.chart };
  const setChart = (p: Partial<ChartSettings>) => onView({ chart: { ...chart, ...p } });
  const label = (key?: string | null) => (key ? (fields.find((f) => f.key === key)?.label ?? key) : "None");
  return (
    <>
    <Dialog open={editing !== null} onOpenChange={(o) => (o ? null : setEditing(null))}>
      <DialogContent size="lg" className="overflow-auto">
        <DialogTitle>{editing === "new" ? "New property" : editing ? `Edit ${editing.label}` : "Property"}</DialogTitle>
        {editing !== null ? (
          <FieldEditor
            tableId={tableId}
            field={editing === "new" ? undefined : editing}
            onSaved={() => setEditing(null)}
            onCancel={() => setEditing(null)}
            onRemoved={() => setEditing(null)}
          />
        ) : null}
      </DialogContent>
    </Dialog>
    <Popover onOpenChange={(o) => (o ? setPage("main") : null)}>
      <PopoverTrigger asChild>
        <button type="button" className={compact ? "spaces-db-icon spaces-db-icon-sm" : "spaces-db-icon"} aria-label="View settings" title="View settings">
          <SlidersHorizontal size={compact ? 13 : 15} strokeWidth={1.8} />
        </button>
      </PopoverTrigger>
      <PopoverContent surface="solid" align="end" width="md" padding="xs">
        {page === "main" ? (
          <>
            <div className="px-2 py-1 type-secondary text-muted-foreground">View options</div>
            {editable ? (
              // Notion's view name (a chart tile's title is its view's name).
              <div className="px-2 pb-1">
                <Input key={view.id} defaultValue={view.name} aria-label="View name" onBlur={(e) => e.target.value.trim() && e.target.value.trim() !== view.name && onView({ name: e.target.value.trim() })} onKeyDown={(e) => e.key === "Enter" && (e.currentTarget as HTMLInputElement).blur()} />
              </div>
            ) : null}
            <MenuRow icon={<Table2 size={15} />} label="Layout" end={<span className="type-secondary text-muted-foreground">{LAYOUTS.find((l) => l.id === view.layout)?.label}</span>} onClick={() => editable && setPage("layout")} />
            <MenuRow icon={<List size={15} />} label="Properties" end={<span className="text-xs text-muted-foreground">{fields.length - effectiveHidden(view, fields).filter((k) => fields.some((f) => f.key === k)).length} shown</span>} onClick={() => setPage("props")} />
            {view.layout === "kanban" ? <MenuRow icon={<Kanban size={15} />} label="Group" end={<span className="type-secondary text-muted-foreground">{label(view.groupField)}</span>} onClick={() => editable && setPage("group")} /> : null}
            {view.layout === "kanban" ? <MenuRow icon={<Kanban size={15} />} label="Sub-group" end={<span className="type-secondary text-muted-foreground">{label(view.subGroupField)}</span>} onClick={() => editable && setPage("subgroup")} /> : null}
            {view.layout === "kanban" || view.layout === "gallery" ? <MenuRow icon={<Square size={15} />} label="Card size" end={<span className="type-secondary text-muted-foreground">{CARD_SIZE_WORDS[view.cardSize ?? "medium"]}</span>} onClick={() => editable && setPage("cardsize")} /> : null}
            {view.layout !== "chart" && (view.layout as string) !== "form" ? <MenuRow icon={<List size={15} />} label="Load limit" end={<span className="type-secondary text-muted-foreground">{blockPageSize(view) ? `${blockPageSize(view)} rows` : "Default"}</span>} onClick={() => editable && setPage("limit")} /> : null}
            {view.layout === "chart" ? (
              <>
                <div className="px-2 pt-2 pb-1 type-secondary text-muted-foreground">Chart type</div>
                <div className="grid grid-cols-4 gap-1 px-1">
                  {CHART_TYPES.map((t) => (
                    <button key={t.id} type="button" className="spaces-db-charttype" data-active={chart.type === t.id ? "true" : undefined} title={t.label} aria-label={t.label} disabled={!editable} onClick={() => setChart({ type: t.id })}>
                      <t.icon size={16} />
                    </button>
                  ))}
                </div>
                <MenuRow label={chart.type === "donut" ? "Show each" : "X axis"} end={<span className="type-secondary text-muted-foreground">{label(chart.groupBy)}</span>} onClick={() => editable && setPage("x")} />
                <div className="px-2 pt-2 pb-1 type-secondary text-muted-foreground">{chart.type === "donut" ? "Value" : "Y axis"}</div>
                <div className="flex flex-wrap gap-1 px-1 pb-1">
                  {OPS.map((o) => (
                    <Button variant="quiet" key={o.id} data-active={chart.op === o.id ? "true" : undefined} disabled={!editable} onClick={() => (o.id === "count" ? setChart({ op: "count", field: null }) : (setChart({ op: o.id }), setPage("yfield")))}>
                      {o.label}
                    </Button>
                  ))}
                </div>
                {chart.op !== "count" ? <MenuRow label="Of" end={<span className="type-secondary text-muted-foreground">{label(chart.field)}</span>} onClick={() => editable && setPage("yfield")} /> : null}
                <MenuRow label="Sort" end={<span className="type-secondary text-muted-foreground">{chart.sort === "asc" ? "Ascending" : chart.sort === "desc" ? "Descending" : "Manual"}</span>} onClick={() => editable && setChart({ sort: chart.sort === "asc" ? "desc" : chart.sort === "desc" ? "manual" : "asc" })} />
                {chart.type === "donut" ? <MenuRow label="Value in center" end={<Switch checked={chart.centerValue !== false} tabIndex={-1} aria-hidden />} onClick={() => editable && setChart({ centerValue: chart.centerValue === false })} /> : null}
                <MenuRow label="Legend" end={<Switch checked={chart.legend !== false} tabIndex={-1} aria-hidden />} onClick={() => editable && setChart({ legend: chart.legend === false })} />
                <MenuRow label="Data labels" end={<Switch checked={Boolean(chart.dataLabels)} tabIndex={-1} aria-hidden />} onClick={() => editable && setChart({ dataLabels: !chart.dataLabels })} />
              </>
            ) : null}
            {view.layout !== "chart" ? (
              <>
                <div className="px-2 pt-2 pb-1 type-secondary text-muted-foreground">Open pages in</div>
                {([
                  ["side", "Side peek", PanelRight],
                  ["center", "Center peek", Square],
                  ["page", "Full page", Maximize2],
                ] as const).map(([id, text, Icon]) => (
                  <MenuRow key={id} icon={<Icon size={15} />} label={text} active={(props.openAs ?? "side") === id} onClick={() => editable && onBlock({ openAs: id })} />
                ))}
                <MenuRow icon={<Database size={15} />} label="Show database title" end={<Switch checked={props.showTitle !== false} tabIndex={-1} aria-hidden />} onClick={() => editable && onBlock({ showTitle: props.showTitle === false })} />
                {canShape ? (
                  <AutofillRows tableId={tableId} databaseName={props.title ?? "Database"} fields={fields} aiFields={props.aiFields ?? []} client={client} organizationId={(table.data as { organization_id?: string } | null)?.organization_id ?? null} onAiFields={(aiFields) => onBlock({ aiFields })} />
                ) : null}
                {canShape && tableOrg ? (
                  // The one roof (2026-10-22): the ONE Applet builder, seeded with this table — the Applet reads and
                  // writes these same records. A new tab, so the page stays as it is.
                  <MenuRow
                    icon={<AppWindow size={15} />}
                    label="Build an Applet on this"
                    onClick={() => openOutbound(buildSeedHref([tableReference({ tableId, organizationId: tableOrg, label: tableName || props.title || "Database" })]), "_blank", "noopener")}
                  />
                ) : null}
                {canShape && designer.wired ? (
                  <MenuRow
                    icon={<AGENT_ICON size={15} />}
                    label="Redesign with AI"
                    onClick={() =>
                      void designer
                        .redesign({ spaceId: null, title: "", markdown: "", tableId, client, existingLabels: fields.map((f) => f.label), currentDesign: designMarkdown(props.title ?? "Database", fields, props.views ?? [view], []) })
                        .then((made) => made && onBlock({ views: made.views, activeViewId: made.views[0]?.id }))
                    }
                  />
                ) : null}
              </>
            ) : null}
          </>
        ) : null}
        {page === "layout"
          ? LAYOUTS.map((l) => (
              <MenuRow
                key={l.id}
                icon={<l.icon size={15} />}
                label={l.label}
                active={view.layout === l.id}
                onClick={() => {
                  onView({ layout: l.id as SpaceViewLayout, name: view.name === LAYOUTS.find((x) => x.id === view.layout)?.label ? l.label : view.name });
                  setPage("main");
                }}
              />
            ))
          : null}
        {page === "props" ? (
          <>
            {fields.map((f) => {
              const hiddenNow = effectiveHidden(view, fields);
              const hidden = hiddenNow.includes(f.key);
              return (
                <div key={f.key} className="flex items-center">
                  <MenuRow
                    label={f.label}
                    end={<Switch checked={!hidden} tabIndex={-1} aria-hidden />}
                    onClick={() => editable && onView({ hiddenFields: hidden ? hiddenNow.filter((k) => k !== f.key) : [...hiddenNow, f.key] })}
                  />
                  {canShape ? <Button variant="quiet" icon={<Pencil size={14} />} aria-label={`Edit property ${f.label}`} title="Edit property" onClick={() => setEditing(f)} /> : null}
                </div>
              );
            })}
            {canShape ? <MenuRow icon={<Plus size={15} />} label="New property" onClick={() => setPage("newprop")} /> : null}
          </>
        ) : null}
        {page === "newprop" ? <NewPropertyPanel tableId={tableId} takenKeys={fields.map((f) => f.key)} onDone={() => setPage("props")} /> : null}
        {page === "group" ? <FieldList fields={fields} value={view.groupField} onPick={(k) => (onView({ groupField: k }), setPage("main"))} /> : null}
        {page === "subgroup" ? (
          <>
            <MenuRow label="None" active={!view.subGroupField} onClick={() => (onView({ subGroupField: null }), setPage("main"))} />
            <FieldList fields={fields.filter((f) => f.key !== view.groupField)} value={view.subGroupField} onPick={(k) => (onView({ subGroupField: k }), setPage("main"))} />
          </>
        ) : null}
        {page === "cardsize"
          ? CARD_SIZES.map((s) => <MenuRow key={s} label={CARD_SIZE_WORDS[s]} active={(view.cardSize ?? "medium") === s} onClick={() => (onView({ cardSize: s }), setPage("main"))} />)
          : null}
        {page === "limit"
          ? LOAD_LIMITS.map((n) => <MenuRow key={n} label={`${n} rows`} active={blockPageSize(view) === n} onClick={() => (onView({ loadLimit: n }), setPage("main"))} />)
          : null}
        {page === "x" ? <FieldList fields={fields} value={chart.groupBy} onPick={(k) => (setChart({ groupBy: k }), setPage("main"))} /> : null}
        {page === "yfield" ? (
          <FieldList fields={fields} value={chart.field} filter={(f) => ["number", "currency", "percent", "rating", "integer"].includes(kindOf(f))} onPick={(k) => (setChart({ field: k }), setPage("main"))} />
        ) : null}
      </PopoverContent>
    </Popover>
    </>
  );
}

function RecordOpen({ tableId, recordId, as, fresh, editable, onClose }: { tableId: string; recordId: string; as: "side" | "center" | "page"; fresh: boolean; editable: boolean; onClose: () => void }) {
  if (as === "side") {
    return (
      <SidePeek onClose={onClose} focusFirstField={fresh}>
        <Peek tableId={tableId} recordId={recordId} onClose={onClose} />
        <RowPageUnderPeek tableId={tableId} recordId={recordId} editable={editable} />
      </SidePeek>
    );
  }
  return (
    <Dialog open onOpenChange={(o) => (o ? null : onClose())}>
      <DialogContent size={as === "page" ? "screen" : "xl"} className="overflow-auto">
        <DialogTitle className="sr-only">Record</DialogTitle>
        <Peek tableId={tableId} recordId={recordId} onClose={onClose} onPage={as === "page"} />
        <RowPageUnderPeek tableId={tableId} recordId={recordId} editable={editable} />
      </DialogContent>
    </Dialog>
  );
}

/**
 * The row's PAGE under its fields in every peek (Notion: a database page opened as a side / center / full page
 * shows its properties, then its body). records-ui's `Peek` draws the fields only, so the body is drawn here by
 * the one row-page component (embed/RecordBodySpace.tsx) — the New menu's template body shows on open.
 */
function RowPageUnderPeek({ tableId, recordId, editable }: { tableId: string; recordId: string; editable: boolean }) {
  const record = useRecord(recordId as never, true, { tableId: tableId as never });
  const table = useTable(tableId);
  const organizationId = (table.data as { organization_id?: string } | null)?.organization_id ?? null;
  if (!record.data) return null;
  return (
    <div className="spaces-peek-page">
      <RecordBodySpace tableId={tableId} recordId={recordId} record={record.data} readOnly={!editable} organizationId={organizationId} />
    </div>
  );
}
