"use client";

/**
 * `…/approvals?id=<approval id>` — the link every spend alarm and notice has sent — opens that
 * approval's record page. The id resolves from the rows already loaded; one the list no longer
 * holds (a duplicate merged away) is read from `billing.run_approval` and opens the live approval
 * for the same subject with `?replaced=<id>`, which the page states. An id that names nothing
 * says so and the link falls back to the list — never a silent no-op (Arman, 2026-10-17).
 */
import { useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { toast } from "@/lib/toast";
import { currentPathWithSearch, replaceAddressWithoutNavigating } from "@/lib/url-state/addressWithoutNavigating";
import { approvalRecordHref, type ApprovalSeat, type SpendApprovalRow } from "./spendApprovals";

export function useApprovalIdLink({
  rows,
  loading,
  seat,
  orgSlug,
}: {
  rows: SpendApprovalRow[];
  loading: boolean;
  seat: ApprovalSeat;
  orgSlug?: string;
}) {
  const router = useRouter();
  const id = useSearchParams().get("id");
  const handled = useRef<string | null>(null);
  useEffect(() => {
    if (!id || loading || handled.current === id) return;
    handled.current = id;
    const live = rows.find((r) => r.id === id);
    if (live) {
      router.replace(approvalRecordHref(live.subject_kind, live.subject_id, seat, orgSlug));
      return;
    }
    void createClient()
      .schema("billing")
      .from("run_approval")
      .select("subject_kind, subject_id")
      .eq("id", id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (data) {
          router.replace(`${approvalRecordHref(data.subject_kind, data.subject_id, seat, orgSlug)}?replaced=${encodeURIComponent(id)}`);
          return;
        }
        toast.error(error ? `Couldn't open approval ${id.slice(0, 8)}: ${error.message}` : `No spend approval ${id.slice(0, 8)}`);
        const params = new URLSearchParams(window.location.search);
        params.delete("id");
        replaceAddressWithoutNavigating(currentPathWithSearch(params));
      });
    // No cleanup: a later render (rows refreshing) must not drop the answer — `handled` keeps it to one read.
  }, [id, loading, rows, router, seat, orgSlug]);
}
