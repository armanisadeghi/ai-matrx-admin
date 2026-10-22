"use client";

/**
 * Memory Lab — the trial list: every trial (archived behind the filter), and "New trial" (pick a
 * person, name it). Opening a trial goes to its workspace.
 */
import Link from "@/components/navigation/AppLink";
import { useEffect, useState } from "react";
import { FlaskConical, Plus } from "lucide-react";

import {
  ArchiveFilter,
  DEFAULT_ARCHIVE_FILTER,
  ErrorNotice,
  RecordId,
  type ArchiveFilterValue,
} from "@ai-matrx/design-system";
import { Badge, Button, EmptyState, Field, RegionSkeleton } from "@ai-matrx/design-system/controls";
import { UserSearchField } from "@/features/user-search/UserSearchField";
import type { UserSearchCandidate } from "@/features/user-search/types";
import { extractErrorMessage } from "@/utils/errors";
import { createTrial, listTrials, updateTrial } from "../data";
import type { MemoryTrial } from "../types";

export const trialHref = (id: string) => `/administration/intelligence/memory-lab/${id}`;

function personLabel(user: UserSearchCandidate): string {
  return user.displayName && user.email ? `${user.displayName} (${user.email})` : (user.displayName ?? user.email ?? user.id);
}

function NewTrial({ onCreated }: { onCreated: (trial: MemoryTrial) => void }) {
  const [query, setQuery] = useState("");
  const [person, setPerson] = useState<UserSearchCandidate | null>(null);
  const [title, setTitle] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Promise chaining, not try…finally: the React Compiler skips a component that uses `finally`.
  const create = () => {
    if (!person) return;
    setSaving(true);
    setError(null);
    createTrial({
      title: title.trim() || `${person.displayName ?? person.email ?? "Person"} — trial`,
      subjectUserId: person.id,
      subjectLabel: personLabel(person),
    })
      .then(onCreated, (e: unknown) => setError(extractErrorMessage(e)))
      .then(() => setSaving(false));
  };

  return (
    <div className="flex flex-col gap-2 rounded-md border border-border bg-card p-3">
      <div className="flex flex-wrap items-center gap-2">
        <UserSearchField
          value={query}
          onValueChange={(v) => {
            setQuery(v);
            setPerson(null);
          }}
          directory="admin"
          title="Whose chats to replay"
          placeholder="Find a person by name or email"
          className="w-full max-w-sm"
          onUserSelect={(user) => {
            setPerson(user);
            setQuery(personLabel(user));
          }}
        />
        {/* ui-exception: a trial name is a short raw label, not writing */}
        <Field
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Trial name (optional)"
          aria-label="Trial name"
          width="md"
        />
        <Button variant="primary" icon={<Plus />} disabled={!person || saving} onClick={create}>
          Create trial
        </Button>
      </div>
      {error ? <ErrorNotice title="The trial could not be created" message={error} /> : null}
    </div>
  );
}

export function TrialList() {
  const [trials, setTrials] = useState<MemoryTrial[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [archive, setArchive] = useState<ArchiveFilterValue>(DEFAULT_ARCHIVE_FILTER);
  const [creating, setCreating] = useState(false);

  const load = () => {
    setError(null);
    listTrials()
      .then(setTrials)
      .catch((e: unknown) => setError(extractErrorMessage(e)));
  };
  useEffect(load, []);

  const setStatus = async (trial: MemoryTrial, status: "open" | "archived") => {
    try {
      const next = await updateTrial(trial, { status });
      setTrials((list) => (list ?? []).map((t) => (t.id === next.id ? next : t)));
    } catch (e) {
      setError(extractErrorMessage(e));
    }
  };

  const shown = (trials ?? []).filter((t) =>
    archive === "all" ? true : archive === "archived" ? t.status === "archived" : t.status === "open",
  );

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 overflow-y-auto p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <ArchiveFilter value={archive} onValueChange={setArchive} />
        <Button variant={creating ? "quiet" : "primary"} icon={<Plus />} onClick={() => setCreating((c) => !c)}>
          New trial
        </Button>
      </div>
      {creating ? (
        <NewTrial
          onCreated={(trial) => {
            setCreating(false);
            setTrials((list) => [trial, ...(list ?? [])]);
          }}
        />
      ) : null}
      {error ? <ErrorNotice title="Trials could not be read" message={error} /> : null}
      {trials === null && !error ? <RegionSkeleton shape="rows" count={4} twoLine aria-label="Reading trials" /> : null}
      {trials !== null && shown.length === 0 ? (
        <EmptyState
          icon={<FlaskConical />}
          title={archive === "archived" ? "No archived trials" : "No trials yet"}
          line="A trial replays one person's chats into a sandbox store."
        />
      ) : null}
      {shown.length > 0 ? (
        <ul className="flex flex-col divide-y divide-border rounded-md border border-border bg-card">
          {shown.map((t) => (
            <li key={t.id} className="flex items-center gap-3 px-3 py-2">
              <div className="flex min-w-0 flex-1 flex-col">
                <Link href={trialHref(t.id)} className="type-body truncate text-foreground hover:underline">
                  {t.title}
                </Link>
                <span className="type-secondary truncate text-muted-foreground">
                  {t.subjectLabel || "Person"} · {Object.keys(t.files).length} files ·{" "}
                  {new Date(t.createdAt).toLocaleDateString()}
                </span>
              </div>
              {t.status === "archived" ? <Badge>Archived</Badge> : null}
              <RecordId value={t.subjectUserId} label="Person" token="user" />
              <Button variant="quiet" onClick={() => setStatus(t, t.status === "archived" ? "open" : "archived")}>
                {t.status === "archived" ? "Restore" : "Archive"}
              </Button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
