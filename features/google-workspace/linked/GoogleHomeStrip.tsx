"use client";

/**
 * The Google row at the top of the Workbooks and Documents homes — ONE strip
 * for both. Not connected → one connect card. Connected → everything Google is
 * one click away: Import, New (a blank linked both ways), the recent linked
 * files open in Google, and recent unlinked files send to Google in one click.
 * Holds its height while it resolves, so the list below never jumps.
 */

import { GoogleSignInButton } from "@/components/icons/google-brand";
import { ErrorAlchemyMenu } from "@/components/errors/ErrorAlchemyMenu";
import { useState } from "react";
import { ExternalLink, Loader2 } from "lucide-react";
import { Button, Chip, PromoBanner } from "@ai-matrx/design-system/controls";

import { errorSentence, toast } from "@/lib/toast";
import { approvalQueueHref, SENT_FOR_APPROVAL_MESSAGE } from "@/features/google-workspace/service";

import { GoogleDocsMark, GoogleSheetsMark } from "./marks";
import { createLinkedBlank, importGoogleDocAsDocument, importGoogleSheetAsWorkbook } from "./importers";
import type { useGoogleWorkspaceConnection } from "./useGoogleWorkspaceConnection";
import { useGoogleLink } from "./GoogleLinkControl";
import { savedRecordGoogleAdapter } from "./EditorGoogleLinks";
import type { GoogleFileLink } from "./link-store";
import { OutboundLink } from "@ai-matrx/kit/outbound-react";
import { openOutbound } from "@ai-matrx/kit/outbound";

type GoogleWorkspaceConnection = ReturnType<typeof useGoogleWorkspaceConnection>;

export interface LinkedItem {
  id: string;
  name: string;
  link: GoogleFileLink;
}

/** Chip words: two linked files never read the same ("Untitled workbook", "Untitled workbook (2)"). */
export function chipLabels(items: readonly LinkedItem[]): Array<{ item: LinkedItem; label: string }> {
  const seen = new Map<string, number>();
  return items.map((item) => {
    const base = item.name.trim() || item.link.name?.trim() || "Untitled";
    const n = (seen.get(base) ?? 0) + 1;
    seen.set(base, n);
    return { item, label: n === 1 ? base : `${base} (${n})` };
  });
}

/** A recent record with no Google link yet — offered as one-click "Send". */
export interface UnlinkedItem {
  id: string;
  name: string;
  updatedAt?: string | null;
}

// The words keep a floor of their own, and the chips are always ONE row of their own under the
// words/actions (scrolling sideways when many) — the banner is two rows at every width, so the
// placeholder and the real banner are the same height and the list below never jumps.
const STRIP_CLASS =
  "[&_.matrx-control-promo-text]:min-w-[17rem] [&_.matrx-control-promo-chips]:order-last [&_.matrx-control-promo-chips]:basis-full [&_.matrx-control-promo-chips]:flex-nowrap [&_.matrx-control-promo-chips]:overflow-x-auto [&_.matrx-control-promo-chips]:scrollbar-none";

const LINKED_SHOWN = 3;
const UNLINKED_SHOWN = 2;

function SendChip({ kind, item, onSent }: { kind: "workbook" | "document"; item: UnlinkedItem; onSent?: () => void }) {
  const g = useGoogleLink(savedRecordGoogleAdapter(kind, item.id, item.name), true);
  const busy = g.busy === "create";
  if (g.link) return null; // just sent: it shows among the linked
  return (
    <Chip
      variant="add"
      label={item.name}
      title={`Send to ${g.appName}`}
      // The add chip draws its own "+"; a spinner replaces it only while sending.
      icon={busy ? <Loader2 className="animate-spin" /> : undefined}
      asChild
    >
      <button
        type="button"
        disabled={busy || !g.ready}
        aria-label={`Send ${item.name} to ${g.appName}`}
        onClick={() => {
          void Promise.resolve(g.create()).then(() => onSent?.());
        }}
      />
    </Chip>
  );
}

