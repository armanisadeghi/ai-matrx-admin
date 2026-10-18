"use client";

import type { ContextField } from "@ai-matrx/records/scopes";
import { UntrustedCount } from "@ai-matrx/design-system";
import { selectTreeError } from "@/features/scopes/redux/selectors/tree";
import { toastWriteFailure } from "@/lib/errors/toastWriteFailure";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowUpDown,
  ArrowUpRight,
  Building2,
  ChevronDown,
  ChevronUp,
  Layers,
  Boxes,
  ListChecks,
  Loader2,
  PanelsTopLeft,
  Pencil,
  Plus,
  Settings2,
  Tag as TagIcon,
  Trash2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  MatrxDataTable,
  type MatrxColumnDef,
} from "@ai-matrx/design-system/data-table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from "@/lib/toast";
import { confirm } from "@/components/dialogs/confirm/ConfirmDialogHost";
import { EditScopeTypeSheet } from "@/features/scopes/components/management/EditScopeTypeSheet";
import { NewScopeInline } from "@/features/scopes/components/management/NewScopeInline";
import { ContextItemAddForm } from "./ContextItemAddForm";
import { ScopeGlyph } from "@/features/scopes/components/ScopeGlyph";
import { ScopeNotFound } from "./ScopeNotFound";
import { ReorderDialog } from "@/features/scopes/components/management/ReorderDialog";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import { selectUserId } from "@/lib/redux/selectors/userSelectors";
import {
  listScopeTypeItems,
  updateContextItem,
  deleteContextItem,
  selectItemsByType,
  selectItemsErrorForType,
  selectItemsLoadedForType,
} from "@/features/scopes/redux/contextItemCatalog";
import { ReadFailure } from "@ai-matrx/design-system";
import { StaleDataNotice } from "@ai-matrx/design-system";
import type { ContextValue } from "@ai-matrx/records/scopes";
import { summarizeContextCell } from "@/features/scopes/utils/referenceCell";
import { ensureContextValuesForScopes } from "@/features/scopes/redux/thunks/ensureContextValues";
import {
  resolveColor,
  SCOPE_ICON_SURFACE,
} from "@/features/scopes/constants/scope-colors";
import {
  orgScopesHref,
  scopeHref,
  scopeSeg,
  contextItemsHref,
  contextItemHref,
} from "@/features/scopes/lib/scopeRoutes";
import { useOpenContextItemsWindow } from "@/features/overlays/definitions/contextItemsWindow.overlay";
import { useScopeSuggestions } from "@/features/kg-suggestions/hooks/useScopeSuggestions";
import { KgSuggestionHint } from "@/features/kg-suggestions/components/KgSuggestionHint";
import { AssociationCardGrid } from "@ai-matrx/associations/react";
import { PrimaryEntityProvider } from "@ai-matrx/associations/react";
import type {
  KgAcceptResult,
  KgDecisionResponse,
  KgSuggestionRow,
} from "@/features/kg-suggestions/types";
import {
  selectScopeTypeBySlugOrId,
  selectScopeTypesLoadedForOrg,
  selectScopesByType,
} from "@/features/scopes/redux/selectors/admin";
import { ensureScopeTree } from "@/features/scopes/redux/thunks/ensureScopeTree";
import {
  deleteScope,
  updateScope,
} from "@/features/scopes/redux/thunks/scopeTreeMutations";
import { unwrapRecords } from "@ai-matrx/records";

type ScopeRow = ReturnType<typeof selectScopesByType>[number];

interface ScopesListProps {
  orgId: string;
  orgSlugOrId: string;
  typeId: string;
  orgName: string;
  orgSlug: string;
  /** Owner/admin: may edit the scope type (structure) and its fields; the type's creator may too. */
  canManage: boolean;
}

