"use client";

/**
 * Organizations launcher — the parent to the org workspace.
 *
 * A polished home that lists every organization the user belongs to as
 * rich cards (logo, role, members, created), with search and a create action.
 * Matches the OrgWorkspace aesthetic (gradient accents, single scroll, semantic
 * surfaces). Client component — same interactive-dashboard pattern as the rest
 * of the org surfaces.
 */

import React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Building2,
  Crown,
  Shield,
  User as UserIcon,
  Plus,
  Users,
  Settings,
  ArrowRight,
  Calendar,
  ExternalLink,
  FolderTree,
  Network,
} from "lucide-react";
import { format } from "date-fns";
import RouteHeader from "@/features/shell/components/header/RouteHeader";
import { useIsMobile } from "@ai-matrx/kit/media-query";
import { TapTargetButtonSolid } from "@ai-matrx/design-system/tap-target";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArchivedDisclosure, Skeleton } from "@ai-matrx/design-system";
import { ProInput } from "@/components/official/ProInput";
import { usePagedOrganizations } from "@/features/organizations/hooks/usePagedOrganizations";
import { getUserOrganizationsPage } from "@/features/organizations/service";
import { CreateOrgModal } from "@/features/organizations/components/CreateOrgModal";
import { OrganizationAbbreviation } from "@/features/organizations/components/OrganizationAbbreviation";
import { OrganizationsStats } from "@/features/organizations/components/OrganizationsStats";
import { OrgScopeTree } from "@/features/organizations/components/OrgScopeTree";
import type {
  OrganizationWithRole,
  OrgRole,
} from "@/features/organizations/types";
import {
} from "@/features/organizations/types";
import { InlineMediaRef } from "@ai-matrx/media/react";
import { ReferencesBulkCopyButton } from "@/features/matrx-envelope/components/ReferencesBulkCopyButton";
import { EntityRef } from "@/components/official/entity-ref/EntityRef";
import { useAppSelector, useAppStore } from "@/lib/redux/hooks";
import type { RootState } from "@/lib/redux/rootReducer";
import type { ScopeTypeWithScopes } from "@ai-matrx/records/scopes";

// The canonical scope tree (scopesTree, ensured app-wide at boot) — this page
// read agent-context's scopeTypes / scopes slices until 2026-09-25.
const NO_SCOPE_TYPES: ScopeTypeWithScopes[] = [];
const scopeTypesOfOrg = (state: RootState, orgId: string): ScopeTypeWithScopes[] =>
  state.scopesTree.organizations[orgId]?.scope_types ?? NO_SCOPE_TYPES;
import { useScopeSuggestions } from "@/features/kg-suggestions/hooks/useScopeSuggestions";
import { KgSuggestionHint } from "@/features/kg-suggestions/components/KgSuggestionHint";
import type { UseScopeSuggestionsResult } from "@/features/kg-suggestions/hooks/useScopeSuggestions";
import { SurfaceRuntimeProvider } from "@ai-matrx/chat/surfaces/runtime/SurfaceRuntimeContext";
import { NonEditableContextMenu } from "@ai-matrx/context-menu/react";
import {
  ORGANIZATIONS_SURFACE_NAME,
  createOrganizationsScope,
} from "@/features/surfaces/manifests/organizations.manifest";
import { CopyButtons } from "@/components/agent-copy/CopyButtons";
import { ExportMenu } from "@/components/agent-copy/ExportMenu";
import { csvExportItem, jsonExportItem } from "@/components/agent-copy/export";
import {
  buildOrganizationCardPayload,
  buildOrganizationListPayload,
  organizationCsvRows,
  organizationKpis,
  organizationListHuman,
  organizationRow,
  organizationSummary,
  type OrganizationKpis,
} from "@/features/organizations/lib/copy";
import { organizationLogoRef } from "@/features/organizations/lib/organization-logo";
import { ErrorAlchemyMenu } from "@/components/errors/ErrorAlchemyMenu";
import { OutboundLink } from "@ai-matrx/kit/outbound-react";

interface RoleMeta {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  bar: string;
  text: string;
  bg: string;
}

