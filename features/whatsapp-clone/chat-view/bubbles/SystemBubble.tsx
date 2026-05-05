import { Lock } from "lucide-react";
import type { WAMessage } from "../../types";

interface SystemBubbleProps {
  message: WAMessage;
}

export function SystemBubble({ message }: SystemBubbleProps) {
  const isEncryption = message.systemKind === "encryption";
  return (
    <div className="flex w-full justify-center px-4 py-1">
      <div className="flex max-w-[80%] items-start gap-2 rounded-lg bg-amber-100/70 px-3 py-2 text-center text-[12.5px] leading-[18px] text-amber-900 shadow-sm dark:bg-amber-900/40 dark:text-amber-100">
        {isEncryption ? (
          <Lock
            className="mt-0.5 h-3.5 w-3.5 shrink-0"
            strokeWidth={2}
            aria-hidden
          />
        ) : null}
        <span>{message.content}</span>
      </div>
    </div>
  );
}
