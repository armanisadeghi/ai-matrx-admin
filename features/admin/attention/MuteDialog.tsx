"use client";

/**
 * MuteDialog — mute ONE item for any of the durations, with an optional note.
 *
 * Every duration can carry a note (harsh walk 2026-10-10: only "30 days" could, so a 1-hour mute
 * said nothing about why). The same dialog serves the attention dock and the alarm record page,
 * and "Change" on a muted record opens it pre-filled.
 */

import { useState } from "react";
import { SegmentedControl } from "@ai-matrx/design-system/controls";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ProTextarea } from "@/components/official/ProTextarea";
import { MUTE_CHOICES, type MuteChoice } from "./item-mute";

export interface MuteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** What is being muted, by name. */
  subject: string;
  initialChoiceId?: string;
  initialNote?: string | null;
  /** Server mutes are seen by every super admin; local ones by this browser. */
  scope: "server" | "local";
  onConfirm: (choice: MuteChoice, note: string | null) => Promise<void>;
}

export function MuteDialog(props: MuteDialogProps) {
  // Remount per opening so the choice and note start from the props each time.
  if (!props.open) return null;
  return <MuteDialogBody {...props} />;
}

function MuteDialogBody({ open, onOpenChange, subject, initialChoiceId, initialNote, scope, onConfirm }: MuteDialogProps) {
  const [choiceId, setChoiceId] = useState(initialChoiceId ?? MUTE_CHOICES[0].id);
  const [note, setNote] = useState(initialNote ?? "");
  const [busy, setBusy] = useState(false);
  const choice = MUTE_CHOICES.find((c) => c.id === choiceId) ?? MUTE_CHOICES[0];
  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title={`Mute "${subject}"`}
      description={scope === "server" ? "Every super admin sees the note. It comes back on its own." : "This browser only. It comes back on its own."}
      confirmLabel={`Mute for ${choice.label}`}
      busy={busy}
      onConfirm={async () => {
        setBusy(true);
        try {
          await onConfirm(choice, note.trim() || null);
          onOpenChange(false);
        } finally {
          setBusy(false);
        }
      }}
      content={
        <div className="flex flex-col gap-2" data-testid="mute-dialog">
          <SegmentedControl<string>
            aria-label="How long"
            value={choiceId}
            onValueChange={setChoiceId}
            data={MUTE_CHOICES.map((c) => ({ value: c.id, label: c.short }))}
          />
          <ProTextarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Why it can stay quiet (optional)"
            surfaceName="admin-attention-mute"
            rows={2}
          />
        </div>
      }
    />
  );
}
