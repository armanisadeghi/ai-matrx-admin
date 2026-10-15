"use client";

// features/unified-data/table-page/TableAccessBar.tsx — AT-SHARE rows 2 and 3, in the table's own header bar.
//
//   "Request edit access"  shown only to a person who holds View or Comment on the table. One press asks the
//                          people who can decide (the owner and Full holders) through the platform's one request
//                          primitive: they get the request in their notifications and access-requests inbox,
//                          where Approve grants Edit and Decline answers it. No new modal system, no new inbox.
//   "Activity"             who changed what on this table, newest first, paged, people by name.

import { useCallback, useEffect, useState } from "react";
import { Activity, Check, Copy, Loader2, LockKeyhole } from "lucide-react";
import { useFields } from "@ai-matrx/records/react";
import { Popover, PopoverContent, PopoverTrigger } from "@ai-matrx/design-system";

import { useAppSelector } from "@/lib/redux/hooks";
import { selectUserId } from "@/lib/redux/selectors/userSelectors";
import { createAccessRequest } from "@/features/access-gate/service/accessRequests";
import { recordPageHref } from "./recordPageHref";
import {
  activitySentence,
  canAskForEdit,
  canFindDuplicates,
  findDuplicates,
  type DuplicateGroup,
  readActivity,
  readMyTableLevel,
  type ActivityEntry,
} from "./tableAccessService";

const BUTTON =
  "inline-flex h-8 shrink-0 items-center gap-1.5 rounded px-2 text-xs text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-60";

