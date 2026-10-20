"use client";

// PLAYGROUND MODULE: a small sample canvas body, loaded by the frame through a dynamic import
// only when the person opens the canvas (the toolbar's "loaded" readout shows when). The frame
// draws its title row. Its line count is local state, so closing and reopening shows the canvas
// stays mounted once loaded. Static sample.
import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@ai-matrx/design-system/controls";
import type { CanvasProps } from "@/features/shell/frame/types";

const LINES = [
  "Where we are: three clinics live, two in onboarding.",
  "What we change: one intake form for every clinic.",
  "What we measure: time from first call to first visit.",
  "Who owns it: Dana for intake, Arjun for follow-up.",
  "When we check: the first Monday of each month.",
];

export default function SampleCanvas(_props: CanvasProps) {
  const [count, setCount] = useState(2);
  return (
    <div className="h-full min-h-0 overflow-y-auto p-6" data-testid="sample-canvas">
      <div className="mx-auto max-w-2xl space-y-3">
        <h2 className="type-title">Quarterly plan outline</h2>
        {LINES.slice(0, count).map((line, i) => (
          <p key={line} className="type-body">
            {i + 1}. {line}
          </p>
        ))}
        {count < LINES.length ? (
          <Button variant="quiet" icon={<Plus />} onClick={() => setCount(count + 1)}>
            Add a line
          </Button>
        ) : null}
      </div>
    </div>
  );
}
