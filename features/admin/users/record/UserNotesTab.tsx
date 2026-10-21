"use client";

// A person's Notes tab — the ONE home for notes about a person: platform Notes
// (workbench.notes) linked by a `note -> user` association edge, read and written through
// service/userNotes.ts (admin.user_notes / admin.add_user_note — every platform admin reads every
// shared note; note + edge are written in one transaction, in the admin organization).
// Shared with every platform admin by default (shown_to 'my_team'); "Only me" = shown_to
// 'only_me', which other admins' reads leave out. Pin = note metadata.pinned.
// The Accounts "Personal notes" (crm.party_research) text moved here as "only me" notes
// (20261018190000); its category stays there. Read-only beside it, each with its source named:
// organization member notes (iam.org_member_controls.notes) and the plan note (billing.user_plan.note).
//
// An organization's seat sees that organization's slice: its member note about the person
// (iam.org_member_controls.notes, read and written only through the org-admin RPCs, so the person and
// their coworkers never read it). The platform's notes are filed in the admin organization, never
// shown here; a note in workbench.notes inside the organization would be readable by every member.

import { useEffect, useMemo, useState } from "react";
import { Lock, Pin, PinOff, StickyNote } from "lucide-react";
import { ErrorNotice } from "@ai-matrx/design-system";
import { Badge, Button, EmptyState, PropertyRow, RegionSkeleton, SegmentedControl } from "@ai-matrx/design-system/controls";
import { formatRelativeTime } from "@ai-matrx/kit/format";
import { ProTextarea } from "@/components/official/ProTextarea";
import AppLink from "@/components/navigation/AppLink";
import { confirm } from "@/components/dialogs/confirm/ConfirmDialogHost";
import { toast } from "@/lib/toast";
import { useAppSelector } from "@/lib/redux/hooks";
import { selectUserId } from "@/lib/redux/selectors/userSelectors";
import { createClient } from "@/utils/supabase/client";
import * as NotesAPI from "@/features/notes/service/notesApi";
import { addUserNote, readUserNotes, setUserNotePinned, type NoteShownTo } from "../service/userNotes";
import { getOrgMember, setMemberControls } from "@/features/organizations/admin/service";
import type { OrgAdminMemberDetail } from "@/features/organizations/admin/types";
import { adminOrganizationHref } from "./UserOrganizationsTab";
import { useRecordLoad } from "./useRecordLoad";
import { noteWasEdited } from "./noteEdited";
import { ScopedPersonRef } from "./ScopedPersonRef";
import type { ScopedTabBodyProps } from "./UserRecordPage";
import { PLATFORM_SCOPE, type UserRecordScope } from "./userSurfaces";

type ShownTo = NoteShownTo;

interface PersonNote {
  id: string;
  content: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  shown_to: ShownTo | null;
  pinned: boolean;
  metadata: unknown;
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
  memberNotes: MemberNote[];
  planNote: PlanNote | null;
}

