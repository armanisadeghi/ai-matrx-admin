"use client";

/**
 * File Upload Debug — exhaustive consumer-pattern harness.
 *
 * Every code path the app uses to upload files is exercised here, side by
 * side, with FULL error visibility. The goal is: when an upload fails,
 * you can see EXACTLY where in the chain it broke and what the backend
 * said.
 *
 * Patterns covered:
 *   1. Legacy `useFileUploadWithStorage` (old-style hook, ~14 callers)
 *      - uploadFile (default folder)
 *      - uploadToPublicUserAssets (Shared Assets)
 *      - uploadToPrivateUserAssets (Private Assets)
 *   2. Cloud-files `uploadFiles` thunk (direct Redux)
 *   3. `useUploadAndShare` hook (new ergonomic shape)
 *   4. `useUploadAndGet` hook (returns fileId only)
 *   5. Server-side `Api.Server.uploadAndShare` via /api/images/upload
 *   6. Paste-image flow (clipboard event)
 *
 * Every row in the log shows: timestamp · pattern · target folder · result
 * (success/failure) · duration · raw error if any · fileId / shareUrl on
 * success. The active backend URL is shown at the top so you know which
 * server you're hitting.
 */

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clipboard,
  Cloud,
  ExternalLink,
  HardDriveUpload,
  Loader2,
  RefreshCw,
  Server,
  Upload,
  X,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import { supabase } from "@/utils/supabase/client";
import {
  selectAllServerHealth,
  selectResolvedBaseUrl,
  switchServer,
  type ServerEnvironment,
} from "@/lib/redux/slices/apiConfigSlice";
import { resolveBaseUrl } from "@/features/files/api/client";
import { useFileUploadWithStorage } from "@/components/ui/file-upload/useFileUploadWithStorage";
import {
  ensureFolderPath,
  uploadFiles as cloudUploadFiles,
} from "@/features/files/redux/thunks";
import { useUploadAndGet } from "@/features/files/hooks/useUploadAndGet";
import { useUploadAndShare } from "@/features/files/hooks/useUploadAndShare";
import { cn } from "@/lib/utils";
import { extractErrorMessage } from "@/utils/errors";

// ─── Helpers ─────────────────────────────────────────────────────────────

interface LogEntry {
  id: string;
  ts: number;
  durationMs: number;
  pattern: string;
  target: string;
  fileName: string;
  fileSize: number;
  ok: boolean;
  error: string | null;
  fileId: string | null;
  shareUrl: string | null;
  raw: unknown;
}

function fmtTs(ts: number): string {
  const d = new Date(ts);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}:${String(d.getSeconds()).padStart(2, "0")}.${String(d.getMilliseconds()).padStart(3, "0")}`;
}

function fmtBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(2)} MB`;
}

// ─── Component ────────────────────────────────────────────────────────────

