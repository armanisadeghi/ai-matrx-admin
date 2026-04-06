import ChatCollapsibleWrapper from "@/components/mardown-display/blocks/ChatCollapsibleWrapper";
import { MessageSquare } from "lucide-react";

export function ChatCollapsible({ instanceId }: { instanceId: string }) {
  return (
    <div className="w-full max-w-md">
      <ChatCollapsibleWrapper
        icon={
          <MessageSquare className="h-5 w-5 text-blue-500 dark:text-blue-400" />
        }
        title="Chat Messages"
        initialOpen={true}
      >
        <div className="p-3 text-gray-700 dark:text-gray-300">
          <p>This collapsible component is designed for chat interfaces.</p>
          <p className="mt-2">
            It has a more rounded styling and a divider between header and
            content.
          </p>
        </div>
      </ChatCollapsibleWrapper>
    </div>
  );
}
