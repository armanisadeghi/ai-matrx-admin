"use client";

// A person's Activity tab (/administration/users/<id>/activity): ONE timeline of everything that
// happened to and by them — admin and org-admin actions, support sessions, sign-ins, account
// closure, conversations started, runs, feedback, notifications, texts, billing events and errors —
// newest first, grouped by day. One read: admin.user_activity (keyset pages, see userActivity.ts).
// The kind chips re-read the server with that kind only; "Load older" walks next_before. A source
// that could not be read is named in an inline notice, never silently missing.

import { useEffect, useMemo, useState } from "react";
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
import { ScopedPersonRef } from "./ScopedPersonRef";
import { ActivityRecordDoor, isPeekRecordType } from "./ActivityRecordDoor";
import { adminActionWords } from "../lib/adminActionWords";
import { useRecordLoad } from "./useRecordLoad";
import {
  ACTIVITY_KIND_LABEL,
  activityCallFor,
  activityKindsFor,
  activityRecordHref,
  appendActivityPage,
  fetchActivityPage,
  groupActivityByDay,
  isActivityKind,
  type ActivityItem,
  type ActivityKind,
  type ActivityPage,
} from "./userActivity";
import type { ScopedTabBodyProps } from "./UserRecordPage";
import type { UserRecordScope } from "./userSurfaces";

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

/** The kind chips this seat's timeline offers. */
function filtersFor(scope: UserRecordScope): { value: Filter; label: string }[] {
  return [{ value: "all", label: "All" }, ...activityKindsFor(scope).map((k) => ({ value: k, label: ACTIVITY_KIND_LABEL[k] }))];
}

const kindsOf = (filter: Filter): ActivityKind[] | null => (filter === "all" ? null : [filter]);

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

function ActivityRow({ item, personId, scope }: { item: ActivityItem; personId: string; scope: UserRecordScope }) {
  const Icon = isActivityKind(item.kind) ? KIND_ICON[item.kind] : History;
  const href = activityRecordHref(item.record, personId, scope);
  const byOther = item.actor_id && item.actor_id !== personId ? item.actor_id : null;
  // Admin rows read in the Admin history tab's words (one formatter for the same audit row).
  const words = item.kind === "admin" || item.kind === "org_admin" ? adminActionWords(item.title) : item.title;
  const peekType = !href && scope.kind !== "organization" && item.record?.id && isPeekRecordType(item.record.type) ? item.record.type : null;
  const title = href ? (
    <AppLink href={href} className="truncate font-medium text-foreground hover:text-primary">
      {words}
    </AppLink>
  ) : peekType && item.record?.id ? (
    <ActivityRecordDoor
      type={peekType}
      id={item.record.id}
      trigger={
        <button type="button" className="truncate text-left font-medium text-foreground hover:text-primary" data-testid="user-activity-peek">
          {words}
        </button>
      }
    />
  ) : (
    <span className="truncate font-medium text-foreground">{words}</span>
  );
  return (
    <li className="flex items-start gap-3 py-2" data-testid="user-activity-item" data-kind={item.kind}>
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-baseline gap-2 type-body">
          {title}
          {byOther ? (
            <span className="flex min-w-0 items-baseline gap-1 type-secondary text-muted-foreground">
              by <ScopedPersonRef userId={byOther} scope={scope} />
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
function ActivityFeed({
  userId,
  scope,
  filter,
  shareForAi,
}: {
  userId: string;
  scope: UserRecordScope;
  filter: Filter;
  shareForAi: (data: unknown) => void;
}) {
  // The feed is keyed on person + seat + filter, so this fetcher is stable for its whole life.
  const firstPage = useMemo(() => (id: string) => fetchActivityPage(id, null, kindsOf(filter), undefined, null, scope), [filter, scope]);
  const { data: first, loading, error } = useRecordLoad(firstPage, userId, 0);
  const call = activityCallFor(scope);
  const [more, setMore] = useState<ActivityPage | null>(null);
  const [olderBusy, setOlderBusy] = useState(false);
  const [olderError, setOlderError] = useState<unknown>(null);
  const shown = more ?? first;
  useEffect(() => {
    if (shown) shareForAi({ filter, activity: shown.items });
  }, [shown, filter, shareForAi]);

  if (loading) return <RegionSkeleton shape="rows" count={8} twoLine aria-label="Loading activity" />;
  if (error || !first) {
    return (
      <ErrorNotice
        size="inline"
        message="Activity could not load."
        error={error}
        operation="Read activity"
        calls={[call]}
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
      const next = await fetchActivityPage(userId, page.next_before, kindsOf(filter), undefined, page.next_before_key, scope);
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
          calls={[call]}
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
                <ActivityRow key={item.key} item={item} personId={userId} scope={scope} />
              ))}
            </ul>
          </section>
        ))
      )}
      {olderError ? (
        <ErrorNotice size="inline" message="Older activity could not load." error={olderError} operation="Read older activity" calls={[call]} />
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

export function UserActivityTab({ userId, scope, version: pageVersion, shareForAi }: ScopedTabBodyProps) {
  const [filter, setFilter] = useState<Filter>("all");
  const [version, setVersion] = useState(0);
  return (
    <div data-testid="user-activity-tab" className="grid gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Tabs<Filter> variant="capsule" aria-label="Activity kind" value={filter} onValueChange={setFilter} data={filtersFor(scope)} />
        <Button variant="quiet" onClick={() => setVersion((v) => v + 1)}>
          Refresh
        </Button>
      </div>
      <ActivityFeed
        key={`${userId}|${scope.kind}|${filter}|${pageVersion}|${version}`}
        userId={userId}
        scope={scope}
        filter={filter}
        shareForAi={shareForAi}
      />
    </div>
  );
}
