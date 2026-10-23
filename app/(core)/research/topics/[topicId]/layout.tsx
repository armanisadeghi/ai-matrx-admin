import { notFound } from "next/navigation";
import { RecordPageHeader } from "@/features/shell/components/header/templates/RecordPageHeader";
import {
  getTopicServer,
  getTopicOverviewServer,
  getResearchIntentsServer,
} from "@/features/research/service/server";
import { AccessGate } from "@ai-matrx/sharing/access/react";
import { IntelligenceIndicator } from "@/features/mandates/feature-intelligence/IntelligenceIndicator";
import { ROLE_MANDATE_KEYS } from "@/features/research/components/agents/constants";
import ResearchTopicShell from "./ResearchTopicShell";
import { createDynamicRouteMetadata } from "@/utils/route-metadata";
import { isUuidShape } from "@ai-matrx/kit/uuid";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ topicId: string }>;
}) {
  const { topicId } = await params;
  if (!isUuidShape(topicId)) {
    return createDynamicRouteMetadata("/research", {
      title: "Research topic",
      description: "Research topics in AI Matrx.",
      letter: "TD",
    });
  }

  const topic = await getTopicServer(topicId);
  // An empty read does not tell us the topic is gone — the tab title must not
  // say so. The page body resolves the real reason via <AccessGate>.
  if (!topic) {
    return createDynamicRouteMetadata("/research", {
      title: "Research topic",
      description: "Research topics in AI Matrx.",
      letter: "TD",
    });
  }

  return createDynamicRouteMetadata("/research", {
    title: topic.name,
    description:
      topic.description?.slice(0, 120) || `Research topic: ${topic.name}`,
    letter: "TD",
  });
}

export default async function ResearchTopicLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ topicId: string }>;
}) {
  const { topicId } = await params;

  if (!isUuidShape(topicId)) {
    notFound();
  }

  // Resolve access before starting reads that require an accessible topic.
  // A guest/expired session returns no topic; launching the overview RPC in
  // parallel would throw and replace the canonical AccessGate with Next's
  // opaque production Server Components error.
  const topic = await getTopicServer(topicId);

  // Was `notFound()`. A server read returning nothing means denied, deleted,
  // never-existed, or an expired session — four different answers that a 404
  // flattened into one wrong one. The gate asks the platform which it is and
  // offers a request when the topic is real and someone else's.
  if (!topic) {
    return (
      <div className="h-full overflow-hidden pt-[var(--shell-header-h)]">
        <AccessGate
          token="research_topic"
          id={topicId}
          fallbackHref="/research/topics"
          fallbackLabel="All topics"
        />
      </div>
    );
  }

  const [overview, intents] = await Promise.all([
    getTopicOverviewServer(topicId),
    getResearchIntentsServer(),
  ]);

  const intentLabel = topic.intent_key
    ? (intents.find((i) => i.key === topic.intent_key)?.label ?? null)
    : null;

  return (
    <>
      {/* THE page-top template: back + derived crumbs + the topic (its door lists every other topic),
          the intent as its status badge and the topic's AI jobs as its live indicator. */}
      <RecordPageHeader
        backHref="/research/topics"
        record={{ name: topic.name, token: "research_topic", id: topicId }}
        status={intentLabel ? { label: intentLabel } : undefined}
        indicator={
          <IntelligenceIndicator
            feature="research"
            mandateKeys={Object.values(ROLE_MANDATE_KEYS)}
            context={{ topicId }}
            label="The AI jobs that research this topic"
          />
        }
      />
      <div className="flex h-dvh flex-col bg-textured">
        {/* Spacer so the content starts below the glass header */}
        <div
          className="shrink-0"
          style={{ height: "var(--shell-header-h, 2.75rem)" }}
        />
        <div className="flex-1 min-h-0 w-full">
          <ResearchTopicShell
            topicId={topicId}
            initialData={{ topic, progress: overview }}
          >
            {children}
          </ResearchTopicShell>
        </div>
      </div>
    </>
  );
}
