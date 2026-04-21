import Link from "next/link";
import { Webhook, Zap } from "lucide-react";
import { PlusTapButton } from "@/components/icons/tap-buttons";
import { Button } from "@/components/ui/button";

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
        <Button variant="ghost" size="sm" className="h-8 px-2" asChild>
          <Link href="/agents/shortcuts" aria-label="Personal agent shortcuts">
            <Zap className="h-4 w-4 mr-1.5" />
            <span className="text-xs font-medium hidden sm:inline">
              Shortcuts
            </span>
          </Link>
        </Button>
        <Link href="/agents/new" aria-label="Create new agent">
          <PlusTapButton />
        </Link>
      </div>
    </div>
  );
}
