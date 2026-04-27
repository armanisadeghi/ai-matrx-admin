"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Container,
  Plus,
  Square,
  Trash2,
  RefreshCw,
  Timer,
  AlertCircle,
  Loader2,
  CheckCircle2,
  History,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useSandboxInstances } from "@/hooks/sandbox/use-sandbox";
import { useTimeRemaining } from "@/hooks/sandbox/use-time-remaining";
import {
  findTierInfo,
  formatPersistenceSize,
  useUserPersistence,
} from "@/hooks/sandbox/use-user-persistence";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import { setPreference } from "@/lib/redux/slices/userPreferencesSlice";
import {
  LIST_ACTIVE_STATUSES,
  STATUS_BADGE_VARIANT,
  STATUS_LABELS,
  getEffectiveStatus,
} from "@/lib/sandbox/status";
import { extractErrorMessage } from "@/utils/errors";
import type {
  SandboxCreateRequest,
  SandboxInstance,
  SandboxStatus,
  SandboxTemplate,
  SandboxTemplateListResponse,
  SandboxTier,
} from "@/types/sandbox";

function StatusBadge({ status }: { status: SandboxStatus }) {
  return (
    <Badge variant={STATUS_BADGE_VARIANT[status] ?? "default"}>
      {STATUS_LABELS[status] ?? status}
    </Badge>
  );
}

function TimeRemaining({ expiresAt }: { expiresAt: string | null }) {
  const remaining = useTimeRemaining(expiresAt, "minute");
  return (
    <span className="flex items-center gap-1 text-sm text-muted-foreground">
      <Timer className="w-3 h-3" />
      {remaining.text}
    </span>
  );
}

