"use client";

/**
 * ShellOrgSwitcher — THE organization control of the app chrome (owner,
 * 2026-09-30: "the ONLY CANONICAL org selector for the sidebar and header").
 *
 * The active organization is always on screen: its own icon, or its
 * abbreviation, in the sidebar's account rail directly above the person
 * (`variant="rail"`), and the same control in the phone's navigation drawer
 * (`variant="drawer"`).
 * It replaced three copies: the header's "Choose organization" chip, the
 * avatar menu's Organization group, and the canvas nav's hand-built drop-up.
 *
 * What it reads and writes is unchanged — `useActiveOrganizationPicker` (the
 * active org from `appContextSlice`, hydrated before first paint by the sync
 * engine's `appContextPolicy` and mirrored to the shared apex cookie by
 * `activeOrgCookieMiddleware`; memberships from the scope tree) and the one
 * sanctioned switch, `chooseActiveOrganization`. The list is the canonical
 * `OrganizationPickerPanel` (search, your own first, "Keep it at the top").
 *
 * Every organization state shows HERE:
 *   - the load ladder always picks one for a person who has one (STATE rule
 *     12: never none, nothing prompts), so the control NEVER asks. The only
 *     way to reach none is belonging to no organization at all → it says
 *     "Create an organization" quietly and the control itself opens /organizations;
 *   - the memberships could not be read → a red dot and a label that says so
 *     (the picker's own notice explains and retries);
 *   - the page's object lives in another of the person's organizations → a
 *     primary dot, and the picker opens with a one-click switch to it
 *     (the offer the header chip used to make — `pageObjectOrganization.ts`);
 *     an object in an organization she is not in is named, quietly.
 *
 * The "Switch to X" offer is the person's own click in the sidebar control
 * (rule 12: "where the person sees and switches it"); opening the record never
 * switches anything — the record already acts in its own organization.
 */

import { useLoadMark } from "@/lib/diagnostics/loadMark";
import { useState } from "react";
import AppLink from "@/components/navigation/AppLink";
import { ArrowRightLeft, Building2, ChevronRight } from "lucide-react";
import { SelectChevron } from "@ai-matrx/design-system";
import { cn } from "@/lib/utils";
import { useAppDispatch } from "@/lib/redux/hooks";
import { chooseActiveOrganization } from "@/lib/redux/thunks/activeOrgBootstrap";
import { useActiveOrganizationPicker } from "@/features/organizations/hooks/useActiveOrganizationPicker";
import { OrganizationPickerPopover } from "@/features/organizations/components/OrganizationPickerPopover";
import { OrganizationMark } from "@ai-matrx/design-system";
import { RailMenuHeader, RAIL_MENU_DIVIDER } from "./RailMenuHeader";
import { MENU_ITEM_CLASS, USER_MENU_PANEL_CLASS } from "@/features/shell/components/header/header-right-menu/menuItemClass";
import { usePageObjectOrganization } from "@/features/shell/pageObjectOrganization";

type Variant = "rail" | "drawer";

