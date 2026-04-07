import ChatCollapsibleWrapper from "@/components/mardown-display/blocks/ChatCollapsibleWrapper";
import { MessageSquare } from "lucide-react";
import { AgentRunner } from "../smart/AgentRunner";

export function ChatCollapsible({ instanceId }: { instanceId: string }) {
  return (
    <div className="w-full max-w-md mx-auto">
      <ChatCollapsibleWrapper
        icon={
          <MessageSquare className="h-5 w-5 text-blue-500 dark:text-blue-400" />
        }
        title="Chat Messages"
        initialOpen={true}
      >
        <AgentRunner instanceId={instanceId} compact className="h-full" />
      </ChatCollapsibleWrapper>
    </div>
  );
}
