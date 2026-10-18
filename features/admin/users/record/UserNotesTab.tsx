"use client";

// A person's Notes tab — the ONE home for notes about a person: platform Notes
// (workbench.notes) linked by a `note -> user` association edge (pair registered in
// migrations/note_about_user_association_pair.sql). Shared with every platform admin by
// default (shown_to 'my_team'); "Only me" = shown_to 'only_me', which other admins' tabs do
// not list (shown_to is a list filter, never a lock). Pin = note metadata.pinned.
// Read-only beside it, each with its source named: my earlier personal research
// (crm.party_research — still read by the Accounts "My notes" column, so not migrated),
// organization member notes (iam.org_member_controls.notes) and the plan note
// (billing.user_plan.note).

import { useState } from "react";
import { Lock, Pin, PinOff, StickyNote } from "lucide-react";
import { ErrorNotice } from "@ai-matrx/design-system";
import { Badge, Button, EmptyState, PropertyRow, RegionSkeleton, SegmentedControl } from "@ai-matrx/design-system/controls";
import type { AssociationTargetType } from "@/features/scopes/types";
import { formatRelativeTime } from "@ai-matrx/kit/format";
import { ProTextarea } from "@/components/official/ProTextarea";
import AppLink from "@/components/navigation/AppLink";
import { confirm } from "@/components/dialogs/confirm/ConfirmDialogHost";
import { toast } from "@/lib/toast";
import { useAppSelector } from "@/lib/redux/hooks";
import { selectUserId } from "@/lib/redux/selectors/userSelectors";
import { ensureOrgId } from "@/lib/organizations/ensureOrgId";
import { getUserId } from "@/utils/auth/getUserId";
import { createClient } from "@/utils/supabase/client";
import { associationsService } from "@/features/scopes/service/associationsService";
import * as NotesAPI from "@/features/notes/service/notesApi";
import { isJsonObject } from "@/types/json";
import type { Database, Json } from "@/types/database.types";
import { AdminUserRef } from "../components/AdminUserRef";
import { readUserResearchAbout } from "../service/userResearch";
import type { UserResearch } from "../lib/userResearch";
import { adminOrganizationHref } from "./UserOrganizationsTab";
import { personTitle } from "./userOverview";
import { useRecordLoad } from "./useRecordLoad";
import type { UserTabBodyProps } from "./UserRecordPage";

type ShownTo = Database["platform"]["Enums"]["shown_to"];

// `user` is a registered entity token and the note -> user pair is registered in the DB; the
// package's container list (ASSOCIATION_TARGET_TYPES) does not name it yet. The service checks
// the token at run time, the database checks the pair.
const USER_TARGET = "user" as AssociationTargetType;

interface PersonNote {
  id: string;
  content: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  shown_to: ShownTo | null;
  pinned: boolean;
  metadata: Json;
}

interface MemberNote {
  organization_id: string;
  organization_name: string | null;
  notes: string;
  updated_at: string;
}

interface PlanNote {
  note: string;
  source: string;
  updated_at: string;
}

interface NotesLoad {
  notes: PersonNote[];
  research: UserResearch | null;
  researchError: unknown;
  memberNotes: MemberNote[];
  planNote: PlanNote | null;
}

const isPinned = (metadata: Json): boolean => isJsonObject(metadata) && metadata.pinned === true;

