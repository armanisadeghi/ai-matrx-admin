"use client";

import { useEffect, useState } from "react";
import { Monitor } from "lucide-react";
import { DesktopProtocolError } from "@ai-matrx/desktop-protocol";
import { ErrorNotice } from "@ai-matrx/design-system";
import { Field, Select } from "@ai-matrx/design-system/controls";

import type { ComputerRunRequest } from "@/features/ai-work/lib/computerChooser";
import type { ComputerConnectionState } from "@/features/ai-work/compose/components/RunsOnStep";

type CodingProvider = "claude" | "codex";
const DEFAULT_ACCOUNT = "__default__";

/** What to do about a coding app that cannot run on that computer, as one short line. Pure. */
export function nextStep(p: { label: string; why: string | null }, name: string): string {
  if (p.why === "not installed") return `${p.label}: install it on ${name}`;
  return `${p.label}: sign in on ${name} in Matrx 2 › Code › Accounts`;
}

type Loaded<T> = { state: "loading" } | { state: "ready"; value: T } | { state: "failed"; reason: string };

function said(error: unknown): string {
  return DesktopProtocolError.from(error).message;
}

/**
 * THE coding-work fields for one Matrx 2 computer — coding app, its saved Codex account, and the
 * folder with that computer's recent folders — asked of the computer itself over its live
 * connection. Shared by /work/new's Runs on and the schedule form's Runs on (never copied). Reports
 * the work once it can run there (null until then).
 */
