"use client";

/**
 * The small inline "Full name?" field beside the Name slot (Report 2026-10-15). It shows only when the server's
 * name-strength check (aidream services/brand_intake/name_strength.py) found the confirmed name weak ("Sarah")
 * with nothing to anchor it, and so skipped the name searches. Typing a full name re-runs them with it; Skip keeps
 * the handle-based searches. Never a question card; it takes the place of nothing.
 */

import { useState } from "react";
import { X } from "lucide-react";
import { Button, Field } from "@ai-matrx/design-system/controls";

export function FullNameAsk({ shownName, onFullName, onSkip }: {
  /** The weak name the profile showed. */
  shownName: string;
  onFullName: (fullName: string) => void;
  onSkip: () => void;
}) {
  const [text, setText] = useState("");
  const send = () => {
    const value = text.trim();
    if (value) onFullName(value);
  };
  return (
    <div className="flex flex-wrap items-center gap-2 px-4 pb-2" data-testid="smart-add-full-name">
      <Field
        aria-label="Full name"
        // ui-exception: a short raw value typed into one slot
        placeholder={`Full name? (${shownName} …)`}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") send();
          if (e.key === "Escape") onSkip();
        }}
        className="min-w-0 flex-1"
      />
      <Button variant="primary" onClick={send} disabled={!text.trim()}>
        Search
      </Button>
      <Button variant="quiet" aria-label="Skip" icon={<X />} onClick={onSkip}>
        Skip
      </Button>
    </div>
  );
}