async function loadPersonNotes(userId: string): Promise<NotesLoad> {
  const supabase = createClient();
  const me = getUserId();

  const edges = await associationsService.listForTargets(USER_TARGET, [userId]);
  if (!edges.ok) throw new Error(`Could not read the notes about this person: ${edges.error.message}`);
  const noteIds = [...new Set(edges.data.edges.filter((e) => e.sourceType === "note").map((e) => e.sourceId))];

  const [notesRes, membersRes, planRes, research] = await Promise.all([
    noteIds.length
      ? supabase
          .schema("workbench")
          .from("notes")
          .select("id, content, created_by, created_at, updated_at, shown_to, metadata")
          .in("id", noteIds)
          .is("deleted_at", null)
      : Promise.resolve({ data: [], error: null }),
    supabase
      .schema("iam")
      .from("org_member_controls")
      .select("organization_id, notes, updated_at")
      .eq("user_id", userId)
      .is("deleted_at", null)
      .not("notes", "is", null),
    supabase.schema("billing").from("user_plan").select("note, source, updated_at").eq("user_id", userId).maybeSingle(),
    me
      ? readUserResearchAbout(me, userId).then(
          (r) => ({ ok: true as const, r }),
          (e: unknown) => ({ ok: false as const, e }),
        )
      : Promise.resolve({ ok: true as const, r: null }),
  ]);
  if (notesRes.error) throw notesRes.error;
  if (membersRes.error) throw membersRes.error;
  if (planRes.error) throw planRes.error;

  const memberRows = (membersRes.data ?? []).filter((m) => (m.notes ?? "").trim() !== "");
  const orgNames = new Map<string, string>();
  if (memberRows.length) {
    const { data: orgs, error } = await supabase
      .schema("iam")
      .from("organizations")
      .select("id, name")
      .in("id", memberRows.map((m) => m.organization_id));
    if (error) throw error;
    for (const o of orgs ?? []) orgNames.set(o.id, o.name);
  }

  const notes: PersonNote[] = (notesRes.data ?? [])
    .map((n) => ({ ...n, content: n.content ?? "", pinned: isPinned(n.metadata) }))
    // Another admin's "Only me" note is theirs alone in this list.
    .filter((n) => n.created_by === me || n.shown_to !== "only_me")
    .sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.created_at.localeCompare(a.created_at));

  return {
    notes,
    research: research.ok ? research.r : null,
    researchError: research.ok ? null : research.e,
    memberNotes: memberRows.map((m) => ({
      organization_id: m.organization_id,
      organization_name: orgNames.get(m.organization_id) ?? null,
      notes: m.notes ?? "",
      updated_at: m.updated_at,
    })),
    planNote: planRes.data && (planRes.data.note ?? "").trim() ? { note: planRes.data.note ?? "", source: planRes.data.source, updated_at: planRes.data.updated_at } : null,
  };
}

const SHARE_OPTIONS = [
  { value: "my_team", label: "Admins" },
  { value: "only_me", label: "Only me" },
] as const;

