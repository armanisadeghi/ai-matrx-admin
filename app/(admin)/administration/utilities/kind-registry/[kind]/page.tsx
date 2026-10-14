// Per-kind Shape System page — /administration/utilities/kind-registry/[kind]
// (super-admin gated by the (admin) layout). Deep-linkable; tabs:
// Preview (live kind_example rows rendered through the REAL production
// BlockRenderer → applyIrKindRoute path) · Gate (browser-run dual gate,
// read-only) · Schema (fields + emitted_json_schema) · Assets (the kind's
// shape-doctor row + live skill / content-block / component / surface lists) ·
// Code (the selected DB-authored kind_component source, editable + persisted).

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import KindDetailClient from "@/features/content-ir/admin/KindDetailClient";
import KindDetailUnavailable from "@/features/content-ir/admin/KindDetailUnavailable";
import { gatherKindDetail } from "@/features/content-ir/admin/shape-doctor-server";

interface PageProps {
  params: Promise<{ kind: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  // The App Router already decodes dynamic segment params — decoding again
  // double-decodes a literal `%` in the kind name.
  const { kind } = await params;
  const slug = kind;
  return {
    title: `${slug} — Kind Registry`,
    description: `Preview, edit component code, inspect the gate, schema, and asset status for the "${slug}" kind.`,
  };
}

export default async function KindDetailPage({
  params,
  searchParams,
}: PageProps) {
  const [{ kind }, sp] = await Promise.all([params, searchParams]);
  const result = await gatherKindDetail(kind);
  if (result.status === "missing") notFound();
  // A read that did not answer degrades to one honest line with Try again —
  // never a 500 for the whole page (SHAPES-BUGS 2.1).
  if (result.status === "unavailable") {
    return <KindDetailUnavailable kind={kind} message={result.message} />;
  }
  const detail = result.detail;

  const initialTab = typeof sp.tab === "string" ? sp.tab : undefined;
  return <KindDetailClient detail={detail} initialTab={initialTab} />;
}
