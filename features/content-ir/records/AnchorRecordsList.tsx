"use client";

/**
 * AnchorRecordsList — THE ONE reverse view of a record's anchor.
 *
 * "What did this produce?" is one question, and it has one answer component.
 * A conversation asks it about a chat; a web site asks it about a site; the
 * next anchor will ask it about whatever it is. The anchor is a token + an id
 * (`RecordAnchor`), the read is `fetchRecordsForAnchor`, and this renders the
 * result. There is deliberately no second list, no second badge, and no
 * per-anchor copy of any of it (DD-131 slice 2, item 4).
 *
 * The two hosts differ only in their CHROME: the chat header wraps this in a
 * popover, a site page wraps it in a section card. Neither one re-implements
 * a row, an empty state, or an archive control.
 *
 * ## THE ARCHIVED-ITEMS LAW
 *
 * `common-docs/policies/archived-items.md`: the default list hides archived
 * records, the archived ones are ONE click away behind the canonical
 * `ArchivedDisclosure`, and the count it prints is the true number hidden.
 *
 * ## Nothing fails silently
 *
 * A read that fails says what failed and offers Try again — it never renders
 * as "nothing here". An empty list says what WOULD fill it, so a reader who
 * expected something knows whether to wait, to act, or to report a bug.
 */

import { useState } from "react";
import Link from "next/link";
import { RotateCw } from "lucide-react";
import { ArchivedDisclosure } from "@ai-matrx/design-system";
import { ConfirmationBadge } from "@/features/content-ir/records/ConfirmationBadge";
import type { KindRecord } from "@/features/content-ir/records/kind-record-service";
import type { AnchorRecordsState } from "@/features/content-ir/records/useAnchorRecords";
import { shapeInstancePermalink } from "@/features/content-ir/studio/constants";
import { ErrorAlchemyMenu } from "@/components/errors/ErrorAlchemyMenu";

export interface AnchorRecordsListProps {
  state: AnchorRecordsState;
  /** What this list is reading, in words — used in the loading sentence. */
  loadingText: string;
  /** What WOULD fill this list, in words. Never "None yet". */
  emptyText: string;
  /** The noun the archive disclosure counts. */
  label?: string;
  className?: string;
}

export function AnchorRecordsList({
  state,
  loadingText,
  emptyText,
  label = "records",
  className,
}: AnchorRecordsListProps) {
  const [showArchived, setShowArchived] = useState(false);

  if (state.status === "loading") {
    return <p className="text-xs text-muted-foreground">{loadingText}</p>;
  }

  if (state.status === "error") {
    return (
      <div className="space-y-2" role="alert">
        <p className="text-xs text-muted-foreground">
          {state.message ?? "These records could not be read right now."}
        </p>
        <button
          type="button"
          onClick={state.reload}
          className="inline-flex items-center gap-1 rounded border border-border px-1.5 py-0.5 text-xs font-medium text-foreground hover:bg-accent"
        >
          <RotateCw className="h-3 w-3" aria-hidden />
          Try again
        </button>
        <ErrorAlchemyMenu className="ml-auto" />
      </div>
    );
  }

  return (
    <div className={className}>
      {state.active.length === 0 ? (
        <p className="text-xs text-muted-foreground">{emptyText}</p>
      ) : (
        <ul className="space-y-1.5">
          {state.active.map((record) => (
            <AnchorRecordRow key={record.id} record={record} />
          ))}
        </ul>
      )}
      <ArchivedDisclosure
        count={state.archived.length}
        open={showArchived}
        onOpenChange={setShowArchived}
        label={label}
        className="mt-3"
        contentClassName="space-y-1.5"
      >
        <ul className="space-y-1.5">
          {state.archived.map((record) => (
            <AnchorRecordRow key={record.id} record={record} />
          ))}
        </ul>
      </ArchivedDisclosure>
    </div>
  );
}

function AnchorRecordRow({ record }: { record: KindRecord }) {
  return (
    <li className="flex items-center justify-between gap-2">
      <div className="min-w-0">
        <Link
          href={shapeInstancePermalink(record.id)}
          className="block truncate text-xs font-medium text-foreground hover:underline"
        >
          {record.title?.trim() || "Untitled record"}
        </Link>
        <span className="block truncate text-[11px] text-muted-foreground">
          {record.kind || "unknown Shape"}
        </span>
      </div>
      <ConfirmationBadge
        confirmation={record.confirmation}
        className="shrink-0"
      />
    </li>
  );
}
