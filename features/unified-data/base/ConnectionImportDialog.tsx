"use client";

// features/unified-data/base/ConnectionImportDialog.tsx — ANY connected app's list as a synced table (aidream /connection-sync). Lane BUILD-CONN.
//
// The apps are the person's OWN connections (Asana, Jira, Box, Salesforce …); the actions offered are the ones the app marks
// read-only. Preview shows the fields the items carry; the person keeps the ones they want, picks the id, and brings them in.
// "Sync now" on the table keeps it current. No per-app code: a new app is a new connection.

import { ErrorNotice } from "@ai-matrx/design-system";
import { Button, Field, Select } from "@ai-matrx/design-system/controls";
import { discoverMcpServerTools, fetchMcpAvailability } from "@ai-matrx/chat/agents/services/mcp-connections.service";
import Link from "next/link";
import { useEffect, useState } from "react";

import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { postJson } from "@/lib/python-client";
import { sayError } from "./sayError";

interface Conn { slug: string; serverId: string }
interface Tool { name: string; args: string[]; readOnly: boolean }
interface PreviewField { path: string; label: string; type: string; sample: unknown }
interface Preview { items: number; fields: PreviewField[]; key: string | null }
interface Imported { table_id: string | null; items: number; notices: string[] }

export function ConnectionImportDialog({ open, onClose, organizationId }: { open: boolean; onClose: () => void; organizationId: string }) {
  return open ? <Body onClose={onClose} organizationId={organizationId} /> : null;
}

