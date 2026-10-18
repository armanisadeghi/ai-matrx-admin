"use client";

// features/unified-data/base/GithubImportDialog.tsx — a GitHub repository's issues as a synced table (aidream /github-sync). Lane AT-SYNC.
//
// The repositories come from the person's OWN GitHub connection (no token is typed here). With no connection the dialog says so in a
// sentence and offers the connect action. Picking one brings its issues in; "Sync now" on the table keeps it current.

import { Button, Field } from "@ai-matrx/design-system/controls";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { postJson } from "@/lib/python-client";

interface Repo { full_name: string; visibility: string | null }
interface RepoList { connected: boolean; remedy: string | null; repositories: Repo[] }
interface Imported { repository: string; table_id: string | null; issues: number; notices: string[] }

export function GithubImportDialog({ open, onClose, organizationId }: { open: boolean; onClose: () => void; organizationId: string }) {
  const [list, setList] = useState<RepoList | null>(null);
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [done, setDone] = useState<Imported | null>(null);
  const [problem, setProblem] = useState<string | null>(null);

  const load = useCallback(async (q: string) => {
    try {
      const { data } = await postJson<RepoList>("/github-sync/repositories", { query: q || null }, { organizationId });
      setList(data); setProblem(null);
    } catch (e) { setProblem(e instanceof Error ? e.message : "GitHub did not answer."); }
  }, [organizationId]);
  useEffect(() => { if (open) { setList(null); setDone(null); setProblem(null); setQuery(""); void load(""); } }, [open, load]);

  const bring = async (repo: string) => {
    setBusy(repo); setProblem(null);
    try {
      const { data } = await postJson<Imported>("/github-sync/import", { repository: repo }, { organizationId });
      setDone(data);
    } catch (e) { setProblem(e instanceof Error ? e.message : "The issues could not be brought in."); } finally { setBusy(null); }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => (!o && !busy ? onClose() : undefined)}>
      <DialogContent className="max-w-[min(560px,96vw)] gap-3 p-4" data-github-import="">
        <DialogTitle>Bring in a repository's issues</DialogTitle>
        {done ? (
          <div className="flex flex-col gap-2 text-sm" data-github-report="">
            <p>{done.issues} issues from {done.repository}.</p>
            {done.notices.length ? <p className="text-xs text-muted-foreground">{done.notices.join(" ")}</p> : null}
            <div className="flex justify-end gap-2">
              {done.table_id ? <Link href={`/data/${done.table_id}`} className="text-sm underline" data-github-open="">Open the table</Link> : null}
              <Button variant="primary" onClick={onClose}>Done</Button>
            </div>
          </div>
        ) : list && !list.connected ? (
          <div className="flex flex-col gap-2 text-sm" data-github-not-connected="">
            <p>{list.remedy ?? "Connect GitHub in AI Matrx, then try again."}</p>
            <div className="flex justify-end gap-2">
              <Button variant="quiet" onClick={onClose}>Close</Button>
              <Link href="/user-settings/integrations" className="text-sm underline" data-github-connect="">Connect GitHub</Link>
            </div>
          </div>
        ) : list ? (
          <div className="flex flex-col gap-2">
            <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); void load(query.trim()); }}>
              <Field value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Find a repository" aria-label="Find a repository" />
              <Button type="submit" variant="quiet">Find</Button>
            </form>
            <ul className="max-h-72 divide-y divide-border overflow-auto rounded-md border border-border">
              {list.repositories.map((r) => (
                <li key={r.full_name} className="flex items-center gap-2 px-3 py-2 text-sm" data-github-repo={r.full_name}>
                  <span className="flex-1 truncate">{r.full_name}</span>
                  <span className="text-xs text-muted-foreground">{r.visibility}</span>
                  <Button variant="primary" disabled={!!busy} onClick={() => void bring(r.full_name)} data-github-go={r.full_name}>{busy === r.full_name ? "Bringing in…" : "Bring in issues"}</Button>
                </li>
              ))}
              {list.repositories.length === 0 ? <li className="px-3 py-2 text-sm text-muted-foreground">No repository matches.</li> : null}
            </ul>
          </div>
        ) : null}
        {problem ? <p className="text-xs text-destructive" role="alert">{problem}</p> : null}
      </DialogContent>
    </Dialog>
  );
}
