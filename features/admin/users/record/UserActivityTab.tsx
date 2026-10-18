"use client";

// A person's Activity tab (/administration/users/<id>/activity): ONE timeline of everything that
// happened to and by them — admin and org-admin actions, support sessions, sign-ins, account
// closure, conversations started, runs, feedback, notifications, texts, billing events and errors —
// newest first, grouped by day. One read: admin.user_activity (keyset pages, see userActivity.ts).
// The kind chips re-read the server with that kind only; "Load older" walks next_before. A source
// that could not be read is named in an inline notice, never silently missing.

import { useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  Bell,
  Building2,
  CircleAlert,
  Mail,
  History,
  LifeBuoy,
  LogIn,
  MessageSquare,
  MessageSquareWarning,
  ShieldCheck,
  Smartphone,
  UserX,
  WalletCards,
  Workflow,
} from "lucide-react";
import { ErrorNotice } from "@ai-matrx/design-system";
import { Button, EmptyState, RegionSkeleton, Tabs } from "@ai-matrx/design-system/controls";
import { formatRelativeTime } from "@ai-matrx/kit/format";
import AppLink from "@/components/navigation/AppLink";
import { AdminUserRef } from "../components/AdminUserRef";
import { useRecordLoad } from "./useRecordLoad";
import {
  ACTIVITY_KINDS,
  ACTIVITY_KIND_LABEL,
  activityRecordHref,
  appendActivityPage,
  fetchActivityPage,
  groupActivityByDay,
  isActivityKind,
  type ActivityItem,
  type ActivityKind,
  type ActivityPage,
} from "./userActivity";
import type { UserTabBodyProps } from "./UserRecordPage";

type Filter = "all" | ActivityKind;

const KIND_ICON: Record<ActivityKind, LucideIcon> = {
  admin: ShieldCheck,
  org_admin: Building2,
  support: LifeBuoy,
  sign_in: LogIn,
  account: UserX,
  conversation: MessageSquare,
  run: Workflow,
  feedback: MessageSquareWarning,
  notification: Bell,
  sms: Smartphone,
  contact: Mail,
  billing: WalletCards,
  error: CircleAlert,
};

const FILTERS: { value: Filter; label: string }[] = [
  { value: "all", label: "All" },
  ...ACTIVITY_KINDS.map((k) => ({ value: k, label: ACTIVITY_KIND_LABEL[k] })),
];

const kindsOf = (filter: Filter): ActivityKind[] | null => (filter === "all" ? null : [filter]);

// Stable fetchers, one per filter (useRecordLoad wants a stable function, never an inline closure).
const FIRST_PAGE = new Map<Filter, (userId: string) => Promise<ActivityPage>>();
function firstPageFor(filter: Filter): (userId: string) => Promise<ActivityPage> {
  let fetcher = FIRST_PAGE.get(filter);
  if (!fetcher) {
    fetcher = (userId: string) => fetchActivityPage(userId, null, kindsOf(filter));
    FIRST_PAGE.set(filter, fetcher);
  }
  return fetcher;
}

function exactTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  });
}

function ActivityRow({ item, personId }: { item: ActivityItem; personId: string }) {
  const Icon = isActivityKind(item.kind) ? KIND_ICON[item.kind] : History;
  const href = activityRecordHref(item.record, personId);
  const byOther = item.actor_id && item.actor_id !== personId ? item.actor_id : null;
  const title = href ? (
    <AppLink href={href} className="truncate font-medium text-foreground hover:text-primary">
      {item.title}
    </AppLink>
  ) : (
    <span className="truncate font-medium text-foreground">{item.title}</span>
  );
  return (
    <li className="flex items-start gap-3 py-2" data-testid="user-activity-item" data-kind={item.kind}>
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-baseline gap-2 type-body">
          {title}
          {byOther ? (
            <span className="flex min-w-0 items-baseline gap-1 type-secondary text-muted-foreground">
              by <AdminUserRef userId={byOther} hideEmail />
            </span>
          ) : null}
        </div>
        {item.detail ? <p className="truncate type-secondary text-muted-foreground">{item.detail}</p> : null}
      </div>
      <time dateTime={item.at} title={exactTime(item.at)} className="shrink-0 type-meta text-muted-foreground">
        {formatRelativeTime(item.at)}
      </time>
    </li>
  );
}

