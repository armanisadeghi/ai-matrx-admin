// record-view: none — a sub-view (study) inside a record or scope, not the record page; the record's own page carries the section
import type { Metadata } from "next";
import { toolMetadata } from "@/features/education/route-helpers";
import { ClassTestStudy } from "@/features/education/classes/components/ClassTestStudy";

export const metadata: Metadata = toolMetadata("classes");

export default async function ClassTestStudyPage({
  params,
}: {
  params: Promise<{ classId: string; testId: string }>;
}) {
  const { classId, testId } = await params;
  return <ClassTestStudy classId={classId} testId={testId} />;
}
