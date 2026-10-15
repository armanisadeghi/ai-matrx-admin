"use client";

// The ProInput / ProTextarea control cluster at real widths: the compact mic
// capsule, and ProInput stepping its cluster down as the field narrows.

import { useState, type ReactNode } from "react";
import { ProInput } from "@/components/official/ProInput";
import { ProTextarea } from "@/components/official/ProTextarea";

const INPUT_WIDTHS = [560, 400, 320, 260, 220, 160, 120, 90];
const TEXTAREA_WIDTHS = [560, 320, 220, 160, 120];
const ONE_ROW_WIDTHS = [560, 320, 200, 140];
const SAMPLE = "Quarterly planning notes for the west region team";

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-24 shrink-0 pt-2 font-mono type-secondary text-muted-foreground">
        {label}
      </div>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-3 rounded-lg border border-border bg-card p-4">
      <h2 className="type-title text-foreground">{title}</h2>
      {children}
    </section>
  );
}

export function ProFieldWidthsShowcase() {
  // Seeded with text so Clear and the "…" items show from the start.
  const [values, setValues] = useState<Record<string, string>>(() => {
    const seeded: Record<string, string> = {};
    for (const w of INPUT_WIDTHS) {
      seeded[`sub-${w}`] = SAMPLE;
      seeded[`short-${w}`] = SAMPLE;
    }
    return seeded;
  });
  const bind = (key: string) => ({
    value: values[key] ?? "",
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setValues((prev) => ({ ...prev, [key]: e.target.value })),
  });

  return (
    <div className="space-y-4">
      <Section title="ProInput — plain">
        {INPUT_WIDTHS.map((w) => (
          <Row key={w} label={`${w}px`}>
            <div style={{ width: w, maxWidth: "100%" }}>
              <ProInput {...bind(`in-${w}`)} placeholder="Type a title…" />
            </div>
          </Row>
        ))}
      </Section>

      <Section title="ProInput — submit + clear">
        {INPUT_WIDTHS.map((w) => (
          <Row key={w} label={`${w}px`}>
            <div style={{ width: w, maxWidth: "100%" }}>
              <ProInput
                {...bind(`sub-${w}`)}
                placeholder="Ask something…"
                clearable
                onSubmit={() => setValues((p) => ({ ...p, [`sub-${w}`]: "" }))}
              />
            </div>
          </Row>
        ))}
      </Section>

      <Section title="ProInput — 28px tall (window-bar title)">
        {INPUT_WIDTHS.slice(0, 5).map((w) => (
          <Row key={w} label={`${w}px`}>
            <div style={{ width: w, maxWidth: "100%" }}>
              <ProInput {...bind(`short-${w}`)} placeholder="Untitled task" className="h-7" />
            </div>
          </Row>
        ))}
      </Section>

      <Section title="ProTextarea">
        {TEXTAREA_WIDTHS.map((w) => (
          <Row key={w} label={`${w}px`}>
            <div style={{ width: w, maxWidth: "100%" }}>
              <ProTextarea {...bind(`ta-${w}`)} placeholder="Type your transcript…" expandable />
            </div>
          </Row>
        ))}
      </Section>

      <Section title="ProTextarea — submit">
        {TEXTAREA_WIDTHS.map((w) => (
          <Row key={w} label={`${w}px`}>
            <div style={{ width: w, maxWidth: "100%" }}>
              <ProTextarea
                {...bind(`tas-${w}`)}
                placeholder="Message…"
                onSubmit={() => setValues((p) => ({ ...p, [`tas-${w}`]: "" }))}
              />
            </div>
          </Row>
        ))}
      </Section>

      <Section title="ProTextarea — one row + submit">
        {ONE_ROW_WIDTHS.map((w) => (
          <Row key={w} label={`${w}px`}>
            <div style={{ width: w, maxWidth: "100%" }}>
              <ProTextarea
                {...bind(`row1-${w}`)}
                rows={1}
                placeholder="Reply…"
                onSubmit={() => setValues((p) => ({ ...p, [`row1-${w}`]: "" }))}
              />
            </div>
          </Row>
        ))}
      </Section>

      <Section title="ProTextarea — one row, small type (grid cell)">
        {ONE_ROW_WIDTHS.map((w) => (
          <Row key={w} label={`${w}px`}>
            <div style={{ width: w, maxWidth: "100%" }}>
              <ProTextarea {...bind(`cell-${w}`)} rows={1} className="text-xs" placeholder="Value…" />
            </div>
          </Row>
        ))}
      </Section>
    </div>
  );
}