function RequestEditAccess({ tableId, level }: { tableId: string; level: string | null }) {
  const userId = useAppSelector(selectUserId);
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "failed">("idle");
  const [said, setSaid] = useState<string | null>(null);

  const send = useCallback(async () => {
    setState("sending");
    try {
      const made = await createAccessRequest({
        resourceType: "record",
        resourceId: tableId,
        level: "editor",
        message: note,
        currentUserId: userId,
        href: typeof window === "undefined" ? null : window.location.pathname,
      });
      setSaid(made.already ? "Already asked. Waiting on an answer." : "Asked. You will hear back here.");
      setState("sent");
    } catch (err) {
      setSaid(err instanceof Error ? err.message : "The request did not go through.");
      setState("failed");
    }
  }, [note, tableId, userId]);

  if (!canAskForEdit(level)) return null;
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button type="button" className={BUTTON} data-request-edit-access>
          <LockKeyhole className="h-3.5 w-3.5" />
          Request edit access
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 space-y-2 p-3">
        {state === "sent" ? (
          <p className="flex items-center gap-1.5 text-xs" data-request-edit-access-said>
            <Check className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
            {said}
          </p>
        ) : (
          <>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              placeholder="Add a note (optional)"
              className="w-full resize-none rounded border bg-background p-1.5 text-xs"
            />
            {state === "failed" && <p className="text-xs text-destructive">{said}</p>}
            <button
              type="button"
              onClick={send}
              disabled={state === "sending"}
              className="inline-flex h-8 w-full items-center justify-center gap-1.5 rounded bg-primary px-2 text-xs text-primary-foreground disabled:opacity-60"
              data-request-edit-access-send
            >
              {state === "sending" && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Ask for edit access
            </button>
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}

/** The feed of one Table or one Home: `subjectId` is whichever it is; the door tells which. */
export function ActivityFeedButton({ subjectId, organizationId }: { subjectId: string; organizationId: string }) {
  const [open, setOpen] = useState(false);
  const [entries, setEntries] = useState<ActivityEntry[]>([]);
  const [next, setNext] = useState<number | null>(null);
  const [state, setState] = useState<"idle" | "loading" | "failed">("idle");
  const [why, setWhy] = useState<string | null>(null);

  const load = useCallback(
    async (before: number | null) => {
      setState("loading");
      try {
        const page = await readActivity(organizationId, subjectId, before);
        setEntries((prev) => (before === null ? page.entries : [...prev, ...page.entries]));
        setNext(page.nextBefore);
        setState("idle");
      } catch (err) {
        setWhy(err instanceof Error ? err.message : "The activity could not be read.");
        setState("failed");
      }
    },
    [organizationId, subjectId],
  );

  useEffect(() => {
    if (open) void load(null);
  }, [open, load]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button type="button" className={BUTTON} data-activity-feed aria-label="Activity" title="Activity">
          <Activity className="h-3.5 w-3.5" />
          Activity
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="max-h-[70vh] w-96 overflow-y-auto p-0">
        {state === "failed" && <p className="p-3 text-xs text-destructive">{why}</p>}
        {state === "loading" && entries.length === 0 && (
          <div className="flex items-center gap-2 p-3 text-xs text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          </div>
        )}
        {state === "idle" && entries.length === 0 && <p className="p-3 text-xs text-muted-foreground">No changes recorded yet.</p>}
        <ul className="divide-y" data-activity-list>
          {entries.map((e) => (
            <li key={e.id} className="px-3 py-2 text-xs" data-activity-entry={e.kind}>
              <div>{activitySentence(e)}</div>
              <div className="text-[11px] text-muted-foreground">{new Date(e.occurredAt).toLocaleString()}</div>
            </li>
          ))}
        </ul>
        {next !== null && (
          <button type="button" className="w-full p-2 text-xs text-muted-foreground hover:bg-muted" disabled={state === "loading"} onClick={() => void load(next)}>
            {state === "loading" ? <Loader2 className="mx-auto h-3.5 w-3.5 animate-spin" /> : "Older"}
          </button>
        )}
      </PopoverContent>
    </Popover>
  );
}

/** AT-SHARE row 4, Dedupe: pick fields, see groups of likely duplicates, open each record (its page has the merge). Edit holders only. */
function FindDuplicates({ tableId, organizationId }: { tableId: string; organizationId: string }) {
  const fields = useFields(tableId);
  const [open, setOpen] = useState(false);
  const [chosen, setChosen] = useState<string[]>([]);
  const [groups, setGroups] = useState<DuplicateGroup[] | null>(null);
  const [state, setState] = useState<"idle" | "loading" | "failed">("idle");
  const [why, setWhy] = useState<string | null>(null);
  const list = (fields.data ?? []).filter((f) => f.key && !["relation", "lookup", "rollup", "attachment"].includes(String(f.type)));

  const find = useCallback(async () => {
    setState("loading");
    try {
      setGroups(await findDuplicates(organizationId, tableId, chosen));
      setState("idle");
    } catch (err) {
      setWhy(err instanceof Error ? err.message : "The search did not run.");
      setState("failed");
    }
  }, [chosen, organizationId, tableId]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button type="button" className={BUTTON} data-find-duplicates>
          <Copy className="h-3.5 w-3.5" />
          Find duplicates
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="max-h-[70vh] w-96 space-y-2 overflow-y-auto p-3">
        <div className="text-xs text-muted-foreground">Same value in every chosen field</div>
        <div className="flex flex-wrap gap-1">
          {list.map((f) => {
            const on = chosen.includes(f.key);
            return (
              <button
                key={f.key}
                type="button"
                aria-pressed={on}
                onClick={() => setChosen((c) => (on ? c.filter((k) => k !== f.key) : [...c, f.key]))}
                className={`rounded border px-2 py-0.5 text-xs ${on ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
              >
                {f.label ?? f.key}
              </button>
            );
          })}
        </div>
        <button
          type="button"
          onClick={() => void find()}
          disabled={chosen.length === 0 || state === "loading"}
          className="inline-flex h-8 w-full items-center justify-center gap-1.5 rounded bg-primary px-2 text-xs text-primary-foreground disabled:opacity-60"
          data-find-duplicates-run
        >
          {state === "loading" && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          Find
        </button>
        {state === "failed" && <p className="text-xs text-destructive">{why}</p>}
        {groups && groups.length === 0 && state === "idle" && <p className="text-xs text-muted-foreground">No duplicates found.</p>}
        {groups?.map((g, i) => (
          <ul key={i} className="divide-y rounded border" data-duplicate-group>
            {g.members.map((m) => (
              <li key={m.id} className="px-2 py-1.5 text-xs">
                <a className="underline-offset-2 hover:underline" href={recordPageHref(tableId, m.id)} target="_blank" rel="noreferrer">
                  {m.title}
                </a>
              </li>
            ))}
          </ul>
        ))}
      </PopoverContent>
    </Popover>
  );
}

export function TableAccessBar({ tableId, organizationId }: { tableId: string; organizationId: string | null }) {
  const [level, setLevel] = useState<string | null>(null);
  useEffect(() => {
    if (!organizationId) return;
    let live = true;
    readMyTableLevel(organizationId, tableId)
      .then((l) => live && setLevel(l))
      .catch(() => live && setLevel(null));
    return () => {
      live = false;
    };
  }, [organizationId, tableId]);
  if (!organizationId) return null;
  return (
    <>
      <RequestEditAccess tableId={tableId} level={level} />
      {canFindDuplicates(level) && <FindDuplicates tableId={tableId} organizationId={organizationId} />}
      <ActivityFeedButton subjectId={tableId} organizationId={organizationId} />
    </>
  );
}
