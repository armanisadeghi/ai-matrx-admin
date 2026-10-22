// record-view: none — a sub-view (domains) inside a record or scope, not the record page; the record's own page carries the section
"use client";

// /organizations/[orgId]/settings/domains — the organization serves its forms, booking pages and
// portal on its own address (book.theirbusiness.com).
//
// Reads go direct to Supabase (iam.org_domains: domains, routes, publishable targets, plan access);
// a route is the admin door iam.org_domain_route_set. Only the Vercel calls (add, check, remove) go
// through /api/organizations/[orgId]/domains, because they need the platform's Vercel token.
// Plan gating: custom_domains.allowed_plans (+ the platform-only plan_exception grant).
// Plan: common-docs/systems/data/custom-data/CUSTOM-DOMAINS.md

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Copy, ExternalLink, RefreshCw } from "lucide-react";
import { RecordPageHeader } from "@/features/shell/components/header/templates/RecordPageHeader";
import { useResolvedOrganization } from "@/features/organizations/hooks";
import { OrganizationAccessGate } from "@/features/organizations/components/OrganizationAccessGate";
import { ErrorNotice } from "@ai-matrx/design-system";
import { Badge, Button, Field, RegionSkeleton, Select } from "@ai-matrx/design-system/controls";
import { useClipboard } from "@ai-matrx/kit/clipboard";
import { createClient } from "@/utils/supabase/client";
import { toast } from "@/lib/toast";
import type { DnsRecord, DomainStatus } from "@/lib/custom-domains/dns-records";
import { OutboundLink } from "@ai-matrx/kit/outbound-react";

/** Same throttle as the edge re-check (lib/custom-domains/recheck.ts). */
const RECHECK_MS = 120_000;

interface Route {
  id: string;
  path_prefix: string;
  target_kind: "form" | "booking" | "portal" | "space";
  target_id: string;
  target_title: string | null;
}

interface Domain {
  id: string;
  host: string;
  status: DomainStatus;
  verification: { records?: DnsRecord[] } | null;
  last_check_at: string | null;
  last_error: string | null;
  routes: Route[];
}

interface Target {
  kind: "form" | "booking" | "space";
  id: string;
  title: string;
}

interface DomainsRead {
  access: {
    allowed: boolean;
    allowed_by: "plan" | "grant" | null;
    allowed_plan_names: string[];
    max: number;
    used: number;
  };
  can_manage: boolean;
  domains: Domain[];
  targets: Target[];
}

const STATUS: Record<DomainStatus, { label: string; tone: "success" | "warning" | "destructive" | "neutral" }> = {
  live: { label: "Live", tone: "success" },
  verifying: { label: "Waiting for DNS", tone: "warning" },
  pending: { label: "Waiting for DNS", tone: "warning" },
  failed: { label: "Not connected", tone: "destructive" },
  removed: { label: "Removed", tone: "neutral" },
};

