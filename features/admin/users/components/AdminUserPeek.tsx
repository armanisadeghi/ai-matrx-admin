"use client";

// AdminUserPeek — THE peek for a person in the admin seat (users one-roof lane C, 2026-10-17).
//
// `AdminUserRef` wraps a person's name in `PeekHoverCard`; this is the card's record: name, email,
// plan, status and last active from ONE `admin.user_overview` read for that person, made only when
// the card opens and kept for the tab (never the whole roster). Doors: Open (the record page, same
// tab), the page in a new tab, Start support session and Message (action doors that open the page
// with `?do=`), and links to the Support sessions and Billing & usage tabs.
//
// The registered `user` peek kind (`features/organizations/peek/kinds/UserPeek.tsx`) is the
// MEMBER seat's card (shared-organization visibility, no admin facts) and stays as it is.

import { UserRound } from "lucide-react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Peek, type PeekBlock, type PeekDoor, type PeekRecord } from "@ai-matrx/design-system";

type PeekActionDoor = Extract<PeekDoor, { kind: "action" }>;
import { pushAppHref } from "@/lib/deployment/navigate";
import { formatReadableDate } from "@/utils/datetime";
import { ADMIN_LEVEL_LABEL } from "../constants";
import { actionSubjectOf, fetchUserOverview, isClosed, personTitle, type UserOverview } from "../record/userOverview";
import {
  userActionDef,
  userActionDisabled,
  userActionHref,
  userRecordHref,
  type UserActionId,
} from "../record/userSurfaces";

const overviews = new Map<string, Promise<UserOverview | null>>();

function readOverview(userId: string): Promise<UserOverview | null> {
  const known = overviews.get(userId);
  if (known) return known;
  const pending = fetchUserOverview(userId);
  overviews.set(userId, pending);
  pending.catch(() => overviews.delete(userId));
  return pending;
}

type Answer =
  | { status: "found"; overview: UserOverview }
  | { status: "missing" }
  | { status: "failed"; error: unknown };

type State = { status: "loading" } | Answer;

function statusOf(o: UserOverview): string {
  if (isClosed(o)) return o.closure?.erased_at ? "Erased" : "Closed";
  if (o.identity.is_anonymous) return "Guest";
  if (o.admin_level) return ADMIN_LEVEL_LABEL[o.admin_level] ?? o.admin_level;
  return "Active";
}

function lastActive(o: UserOverview): string | null {
  const times = [o.identity.last_sign_in_at, o.ai?.last_ai_at].filter((t): t is string => Boolean(t));
  if (!times.length) return null;
  const latest = times.reduce((a, b) => (new Date(a) > new Date(b) ? a : b));
  return formatReadableDate(latest);
}

export interface AdminUserPeekProps {
  userId: string;
  /** What the surface already shows, so the card has a title before the read lands. */
  label?: string | null;
}

export function AdminUserPeek({ userId, label }: AdminUserPeekProps) {
  const router = useRouter();
  const [attempt, setAttempt] = useState(0);
  // The answer is tagged with the question it belongs to, so a new person (or Try again) reads as
  // loading without a synchronous reset inside the effect.
  const question = `${userId}#${attempt}`;
  const [answer, setAnswer] = useState<{ for: string; value: Answer } | null>(null);
  const state: State = answer && answer.for === question ? answer.value : { status: "loading" };

  useEffect(() => {
    let live = true;
    readOverview(userId).then(
      (overview) => {
        if (live) setAnswer({ for: question, value: overview ? { status: "found", overview } : { status: "missing" } });
      },
      (error: unknown) => {
        if (live) setAnswer({ for: question, value: { status: "failed", error } });
      },
    );
    return () => {
      live = false;
    };
  }, [userId, question]);

  const overview = state.status === "found" ? state.overview : null;
  const title = overview ? personTitle(overview) : label?.trim() || "Person";
  const href = userRecordHref(userId);

  const body: PeekBlock[] = [];
  if (overview) {
    if (overview.identity.email && overview.identity.email !== title) {
      body.push({ property: "Email", value: overview.identity.email });
    }
    body.push({ property: "Plan", value: overview.plan?.name ?? overview.usage?.plan_name ?? "Not provided" });
    body.push({ property: "Status", value: statusOf(overview) });
    const active = lastActive(overview);
    body.push(active ? { property: "Last active", value: active } : { property: "Last active", value: "", missing: "Never" });
    body.push({
      section: "Go to",
      links: [
        { text: "Support sessions", href: userRecordHref(userId, "support") },
        { text: "Billing & usage", href: userRecordHref(userId, "billing") },
      ],
    });
  } else if (state.status === "missing") {
    body.push({ fact: "No account with this id.", wrap: true });
  }

  // The two verbs an admin reaches for from a name. Each opens the person's page with the action
  // requested (`?do=`), so the page's own dialog and rules run it; an action this person can't
  // take (a guest, no email) is left off rather than drawn disabled.
  const doors: PeekActionDoor[] = overview
    ? (["support_session", "message"] as const satisfies readonly UserActionId[])
        .filter((id) => !userActionDisabled(id, actionSubjectOf(overview), { myId: null, closeBlocked: false }))
        .map((id) => {
          const def = userActionDef(id);
          return {
            kind: "action",
            id,
            label: def.label,
            icon: def.icon,
            onClick: () => pushAppHref(router, userActionHref(userId, id)),
          };
        })
    : [];

  const record: PeekRecord = {
    kind: "Person",
    id: userId,
    title,
    glyph: UserRound,
    ...(overview
      ? {
          avatar: {
            initials: title.slice(0, 1).toUpperCase(),
            ...(overview.identity.avatar_url ? { src: overview.identity.avatar_url } : {}),
          },
        }
      : {}),
    body,
    ...(state.status === "failed"
      ? { failure: { what: "this person", error: state.error, onRetry: () => setAttempt((n) => n + 1) } }
      : {}),
    primary: { label: "Open", onSelect: () => pushAppHref(router, href) },
    ...(doors.length === 2 ? { doors: [doors[0], doors[1]] as const } : doors.length === 1 ? { doors: [doors[0]] as const } : {}),
    href,
  };

  return <Peek frame="surface" record={record} loading={state.status === "loading"} />;
}
