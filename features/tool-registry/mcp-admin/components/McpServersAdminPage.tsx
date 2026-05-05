"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Loader2,
  Server,
  RefreshCw,
  Search,
  AlertCircle,
  CheckCircle2,
  Clock,
  XCircle,
  ExternalLink,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import {
  listServers,
  listServerConfigs,
  listServerTools,
  countConnectedUsers,
  refreshServer,
  computeFreshness,
  formatRelativeAge,
  type McpServerRow,
  type McpConfigRow,
  type SyncFreshness,
} from "@/features/tool-registry/mcp-admin/services/mcpAdmin.service";

export function McpServersAdminPage() {
  const [servers, setServers] = useState<McpServerRow[]>([]);
  const [search, setSearch] = useState("");
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      setServers(await listServers());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load servers");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const filtered = useMemo(() => {
    if (!search.trim()) return servers;
    const q = search.trim().toLowerCase();
    return servers.filter(
      (s) =>
        s.slug.toLowerCase().includes(q) ||
        s.name.toLowerCase().includes(q) ||
        s.vendor.toLowerCase().includes(q),
    );
  }, [servers, search]);

  const selected = servers.find((s) => s.slug === selectedSlug) ?? null;

  return (
    <div className="min-h-dvh flex flex-col">
      <div className="flex-shrink-0 px-6 py-3 border-b border-border flex items-center gap-3 bg-background">
        <Server className="h-4 w-4 text-muted-foreground" />
        <h1 className="text-sm font-medium">Tool Registry · MCP Servers</h1>
        <Badge variant="outline" className="text-[10px]">
          {servers.length}
        </Badge>
        {loading && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
        <Button
          size="sm"
          variant="ghost"
          onClick={() => void load()}
          className="h-7 ml-auto gap-1.5 text-xs"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh list
        </Button>
      </div>
      <div className="flex-1 grid grid-cols-1 md:grid-cols-[360px_1fr] min-h-0">
        <aside className="border-r border-border bg-card flex flex-col">
          <div className="p-3 border-b border-border">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search servers…"
                className="pl-7 h-8 text-xs"
                style={{ fontSize: "16px" }}
              />
            </div>
          </div>
          {error && (
            <div className="m-3 rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-xs text-destructive flex items-center gap-2">
              <AlertCircle className="h-3.5 w-3.5" />
              {error}
            </div>
          )}
          <div className="flex-1 overflow-auto">
            {filtered.length === 0 && !loading && (
              <div className="px-3 py-8 text-center text-xs text-muted-foreground">
                No servers match.
              </div>
            )}
            <ul>
              {filtered.map((s) => {
                const fresh = computeFreshness(s);
                const isSel = s.slug === selectedSlug;
                return (
                  <li key={s.slug}>
                    <button
                      onClick={() => setSelectedSlug(s.slug)}
                      className={`w-full text-left px-3 py-2 border-b border-border/50 hover:bg-muted/40 transition-colors ${isSel ? "bg-muted" : ""}`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-mono text-xs truncate flex-1">{s.slug}</span>
                        <FreshnessBadge fresh={fresh} compact />
                      </div>
                      <div className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-2">
                        <span className="truncate">{s.name}</span>
                        <Badge variant="outline" className="text-[10px] flex-shrink-0">
                          {s.status}
                        </Badge>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </aside>
        <div className="overflow-auto">
          {selected ? (
            <ServerDetail key={selected.slug} server={selected} onRefreshed={() => void load()} />
          ) : (
            <div className="h-full flex items-center justify-center text-xs text-muted-foreground p-12">
              Pick a server to view configs, connected users, and tools.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function FreshnessBadge({ fresh, compact }: { fresh: SyncFreshness; compact?: boolean }) {
  const map = {
    fresh: { Icon: CheckCircle2, label: "fresh", className: "bg-success/10 text-success border-success/30" },
    stale: { Icon: Clock, label: "stale", className: "bg-warning/10 text-warning border-warning/30" },
    errored: { Icon: XCircle, label: "error", className: "bg-destructive/10 text-destructive border-destructive/30" },
    never: { Icon: Clock, label: "never", className: "bg-muted text-muted-foreground border-border" },
  } as const;
  const { Icon, label, className } = map[fresh.state];
  return (
    <span
      className={`inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] font-medium ${className}`}
      title={
        fresh.state === "errored"
          ? `Last error: ${fresh.lastError ?? "unknown"}`
          : fresh.ageSec !== null
            ? `Last synced ${formatRelativeAge(fresh.ageSec)} (TTL ${fresh.ttlSec}s)`
            : "Never synced"
      }
    >
      <Icon className="h-3 w-3" />
      {!compact && label}
    </span>
  );
}

function ServerDetail({
  server,
  onRefreshed,
}: {
  server: McpServerRow;
  onRefreshed: () => void;
}) {
  const [refreshing, setRefreshing] = useState(false);
  const fresh = computeFreshness(server);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshServer(server.id);
      toast.success(`${server.slug} refreshed`);
      onRefreshed();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Refresh failed");
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <div className="p-6 space-y-5 max-w-4xl">
      <header className="space-y-2">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="font-mono text-base font-semibold">{server.slug}</h2>
              <Badge variant="outline" className="text-[10px]">{server.status}</Badge>
              <Badge variant="secondary" className="text-[10px]">{server.transport}</Badge>
              {server.is_official && (
                <Badge className="text-[10px]">official</Badge>
              )}
              <FreshnessBadge fresh={fresh} />
            </div>
            <p className="text-sm mt-1">{server.name} <span className="text-muted-foreground">· {server.vendor}</span></p>
            {server.description && (
              <p className="text-xs text-muted-foreground mt-1 max-w-prose">{server.description}</p>
            )}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {server.docs_url && (
              <Button asChild variant="ghost" size="sm" className="h-8 gap-1.5 text-xs">
                <a href={server.docs_url} target="_blank" rel="noopener noreferrer">
                  Docs
                  <ExternalLink className="h-3 w-3" />
                </a>
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={() => void onRefresh()}
              disabled={refreshing}
              className="h-8 gap-1.5 text-xs"
            >
              {refreshing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
              Refresh sync
            </Button>
          </div>
        </div>
        {fresh.state === "errored" && (
          <div className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-xs text-destructive">
            <strong>Sync error:</strong> {fresh.lastError}
          </div>
        )}
      </header>

      <Tabs defaultValue="tools" className="flex flex-col">
        <TabsList className="h-9 self-start">
          <TabsTrigger value="tools" className="text-xs">Tools</TabsTrigger>
          <TabsTrigger value="configs" className="text-xs">Configs</TabsTrigger>
          <TabsTrigger value="connections" className="text-xs">Connected users</TabsTrigger>
          <TabsTrigger value="meta" className="text-xs">Metadata</TabsTrigger>
        </TabsList>
        <TabsContent value="tools" className="m-0 mt-3">
          <ToolsTab slug={server.slug} />
        </TabsContent>
        <TabsContent value="configs" className="m-0 mt-3">
          <ConfigsTab serverId={server.id} />
        </TabsContent>
        <TabsContent value="connections" className="m-0 mt-3">
          <ConnectionsTab serverId={server.id} />
        </TabsContent>
        <TabsContent value="meta" className="m-0 mt-3">
          <MetaTab server={server} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ToolsTab({ slug }: { slug: string }) {
  const [tools, setTools] = useState<{ id: string; name: string; description: string; is_active: boolean | null }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    void listServerTools(slug)
      .then(setTools)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load tools"))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) return <InlineLoading />;
  if (error) return <ErrorBox msg={error} />;
  if (tools.length === 0) {
    return <EmptyHint>No tools registered for this server (yet — try Refresh sync).</EmptyHint>;
  }

  return (
    <div className="rounded-md border border-border bg-card overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Canonical name</TableHead>
            <TableHead>Description</TableHead>
            <TableHead className="w-[80px]">Active</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tools.map((t) => (
            <TableRow key={t.id} className={t.is_active === false ? "opacity-60" : ""}>
              <TableCell className="font-mono text-xs">
                <a
                  href={`/administration/mcp-tools/${t.id}`}
                  className="text-foreground hover:text-primary hover:underline"
                >
                  {t.name}
                </a>
              </TableCell>
              <TableCell className="text-xs">{t.description}</TableCell>
              <TableCell>
                <Badge variant={t.is_active ? "default" : "secondary"} className="text-[10px]">
                  {t.is_active ? "active" : "inactive"}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function ConfigsTab({ serverId }: { serverId: string }) {
  const [configs, setConfigs] = useState<McpConfigRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    void listServerConfigs(serverId)
      .then(setConfigs)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load configs"))
      .finally(() => setLoading(false));
  }, [serverId]);

  if (loading) return <InlineLoading />;
  if (error) return <ErrorBox msg={error} />;
  if (configs.length === 0) {
    return <EmptyHint>No connection configs defined.</EmptyHint>;
  }

  return (
    <div className="space-y-2">
      {configs.map((c) => (
        <div key={c.id} className="rounded-md border border-border bg-card p-3 space-y-2">
          <div className="flex items-center gap-2">
            <code className="font-mono text-xs">{c.label}</code>
            <Badge variant="outline" className="text-[10px]">{c.config_type}</Badge>
            {c.is_default && <Badge className="text-[10px]">default</Badge>}
          </div>
          {c.notes && <p className="text-[11px] text-muted-foreground">{c.notes}</p>}
          <div className="text-[11px] font-mono text-muted-foreground">
            <div>command: <code className="bg-muted px-1 rounded">{c.command}</code></div>
            {c.args.length > 0 && (
              <div>args: <code className="bg-muted px-1 rounded">{c.args.join(" ")}</code></div>
            )}
            {c.npm_package && <div>npm: {c.npm_package}</div>}
            {c.pip_package && <div>pip: {c.pip_package}</div>}
            {c.requires_docker && <div>requires Docker</div>}
          </div>
        </div>
      ))}
    </div>
  );
}

function ConnectionsTab({ serverId }: { serverId: string }) {
  const [count, setCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    void countConnectedUsers(serverId)
      .then(setCount)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load count"))
      .finally(() => setLoading(false));
  }, [serverId]);

  if (loading) return <InlineLoading />;
  if (error) return <ErrorBox msg={error} />;

  return (
    <div className="rounded-md border border-border bg-card p-4 text-sm">
      <div className="flex items-baseline gap-2">
        <span className="text-3xl font-semibold tabular-nums">{count ?? 0}</span>
        <span className="text-xs text-muted-foreground">user{count === 1 ? "" : "s"} connected</span>
      </div>
      <p className="text-[11px] text-muted-foreground mt-2">
        Per-user connection details (auth status, last used, error count) live in the per-user
        Connections page (Phase 6 — coming next).
      </p>
    </div>
  );
}

function MetaTab({ server }: { server: McpServerRow }) {
  return (
    <div className="rounded-md border border-border bg-card p-3">
      <pre className="font-mono text-[11px] overflow-auto whitespace-pre-wrap leading-relaxed">
        {JSON.stringify(
          {
            id: server.id,
            slug: server.slug,
            name: server.name,
            vendor: server.vendor,
            category: server.category,
            transport: server.transport,
            auth_strategy: server.auth_strategy,
            status: server.status,
            has_local: server.has_local,
            has_remote: server.has_remote,
            supports_mcp_apps: server.supports_mcp_apps,
            is_official: server.is_official,
            is_featured: server.is_featured,
            discovery_ttl_seconds: server.discovery_ttl_seconds,
            last_synced_at: server.last_synced_at,
            last_sync_error: server.last_sync_error,
            metadata: server.metadata,
            created_at: server.created_at,
            updated_at: server.updated_at,
          },
          null,
          2,
        )}
      </pre>
    </div>
  );
}

function InlineLoading() {
  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground py-3">
      <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading…
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

function EmptyHint({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-md border border-dashed border-border px-4 py-6 text-center text-xs text-muted-foreground">
      {children}
    </div>
  );
}
