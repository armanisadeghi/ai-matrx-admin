"use client";

// features/unified-data/base/AirtableImportDialog.tsx — bring Airtable bases in (aidream /airtable-import). Lane AT-BASE.
//
// The person picks a saved Airtable token from THEIR vault or types a new one into the vault form below (a password field — an
// agent never types it), the screen lists the bases that token can read, they tick the ones to bring over, and the import streams
// its steps and ends on what came over and what did not. A rerun changes nothing twice.

import { Button, Field } from "@ai-matrx/design-system/controls";
import { useCallback, useEffect, useState } from "react";

import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { createVaultItem } from "@/features/secrets/vault-service";
import { postJson, postNdjson } from "@/lib/python-client";
import { createClient } from "@/utils/supabase/client";

interface Token { id: string; name: string }
interface AirtableBase { id: string; name: string; permission: string }
interface PreviewTable { id: string; name: string; fields: number; views: number }
interface Item { kind: string; item: string | null; reason: string | null }
type Report = { counts: Record<string, number>; came_over: Record<string, number>; came_with_a_difference: Item[]; not_carried: Item[] };

async function savedTokens(): Promise<Token[]> {
  const { data } = await createClient().schema("users").from("credential_items").select("id,display_name").eq("definition_key", "airtable_pat").is("deleted_at", null).order("created_at", { ascending: false });
  return ((data ?? []) as Array<{ id: string; display_name: string | null }>).map((r) => ({ id: r.id, name: r.display_name || "Airtable token" }));
}