function planList(names: string[]): string {
  if (names.length <= 1) return names[0] ?? "a bigger plan";
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

export default function OrgDomainsPage() {
  const params = useParams();
  const orgId = params.orgId as string;
  const { organization, organizationId, loading, error, refresh } = useResolvedOrganization(orgId);
  const [read, setRead] = useState<DomainsRead | null>(null);
  const [host, setHost] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!organizationId) return;
    const { data, error: readError } = await createClient()
      .schema("iam")
      .rpc("org_domains", { p_organization_id: organizationId });
    if (readError) toast.error(readError.message);
    else setRead(data as unknown as DomainsRead);
  }, [organizationId]);

  useEffect(() => {
    void (async () => {
      await load();
    })();
  }, [load]);

  // Viewing the page re-checks every domain still waiting for DNS (once per RECHECK_MS per domain),
  // so nobody has to press Check now to see a domain go live. Admins only: the route refuses others.
  const rechecked = useRef(new Set<string>());
  useEffect(() => {
    if (!read?.can_manage || !organizationId) return;
    const stale = read.domains.filter(
      (d) =>
        d.status !== "live" &&
        !rechecked.current.has(d.id) &&
        (!d.last_check_at || Date.now() - new Date(d.last_check_at).getTime() > RECHECK_MS),
    );
    if (stale.length === 0) return;
    stale.forEach((d) => rechecked.current.add(d.id));
    void (async () => {
      await Promise.all(
        stale.map((d) =>
          fetch(`/api/organizations/${organizationId}/domains`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "check", domain_id: d.id }),
          }).catch((thrown: unknown) => console.error(`[domains] re-check of ${d.host} failed`, thrown)),
        ),
      );
      await load();
    })();
  }, [read, organizationId, load]);

  const api = useCallback(
    async (method: "POST" | "DELETE", body?: Record<string, string>, query = "") => {
      if (!organizationId) return null;
      const response = await fetch(`/api/organizations/${organizationId}/domains${query}`, {
        method,
        headers: body ? { "Content-Type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
      const answer = (await response.json().catch(() => ({}))) as { error?: string; status?: DomainStatus };
      if (!response.ok) {
        toast.error(answer.error ?? "The domain service did not answer.");
        return null;
      }
      return answer;
    },
    [organizationId],
  );

  const header = (
    <RecordPageHeader
      backHref={`/organizations/${orgId}/settings`}
      parents={[
        organization ? { label: organization.name, href: `/organizations/${orgId}` } : { label: "", pending: true, href: `/organizations/${orgId}` },
        { label: "Settings", href: `/organizations/${orgId}/settings` },
      ]}
      record={{ name: "Domains" }}
    />
  );

  if (loading) {
    return (
      <>
        {header}
        <RegionSkeleton />
      </>
    );
  }
  if (error || !organization || !organizationId) {
    return <OrganizationAccessGate orgSlugOrId={orgId} organizationId={organizationId ?? undefined} onRetry={refresh} />;
  }
  if (!read) {
    return (
      <>
        {header}
        <RegionSkeleton />
      </>
    );
  }

  const { access, can_manage: canManage } = read;
  const atLimit = access.used >= access.max;

  async function add() {
    setBusy("add");
    const answer = await api("POST", { action: "add", host });
    setBusy(null);
    if (answer) {
      setHost("");
      toast.success(answer.status === "live" ? "Connected" : "Added — set the DNS records below");
    }
    await load();
  }

  async function check(domainId: string) {
    setBusy(domainId);
    const answer = await api("POST", { action: "check", domain_id: domainId });
    setBusy(null);
    if (answer) toast.success(answer.status === "live" ? "Live" : "Still waiting for DNS");
    await load();
  }

  async function remove(domainId: string) {
    setBusy(domainId);
    const answer = await api("DELETE", undefined, `?domain_id=${domainId}`);
    setBusy(null);
    if (answer) toast.success("Removed");
    await load();
  }

  return (
    <>
      {header}
      <div className="mx-auto max-w-3xl space-y-6 p-4 md:p-6">
        <section className="space-y-4 rounded-lg border border-border bg-card p-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-foreground">Your own domain</h2>
            {access.allowed ? (
              <span className="text-xs text-muted-foreground">
                {access.used} of {access.max} used
              </span>
            ) : (
              <Badge>Not on this plan</Badge>
            )}
          </div>
          {!access.allowed ? (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <p className="flex-1 text-sm text-muted-foreground">
                Available on {planList(access.allowed_plan_names)}.
              </p>
              <Button asChild variant="outline">
                <Link href="/pricing">See plans</Link>
              </Button>
            </div>
          ) : canManage ? (
            <div className="flex flex-col gap-2 sm:flex-row">
              {/* ui-exception: a raw hostname */}
              <Field
                value={host}
                onChange={(event) => setHost(event.target.value)}
                placeholder="book.yourbusiness.com"
                aria-label="Domain"
                disabled={atLimit || busy !== null}
              />
              <Button variant="primary" onClick={add} disabled={!host.trim() || atLimit || busy !== null}>
                Connect domain
              </Button>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">An organization admin can connect a domain.</p>
          )}
          {access.allowed && atLimit && canManage ? (
            <p className="text-sm text-muted-foreground">Remove a domain to connect another.</p>
          ) : null}
        </section>

        {read.domains.map((domain) => (
          <DomainCard
            key={domain.id}
            organizationId={organizationId}
            domain={domain}
            targets={read.targets}
            canManage={canManage}
            busy={busy === domain.id}
            onCheck={() => check(domain.id)}
            onRemove={() => remove(domain.id)}
            onChanged={load}
          />
        ))}
      </div>
    </>
  );
}

function DomainCard({
  organizationId,
  domain,
  targets,
  canManage,
  busy,
  onCheck,
  onRemove,
  onChanged,
}: {
  organizationId: string;
  domain: Domain;
  targets: Target[];
  canManage: boolean;
  busy: boolean;
  onCheck: () => void;
  onRemove: () => void;
  onChanged: () => Promise<void>;
}) {
  const [confirmRemove, setConfirmRemove] = useState(false);
  const status = STATUS[domain.status] ?? STATUS.pending;
  const records = domain.verification?.records ?? [];
  const live = domain.status === "live";

  return (
    <section className="space-y-4 rounded-lg border border-border bg-card p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <h2 className="truncate font-mono text-sm font-semibold text-foreground">{domain.host}</h2>
          {live ? (
            <OutboundLink
              href={`https://${domain.host}`}
              className="text-muted-foreground hover:text-foreground"
              aria-label="Open the domain"
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </OutboundLink>
          ) : null}
        </div>
        <Badge tone={status.tone}>{status.label}</Badge>
      </div>

      {!live && records.length > 0 ? (
        <div className="space-y-2">
          <h3 className="text-xs font-medium text-muted-foreground">Add at your DNS provider</h3>
          <div className="overflow-x-auto rounded-md border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-left text-xs text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 font-medium">Type</th>
                  <th className="px-3 py-2 font-medium">Name</th>
                  <th className="px-3 py-2 font-medium">Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {records.map((record) => (
                  <tr key={`${record.type}-${record.name}-${record.value}`}>
                    <td className="px-3 py-2 font-mono">{record.type}</td>
                    <td className="px-3 py-2"><CopyValue value={record.name} /></td>
                    <td className="px-3 py-2"><CopyValue value={record.value} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
      {domain.last_error ? (
        <ErrorNotice size="inline" message={domain.last_error} operation="Check the domain" className="text-sm" />
      ) : null}

      <RoutesEditor
        organizationId={organizationId}
        domain={domain}
        targets={targets}
        canManage={canManage}
        onChanged={onChanged}
      />

      {canManage ? (
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={onCheck} disabled={busy}>
            <RefreshCw className="mr-1 h-3.5 w-3.5" />
            Check now
          </Button>
          {confirmRemove ? (
            <Button variant="danger" onClick={onRemove} disabled={busy}>
              Remove — its pages stop working
            </Button>
          ) : (
            <Button variant="quiet" onClick={() => setConfirmRemove(true)} disabled={busy}>
              Remove
            </Button>
          )}
        </div>
      ) : null}
    </section>
  );
}

function CopyValue({ value }: { value: string }) {
  const { copyText } = useClipboard();
  return (
    <span className="flex items-center gap-1.5">
      <span className="break-all font-mono">{value}</span>
      <button
        type="button"
        className="shrink-0 text-muted-foreground hover:text-foreground"
        onClick={() => void copyText(value, "Copied")}
        aria-label={`Copy ${value}`}
      >
        <Copy className="h-3.5 w-3.5" />
      </button>
    </span>
  );
}

const PORTAL_VALUE = "portal:";
const KIND_LABEL: Record<"form" | "booking" | "space", string> = { form: "Form", booking: "Booking", space: "Page" };

function RoutesEditor({
  organizationId,
  domain,
  targets,
  canManage,
  onChanged,
}: {
  organizationId: string;
  domain: Domain;
  targets: Target[];
  canManage: boolean;
  onChanged: () => Promise<void>;
}) {
  const [path, setPath] = useState("/");
  const [target, setTarget] = useState("");
  const [saving, setSaving] = useState(false);
  const options = [
    { value: "", label: "Shows…" },
    ...targets.map((t) => ({ value: `${t.kind}:${t.id}`, label: `${KIND_LABEL[t.kind]} · ${t.title}` })),
    { value: PORTAL_VALUE, label: "Portal" },
  ];

  async function save(prefix: string, value: string | null) {
    setSaving(true);
    const [kind, id] = value ? value.split(":") : [null, null];
    const { error } = await createClient()
      .schema("iam")
      .rpc("org_domain_route_set", {
        p_organization_id: organizationId,
        p_domain_id: domain.id,
        p_path_prefix: prefix,
        p_target_kind: kind as string,
        p_target_id: (id || null) as string,
      });
    setSaving(false);
    if (error) toast.error(error.message);
    else {
      setTarget("");
      setPath("/");
      // The host serves the new routes now, not after the edge cache's TTL.
      await fetch(`/api/organizations/${organizationId}/domains`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "purge", domain_id: domain.id }),
      }).catch((thrown: unknown) => console.error("[domains] cache purge failed; the host follows within 60 s", thrown));
    }
    await onChanged();
  }

  function labelFor(route: Route): string {
    if (route.target_kind === "portal") return "Portal";
    return `${KIND_LABEL[route.target_kind]} · ${route.target_title ?? "Untitled"}`;
  }

  return (
    <div className="space-y-2">
      <h3 className="text-xs font-medium text-muted-foreground">What each address shows</h3>
      {domain.routes.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nothing yet — every address shows Not found.</p>
      ) : (
        <div className="divide-y divide-border rounded-md border border-border">
          {domain.routes.map((route) => (
            <div key={route.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
              <span className="font-mono text-foreground">
                {domain.host}
                {route.path_prefix === "/" ? "" : route.path_prefix}
              </span>
              <span className="flex min-w-0 items-center gap-2">
                <span className="truncate text-muted-foreground">{labelFor(route)}</span>
                {canManage ? (
                  <Button variant="quiet" onClick={() => save(route.path_prefix, null)} disabled={saving}>
                    Remove
                  </Button>
                ) : null}
              </span>
            </div>
          ))}
        </div>
      )}
      {canManage ? (
        <div className="grid gap-2 sm:grid-cols-[8rem_1fr_auto] sm:items-center">
          {/* ui-exception: a raw URL path */}
          <Field value={path} onChange={(event) => setPath(event.target.value)} placeholder="/" aria-label="Path" />
          <Select value={target} options={options} onValueChange={setTarget} aria-label="Shows" />
          <Button variant="primary" onClick={() => save(path, target)} disabled={!target || saving}>
            Save
          </Button>
        </div>
      ) : null}
    </div>
  );
}
