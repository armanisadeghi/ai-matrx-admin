"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AppWindow,
  ArrowUpRight,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  fetchAgentAppsAdmin,
  type AgentAppAdminView,
} from "@/lib/services/agent-apps-admin-service";

const STATUS_VARIANT: Record<
  AgentAppAdminView["status"],
  "default" | "secondary" | "outline" | "destructive"
> = {
  draft: "outline",
  published: "default",
  archived: "secondary",
  suspended: "destructive",
};

export default function AdminSystemAppsListPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [apps, setApps] = useState<AgentAppAdminView[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");

  const load = useCallback(async (silent = false) => {
    if (silent) setRefreshing(true);
    else setLoading(true);
    try {
      const data = await fetchAgentAppsAdmin({ scope: "global", limit: 500 });
      setApps(data);
    } catch (error) {
      console.error("Failed to load system apps:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load(false);
  }, [load]);

  const filtered = apps.filter((a) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      (a.name ?? "").toLowerCase().includes(q) ||
      (a.slug ?? "").toLowerCase().includes(q) ||
      (a.category ?? "").toLowerCase().includes(q)
    );
  });

  const handleOpenEditor = (id: string) => {
    startTransition(() => {
      router.push(`/administration/agent-apps/edit/${id}`);
    });
  };

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="flex-shrink-0 px-4 py-3 border-b border-border bg-card">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-lg font-semibold text-foreground">
              System Agent Apps
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Global-scope agent apps available to every user.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => load(true)}
              disabled={refreshing}
            >
              <RefreshCw
                className={`h-4 w-4 mr-1.5 ${refreshing ? "animate-spin" : ""}`}
              />
              Refresh
            </Button>
            <Link href="/administration/system-agents/apps/new">
              <Button size="sm">
                <Plus className="h-4 w-4 mr-1.5" />
                New system app
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="container mx-auto px-4 py-4 max-w-[1600px] space-y-3">
          <div className="flex items-center gap-2">
            <div className="flex-1 relative">
              <div className="flex items-center gap-3 p-1 pl-3 rounded-full border border-border bg-card">
                <Search className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search system apps..."
                  className="flex-1 bg-transparent border-0 outline-none text-sm text-foreground placeholder:text-muted-foreground py-1"
                />
                {search && (
                  <button
                    onClick={() => setSearch("")}
                    className="p-1.5 hover:bg-muted/50 rounded-lg transition-colors flex-shrink-0"
                    aria-label="Clear search"
                  >
                    <X className="h-4 w-4 text-muted-foreground" />
                  </button>
                )}
              </div>
            </div>
            <span className="text-xs text-muted-foreground shrink-0 px-1">
              {filtered.length} app{filtered.length !== 1 ? "s" : ""}
            </span>
          </div>

          {loading ? (
            <Card>
              <CardContent className="p-12 flex items-center justify-center text-muted-foreground">
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Loading system apps...
              </CardContent>
            </Card>
          ) : filtered.length === 0 ? (
            <Card>
              <CardContent className="p-12 flex flex-col items-center text-center gap-3">
                <div className="p-4 bg-primary/10 rounded-full">
                  <AppWindow className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-1">
                    {search
                      ? "No system apps match your search"
                      : "No system apps yet"}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {search
                      ? "Try a different query."
                      : "Create a system app to ship a global agent-backed mini-app."}
                  </p>
                </div>
                {!search && (
                  <Link href="/administration/system-agents/apps/new">
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Create System App
                    </Button>
                  </Link>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Slug</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead className="text-right">Executions</TableHead>
                      <TableHead className="text-right">Updated</TableHead>
                      <TableHead className="w-[80px]" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((a) => (
                      <TableRow
                        key={a.id}
                        className="cursor-pointer hover:bg-accent/30"
                        onClick={() => handleOpenEditor(a.id)}
                      >
                        <TableCell className="font-medium">{a.name}</TableCell>
                        <TableCell className="text-muted-foreground text-xs">
                          {a.slug}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={STATUS_VARIANT[a.status] ?? "outline"}
                            className="text-[10px]"
                          >
                            {a.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs">
                          {a.category ?? "—"}
                        </TableCell>
                        <TableCell className="text-right text-xs">
                          {a.total_executions ?? 0}
                        </TableCell>
                        <TableCell className="text-right text-xs text-muted-foreground">
                          {a.updated_at
                            ? new Date(a.updated_at).toLocaleDateString()
                            : "—"}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={isPending}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenEditor(a.id);
                            }}
                          >
                            <ArrowUpRight className="h-3.5 w-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
