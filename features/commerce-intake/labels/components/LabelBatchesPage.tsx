"use client";

/**
 * /commerce/labels — the label-batch register (feature entry pages are LIST
 * views). New batch + customer-ID import ride the header actions.
 */

import { useMemo, useState } from "react";
import Link from "next/link";
import { BadgeCheck, FileUp, Plus } from "lucide-react";

import PageHeader from "@/features/shell/components/header/PageHeader";
import { EntityListPage } from "@/lib/entity-list/components/EntityListPage";
import { ListPageActionButton, type ListPageAction } from "@/lib/entity-list/components/ListPageActions";
import { useAppSelector } from "@/lib/redux/hooks";
import { selectOrganizationId } from "@/lib/redux/slices/appContextSlice";

import { buildLabelBatchListConfig } from "../listConfig";
import { CreateLabelBatchDialog } from "./CreateLabelBatchDialog";
import { ImportIdentifiersDialog } from "./ImportIdentifiersDialog";

export function LabelBatchesPage() {
  // The list reads every organization the person can reach (the on-page scope
  // control narrows it). The SELECTED organization is only the DESTINATION of a
  // NEW batch / import, so the create controls appear only when one is selected.
  const organizationId = useAppSelector(selectOrganizationId);
  const [creating, setCreating] = useState(false);
  const [importing, setImporting] = useState(false);

  const config = useMemo(() => buildLabelBatchListConfig(), []);

  // One action list: the list header draws each verb, the frame's "…" carries every one. Import and
  // New need a destination organization, so they are offered only when one is selected.
  const actions: ListPageAction[] = [
    { id: "printers", label: "Printers", icon: BadgeCheck, href: "/commerce/labels/printers" },
    ...(organizationId
      ? [
          { id: "import", label: "Import IDs", icon: FileUp, onPress: () => setImporting(true) },
          { id: "new", label: "New batch", icon: Plus, primary: true, onPress: () => setCreating(true) },
        ]
      : []),
  ];
  const emptyActions = (
    <span className="flex flex-wrap items-center justify-center gap-2">
      {actions.map((action) => (
        <ListPageActionButton key={action.id} action={action} />
      ))}
    </span>
  );

  return (
    <>
      <PageHeader>
        <div className="flex min-w-0 items-center gap-2">
          <h1 className="truncate text-sm font-semibold text-foreground">
            QR Labels
          </h1>
          <span className="hidden truncate text-xs text-muted-foreground sm:inline">
            Print runs of pooled intake codes
          </span>
          {/* Label batches are one printable among many — the hub indexes the rest (label stock, QR, barcodes, ZPL, documents). */}
          <Link
            href="/print"
            className="shrink-0 whitespace-nowrap rounded px-1.5 py-0.5 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            Print hub
          </Link>
        </div>
      </PageHeader>
      {config && (
        <EntityListPage
          config={config}
          defaultScope={{ kind: "orgs" }}
          actions={actions}
          emptyAction={emptyActions}
        />
      )}
      {organizationId && (
        <>
          <CreateLabelBatchDialog
            organizationId={organizationId}
            open={creating}
            onOpenChange={setCreating}
          />
          <ImportIdentifiersDialog
            organizationId={organizationId}
            open={importing}
            onOpenChange={setImporting}
          />
        </>
      )}
    </>
  );
}