const ROLE_META: Record<OrgRole, RoleMeta> = {
  owner: {
    label: "Owner",
    icon: Crown,
    bar: "bg-amber-500",
    text: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-500/10",
  },
  admin: {
    label: "Admin",
    icon: Shield,
    bar: "bg-blue-500",
    text: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-500/10",
  },
  member: {
    label: "Member",
    icon: UserIcon,
    bar: "bg-slate-400",
    text: "text-muted-foreground",
    bg: "bg-muted",
  },
};

function OrgCard({
  org,
  suggestions,
  kpis,
}: {
  org: OrganizationWithRole;
  suggestions: UseScopeSuggestionsResult;
  /** The launcher's leading stats — carried into every card payload. */
  kpis: OrganizationKpis;
}) {
  const router = useRouter();
  const [isPending, startTransition] = React.useTransition();
  // Every organization shows the viewer's REAL role in it.
  const meta = ROLE_META[org.role];
  const RoleIcon = meta.icon;
  const href = `/organizations/${org.slug}`;

  // Scope data for the embedded Context tree + stats. OrgScopeTree dispatches
  // the fetch; these selectors read the same store.
  const scopeTypes = useAppSelector((s) => scopeTypesOfOrg(s, org.id));
  const scopes = scopeTypes.flatMap((type) => type.scopes);
  const orgSuggestions = scopes.flatMap((sc) => suggestions.forScope(sc.id));

  function open() {
    startTransition(() => router.push(href));
  }

  return (
    <Card className="group/org relative overflow-hidden flex flex-col hover:border-primary/40 hover:shadow-sm transition-all">
      <span className={`absolute inset-x-0 top-0 h-1 ${meta.bar} opacity-80`} />
      {isPending && (
        <div className="absolute inset-0 bg-background/70 backdrop-blur-sm z-10 flex items-center justify-center">
          <EntityRef
            token="organization"
            id={org.id}
            name={org.name}
            href={href}
            showIcon={false}
            className="text-sm text-muted-foreground"
            labelClassName="font-medium"
          >
            Opening {org.name}…
          </EntityRef>
        </div>
      )}

      <div className="p-5 flex flex-col gap-4 flex-1">
        {/* Header */}
        <div className="flex items-start gap-3.5">
          <div className="flex-shrink-0 w-14 h-14 rounded-xl overflow-hidden bg-muted flex items-center justify-center border border-border">
            <InlineMediaRef
              ref={organizationLogoRef(org)}
              size="fill"
              fit="cover"
              rounded="none"
              fallbackIcon={
                <span
                  className={`w-full h-full flex items-center justify-center ${meta.bg}`}
                >
                  <OrganizationAbbreviation
                    abbreviation={org.abbreviation}
                    className={`text-sm ${meta.text}`}
                  />
                </span>
              }
              alt={org.name}
            />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-lg truncate">
              <EntityRef
                token="organization"
                id={org.id}
                name={org.name}
                showIcon={false}
              />
            </h3>
            <div className="flex items-center gap-2 flex-wrap mt-0.5">
              <OrganizationAbbreviation
                abbreviation={org.abbreviation}
                className="h-5 min-w-8 rounded border border-border bg-muted px-1.5 text-[10px] text-muted-foreground"
              />
              <Badge
                variant="outline"
                className={`text-[10px] gap-1 ${meta.text}`}
              >
                <RoleIcon className="h-3 w-3" />
                {meta.label}
              </Badge>
              {org.archivedAt && (
                <Badge
                  data-testid="organization-archived-badge"
                  variant="outline"
                  className="text-[10px] gap-1 border-amber-300 text-amber-800 dark:border-amber-800 dark:text-amber-200"
                >
                  Archived
                </Badge>
              )}
              <EntityRef
                token="organization"
                id={org.id}
                name={org.slug}
                showIcon={false}
                className="text-xs text-muted-foreground"
              >
                /{org.slug}
              </EntityRef>
              {orgSuggestions.length > 0 && (
                <span>
                  <KgSuggestionHint
                    variant="badge"
                    rows={orgSuggestions}
                    accept={suggestions.accept}
                    reject={suggestions.reject}
                    defer={suggestions.defer}
                    label={org.name}
                    align="start"
                  />
                </span>
              )}
              {org.website && (
                <OutboundLink
                  href={org.website}
                  className="inline-flex items-center gap-0.5 text-xs text-primary hover:underline"
                  onClick={(e) => e.stopPropagation()}
                >
                  <ExternalLink className="h-3 w-3" />
                  Website
                </OutboundLink>
              )}
            </div>
          </div>
        </div>

        {org.description && (
          <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
            {org.description}
          </p>
        )}

        {/* Stats */}
        <div className="flex items-center gap-4 flex-wrap text-xs">
          <StatChip
            icon={<Users className="h-3.5 w-3.5" />}
            value={org.memberCount ?? 1}
            label={org.memberCount === 1 ? "member" : "members"}
            href={`/organizations/${org.slug}/settings#members`}
          />
          <StatChip
            icon={<FolderTree className="h-3.5 w-3.5" />}
            value={scopeTypes.length}
            label={scopeTypes.length === 1 ? "dimension" : "dimensions"}
            href={`/organizations/${org.slug}/scopes`}
          />
          <StatChip
            icon={<Network className="h-3.5 w-3.5" />}
            value={scopes.length}
            label={scopes.length === 1 ? "scope" : "scopes"}
            href={`/organizations/${org.slug}/scopes`}
          />
          {org.createdAt && (
            <span className="flex items-center gap-1 text-muted-foreground">
              <Calendar className="h-3.5 w-3.5" />
              {format(new Date(org.createdAt), "MMM yyyy")}
            </span>
          )}
        </div>

        {/* Context scope tree */}
        <div className="rounded-lg border border-border bg-muted/20 p-3 flex-1">
          <div className="flex items-center gap-1.5 mb-2">
            <FolderTree className="h-3.5 w-3.5 text-sky-600 dark:text-sky-400" />
            <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Scopes
            </span>
          </div>
          <div className="max-h-56 overflow-y-auto">
            <OrgScopeTree orgId={org.id} slug={org.slug} />
          </div>
        </div>
      </div>

      {/* Footer actions */}
      <div className="flex items-center gap-2 px-5 py-3 border-t border-border bg-card">
        <Button iconEnd={<ArrowRight />} variant="primary" onClick={open} className="flex-1">
          Open workspace
        </Button>
        <Button asChild variant="outline">
          <Link href={`/organizations/${org.slug}/settings`}>
            <Settings className="h-3.5 w-3.5 mr-1.5" />
            Manage
          </Link>
        </Button>
        <CopyButtons
          size="xs"
          label={org.name}
          className="lg:opacity-0 lg:group-hover/org:opacity-100 lg:focus-within:opacity-100 transition-opacity"
          human={() => organizationSummary(org)}
          json={() => organizationRow(org)}
          agent={() =>
            buildOrganizationCardPayload({
              org,
              kpis,
              scopeTypeCount: scopeTypes.length,
              scopeCount: scopes.length,
            })
          }
        />
      </div>
    </Card>
  );
}

