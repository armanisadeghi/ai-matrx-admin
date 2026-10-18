"use client";

/**
 * SlackConnectionCard — the person's own Slack account (the Hugging Face card's
 * shape). "Connect Slack" runs Slack's sign-in in a popup; Slack's user token is
 * checked with auth.test and kept in the Vault by aidream; this card only ever
 * sees the workspace and user names.
 */

import { useEffect } from "react";
import { CheckCircle2, Loader2, LogIn, Unplug } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ErrorNotice } from "@ai-matrx/design-system";
import { confirm } from "@/components/dialogs/confirm/ConfirmDialogHost";
import { cn } from "@/lib/utils";
import { SLACK_ICON_URL } from "./service";
import { useSlackConnection } from "./useSlackConnection";

export function SlackConnectionCard({
  compact = false,
  onConnected,
}: {
  compact?: boolean;
  onConnected?: () => void;
}) {
  const slack = useSlackConnection();
  const connected = slack.connection?.connected === true;
  const workspace = slack.connection?.team_name ?? null;
  const user = slack.connection?.user_name ?? null;
  const oauthAvailable = slack.connection?.oauth_available !== false;

  useEffect(() => {
    if (connected) onConnected?.();
  }, [connected, onConnected]);

  const returnUrl =
    typeof window === "undefined" ? "/settings" : `${window.location.pathname}${window.location.search}`;

  return (
    <Card id="integration-slack" className={cn("scroll-mt-20", connected && "border-emerald-500/40")}>
      <CardContent className={cn("space-y-3", compact ? "p-3" : "p-3 sm:p-4")}>
        <div className="flex items-start gap-3">
          <img src={SLACK_ICON_URL} alt="" className="mt-0.5 h-6 w-6 shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">Slack</p>
            <p className="truncate text-xs text-muted-foreground">
              {slack.loading
                ? "Checking…"
                : connected
                  ? `${workspace ?? "Workspace"}${user ? ` · @${user}` : ""}`
                  : "Read channels and post as you"}
            </p>
          </div>
          {connected ? (
            <div className="flex shrink-0 gap-2">
              <Button variant="outline" disabled={slack.busy} onClick={() => void slack.check()}>
                {slack.checked ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> : null}
                Test
              </Button>
              <Button
                variant="outline"
                disabled={slack.busy}
                onClick={async () => {
                  const ok = await confirm({
                    title: "Disconnect Slack?",
                    description: `AI Matrx forgets your Slack sign-in for ${workspace ?? "this workspace"}. Slack automations stop.`,
                    confirmLabel: "Disconnect",
                    variant: "destructive",
                  });
                  if (ok) await slack.disconnect();
                }}
              >
                {slack.busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Unplug className="h-3.5 w-3.5" />}
                Disconnect
              </Button>
            </div>
          ) : null}
        </div>

        {!connected && !slack.loading ? (
          <Button
            disabled={slack.busy || !oauthAvailable}
            title={oauthAvailable ? undefined : "Not set up yet."}
            onClick={() => void slack.signIn(returnUrl)}
          >
            {slack.busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <LogIn className="h-3.5 w-3.5" />}
            Connect Slack
          </Button>
        ) : null}

        {slack.error ? <ErrorNotice size="inline" className="text-xs" message={slack.error} /> : null}
      </CardContent>
    </Card>
  );
}
