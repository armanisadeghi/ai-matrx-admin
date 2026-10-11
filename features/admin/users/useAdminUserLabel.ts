"use client";

// useAdminUserLabel — a person's NAME and email from their id, for the admin console.
//
// Admin tables that only hold a user id rendered the id (Arman, 2026-10-04: "the system expects
// id and I never have that"). `AdminUserRef` asks here whenever its caller passed no name: ids
// requested in the same tick are batched into ONE `public.admin_user_labels` call (super-admin,
// admin lane) and cached for the page's life, so a 50-row table costs one round trip.

import { useEffect, useState } from "react";
import { supabase } from "@/utils/supabase/client";

export interface AdminUserLabel {
  label: string | null;
  email: string | null;
}

/**
 * `users.profiles.display_name` defaults to the word "User" until a person sets a name, and the
 * lookup returns it ahead of the email — so every unnamed account read "User". That word is a
 * placeholder, never a name: the email stands in.
 */
const PLACEHOLDER_NAMES = new Set(["user"]);

export function usableLabel(label: string | null, email: string | null): string | null {
  const trimmed = label?.trim() ?? "";
  if (!trimmed || PLACEHOLDER_NAMES.has(trimmed.toLowerCase())) return email?.trim() || null;
  // A name that is only the front of the email ("test" for test@test.com) is a placeholder too:
  // beside full emails it reads as a different person, so the email stands in.
  const mail = email?.trim() ?? "";
  if (mail && mail.toLowerCase() !== trimmed.toLowerCase() && mail.toLowerCase().startsWith(trimmed.toLowerCase())) {
    return mail;
  }
  return trimmed;
}

const cache = new Map<string, AdminUserLabel>();
const waiting = new Map<string, Array<(value: AdminUserLabel) => void>>();
let scheduled = false;

async function flush(): Promise<void> {
  scheduled = false;
  const ids = [...waiting.keys()];
  const listeners = new Map(waiting);
  waiting.clear();
  let rows: Array<{ id: string; label: string | null; email: string | null }> = [];
  try {
    const { data, error } = await supabase.rpc("admin_user_labels", { p_ids: ids });
    if (error) throw error;
    rows = (data ?? []) as typeof rows;
  } catch (error) {
    // A refused or failed lookup leaves the id on screen (the honest fallback) and says why here.
    console.error("[admin-user-label] could not resolve people by id", error);
  }
  const byId = new Map(rows.map((r) => [r.id, { label: usableLabel(r.label, r.email), email: r.email }]));
  for (const id of ids) {
    const value = byId.get(id) ?? { label: null, email: null };
    cache.set(id, value);
    for (const resolve of listeners.get(id) ?? []) resolve(value);
  }
}

function requestLabel(id: string): Promise<AdminUserLabel> {
  const known = cache.get(id);
  if (known) return Promise.resolve(known);
  return new Promise((resolve) => {
    waiting.set(id, [...(waiting.get(id) ?? []), resolve]);
    if (!scheduled) {
      scheduled = true;
      setTimeout(() => void flush(), 0);
    }
  });
}

/** The person behind `userId` — null fields until resolved, or when `skip` (the caller has a name). */
export function useAdminUserLabel(userId: string | null | undefined, skip: boolean): AdminUserLabel {
  const [value, setValue] = useState<AdminUserLabel>(() =>
    userId ? (cache.get(userId) ?? { label: null, email: null }) : { label: null, email: null },
  );
  useEffect(() => {
    if (skip || !userId) return;
    let live = true;
    void requestLabel(userId).then((resolved) => {
      if (live) setValue(resolved);
    });
    return () => {
      live = false;
    };
  }, [userId, skip]);
  return value;
}
