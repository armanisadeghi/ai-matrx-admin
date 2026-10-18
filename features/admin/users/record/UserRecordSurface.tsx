"use client";

// The record page's surface emitter (matrx-admin/user-record, S14): the person the admin is looking
// at, from the page's one admin.user_overview read — synchronous, never a fetch (getScope is polled
// while a Surface Context window is open).

import type { ReactNode } from "react";
import { SurfaceRuntimeProvider } from "@ai-matrx/chat/surfaces/runtime/SurfaceRuntimeContext";
import {
  ADMIN_USER_RECORD_SURFACE_NAME,
  createAdminUserRecordScope,
} from "@/features/surfaces/manifests/admin-user-record.manifest";
import { personStatus } from "../lib/accountStatus";
import { attentionOf } from "./UserOverviewTab";
import { actionSubjectOf, personTitle, type UserOverview } from "./userOverview";
import type { UserTabId } from "./userSurfaces";

export function buildUserRecordScope(o: UserOverview, activeTab: UserTabId) {
  const attention = attentionOf(o, () => undefined).map((item) => ({
    kind: item.key.split(":")[0] ?? item.key,
    label: item.label,
    detail: item.detail ?? null,
  }));
  return createAdminUserRecordScope({
    person_id: o.identity.id,
    person_name: personTitle(o),
    person_status: personStatus(actionSubjectOf(o)).label,
    attention_count: attention.length,
    active_tab: activeTab,
    ...(o.identity.email ? { person_email: o.identity.email } : {}),
    ...(o.admin_level ? { person_admin_level: o.admin_level } : {}),
    ...(o.identity.created_at ? { person_created_at: o.identity.created_at } : {}),
    ...(o.identity.last_sign_in_at ? { person_last_sign_in_at: o.identity.last_sign_in_at } : {}),
    ...((o.plan?.name ?? o.usage?.plan_name) ? { plan_name: (o.plan?.name ?? o.usage?.plan_name) as string } : {}),
    ...(o.plan?.source ? { plan_source: o.plan.source } : {}),
    ...(o.usage?.state ? { usage_state: o.usage.state } : {}),
    ...(o.ai ? { ai_requests_30d: o.ai.requests_30d } : {}),
    ...(attention.length ? { attention_items: attention } : {}),
  });
}

export function UserRecordSurface({
  overview,
  activeTab,
  children,
}: {
  overview: UserOverview | null;
  activeTab: UserTabId;
  children: ReactNode;
}) {
  if (!overview) return <>{children}</>;
  return (
    <SurfaceRuntimeProvider
      surfaceName={ADMIN_USER_RECORD_SURFACE_NAME}
      getScope={() => buildUserRecordScope(overview, activeTab)}
    >
      {children}
    </SurfaceRuntimeProvider>
  );
}
