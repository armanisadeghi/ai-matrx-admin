"use client";

import { useEffect, useState } from "react";
import {
  Loader2,
  Plus,
  X,
  Cpu,
  Layers,
  Package,
  ShieldCheck,
  AlertCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { confirm } from "@/components/dialogs/confirm/ConfirmDialogHost";
import { toast } from "sonner";
import {
  listToolExecutors,
  addToolExecutor,
  updateToolExecutor,
  removeToolExecutor,
  listToolSurfaces,
  addToolSurface,
  removeToolSurface,
  listToolBundleMemberships,
  parseGating,
  setToolGating,
  listAllUiSurfaceNames,
  listAllExecutorKindNames,
  listAllGateNames,
  type ToolExecutorRow,
  type ToolDefSurfaceRow,
  type BundleMembership,
  type ToolGateEntry,
} from "@/features/tool-registry/tools-admin/services/dimensions.service";

interface Props {
  toolId: string;
  toolName: string;
  initialGating: unknown;
}

export function RegistryTab({ toolId, toolName, initialGating }: Props) {
  return (
    <div className="space-y-8 max-w-5xl">
      <ExecutorsSection toolId={toolId} />
      <SurfacesSection toolId={toolId} />
      <BundlesSection toolId={toolId} />
      <GatingSection toolId={toolId} initialGating={initialGating} />
    </div>
  );
}

// ─── Section header primitive ────────────────────────────────────────────────

function SectionHeader({
  icon,
  title,
  count,
  description,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  count?: number;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-border pb-2">
      <div className="flex items-start gap-2 min-w-0">
        <span className="mt-0.5 text-muted-foreground">{icon}</span>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-medium">{title}</h3>
            {typeof count === "number" && (
              <Badge variant="outline" className="text-[10px]">
                {count}
              </Badge>
            )}
          </div>
          <p className="text-[11px] text-muted-foreground">{description}</p>
        </div>
      </div>
      {action}
    </div>
  );
}

function EmptyHint({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-md border border-dashed border-border px-4 py-6 text-center text-xs text-muted-foreground">
      {children}
    </div>
  );
}

function ErrorBox({ msg }: { msg: string }) {
  return (
    <div className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-xs text-destructive flex items-center gap-2">
      <AlertCircle className="h-3.5 w-3.5" />
      {msg}
    </div>
  );
}

// ─── Executors ───────────────────────────────────────────────────────────────

function ExecutorsSection({ toolId }: { toolId: string }) {
  const [rows, setRows] = useState<ToolExecutorRow[]>([]);
  const [kinds, setKinds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [pendingKind, setPendingKind] = useState<string>("");
  const [pendingPriority, setPendingPriority] = useState<number>(100);
  const [pendingAutoLoad, setPendingAutoLoad] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [r, k] = await Promise.all([listToolExecutors(toolId), listAllExecutorKindNames()]);
      setRows(r);
      setKinds(k);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load executors");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [toolId]);

  const availableKinds = kinds.filter((k) => !rows.some((r) => r.surface === k));

  const onAdd = async () => {
    if (!pendingKind) return;
    setAdding(true);
    try {
      await addToolExecutor({
        toolId,
        surface: pendingKind,
        priority: pendingPriority,
        autoLoad: pendingAutoLoad,
      });
      setPendingKind("");
      setPendingPriority(100);
      setPendingAutoLoad(false);
      await load();
      toast.success(`Executor ${pendingKind} added`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to add executor");
    } finally {
      setAdding(false);
    }
  };

  const onRemove = async (row: ToolExecutorRow) => {
    const ok = await confirm({
      title: `Remove executor ${row.surface}?`,
      description: "The tool will no longer be dispatchable on this runtime.",
      confirmLabel: "Remove",
      variant: "destructive",
    });
    if (!ok) return;
    try {
      await removeToolExecutor(row.id);
      await load();
      toast.success(`Executor ${row.surface} removed`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Remove failed");
    }
  };

  const onTogglePatch = async (
    row: ToolExecutorRow,
    patch: Partial<{ priority: number; auto_load: boolean; is_active: boolean }>,
  ) => {
    try {
      await updateToolExecutor(row.id, patch);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Update failed");
    }
  };

  return (
    <section className="space-y-3">
      <SectionHeader
        icon={<Cpu className="h-4 w-4" />}
        title="Executors"
        count={rows.length}
        description="Runtimes this tool can dispatch on. Priority is ascending — lower wins."
      />
      {loading && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading...
        </div>
      )}
      {error && <ErrorBox msg={error} />}
      {!loading && rows.length === 0 && (
        <EmptyHint>No executors registered yet — add one below.</EmptyHint>
      )}
      {rows.length > 0 && (
        <div className="rounded-md border border-border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Executor kind</TableHead>
                <TableHead className="w-[120px]">Priority</TableHead>
                <TableHead className="w-[120px]">Auto-load</TableHead>
                <TableHead className="w-[120px]">Active</TableHead>
                <TableHead className="w-[80px] text-right">—</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id} className={row.is_active ? "" : "opacity-50"}>
                  <TableCell className="font-mono text-xs">{row.surface}</TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      value={row.priority}
                      className="h-7 w-20 text-xs"
                      onChange={(e) =>
                        void onTogglePatch(row, { priority: Number(e.target.value) || 0 })
                      }
                    />
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={row.auto_load}
                      onCheckedChange={(v) => void onTogglePatch(row, { auto_load: v })}
                    />
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={row.is_active}
                      onCheckedChange={(v) => void onTogglePatch(row, { is_active: v })}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => void onRemove(row)}
                      className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                      aria-label="Remove executor"
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      <div className="flex flex-wrap items-end gap-2 pt-1">
        <div className="space-y-1">
          <Label className="text-[11px] text-muted-foreground">Add executor kind</Label>
          <Select
            value={pendingKind}
            onValueChange={setPendingKind}
            disabled={adding || availableKinds.length === 0}
          >
            <SelectTrigger className="h-8 w-[280px] text-xs">
              <SelectValue
                placeholder={availableKinds.length === 0 ? "All kinds added" : "Pick a kind…"}
              />
            </SelectTrigger>
            <SelectContent>
              {availableKinds.map((k) => (
                <SelectItem key={k} value={k}>
                  {k}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-[11px] text-muted-foreground">Priority</Label>
          <Input
            type="number"
            value={pendingPriority}
            onChange={(e) => setPendingPriority(Number(e.target.value) || 0)}
            className="h-8 w-24 text-xs"
            disabled={adding}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-[11px] text-muted-foreground">Auto-load</Label>
          <div className="flex items-center h-8">
            <Switch
              checked={pendingAutoLoad}
              onCheckedChange={setPendingAutoLoad}
              disabled={adding}
            />
          </div>
        </div>
        <Button size="sm" onClick={() => void onAdd()} disabled={adding || !pendingKind}>
          {adding ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
          Add
        </Button>
      </div>
    </section>
  );
}

// ─── Surfaces ────────────────────────────────────────────────────────────────

function SurfacesSection({ toolId }: { toolId: string }) {
  const [rows, setRows] = useState<ToolDefSurfaceRow[]>([]);
  const [allSurfaces, setAllSurfaces] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingSurface, setPendingSurface] = useState<string>("");
  const [adding, setAdding] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [r, all] = await Promise.all([listToolSurfaces(toolId), listAllUiSurfaceNames()]);
      setRows(r);
      setAllSurfaces(all);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load surfaces");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [toolId]);

  const available = allSurfaces.filter((s) => !rows.some((r) => r.surface_name === s));

  const onAdd = async () => {
    if (!pendingSurface) return;
    setAdding(true);
    try {
      await addToolSurface(toolId, pendingSurface);
      setPendingSurface("");
      await load();
      toast.success(`Surface ${pendingSurface} added`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to add surface");
    } finally {
      setAdding(false);
    }
  };

  const onRemove = async (surfaceName: string) => {
    const ok = await confirm({
      title: `Remove ${surfaceName}?`,
      description: "Agents on this surface will no longer see this tool by default.",
      confirmLabel: "Remove",
      variant: "destructive",
    });
    if (!ok) return;
    try {
      await removeToolSurface(toolId, surfaceName);
      await load();
      toast.success(`Surface ${surfaceName} removed`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Remove failed");
    }
  };

  return (
    <section className="space-y-3">
      <SectionHeader
        icon={<Layers className="h-4 w-4" />}
        title="Surfaces"
        count={rows.length}
        description="Which UIs may expose this tool to an agent. Empty set means available everywhere."
      />
      {loading && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading...
        </div>
      )}
      {error && <ErrorBox msg={error} />}
      {!loading && rows.length === 0 && (
        <EmptyHint>No surface restrictions — this tool is available on every surface.</EmptyHint>
      )}
      {rows.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {rows.map((row) => (
            <Badge
              key={row.surface_name}
              variant="secondary"
              className="text-[11px] gap-1 pr-1 font-mono"
            >
              {row.surface_name}
              <button
                onClick={() => void onRemove(row.surface_name)}
                className="ml-0.5 rounded hover:bg-background/50 p-0.5"
                aria-label={`Remove ${row.surface_name}`}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
      <div className="flex items-end gap-2 pt-1">
        <div className="space-y-1 flex-1 max-w-md">
          <Label className="text-[11px] text-muted-foreground">Add surface</Label>
          <Select
            value={pendingSurface}
            onValueChange={setPendingSurface}
            disabled={adding || available.length === 0}
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue
                placeholder={available.length === 0 ? "All active surfaces added" : "Pick a surface…"}
              />
            </SelectTrigger>
            <SelectContent>
              {available.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button size="sm" onClick={() => void onAdd()} disabled={adding || !pendingSurface}>
          {adding ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
          Add
        </Button>
      </div>
    </section>
  );
}

// ─── Bundles (read-only reverse view) ────────────────────────────────────────

function BundlesSection({ toolId }: { toolId: string }) {
  const [rows, setRows] = useState<BundleMembership[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      setRows(await listToolBundleMemberships(toolId));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load bundles");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [toolId]);

  return (
    <section className="space-y-3">
      <SectionHeader
        icon={<Package className="h-4 w-4" />}
        title="Bundles"
        count={rows.length}
        description="Bundles this tool is a member of. Manage membership from each bundle's detail page."
      />
      {loading && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading...
        </div>
      )}
      {error && <ErrorBox msg={error} />}
      {!loading && rows.length === 0 && (
        <EmptyHint>This tool is not in any bundle.</EmptyHint>
      )}
      {rows.length > 0 && (
        <div className="rounded-md border border-border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Bundle</TableHead>
                <TableHead className="w-[100px]">Type</TableHead>
                <TableHead>Local alias</TableHead>
                <TableHead className="w-[80px] text-right">Sort</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map(({ member, bundle }) => (
                <TableRow key={`${member.bundle_id}-${member.tool_id}`}>
                  <TableCell className="text-xs">
                    <a
                      href={`/administration/bundles?b=${bundle.id}`}
                      className="font-mono text-foreground hover:text-primary hover:underline"
                    >
                      {bundle.name}
                    </a>
                    {bundle.description && (
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {bundle.description}
                      </p>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={bundle.is_system ? "default" : "secondary"} className="text-[10px]">
                      {bundle.is_system ? "system" : "personal"}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono text-xs">{member.local_alias}</TableCell>
                  <TableCell className="text-right text-xs tabular-nums">
                    {member.sort_order}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </section>
  );
}

// ─── Gating ──────────────────────────────────────────────────────────────────

function GatingSection({
  toolId,
  initialGating,
}: {
  toolId: string;
  initialGating: unknown;
}) {
  const [gates, setGates] = useState<ToolGateEntry[]>(parseGating(initialGating));
  const [allGates, setAllGates] = useState<{ name: string; description: string | null }[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [argsJson, setArgsJson] = useState<string[]>(
    parseGating(initialGating).map((g) => JSON.stringify(g.args, null, 2)),
  );

  useEffect(() => {
    void listAllGateNames()
      .then(setAllGates)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load gates"));
  }, []);

  const onAdd = (gateName: string) => {
    setGates((prev) => [...prev, { gate: gateName, args: {} }]);
    setArgsJson((prev) => [...prev, "{}"]);
  };

  const onRemove = (idx: number) => {
    setGates((prev) => prev.filter((_, i) => i !== idx));
    setArgsJson((prev) => prev.filter((_, i) => i !== idx));
  };

  const onSave = async () => {
    setBusy(true);
    try {
      const parsed = gates.map((g, i) => ({
        gate: g.gate,
        args: argsJson[i] ? (JSON.parse(argsJson[i]) as Record<string, unknown>) : {},
      }));
      await setToolGating(toolId, parsed);
      toast.success("Gating saved");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusy(false);
    }
  };

  const available = allGates.filter((g) => !gates.some((cur) => cur.gate === g.name));

  return (
    <section className="space-y-3">
      <SectionHeader
        icon={<ShieldCheck className="h-4 w-4" />}
        title="Gating"
        count={gates.length}
        description="Named gate functions that must pass at dispatch time. ALL must pass (AND)."
        action={
          <Button size="sm" onClick={() => void onSave()} disabled={busy}>
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Save gating"}
          </Button>
        }
      />
      {error && <ErrorBox msg={error} />}
      {gates.length === 0 && <EmptyHint>No gating — this tool is unrestricted.</EmptyHint>}
      <div className="space-y-2">
        {gates.map((g, idx) => {
          const meta = allGates.find((m) => m.name === g.gate);
          return (
            <div key={idx} className="rounded-md border border-border bg-card p-3 space-y-2">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-mono text-xs">{g.gate}</div>
                  {meta?.description && (
                    <p className="text-[11px] text-muted-foreground mt-0.5">{meta.description}</p>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onRemove(idx)}
                  className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                  aria-label="Remove gate"
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] text-muted-foreground">args (JSON)</Label>
                <Textarea
                  value={argsJson[idx] ?? "{}"}
                  onChange={(e) =>
                    setArgsJson((prev) => prev.map((v, i) => (i === idx ? e.target.value : v)))
                  }
                  rows={3}
                  className="font-mono text-xs"
                  style={{ fontSize: "13px" }}
                />
              </div>
            </div>
          );
        })}
      </div>
      {available.length > 0 && (
        <div className="flex items-end gap-2 pt-1">
          <div className="space-y-1 flex-1 max-w-md">
            <Label className="text-[11px] text-muted-foreground">Add gate</Label>
            <Select onValueChange={(v) => onAdd(v)}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Pick a gate to add…" />
              </SelectTrigger>
              <SelectContent>
                {available.map((g) => (
                  <SelectItem key={g.name} value={g.name}>
                    <div className="flex flex-col items-start">
                      <span className="font-mono text-xs">{g.name}</span>
                      {g.description && (
                        <span className="text-[10px] text-muted-foreground">{g.description}</span>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}
    </section>
  );
}