export function GoogleHomeStrip({
  kind,
  linked,
  unlinked = [],
  hidden = false,
  google,
  pending = false,
  onImported,
  onChanged,
}: {
  kind: "workbook" | "document";
  /** The page's read of the Google connection (it also holds its list back until this is known). */
  google: GoogleWorkspaceConnection;
  /** The page's list is still loading: keep the placeholder so both land in one frame. */
  pending?: boolean;
  linked: LinkedItem[];
  /** Recent records not yet in Google (newest first is best). */
  unlinked?: UnlinkedItem[];
  /** The Trash filter: no Google row there. */
  hidden?: boolean;
  onImported: (id: string) => void;
  /** A record gained a Google link here (reload the list). */
  onChanged?: () => void;
}) {
  const { state, connect, refresh } = google;
  const [busy, setBusy] = useState<null | "import" | "new">(null);
  const isSheet = kind === "workbook";
  const Mark = isSheet ? GoogleSheetsMark : GoogleDocsMark;
  const app = isSheet ? "Google Sheets" : "Google Docs";
  const tone = isSheet ? "success" : "info";

  if (hidden) return null;

  if (pending || state.status === "loading") {
    // The connected banner's own shape (disc, words, a chips row, New/Import) held while the
    // connection is read, so the list under it never moves when the real banner lands.
    return (
      <PromoBanner
        icon={<Mark />}
        tone={tone}
        className={STRIP_CLASS}
        eyebrow={app}
        title={app}
        line={"\u00A0"}
        chips={
          <>
            <span className="h-6 w-28 animate-pulse rounded-full bg-muted" aria-hidden="true" />
            <span className="h-6 w-28 animate-pulse rounded-full bg-muted" aria-hidden="true" />
          </>
        }
        action={
          <span className="flex items-center gap-1">
            <Button variant="outline" disabled>New</Button>
            <Button variant="primary" disabled>Import</Button>
          </span>
        }
        aria-label={app}
      />
    );
  }

  if (state.status === "error") {
    return (
      <PromoBanner
        icon={<Mark />}
        tone="warning"
        eyebrow={app}
        title="Couldn't check your Google connection"
        line={state.error.slice(0, 60)}
        action={
          <span className="flex items-center gap-1">
            <ErrorAlchemyMenu error={state.error} operation={`Check the ${app} connection`} size="icon" />
            <Button variant="outline" onClick={refresh}>Retry</Button>
          </span>
        }
        aria-label={app}
      />
    );
  }

  if (state.status === "none") {
    return (
      <PromoBanner
        icon={<Mark />}
        tone={tone}
        eyebrow={app}
        title={isSheet ? "Bring your Google Sheets in" : "Bring your Google Docs in"}
        line={isSheet ? "Import, push and keep workbooks in step" : "Import, push and keep documents in step"}
        action={
          <GoogleSignInButton theme="light" text="continue_with" onClick={() => connect(`to use ${app} with your ${kind}s`)} />
        }
        aria-label={app}
      />
    );
  }

  const runImport = async () => {
    setBusy("import");
    try {
      const outcome = isSheet
        ? await importGoogleSheetAsWorkbook(state.connection)
        : await importGoogleDocAsDocument(state.connection);
      if (outcome) {
        toast.success(`Imported “${outcome.name}”`, { description: outcome.note ?? undefined });
        onImported(outcome.id);
      }
    } catch (error: unknown) {
      toast.error(errorSentence(error));
    } finally {
      setBusy(null);
    }
  };

  const runNew = async () => {
    setBusy("new");
    try {
      const made = await createLinkedBlank(kind, state.connection);
      if (made.assistId) {
        const assistId = made.assistId;
        toast.info(SENT_FOR_APPROVAL_MESSAGE, {
          action: { label: "Open", onClick: () => openOutbound(approvalQueueHref(assistId), "_blank") },
        });
      } else {
        toast.success(`Created in ${app}`, {
          action: made.webViewLink
            ? { label: "Open", onClick: () => openOutbound(made.webViewLink ?? "", "_blank", "noopener") }
            : undefined,
        });
      }
      onImported(made.id);
    } catch (error: unknown) {
      toast.error(errorSentence(error));
    } finally {
      setBusy(null);
    }
  };

  const recent = [...linked]
    .sort((a, b) => (b.link.lastSyncedAt ?? "").localeCompare(a.link.lastSyncedAt ?? ""))
    .slice(0, LINKED_SHOWN);
  const linkedIds = new Set(linked.map((l) => l.id));
  const sendable = unlinked.filter((u) => !linkedIds.has(u.id)).slice(0, UNLINKED_SHOWN);

  return (
    <PromoBanner
      icon={<Mark />}
      tone={tone}
      className={STRIP_CLASS}
      eyebrow={state.connection.accountEmail ?? app}
      title={app}
      line={linked.length === 0 ? "Import, start new, or send a file" : `${linked.length} linked`}
      chips={
        recent.length + sendable.length > 0 ? (
          <>
            {chipLabels(recent).map(({ item, label }) => (
              <Chip key={item.id} label={label} title={`Open in ${app}`} icon={<ExternalLink />} asChild>
                <OutboundLink href={item.link.webViewLink ?? "#"} />
              </Chip>
            ))}
            {sendable.map((item) => (
              <SendChip key={item.id} kind={kind} item={item} onSent={onChanged} />
            ))}
          </>
        ) : undefined
      }
      action={
        <span className="flex items-center gap-1">
          <Button
            variant="outline"
            icon={busy === "new" ? <Loader2 className="animate-spin" /> : undefined}
            disabled={busy !== null}
            title={isSheet ? "New Google Sheet, linked here" : "New Google Doc, linked here"}
            onClick={() => void runNew()}
          >
            New
          </Button>
          <Button
            variant="primary"
            icon={busy === "import" ? <Loader2 className="animate-spin" /> : undefined}
            disabled={busy !== null}
            onClick={() => void runImport()}
          >
            Import
          </Button>
        </span>
      }
      aria-label={app}
    />
  );
}
