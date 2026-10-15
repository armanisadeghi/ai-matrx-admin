"use client";

/**
 * The Google strip on the Workbooks, Documents and Presentations homes — ONE strip for all three,
 * drawn as a Google Workspace component (Google's Material 3 surface, type, buttons and chips; the
 * official G and product marks raw, never on a tinted tile). Not connected → Google's own
 * "Continue with Google" button. Connected → Google's account chip, then everything Google is one
 * click away: Import, New (a blank linked both ways), the recent linked files open in Google, and
 * recent unlinked files send to Google in one click. Holds its height while it resolves, so the
 * list below never jumps.
 *
 * Type: Roboto (Apache 2.0, self-hosted by next/font) — the public face of Google's own web UI;
 * Google Sans is not licensed for use outside Google.
 */

import { GoogleG, GoogleSignInButton } from "@/components/icons/google-brand";
import { ErrorAlchemyMenu } from "@/components/errors/ErrorAlchemyMenu";
import { useState, type ReactNode } from "react";
import Link from "next/link";
import { Roboto } from "next/font/google";
import { Download, ExternalLink, Plus, RotateCw, Upload } from "lucide-react";
import { Spinner } from "@/components/ui/loaders/Spinner";

import { errorSentence, recordToast, toast } from "@/lib/toast";
import { confirm } from "@/components/dialogs/confirm/ConfirmDialogHost";
import { approvalQueueHref, SENT_FOR_APPROVAL_MESSAGE } from "@/features/google-workspace/service";

import { GoogleDocsMark, GoogleSheetsMark, GoogleSlidesMark } from "./marks";
import styles from "./google-strip.module.css";
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

/** Same-named files never read the same in one row ("Untitled document", "Untitled document (2)"). */
function distinctNames(names: readonly string[]): string[] {
  const seen = new Map<string, number>();
  return names.map((name) => {
    const base = name.trim() || "Untitled";
    const n = (seen.get(base) ?? 0) + 1;
    seen.set(base, n);
    return n === 1 ? base : `${base} (${n})`;
  });
}

/** A recent record with no Google link yet — offered as one-click "Send". */
export interface UnlinkedItem {
  id: string;
  name: string;
  updatedAt?: string | null;
}

const roboto = Roboto({ subsets: ["latin"], weight: ["400", "500"], display: "swap" });

type StripKind = "workbook" | "document" | "presentation";

const PRODUCT: Record<StripKind, { app: string; Mark: (p: { className?: string }) => ReactNode; noun: string }> = {
  workbook: { app: "Google Sheets", Mark: GoogleSheetsMark, noun: "workbooks" },
  document: { app: "Google Docs", Mark: GoogleDocsMark, noun: "documents" },
  presentation: { app: "Google Slides", Mark: GoogleSlidesMark, noun: "presentations" },
};

const LINKED_SHOWN = 3;
const UNLINKED_SHOWN = 2;

/** Google's default-avatar colours: a signed-in account with no photo is its initial on one of these. */
const AVATAR_COLOURS = ["#1a73e8", "#e8710a", "#188038", "#d93025", "#9334e6", "#007b83", "#c5221f", "#b06000"];

function avatarColour(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return AVATAR_COLOURS[h % AVATAR_COLOURS.length];
}

/** Google's account chip: the account's initial in its avatar circle, then the address. Opens the connection settings. */
function AccountChip({ email, name }: { email: string; name: string | null }) {
  const initial = (name?.trim() || email).charAt(0).toUpperCase();
  return (
    <Link href="/user-settings/integrations/google-workspace" className={styles.account} title={name ? `${name} · ${email}` : email}>
      <span className={styles.avatar} style={{ background: avatarColour(email) }} aria-hidden>
        {initial}
      </span>
      <span className={styles.ellipsis}>{email}</span>
    </Link>
  );
}

/**
 * The frame every state shares, compact (Arman, 2026-10-15: the strip was tall and pushed Recent
 * down): ONE Google bar — G mark, the raw product icon, the product name and its line, the account
 * chip, the actions — then the send / open chips as a second row when there are any.
 */
