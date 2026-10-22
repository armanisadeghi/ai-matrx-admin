// features/visual-map-lab/subjects.ts — the six test subjects as lab samples.

import { SUBJECTS, type SubjectData, type SubjectVariantData } from "./subjects.data";
import { SOURCE_LABEL, type LabListRow } from "./types";

export const VARIANT_LABEL: Record<SubjectVariantData["variant"], string> = {
  archify: "First run",
  "archify-sonnet": "Second run",
};

export function subjectSampleId(subjectId: string, variant: SubjectVariantData["variant"]): string {
  return `subject:${subjectId}:${variant}`;
}

export function parseSubjectSampleId(id: string): { subject: SubjectData; variant: SubjectVariantData } | null {
  const [kind, subjectId, variant] = id.split(":");
  if (kind !== "subject") return null;
  const subject = SUBJECTS.find((s) => s.id === subjectId);
  const found = subject?.variants.find((v) => v.variant === variant);
  return subject && found ? { subject, variant: found } : null;
}

export function diagramTypeOf(spec: unknown): string | null {
  if (!spec || typeof spec !== "object") return null;
  const t = (spec as Record<string, unknown>).diagram_type;
  return typeof t === "string" && t ? t : null;
}

export function specTitle(spec: unknown, fallback: string): string {
  const meta = spec && typeof spec === "object" ? (spec as Record<string, unknown>).meta : null;
  const title = meta && typeof meta === "object" ? (meta as Record<string, unknown>).title : null;
  return typeof title === "string" && title ? title : fallback;
}

export function subjectListRows(): LabListRow[] {
  return SUBJECTS.flatMap((subject) =>
    subject.variants.map((variant) => ({
      id: subjectSampleId(subject.id, variant.variant),
      source: "subject" as const,
      kind: SOURCE_LABEL.subject,
      title: specTitle(variant.spec, subject.title),
      type: diagramTypeOf(variant.spec),
      subject: `${subject.id} ${subject.title}`,
      detail: VARIANT_LABEL[variant.variant],
      organizationId: null,
      createdAt: null,
      hasScreenshot: false,
    })),
  );
}
