"use client";

// features/sharing/view-link/ViewLinkPanel.tsx — "Share view link…" in the view menu (lane VIEW-LINK).
//
// Handed to `@ai-matrx/records-ui` as the `shareViewLink` host port. Make an Anyone link for ONE view,
// copy it, see who made each and how often it was opened, turn one off. The link opens `/v/<token>`:
// that view's own filter and shown fields, read-only, no account. Who may make a link is the store's rule
// on the view; its refusal is shown as the sentence it sent.

import { useCallback, useEffect, useState } from "react";
import { Check, Copy, Link2, Loader2, Lock } from "lucide-react";
import { Button } from "@ai-matrx/design-system";

import { listViewLinks, makeViewLink, protectViewLink, turnOffViewLink, viewLinkUrl, type ViewLink, type ViewLinkProtection } from "./viewLinkService";

export interface ViewLinkPanelProps {
  viewId: string;
  name: string;
  onClose: () => void;
}

function when(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function ViewLinkPanel({ viewId, name, onClose }: ViewLinkPanelProps) {
  const [links, setLinks] = useState<ViewLink[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [confirmOff, setConfirmOff] = useState<string | null>(null);
  const [optionsFor, setOptionsFor] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [endDate, setEndDate] = useState("");

  const load = useCallback(async () => {
    try {
      setLinks(await listViewLinks(viewId));
    } catch (thrown) {
      setError(thrown instanceof Error ? thrown.message : "The links could not be read.");
      setLinks([]);
    }
  }, [viewId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function make() {
    setBusy(true);
    setError(null);
    const made = await makeViewLink(viewId, name);
    setBusy(false);
    if (!made.ok) {
      setError(made.error);
      return;
    }
    await load();
  }

  async function turnOff(id: string) {
    setBusy(true);
    setError(null);
    const done = await turnOffViewLink(id);
    setBusy(false);
    setConfirmOff(null);
    if (!done.ok) {
      setError(done.error);
      return;
    }
    await load();
  }

  async function protect(id: string, change: ViewLinkProtection) {
    setBusy(true);
    setError(null);
    const done = await protectViewLink(id, change);
    setBusy(false);
    if (!done.ok) {
      setError(done.error);
      return;
    }
    setPassword("");
    setEndDate("");
    await load();
  }

  function openOptions(link: ViewLink) {
    setPassword("");
    setEndDate(link.expiresAt ? link.expiresAt.slice(0, 10) : "");
    setOptionsFor((now) => (now === link.id ? null : link.id));
  }

  async function copy(link: ViewLink) {
    try {
      await navigator.clipboard.writeText(viewLinkUrl(link.token));
      setCopied(link.id);
      setTimeout(() => setCopied((now) => (now === link.id ? null : now)), 1800);
    } catch {
      setError("Copy is blocked here. Select the link and copy it.");
    }
  }

  return (
    <div className="flex flex-col gap-1.5 px-1" data-view-link-panel={viewId}>
      <div className="flex items-center justify-between gap-2 px-1">
        <span className="flex min-w-0 items-center gap-1 text-xs font-medium">
          <Link2 className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">Share “{name}”</span>
        </span>
        <Button size="sm" variant="ghost" className="h-6 px-2 text-xs" onClick={onClose} data-view-link-done="">
          Done
        </Button>
      </div>
      <p className="px-1 text-[11px] text-muted-foreground">Anyone with the link sees this view, read-only.</p>
      {links === null ? (
        <div className="flex items-center gap-1.5 px-1 py-2 text-xs text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        </div>
      ) : (
        links.map((link) => (
          <div key={link.id} className="flex flex-col gap-0.5 rounded-md border border-border p-1.5" data-view-link={link.id}>
            <div className="flex items-center gap-1">
              <input
                readOnly
                aria-label="Link to this view"
                value={viewLinkUrl(link.token)}
                onFocus={(e) => e.currentTarget.select()}
                className="h-7 min-w-0 flex-1 rounded border border-border bg-transparent px-1.5 text-[11px]"
                data-view-link-url=""
              />
              <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => void copy(link)} data-view-link-copy="">
                {copied === link.id ? <Check className="mr-1 h-3.5 w-3.5" /> : <Copy className="mr-1 h-3.5 w-3.5" />}
                {copied === link.id ? "Copied" : "Copy"}
              </Button>
            </div>
            <div className="flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
              <span className="truncate" data-view-link-maker="">
                {link.madeByMe ? "You" : (link.createdByName ?? "Someone")} · {when(link.createdAt)} · {link.useCount} {link.useCount === 1 ? "view" : "views"}
                {link.expiresAt ? ` · ends ${when(link.expiresAt)}` : ""}
              </span>
              {confirmOff === link.id ? (
                <span className="flex shrink-0 items-center gap-1">
                  <Button size="sm" variant="destructive" className="h-6 px-2 text-[11px]" disabled={busy} onClick={() => void turnOff(link.id)} data-view-link-off-confirm="">
                    Turn off
                  </Button>
                  <Button size="sm" variant="ghost" className="h-6 px-2 text-[11px]" onClick={() => setConfirmOff(null)}>
                    Keep
                  </Button>
                </span>
              ) : (
                <Button size="sm" variant="ghost" className="h-6 shrink-0 px-2 text-[11px]" onClick={() => setConfirmOff(link.id)} data-view-link-off="">
                  Turn off
                </Button>
              )}
            </div>
            <div className="flex items-center gap-1">
              <Button size="sm" variant="ghost" className="h-6 px-2 text-[11px]" onClick={() => openOptions(link)} data-view-link-options="">
                <Lock className="mr-1 h-3 w-3" />
                {link.hasPassword ? "Password on" : "Password"}
              </Button>
            </div>
            {optionsFor === link.id ? (
              <div className="flex flex-col gap-1 border-t border-border pt-1.5" data-view-link-protection={link.id}>
                <div className="flex items-center gap-1">
                  <input
                    type="password"
                    autoComplete="new-password"
                    aria-label="Link password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-7 min-w-0 flex-1 rounded border border-border bg-transparent px-1.5 text-base"
                    data-view-link-password=""
                  />
                  <Button size="sm" variant="outline" className="h-7 px-2 text-xs" disabled={busy || password.length < 4} onClick={() => void protect(link.id, { password })} data-view-link-password-set="">
                    {link.hasPassword ? "Change" : "Set"}
                  </Button>
                  {link.hasPassword ? (
                    <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" disabled={busy} onClick={() => void protect(link.id, { password: "" })} data-view-link-password-clear="">
                      Remove
                    </Button>
                  ) : null}
                </div>
                <div className="flex items-center gap-1">
                  <input
                    type="date"
                    aria-label="Link ends on"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="h-7 min-w-0 flex-1 rounded border border-border bg-transparent px-1.5 text-base"
                    data-view-link-end=""
                  />
                  <Button size="sm" variant="outline" className="h-7 px-2 text-xs" disabled={busy || endDate === ""} onClick={() => void protect(link.id, { expiresAt: new Date(`${endDate}T23:59:59`) })} data-view-link-end-set="">
                    Set end
                  </Button>
                  {link.expiresAt ? (
                    <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" disabled={busy} onClick={() => void protect(link.id, { expiresAt: null })} data-view-link-end-clear="">
                      Never
                    </Button>
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>
        ))
      )}
      {links !== null ? (
        <Button size="sm" variant={links.length === 0 ? "default" : "ghost"} className="h-7 justify-start px-2 text-xs" disabled={busy} onClick={() => void make()} data-view-link-make="">
          {busy ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : null}
          {links.length === 0 ? "Create link" : "Add another link"}
        </Button>
      ) : null}
      {error ? (
        <p role="alert" className="px-1 text-[11px] text-destructive" data-view-link-error="">
          {error}
        </p>
      ) : null}
    </div>
  );
}

/** The `shareViewLink` port of `<RecordsUiProvider>`: the view menu hands the open view, this returns the panel. */
export function viewLinkPort(subject: { viewId: string; name: string; onClose: () => void }) {
  return <ViewLinkPanel viewId={subject.viewId} name={subject.name} onClose={subject.onClose} />;
}