// Keyed on person + filter + refresh by the tab, so every switch mounts fresh (skeleton, no old rows).
function ActivityFeed({ userId, filter }: { userId: string; filter: Filter }) {
  const { data: first, loading, error } = useRecordLoad(firstPageFor(filter), userId, 0);
  const [more, setMore] = useState<ActivityPage | null>(null);
  const [olderBusy, setOlderBusy] = useState(false);
  const [olderError, setOlderError] = useState<unknown>(null);

  if (loading) return <RegionSkeleton shape="rows" count={8} twoLine aria-label="Loading activity" />;
  if (error || !first) {
    return (
      <ErrorNotice
        size="inline"
        message="Activity could not load."
        error={error}
        operation="Read activity"
        calls={["admin.user_activity"]}
      />
    );
  }

  const page = more ?? first;
  const failed = page.sources.filter((s) => !s.ok);
  const days = groupActivityByDay(page.items);

  const loadOlder = async () => {
    if (!page.next_before || olderBusy) return;
    setOlderBusy(true);
    setOlderError(null);
    try {
      const next = await fetchActivityPage(userId, page.next_before, kindsOf(filter), undefined, page.next_before_key);
      setMore(appendActivityPage(page, next));
    } catch (e) {
      setOlderError(e);
    } finally {
      setOlderBusy(false);
    }
  };

  return (
    <div className="grid gap-3">
      {failed.length ? (
        <ErrorNotice
          size="inline"
          message={`Unavailable: ${failed.map((s) => (isActivityKind(s.kind) ? ACTIVITY_KIND_LABEL[s.kind] : s.kind)).join(", ")}`}
          error={failed.map((s) => `${s.kind}: ${s.error ?? "failed"}`).join("\n")}
          operation="Read activity sources"
          calls={["admin.user_activity"]}
        />
      ) : null}
      {days.length === 0 ? (
        <EmptyState
          icon={<History />}
          title={filter === "all" ? "No activity yet" : `No ${ACTIVITY_KIND_LABEL[filter].toLowerCase()} yet`}
        />
      ) : (
        days.map((d) => (
          <section key={d.day} aria-label={d.label}>
            <h3 className="type-meta font-medium text-muted-foreground">{d.label}</h3>
            <ul className="divide-y divide-border">
              {d.items.map((item) => (
                <ActivityRow key={item.key} item={item} personId={userId} />
              ))}
            </ul>
          </section>
        ))
      )}
      {olderError ? (
        <ErrorNotice size="inline" message="Older activity could not load." error={olderError} operation="Read older activity" calls={["admin.user_activity"]} />
      ) : null}
      {page.next_before ? (
        <div>
          <Button variant="outline" onClick={() => void loadOlder()} disabled={olderBusy} data-testid="user-activity-older">
            Load older
          </Button>
        </div>
      ) : null}
    </div>
  );
}

export function UserActivityTab({ userId }: UserTabBodyProps) {
  const [filter, setFilter] = useState<Filter>("all");
  const [version, setVersion] = useState(0);
  return (
    <div data-testid="user-activity-tab" className="grid gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Tabs<Filter> variant="capsule" aria-label="Activity kind" value={filter} onValueChange={setFilter} data={FILTERS} />
        <Button variant="quiet" onClick={() => setVersion((v) => v + 1)}>
          Refresh
        </Button>
      </div>
      <ActivityFeed key={`${userId}|${filter}|${version}`} userId={userId} filter={filter} />
    </div>
  );
}
