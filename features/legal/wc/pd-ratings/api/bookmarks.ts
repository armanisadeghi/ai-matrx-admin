"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/utils/supabase/client";

export interface ClaimBookmark {
  user_id: string;
  claim_id: string;
  label: string | null;
  created_at: string;
  updated_at: string;
}

const TABLE = "wc_user_claim_bookmarks";

const bookmarkKeys = {
  list: (userId: string | undefined) => ["wc-bookmarks", "list", userId] as const,
};

export { bookmarkKeys };

export function useClaimBookmarks(userId: string | undefined) {
  return useQuery<ClaimBookmark[]>({
    queryKey: bookmarkKeys.list(userId),
    enabled: !!userId,
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from(TABLE as never)
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      return (data ?? []) as ClaimBookmark[];
    },
  });
}

export function useUpsertBookmark() {
  const qc = useQueryClient();
  return useMutation<
    ClaimBookmark,
    Error,
    { userId: string; claimId: string; label?: string | null }
  >({
    mutationFn: async ({ userId, claimId, label }) => {
      const row = {
        user_id: userId,
        claim_id: claimId,
        label: label ?? null,
      };
      const { data, error } = await supabase
        .from(TABLE as never)
        .upsert(row as never, { onConflict: "user_id,claim_id" })
        .select("*")
        .single();
      if (error) throw new Error(error.message);
      return data as ClaimBookmark;
    },
    onSuccess: (bookmark) => {
      qc.invalidateQueries({ queryKey: bookmarkKeys.list(bookmark.user_id) });
    },
  });
}

export function useDeleteBookmark() {
  const qc = useQueryClient();
  return useMutation<void, Error, { userId: string; claimId: string }>({
    mutationFn: async ({ userId, claimId }) => {
      const { error } = await supabase
        .from(TABLE as never)
        .delete()
        .eq("user_id", userId)
        .eq("claim_id", claimId);
      if (error) throw new Error(error.message);
    },
    onSuccess: (_, { userId }) => {
      qc.invalidateQueries({ queryKey: bookmarkKeys.list(userId) });
    },
  });
}
