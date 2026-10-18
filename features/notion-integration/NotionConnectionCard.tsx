"use client";

/**
 * NotionConnectionCard — the person's own Notion workspaces (the Slack card's shape, one row per
 * workspace). "Connect Notion" runs Notion's sign-in in a popup; the token stays in the Vault.
 */

import { useEffect } from "react";
import { Loader2, LogIn, Unplug } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ErrorNotice } from "@ai-matrx/design-system";
import { confirm } from "@/components/dialogs/confirm/ConfirmDialogHost";
import { cn } from "@/lib/utils";
import { NOTION_ICON_URL } from "./service";
import { useNotionConnection } from "./useNotionConnection";

export function NotionConnectionCard({
  compact = false,
  onConnected,
}: {
  compact?: boolean;
  onConnected?: () => void;
}) {
  const notion = useNotionConnection();
  const workspaces = notion.connection?.workspaces ?? [];
  const connected = notion.connection?.connected === true && workspaces.length > 0;
  const oauthAvailable = notion.connection?.oauth_available !== false;

  useEffect(() => {
    if (connected) onConnected?.();
  }, [connected, onConnected]);

  const returnUrl =
    typeof window === "undefined" ? "/settings" : `${window.location.pathname}${window.location.search}`;

  return (
    <Card id="integration-notion" className={cn("scroll-mt-20", connected && "border-emerald-500/40")}>
      <CardContent className={cn("space-y-3", compact ? "p-3" : "p-3 sm:p-4")}>
        <div className="flex items-start gap-3">
          <img src={NOTION_ICON_URL} alt="" className="mt-0.5 h-6 w-6 shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">Notion</p>
            <p className="truncate text-xs text-muted-foreground">
              {notion.loading ? "Checking…" : "Brings formula values and text into Notion imports"}
            </p>
          </div>
        </div>

        {workspaces.map((workspace) => (
          <div key={workspace.connection_id} className="flex items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm">
                {workspace.workspace_name ?? "Workspace"}
                {workspace.user_name ? ` · ${workspace.user_name}` : ""}
              </p>
              <p className="text-xs text-muted-foreground">{workspace.status}</p>
            </div>
            <Button
              variant="outline"
              disabled={notion.busy}
              onClick={async () => {
                const ok = await confirm({
                  title: "Disconnect Notion?",
                  description: `AI Matrx forgets your Notion sign-in for ${workspace.workspace_name ?? "this workspace"}.`,
                  confirmLabel: "Disconnect",
                  variant: "destructive",
                });
                if (ok) await notion.disconnect(workspace.connection_id);
              }}
            >
              {notion.busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Unplug className="h-3.5 w-3.5" />}
              Disconnect
            </Button>
          </div>
        ))}

        {!notion.loading ? (
          <Button
            disabled={notion.busy || !oauthAvailable}
            onClick={() => void notion.signIn(returnUrl)}
          >
            {notion.busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <LogIn className="h-3.5 w-3.5" />}
            {!oauthAvailable ? "Not set up yet" : connected ? "Connect another workspace" : "Connect Notion"}
          </Button>
        ) : null}

        {notion.error ? <ErrorNotice size="inline" className="text-xs" message={notion.error} /> : null}
      </CardContent>
    </Card>
  );
}