function Strip({
  label,
  account,
  icon,
  title,
  line,
  actions,
  chips,
}: {
  label: string;
  account?: ReactNode;
  icon: ReactNode;
  title: ReactNode;
  line: ReactNode;
  actions?: ReactNode;
  chips?: ReactNode;
}) {
  return (
    <section className={`${styles.strip} ${roboto.className}`} aria-label={label} data-google-strip>
      <div className={styles.bar}>
        <div className={styles.product}>
          <GoogleG className="size-[18px] shrink-0" />
          <span className={styles.rule} aria-hidden />
          <span className="flex size-6 shrink-0 items-center justify-center">{icon}</span>
          <div className={styles.productText}>
            <span className={styles.title}>{title}</span>
            <span className={styles.line}>{line}</span>
          </div>
        </div>
        {account || actions ? (
          <div className={styles.actions}>
            {account}
            {actions}
          </div>
        ) : null}
      </div>
      {chips ? <div className={styles.chips}>{chips}</div> : null}
    </section>
  );
}

function GButton({
  kind,
  busy,
  icon,
  children,
  ...rest
}: { kind: "filled" | "tonal"; busy?: boolean; icon?: ReactNode; children: ReactNode } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button type="button" aria-busy={busy || undefined} className={`matrx-glyph-trim ${styles.btn} ${styles[kind]}`} {...rest}>
      {/* Google's busy pill: same size, same colour, the label stays; a 16px spinner in the button's
          ink takes the icon's place (the trimmed 18px icon is 15.3–16px wide, so the pill holds still). */}
      {busy ? <Spinner size="xs" label="Working" className="text-current" /> : icon}
      {children}
    </button>
  );
}

