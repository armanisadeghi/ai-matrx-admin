"use client";

import React, { useEffect, useState } from "react";
import { Loader2, Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import { setPreference } from "@/lib/redux/slices/userPreferencesSlice";
import type {
  SandboxCreateRequest,
  SandboxTemplate,
  SandboxTemplateListResponse,
  SandboxTier,
} from "@/types/sandbox";
import { extractErrorMessage } from "@/utils/errors";

interface CreateSandboxModalProps {
  open: boolean;
  busy?: boolean;
  onClose: () => void;
  onCreate: (request: SandboxCreateRequest) => Promise<void>;
}

/**
 * Modal for the "New sandbox" flow. Pulls the live template list from
 * `GET /api/templates?tier=…` and persists the user's last-used tier +
 * template id in `userPreferences.coding` so the picker remembers their
 * preference across sessions.
 */
export const CreateSandboxModal: React.FC<CreateSandboxModalProps> = ({
  open,
  busy,
  onClose,
  onCreate,
}) => {
  const dispatch = useAppDispatch();
  const codingPrefs = useAppSelector((s) => s.userPreferences.coding);

  const [tier, setTier] = useState<SandboxTier>(
    codingPrefs?.lastSandboxTier ?? "ec2",
  );
  const [templates, setTemplates] = useState<SandboxTemplate[] | null>(null);
  const [templateId, setTemplateId] = useState<string>(
    codingPrefs?.lastSandboxTemplate ?? "bare",
  );
  const [templateVersion, setTemplateVersion] = useState<string>("");
  const [resourcesEnabled, setResourcesEnabled] = useState(false);
  const [cpu, setCpu] = useState<number | "">(2);
  const [memoryMb, setMemoryMb] = useState<number | "">(2048);
  const [diskMb, setDiskMb] = useState<number | "">(4096);
  const [ttlMinutes, setTtlMinutes] = useState<number | "">(60);
  const [error, setError] = useState<string | null>(null);
  const [loadingTemplates, setLoadingTemplates] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoadingTemplates(true);
    setError(null);
    void (async () => {
      try {
        const resp = await fetch(
          `/api/templates?tier=${encodeURIComponent(tier)}`,
        );
        if (!resp.ok) throw new Error(`Templates fetch failed (${resp.status})`);
        const data = (await resp.json()) as SandboxTemplateListResponse;
        if (cancelled) return;
        setTemplates(data.templates ?? []);
        // If the previously selected template doesn't exist on this tier,
        // fall back to the first available one.
        if (
          data.templates &&
          !data.templates.some((t) => t.id === templateId)
        ) {
          const fallback = data.templates[0]?.id ?? "bare";
          setTemplateId(fallback);
          setTemplateVersion(data.templates[0]?.version ?? "");
        } else {
          const match = data.templates?.find((t) => t.id === templateId);
          if (match) setTemplateVersion(match.version);
        }
      } catch (err) {
        if (!cancelled) {
          setError(extractErrorMessage(err));
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
  }, [open, tier]);

  if (!open) return null;

  const submit = async () => {
    setError(null);
    const request: SandboxCreateRequest = {
      tier,
      template: templateId,
    };
    if (templateVersion) request.template_version = templateVersion;
    if (typeof ttlMinutes === "number" && ttlMinutes > 0) {
      request.ttl_seconds = ttlMinutes * 60;
    }
    if (resourcesEnabled && tier === "hosted") {
      request.resources = {};
      if (typeof cpu === "number" && cpu > 0) request.resources.cpu = cpu;
      if (typeof memoryMb === "number" && memoryMb > 0) {
        request.resources.memory_mb = memoryMb;
      }
      if (typeof diskMb === "number" && diskMb > 0) {
        request.resources.disk_mb = diskMb;
      }
    }
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
    try {
      await onCreate(request);
    } catch (err) {
      setError(extractErrorMessage(err));
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="absolute inset-0 z-30 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-md border border-neutral-300 bg-white text-[12px] shadow-xl dark:border-neutral-700 dark:bg-neutral-950"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-neutral-200 px-3 py-2 dark:border-neutral-800">
          <h2 className="font-semibold">New Sandbox</h2>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="rounded p-1 text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800"
          >
            <X size={14} />
          </button>
        </div>
        <div className="space-y-3 p-3">
          <Field label="Tier">
            <div className="flex h-7 items-center gap-1 rounded-sm bg-neutral-100 p-0.5 dark:bg-neutral-900">
              <Tab active={tier === "ec2"} onClick={() => setTier("ec2")}>
                EC2 (S3-backed)
              </Tab>
              <Tab active={tier === "hosted"} onClick={() => setTier("hosted")}>
                Hosted (heavy)
              </Tab>
            </div>
          </Field>
          <Field label="Template">
            <select
              disabled={loadingTemplates || busy}
              value={templateId}
              onChange={(e) => {
                setTemplateId(e.target.value);
                const match = templates?.find((t) => t.id === e.target.value);
                if (match) setTemplateVersion(match.version);
              }}
              className="h-7 w-full rounded-sm border border-neutral-300 bg-white px-2 text-[12px] dark:border-neutral-700 dark:bg-neutral-900"
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
              <div className="mt-1 text-[10px] text-neutral-500">
                version: {templateVersion}
              </div>
            )}
          </Field>
          <Field label="TTL (minutes)">
            <input
              type="number"
              min={1}
              max={60 * 24}
              value={ttlMinutes}
              onChange={(e) =>
                setTtlMinutes(e.target.value === "" ? "" : Number(e.target.value))
              }
              className="h-7 w-32 rounded-sm border border-neutral-300 bg-white px-2 text-[12px] dark:border-neutral-700 dark:bg-neutral-900"
            />
          </Field>
          {tier === "hosted" && (
            <div className="space-y-2 rounded-sm border border-neutral-200 p-2 dark:border-neutral-800">
              <label className="flex items-center gap-1.5 text-[11px]">
                <input
                  type="checkbox"
                  checked={resourcesEnabled}
                  onChange={(e) => setResourcesEnabled(e.target.checked)}
                />
                Override resources
              </label>
              {resourcesEnabled && (
                <div className="grid grid-cols-3 gap-2">
                  <Field label="CPU" small>
                    <input
                      type="number"
                      min={1}
                      value={cpu}
                      onChange={(e) =>
                        setCpu(
                          e.target.value === "" ? "" : Number(e.target.value),
                        )
                      }
                      className="h-6 w-full rounded-sm border border-neutral-300 bg-white px-1 text-[11px] dark:border-neutral-700 dark:bg-neutral-900"
                    />
                  </Field>
                  <Field label="Memory MB" small>
                    <input
                      type="number"
                      min={256}
                      value={memoryMb}
                      onChange={(e) =>
                        setMemoryMb(
                          e.target.value === "" ? "" : Number(e.target.value),
                        )
                      }
                      className="h-6 w-full rounded-sm border border-neutral-300 bg-white px-1 text-[11px] dark:border-neutral-700 dark:bg-neutral-900"
                    />
                  </Field>
                  <Field label="Disk MB" small>
                    <input
                      type="number"
                      min={512}
                      value={diskMb}
                      onChange={(e) =>
                        setDiskMb(
                          e.target.value === "" ? "" : Number(e.target.value),
                        )
                      }
                      className="h-6 w-full rounded-sm border border-neutral-300 bg-white px-1 text-[11px] dark:border-neutral-700 dark:bg-neutral-900"
                    />
                  </Field>
                </div>
              )}
            </div>
          )}
          {error && (
            <div className="rounded border border-red-300 bg-red-50 px-2 py-1 text-[11px] text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
              {error}
            </div>
          )}
        </div>
        <div className="flex items-center justify-end gap-1 border-t border-neutral-200 px-3 py-2 dark:border-neutral-800">
          <button
            type="button"
            onClick={onClose}
            className="rounded-sm border border-neutral-300 px-2 py-1 text-[11px] text-neutral-700 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-800"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void submit()}
            disabled={busy || loadingTemplates}
            className="flex items-center gap-1 rounded-sm border border-blue-400 bg-blue-500 px-2 py-1 text-[11px] text-white hover:bg-blue-600 disabled:opacity-50"
          >
            {busy ? (
              <Loader2 size={12} className="animate-spin" />
            ) : (
              <Plus size={12} />
            )}
            Create
          </button>
        </div>
      </div>
    </div>
  );
};

const Field: React.FC<{
  label: string;
  small?: boolean;
  children: React.ReactNode;
}> = ({ label, small, children }) => (
  <label className="block">
    <span
      className={cn(
        "mb-1 block text-[11px] text-neutral-600 dark:text-neutral-400",
        small && "text-[10px]",
      )}
    >
      {label}
    </span>
    {children}
  </label>
);

const Tab: React.FC<{
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}> = ({ active, onClick, children }) => (
  <button
    type="button"
    onClick={onClick}
    className={cn(
      "flex h-6 flex-1 items-center justify-center rounded-sm text-[11px] transition-colors",
      active
        ? "bg-white text-neutral-900 shadow-sm dark:bg-neutral-700 dark:text-neutral-100"
        : "text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200",
    )}
  >
    {children}
  </button>
);