export function ScopesList({
  orgId,
  orgSlugOrId,
  typeId,
  orgName,
  orgSlug,
  canManage,
}: ScopesListProps) {
  const router = useRouter();
  const dispatch = useAppDispatch();
  // `typeId` is the route segment — a UUID or a kebab slug. Resolve to the row.
  const scopeType = useAppSelector((s) =>
    selectScopeTypeBySlugOrId(s, orgId, typeId),
  );
  const typesLoaded = useAppSelector((s) =>
    selectScopeTypesLoadedForOrg(s, orgId),
  );
  const resolvedTypeId = scopeType?.id;
  // Structure is the org admins' and the type's creator's (custom.context_type_write).
  const userId = useAppSelector(selectUserId);
  const canShape =
    canManage ||
    (!!userId && !!scopeType?.created_by && scopeType.created_by === userId);
  const scopes = useAppSelector((s) =>
    selectScopesByType(s, resolvedTypeId ?? ""),
  );
  const items = useAppSelector((s) =>
    selectItemsByType(s, resolvedTypeId ?? ""),
  );
  const itemsLoaded = useAppSelector((s) =>
    selectItemsLoadedForType(s, resolvedTypeId ?? ""),
  );
  const itemsError = useAppSelector((s) =>
    resolvedTypeId ? selectItemsErrorForType(s, resolvedTypeId) : null,
  );
  const treeError = useAppSelector(selectTreeError);
  /** Every scope's values entry, keyed by scope id (the slice's own map — one read for all rows). */
  const valuesByScope = useAppSelector((s) => s.contextValues.byScope);
  /** The type's context-items read — its counts say "—" when it failed. */
  const itemsRead = {
    status: itemsError ? ("error" as const) : itemsLoaded ? ("ready" as const) : ("loading" as const),
    error: itemsError,
  };
  const suggestions = useScopeSuggestions();
  const openContextItemsWindow = useOpenContextItemsWindow();

  const [adding, setAdding] = useState(false);
  const [editingType, setEditingType] = useState(false);
  const [addingItem, setAddingItem] = useState(false);
  const [movingId, setMovingId] = useState<string | null>(null);
  const [deletingScopeId, setDeletingScopeId] = useState<string | null>(null);
  const [deletingItemId, setDeletingItemId] = useState<string | null>(null);
  const [reorderScopesOpen, setReorderScopesOpen] = useState(false);
  const [reorderItemsOpen, setReorderItemsOpen] = useState(false);
  const addItemTriggerRef = useRef<HTMLButtonElement>(null);
  const wasAddingItemRef = useRef(false);

  useEffect(() => {
    if (!addingItem && wasAddingItemRef.current) {
      requestAnimationFrame(() => addItemTriggerRef.current?.focus());
    }
    wasAddingItemRef.current = addingItem;
  }, [addingItem]);

  useEffect(() => {
    if (!resolvedTypeId) return;
    dispatch(ensureScopeTree());
    dispatch(listScopeTypeItems(resolvedTypeId));
  }, [dispatch, orgId, resolvedTypeId]);

  useEffect(() => {
    // Every scope's values in ONE read first (STORE-READ-PERF-5), so each scope's view below reads
    // the values store instead of asking the values door once per scope.
    if (scopes.length > 0) void dispatch(ensureContextValuesForScopes(scopes.map((scope) => scope.id)));
  }, [dispatch, scopes]);

  const sorted = useMemo(
    () =>
      [...scopes].sort(
        (a, b) =>
          (a.sort_order ?? 0) - (b.sort_order ?? 0) ||
          a.name.localeCompare(b.name),
      ),
    [scopes],
  );

  async function moveItem(index: number, dir: "up" | "down") {
    const target = items[index];
    const neighbor = items[index + (dir === "up" ? -1 : 1)];
    if (!target || !neighbor || movingId) return;
    const targetOrder = target.sort;
    const neighborOrder = neighbor.sort;
    setMovingId(target.id);
    try {
      await Promise.all([
        dispatch(
          updateContextItem({ id: target.id, sort: neighborOrder }),
        ).unwrap(),
        dispatch(
          updateContextItem({ id: neighbor.id, sort: targetOrder }),
        ).unwrap(),
      ]);
    } catch (err) {
      toastWriteFailure(err, { action: "save the new order" });
    } finally {
      setMovingId(null);
    }
  }

  async function saveScopeOrder(orderedIds: string[]) {
    await Promise.all(
      orderedIds.map((id, i) =>
        dispatch(updateScope({ scope_id: id, sort_order: i + 1 })).then(unwrapRecords),
      ),
    );
    toast.success("Order saved");
  }

  async function saveItemOrder(orderedIds: string[]) {
    await Promise.all(
      orderedIds.map((id, i) =>
        dispatch(updateContextItem({ id, sort: i })).unwrap(),
      ),
    );
    toast.success("Order saved");
  }

  async function handleDeleteScope(id: string, name: string) {
    const singular = scopeType?.label_singular.toLowerCase() ?? "scope";
    if (
      !(await confirm({
        title: `Delete ${name}?`,
        description: `This archives this ${singular} and its child scopes. Stored context values are retained for recovery.`,
        confirmLabel: "Delete",
        variant: "destructive",
      }))
    )
      return;
    setDeletingScopeId(id);
    try {
      await dispatch(deleteScope({ scope_id: id })).then(unwrapRecords);
      toast.success(`${name} deleted`);
    } catch (err) {
      toastWriteFailure(err, { action: "archive it" });
    } finally {
      setDeletingScopeId(null);
    }
  }

  async function handleDeleteItem(id: string, name: string) {
    if (
      !(await confirm({
        title: `Delete "${name}"?`,
        description:
          "This removes the context item from every scope of this type. Existing values are retained but hidden.",
        confirmLabel: "Delete",
        variant: "destructive",
      }))
    )
      return;
    setDeletingItemId(id);
    try {
      await dispatch(deleteContextItem(id)).unwrap();
      toast.success(`"${name}" deleted`);
    } catch (err) {
      toastWriteFailure(err, { action: "archive it" });
    } finally {
      setDeletingItemId(null);
    }
  }

  if (!scopeType) {
    return typesLoaded ? (
      <ScopeNotFound
        token="scope_type"
        param={typeId}
        entityLabel="scope type"
        backHref={orgScopesHref(orgSlugOrId)}
        backLabel="Back to scopes"
      />
    ) : (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const color = resolveColor(scopeType);
  const scopeCount = sorted.length;
  const typeSuggestions = sorted.flatMap((s) => suggestions.forScope(s.id));

  // THE ONE MAP of every row's lazy values: the page asks the values door ONCE for every scope
  // (`ensureContextValuesForScopes` above); a cell reads its value here and draws a skeleton
  // (`loading`) until its scope's read has answered.
  const valuesOf = (scopeId: string): Record<string, ContextValue> | null => {
    const entry = valuesByScope[scopeId];
    return entry && (entry.status === "ready" || entry.status === "error")
      ? entry.values
      : null;
  };
  const displayOf = (scopeId: string, itemId: string): string | null => {
    const value = valuesOf(scopeId)?.[itemId];
    return value ? renderValue(value) || null : null;
  };

  const scopeColumns: MatrxColumnDef<ScopeRow>[] = [
    {
      id: "name",
      header: "Name",
      label: "Name",
      accessorKey: "name",
      frozen: true,
      width: 200,
      cell: (scope) => {
        const scopeSuggestions = suggestions.forScope(scope.id);
        return (
          <span className="flex items-center gap-1.5 w-full min-w-0">
            <Link
              href={scopeHref(orgSlugOrId, scopeType, scope)}
              onClick={(event) => event.stopPropagation()}
              className="truncate font-medium rounded-sm hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {scope.name}
            </Link>
            {scopeSuggestions.length > 0 && (
              <span onClick={(e) => e.stopPropagation()} className="shrink-0">
                <KgSuggestionHint
                  variant="badge"
                  rows={scopeSuggestions}
                  accept={suggestions.accept}
                  reject={suggestions.reject}
                  defer={suggestions.defer}
                  label={scope.name}
                  align="start"
                />
              </span>
            )}
          </span>
        );
      },
    },
    ...items.map(
      (item): MatrxColumnDef<ScopeRow> => ({
        id: item.id,
        header: item.label,
        label: item.label,
        width: 200,
        accessorFn: (scope) => displayOf(scope.id, item.id),
        loading: (scope) => valuesOf(scope.id) === null,
        cell: (scope) => (
          <ContextValueCell
            display={displayOf(scope.id, item.id)}
            suggestionRows={suggestions.byScopeItem.get(`${scope.id}:${item.id}`) ?? []}
            accept={suggestions.accept}
            reject={suggestions.reject}
            defer={suggestions.defer}
          />
        ),
      }),
    ),
  ];

  return (
    <div className="space-y-6">
      {/* ── Identity header: "<ORG> / <Type plural>" ─────────────── */}
      <Card className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4 min-w-0">
            <div
              className={`w-16 h-16 rounded-2xl ${SCOPE_ICON_SURFACE} ${color.fg} ring-1 ${color.ring} flex items-center justify-center shrink-0`}
            >
              <ScopeGlyph icon={scopeType.icon} className="h-9 w-9" />
            </div>
            <div className="min-w-0">
              <Link
                href={orgScopesHref(orgSlug)}
                className="inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground hover:text-foreground transition-colors"
              >
                <Building2 className="h-3.5 w-3.5" />
                {orgName}
              </Link>
              <h1 className="text-3xl font-bold text-foreground leading-tight">
                {scopeType.label_plural}
              </h1>
              {scopeType.description && (
                <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
                  {scopeType.description}
                </p>
              )}
            </div>
          </div>
          {canShape && (
            <div className="flex items-center gap-2 shrink-0">
              <Button
                icon={<Settings2 />}
                variant="quiet"
                onClick={() => setEditingType(true)}
                title="Quick edit"
                aria-label={`Quick edit ${scopeType.label_singular} settings`}
              />
            </div>
          )}
        </div>

        {/* Counts — full width, left-aligned, below the logo/title */}
        <div className="mt-5 pt-4 border-t border-border flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
          <span className="inline-flex items-center gap-1.5">
            <Layers className="h-4 w-4 text-muted-foreground" />
            <UntrustedCount className="font-semibold text-foreground" value={scopeCount} trustworthy={!treeError} label={scopeType.label_plural} />
            <span className="text-muted-foreground">
              {scopeCount === 1
                ? scopeType.label_singular.toLowerCase()
                : scopeType.label_plural.toLowerCase()}
            </span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <ListChecks className="h-4 w-4 text-muted-foreground" />
            <UntrustedCount className="font-semibold text-foreground" value={items.length} read={itemsRead} label="Context items" />
            <span className="text-muted-foreground">
              {items.length === 1 ? "context item" : "context items"}
            </span>
          </span>
        </div>
      </Card>

      <EditScopeTypeSheet
        open={editingType}
        onOpenChange={setEditingType}
        orgId={orgId}
        typeId={scopeType.id}
        onDeleted={() => router.push(orgScopesHref(orgSlugOrId))}
      />

      {/* ── Individual scopes (tabular) ──────────────────────────── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-foreground">
            {scopeType.label_plural}
            {scopeCount > 0 && (
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                (<UntrustedCount value={scopeCount} trustworthy={!treeError} label={scopeType.label_plural} />)
              </span>
            )}
          </h2>
          <div className="flex items-center gap-2">
            {/* Scopes are data: every member orders, adds and archives them. */}
            {scopeCount > 1 && (
              <Button
                icon={<ArrowUpDown />}
                variant="outline"
                onClick={() => setReorderScopesOpen(true)}
              >
                Edit order
              </Button>
            )}
            <Button icon={<Plus />} variant="primary" onClick={() => setAdding(true)} disabled={adding}>
              New {scopeType.label_singular}
            </Button>
          </div>
        </div>

        {typeSuggestions.length > 0 && (
          <KgSuggestionHint
            variant="banner"
            rows={typeSuggestions}
            accept={suggestions.accept}
            reject={suggestions.reject}
            defer={suggestions.defer}
            label={scopeType.label_plural.toLowerCase()}
            align="start"
          />
        )}

        {adding && (
          <NewScopeInline
            orgId={orgId}
            typeId={scopeType.id}
            labelSingular={scopeType.label_singular}
            labelPlural={scopeType.label_plural}
            orgSlugOrId={orgSlugOrId}
            typeSlugOrId={scopeSeg(scopeType)}
            onCancel={() => setAdding(false)}
            onCreated={(scopeId) => {
              setAdding(false);
              router.push(scopeHref(orgSlugOrId, scopeType, { id: scopeId }));
            }}
          />
        )}

        {scopeCount === 0 && !adding ? (
          <Card className="p-10 text-center">
            <div
              className={`w-14 h-14 rounded-full ${SCOPE_ICON_SURFACE} ${color.fg} ring-1 ${color.ring} flex items-center justify-center mx-auto mb-3`}
            >
              <ScopeGlyph icon={scopeType.icon} className="h-7 w-7" />
            </div>
            <h3 className="font-semibold text-foreground mb-1">
              No {scopeType.label_plural.toLowerCase()} yet
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              Add your first {scopeType.label_singular.toLowerCase()} to get
              started.
            </p>
            <Button icon={<Plus />} variant="primary" onClick={() => setAdding(true)}>
              Add {scopeType.label_singular}
            </Button>
          </Card>
        ) : scopeCount > 0 ? (
          <>
            <MatrxDataTable<ScopeRow>
              tableId={`scopes/type/${scopeType.id}`}
              data={sorted}
              columns={scopeColumns}
              getRowId={(scope) => scope.id}
              viewTabs={false}
              getRowHref={(scope) => scopeHref(orgSlugOrId, scopeType, scope)}
              rowClick="page"
              rowVersion={(scope) => [
                valuesByScope[scope.id],
                deletingScopeId === scope.id,
                ...suggestions.forScope(scope.id),
              ]}
              rowActions={(scope) => [
                {
                  id: "delete",
                  icon: Trash2,
                  label: `Delete ${scope.name}`,
                  tooltip: "Delete",
                  tone: "destructive",
                  loading: deletingScopeId === scope.id,
                  disabled: deletingScopeId === scope.id,
                  onClick: (event) => {
                    event.stopPropagation();
                    void handleDeleteScope(scope.id, scope.name);
                  },
                },
              ]}
              mobileCardsBreakpoint="sm"
              mobileCards={(scope, _index, controls) => (
                <div className="space-y-1 px-3 py-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0 flex-1">{controls.renderCell("name")}</div>
                    {controls.actions}
                  </div>
                  {items.map((item) => (
                    <div key={item.id} className="flex items-center gap-2 min-w-0">
                      <span className="shrink-0 type-meta text-muted-foreground">
                        {item.label}
                      </span>
                      <div className="min-w-0 flex-1">{controls.renderCell(item.id)}</div>
                    </div>
                  ))}
                </div>
              )}
            />
            {!adding && (
              <Button
                icon={<Plus />}
                variant="quiet"
                onClick={() => setAdding(true)}
              >
                Add {scopeType.label_singular.toLowerCase()}
              </Button>
            )}
          </>
        ) : null}
      </div>

      {/* ── Context Items (definitions) ──────────────────────────── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Link
            href={contextItemsHref(orgSlugOrId, scopeType)}
            className="group inline-flex items-center gap-1.5 text-base font-semibold text-foreground hover:text-primary"
          >
            Context Items
            {items.length > 0 && (
              <span className="text-sm font-normal text-muted-foreground">
                (<UntrustedCount value={items.length} read={itemsRead} label="Context items" />)
              </span>
            )}
            <ArrowUpRight className="h-4 w-4 text-muted-foreground group-hover:text-primary" />
          </Link>
          <div className="flex items-center gap-2">
            <Button asChild variant="quiet">
              <Link href={contextItemsHref(orgSlugOrId, scopeType)}>
                Open page
              </Link>
            </Button>
            {canShape && resolvedTypeId && (
              <Button
                icon={<PanelsTopLeft />}
                variant="outline"
                onClick={() =>
                  openContextItemsWindow({ scopeTypeId: resolvedTypeId })
                }
              >
                Manage in panel
              </Button>
            )}
            {canShape && items.length > 1 && (
              <Button
                icon={<ArrowUpDown />}
                variant="outline"
                onClick={() => setReorderItemsOpen(true)}
              >
                Edit order
              </Button>
            )}
            {canShape && !addingItem && (
              <Button
                icon={<Plus />}
                ref={addItemTriggerRef}
                variant="outline"
                onClick={() => setAddingItem(true)}
              >
                Add context item
              </Button>
            )}
          </div>
        </div>

        {itemsError && items.length > 0 ? (
          <StaleDataNotice
            hasData
            what={`the ${scopeType.label_plural.toLowerCase()} context items`}
            onRetry={() => {
              if (resolvedTypeId) void dispatch(listScopeTypeItems(resolvedTypeId));
            }}
            detail={itemsError}
          />
        ) : null}
        {itemsError && items.length === 0 ? (
          <ReadFailure
            error={itemsError}
            what={`the ${scopeType.label_plural.toLowerCase()} context items`}
            onRetry={() => {
              if (resolvedTypeId) void dispatch(listScopeTypeItems(resolvedTypeId));
            }}
          />
        ) : !itemsLoaded ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <Card className="overflow-hidden">
            <div className="divide-y divide-border">
              {items.map((item, index) => (
                <ContextField
                  key={item.id}
                  item={item}
                  href={contextItemHref(orgSlugOrId, scopeType, item)}
                  isFirst={index === 0}
                  isLast={index === items.length - 1}
                  moving={movingId === item.id}
                  disabled={movingId !== null}
                  canManage={canShape}
                  onEdit={() =>
                    openContextItemsWindow({
                      scopeTypeId: item.scope_type_id,
                      initialItemId: item.id,
                    })
                  }
                  onMoveUp={() => moveItem(index, "up")}
                  onMoveDown={() => moveItem(index, "down")}
                  deleting={deletingItemId === item.id}
                  onDelete={() => handleDeleteItem(item.id, item.label)}
                />
              ))}

              {items.length === 0 && !addingItem && (
                <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                  No context items yet
                  {canShape
                    ? ` — add one to define what data to track for each ${scopeType.label_singular.toLowerCase()}.`
                    : "."}
                </div>
              )}

              {addingItem && (
                <div className="p-4 bg-muted/20">
                  <ContextItemAddForm
                    scopeTypeId={scopeType.id}
                    labelPlural={scopeType.label_plural}
                    onClose={() => setAddingItem(false)}
                  />
                </div>
              )}
            </div>
          </Card>
        )}
      </div>

      {/* ─── Resources = canonical platform.associations edges ──────────
          Everything attached to this scope type, grouped by content role with
          the same categorical colors the org resource grid uses. Sits BELOW
          the core content (scopes + context items). */}
      <PrimaryEntityProvider
        value={{
          type: "scope_type",
          id: scopeType.id,
          orgId,
          label: scopeType.label_plural,
        }}
      >
        <div className="space-y-4">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <div className="flex items-center gap-2">
              <Boxes className="h-5 w-5 text-muted-foreground" />
              <h2 className="text-lg font-semibold">Resources</h2>
            </div>
            <span className="text-xs text-muted-foreground">
              Attached to this scope type, grouped by what they do
            </span>
          </div>
          <AssociationCardGrid />
        </div>
      </PrimaryEntityProvider>

      <ReorderDialog
        open={reorderScopesOpen}
        onOpenChange={setReorderScopesOpen}
        title={`Reorder ${scopeType.label_plural}`}
        description="Drag the handle or use the arrows, then save."
        items={sorted.map((s) => ({ id: s.id, label: s.name }))}
        onSave={saveScopeOrder}
      />
      <ReorderDialog
        open={reorderItemsOpen}
        onOpenChange={setReorderItemsOpen}
        title="Reorder context items"
        description="Drag the handle or use the arrows, then save."
        items={items.map((i) => ({
          id: i.id,
          label: i.label,
          sublabel: i.category ?? undefined,
        }))}
        onSave={saveItemOrder}
      />
    </div>
  );
}

// ── Sub-components ───────────────────────────────────────────────────────────

interface ContextItemRowProps {
  item: ContextField;
  href: string;
  isFirst: boolean;
  isLast: boolean;
  moving: boolean;
  disabled: boolean;
  canManage: boolean;
  deleting: boolean;
  onEdit: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDelete: () => void;
}

function ContextField({
  item,
  href,
  isFirst,
  isLast,
  moving,
  disabled,
  canManage,
  deleting,
  onEdit,
  onMoveUp,
  onMoveDown,
  onDelete,
}: ContextItemRowProps) {
  return (
    <div className="flex items-start gap-3 px-4 py-3 hover:bg-accent/30 transition-colors group">
      <div className="order-2 flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <Link
            href={href}
            className="group/name inline-flex items-center gap-1 text-sm font-medium text-foreground hover:text-primary"
          >
            {item.label}
            <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover/name:opacity-100 transition-opacity" />
          </Link>
          {item.category && (
            <Badge variant="outline" className="text-[10px]">
              {item.category}
            </Badge>
          )}
          {(item.tags ?? []).slice(0, 3).map((t) => (
            <Badge
              key={t}
              variant="secondary"
              className="text-[10px] gap-1 font-normal"
            >
              <TagIcon className="h-2.5 w-2.5" />
              {t}
            </Badge>
          ))}
          {(item.tags?.length ?? 0) > 3 && (
            <span className="text-[10px] text-muted-foreground">
              +{(item.tags?.length ?? 0) - 3}
            </span>
          )}
          {item.sensitivity && item.sensitivity !== "internal" && (
            <Badge
              variant="outline"
              className="text-[10px] text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-700"
            >
              {item.sensitivity}
            </Badge>
          )}
        </div>
        {item.description && (
          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
            {item.description}
          </p>
        )}
      </div>
      {canManage && (
        <div className="order-3 flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity">
          <Button
            icon={<Pencil />}
            variant="quiet"
            onClick={onEdit}
            aria-label={`Edit ${item.label}`}
          />
          <Button
            icon={deleting ? (
              <Loader2 className="animate-spin" />
            ) : (
              <Trash2 />
            )}
            variant="quiet"
            onClick={onDelete}
            disabled={deleting}
            aria-label={`Delete ${item.label}`}
          />
        </div>
      )}
      {/* Visually left, but last in DOM so the primary link/edit actions come
          first in keyboard order. Arrow buttons remain the keyboard fallback
          for drag-and-drop reordering. */}
      {canManage && (
        <div className="order-1 flex flex-col -my-1 shrink-0 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity">
          <button
            type="button"
            onClick={onMoveUp}
            disabled={isFirst || disabled}
            aria-label={`Move ${item.label} up`}
            className="h-4 text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed"
          >
            {moving ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <ChevronUp className="h-3.5 w-3.5" />
            )}
          </button>
          <button
            type="button"
            onClick={onMoveDown}
            disabled={isLast || disabled}
            aria-label={`Move ${item.label} down`}
            className="h-4 text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronDown className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}

/** One context-item cell: the value's one-line summary (full text on hover) and its KG suggestion dot. */
function ContextValueCell({
  display,
  suggestionRows,
  accept,
  reject,
  defer,
}: {
  display: string | null;
  suggestionRows: KgSuggestionRow[];
  accept: (id: string) => Promise<KgAcceptResult>;
  reject: (id: string) => Promise<KgDecisionResponse>;
  defer: (id: string) => Promise<KgDecisionResponse>;
}) {
  return (
    <span className="flex items-center gap-1.5 min-w-0">
      {display ? (
        <TooltipProvider delayDuration={400}>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="truncate block cursor-help text-sm min-w-0">
                {display}
              </span>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-sm">
              <p className="text-xs whitespace-pre-wrap break-words">{display}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ) : (
        <span className="truncate block text-xs text-muted-foreground">—</span>
      )}
      {suggestionRows.length > 0 && (
        <span onClick={(e) => e.stopPropagation()} className="shrink-0">
          <KgSuggestionHint
            variant="dot"
            rows={suggestionRows}
            accept={accept}
            reject={reject}
            defer={defer}
            align="start"
          />
        </span>
      )}
    </span>
  );
}

/** A cell's one-line summary (THE one summary, `summarizeContextCell`). */
function renderValue(value: ContextValue): string {
  return summarizeContextCell(value) ?? "";
}
