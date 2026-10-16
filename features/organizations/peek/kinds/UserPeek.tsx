// record-view: none — user is a System table, which takes no custom fields
"use client";

/**
 * UserPeek — a quick read-only profile of a PLATFORM USER (a member), on THE peek (`Peek` in
 * `PeekWindow`), for any surface that names a person by account id.
 *
 * Access is personal (Arman, 2026-09-23): the person opens when the viewer shares ANY organization
 * with them — never only the active one. The database decides (`resolveVisiblePerson`). Someone the
 * viewer shares no organization with reads as "not someone you can see" — nothing revealed.
 * There is no profile route a member may open for another member, so no Open door; emailing the
 * person is a link in the body.
 */

import React from "react";
import { UserRound } from "lucide-react";
import { mailtoHref, Peek, PeekWindow, type PeekBlock } from "@ai-matrx/design-system";
import { resolveVisiblePerson, type VisiblePerson } from "@/features/organizations/people/visiblePeople";
import { useRecordPeekDoors } from "../useRecordPeekDoors";
import type { PeekProps } from "../types";

type State = { status: "loading" } | { status: "found"; person: VisiblePerson } | { status: "unavailable" };

export default function UserPeek({ id, open, onClose }: PeekProps) {
  const [state, setState] = React.useState<State>({ status: "loading" });
  const doors = useRecordPeekDoors({ href: null, onClose });

  React.useEffect(() => {
    let cancelled = false;
    setState({ status: "loading" });
    resolveVisiblePerson(id)
      .then((person) => {
        if (!cancelled) setState(person ? { status: "found", person } : { status: "unavailable" });
      })
      .catch(() => {
        if (!cancelled) setState({ status: "unavailable" });
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  const person = state.status === "found" ? state.person : null;
  const name = person?.name || "Person";

  const body: PeekBlock[] = [];
  if (person) {
    if (person.organizationName) body.push({ property: "Shared organization", value: person.organizationName });
    if (person.email) body.push({ property: "Email", value: person.email, href: mailtoHref(person.email) });
    if (person.joinedAt) body.push({ property: "Member since", value: new Date(person.joinedAt).toLocaleDateString() });
  } else if (state.status === "unavailable") {
    body.push({ fact: "This person isn't someone you share an organization with.", wrap: true });
  }

  return (
    <PeekWindow open={open} onClose={onClose} label={name}>
      <Peek
        size="lg"
        record={{
          kind: "Person",
          id,
          title: name,
          glyph: UserRound,
          ...(person ? { avatar: { initials: name.slice(0, 1).toUpperCase(), ...(person.avatarUrl ? { src: person.avatarUrl } : {}) } } : {}),
          ...(person?.role ? { subtitle: person.role.charAt(0).toUpperCase() + person.role.slice(1) } : {}),
          body,
          ...doors,
        }}
        loading={state.status === "loading"}
      />
    </PeekWindow>
  );
}