export function FileUploadDebugClient() {
  const dispatch = useAppDispatch();
  const baseUrl = useAppSelector(selectResolvedBaseUrl);
  const allServerHealth = useAppSelector(selectAllServerHealth);

  const [jwt, setJwt] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [running, setRunning] = useState<Record<string, boolean>>({});

  // Pre-pick a file once so the same file goes through every pattern.
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Hooks under test
  const legacyHook = useFileUploadWithStorage("userContent", "debug-uploads");
  const useGet = useUploadAndGet();
  const useShare = useUploadAndShare();

  // Auth refresh
  const refreshSession = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    setJwt(data.session?.access_token ?? null);
    setUserId(data.session?.user.id ?? null);
    setUserEmail(data.session?.user.email ?? null);
  }, []);

  useEffect(() => {
    void refreshSession();
  }, [refreshSession]);

  // ─── Logging ─────────────────────────────────────────────────────────────

  const log = useCallback(
    (entry: Omit<LogEntry, "id" | "ts">): LogEntry => {
      const full: LogEntry = {
        id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        ts: Date.now(),
        ...entry,
      };
      setLogs((prev) => [full, ...prev]);
      return full;
    },
    [],
  );

  // ─── Pattern runners ─────────────────────────────────────────────────────

  const runWithTiming = useCallback(
    async <T,>(
      pattern: string,
      target: string,
      file: File,
      worker: () => Promise<T>,
      successExtractor: (v: T) => {
        fileId: string | null;
        shareUrl: string | null;
      },
    ): Promise<void> => {
      const startMs = performance.now();
      setRunning((r) => ({ ...r, [pattern]: true }));
      try {
        const result = await worker();
        const durationMs = Math.round(performance.now() - startMs);
        const ok = result != null && (result as unknown) !== false;
        const extracted = ok
          ? successExtractor(result)
          : { fileId: null, shareUrl: null };
        log({
          durationMs,
          pattern,
          target,
          fileName: file.name,
          fileSize: file.size,
          ok,
          error: ok ? null : "Hook returned null/false (check console for the underlying cause)",
          fileId: extracted.fileId,
          shareUrl: extracted.shareUrl,
          raw: result,
        });
      } catch (err) {
        const durationMs = Math.round(performance.now() - startMs);
        log({
          durationMs,
          pattern,
          target,
          fileName: file.name,
          fileSize: file.size,
          ok: false,
          error: extractErrorMessage(err),
          fileId: null,
          shareUrl: null,
          raw: err,
        });
      } finally {
        setRunning((r) => ({ ...r, [pattern]: false }));
      }
    },
    [log],
  );

  // 1. Legacy hook — public assets
  const onLegacyPublic = useCallback(
    async (file: File) => {
      await runWithTiming(
        "useFileUploadWithStorage.uploadToPublicUserAssets",
        "Shared Assets",
        file,
        async () => {
          const r = await legacyHook.uploadToPublicUserAssets(file);
          if (r) return r;
          // Read the synchronous ref to surface the real cause.
          throw new Error(legacyHook.lastErrorRef.current ?? "Upload returned null");
        },
        (r) => ({ fileId: r.localId ?? null, shareUrl: r.url ?? null }),
      );
    },
    [legacyHook, runWithTiming],
  );

  // 1b. Legacy hook — private assets
  const onLegacyPrivate = useCallback(
    async (file: File) => {
      await runWithTiming(
        "useFileUploadWithStorage.uploadToPrivateUserAssets",
        "Private Assets",
        file,
        async () => {
          const r = await legacyHook.uploadToPrivateUserAssets(file);
          if (r) return r;
          throw new Error(legacyHook.lastErrorRef.current ?? "Upload returned null");
        },
        (r) => ({ fileId: r.localId ?? null, shareUrl: r.url ?? null }),
      );
    },
    [legacyHook, runWithTiming],
  );

  // 1c. Legacy hook — default folder (bucket+path passed at hook init)
  const onLegacyDefault = useCallback(
    async (file: File) => {
      await runWithTiming(
        "useFileUploadWithStorage.uploadFile",
        "userContent / debug-uploads → My Files/debug-uploads",
        file,
        async () => {
          const r = await legacyHook.uploadFile(file);
          if (r) return r;
          throw new Error(legacyHook.lastErrorRef.current ?? "Upload returned null");
        },
        (r) => ({ fileId: r.localId ?? null, shareUrl: r.url ?? null }),
      );
    },
    [legacyHook, runWithTiming],
  );

  // 2. cloud-files thunk directly
  const onThunkDirect = useCallback(
    async (file: File) => {
      await runWithTiming(
        "uploadFiles thunk (direct dispatch)",
        "Debug Uploads",
        file,
        async () => {
          const parentFolderId = await dispatch(
            ensureFolderPath({
              folderPath: "Debug Uploads",
              visibility: "private",
            }),
          ).unwrap();
          const result = await dispatch(
            cloudUploadFiles({
              files: [file],
              parentFolderId,
              visibility: "private",
              concurrency: 1,
              metadata: { origin: "debug-page" },
            }),
          ).unwrap();
          if (result.uploaded.length === 0) {
            throw new Error(
              result.failed[0]?.error ?? "thunk reported no uploads + no failures (impossible)",
            );
          }
          return result;
        },
        (r) => ({ fileId: r.uploaded[0] ?? null, shareUrl: null }),
      );
    },
    [dispatch, runWithTiming],
  );

  // 3. useUploadAndGet — the recommended new-shape hook
  const onUploadAndGet = useCallback(
    async (file: File) => {
      await runWithTiming(
        "useUploadAndGet (new hook)",
        "Debug Uploads",
        file,
        async () => useGet.upload({ file, folderPath: "Debug Uploads" }),
        (r) => ({ fileId: r.fileId, shareUrl: null }),
      );
    },
    [useGet, runWithTiming],
  );

  // 4. useUploadAndShare — fileId + share URL
  const onUploadAndShare = useCallback(
    async (file: File) => {
      await runWithTiming(
        "useUploadAndShare (new hook)",
        "Debug Uploads",
        file,
        async () => useShare.upload({ file, folderPath: "Debug Uploads" }),
        (r) => ({ fileId: r.fileId, shareUrl: r.shareUrl }),
      );
    },
    [useShare, runWithTiming],
  );

  // 5. Server-side via /api/images/upload
  const onServerImageRoute = useCallback(
    async (file: File) => {
      if (!file.type.startsWith("image/")) {
        log({
          durationMs: 0,
          pattern: "POST /api/images/upload",
          target: "Images/Generated/<uuid>/",
          fileName: file.name,
          fileSize: file.size,
          ok: false,
          error: "Not an image — this route only accepts images.",
          fileId: null,
          shareUrl: null,
          raw: null,
        });
        return;
      }
      const startMs = performance.now();
      setRunning((r) => ({ ...r, server: true }));
      try {
        const fd = new FormData();
        fd.append("file", file);
        fd.append("preset", "social");
        const res = await fetch("/api/images/upload", {
          method: "POST",
          body: fd,
        });
        const durationMs = Math.round(performance.now() - startMs);
        const text = await res.text();
        let body: Record<string, unknown> | null = null;
        try {
          body = JSON.parse(text) as Record<string, unknown>;
        } catch {
          body = null;
        }
        log({
          durationMs,
          pattern: "POST /api/images/upload",
          target: "Images/Generated/<uuid>/",
          fileName: file.name,
          fileSize: file.size,
          ok: res.ok,
          error: res.ok
            ? null
            : (body?.error as string) ?? `HTTP ${res.status} ${res.statusText}`,
          fileId: null,
          shareUrl: res.ok ? ((body?.primary_url as string) ?? null) : null,
          raw: body ?? text,
        });
      } catch (err) {
        log({
          durationMs: Math.round(performance.now() - startMs),
          pattern: "POST /api/images/upload",
          target: "Images/Generated/<uuid>/",
          fileName: file.name,
          fileSize: file.size,
          ok: false,
          error: extractErrorMessage(err),
          fileId: null,
          shareUrl: null,
          raw: err,
        });
      } finally {
        setRunning((r) => ({ ...r, server: false }));
      }
    },
    [log],
  );

  // 6. Paste-image flow — listens for paste events
  useEffect(() => {
    const handler = async (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of Array.from(items)) {
        if (item.type.startsWith("image/")) {
          const blob = item.getAsFile();
          if (!blob) continue;
          const ext = blob.type.split("/")[1] || "png";
          const named = new File([blob], `pasted-${Date.now()}.${ext}`, {
            type: blob.type,
          });
          setSelectedFile(named);
          // Auto-run all patterns serially on the pasted image so the user
          // sees the full picture without clicking anything.
          await onLegacyPublic(named);
          return;
        }
      }
    };
    document.addEventListener("paste", handler);
    return () => document.removeEventListener("paste", handler);
  }, [onLegacyPublic]);

  // ─── Server-toggle ───────────────────────────────────────────────────────

  const onSwitchServer = useCallback(
    (env: ServerEnvironment) => {
      void dispatch(switchServer({ env }));
    },
    [dispatch],
  );

  // ─── File picker ─────────────────────────────────────────────────────────

  const onFilePicked = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) setSelectedFile(f);
    e.target.value = "";
  };

  // ─── Run-all ─────────────────────────────────────────────────────────────

  const runAll = useCallback(async () => {
    if (!selectedFile) return;
    await onLegacyDefault(selectedFile);
    await onLegacyPublic(selectedFile);
    await onLegacyPrivate(selectedFile);
    await onThunkDirect(selectedFile);
    await onUploadAndGet(selectedFile);
    await onUploadAndShare(selectedFile);
    if (selectedFile.type.startsWith("image/")) {
      await onServerImageRoute(selectedFile);
    }
  }, [
    selectedFile,
    onLegacyDefault,
    onLegacyPublic,
    onLegacyPrivate,
    onThunkDirect,
    onUploadAndGet,
    onUploadAndShare,
    onServerImageRoute,
  ]);

  const clearLogs = () => setLogs([]);
  const toggleExpand = (id: string) =>
    setExpanded((e) => ({ ...e, [id]: !e[id] }));

  const activeHealth = useMemo(
    () => allServerHealth.find((h) => h.isActive),
    [allServerHealth],
  );

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <div className="mx-auto max-w-6xl px-4 py-6 space-y-4">
        <header className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Cloud className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-semibold">File Upload Debug</h1>
              <p className="text-xs text-muted-foreground">
                Every upload pattern in the app, side by side. Each row shows the
                raw error so you can pinpoint the failure cause.
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void refreshSession()}
            className="gap-1.5"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh session
          </Button>
        </header>

        {/* Configuration */}
        <section className="rounded-lg border border-border bg-card overflow-hidden">
          <div className="flex items-center gap-2 border-b border-border bg-muted/40 px-3 py-1.5">
            <Server className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-medium">Configuration</h2>
          </div>
          <div className="p-3 space-y-3 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <Field label="Backend URL" value={baseUrl ?? "(not configured)"} mono />
              <Field
                label="JWT"
                value={jwt ? `${jwt.slice(0, 8)}…${jwt.slice(-6)}` : "—"}
                mono
              />
              <Field label="User" value={userEmail ?? userId ?? "(no session)"} mono />
            </div>
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground">
                Active server
              </p>
              <div className="flex flex-wrap gap-1.5">
                {allServerHealth.map((row) => (
                  <button
                    key={row.env}
                    type="button"
                    onClick={() => onSwitchServer(row.env)}
                    disabled={!row.isConfigured}
                    className={cn(
                      "flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs transition-colors disabled:cursor-not-allowed disabled:opacity-50",
                      row.isActive
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border hover:bg-accent",
                    )}
                  >
                    <span className="font-medium">{row.env}</span>
                    <span className="text-[10px] text-muted-foreground font-mono">
                      {row.resolvedUrl?.replace(/^https?:\/\//, "") ?? "—"}
                    </span>
                  </button>
                ))}
              </div>
              {activeHealth && (
                <p className="text-[11px] text-muted-foreground">
                  Health: {activeHealth.health.status}
                  {activeHealth.health.latencyMs != null
                    ? ` · ${activeHealth.health.latencyMs}ms`
                    : ""}
                </p>
              )}
            </div>
          </div>
        </section>

        {/* File picker */}
        <section className="rounded-lg border border-border bg-card overflow-hidden">
          <div className="flex items-center gap-2 border-b border-border bg-muted/40 px-3 py-1.5">
            <HardDriveUpload className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-medium">Step 1: Pick a test file</h2>
          </div>
          <div className="p-3 space-y-2 text-xs">
            <div className="flex items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                onChange={onFilePicked}
                className="hidden"
              />
              <Button
                size="sm"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="h-3.5 w-3.5 mr-1.5" />
                Choose file
              </Button>
              {selectedFile ? (
                <>
                  <span className="font-mono">{selectedFile.name}</span>
                  <span className="text-muted-foreground">
                    {fmtBytes(selectedFile.size)} · {selectedFile.type || "unknown"}
                  </span>
                  <button
                    type="button"
                    onClick={() => setSelectedFile(null)}
                    className="ml-auto text-muted-foreground hover:text-foreground"
                    title="Clear"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </>
              ) : (
                <span className="text-muted-foreground">
                  No file picked. Or just paste an image (Cmd/Ctrl+V) — the
                  legacy-public-assets pattern auto-runs.
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Clipboard className="h-3.5 w-3.5" />
              <span>
                Paste an image anywhere on this page to auto-run the
                public-assets path on it.
              </span>
            </div>
          </div>
        </section>

        {/* Patterns */}
        <section className="rounded-lg border border-border bg-card overflow-hidden">
          <div className="flex items-center justify-between gap-2 border-b border-border bg-muted/40 px-3 py-1.5">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-sm font-medium">Step 2: Fire each pattern</h2>
            </div>
            <Button
              size="sm"
              onClick={() => void runAll()}
              disabled={!selectedFile}
            >
              Run all
            </Button>
          </div>
          <div className="p-3 grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs">
            <PatternButton
              label="Legacy hook → uploadFile (default folder)"
              hint='useFileUploadWithStorage("userContent","debug-uploads").uploadFile()'
              running={!!running["useFileUploadWithStorage.uploadFile"]}
              disabled={!selectedFile}
              onClick={() => selectedFile && onLegacyDefault(selectedFile)}
            />
            <PatternButton
              label="Legacy hook → uploadToPublicUserAssets"
              hint="Shared Assets folder (legacy compat)"
              running={!!running["useFileUploadWithStorage.uploadToPublicUserAssets"]}
              disabled={!selectedFile}
              onClick={() => selectedFile && onLegacyPublic(selectedFile)}
            />
            <PatternButton
              label="Legacy hook → uploadToPrivateUserAssets"
              hint="Private Assets folder (legacy compat)"
              running={!!running["useFileUploadWithStorage.uploadToPrivateUserAssets"]}
              disabled={!selectedFile}
              onClick={() => selectedFile && onLegacyPrivate(selectedFile)}
            />
            <PatternButton
              label="cloud-files uploadFiles thunk (direct)"
              hint="ensureFolderPath + uploadFiles + share-link skipped"
              running={!!running["uploadFiles thunk (direct dispatch)"]}
              disabled={!selectedFile}
              onClick={() => selectedFile && onThunkDirect(selectedFile)}
            />
            <PatternButton
              label="useUploadAndGet"
              hint="New hook — returns { fileId } only"
              running={!!running["useUploadAndGet (new hook)"]}
              disabled={!selectedFile}
              onClick={() => selectedFile && onUploadAndGet(selectedFile)}
            />
            <PatternButton
              label="useUploadAndShare"
              hint="New hook — returns { fileId, shareUrl }"
              running={!!running["useUploadAndShare (new hook)"]}
              disabled={!selectedFile}
              onClick={() => selectedFile && onUploadAndShare(selectedFile)}
            />
            <PatternButton
              label="POST /api/images/upload (server-side)"
              hint="Sharp resize + ServerFiles.uploadAndShare"
              running={!!running.server}
              disabled={
                !selectedFile || !selectedFile.type.startsWith("image/")
              }
              onClick={() => selectedFile && onServerImageRoute(selectedFile)}
            />
          </div>
        </section>

        {/* Event log */}
        <section className="rounded-lg border border-border bg-card overflow-hidden">
          <div className="flex items-center justify-between gap-2 border-b border-border bg-muted/40 px-3 py-1.5">
            <h2 className="text-sm font-medium">Event log ({logs.length})</h2>
            {logs.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 gap-1.5 text-xs"
                onClick={clearLogs}
              >
                <X className="h-3 w-3" />
                Clear
              </Button>
            )}
          </div>
          <div className="divide-y divide-border">
            {logs.length === 0 && (
              <div className="p-6 text-center text-sm text-muted-foreground">
                No attempts yet. Pick a file then click a pattern.
              </div>
            )}
            {logs.map((entry) => (
              <LogRow
                key={entry.id}
                entry={entry}
                expanded={!!expanded[entry.id]}
                onToggle={() => toggleExpand(entry.id)}
              />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────

function Field({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="rounded-md border border-border bg-background px-2 py-1.5">
      <div className="text-[11px] text-muted-foreground">{label}</div>
      <div
        className={cn("truncate text-xs", mono && "font-mono")}
        title={value}
      >
        {value}
      </div>
    </div>
  );
}

function PatternButton({
  label,
  hint,
  running,
  disabled,
  onClick,
}: {
  label: string;
  hint: string;
  running: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || running}
      className={cn(
        "flex flex-col items-start gap-0.5 rounded-md border border-border bg-background px-2.5 py-2 text-left transition-colors",
        "hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50",
      )}
    >
      <span className="flex items-center gap-1.5 text-xs font-medium">
        {running ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <HardDriveUpload className="h-3.5 w-3.5" />
        )}
        {label}
      </span>
      <span className="text-[10px] text-muted-foreground font-mono">{hint}</span>
    </button>
  );
}

function LogRow({
  entry,
  expanded,
  onToggle,
}: {
  entry: LogEntry;
  expanded: boolean;
  onToggle: () => void;
}) {
  const Icon = entry.ok ? CheckCircle2 : AlertCircle;
  const iconClass = entry.ok ? "text-success" : "text-destructive";
  return (
    <div className="text-xs">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-muted/50 text-left"
      >
        {expanded ? (
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        )}
        <Icon className={cn("h-3.5 w-3.5 shrink-0", iconClass)} />
        <span className="font-mono w-20 shrink-0 text-muted-foreground">
          {fmtTs(entry.ts)}
        </span>
        <span className="font-mono flex-1 truncate" title={entry.pattern}>
          {entry.pattern}
        </span>
        <span className="font-mono w-14 shrink-0 text-right text-muted-foreground">
          {entry.durationMs}ms
        </span>
      </button>
      {expanded && (
        <div className="bg-muted/30 border-t border-border px-3 py-2 space-y-2 font-mono text-[11px]">
          <Detail label="Target folder" value={entry.target} />
          <Detail
            label="File"
            value={`${entry.fileName} · ${fmtBytes(entry.fileSize)}`}
          />
          {entry.fileId && <Detail label="File ID" value={entry.fileId} mono />}
          {entry.shareUrl && (
            <Detail
              label="Share URL"
              value={entry.shareUrl}
              link={entry.shareUrl}
            />
          )}
          {entry.error && (
            <Detail label="Error" value={entry.error} tone="destructive" />
          )}
          <Detail
            label="Raw response"
            value={JSON.stringify(entry.raw, null, 2)}
            preformatted
          />
        </div>
      )}
    </div>
  );
}

function Detail({
  label,
  value,
  preformatted,
  tone = "default",
  mono,
  link,
}: {
  label: string;
  value: string;
  preformatted?: boolean;
  tone?: "default" | "destructive";
  mono?: boolean;
  link?: string;
}) {
  const toneClass =
    tone === "destructive" ? "text-destructive" : "text-foreground";
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      {preformatted ? (
        <pre
          className={cn(
            "whitespace-pre-wrap break-all rounded border border-border bg-background p-1.5 max-h-64 overflow-auto",
            toneClass,
          )}
        >
          {value || "(empty)"}
        </pre>
      ) : link ? (
        <a
          href={link}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 break-all text-primary hover:underline"
        >
          {value} <ExternalLink className="h-3 w-3" />
        </a>
      ) : (
        <div className={cn("break-all", toneClass, mono && "font-mono")}>
          {value || "—"}
        </div>
      )}
    </div>
  );
}
