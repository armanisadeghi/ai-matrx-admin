"use client";

// features/unified-data/components/EntityBackLinks.tsx
//
// THE "LINKED RECORDS" SECTION OF EVERY PLATFORM RECORD VIEW (AP-4, Arman 2026-10-06: an
// organization's own custom rows that link to a CRM contact or an HR employee show on that record).
//
//   <EntityBackLinks entityToken="hr_employee" recordId={employee.id} organizationId={row.organization_id} />
//
// The read goes through the package's door (`client.entityBackLinks` in @ai-matrx/records) but is KEPT per record
// per tab in Redux (`useKeptEntityBackLinks`): the package hook's cache is keyed on the provider's client, so a
// board tile that woke or remounted asked again (the remount law).
//
// `EntityCustomFields` renders it, so every page, peek and Detail host that carries the custom-fields
// line carries this one too; a record view that carries its custom fields another way (the party's
// StandardRecordForm) mounts it beside that form. G1 fails a record view with neither
// (every-record-view-has-custom-fields.test.ts, "record view without Linked records").
//
// The store answers (`custom.entity_back_links`, through the records package): which custom rows link here,
// by which field, in which table. The organization is the ROW's, never the active one. Rows group by
// table and each opens its custom record page; more load through `next_cursor`. A missing door or a
// refused read is said in the section, in the store's own words, with a Retry — never hidden.

import Link from "next/link";
import { Link2 } from "lucide-react";
import { RecordsMount } from "@ai-matrx/records-ui";
import type { EntityBackLinkItem } from "@ai-matrx/records";
import { Badge, Button, EmptyState } from "@ai-matrx/design-system/controls";
import { EntityRef } from "@/components/official/entity-ref/EntityRef";
import { useAppRecordsConfig } from "@/features/data-tables/records-ui-host/recordsUiHost";
import { useKeptEntityBackLinks } from "@/features/unified-data/components/useKeptEntityBackLinks";
import { recordPageHref } from "@/features/unified-data/table-page/recordPageHref";

import { ErrorAlchemyMenu } from "@/components/errors/ErrorAlchemyMenu";
import { ErrorNotice } from "@ai-matrx/design-system";
import { useAppSelector } from "@/lib/redux/hooks";
import { selectIsSuperAdminPerson } from "@/lib/redux/selectors/userSelectors";

/** The relationship rules page, where a `record → <kind>` rule makes a kind linkable. */
const ENTITY_REGISTRY_HREF = "/administration/database/relationships/rules";
export interface EntityBackLinksProps {
  entityToken: string;
  recordId: string;
  /** The row's organization (never the active one). Nothing is asked until it is known. */
  organizationId: string | null;
  className?: string;
}

/** Group items by table, keeping the order the store gave. */
export function groupBackLinksByTable(items: EntityBackLinkItem[]) {
  const groups = new Map<string, { tableId: string; tableLabel: string | null; items: EntityBackLinkItem[] }>();
  for (const item of items) {
    const group = groups.get(item.table_id) ?? { tableId: item.table_id, tableLabel: item.table_label, items: [] };
    group.items.push(item);
    groups.set(item.table_id, group);
  }
  return [...groups.values()];
}

/** Reached another way, so never a link target: a File and a Person are relations to their kernel Tables. */
const LINKED_ANOTHER_WAY = new Set(["file", "user", "person", "user_profile", "record", "custom_record"]);

export function EntityBackLinks(props: EntityBackLinksProps) {
  const config = useAppRecordsConfig(props.organizationId);
  if (!props.organizationId || LINKED_ANOTHER_WAY.has(props.entityToken)) return null;
  return (
    <RecordsMount config={config}>
      <BackLinksSection {...props} organizationId={props.organizationId} />
    </RecordsMount>
  );
}

function BackLinksSection({ entityToken, recordId, organizationId, className }: EntityBackLinksProps & { organizationId: string }) {
  const links = useKeptEntityBackLinks(entityToken, recordId, { organizationId });
  const isSuperAdmin = useAppSelector(selectIsSuperAdminPerson);

  // A KIND THE PLATFORM HAS NOT REGISTERED AS LINKABLE: nothing can point here, so people see no section.
  // The super admin who can fix the registry sees a badge into it (the way INTO the admin section).
  if (links.unlinkable) {
    if (!isSuperAdmin) return null;
    return (
      <section data-section="back-links" data-state="unlinkable" className={className}>
        <Link href={ENTITY_REGISTRY_HREF} title="Register this kind so records can link to it">
          <Badge tone="warning">Not linkable: {entityToken}</Badge>
        </Link>
      </section>
    );
  }

  // A RECORD OF AN ORGANIZATION THE READER IS NOT IN (lane DRILL-LIVE-FIX-2 #7): the wall's refusal
  // (42501 → "door") is a state, not a failure — a platform admin peeking another organization's
  // conversation read "…custom.entity_back_links has nothing to do there". Said plainly; no Retry.
  if (links.error?.code === "door" && links.items.length === 0) {
    return (
      <section data-section="back-links" data-state="walled" className={className}>
        <h3 className="text-sm font-medium">Linked records</h3>
        <EmptyState icon={<Link2 className="h-5 w-5" />} title="Only its organization's members see these" />
      </section>
    );
  }
  if (links.error && links.items.length === 0) {
    return (
      <section data-section="back-links" data-state="error" className={className}>
        <h3 className="text-sm font-medium">Linked records</h3>
        <ErrorNotice
         
          title="Couldn't read linked records"
           message={links.error.message}
          actions={
            <Button variant="quiet" onClick={() => links.reload()}>
              Retry
            </Button>
          }
        />
      </section>
    );
  }
  if (links.loading && links.items.length === 0) return null;

  const state = links.items.length ? "ready" : "empty";
  return (
    <section data-section="back-links" data-state={state} className={className}>
      <h3 className="text-sm font-medium">Linked records</h3>
      {links.items.length === 0 ? (
        <EmptyState icon={<Link2 className="h-5 w-5" />} title="Nothing links here" />
      ) : (
        <div className="flex flex-col gap-2 text-sm">
          {groupBackLinksByTable(links.items).map((group) => (
            <div key={group.tableId} data-back-links-table={group.tableId} className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground">{group.tableLabel ?? "Table"}</span>
              {group.items.map((item) => (
                <EntityRef
                  key={`${item.record.id}:${item.field_id}`}
                  token="record"
                  id={item.record.id}
                  name={item.record.label}
                  href={recordPageHref(item.table_id, item.record.id)}
                  showIcon={false}
                  labelClassName="font-medium text-primary underline"
                  disablePeek
                />
              ))}
            </div>
          ))}
        </div>
      )}
      {links.moreError ? <span className="text-xs text-muted-foreground">{links.moreError.message}<ErrorAlchemyMenu error={links.moreError.message} /></span> : null}
      {links.hasMore ? (
        <Button variant="quiet" disabled={links.loadingMore} onClick={() => void links.loadMore()}>
          {links.moreError ? "Retry" : "Load more"}
        </Button>
      ) : null}
    </section>
  );
}
