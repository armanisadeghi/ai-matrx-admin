"use client";

import { useState } from "react";
import { Loader2, ChevronLeft, ChevronRight, AlertCircle, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Badge,
  Input,
  PropertyRow,
  RowGroup,
  Select,
  SettingRow,
} from "@ai-matrx/design-system/controls";
import { ErrorNotice } from "@ai-matrx/design-system";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "@/lib/toast";
import {
  provisionMcpServer,
  refreshServer,
  type ProvisionMcpServerInput,
  type ProvisionMcpServerResult,
} from "@/features/tool-registry/mcp-admin/services/mcpAdmin.service";
import { ProTextarea } from "@/components/official/ProTextarea";

/**
 * The authored half of the identity step. It lives in `McpServersAdminPage`
 * rather than here so the `matrx-admin/mcp-servers` surface can read it and
 * so the `new_server_draft` write target can stage into it — the wizard is
 * unmounted while closed, and an agent can only write to it while it is (see
 * the manifest's `writeTargets` block). Everything else — slug, transport,
 * auth, URLs, the official badge — stays local to the wizard, because none of
 * it is agent-writable.
 */
export interface McpServerDraft {
  name: string;
  vendor: string;
  category: ProvisionMcpServerInput["category"];
  description: string;
}

interface Props {
  organizationId: string | null;
  existingSlugs: Set<string>;
  /** Page-owned authored fields (see `McpServerDraft`). */
  draft: McpServerDraft;
  /** Patch one or more authored fields — the wizard's own inputs call this. */
  onDraftChange: (patch: Partial<McpServerDraft>) => void;
  /**
   * Provisioning in flight. Owned by the page so the `new_server_draft`
   * handler can refuse a write against a form whose insert is already on its
   * way.
   */
  busy: boolean;
  onBusyChange: (busy: boolean) => void;
  onClose: () => void;
  onCreated: (slug: string) => void;
}

export const CATEGORY_OPTIONS: { value: ProvisionMcpServerInput["category"]; label: string }[] = [
  { value: "productivity", label: "Productivity" },
  { value: "communication", label: "Communication" },
  { value: "design", label: "Design & Content" },
  { value: "developer", label: "Developer & Cloud" },
  { value: "database", label: "Database" },
  { value: "payments", label: "Payments & Commerce" },
  { value: "analytics", label: "Analytics & Data" },
  { value: "crm", label: "CRM & Sales" },
  { value: "storage", label: "File Storage" },
  { value: "ai", label: "AI" },
  { value: "search", label: "Search" },
  { value: "automation", label: "Automation" },
  { value: "other", label: "Other" },
];

const TRANSPORT_OPTIONS: {
  value: ProvisionMcpServerInput["transport"];
  label: string;
  hint: string;
}[] = [
  { value: "http", label: "HTTP", hint: "Streamable HTTP (most common)" },
  { value: "sse", label: "SSE", hint: "Server-Sent Events long-poll" },
  { value: "stdio", label: "stdio", hint: "Local subprocess via npm/pip command" },
];

const AUTH_OPTIONS: {
  value: ProvisionMcpServerInput["authStrategy"];
  label: string;
  hint: string;
}[] = [
  { value: "oauth_discovery", label: "OAuth (RFC 8414 discovery)", hint: "Standard OAuth 2.0 with auto-discovered endpoints" },
  { value: "bearer", label: "Bearer token", hint: "Static bearer token, user-provided" },
  { value: "api_key", label: "API key", hint: "User-provided API key in headers" },
  { value: "env", label: "Environment variables", hint: "Credentials configured server-side" },
  { value: "none", label: "None", hint: "Public / unauthenticated server" },
];

/** The exact category vocabulary — the one source the write handler validates against. */
export const MCP_SERVER_CATEGORY_VALUES: ProvisionMcpServerInput["category"][] =
  CATEGORY_OPTIONS.map((c) => c.value);

type Step = "identity" | "transport" | "review";

