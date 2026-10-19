// record-view: none — a full-viewport builder for an orchestra, not the record view
import type { Metadata } from "next";
import { OrchestraBuilder } from "@/features/agents/orchestras/components/OrchestraBuilder";

export const metadata: Metadata = {
  title: "Set Builder",
};

export default async function OrchestraBuilderPage({
  params,
}: {
  params: Promise<{ conductorId: string }>;
}) {
  const { conductorId } = await params;
  return <OrchestraBuilder conductorId={conductorId} />;
}
