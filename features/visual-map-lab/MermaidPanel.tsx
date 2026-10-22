"use client";

// features/visual-map-lab/MermaidPanel.tsx — the Mermaid version of a sample: the source, the picture (rich-content's
// one MermaidRenderer) and the numbers measure() reads from that picture.

import { useEffect, useState } from "react";
import { MermaidRenderer } from "@ai-matrx/rich-content/mermaid/MermaidRenderer";
import type { MermaidRenderOptions } from "@ai-matrx/rich-content/mermaid/types";
import { useThemeMode } from "@/styles/themes/useThemeMode";
import { MeasurementTables } from "./MeasurementTables";
import { RawJson } from "./JsonTables";
import { LabError } from "./LabError";
import { RecordId } from "@ai-matrx/design-system";

export function MermaidPanel({ source, fileId }: { source: string; fileId: string | null }) {
  const mode = useThemeMode();
  const [svg, setSvg] = useState<SVGSVGElement | null>(null);
  const [measured, setMeasured] = useState<unknown>(null);
  const [error, setError] = useState<string | null>(null);
  const options: MermaidRenderOptions = { theme: mode === "dark" ? "dark" : "default", look: "classic", layout: "dagre" };

  useEffect(() => {
    if (!svg) return undefined;
    let live = true;
    const timer = setTimeout(() => {
      void import("@ai-matrx/diagrams/measure")
        .then(({ measure }) => {
          if (live && svg.isConnected) setMeasured(measure(svg));
        })
        .catch((e) => live && setError(e instanceof Error ? e.message : "The measurement failed."));
    }, 500);
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [svg]);

  return (
    <div className="flex flex-col gap-4">
      <div className="overflow-auto rounded-md border border-border bg-card p-2">
        <MermaidRenderer source={source} options={options} isStreamActive={false} onSvgMounted={setSvg} />
      </div>
      <section className="flex flex-col gap-2">
        <span className="type-body font-medium">Mermaid measure()</span>
        {error ? <LabError message={error} /> : measured ? <MeasurementTables measurements={measured} label="Mermaid measurements" /> : <span className="type-secondary text-muted-foreground">Measuring</span>}
      </section>
      <section className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="type-body font-medium">Source</span>
          {fileId && <RecordId value={fileId} label="Mermaid file" />}
        </div>
        <RawJson value={source} label="Mermaid source" />
      </section>
    </div>
  );
}