export function AddMcpServerDialog({
  organizationId,
  existingSlugs,
  draft,
  onDraftChange,
  busy,
  onBusyChange,
  onClose,
  onCreated,
}: Props) {
  const [step, setStep] = useState<Step>("identity");
  const [slug, setSlug] = useState("");
  // The authored four are page state (see `McpServerDraft`); read them here
  // under the same names the wizard already used.
  const { name, vendor, description, category } = draft;
  const setName = (v: string) => onDraftChange({ name: v });
  const setVendor = (v: string) => onDraftChange({ vendor: v });
  const setDescription = (v: string) => onDraftChange({ description: v });
  const setCategory = (v: ProvisionMcpServerInput["category"]) =>
    onDraftChange({ category: v });
  const [transport, setTransport] = useState<ProvisionMcpServerInput["transport"]>("http");
  const [authStrategy, setAuthStrategy] = useState<ProvisionMcpServerInput["authStrategy"]>("oauth_discovery");
  const [endpointUrl, setEndpointUrl] = useState("");
  const [docsUrl, setDocsUrl] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [isOfficial, setIsOfficial] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const setBusy = onBusyChange;
  const [refreshing, setRefreshing] = useState(false);
  const [result, setResult] = useState<ProvisionMcpServerResult | null>(null);
  const [refreshError, setRefreshError] = useState<string | null>(null);

  const SLUG_RE = /^[a-z0-9][a-z0-9-]*$/;
  const slugValid = SLUG_RE.test(slug);
  const slugClash = existingSlugs.has(slug);

  const identityValid = slugValid && !slugClash && name.trim() !== "" && vendor.trim() !== "";
  const transportValid =
    (transport === "stdio" || endpointUrl.trim() !== "") && authStrategy !== undefined;

  const onProvision = async () => {
    if (!organizationId) {
      toast.error("The platform organization is still loading — try again in a moment.");
      return;
    }
    setBusy(true);
    try {
      const r = await provisionMcpServer({
        organizationId,
        slug,
        name,
        vendor,
        description: description || undefined,
        category,
        transport,
        authStrategy,
        endpointUrl: endpointUrl || undefined,
        docsUrl: docsUrl || undefined,
        websiteUrl: websiteUrl || undefined,
        isOfficial,
      });
      setResult(r);
      toast.success(`Server "${r.server_slug}" provisioned`);

      if (autoRefresh) {
        setRefreshing(true);
        try {
          await refreshServer(r.server_id);
          toast.success("Catalog refresh started");
        } catch (e) {
          // Don't fail the wizard — admin can refresh manually
          setRefreshError(e instanceof Error ? e.message : "Refresh failed");
        } finally {
          setRefreshing(false);
        }
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Provisioning failed");
    } finally {
      setBusy(false);
    }
  };

  const close = () => {
    if (busy || refreshing) return;
    if (result) onCreated(result.server_slug);
    else onClose();
  };

  // ── Result screen ─────────────────────────────────────────────────────────
  if (result) {
    return (
      <Dialog open onOpenChange={(o) => !o && close()}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Check className="h-5 w-5 text-success" />
              Server provisioned
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="type-body text-muted-foreground">
              Four rows were inserted in one transaction. The catalog{" "}
              {refreshing ? "is being fetched now" : autoRefresh ? "fetch was attempted" : "has not been fetched yet"}
              {refreshError && " — but the refresh hit an error"}
              .
            </p>
            {refreshError && (
              <ErrorNotice size="compact" message={refreshError} error={refreshError} />
            )}
            <div className="space-y-2">
              <ResultRow label="MCP server" value={result.server_slug} subtle={result.server_id} href={`/administration/agents/mcp-servers#${result.server_slug}`} />
              <ResultRow label="Executor" value={result.executor} />
              <ResultRow label="System bundle" value={result.bundle_name} subtle={result.bundle_id} href={`/administration/agents/bundles`} />
              <ResultRow label="Lister tool" value={result.lister_name} subtle={result.lister_tool_id} href={`/administration/agents/mcp-tools/${result.lister_tool_id}`} />
            </div>
            <p className="type-secondary text-muted-foreground">
              {result.next_step}
            </p>
          </div>
          <DialogFooter>
            <Button variant="primary" onClick={close} disabled={busy || refreshing}>
              {refreshing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Done"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  // ── Wizard ────────────────────────────────────────────────────────────────
  return (
    <Dialog open onOpenChange={(o) => !o && close()}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add MCP server</DialogTitle>
        </DialogHeader>

        <div className="flex items-center gap-2 -mt-1 mb-1">
          {(["identity", "transport", "review"] as Step[]).map((s, i) => (
            <div
              key={s}
              className={`flex-1 h-1 rounded-full transition-colors ${
                step === s
                  ? "bg-primary"
                  : i <
                      (["identity", "transport", "review"] as Step[]).indexOf(step)
                    ? "bg-primary/60"
                    : "bg-border"
              }`}
            />
          ))}
        </div>

        {step === "identity" && (
          <div className="space-y-3">
            <p className="type-secondary text-muted-foreground">
              Step 1 of 3 — identity. The slug becomes the server's primary key
              and is also used as the executor kind name (<code className="font-mono">mcp.&lt;slug&gt;</code>) and
              auto-bundle name.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="type-label">Slug (URL-safe ID)</Label>
                <Input mono
                  value={slug}
                  onChange={(e) => setSlug(e.target.value.toLowerCase())}
                  placeholder="e.g. notion, linear, custom-search"
                  disabled={busy}
                  autoFocus
                />
                {slug && !slugValid && (
                  <ErrorNotice
                    size="inline"
                    message="Lowercase letters, digits, hyphens. Start with a letter/digit."
                  />
                )}
                {slugClash && (
                  <ErrorNotice size="inline" message={`${slug} already exists.`} />
                )}
              </div>
              <div className="space-y-1.5">
                <Label className="type-label">Display name</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Notion, Linear, Custom Search"
                  disabled={busy}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="type-label">Vendor</Label>
                <Input
                  value={vendor}
                  onChange={(e) => setVendor(e.target.value)}
                  placeholder="e.g. Notion Labs, Inc."
                  disabled={busy}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="type-label">Category</Label>
                <Select
                  aria-label="Category"
                className="w-full"
                  value={category}
                  options={CATEGORY_OPTIONS}
                  onValueChange={(v) => setCategory(v as ProvisionMcpServerInput["category"])}
                  disabled={busy}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="type-label">Description</Label>
              <ProTextarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Short, agent-facing summary of what this server provides"
                rows={2}
                style={{ fontSize: "16px" }}
                disabled={busy}
              />
            </div>
            <RowGroup>
              <SettingRow
                label="Official server"
                line="Mark as vendor-blessed. Surfaces a badge in the user-facing catalog."
              >
                <Switch
                  aria-label="Official server"
                  checked={isOfficial}
                  onCheckedChange={setIsOfficial}
                  disabled={busy}
                />
              </SettingRow>
            </RowGroup>
          </div>
        )}

        {step === "transport" && (
          <div className="space-y-3">
            <p className="type-secondary text-muted-foreground">
              Step 2 of 3 — transport &amp; auth. These determine how matrx-ai
              connects to the server and how user credentials flow.
            </p>
            <div className="space-y-1.5">
              <Label className="type-label">Transport</Label>
              <Select
                aria-label="Transport"
                className="w-full"
                value={transport}
                options={TRANSPORT_OPTIONS.map((t) => ({ value: t.value, label: t.label, meta: t.hint }))}
                onValueChange={(v) => setTransport(v as ProvisionMcpServerInput["transport"])}
                disabled={busy}
              />
            </div>
            {(transport === "http" || transport === "sse") && (
              <div className="space-y-1.5">
                <Label className="type-label">Endpoint URL</Label>
                <Input mono
                  value={endpointUrl}
                  onChange={(e) => setEndpointUrl(e.target.value)}
                  placeholder="https://mcp.example.com/v1"
                  disabled={busy}
                />
                <p className="type-secondary text-muted-foreground">
                  For OAuth-discovery servers, leave blank if the URL comes from
                  the OAuth metadata document.
                </p>
              </div>
            )}
            {transport === "stdio" && (
              <div className="rounded-md border border-warning/40 bg-warning/5 px-3 py-2 type-secondary flex items-start gap-2">
                <AlertCircle className="h-3.5 w-3.5 mt-0.5 text-warning flex-shrink-0" />
                <div>
                  stdio servers are configured per-variant in <code>tool_mcp_config</code>{" "}
                  (command, args, npm/pip package). Add at least one config row
                  after creation for the server to be usable.
                </div>
              </div>
            )}
            <div className="space-y-1.5">
              <Label className="type-label">Auth strategy</Label>
              <Select
                aria-label="Auth strategy"
                className="w-full"
                value={authStrategy}
                options={AUTH_OPTIONS.map((a) => ({ value: a.value, label: a.label, meta: a.hint }))}
                onValueChange={(v) => setAuthStrategy(v as ProvisionMcpServerInput["authStrategy"])}
                disabled={busy}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="type-label">Docs URL (optional)</Label>
                <Input
                  value={docsUrl}
                  onChange={(e) => setDocsUrl(e.target.value)}
                  disabled={busy}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="type-label">Website URL (optional)</Label>
                <Input
                  value={websiteUrl}
                  onChange={(e) => setWebsiteUrl(e.target.value)}
                  disabled={busy}
                />
              </div>
            </div>
          </div>
        )}

        {step === "review" && (
          <div className="space-y-3">
            <p className="type-secondary text-muted-foreground">
              Step 3 of 3 — review &amp; provision. Five rows will be inserted in
              one transaction.
            </p>
            <div className="space-y-2">
              <ReviewRow label="Server" value={`${name} (${slug})`} />
              <ReviewRow label="Vendor" value={vendor} />
              <ReviewRow label="Category" value={category} />
              <ReviewRow label="Transport" value={transport} />
              <ReviewRow label="Auth" value={authStrategy} />
              {endpointUrl && <ReviewRow label="Endpoint" value={endpointUrl} mono />}
              <ReviewRow label="Will create" value={`mcp.${slug} executor kind, ${slug} system bundle, bundle:list_${slug} lister tool`} />
            </div>
            <RowGroup>
              <SettingRow
                label="Auto-fetch catalog after provision"
                line={
                  <>
                    Calls the aidream <code className="font-mono">/api/mcp-connections/&lt;id&gt;/refresh</code> endpoint{" "}
                    immediately after the rows are inserted. Disable if the server
                    isn&apos;t reachable yet.
                  </>
                }
              >
                <Switch
                  aria-label="Auto-fetch catalog after provision"
                  checked={autoRefresh}
                  onCheckedChange={setAutoRefresh}
                  disabled={busy}
                />
              </SettingRow>
            </RowGroup>
          </div>
        )}

        <DialogFooter className="flex items-center justify-between gap-2">
          <Button variant="quiet" onClick={close} disabled={busy}>
            Cancel
          </Button>
          <div className="flex items-center gap-2">
            {step !== "identity" && (
              <Button
                icon={<ChevronLeft />}
                variant="outline"
                onClick={() =>
                  setStep(step === "transport" ? "identity" : "transport")
                }
                disabled={busy}
              >
                Back
              </Button>
            )}
            {step === "identity" && (
              <Button
                iconEnd={<ChevronRight />}
                variant="primary"
                onClick={() => setStep("transport")}
                disabled={busy || !identityValid}
              >
                Next
              </Button>
            )}
            {step === "transport" && (
              <Button
                iconEnd={<ChevronRight />}
                variant="primary"
                onClick={() => setStep("review")}
                disabled={busy || !transportValid}
              >
                Next
              </Button>
            )}
            {step === "review" && (
              <Button variant="primary" onClick={() => void onProvision()} disabled={busy}>
                {busy ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  "Provision server"
                )}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ReviewRow({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return <PropertyRow label={label} value={value} mono={mono} />;
}

function ResultRow({
  label,
  value,
  subtle,
  href,
}: {
  label: string;
  value: string;
  subtle?: string;
  href?: string;
}) {
  return (
    <PropertyRow label={label}>
      <span className="min-w-0">
        {href ? (
          <a href={href} className="font-mono hover:text-primary hover:underline">
            {value}
          </a>
        ) : (
          <code className="font-mono">{value}</code>
        )}
        {subtle && (
          <Badge className="ml-1.5">
            <code className="font-mono">{subtle.slice(0, 8)}…</code>
          </Badge>
        )}
      </span>
    </PropertyRow>
  );
}