export default function SandboxListPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const codingPrefs = useAppSelector((s) => s.userPreferences.coding);
  const {
    instances,
    loading,
    refreshing,
    error,
    total,
    fetchInstances,
    createInstance,
    stopInstance,
    deleteInstance,
  } = useSandboxInstances();

  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createSuccess, setCreateSuccess] = useState(false);
  const [createdInstanceId, setCreatedInstanceId] = useState<string | null>(
    null,
  );
  const [deleteTarget, setDeleteTarget] = useState<SandboxInstance | null>(
    null,
  );
  const [stoppingIds, setStoppingIds] = useState<Set<string>>(new Set());
  const [ttlHours, setTtlHours] = useState(2);
  const [tier, setTier] = useState<SandboxTier>(
    codingPrefs?.lastSandboxTier ?? "ec2",
  );
  const [templateId, setTemplateId] = useState<string>(
    codingPrefs?.lastSandboxTemplate ?? "bare",
  );
  const [templateVersion, setTemplateVersion] = useState<string>("");
  const [templates, setTemplates] = useState<SandboxTemplate[] | null>(null);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);

  // User's per-tier persistent-storage info (volume size + sandbox count).
  // Drives the "Your saved data: 1.3 GB" badge in the create dialog.
  const persistence = useUserPersistence({ skip: !createOpen });
  const tierPersistence = findTierInfo(persistence.info, tier);

  // Fetch the live template catalog whenever the dialog opens or the user
  // flips between tiers. Mirrors the picker in `CreateSandboxModal` (the
  // /code workspace's create flow) so both surfaces show the same options.
  useEffect(() => {
    if (!createOpen) return;
    let cancelled = false;
    setLoadingTemplates(true);
    void (async () => {
      try {
        const resp = await fetch(
          `/api/templates?tier=${encodeURIComponent(tier)}`,
        );
        if (!resp.ok)
          throw new Error(`Templates fetch failed (${resp.status})`);
        const data = (await resp.json()) as SandboxTemplateListResponse;
        if (cancelled) return;
        const list = data.templates ?? [];
        setTemplates(list);
        if (!list.some((t) => t.id === templateId)) {
          const fallback = list[0]?.id ?? "bare";
          setTemplateId(fallback);
          setTemplateVersion(list[0]?.version ?? "");
        } else {
          const match = list.find((t) => t.id === templateId);
          if (match) setTemplateVersion(match.version);
        }
      } catch (err) {
        if (!cancelled) {
          setCreateError(extractErrorMessage(err));
          setTemplates([]);
        }
      } finally {
        if (!cancelled) setLoadingTemplates(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [createOpen, tier]);

  useEffect(() => {
    fetchInstances();
  }, [fetchInstances]);

  // Auto-refresh instances, but pause during creation to prevent modal/background desync
  useEffect(() => {
    if (creating || createSuccess) {
      console.log("[SandboxListPage] Auto-refresh paused during creation");
      return;
    }

    const interval = setInterval(() => {
      console.log("[SandboxListPage] Auto-refresh triggered");
      fetchInstances();
    }, 15000);
    return () => clearInterval(interval);
  }, [fetchInstances, creating, createSuccess]);

  // Auto-dismiss create error after 8 seconds
  useEffect(() => {
    if (!createError) return;
    const timer = setTimeout(() => setCreateError(null), 8000);
    return () => clearTimeout(timer);
  }, [createError]);

  const handleRefresh = async () => {
    await fetchInstances();
  };

  const handleCreate = async () => {
    console.log("[SandboxListPage] handleCreate: Starting creation flow");
    setCreating(true);
    setCreateError(null);
    setCreatedInstanceId(null);

    // Persist the user's last-used tier/template so the dialog opens with
    // their choice next time. Same pattern as `CreateSandboxModal`.
    dispatch(
      setPreference({
        module: "coding",
        preference: "lastSandboxTier",
        value: tier,
      }),
    );
    dispatch(
      setPreference({
        module: "coding",
        preference: "lastSandboxTemplate",
        value: templateId,
      }),
    );

    const request: SandboxCreateRequest = {
      ttl_seconds: ttlHours * 3600,
      tier,
      template: templateId,
    };
    if (templateVersion) request.template_version = templateVersion;
    const result = await createInstance(request);

    if (result.instance) {
      console.log("[SandboxListPage] handleCreate: Instance created", {
        id: result.instance.id,
        status: result.instance.status,
      });

      setCreatedInstanceId(result.instance.id);
      setCreating(false);
      setCreateSuccess(true);

      // Brief success state before redirect
      setTimeout(() => {
        console.log("[SandboxListPage] handleCreate: Redirecting to instance");
        setCreateOpen(false);
        setCreateSuccess(false);
        setCreatedInstanceId(null);
        router.push(`/sandbox/${result.instance!.id}`);
      }, 800);
    } else {
      console.error(
        "[SandboxListPage] handleCreate: Creation failed",
        result.error,
      );
      setCreating(false);
      setCreateError(result.error || "Failed to create sandbox");
    }
  };

  const handleStop = async (instance: SandboxInstance) => {
    setStoppingIds((prev) => new Set(prev).add(instance.id));
    await stopInstance(instance.id);
    setStoppingIds((prev) => {
      const next = new Set(prev);
      next.delete(instance.id);
      return next;
    });
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await deleteInstance(deleteTarget.id);
    setDeleteTarget(null);
  };

  // Deduplicate instances before rendering to prevent React key conflicts
  // This is a safety net in case the hook's deduplication fails
  const uniqueInstances = Array.from(
    new Map(instances.map((inst) => [inst.id, inst])).values(),
  );

  if (uniqueInstances.length !== instances.length) {
    console.error("[SandboxListPage] Duplicate instances detected in render", {
      total: instances.length,
      unique: uniqueInstances.length,
      duplicates: instances.length - uniqueInstances.length,
      duplicateIds: instances
        .map((i) => i.id)
        .filter((id, idx, arr) => arr.indexOf(id) !== idx),
    });
  }

  const activeInstances = uniqueInstances.filter((i) =>
    LIST_ACTIVE_STATUSES.includes(getEffectiveStatus(i)),
  );
  const historicalInstances = uniqueInstances.filter(
    (i) => !LIST_ACTIVE_STATUSES.includes(getEffectiveStatus(i)),
  );
  const activeCount = activeInstances.length;

  return (
    <div className="h-page flex flex-col bg-textured overflow-hidden">
      <div className="shrink-0 p-4 border-b border-border bg-textured">
        <div className="flex items-center justify-between max-w-6xl mx-auto">
          <div className="flex items-center gap-3">
            <Container className="w-6 h-6 text-orange-500" />
            <div>
              <h1 className="text-lg font-semibold">Sandbox Instances</h1>
              <p className="text-sm text-muted-foreground">
                {activeCount} active of {total} total
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={handleRefresh}
              disabled={refreshing}
            >
              <RefreshCw
                className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`}
              />
            </Button>
            <Dialog
              open={createOpen}
              onOpenChange={(open) => {
                if (!creating && !createSuccess) setCreateOpen(open);
              }}
            >
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  New Sandbox
                </Button>
              </DialogTrigger>
              <DialogContent>
                {createSuccess ? (
                  <div className="flex flex-col items-center justify-center py-12 gap-4">
                    <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                      <CheckCircle2 className="w-7 h-7 text-green-600 dark:text-green-400" />
                    </div>
                    <div className="text-center">
                      <h3 className="font-semibold text-lg">Sandbox Created</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        Redirecting to your sandbox...
                      </p>
                      {createdInstanceId && (
                        <p className="text-xs text-muted-foreground mt-2 font-mono">
                          {instances.find((i) => i.id === createdInstanceId)
                            ?.sandbox_id || createdInstanceId}
                        </p>
                      )}
                    </div>
                  </div>
                ) : creating ? (
                  <div className="flex flex-col items-center justify-center py-12 gap-4">
                    <Loader2 className="w-10 h-10 animate-spin text-primary" />
                    <div className="text-center">
                      <h3 className="font-semibold text-lg">
                        Creating Sandbox
                      </h3>
                      {createdInstanceId ? (
                        <>
                          <p className="text-sm text-muted-foreground mt-1">
                            Status:{" "}
                            <Badge variant="info" className="ml-1">
                              {instances.find((i) => i.id === createdInstanceId)
                                ?.status || "creating"}
                            </Badge>
                          </p>
                          <p className="text-xs text-muted-foreground mt-2 font-mono">
                            {instances.find((i) => i.id === createdInstanceId)
                              ?.sandbox_id || createdInstanceId}
                          </p>
                        </>
                      ) : (
                        <p className="text-sm text-muted-foreground mt-1">
                          Spinning up your container. This can take a few
                          seconds...
                        </p>
                      )}
                    </div>
                  </div>
                ) : (
                  <>
                    <DialogHeader>
                      <DialogTitle>Create New Sandbox</DialogTitle>
                      <DialogDescription>
                        Launch an ephemeral sandbox environment. It will
                        automatically shut down after the specified duration.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      {createError && (
                        <div className="flex items-start gap-2.5 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                          <AlertCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
                          <div>
                            <p className="text-sm font-medium text-destructive">
                              Creation Failed
                            </p>
                            <p className="text-xs text-destructive/80 mt-0.5">
                              {createError}
                            </p>
                          </div>
                        </div>
                      )}
                      <div>
                        <label className="text-sm font-medium">Tier</label>
                        <div className="flex items-center gap-2 mt-1">
                          <Button
                            type="button"
                            variant={tier === "ec2" ? "default" : "outline"}
                            size="sm"
                            onClick={() => setTier("ec2")}
                          >
                            EC2 (S3-backed)
                          </Button>
                          <Button
                            type="button"
                            variant={tier === "hosted" ? "default" : "outline"}
                            size="sm"
                            onClick={() => setTier("hosted")}
                          >
                            Hosted (heavy)
                          </Button>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {tier === "ec2"
                            ? "Best for one-shot agent runs and cost-controlled tasks. Backed by S3 — your /home/agent is restored on every new sandbox."
                            : "Best for long-lived editor sessions, workloads > 5 GB, or anything that needs internal Matrx services. Per-user volume mounted at /home/agent."}
                        </p>
                      </div>
                      {/* <div className="flex items-start gap-2 rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-900 dark:border-blue-900/50 dark:bg-blue-950/40 dark:text-blue-200">
                        <Container className="w-4 h-4 mt-0.5 shrink-0" />
                        <div className="flex-1">
                          <div className="font-medium">
                            Your saved data on{" "}
                            {tier === "hosted" ? "Hosted" : "EC2"}:{" "}
                            {persistence.loading ? (
                              <span className="text-muted-foreground">…</span>
                            ) : (
                              formatPersistenceSize(
                                tierPersistence?.current_size_bytes,
                              )
                            )}
                          </div>
                          <div className="text-xs leading-snug opacity-80 mt-0.5">
                            {tierPersistence?.sandbox_count
                              ? `${tierPersistence.sandbox_count} sandbox${tierPersistence.sandbox_count === 1 ? "" : "es"} reference this volume — your work follows you.`
                              : "Your home dir is preserved across sessions on this tier. Anything outside /home/agent is not."}
                          </div>
                        </div>
                      </div> */}
                      <div>
                        <label className="text-sm font-medium">Template</label>
                        <select
                          className="mt-1 h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                          disabled={loadingTemplates}
                          value={templateId}
                          onChange={(e) => {
                            setTemplateId(e.target.value);
                            const match = templates?.find(
                              (t) => t.id === e.target.value,
                            );
                            if (match) setTemplateVersion(match.version);
                          }}
                        >
                          {(templates ?? []).map((t) => (
                            <option key={`${t.id}@${t.version}`} value={t.id}>
                              {t.id} — {t.description}
                            </option>
                          ))}
                          {(!templates || templates.length === 0) && (
                            <option value="bare">bare — Default sandbox</option>
                          )}
                        </select>
                        {templateVersion && (
                          <p className="text-xs text-muted-foreground mt-1">
                            version: {templateVersion}
                          </p>
                        )}
                      </div>
                      <div>
                        <label className="text-sm font-medium">Duration</label>
                        <div className="flex items-center gap-2 mt-1">
                          {[1, 2, 4, 8].map((h) => (
                            <Button
                              key={h}
                              variant={ttlHours === h ? "default" : "outline"}
                              size="sm"
                              onClick={() => setTtlHours(h)}
                            >
                              {h}h
                            </Button>
                          ))}
                        </div>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setCreateOpen(false);
                          setCreateError(null);
                        }}
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleCreate}
                        disabled={loadingTemplates}
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Create Sandbox
                      </Button>
                    </DialogFooter>
                  </>
                )}
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <div className="max-w-6xl mx-auto space-y-4">
          {loading && uniqueInstances.length === 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Sandbox ID</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Time Remaining</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[1, 2, 3].map((i) => (
                    <TableRow key={i}>
                      <TableCell>
                        <Skeleton className="h-4 w-36" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-5 w-16 rounded-full" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-32" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-20" />
                      </TableCell>
                      <TableCell className="text-right">
                        <Skeleton className="h-8 w-16 ml-auto" />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : uniqueInstances.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Container className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-medium mb-2">
                  No Sandbox Instances
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Create your first sandbox to get started with an isolated
                  development environment.
                </p>
                <Button onClick={() => setCreateOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Your First Sandbox
                </Button>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Active Sandboxes */}
              {activeInstances.length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center">
                    <Container className="w-8 h-8 mx-auto mb-3 text-muted-foreground/30" />
                    <p className="text-sm text-muted-foreground">
                      No active sandboxes
                    </p>
                    <Button
                      size="sm"
                      className="mt-3"
                      onClick={() => setCreateOpen(true)}
                    >
                      <Plus className="w-3.5 h-3.5 mr-1.5" />
                      New Sandbox
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="relative rounded-md border">
                  {/* Subtle refresh indicator */}
                  {refreshing && (
                    <div className="absolute top-2 right-2 z-10">
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />
                    </div>
                  )}
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Sandbox ID</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead>Time Remaining</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {activeInstances.map((instance) => {
                        const effectiveStatus = getEffectiveStatus(instance);
                        const isEffectivelyActive = [
                          "ready",
                          "running",
                        ].includes(effectiveStatus);
                        return (
                          <TableRow
                            key={instance.id}
                            className="cursor-pointer hover:bg-muted/50"
                            onClick={() =>
                              router.push(`/sandbox/${instance.id}`)
                            }
                          >
                            <TableCell className="font-mono text-sm">
                              {instance.sandbox_id}
                            </TableCell>
                            <TableCell>
                              <StatusBadge status={effectiveStatus} />
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {new Date(instance.created_at).toLocaleString()}
                            </TableCell>
                            <TableCell>
                              {isEffectivelyActive ? (
                                <TimeRemaining
                                  expiresAt={instance.expires_at}
                                />
                              ) : (
                                <span className="text-sm text-muted-foreground">
                                  --
                                </span>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <div
                                className="flex items-center justify-end gap-1"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {isEffectivelyActive && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleStop(instance)}
                                    disabled={stoppingIds.has(instance.id)}
                                  >
                                    {stoppingIds.has(instance.id) ? (
                                      <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                                    ) : (
                                      <Square className="w-3 h-3 mr-1" />
                                    )}
                                    Stop
                                  </Button>
                                )}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setDeleteTarget(instance)}
                                  className="text-destructive hover:text-destructive"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}

              {/* History — stopped/expired/failed sandboxes */}
              {historicalInstances.length > 0 && (
                <div className="rounded-md border border-dashed border-border/60">
                  <button
                    onClick={() => setHistoryOpen(!historyOpen)}
                    className="flex items-center gap-2 w-full px-4 py-3 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/30 rounded-md transition-colors"
                  >
                    <History className="w-4 h-4" />
                    <span className="font-medium flex-1 text-left">
                      History — read-only record
                    </span>
                    <span className="text-xs bg-muted px-1.5 py-0.5 rounded-full">
                      {historicalInstances.length}
                    </span>
                    {historyOpen ? (
                      <ChevronDown className="w-4 h-4" />
                    ) : (
                      <ChevronRight className="w-4 h-4" />
                    )}
                  </button>
                  {historyOpen && (
                    <>
                      <div className="px-4 pb-2 text-xs text-muted-foreground">
                        These sandboxes have ended — their containers were
                        destroyed when the session closed. Anything you saved
                        inside <code className="font-mono">/home/agent</code> is
                        preserved on this tier and is mounted automatically on
                        the next sandbox you create. Anything outside that
                        directory (running processes, packages installed at the
                        system level, env vars set in the shell) is gone. See
                        the session report on your next sandbox for a
                        per-session summary of what was carried over and what
                        was not.
                      </div>
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/20">
                            <TableHead>Sandbox ID</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Created</TableHead>
                            <TableHead>Stopped</TableHead>
                            <TableHead className="text-right">
                              Actions
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {historicalInstances.map((instance) => {
                            const effectiveStatus =
                              getEffectiveStatus(instance);
                            return (
                              <TableRow
                                key={instance.id}
                                className="cursor-pointer hover:bg-muted/30 opacity-75 hover:opacity-100 transition-opacity"
                                onClick={() =>
                                  router.push(`/sandbox/${instance.id}`)
                                }
                              >
                                <TableCell className="font-mono text-sm text-muted-foreground">
                                  {instance.sandbox_id}
                                </TableCell>
                                <TableCell>
                                  <StatusBadge status={effectiveStatus} />
                                </TableCell>
                                <TableCell className="text-sm text-muted-foreground">
                                  {new Date(
                                    instance.created_at,
                                  ).toLocaleString()}
                                </TableCell>
                                <TableCell className="text-sm text-muted-foreground">
                                  {instance.stopped_at
                                    ? new Date(
                                        instance.stopped_at,
                                      ).toLocaleString()
                                    : instance.expires_at &&
                                        new Date(instance.expires_at) <
                                          new Date()
                                      ? new Date(
                                          instance.expires_at,
                                        ).toLocaleString()
                                      : "--"}
                                </TableCell>
                                <TableCell className="text-right">
                                  <div
                                    className="flex items-center justify-end gap-1"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => setDeleteTarget(instance)}
                                      className="text-destructive hover:text-destructive"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Sandbox</DialogTitle>
            <DialogDescription>
              This is a destructive action.
              {deleteTarget &&
              ["ready", "running"].includes(deleteTarget.status)
                ? " The running container will be destroyed and "
                : " "}
              the sandbox row will be removed from your list.{" "}
              <strong>
                Your /home/agent volume on this tier is not deleted
              </strong>{" "}
              — it stays put and will be re-mounted on the next sandbox you
              create. To wipe persistent storage entirely, use Settings →
              Sandbox Storage. If you just want to stop this container, use Stop
              instead.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete Sandbox
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