export function ComputerWorkFields({
  computer,
  connection,
  initial,
  onPlan,
}: {
  computer: { device: { id: string }; name: string };
  connection: ComputerConnectionState;
  initial: ComputerRunRequest | null;
  onPlan: (plan: ComputerRunRequest | null) => void;
}) {
  const { client, status } = connection;
  const kept = initial && initial.deviceId === computer.device.id ? initial : null;
  const live = status.pill === "live";
  const [providers, setProviders] = useState<Loaded<Array<{ provider: CodingProvider; label: string; ready: boolean; why: string | null }>>>({ state: "loading" });
  const [folders, setFolders] = useState<Loaded<string[]>>({ state: "loading" });
  const [accounts, setAccounts] = useState<Loaded<Array<{ id: string; label: string }>>>({ state: "loading" });
  const [provider, setProvider] = useState<CodingProvider>(kept?.provider ?? "claude");
  const [folder, setFolder] = useState(kept?.folder ?? "");
  const [account, setAccount] = useState(kept?.accountProfileId ?? DEFAULT_ACCOUNT);

  useEffect(() => {
    if (!live) return;
    let alive = true;
    void client
      .request("coding.providers", {})
      .then((r) => {
        if (!alive) return;
        setProviders({
          state: "ready",
          value: r.providers.map((p) => ({
            provider: p.provider,
            label: p.label,
            ready: p.installed && p.loggedIn,
            why: !p.installed ? "not installed" : !p.loggedIn ? "not signed in" : null,
          })),
        });
      })
      .catch((e: unknown) => alive && setProviders({ state: "failed", reason: said(e) }));
    void client
      .request("coding.folders.recent", {})
      .then((r) => {
        if (!alive) return;
        const paths = r.folders.filter((f) => f.exists).map((f) => f.path);
        setFolders({ state: "ready", value: paths });
        setFolder((current) => current || paths[0] || "");
      })
      .catch((e: unknown) => alive && setFolders({ state: "failed", reason: said(e) }));
    void client
      .request("apps.profiles.list", { app_key: "codex" })
      .then((r) => {
        if (!alive) return;
        // Only a saved account with a home on this computer can run (the package's own rule).
        setAccounts({ state: "ready", value: r.profiles.flatMap((p) => (p.id && p.folder && p.on_disk ? [{ id: p.id, label: p.display_name }] : [])) });
      })
      .catch((e: unknown) => {
        if (!alive) return;
        const code = DesktopProtocolError.from(e).code;
        // A computer too old to list accounts offers its default sign-in alone (nothing to fix).
        if (code === "PLATFORM_UNSUPPORTED" || code === "UNKNOWN_OPERATION") setAccounts({ state: "ready", value: [] });
        else setAccounts({ state: "failed", reason: said(e) });
      });
    return () => {
      alive = false;
    };
  }, [client, live]);

  const savedAccounts = accounts.state === "ready" ? accounts.value : [];
  // Codex can run on a saved account (its own home) even when its default sign-in is missing.
  const runnable = (p: { provider: CodingProvider; ready: boolean; why: string | null }) =>
    p.ready || (p.provider === "codex" && p.why === "not signed in" && savedAccounts.length > 0);
  const chosenProvider = providers.state === "ready" ? providers.value.find((p) => p.provider === provider) : undefined;
  const defaultSignedIn = Boolean(chosenProvider?.ready);
  const accountOk = provider !== "codex" || defaultSignedIn || account !== DEFAULT_ACCOUNT;
  const ready = live && Boolean(chosenProvider && runnable(chosenProvider)) && accountOk && folder.trim().length > 0;

  useEffect(() => {
    onPlan(
      ready
        ? {
            deviceId: computer.device.id,
            name: computer.name,
            provider,
            folder: folder.trim(),
            accountProfileId: provider === "codex" && account !== DEFAULT_ACCOUNT ? account : null,
          }
        : null,
    );
  }, [ready, computer.device.id, computer.name, provider, folder, account, onPlan]);

  if (!live) {
    return (
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground" data-testid="runs-on-connection">
        <Monitor className="h-3.5 w-3.5" />
        {computer.name}: {status.detail ?? status.label}
      </p>
    );
  }

  return (
    <div className="mt-1 flex flex-col gap-3 rounded-lg border border-border p-3" data-testid="runs-on-form">
      <div className="flex flex-col gap-1.5">
        <span className="text-xs font-medium text-foreground">Coding app</span>
        {providers.state === "failed" ? (
          <ErrorNotice size="inline" className="text-xs" message={`${computer.name} said: ${providers.reason}`} />
        ) : (
          <Select
            aria-label="Coding app"
            value={provider}
            onValueChange={(v) => setProvider(v as CodingProvider)}
            options={
              providers.state === "ready"
                ? providers.value.map((p) => ({ value: p.provider, label: p.why && !runnable(p) ? `${p.label} (${p.why})` : p.label, disabled: !runnable(p) }))
                : [
                    { value: "claude", label: "Claude Code" },
                    { value: "codex", label: "Codex" },
                  ]
            }
          />
        )}
        {providers.state === "ready" &&
          providers.value
            .filter((p) => !runnable(p))
            .map((p) => (
              <p key={p.provider} className="text-xs text-muted-foreground" data-testid={`next-step-${p.provider}`}>
                {nextStep(p, computer.name)}
              </p>
            ))}
      </div>
      {provider === "codex" && (
        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-foreground">Codex account</span>
          {accounts.state === "failed" ? (
            <ErrorNotice size="inline" className="text-xs" message={`${computer.name} said: ${accounts.reason}`} />
          ) : (
            <Select
              aria-label="Codex account"
              value={account}
              onValueChange={setAccount}
              options={[
                { value: DEFAULT_ACCOUNT, label: defaultSignedIn ? "Its signed-in account" : "Choose a saved account", disabled: !defaultSignedIn },
                ...savedAccounts.map((a) => ({ value: a.id, label: a.label })),
              ]}
            />
          )}
        </div>
      )}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="runs-on-folder" className="text-xs font-medium text-foreground">
          Folder on {computer.name}
        </label>
        {folders.state === "ready" && folders.value.length > 0 && (
          <Select
            aria-label="Recent folders"
            value={folders.value.includes(folder) ? folder : ""}
            onValueChange={setFolder}
            options={folders.value.map((path) => ({ value: path, label: path }))}
          />
        )}
        {/* ui-exception: a raw absolute path on the computer, not prose */}
        <Field
          id="runs-on-folder"
          value={folder}
          onChange={(event) => setFolder(event.target.value)}
          placeholder="/Users/you/code/project"
          spellCheck={false}
          autoComplete="off"
        />
        {folders.state === "failed" && <ErrorNotice size="inline" className="text-xs" message={`${computer.name} said: ${folders.reason}`} />}
      </div>
    </div>
  );
}
