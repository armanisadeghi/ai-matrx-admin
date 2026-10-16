"use client";

/**
 * Active announcements, read straight from Supabase by the browser (React → Supabase for plain
 * data; the old `getActiveAnnouncements` server action was a Next POST to the page URL ~1s after
 * every load). Same filter, same RLS as before: global rows plus rows addressed to this person.
 */

import { createClient } from "@/utils/supabase/client";
import { getClientClaimsUserCached } from "@/utils/supabase/clientClaimsCache";
import { mapSystemAnnouncementRows } from "@/types/feedback-row-mapper";
import type { SystemAnnouncement } from "@/types/feedback.types";

export async function readActiveAnnouncements(): Promise<{
  success: boolean;
  error?: string;
  data?: SystemAnnouncement[];
}> {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await getClientClaimsUserCached();
    let query = supabase
      .schema("users")
      .from("system_announcements")
      .select("*")
      .eq("is_active", true)
      .is("deleted_at", null);
    query = user
      ? query.or(`target_user_id.is.null,target_user_id.eq.${user.id}`)
      : query.is("target_user_id", null);
    const { data, error } = await query.order("created_at", { ascending: false });
    if (error) return { success: false, error: error.message };
    return { success: true, data: mapSystemAnnouncementRows(data ?? []) };
  } catch (error: unknown) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "An unexpected error occurred",
    };
  }
}
