"use client";

/**
 * PersonPeekHost — THE DOOR FOR A PERSON A TABLE NAMES (records-ui `openPerson`).
 *
 * A person in a Person column / a kept-aside value opens IN PLACE, never navigating away from the table:
 *   · matched to an account  → the platform's `user` peek (UserPeek);
 *   · held by email only     → the contact (`crm.party`) with that email, as the `party` peek;
 *   · neither                → a small peek of what the table knows (their name and email), so the
 *                              chip is never a dead end.
 * `openPersonPeek` is called by the records host port; this component is mounted once, app-wide.
 */

import React, { useEffect, useState, useSyncExternalStore } from "react";
import { UserRound } from "lucide-react";
import { supabase } from "@/utils/supabase/client";
import { ResourcePeekHost } from "@/features/organizations/peek/ResourcePeekHost";
import { PeekDialog, PeekField } from "@/features/organizations/peek/PeekDialog";

export interface PersonTarget {
  recordId: string;
  userId?: string | null;
  email?: string | null;
  name?: string;
}

let current: PersonTarget | null = null;
const listeners = new Set<() => void>();
function set(next: PersonTarget | null) {
  current = next;
  for (const l of listeners) l();
}

export function openPersonPeek(target: PersonTarget): void {
  set(target);
}

/** The contact (crm.party) holding this email, when one exists. */
export async function findPartyIdByEmail(email: string): Promise<string | null> {
  const medium = await supabase.schema("crm").from("contact_medium").select("id").eq("channel", "email").eq("value_key", email.trim().toLowerCase()).is("deleted_at", null).limit(5);
  const ids = (medium.data ?? []).map((m) => m.id);
  if (ids.length === 0) return null;
  const point = await supabase.schema("crm").from("party_contact_point").select("party_id").in("medium_id", ids).is("deleted_at", null).limit(1);
  return point.data?.[0]?.party_id ?? null;
}

export function PersonPeekHost() {
  const target = useSyncExternalStore(
    (cb) => (listeners.add(cb), () => void listeners.delete(cb)),
    () => current,
    () => null,
  );
  const [partyId, setPartyId] = useState<{ email: string; id: string | null } | null>(null);
  const email = target && !target.userId ? (target.email?.trim() || null) : null;

  useEffect(() => {
    if (!email) return;
    let cancelled = false;
    void findPartyIdByEmail(email)
      .then((id) => !cancelled && setPartyId({ email, id }))
      .catch(() => !cancelled && setPartyId({ email, id: null }));
    return () => {
      cancelled = true;
    };
  }, [email]);

  if (!target) return null;
  const close = () => set(null);
  if (target.userId) return <ResourcePeekHost kind="user" id={target.userId} onClose={close} />;
  if (email && partyId?.email === email && partyId.id) return <ResourcePeekHost kind="party" id={partyId.id} onClose={close} />;
  if (email && partyId?.email !== email) return null;
  return (
    <PeekDialog open onClose={close} title={target.name || "Person"} icon={<UserRound className="h-4 w-4 text-violet-600 dark:text-violet-400" />} href={null}>
      {target.email ? (
        <PeekField label="Email">
          <a href={`mailto:${target.email}`} className="text-primary hover:underline">
            {target.email}
          </a>
        </PeekField>
      ) : null}
    </PeekDialog>
  );
}
