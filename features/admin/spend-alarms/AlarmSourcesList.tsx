"use client";

/**
 * The Sources one alarm is about — grouped by type, each by its real title and opening its own
 * page, deleted ones reading "(deleted)". Never a wall: the first 10 per type, then "+N more".
 * (Harsh walk 2026-10-10: "Skipped Sources (200): Source (not found), …" 200 times.)
 * Reads `billing.spend_alarm_sources`; absent when the alarm names no Source.
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@ai-matrx/design-system/controls";
import {
  alarmSourceHref,
  alarmSourceTitle,
  fetchAlarmSources,
  sourceGroupLabel,
  type AlarmSourceGroup,
} from "./spendAlarms";

const PAGE = 10;

export function AlarmSourcesList({ alarmId, heading = "Sources" }: { alarmId: string; heading?: string }) {
  const [groups, setGroups] = useState<AlarmSourceGroup[] | null>(null);
  const [total, setTotal] = useState(0);
  const [loadingKind, setLoadingKind] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    fetchAlarmSources(alarmId, { limit: PAGE })
      .then((r) => {
        if (!alive) return;
        setGroups(r.groups);
        setTotal(r.total);
      })
      .catch(() => alive && setGroups([]));
    return () => {
      alive = false;
    };
  }, [alarmId]);

  if (!groups || total === 0) return null;

  const more = async (g: AlarmSourceGroup) => {
    setLoadingKind(g.kind);
    try {
      const next = await fetchAlarmSources(alarmId, { kind: g.kind, offset: g.items.length, limit: 50 });
      const add = next.groups[0]?.items ?? [];
      setGroups((cur) => (cur ?? []).map((x) => (x.kind === g.kind ? { ...x, items: [...x.items, ...add] } : x)));
    } finally {
      setLoadingKind(null);
    }
  };

  return (
    <section className="rounded-lg border border-border bg-card p-4" data-testid="alarm-sources">
      <h2 className="mb-2 text-sm font-semibold">{`${heading} (${total.toLocaleString()})`}</h2>
      <div className="flex flex-col gap-3">
        {groups.map((g) => (
          <div key={g.kind}>
            <h3 className="mb-1 text-xs font-medium text-muted-foreground">{`${sourceGroupLabel(g.kind)} (${g.total.toLocaleString()})`}</h3>
            <ul className="grid gap-x-4 gap-y-0.5 text-sm sm:grid-cols-2">
              {g.items.map((it) => {
                const href = alarmSourceHref(it);
                const title = alarmSourceTitle(it);
                return (
                  <li key={it.id} className="min-w-0 truncate" title={title}>
                    {href ? (
                      <Link href={href} className="text-primary hover:underline">
                        {title}
                      </Link>
                    ) : (
                      <span className="text-muted-foreground">{title}</span>
                    )}
                    {it.times > 1 ? <span className="text-xs text-muted-foreground">{` · ${it.times}×`}</span> : null}
                  </li>
                );
              })}
            </ul>
            {g.total > g.items.length ? (
              <Button variant="quiet" disabled={loadingKind === g.kind} onClick={() => void more(g)}>
                {`+${(g.total - g.items.length).toLocaleString()} more`}
              </Button>
            ) : null}
          </div>
        ))}
      </div>
    </section>
  );
}
