"use client";

/**
 * The spend-approval rows, read once and shared. The approvals route's layout provides them, so
 * the list (full width or as the record page's sidebar) and the open record read and decide the
 * SAME rows: a decision on the record page updates its line in the sidebar at once. Outside a
 * provider (an agent's or mandate's Approvals tab) each board reads its own.
 */
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { toast } from "@/lib/toast";
import {
  APPROVAL_STATUS_LABEL,
  decideSpendApproval,
  fetchSpendApprovals,
  type ApprovalDecision,
  type ApprovalStatus,
  type SpendApprovalRow,
} from "./spendApprovals";

export interface SpendApprovalsData {
  rows: SpendApprovalRow[];
  setRows: (update: (rows: SpendApprovalRow[]) => SpendApprovalRow[]) => void;
  loading: boolean;
  error: string | null;
  reload: () => void;
  /** Optimistic decision: the row moves now, rolls back with a toast if the write fails. */
  decide: (
    row: SpendApprovalRow,
    decision: ApprovalDecision,
    next: ApprovalStatus,
    note: string,
    expiresAt: string | null,
  ) => Promise<void>;
}

const SpendApprovalsContext = createContext<SpendApprovalsData | null>(null);

function useApprovalsRead(orgId: string | null, enabled: boolean): SpendApprovalsData {
  const [rows, setRowsState] = useState<SpendApprovalRow[]>([]);
  const [tick, setTick] = useState(0);
  // Which read the rows/error answer; loading = the current read has not answered yet.
  const [answered, setAnswered] = useState<{ key: string; error: string | null } | null>(null);
  const key = `${orgId ?? "all"}:${tick}`;
  useEffect(() => {
    if (!enabled) return;
    let live = true;
    fetchSpendApprovals(orgId)
      .then((r) => {
        if (!live) return;
        setRowsState(r);
        setAnswered({ key, error: null });
      })
      .catch((e: unknown) => live && setAnswered({ key, error: e instanceof Error ? e.message : String(e) }));
    return () => {
      live = false;
    };
  }, [orgId, key, enabled]);
  const loading = enabled && answered?.key !== key;
  const error = answered?.key === key ? answered.error : null;
  const setRows = (update: (rows: SpendApprovalRow[]) => SpendApprovalRow[]) => setRowsState(update);
  const setStatus = (id: string, status: ApprovalStatus, expiresAt: string | null | undefined) =>
    setRowsState((rs) =>
      rs.map((x) => (x.id === id ? { ...x, status, expires_at: expiresAt ?? (status === "temporary" ? x.expires_at : null) } : x)),
    );
  const decide: SpendApprovalsData["decide"] = async (row, decision, next, note, expiresAt) => {
    const before = { status: row.status, expires_at: row.expires_at };
    setStatus(row.id, next, expiresAt);
    try {
      await decideSpendApproval(row.id, decision, { note, expiresAt });
      toast.success(`${APPROVAL_STATUS_LABEL[next]}: ${row.subject_name ?? row.subject_id}`);
    } catch (e: unknown) {
      setStatus(row.id, before.status, before.expires_at);
      toast.error(e instanceof Error ? e.message : String(e));
    }
  };
  return { rows, setRows, loading, error, reload: () => setTick((t) => t + 1), decide };
}

/** Reads the rows once for everything under it (the approvals route's layout). */
export function SpendApprovalsProvider({ orgId, children }: { orgId: string | null; children: ReactNode }) {
  const data = useApprovalsRead(orgId, true);
  return <SpendApprovalsContext.Provider value={data}>{children}</SpendApprovalsContext.Provider>;
}

/** The shared rows under a provider; this component's own read outside one. */
export function useSpendApprovalsData(orgId: string | null): SpendApprovalsData {
  const shared = useContext(SpendApprovalsContext);
  const own = useApprovalsRead(orgId, shared === null);
  return shared ?? own;
}