export function AirtableImportDialog({ open, onClose, organizationId }: { open: boolean; onClose: () => void; organizationId: string }) {
  const [tokens, setTokens] = useState<Token[] | null>(null);
  const [item, setItem] = useState<string | null>(null);
  const [typed, setTyped] = useState("");
  const [bases, setBases] = useState<AirtableBase[] | null>(null);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [step, setStep] = useState<string | null>(null);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [preview, setPreview] = useState<Record<string, PreviewTable[] | "loading">>({});
  const [report, setReport] = useState<Report | null>(null);
  const [problem, setProblem] = useState<string | null>(null);

  const reload = useCallback(async () => setTokens(await savedTokens().catch(() => [])), []);
  useEffect(() => { if (open) { setBases(null); setReport(null); setProblem(null); setPreview({}); setProgress(null); void reload(); } }, [open, reload]);

  const listFor = async (id: string) => {
    setItem(id); setProblem(null); setStep("Asking Airtable which bases this token can read…");
    try {
      const { data } = await postJson<{ bases: AirtableBase[] }>("/airtable-import/bases", { credential_item_id: id }, { organizationId });
      setBases(data.bases); setPicked(new Set(data.bases.map((b) => b.id)));
    } catch (e) { setProblem(e instanceof Error ? e.message : "Airtable did not answer."); } finally { setStep(null); }
  };
  const look = async (baseId: string) => {
    if (!item) return;
    setPreview((p) => ({ ...p, [baseId]: "loading" }));
    try {
      const { data } = await postJson<{ tables: PreviewTable[] }>("/airtable-import/tables", { credential_item_id: item, base_id: baseId }, { organizationId });
      setPreview((p) => ({ ...p, [baseId]: data.tables }));
    } catch (e) {
      setPreview((p) => { const n = { ...p }; delete n[baseId]; return n; });
      setProblem(e instanceof Error ? e.message : "Airtable did not answer.");
    }
  };
  const saveToken = async () => {
    try {
      const made = await createVaultItem({ principal: { type: "user" }, display_name: "Airtable token", definition_key: "airtable_pat",
        fields: [{ field_key: "api_key", value: typed.trim(), handling: "revealable", editable: true, inject_into_sandbox: false }] } as Parameters<typeof createVaultItem>[0]);
      setTyped(""); await reload(); await listFor(made.id);
    } catch (e) { setProblem(e instanceof Error ? e.message : "The token could not be saved."); }
  };
  const run = async () => {
    if (!item) return;
    setProblem(null); setStep("Reading…"); setProgress(null);
    try {
      for await (const ev of postNdjson("/airtable-import/import", { credential_item_id: item, base_ids: [...picked] }, { organizationId })) {
        if (ev.event !== "data") continue;
        const d = ev.data as Record<string, unknown>;
        if (d.type === "notion_import.progress") {
          setStep(`${String(d.step)} · ${String(d.detail ?? "")}`);
          if (typeof d.done === "number" && typeof d.total === "number" && d.total > 0) setProgress({ done: d.done, total: d.total });
        }
        else if (d.type === "notion_import.failed") { setProblem(String(d.message)); setStep(null); return; }
        else if (d.type === "notion_import.finished") setReport(d as unknown as Report);
      }
    } catch (e) { setProblem(e instanceof Error ? e.message : "The import stopped."); } finally { setStep(null); setProgress(null); }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => (!o && !step ? onClose() : undefined)}>
      <DialogContent className="max-w-[min(620px,96vw)] gap-3 p-4" data-airtable-import="">
        <DialogTitle>Bring in an Airtable base</DialogTitle>
        {report ? (
          <div className="flex flex-col gap-2 text-sm" data-airtable-report="">
            <p>{Object.entries(report.came_over).map(([k, v]) => `${v} ${k}`).join(" · ")}</p>
            {report.came_with_a_difference.length ? <p className="text-xs text-muted-foreground">Came with a difference: {report.came_with_a_difference.length}. {report.came_with_a_difference.slice(0, 3).map((x) => x.item).join("; ")}</p> : null}
            {report.not_carried.length ? <p className="text-xs text-muted-foreground">Not carried: {report.not_carried.map((x) => `${x.kind} (${x.item})`).join("; ")}</p> : null}
            <div className="flex justify-end"><Button variant="primary" onClick={onClose}>Done</Button></div>
          </div>
        ) : bases ? (
          <div className="flex flex-col gap-2">
            <ul className="max-h-64 divide-y divide-border overflow-auto rounded-md border border-border">
              {bases.map((b) => (
                <li key={b.id} data-airtable-base={b.id}>
                  <div className="flex items-center gap-2 px-3 py-2 text-sm">
                    <label className="flex flex-1 items-center gap-2"><input type="checkbox" checked={picked.has(b.id)} aria-label={b.name}
                      onChange={(e) => setPicked((s) => { const n = new Set(s); if (e.target.checked) n.add(b.id); else n.delete(b.id); return n; })} />{b.name}</label>
                    <Button variant="quiet" disabled={!!step || preview[b.id] === "loading"} onClick={() => void look(b.id)} data-airtable-look={b.id}>{preview[b.id] === "loading" ? "Looking…" : "Tables"}</Button>
                  </div>
                  {Array.isArray(preview[b.id]) ? (
                    <ul className="border-t border-border bg-muted/30 px-3 py-1 text-xs" data-airtable-tables={b.id}>
                      {(preview[b.id] as PreviewTable[]).map((t) => <li key={t.id} className="flex justify-between py-0.5"><span>{t.name}</span><span className="text-muted-foreground">{t.fields} columns · {t.views} views</span></li>)}
                    </ul>
                  ) : null}
                </li>
              ))}
            </ul>
            <div className="flex justify-end gap-2">
              <Button variant="quiet" onClick={() => setBases(null)} disabled={!!step}>Back</Button>
              <Button variant="primary" disabled={!!step || picked.size === 0} onClick={() => void run()} data-airtable-go="">Import {picked.size} {picked.size === 1 ? "base" : "bases"}</Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {(tokens ?? []).map((t) => <Button key={t.id} variant="quiet" disabled={!!step} onClick={() => void listFor(t.id)} data-airtable-token={t.id}>Use {t.name}</Button>)}
            <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); void saveToken(); }}>
              {/* ui-exception: a pasted secret (the Airtable personal access token), never prose; it goes to the person's own vault */}
              <Field type="password" value={typed} onChange={(e) => setTyped(e.target.value)} placeholder="Airtable personal access token (pat…)" aria-label="Airtable personal access token" />
              <Button type="submit" variant="primary" disabled={!typed.trim() || !!step}>Save to vault</Button>
            </form>
            <p className="text-xs text-muted-foreground">Needs data.records:read, schema.bases:read and data.recordComments:read.</p>
          </div>
        )}
        {progress ? <Progress value={Math.min(100, Math.round((progress.done / progress.total) * 100))} data-airtable-progress="" /> : null}
        {step ? <p className="text-xs text-muted-foreground">{step}</p> : null}
        {problem ? <p className="text-xs text-destructive" role="alert">{problem}</p> : null}
      </DialogContent>
    </Dialog>
  );
}
