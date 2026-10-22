"use client";

/**
 * OrgManage — the organization manage/edit experience.
 *
 * Replaces the old tabbed OrgSettings with a single scrollable, sectioned page
 * that matches the OrgWorkspace aesthetic: an identity header, a sticky section
 * nav (jumps, not tabs — every section stays on the page), and each concern as
 * its own Card. Reuses the existing settings sub-components unchanged; only the
 * shell changed.
 *
 * Scroll is owned by `.shell-main` only — no nested overflow container here.
 */

import React from "react";
import Link from "next/link";
import { useAnchoredSections } from "@/hooks/useAnchoredSections";
import {
  Settings,
  Users,
  UsersRound,
  Mail,
  AlertTriangle,
  Send,
  FolderTree,
  ShieldCheck,
  ChevronRight,
  ExternalLink,
  Crown,
  Shield,
  SlidersHorizontal,
  LayoutTemplate,
  BookA,
  User as UserIcon,
  KeyRound,
  CreditCard,
  Globe,
  UserCog,
  Tags,
  Gauge,
  PlugZap,
  Plug,
  BadgeDollarSign,
  Trash2,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { InlineMediaRef } from "@ai-matrx/media/react";
import { organizationLogoRef } from "@/features/organizations/lib/organization-logo";
import { CrumbTrailHeader } from "@/features/shell/components/header/templates/CrumbTrailHeader";
import {
  canManageInvitations,
  type Organization,
  type OrgRole,
} from "../types";
import { GeneralSettings } from "./GeneralSettings";
import { OrgBatchSavings } from "@/features/batch-savings/OrgBatchSavings";
import { OrgIndustriesSection } from "@/features/industries/components/OrgIndustriesSection";
import { MemberManagement } from "./MemberManagement";
import { TeamManagement } from "./TeamManagement";
import { OrgTrashSection } from "@/features/trash/components/OrgTrashSection";
import { OrgLayoutSection } from "@/features/shell/shell-layout/editor/OrgLayoutSection";
import { InvitationManager } from "./InvitationManager";
import { DangerZone } from "./DangerZone";
import { ArchivedOrganizationBanner } from "./ArchivedOrganizationBanner";
import { OrgEmailTab } from "./OrgEmailTab";
import { OrgPrivacyTab } from "./OrgPrivacyTab";
import { OrgScopeTree } from "./OrgScopeTree";
import { OrgModuleSettings } from "./OrgModuleSettings";
import { OrgHrPeopleSection } from "@/features/hr/entry-points/OrgHrPeopleSection";
import { DictionarySection } from "@/features/dictionary/components/DictionarySection";
import { OrganizationVault } from "@/features/secrets/components/WebVault";
import { OrganizationAbbreviation } from "./OrganizationAbbreviation";
import { OrgCompetitorLabelsSettings } from "@/features/marketing/competitors/OrgCompetitorLabelsSettings";
import { SpendBudgetCard } from "@/features/entitlements/guardrails/SpendBudgetCard";
import { ProviderAccountsSection } from "@/features/organizations/provider-accounts/ProviderAccountsSection";
import { usePageCapture } from "@/components/agent-copy/page-capture/usePageCapture";
import { recordPageCapture } from "@/components/agent-copy/page-capture/pageCapture";
import { PageCaptureButton } from "@/components/agent-copy/page-capture/PageCaptureButton";
import { pushAddressWithoutNavigating } from "@/lib/url-state/addressWithoutNavigating";
import { SectionCard } from "@/features/marketing/components/shared/MarketingUi";

interface OrgManageProps {
  organization: Organization;
  userRole: OrgRole;
  isOwner: boolean;
  isAdmin: boolean;
}

interface SectionDef {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  show: boolean;
  danger?: boolean;
}

export function OrgManage({
  organization,
  userRole,
  isOwner,
  isAdmin,
}: OrgManageProps) {
  const [displayOrganization, setDisplayOrganization] =
    React.useState<Organization>(organization);

  const { contentRef, navRef, activeSection } = useAnchoredSections(
    organization.id,
  );

  // The alchemy capture (lane ALCHEMY-BUTTON): this organization's settings page, the section
  // in view, and the organization; its sections (the data switches) add their own.
  usePageCapture(() =>
    recordPageCapture({
      title: `${displayOrganization.name} settings`,
      route: `/organizations/${displayOrganization.id}/settings`,
      record: { id: displayOrganization.id, name: displayOrganization.name },
      table: { id: null, name: "Organizations" },
      selection: { "Section in view": activeSection ?? null, "Your role": userRole },
      sections: [{ id: "organization", title: "Organization", role: "data", value: displayOrganization }],
    }),
  );

  const canManageSettings = isOwner || isAdmin;
  const canManageMembers = isOwner || isAdmin;
  const mayManageInvitations = canManageInvitations(userRole);
  const canDelete = isOwner;
  const showOrgTrash = canManageMembers;

  const slug = displayOrganization.slug ?? displayOrganization.id;
  const RoleIcon =
    userRole === "owner" ? Crown : userRole === "admin" ? Shield : UserIcon;

  const sections: SectionDef[] = [
    { id: "general", label: "General", icon: Settings, show: true },
    // Every member may SEE the organization's AI budget (it binds them);
    // only an owner/admin may set it — the card itself hides the editor.
    { id: "ai-budget", label: "AI budget", icon: Gauge, show: true },
    { id: "members", label: "Members", icon: Users, show: canManageMembers },
    // Teams are Organization-level: every member sees every team and who is on it;
    // the section itself decides who may change what.
    { id: "teams", label: "Teams", icon: UsersRound, show: true },
    // Lane TRASH-2: members' archived items in this organization, for owners and admins only.
    { id: "trash", label: "Trash", icon: Trash2, show: showOrgTrash },
    {
      id: "invitations",
      label: "Invitations",
      icon: Mail,
      show: mayManageInvitations,
    },
    // SPEC-UI-IA §6 row 93. The section renders NOTHING when HR is off for this
    // org (absent, not disabled), so the nav chip is offered whenever the
    // viewer could act on it and the section itself decides whether there is
    // anything to act on.
    { id: "people", label: "People", icon: UserCog, show: canManageSettings },
    {
      id: "scopes",
      label: "Scopes",
      icon: FolderTree,
      show: canManageSettings,
    },
    {
      id: "mandates",
      label: "Mandates",
      icon: Plug,
      show: canManageSettings,
    },
    {
      id: "competitor-labels",
      label: "Competitor labels",
      icon: Tags,
      show: true,
    },
    {
      id: "modules",
      label: "Modules",
      icon: SlidersHorizontal,
      show: canManageSettings,
    },
    // custom-experience: the sidebar, header and dock members start from, and the lock.
    { id: "layout", label: "Layout", icon: LayoutTemplate, show: canManageSettings },
    {
      id: "configuration",
      label: "Configuration",
      icon: SlidersHorizontal,
      show: canManageSettings,
    },
    {
      id: "change-policy",
      label: "Change policy",
      icon: ShieldCheck,
      show: true,
    },
    {
      id: "keyword-value",
      label: "Keyword value",
      icon: BadgeDollarSign,
      show: canManageSettings,
    },
    {
      id: "system-context",
      label: "System context",
      icon: SlidersHorizontal,
      show: true,
    },
    {
      id: "dictionary",
      label: "Dictionary",
      icon: BookA,
      show: canManageSettings,
    },
    {
      id: "provider-accounts",
      label: "Provider accounts",
      icon: PlugZap,
      show: true,
    },
    {
      id: "vault",
      label: "Secrets",
      icon: KeyRound,
      show: true,
    },
    {
      id: "privacy",
      label: "Privacy",
      icon: ShieldCheck,
      show: canManageSettings,
    },
    { id: "email", label: "Email", icon: Send, show: canManageMembers },
    {
      id: "danger",
      label: "Danger zone",
      icon: AlertTriangle,
      show: canDelete,
      danger: true,
    },
  ].filter((s) => s.show);

  return (
    <>
      <CrumbTrailHeader
        backHref={`/organizations/${slug}`}
        trail={[
          { label: displayOrganization.name, href: `/organizations/${slug}` },
          { label: "Settings" },
        ]}
      />
      <div
        ref={contentRef}
        className="bg-textured pb-6 pt-[var(--shell-header-clearance)] [&_section[id]]:scroll-mt-[var(--section-scroll-clearance)]"
      >
        <div className="max-w-5xl mx-auto p-4 md:p-6 space-y-5">
          {/* An archived organization says so, with the Restore action for those
              who may and a plain sentence for those who may not. It renders
              nothing at all while the organization is live. */}
          <ArchivedOrganizationBanner organization={displayOrganization} />

          {/* Identity header */}
          <Card className="p-5 relative overflow-hidden">
            <span className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-violet-500 via-sky-500 to-emerald-500" />
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 shrink-0 rounded-xl overflow-hidden">
                <InlineMediaRef
                  ref={organizationLogoRef(displayOrganization)}
                  size="fill"
                  fit="cover"
                  rounded="lg"
                  fallbackIcon={
                    <div className="w-full h-full bg-gradient-to-br from-violet-500 to-sky-500 flex items-center justify-center text-white text-xl font-bold">
                      <OrganizationAbbreviation
                        abbreviation={displayOrganization.abbreviation}
                        className="text-sm"
                      />
                    </div>
                  }
                  alt={displayOrganization.name}
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-xl font-bold text-foreground truncate">
                    {displayOrganization.name}
                  </h1>
                  <OrganizationAbbreviation
                    abbreviation={displayOrganization.abbreviation}
                    className="h-5 min-w-8 rounded border border-border bg-muted px-1.5 text-[10px] text-muted-foreground"
                  />
                  <Badge variant="outline" className="text-xs capitalize gap-1">
                    <RoleIcon className="h-3 w-3" />
                    {userRole}
                  </Badge>
                  <PageCaptureButton size="icon" />
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Manage this organization&apos;s identity, members, and
                  settings.
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {canManageMembers && (
                  <Button asChild variant="primary">
                    <Link href={`/organizations/${slug}/admin`}>
                      <UserCog className="h-3.5 w-3.5 mr-1.5" />
                      Manage users
                    </Link>
                  </Button>
                )}
                <Button asChild variant="outline">
                  <Link
                    href={`/organizations/${slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                    Workspace
                  </Link>
                </Button>
              </div>
            </div>
          </Card>

          {/* Sticky section nav */}
          <nav
            ref={navRef}
            aria-label="Settings sections"
            className="sticky top-[var(--shell-header-clearance)] z-20 -mx-4 px-4 md:-mx-6 md:px-6 py-2 bg-background border-b border-border"
          >
            <div className="flex items-center gap-1.5 overflow-x-auto">
              {sections.map((s) => (
                <a
                  key={s.id}
                  href={`#${s.id}`}
                  onClick={(event) => {
                    if (
                      event.button !== 0 ||
                      event.metaKey ||
                      event.ctrlKey ||
                      event.shiftKey ||
                      event.altKey
                    )
                      return;
                    event.preventDefault();
                    const url = new URL(window.location.href);
                    url.hash = s.id;
                    url.searchParams.delete("sectionOffset");
                    pushAddressWithoutNavigating(url);
                    window.dispatchEvent(new HashChangeEvent("hashchange"));
                    document
                      .getElementById(s.id)
                      ?.focus({ preventScroll: true });
                  }}
                  aria-current={activeSection === s.id ? "location" : undefined}
                  className={`inline-flex shrink-0 items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                    activeSection === s.id
                      ? "bg-primary text-primary-foreground"
                      : s.danger
                        ? "text-red-600 dark:text-red-400 hover:bg-red-500/10"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  }`}
                >
                  <s.icon className="h-3.5 w-3.5" />
                  {s.label}
                </a>
              ))}
            </div>
          </nav>

          {!canManageSettings && (
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                View-only access. Contact an admin to make changes.
              </p>
            </div>
          )}

          {/* General */}
          <SectionCard
            anchor="general"
            tabIndex={-1}
            bodyClassName="p-5"
            icon={Settings}
            title="General"
            about="Name, logo, website, and description."
          >
            <GeneralSettings
              organization={displayOrganization}
              canEdit={canManageSettings}
              userRole={userRole}
              onOrganizationUpdated={setDisplayOrganization}
            />
          </SectionCard>

          {/* AI budget — entitlement vs the organization's own ceiling.
              The card is shared with the person's own settings so the two
              surfaces can never disagree on what a limit means. */}
          <SectionCard
            anchor="ai-budget"
            tabIndex={-1}
            bodyClassName="p-5"
            icon={Gauge}
            title="AI budget"
            about="What the plan includes, what this organization has spent, and the lower ceiling it chooses for itself."
          >
            <div className="flex flex-col gap-3">
              <SpendBudgetCard
                organizationId={displayOrganization.id}
                mode="org"
                canEdit={canManageSettings}
              />
              <OrgBatchSavings organizationId={displayOrganization.id} />
            </div>
          </SectionCard>

          {/* Members */}
          {canManageMembers && (
            <SectionCard
              anchor="members"
              tabIndex={-1}
              bodyClassName="p-5"
              icon={Users}
              title="Members"
              about="Who is in this organization and what they can do. Put people who work together on a team, below, and their lists gain a My team view."
            >
              <MemberManagement
                organizationId={displayOrganization.id}
                organizationName={displayOrganization.name}
                orgSlugOrId={slug}
                userRole={userRole}
                isOwner={isOwner}
              />
            </SectionCard>
          )}

          {/* Teams — the grouping behind "my team or department" list defaults. */}
          <SectionCard
            anchor="teams"
            tabIndex={-1}
            bodyClassName="p-5"
            icon={UsersRound}
            title="Teams"
            about="Groups of people inside this organization, like departments. A person can be on several; a team can take its members from an HR department."
          >
            <TeamManagement
              organizationId={displayOrganization.id}
              organizationName={displayOrganization.name}
              canManageTeams={canManageMembers}
            />
          </SectionCard>

          {/* Trash — members' archived items in this organization (owners and admins). */}
          {showOrgTrash && (
            <SectionCard
              anchor="trash"
              tabIndex={-1}
              bodyClassName="p-5"
              icon={Trash2}
              title="Trash"
              about="What members archived here. Restoring puts it back, records it in the audit log and tells its owner; nothing here is deleted for good."
            >
              <OrgTrashSection organizationId={displayOrganization.id} />
            </SectionCard>
          )}

          {/* Invitations */}
          {mayManageInvitations && (
            <SectionCard
              anchor="invitations"
              tabIndex={-1}
              bodyClassName="p-5"
              icon={Mail}
              title="Invitations"
              about="Invite new members by email and manage pending invites."
            >
              <InvitationManager
                organizationId={displayOrganization.id}
                organizationName={displayOrganization.name}
                userRole={userRole}
              />
            </SectionCard>
          )}

          {/* People — the HR module's door into org settings (SPEC-UI-IA §6
              row 93). It CONFIGURES NOTHING: the module toggle lives in Module
              settings below, and every HR setting lives at /hr/settings/*. */}
          {canManageSettings && (
            <SectionCard
              anchor="people"
              tabIndex={-1}
              bodyClassName="p-5"
              icon={UserCog}
              title="People"
              about="Employee records, the directory, and where HR is configured."
            >
              <OrgHrPeopleSection
                organizationId={displayOrganization.id}
                orgSlugOrId={slug}
                canManage={canManageSettings}
              />
            </SectionCard>
          )}

          {/* Scopes — inline tree + edit links */}
          {canManageSettings && (
            <section id="scopes" tabIndex={-1}>
              <Card className="p-5">
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="flex items-center gap-2.5">
                    <span className="h-9 w-9 rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0">
                      <FolderTree className="h-4 w-4" />
                    </span>
                    <div>
                      <h2 className="text-base font-semibold leading-tight">
                        Scopes
                      </h2>
                      <p className="text-xs text-muted-foreground">
                        The dimensions your team works in.
                      </p>
                    </div>
                  </div>
                  <Button
                    asChild
                    variant="outline"
                    className="shrink-0"
                  >
                    <Link href={`/organizations/${slug}/scopes`}>
                      Edit scopes
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Link>
                  </Button>
                </div>
                <OrgScopeTree orgId={displayOrganization.id} slug={slug} />
              </Card>
            </section>
          )}

          {canManageSettings && (
            <SectionCard
              anchor="mandates"
              tabIndex={-1}
              bodyClassName="p-5"
              icon={Plug}
              title="Mandates"
              about="Choose which agent or workflow runs each AI job for this organization. Your choice replaces the system default for every member."
            >
              <Button asChild variant="outline">
                <Link href={`/organizations/${slug}/settings/mandates`}>
                  Manage mandates
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Link>
              </Button>
            </SectionCard>
          )}

          {/* Industries — org's industry memberships (Shared Knowledge Resources) */}
          <section className="px-1">
            <OrgIndustriesSection orgId={displayOrganization.id} />
          </section>

          <SectionCard
            anchor="competitor-labels"
            tabIndex={-1}
            bodyClassName="p-5"
            icon={Tags}
            title="Competitor labels"
            about="Shared labels available in every competitor classification dropdown for this organization."
          >
            <OrgCompetitorLabelsSettings
              orgId={displayOrganization.id}
              orgSlugOrId={slug}
              canEdit={canManageSettings}
            />
          </SectionCard>

          {/* Module settings — per-kind org rules (placeholder tasklist UI) */}
          {canManageSettings && (
            <SectionCard
              anchor="modules"
              tabIndex={-1}
              bodyClassName="p-5"
              icon={SlidersHorizontal}
              title="Module settings"
              about="Org rules for each kind of resource — agents, notes, files, and the rest."
            >
              <OrgModuleSettings
                orgId={displayOrganization.id}
                canEdit={canManageSettings}
              />
            </SectionCard>
          )}

          {canManageSettings && (
            <SectionCard
              anchor="layout"
              tabIndex={-1}
              bodyClassName="p-5"
              icon={LayoutTemplate}
              title="Layout"
              about="The sidebar, header and dock your members start from."
            >
              <OrgLayoutSection organizationId={displayOrganization.id} />
            </SectionCard>
          )}

          {/* Configuration — the org rung of Code → System → Org → User */}
          {canManageSettings && (
            <SectionCard
              anchor="configuration"
              tabIndex={-1}
              bodyClassName="p-5"
              icon={SlidersHorizontal}
              title="Configuration"
              about="Every platform setting this organization may override — the platform default stays visible, your value wins, one click inherits it back."
            >
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <p className="text-sm text-muted-foreground flex-1">
                  Overrides take effect within a minute, with no deploy. HR
                  settings keep their own page under HR.
                </p>
                <Button asChild variant="outline">
                  <Link href={`/organizations/${slug}/settings/configuration`}>
                    Open configuration
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Link>
                </Button>
              </div>
            </SectionCard>
          )}

          {/* API keys — machine credentials (owner-gated, ruling C16) */}
          {isOwner && (
            <SectionCard
              anchor="api-keys"
              tabIndex={-1}
              bodyClassName="p-5"
              icon={KeyRound}
              title="API keys"
              about="Machine credentials for this organization — each key acts as its own service identity, scoped to exactly this org."
            >
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <p className="text-sm text-muted-foreground flex-1">
                  Create a key for CI, integrations, or partner systems; the
                  secret is shown once and revocation is immediate.
                </p>
                <Button asChild variant="outline">
                  <Link href={`/organizations/${slug}/settings/api-keys`}>
                    Open API keys
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Link>
                </Button>
              </div>
            </SectionCard>
          )}

          {/* Payments — collect into the organization's own Stripe account (PAYMENTS-CONNECT) */}
          {canManageSettings && (
            <SectionCard
              anchor="payments"
              tabIndex={-1}
              bodyClassName="p-5"
              icon={CreditCard}
              title="Payments"
              about="Take payments on forms, booking pages and portals."
            >
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <p className="text-sm text-muted-foreground flex-1">Money goes to your own Stripe account.</p>
                <Button asChild variant="outline">
                  <Link href={`/organizations/${slug}/settings/payments`}>
                    Open payments
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Link>
                </Button>
              </div>
            </SectionCard>
          )}

          {/* Domains — forms, booking pages and the portal on the organization's own address (CUSTOM-DOMAINS) */}
          {canManageSettings && (
            <SectionCard
              anchor="domains"
              tabIndex={-1}
              bodyClassName="p-5"
              icon={Globe}
              title="Domains"
              about="Show your forms, booking pages and portal on your own address."
            >
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <p className="text-sm text-muted-foreground flex-1">Like book.yourbusiness.com.</p>
                <Button asChild variant="outline">
                  <Link href={`/organizations/${slug}/settings/domains`}>
                    Open domains
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Link>
                </Button>
              </div>
            </SectionCard>
          )}

          {/* Change policy (C-18) — how AI-proposed changes are handled */}
          <SectionCard
            anchor="change-policy"
            tabIndex={-1}
            bodyClassName="p-5"
            icon={ShieldCheck}
            title="Change policy"
            about="How this organization wants each kind of AI-proposed change handled — automatic, reviewed, or off, per change type."
          >
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <p className="text-sm text-muted-foreground flex-1">
                Six risk tiers with one-click presets, plus per-row overrides
                across the full change-type catalog. Members can request
                changes; owners and admins decide.
              </p>
              <Button asChild variant="outline">
                <Link href={`/organizations/${slug}/settings/change-policy`}>
                  Open change policy
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Link>
              </Button>
            </div>
          </SectionCard>

          {/* Keyword value — the org rung of platform → org → brand → site (KI-046) */}
          {canManageSettings && (
            <SectionCard
              anchor="keyword-value"
              tabIndex={-1}
              bodyClassName="p-5"
              icon={BadgeDollarSign}
              title="Keyword value"
              about="How keywords are valued for every brand and site here."
            >
              <div className="flex justify-end">
                <Button asChild variant="outline">
                  <Link href={`/organizations/${slug}/settings/keyword-value`}>
                    Open keyword value
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Link>
                </Button>
              </div>
            </SectionCard>
          )}

          {/* System context — this organization's own value for a curated System item */}
          <SectionCard
            anchor="system-context"
            tabIndex={-1}
            bodyClassName="p-5"
            icon={SlidersHorizontal}
            title="System context"
          >
            <div className="flex justify-end">
              <Button asChild variant="outline">
                <Link href={`/organizations/${slug}/settings/system-context`}>
                  Open system context
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Link>
              </Button>
            </div>
          </SectionCard>

          {/* Custom Dictionary — org-wide terminology + pronunciation */}
          {canManageSettings && (
            <section id="dictionary" tabIndex={-1}>
              <DictionarySection
                level="organization"
                ownerId={displayOrganization.id}
                ownerName={displayOrganization.name}
                canEdit={canManageSettings}
              />
            </section>
          )}

          {/* Provider-native operating accounts and their organization-Vault coverage. */}
          <SectionCard
            anchor="provider-accounts"
            tabIndex={-1}
            bodyClassName="p-5"
            icon={PlugZap}
            title="Provider accounts"
            about="The exact developer, publisher, partner, and operating accounts this organization uses with external services. Credentials stay in the organization Vault."
          >
            <ProviderAccountsSection organizationId={displayOrganization.id} />
          </SectionCard>

          {/* Organization vault — all members can use/contribute; admins manage. */}
          <SectionCard
            anchor="vault"
            tabIndex={-1}
            bodyClassName="p-5"
            icon={KeyRound}
            title="Organization vault"
            about="Shared API keys and credentials. Members can use values without revealing them."
          >
            <OrganizationVault organizationId={displayOrganization.id} />
          </SectionCard>

          {/* Privacy — OrgPrivacyTab self-cards */}
          {canManageSettings && (
            <section
              id="privacy"
              tabIndex={-1}
              className="scroll-mt-16 space-y-2"
            >
              <SectionHeading
                icon={ShieldCheck}
                title="Privacy & ingestion"
                description="Control automatic knowledge ingestion and daily budget."
              />
              <OrgPrivacyTab
                organizationId={displayOrganization.id}
                canEdit={canManageSettings}
              />
            </section>
          )}

          {/* Email */}
          {canManageMembers && (
            <SectionCard
              anchor="email"
              tabIndex={-1}
              bodyClassName="p-5"
              icon={Send}
              title="Email"
              about="Send a message to everyone in this organization."
            >
              <OrgEmailTab
                organizationId={displayOrganization.id}
                organizationName={displayOrganization.name}
              />
            </SectionCard>
          )}

          {/* Danger zone */}
          {canDelete && (
            <section id="danger" tabIndex={-1}>
              <Card className="p-5 border-amber-200 dark:border-amber-900/50">
                <div className="flex items-center gap-2 mb-1">
                  <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                  <h2 className="text-base font-semibold text-amber-700 dark:text-amber-400">
                    Danger zone
                  </h2>
                </div>
                <p className="text-xs text-muted-foreground mb-4">
                  Closing this organization affects everyone in it. Nothing is
                  deleted, and an owner can undo it.
                </p>
                <DangerZone organization={displayOrganization} />
              </Card>
            </section>
          )}
        </div>
      </div>
    </>
  );
}

function SectionHeading({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description?: string;
}) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="h-9 w-9 rounded-lg bg-muted text-muted-foreground flex items-center justify-center shrink-0">
        <Icon className="h-4 w-4" />
      </span>
      <div>
        <h2 className="text-base font-semibold leading-tight">{title}</h2>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
      </div>
    </div>
  );
}

