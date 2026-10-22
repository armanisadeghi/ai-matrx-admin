/**
 * features/files/hooks/useOwnerLabel.ts
 *
 * The person's NAME for a file's owner — never an id fragment ("87a6e699") where a person belongs.
 * A file's owner is not a grantee, so `get_resource_permissions` (the share list's door) never lists
 * them, and `get_user_emails_by_ids` refuses non-admins. The names the platform CAN hand this surface:
 *   1. the signed-in person → their own profile (display name, else email);
 *   2. anyone else → the file's organization roster, read through `useUserConnections` (the same
 *      people source the Share dialog's person picker uses; a roster scoped to the file's own
 *      organization, never the active one);
 *   3. nobody found → an honest "Unknown person" (the id stays one click away in the tooltip), not a
 *      bare id posing as a label.
 */

"use client";

import { useAppSelector } from "@/lib/redux/hooks";
import {
  selectUserEmail,
  selectUserFullName,
  selectUserId,
  selectUserName,
} from "@/lib/redux/selectors/userSelectors";
import { useUserConnections } from "@/features/messaging/hooks/useUserConnections";

export const UNKNOWN_PERSON_LABEL = "Unknown person";

export interface OwnerLabel {
  /** What to show: a name, else an email, else {@link UNKNOWN_PERSON_LABEL}. */
  label: string;
  /** False when nobody could name the owner (the label is the honest stand-in). */
  resolved: boolean;
}

interface PersonLike {
  user_id: string;
  display_name: string | null;
  email: string | null;
}

/** Pure: pick the name for `ownerId` from the signed-in person's profile, else the roster. */
export function resolveOwnerLabel(args: {
  ownerId: string | null | undefined;
  currentUserId: string | null;
  self: { fullName?: string | null; name?: string | null; email?: string | null };
  people: readonly PersonLike[];
}): OwnerLabel {
  const { ownerId, currentUserId, self, people } = args;
  if (!ownerId) return { label: UNKNOWN_PERSON_LABEL, resolved: false };
  const pick = (...xs: Array<string | null | undefined>) =>
    xs.map((x) => x?.trim()).find((x): x is string => !!x);
  const mine =
    currentUserId === ownerId ? pick(self.fullName, self.name, self.email) : undefined;
  if (mine) return { label: mine, resolved: true };
  const person = people.find((p) => p.user_id === ownerId);
  const theirs = person ? pick(person.display_name, person.email) : undefined;
  if (theirs) return { label: theirs, resolved: true };
  return { label: UNKNOWN_PERSON_LABEL, resolved: false };
}

export function useOwnerLabel(
  ownerId: string | null | undefined,
  organizationId: string | null | undefined,
): OwnerLabel {
  const currentUserId = useAppSelector(selectUserId);
  const fullName = useAppSelector(selectUserFullName);
  const name = useAppSelector(selectUserName);
  const email = useAppSelector(selectUserEmail);
  const isMe = !!ownerId && ownerId === currentUserId;
  // Only a roster read when the owner is someone else and the file names its organization.
  const { connections } = useUserConnections(
    organizationId ? { organizationId, enabled: !isMe } : { enabled: false },
  );
  return resolveOwnerLabel({
    ownerId,
    currentUserId,
    self: { fullName, name, email },
    people: connections,
  });
}
