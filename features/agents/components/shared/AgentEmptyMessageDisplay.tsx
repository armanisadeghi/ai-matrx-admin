import { useAppSelector } from "@/lib/redux/hooks";
import { selectInstanceAgentName } from "@/features/agents/redux/execution-system/instance-ui-state/instance-ui-state.selectors";
import { selectInstanceAgentDescription } from "@/features/agents/redux/execution-system/instance-ui-state/instance-ui-state.selectors";
import { Webhook } from "lucide-react";
import dynamic from "next/dynamic";

const MarkdownStream = dynamic(
  () =>
    import("@/components/MarkdownStreamImpl").then((m) => ({
      default: m.default,
    })),
  { ssr: false },
);

export function AgentEmptyMessageDisplay({
  conversationId,
}: {
  conversationId: string;
}) {
  const agentName = useAppSelector(selectInstanceAgentName(conversationId));
  const agentDescription = useAppSelector(
    selectInstanceAgentDescription(conversationId),
  );
  return (
    <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-6 py-12">
      <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center">
        <Webhook className="w-12 h-12 text-primary" />
      </div>
      <div className="space-y-3 max-w-md mx-auto">
        <p className="text-lg font-medium">{agentName ?? "Ready to run"}</p>
        {agentDescription && (
          <MarkdownStream content={agentDescription} hideCopyButton={true} />
        )}
        {!agentDescription && (
          <p className="text-sm text-muted-foreground mt-1">
            Fill in any variables below and type a message to start.
          </p>
        )}
      </div>
    </div>
  );
}
