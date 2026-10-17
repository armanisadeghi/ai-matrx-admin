"use client";

// Acknowledge / Mark fixed (optional note) / Ignore / Reopen — one door shared
// by the issue table's row actions and the one-issue record page. Writes the
// status straight to workflow.review_issue (row security: editors of the
// workflow). A fixed issue reopens on its own when it happens again.

import { useState } from "react";

import { TextInputDialog } from "@ai-matrx/design-system";
import { toast } from "@/lib/toast";

import type { ReviewIssueRow, ReviewIssueStatus } from "../model";
import { setIssueStatus } from "../service";

const DONE_WORD: Record<ReviewIssueStatus, string> = {
  open: "Reopened",
  acknowledged: "Marked seen",
  fixed: "Marked fixed",
  ignored: "Ignored",
};

export function useIssueActions(onChanged: (issue: ReviewIssueRow) => void) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const [fixing, setFixing] = useState<ReviewIssueRow | null>(null);

  const apply = async (issue: ReviewIssueRow, status: ReviewIssueStatus, note?: string | null) => {
    setBusyId(issue.id);
    try {
      const next = await setIssueStatus(issue.id, status, note);
      onChanged(next);
      toast.success(DONE_WORD[status]);
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Could not change this issue.");
    } finally {
      setBusyId(null);
    }
  };

  const act = (issue: ReviewIssueRow, status: ReviewIssueStatus) => {
    if (status === "fixed") {
      setFixing(issue);
      return;
    }
    void apply(issue, status);
  };

  const dialog = (
    <TextInputDialog
      open={fixing !== null}
      onOpenChange={(open) => {
        if (!open) setFixing(null);
      }}
      title="Mark fixed"
      description="It reopens by itself if it happens again."
      placeholder="What changed (optional)"
      defaultValue={fixing?.resolution_note ?? ""}
      multiline
      rows={3}
      confirmLabel="Mark fixed"
      busy={fixing !== null && busyId === fixing.id}
      validate={() => null}
      onConfirm={async (value) => {
        if (!fixing) return;
        await apply(fixing, "fixed", value);
        setFixing(null);
      }}
    />
  );

  return { act, busyId, dialog };
}