function Body({ onClose, organizationId }: { onClose: () => void; organizationId: string }) {
  const [conns, setConns] = useState<Conn[] | null>(null);
  const [conn, setConn] = useState("");
  const [tools, setTools] = useState<Tool[] | null>(null);
  const [tool, setTool] = useState("");
  const [args, setArgs] = useState<Record<string, string>>({});
  const [itemsPath, setItemsPath] = useState("");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [kept, setKept] = useState<Set<string>>(new Set());
  const [key, setKey] = useState("");
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<Imported | null>(null);
  const [problem, setProblem] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    fetchMcpAvailability(organizationId).then(
      (rows) => live && setConns(rows.filter((r) => r.state === "connected" && r.server_id).map((r) => ({ slug: r.slug, serverId: String(r.server_id) }))),
      (e: unknown) => live && setProblem(sayError(e, "Your connected apps could not be read.")),
    );
    return () => { live = false; };
  }, [organizationId]);

  const pickConn = (slug: string) => {
    setConn(slug); setTool(""); setTools(null); setPreview(null); setArgs({});
    const id = conns?.find((c) => c.slug === slug)?.serverId;
    if (!id) return;
    discoverMcpServerTools(id).then(
      (got) => setTools(got.tools.map((t) => ({
        name: t.name,
        args: Object.keys((t.inputSchema as { properties?: Record<string, unknown> }).properties ?? {}),
        readOnly: (t as { annotations?: { readOnlyHint?: boolean } }).annotations?.readOnlyHint !== false,
      }))),
      (e: unknown) => setProblem(sayError(e, "That app's actions could not be read.")),
    );
  };

  const body = () => ({
    connection: conn, tool,
    arguments: Object.fromEntries(Object.entries(args).filter(([, v]) => v.trim()).map(([k, v]) => {
      try { return [k, /^(-?\d+(\.\d+)?|true|false|[[{].*)$/s.test(v.trim()) ? JSON.parse(v) : v]; } catch { return [k, v]; }
    })),
    items_path: itemsPath.trim() || null,
  });

  const look = async () => {
    setBusy(true); setProblem(null);
    try {
      const { data } = await postJson<Preview>("/connection-sync/preview", body(), { organizationId });
      setPreview(data); setKey(data.key ?? ""); setKept(new Set(data.fields.slice(0, 12).map((f) => f.path)));
      setTitle(`${conn} ${tool.replace(/[_-]+/g, " ")}`);
    } catch (e) { setProblem(sayError(e, "The app did not answer.")); } finally { setBusy(false); }
  };

  const bring = async () => {
    if (!preview) return;
    setBusy(true); setProblem(null);
    try {
      const fields = preview.fields.filter((f) => kept.has(f.path)).map((f) => ({ path: f.path, label: f.label, type: f.type }));
      const { data } = await postJson<Imported>("/connection-sync/import", { ...body(), fields, key: key || null, title }, { organizationId });
      setDone(data);
    } catch (e) { setProblem(sayError(e, "The items could not be brought in.")); } finally { setBusy(false); }
  };

  const toggle = (path: string) => setKept((now) => { const next = new Set(now); if (next.has(path)) next.delete(path); else next.add(path); return next; });
  const shown = tools?.filter((t) => t.readOnly) ?? [];
  const current = tools?.find((t) => t.name === tool);

  return (
    <Dialog open onOpenChange={(o) => (!o && !busy ? onClose() : undefined)}>
      <DialogContent className="max-w-[min(640px,96vw)] gap-3 p-4" data-connection-import="">
        <DialogTitle>Bring in from a connected app</DialogTitle>
        {done ? (
          <div className="flex flex-col gap-2 text-sm" data-connection-report="">
            <p>{done.items} items from {conn}.</p>
            {done.notices.length ? <p className="text-xs text-muted-foreground">{done.notices.join(" ")}</p> : null}
            <div className="flex justify-end gap-2">
              {done.table_id ? <Link href={`/data/${done.table_id}`} className="text-sm underline" data-connection-open="">Open the table</Link> : null}
              <Button variant="primary" onClick={onClose}>Done</Button>
            </div>
          </div>
        ) : conns && conns.length === 0 ? (
          <div className="flex flex-col gap-2 text-sm">
            <p>No app is connected yet.</p>
            <div className="flex justify-end gap-2">
              <Button variant="quiet" onClick={onClose}>Close</Button>
              <Link href="/user-settings/integrations" className="text-sm underline">Connect an app</Link>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-2 text-sm">
            <label className="flex items-center gap-2">
              <span className="w-20 shrink-0 text-xs text-muted-foreground">App</span>
              <span className="flex-1" data-connection-app=""><Select aria-label="App" value={conn} onValueChange={pickConn} options={(conns ?? []).map((c) => ({ value: c.slug, label: c.slug }))} /></span>
            </label>
            {conn ? (
              <label className="flex items-center gap-2">
                <span className="w-20 shrink-0 text-xs text-muted-foreground">List</span>
                <span className="flex-1" data-connection-tool=""><Select aria-label="List" value={tool} onValueChange={(v) => { setTool(v); setArgs({}); setPreview(null); }} options={shown.map((t) => ({ value: t.name, label: t.name.replace(/[_-]+/g, " ") }))} /></span>
              </label>
            ) : null}
            {current?.args.map((a) => (
              <label key={a} className="flex items-center gap-2" data-connection-arg={a}>
                <span className="w-20 shrink-0 truncate text-xs text-muted-foreground">{a.replace(/[_-]+/g, " ")}</span>
                <Field value={args[a] ?? ""} onChange={(e) => setArgs({ ...args, [a]: e.target.value })} aria-label={a} />
              </label>
            ))}
            {current ? (
              <label className="flex items-center gap-2">
                <span className="w-20 shrink-0 text-xs text-muted-foreground">List at</span>
                <Field value={itemsPath} onChange={(e) => setItemsPath(e.target.value)} placeholder="data" aria-label="Where the list is" data-connection-items-path="" />
                <Button variant="quiet" disabled={busy} onClick={() => void look()} data-connection-preview="">{busy && !preview ? "Reading…" : "Preview"}</Button>
              </label>
            ) : null}
            {preview ? (
              <div className="flex flex-col gap-2" data-connection-fields="">
                <p className="text-xs text-muted-foreground">{preview.items} items</p>
                <ul className="max-h-60 divide-y divide-border overflow-auto rounded-md border border-border">
                  {preview.fields.map((f) => (
                    <li key={f.path} className="flex items-center gap-2 px-2 py-1 text-xs" data-connection-field={f.path}>
                      <input type="checkbox" checked={kept.has(f.path)} onChange={() => toggle(f.path)} aria-label={`Keep ${f.path}`} />
                      <span className="w-40 truncate">{f.path}</span>
                      <span className="flex-1 truncate text-muted-foreground">{f.sample == null ? "" : String(f.sample)}</span>
                      <input type="radio" name="connection-key" checked={key === f.path} onChange={() => setKey(f.path)} aria-label={`${f.path} is the id`} />
                    </li>
                  ))}
                </ul>
                <div className="flex items-center gap-2">
                  <Field value={title} onChange={(e) => setTitle(e.target.value)} aria-label="Table name" />
                  <Button variant="primary" disabled={busy || kept.size === 0} onClick={() => void bring()} data-connection-go="">{busy ? "Bringing in…" : "Bring in"}</Button>
                </div>
              </div>
            ) : null}
          </div>
        )}
        {problem ? <ErrorNotice message={problem} size="inline" /> : null}
      </DialogContent>
    </Dialog>
  );
}