export function ShellOrgSwitcher({ variant = "rail" }: { variant?: Variant }) {
  useLoadMark("Org switcher");
  const dispatch = useAppDispatch();
  const [open, setOpen] = useState(false);
  // The closed trigger never asks for the scope tree (startup read); the open menu's panel does.
  const { activeOrgId, activeOrgName, organizations, belongsToNone, loadFailed } =
    useActiveOrganizationPicker({ load: open });
  const objectOrganization = usePageObjectOrganization();

  const active = organizations.find((org) => org.id === activeOrgId) ?? null;
  const name = active?.name ?? activeOrgName ?? null;
  // Never a prompt: the ladder answered with no organization only because the
  // person belongs to none — say so and point at creating one.
  const noOrganization = belongsToNone && !activeOrgId && !name;

  const offer =
    objectOrganization &&
    !objectOrganization.shownByPage &&
    objectOrganization.name &&
    objectOrganization.member === true &&
    objectOrganization.organizationId !== activeOrgId
      ? { id: objectOrganization.organizationId, name: objectOrganization.name }
      : null;
  // An object in an organization she is not a member of (or membership unknown): named, quietly.
  const viewingIn =
    !offer &&
    objectOrganization &&
    !objectOrganization.shownByPage &&
    objectOrganization.name &&
    objectOrganization.organizationId !== activeOrgId
      ? objectOrganization.name
      : null;

  // Never a placeholder word: the name is the painted/cached one, or "Create
  // an organization" when the person belongs to none, or — while the name is
  // still on its way — a skeleton in its place.
  const nameLoading = !name && !noOrganization;
  const label: string | null = name ?? (noOrganization ? "Create an organization" : null);
  const labelNode = label ?? (
    <span
      className="block h-3 w-24 animate-pulse rounded bg-muted"
      data-org-name-skeleton=""
      aria-hidden="true"
    />
  );
  const description = loadFailed
    ? `Organization: ${name ?? "unknown"}. Your organizations could not be loaded`
    : offer
      ? `Organization: ${name ?? "unknown"}. This page lives in ${offer.name}`
      : name
        ? `Organization: ${name}. Change organization`
        : noOrganization
          ? "Create an organization"
          : "Organization name is loading";

  const mark = (
    <span className="relative flex shrink-0 items-center justify-center">
      {name ? (
        <OrganizationMark
          id={active?.id ?? activeOrgId}
          name={name}
          abbreviation={active?.abbreviation}
          logoUrl={active?.logo_url}
          size={24}
        />
      ) : (
        <span
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground"
          aria-hidden="true"
        >
          <Building2 className="h-3.5 w-3.5" strokeWidth={2} />
        </span>
      )}
      {loadFailed || offer ? (
        <span
          className={cn(
            "pointer-events-none absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full ring-2 ring-background",
            loadFailed ? "bg-destructive" : "bg-primary",
          )}
          data-org-offer-dot={offer ? "" : undefined}
          data-org-load-failed={loadFailed ? "" : undefined}
          aria-hidden="true"
        />
      ) : null}
    </span>
  );

  // The menu's header — the same row the Settings and account menus open with.
  // It names the active organization and opens its page; the list below
  // highlights the same row.
  const menuHeader = (
    <RailMenuHeader
      mark={
        name ? (
          <OrganizationMark
            id={active?.id ?? activeOrgId}
            name={name}
            abbreviation={active?.abbreviation}
            logoUrl={active?.logo_url}
            size={28}
          />
        ) : (
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <Building2 className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
          </span>
        )
      }
      title={name ?? (noOrganization ? "Create an organization" : "")}
      titleNode={
        nameLoading ? (
          <span
            className="block h-3.5 w-28 animate-pulse rounded bg-muted"
            data-org-name-skeleton=""
            aria-hidden="true"
          />
        ) : undefined
      }
      subtitle={name ? "Organization" : null}
      href={active ? `/organizations/${active.slug || active.id}` : "/organizations"}
      onNavigate={() => setOpen(false)}
    />
  );

  const notice = viewingIn ? (
    <p
      className="mb-1 flex items-center gap-2 px-2.5 py-1.5 type-secondary text-muted-foreground"
      data-page-object-organization-viewing=""
    >
      <Building2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      <span className="min-w-0 truncate">This page is in {viewingIn}</span>
    </p>
  ) : offer ? (
    <button
      type="button"
      onClick={() => {
        dispatch(chooseActiveOrganization({ id: offer.id, name: offer.name }));
        setOpen(false);
      }}
      data-page-object-organization={offer.id}
      className="mb-1 flex w-full items-center gap-2 rounded-md bg-primary/10 px-2.5 py-2 text-left text-sm text-primary-ink hover:bg-primary/15"
    >
      <ArrowRightLeft className="h-4 w-4 shrink-0" aria-hidden="true" />
      <span className="min-w-0 flex-1 truncate">Switch to {offer.name}</span>
    </button>
  ) : null;

  const header = (
    <>
      {menuHeader}
      {notice}
      {RAIL_MENU_DIVIDER}
    </>
  );

  const trigger =
    variant === "rail" ? (
      <button
        type="button"
        aria-label={description}
        title={label ?? undefined}
        data-shell-org-switcher="rail"
        className="shell-nav-item shell-nav-stable shell-tactile-subtle"
      >
        <span className="shell-nav-icon">{mark}</span>
        <span className="shell-nav-label">{labelNode}</span>
        <ChevronRight size={14} strokeWidth={1.75} className="shell-nav-flyout-caret" aria-hidden="true" />
      </button>
    ) : (
      <button
        type="button"
        aria-label={description}
        data-shell-org-switcher="drawer"
        className="shell-mobile-nav-item w-full"
      >
        <span className="shell-nav-icon">{mark}</span>
        <span className="min-w-0 flex-1 truncate text-left">{labelNode}</span>
        <SelectChevron size="sm" />
      </button>
    );

  // Belonging to none: there is nothing to pick, so the control IS the door —
  // one click to /organizations, never a menu in between.
  if (noOrganization) {
    return (
      <AppLink
        href="/organizations"
        prefetch={false}
        aria-label={description}
        title={label ?? undefined}
        data-shell-org-switcher={variant}
        className={variant === "rail" ? "shell-nav-item shell-nav-stable shell-tactile-subtle" : "shell-mobile-nav-item w-full"}
      >
        <span className="shell-nav-icon">{mark}</span>
        <span className={variant === "rail" ? "shell-nav-label" : "min-w-0 flex-1 truncate text-left"}>{labelNode}</span>
      </AppLink>
    );
  }

  return (
    <OrganizationPickerPopover
      open={open}
      onOpenChange={setOpen}
      side={variant === "rail" ? "right" : "top"}
      align="end"
      header={header}
      trigger={trigger}
      // The account rail's one menu look (owner, 2026-10-01: "make all 3 identical").
      contentClassName={USER_MENU_PANEL_CLASS}
      panelProps={{ hideHeading: true, itemClassName: MENU_ITEM_CLASS }}
    />
  );
}