function SendChip({ kind, item, label, onSent }: { kind: StripKind; item: UnlinkedItem; label: string; onSent?: () => void }) {
  const g = useGoogleLink(savedRecordGoogleAdapter(kind, item.id, item.name), true);
  const busy = g.busy === "create";
  if (g.link) return null; // just sent: it shows among the linked
  const Mark = g.Mark;
  // Sending makes a NEW file in the person's Google Drive, so the click states that first.
  const send = async () => {
    const ok = await confirm({
      title: `Send “${item.name}” to ${g.appName}?`,
      description: `This creates a new file in your Google Drive and links it here.`,
      confirmLabel: `Send to ${g.appName}`,
    });
    if (!ok) return;
    await Promise.resolve(g.create());
    onSent?.();
  };
  return (
    <button
      type="button"
      className={styles.chip}
      aria-busy={busy || undefined}
      disabled={busy || !g.ready}
      title={`Send “${item.name}” to ${g.appName}`}
      aria-label={`Send ${item.name} to ${g.appName}`}
      onClick={() => void send()}
    >
      {busy ? <Spinner size="xs" label="Sending" className="text-current" /> : <Mark />}
      <span className={styles.ellipsis}>Send “{label}”</span>
      <Upload className={styles.chipTrail} aria-hidden />
    </button>
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
  kind: StripKind;
  /** The page's read of the Google connection (it also holds its list back until this is known). */
  google: GoogleWorkspaceConnection;
  /** The page's list is still loading: keep the placeholder so both land in one frame. */
  pending?: boolean;
  linked: LinkedItem[];
  /** Recent records not yet in Google (newest first is best). */
  unlinked?: UnlinkedItem[];
  /** The Trash filter: no Google row there. */
  hidden?: boolean;
  /** A record was made from Google (Import / New); absent for a kind with no Google import (Slides). */
  onImported?: (id: string) => void;
  /** A record gained a Google link here (reload the list). */
  onChanged?: () => void;
}) {
  const { state, connect, refresh } = google;
  const [busy, setBusy] = useState<null | "import" | "new">(null);
  const { app, Mark, noun } = PRODUCT[kind];
  // Import a Google file / start a new linked one: Sheets and Docs. Slides sends and opens only.
  const canMake = kind !== "presentation" && onImported !== undefined;
  const icon = <Mark className="size-6" />;

  if (hidden) return null;

  if (pending || state.status === "loading") {
    // The connected strip's own shape held while the connection is read, so the list never moves.
    return (
      <Strip
        label={app}
        account={<span className={styles.skeleton} style={{ width: 168, height: 32 }} aria-hidden />}
        icon={icon}
        title={app}
        line={<span className={styles.skeleton} style={{ width: 120, height: 12 }} aria-hidden />}
        actions={
          canMake ? (
            <>
              <span className={styles.skeleton} style={{ width: 88, height: 40 }} aria-hidden />
              <span className={styles.skeleton} style={{ width: 96, height: 40 }} aria-hidden />
            </>
          ) : undefined
        }
        chips={
          <>
            <span className={styles.skeleton} style={{ width: 136, height: 32, borderRadius: 8 }} aria-hidden />
            <span className={styles.skeleton} style={{ width: 136, height: 32, borderRadius: 8 }} aria-hidden />
          </>
        }
      />
    );
  }

  if (state.status === "error") {
    return (
      <Strip
        label={app}
        icon={icon}
        title="Couldn't check your Google connection"
        line={state.error.slice(0, 60)}
        actions={
          <>
            <ErrorAlchemyMenu error={state.error} operation={`Check the ${app} connection`} size="icon" />
            <GButton kind="tonal" icon={<RotateCw aria-hidden />} onClick={refresh}>
              Retry
            </GButton>
          </>
        }
      />
    );
  }

  if (state.status === "none") {
    return (
      <Strip
        label={app}
        icon={icon}
        title={`Bring your ${app} in`}
        line={canMake ? `Import, push and keep ${noun} in step` : `Send ${noun} to ${app} and keep them in step`}
        actions={
          <>
            {/* Google's button has a light and a dark theme of its own: each shows on its own page theme. */}
            <span className="dark:hidden">
              <GoogleSignInButton theme="light" text="continue_with" onClick={() => connect(`to use ${app} with your ${noun}`)} />
            </span>
            <span className="hidden dark:contents">
              <GoogleSignInButton theme="dark" text="continue_with" onClick={() => connect(`to use ${app} with your ${noun}`)} />
            </span>
          </>
        }
      />
    );
  }

  const runImport = async () => {
    if (kind === "presentation") return;
    setBusy("import");
    try {
      const outcome =
        kind === "workbook"
          ? await importGoogleSheetAsWorkbook(state.connection)
          : await importGoogleDocAsDocument(state.connection);
      if (outcome) {
        recordToast.success({ type: kind, id: outcome.id, title: outcome.name }, `Imported “${outcome.name}”`, {
          description: outcome.note ?? undefined,
        });
        onImported?.(outcome.id);
      }
    } catch (error: unknown) {
      toast.error(errorSentence(error));
    } finally {
      setBusy(null);
    }
  };

  const runNew = async () => {
    if (kind === "presentation") return;
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
      onImported?.(made.id);
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
  const email = state.connection.accountEmail;

  return (
    <Strip
      label={app}
      account={email ? <AccountChip email={email} name={state.connection.accountName} /> : undefined}
      icon={icon}
      title={app}
      line={
        linked.length === 0
          ? canMake
            ? "Import, start new, or send a file"
            : "Send a file to open it in Google"
          : `${linked.length} linked`
      }
      actions={
        canMake ? (
          <>
            <GButton
              kind="tonal"
              busy={busy === "new"}
              icon={<Plus aria-hidden />}
              disabled={busy !== null}
              title={kind === "workbook" ? "New Google Sheet, linked here" : "New Google Doc, linked here"}
              onClick={() => void runNew()}
            >
              New
            </GButton>
            <GButton
              kind="filled"
              busy={busy === "import"}
              icon={<Download aria-hidden />}
              disabled={busy !== null}
              title={`Import from ${app}`}
              onClick={() => void runImport()}
            >
              Import
            </GButton>
          </>
        ) : undefined
      }
      chips={
        recent.length + sendable.length > 0 ? (
          <>
            {chipLabels(recent).map(({ item, label }) => (
              <OutboundLink key={item.id} href={item.link.webViewLink ?? "#"} className={styles.chip} title={`Open “${label}” in ${app}`}>
                <Mark />
                <span className={styles.ellipsis}>{label}</span>
                <ExternalLink className={styles.chipTrail} aria-hidden />
              </OutboundLink>
            ))}
            {distinctNames(sendable.map((u) => u.name)).map((label, i) => (
              <SendChip key={sendable[i].id} kind={kind} item={sendable[i]} label={label} onSent={onChanged} />
            ))}
          </>
        ) : undefined
      }
    />
  );
}
