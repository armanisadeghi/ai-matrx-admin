// Kind Builder — the admin surface that drives the `kind_architect` agent to
// build a whole kind end to end from a data structure (schema, live component,
// skill, content blocks, activation) in one pass. Super-admin gated by the
// (admin) layout. The run itself opens in /chat so tool calls stream visibly.

import type { Metadata } from "next";
import KindBuilderClient from "@/features/content-ir/admin/KindBuilderClient";

export const metadata: Metadata = {
  title: "Build a Kind",
  description:
    "Hand the admin builder agent a data structure; it builds and activates the whole kind end to end.",
};

export default async function KindBuilderPage({
  searchParams,
}: {
  searchParams: Promise<{ kind?: string | string[]; handoff?: string | string[] }>;
}) {
  // "Change for everyone" on an unregistered name links here with `?kind=<slug>`.
  const { kind, handoff } = await searchParams;
  const initialKind = typeof kind === "string" && kind.trim() ? kind.trim() : null;
  return (
    <div className="h-[calc(100dvh-2.5rem)] overflow-y-auto bg-textured">
      <KindBuilderClient
        initialKind={initialKind}
        handoff={typeof handoff === "string" ? handoff : null}
      />
    </div>
  );
}