function StatChip({
  icon,
  value,
  label,
  href,
}: {
  icon: React.ReactNode;
  value: React.ReactNode;
  label: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="flex min-h-11 items-center gap-1.5 rounded-md text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {icon}
      <span className="font-semibold text-foreground tabular-nums">
        {value}
      </span>
      {label}
    </Link>
  );
}

function OrganizationsLoadingState() {
  return (
    <div
      className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3"
      aria-label="Loading your organizations"
    >
      {Array.from({ length: 3 }, (_, index) => (
        <Card key={index} className="overflow-hidden p-5">
          <div className="flex items-start gap-3.5">
            <Skeleton className="h-14 w-14 shrink-0 rounded-xl" />
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-5 w-2/3" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          </div>
          <div className="mt-5 flex gap-3">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-24" />
          </div>
          <Skeleton className="mt-5 h-28 w-full rounded-lg" />
          <div className="mt-4 flex gap-2">
            <Skeleton className="h-9 flex-1" />
            <Skeleton className="h-9 w-24" />
          </div>
        </Card>
      ))}
    </div>
  );
}

/** The archived organizations: counted on mount (one small read), listed only once the disclosure is opened. */
function ArchivedOrganizationsSection({
  suggestions,
  kpis,
}: {
  suggestions: UseScopeSuggestionsResult;
  kpis: OrganizationKpis;
}) {
  const [open, setOpen] = React.useState(false);
  const [total, setTotal] = React.useState<number | null>(null);
  React.useEffect(() => {
    let live = true;
    void getUserOrganizationsPage({ archiveFilter: "archived", limit: 10 }).then(
      (page) => live && setTotal(page.total),
      () => live && setTotal(0),
    );
    return () => {
      live = false;
    };
  }, []);
  if (!total) return null;
  return (
    <ArchivedDisclosure count={total} open={open} onOpenChange={setOpen}>
      {open ? <ArchivedOrganizationsGrid suggestions={suggestions} kpis={kpis} /> : null}
    </ArchivedDisclosure>
  );
}