export function UserNotesTab({ userId, overview }: UserTabBodyProps) {
  const me = useAppSelector(selectUserId);
  const [version, setVersion] = useState(0);
  const { data, loading, error } = useRecordLoad(loadPersonNotes, userId, version);
  const [draft, setDraft] = useState("");
  const [shownTo, setShownTo] = useState<ShownTo>("my_team");
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<{ id: string; text: string } | null>(null);
  const reload = () => setVersion((v) => v + 1);
  const personName = personTitle(overview);

  async function addNote() {
    const text = draft.trim();
    if (!text) return;
    setSaving(true);
    try {
      const organizationId = await ensureOrgId(null);
      const note = await NotesAPI.create({
        label: `About ${personName}`,
        content: text,
        organization_id: organizationId,
        shown_to: shownTo,
      });
      const linked = await associationsService.add({
        sourceType: "note",
        sourceId: note.id,
        targetType: USER_TARGET,
        targetId: userId,
        orgId: organizationId,
      });
      if (!linked.ok) {
        toast.error(`Note saved in Notes ("${note.label}") but not linked to this person: ${linked.error.message}`);
      } else {
        setDraft("");
      }
      reload();
    } catch (e) {
      toast.error(`Note not saved: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setSaving(false);
    }
  }

  async function saveEdit() {
    if (!editing) return;
    try {
      await NotesAPI.update(editing.id, { content: editing.text });
      setEditing(null);
      reload();
    } catch (e) {
      toast.error(`Edit not saved: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  async function togglePin(note: PersonNote) {
    try {
      const base = isJsonObject(note.metadata) ? note.metadata : {};
      await NotesAPI.update(note.id, { metadata: { ...base, pinned: !note.pinned } });
      reload();
    } catch (e) {
      toast.error(`Pin not saved: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  async function deleteNote(note: PersonNote) {
    const ok = await confirm({
      title: "Delete this note?",
      description: "It moves to Trash in Notes and leaves this page.",
      confirmLabel: "Delete",
      variant: "destructive",
    });
    if (!ok) return;
    try {
      await NotesAPI.remove(note.id);
      reload();
    } catch (e) {
      toast.error(`Note not deleted: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  const notes = data?.notes ?? [];

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-2">
        <ProTextarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={`Note about ${personName}`}
          rows={3}
          autoGrow
          surfaceName="admin-user-notes"
        />
        <div className="flex items-center justify-end gap-2">
          <SegmentedControl value={shownTo} onValueChange={(v) => setShownTo(v === "only_me" ? "only_me" : "my_team")} data={SHARE_OPTIONS} />
          <Button variant="primary" icon={<StickyNote />} disabled={saving || !draft.trim()} onClick={() => void addNote()}>
            {saving ? "Saving…" : "Add note"}
          </Button>
        </div>
      </section>

      <section className="flex flex-col gap-2">
        <h3 className="type-title">Notes{notes.length ? ` (${notes.length})` : ""}</h3>
        {loading && !data ? (
          <RegionSkeleton shape="rows" count={3} twoLine aria-label="Loading notes" />
        ) : error ? (
          <ErrorNotice size="inline" message="Notes could not load" error={error} operation="Read notes about this person" calls={["platform.associations", "workbench.notes"]} />
        ) : notes.length === 0 ? (
          <EmptyState icon={<StickyNote />} title="No notes yet" line="Notes you add here are shared with admins" />
        ) : (
          <ul className="flex flex-col divide-y divide-border">
            {notes.map((n) => {
              const own = n.created_by === me;
              const isEditing = editing?.id === n.id;
              return (
                <li key={n.id} className="flex flex-col gap-1.5 py-3">
                  <div className="flex items-center gap-2">
                    <AdminUserRef userId={n.created_by} hideEmail />
                    <span className="type-secondary text-muted-foreground" title={new Date(n.created_at).toLocaleString()}>
                      {formatRelativeTime(n.created_at)}
                      {n.updated_at !== n.created_at ? " · edited" : ""}
                    </span>
                    {n.pinned ? <Badge tone="info">Pinned</Badge> : null}
                    {n.shown_to === "only_me" ? (
                      <Badge tone="neutral">
                        <Lock className="h-3 w-3" /> Only me
                      </Badge>
                    ) : null}
                    <span className="ml-auto flex items-center gap-1">
                      <Button variant="quiet" icon={n.pinned ? <PinOff /> : <Pin />} onClick={() => void togglePin(n)}>
                        {n.pinned ? "Unpin" : "Pin"}
                      </Button>
                      {own && !isEditing ? (
                        <>
                          <Button variant="quiet" onClick={() => setEditing({ id: n.id, text: n.content })}>
                            Edit
                          </Button>
                          <Button variant="quiet" onClick={() => void deleteNote(n)}>
                            Delete
                          </Button>
                        </>
                      ) : null}
                    </span>
                  </div>
                  {isEditing ? (
                    <div className="flex flex-col gap-2">
                      <ProTextarea
                        value={editing.text}
                        onChange={(e) => setEditing({ id: n.id, text: e.target.value })}
                        rows={3}
                        autoGrow
                        surfaceName="admin-user-notes"
                      />
                      <div className="flex justify-end gap-2">
                        <Button variant="quiet" onClick={() => setEditing(null)}>
                          Cancel
                        </Button>
                        <Button variant="primary" disabled={!editing.text.trim()} onClick={() => void saveEdit()}>
                          Save
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <p className="whitespace-pre-wrap text-sm text-foreground">{n.content}</p>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {data ? (
        <section className="flex flex-col gap-3">
          <h3 className="type-title">Other notes</h3>
          {data.researchError ? (
            <ErrorNotice size="inline" message="Your earlier notes could not load" error={data.researchError} operation="Read my research about this person" calls={["crm.party_research"]} />
          ) : null}
          {data.research ? (
            <PropertyRow
              label="Your earlier notes · Accounts"
              value={data.research.notes || null}
              meta={<Badge tone="neutral">{data.research.category.replace(/_/g, " ")}</Badge>}
            />
          ) : null}
          {data.memberNotes.map((m) => (
            <PropertyRow
              key={m.organization_id}
              label="Organization member note"
              value={m.notes}
              meta={
                <AppLink href={adminOrganizationHref(m.organization_id)} className="hover:text-primary">
                  {m.organization_name ?? "Organization"}
                </AppLink>
              }
            />
          ))}
          {data.planNote ? (
            <PropertyRow
              label="Plan note · Billing"
              value={data.planNote.note}
              meta={`${data.planNote.source.replace(/_/g, " ")} · ${formatRelativeTime(data.planNote.updated_at)}`}
            />
          ) : null}
          {!data.research && !data.researchError && data.memberNotes.length === 0 && !data.planNote ? (
            <p className="type-secondary text-muted-foreground">No other notes</p>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