async function loadPersonNotes(userId: string): Promise<NotesLoad> {
  const supabase = createClient();

  const [notesRows, membersRes, planRes] = await Promise.all([
    readUserNotes(userId),
    supabase
      .schema("iam")
      .from("org_member_controls")
      .select("organization_id, notes, updated_at")
      .eq("user_id", userId)
      .is("deleted_at", null)
      .not("notes", "is", null),
    supabase.schema("billing").from("user_plan").select("note, source, updated_at").eq("user_id", userId).maybeSingle(),
  ]);
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

  // admin.user_notes already leaves out other authors' only-me notes and orders pinned, then newest.
  const notes: PersonNote[] = notesRows.map((n) => ({
    id: n.id,
    content: n.content,
    created_by: n.created_by,
    created_at: n.created_at,
    updated_at: n.updated_at,
    shown_to: n.shown_to,
    pinned: n.pinned,
    metadata: n.metadata,
  }));

  return {
    notes,
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

type OrganizationScope = Extract<UserRecordScope, { kind: "organization" }>;

/** The organization's one member note about this person (admin-only), edited in place. */
function OrganizationMemberNote({ userId, scope, version: pageVersion, reload, shareForAi }: ScopedTabBodyProps & { scope: OrganizationScope }) {
  const fetcher = useMemo(() => (id: string) => getOrgMember(scope.orgId, id), [scope]);
  const { data: member, loading, error } = useRecordLoad<OrgAdminMemberDetail>(fetcher, userId, pageVersion);
  const [draft, setDraft] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (member) shareForAi({ memberNote: member.notes });
  }, [member, shareForAi]);

  const saved = member?.notes ?? "";
  const text = draft ?? saved;

  async function save() {
    if (!member) return;
    setSaving(true);
    try {
      // The controls RPC takes the whole set; every other control is passed back unchanged.
      await setMemberControls(scope.orgId, userId, {
        memberLevel: member.memberLevel,
        tierOverride: member.tierOverride,
        storageCapBytes: member.storageCapBytes,
        monthlyBudgetMcents: member.monthlyBudgetMcents,
        notes: text.trim() ? text : null,
      });
      setDraft(null);
      reload();
    } catch (e) {
      toast.error(`Note not saved: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setSaving(false);
    }
  }

  if (loading && !member) return <RegionSkeleton shape="rows" count={2} twoLine aria-label="Loading note" />;
  if (error && !member) {
    return <ErrorNotice size="inline" message="The member note could not load" error={error} operation="Read member note" calls={["public.org_admin_get_member"]} />;
  }
  return (
    <section className="flex flex-col gap-2" data-testid="org-member-note">
      <h3 className="type-title">Member note · {scope.orgName}</h3>
      <ProTextarea
        value={text}
        onChange={(e) => setDraft(e.target.value)}
        placeholder={`Note about ${member?.displayName || member?.email || "this member"}`}
        rows={4}
        autoGrow
        surfaceName="org-admin-member-note"
      />
      <div className="flex items-center justify-end gap-2">
        <span className="mr-auto type-secondary text-muted-foreground">Seen by this organization&apos;s owners and admins</span>
        {draft !== null && draft !== saved ? (
          <Button variant="quiet" onClick={() => setDraft(null)}>
            Cancel
          </Button>
        ) : null}
        <Button variant="primary" icon={<StickyNote />} disabled={saving || draft === null || draft === saved} onClick={() => void save()}>
          {saving ? "Saving…" : "Save note"}
        </Button>
      </div>
    </section>
  );
}

export function UserNotesTab(props: ScopedTabBodyProps) {
  const { scope } = props;
  return scope.kind === "organization" ? <OrganizationMemberNote {...props} scope={scope} /> : <PlatformUserNotes {...props} />;
}

function PlatformUserNotes({ userId, personName, version: pageVersion, shareForAi }: ScopedTabBodyProps) {
  const me = useAppSelector(selectUserId);
  const [version, setVersion] = useState(0);
  const { data, loading, error } = useRecordLoad(loadPersonNotes, userId, pageVersion + version);
  useEffect(() => {
    if (data) shareForAi({ notes: data.notes, memberNotes: data.memberNotes, planNote: data.planNote });
  }, [data, shareForAi]);
  const [draft, setDraft] = useState("");
  const [shownTo, setShownTo] = useState<ShownTo>("my_team");
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<{ id: string; text: string } | null>(null);
  const reload = () => setVersion((v) => v + 1);

  async function addNote() {
    const text = draft.trim();
    if (!text) return;
    setSaving(true);
    try {
      // Note + edge in one transaction (admin.add_user_note): saved whole or not at all.
      await addUserNote({ userId, content: text, shownTo, label: `About ${personName}` });
      setDraft("");
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
      await setUserNotePinned(note.id, userId, !note.pinned);
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
          <SegmentedControl aria-label="Who sees this note" value={shownTo} onValueChange={(v) => setShownTo(v === "only_me" ? "only_me" : "my_team")} data={SHARE_OPTIONS} />
          <Button variant="primary" icon={<StickyNote />} disabled={saving || !draft.trim()} onClick={() => void addNote()}>
            {saving ? "Saving…" : "Add note"}
          </Button>
        </div>
      </section>

      <section className="flex flex-col gap-2">
        <h3 className="type-title">Notes{data && !error && notes.length ? ` (${notes.length})` : ""}</h3>
        {loading && !data ? (
          <RegionSkeleton shape="rows" count={3} twoLine aria-label="Loading notes" />
        ) : error ? (
          <ErrorNotice size="inline" message="Notes could not load" error={error} operation="Read notes about this person" calls={["admin.user_notes"]} />
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
                    {n.created_by ? <ScopedPersonRef userId={n.created_by} scope={PLATFORM_SCOPE} /> : <span className="type-secondary text-muted-foreground">Unknown author</span>}
                    <span className="type-secondary text-muted-foreground" title={new Date(n.created_at).toLocaleString()}>
                      {formatRelativeTime(n.created_at)}
                      {noteWasEdited(n) ? " · edited" : ""}
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

      {data && !error ? (
        <section className="flex flex-col gap-3">
          <h3 className="type-title">Other notes</h3>
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
          {data.memberNotes.length === 0 && !data.planNote ? (
            <p className="type-secondary text-muted-foreground">No other notes</p>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