function ArchivedOrganizationsGrid({
  suggestions,
  kpis,
}: {
  suggestions: UseScopeSuggestionsResult;
  kpis: OrganizationKpis;
}) {
  const archived = usePagedOrganizations("archived");
  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
        {archived.organizations.map((org) => (
          <OrgCard key={org.id} org={org} suggestions={suggestions} kpis={kpis} />
        ))}
      </div>
      {archived.hasMore ? (
        <div className="mt-3 flex justify-center">
          <Button variant="outline" disabled={archived.loadingMore} onClick={archived.loadMore}>
            {archived.loadingMore ? "Loading…" : "Show more"}
          </Button>
        </div>
      ) : null}
    </>
  );
}

export default function OrganizationsPage() {
  // THE ARCHIVED-ITEMS LAW (Arman, 2026-09-09). This page asks for "all" so it
  // can offer the reveal itself, then hides the archived organizations behind
  // ArchivedDisclosure — closed by default, one click to open. `organizations`
  // below stays the LIVE list, so the stats, the search, the KPIs, the copy and
  // the surface runtime are unchanged. An archived organization is CLOSED, not
  // deleted: nobody can reach anything inside it, nothing bound to it runs, and
  // an owner can restore it from its own settings page at any time.
  // BOUNDED ORGANIZATIONS (2026-10-17): the live organizations are a PAGE (last used first); the
  // search box asks the server and "Show more" pages. Archived ones load only when that disclosure
  // is opened (`ArchivedOrganizationsSection`).
  const paged = usePagedOrganizations();
  const { loading, error, refresh } = paged;
  const organizations = paged.organizations;
  const totalLive = paged.total ?? organizations.length;
  const suggestions = useScopeSuggestions();
  // The shell's "New Org" action lands here as `?create=1` and opens the dialog.
  const searchParams = useSearchParams();
  const [createOpen, setCreateOpen] = React.useState(
    () => searchParams?.get("create") === "1",
  );
  const query = paged.query;
  const setQuery = paged.setQuery;
  const isMobile = useIsMobile();
  const store = useAppStore();

  // `organizations` already answers the query (the server's matches while it is a page).
  const filtered = organizations;

  // ONE list, every organization under its own name (Arman, 2026-09-11: use
  // the real name, always).
  const kpis = organizationKpis(organizations);

  // ── Surface runtime (matrx-user/organizations, list mode) ───────────────
  // Built at trigger time only; emits the launcher's full org list — no org
  // is active here, so no org_identity / membership / resources values.
  const getSurfaceScope = () => {
    const state = store.getState();
    return createOrganizationsScope({
      current_view: "list",
      organization_count: organizations.length,
      organizations_summary: organizations.map((o) => {
        const scopeTypes = scopeTypesOfOrg(state, o.id);
        const scopes = scopeTypes.flatMap((type) => type.scopes);
        return {
          id: o.id,
          name: o.name,
          slug: o.slug,
          abbreviation: o.abbreviation,
          description: o.description ?? null,
          website: o.website ?? null,
          role: o.role,
          member_count: o.memberCount ?? null,
          created_at: o.createdAt,
          scope_type_count: scopeTypes.length,
          scope_count: scopes.length,
        };
      }),
      search_query: query || undefined,
      selection: window.getSelection()?.toString() || undefined,
    });
  };

  return (
    <SurfaceRuntimeProvider
      surfaceName={ORGANIZATIONS_SURFACE_NAME}
      getScope={getSurfaceScope}
      isEditable={false}
    >
      <RouteHeader
        left={
          <span className="flex items-center gap-1.5 px-1.5 text-sm font-medium text-foreground">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            Organizations
          </span>
        }
        right={
          <>
            {/* View copy + export live in the page's own header row. Both
                cover ALL organizations, never the search-filtered slice. */}
            {organizations.length > 0 ? (
              <>
                <CopyButtons
                  size="icon"
                  label="All organizations"
                  human={() => organizationListHuman(organizations)}
                  json={() => organizations.map(organizationRow)}
                  agent={() =>
                    buildOrganizationListPayload({
                      organizations,
                      searchQuery: query,
                    })
                  }
                />
                <ExportMenu
                  label="Organizations"
                  items={[
                    jsonExportItem(() => organizations.map(organizationRow)),
                    csvExportItem(
                      () => organizationCsvRows(organizations),
                      "CSV (all organizations)",
                    ),
                  ]}
                />
              </>
            ) : null}
            <TapTargetButtonSolid
              icon={<Plus className="h-4 w-4" />}
              label={isMobile ? undefined : "New organization"}
              ariaLabel="New organization"
              onClick={() => setCreateOpen(true)}
            />
          </>
        }
      />
      <NonEditableContextMenu
        // SourceFeature has no Organizations literal; the existing org resource
        // surface uses the canonical generic system attribution for this reason.
        sourceFeature="system"
        surfaceName={ORGANIZATIONS_SURFACE_NAME}
        getApplicationScope={getSurfaceScope}
        contentSource={{ type: "raw" }}
      >
        <div
          className="h-full overflow-y-auto bg-textured pt-[var(--shell-header-h)]"
          data-surface-value="current_view"
        >
          <div className="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 py-4 md:py-6 space-y-6">
            {/* Stats + search */}
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div data-surface-value="organization_count">
                <OrganizationsStats
                  loading={loading}
                  organizationCount={totalLive}
                />
              </div>

              {(totalLive > 4 || query) && (
                <div
                  className="flex w-full items-center gap-2 sm:w-auto"
                  data-surface-value="search_query"
                >
                  <ProInput
                    enableCleanup={false}
                    aria-label="Search organizations"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search organizations…"
                    wrapperClassName="min-w-0 flex-1 sm:w-80"
                    enableVoice={false}
                    showCopyButton={false}
                    clearable
                    onClear={() => setQuery("")}
                  />
                  {filtered.length > 0 && (
                    <ReferencesBulkCopyButton
                      referenceType="organization"
                      records={filtered.map((o) => ({
                        id: o.id,
                        label: o.name,
                      }))}
                      toastLabel={`${filtered.length} organization${filtered.length === 1 ? "" : "s"}`}
                    />
                  )}
                </div>
              )}
            </div>

            {loading ? (
              <OrganizationsLoadingState />
            ) : error ? (
              <Card className="p-8 text-center border-destructive/40">
                <div className="max-w-sm mx-auto">
                  <h3 className="font-semibold mb-1">
                    We couldn&apos;t load your organizations
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    {error}
                    <ErrorAlchemyMenu error={error} />
                  </p>
                  <Button variant="outline" onClick={refresh}>
                    Try again
                  </Button>
                </div>
              </Card>
            ) : organizations.length === 0 ? (
              <Card className="p-12 text-center">
                <div className="max-w-xs mx-auto">
                  <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                    <Building2 className="h-7 w-7 text-muted-foreground" />
                  </div>
                  <h3 className="font-semibold mb-1">No organizations yet</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Create a team to collaborate, share agents, and build shared
                    knowledge.
                  </p>
                  <Button icon={<Plus />} variant="primary" onClick={() => setCreateOpen(true)}>
                    Create organization
                  </Button>
                </div>
              </Card>
            ) : filtered.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-12">
                No organizations match “{query}”.
              </p>
            ) : (
              <>
                <div data-surface-value="organizations_summary">
                  <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                    {filtered.map((org) => (
                      <OrgCard
                        key={org.id}
                        org={org}
                        suggestions={suggestions}
                        kpis={kpis}
                      />
                    ))}
                  </div>
                </div>
                {paged.hasMore ? (
                  <div className="flex justify-center">
                    <Button variant="outline" disabled={paged.loadingMore} onClick={paged.loadMore}>
                      {paged.loadingMore
                        ? "Loading…"
                        : paged.total !== null
                          ? `Show more (${organizations.length} of ${paged.total})`
                          : "Show more"}
                    </Button>
                  </div>
                ) : null}
                <ArchivedOrganizationsSection suggestions={suggestions} kpis={kpis} />
              </>
            )}
          </div>
        </div>
      </NonEditableContextMenu>

      <CreateOrgModal
        isOpen={createOpen}
        onClose={() => setCreateOpen(false)}
        onSuccess={() => refresh()}
      />
    </SurfaceRuntimeProvider>
  );
}
