import Link from "next/link";
import { Webhook } from "lucide-react";
import { PlusTapButton } from "@/components/icons/tap-buttons";

export function AgentsListHeader() {
  return (
    <div className="flex items-center justify-between w-full gap-2 px-1">
      {/* Left: title */}
      <div className="flex items-center gap-2 shrink-0">
        <Webhook className="w-4 h-4 text-muted-foreground" />
        <span className="text-sm font-semibold text-foreground">Agents</span>
      </div>

      {/* Right: actions */}
      <div className="flex items-center gap-1">
        <Link href="/agents/new" aria-label="Create new agent">
          <PlusTapButton />
        </Link>
      </div>
    </div>
  );
}
