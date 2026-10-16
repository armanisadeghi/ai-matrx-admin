"use client";

/**
 * HuggingFaceConnectionCard — the person's own Hugging Face account.
 *
 * Two ways in, side by side (Hugging Face's own apps do the same): "Sign in with
 * Hugging Face" (OAuth, read access to their repositories and the gated models
 * they accepted) or "Paste a token" from huggingface.co/settings/tokens. Either
 * way the token is checked by Hugging Face first and kept in the Vault; this
 * card only ever sees the account name.
 */

import { useEffect, useState } from "react";
import { ExternalLink, KeyRound, Loader2, LogIn, Unplug } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ErrorNotice, Input } from "@ai-matrx/design-system";
import { confirm } from "@/components/dialogs/confirm/ConfirmDialogHost";
import { cn } from "@/lib/utils";
import { HUGGING_FACE_ICON_URL, HUGGING_FACE_TOKENS_URL } from "./service";
import { useHuggingFaceConnection } from "./useHuggingFaceConnection";

export function HuggingFaceConnectionCard({
  compact = false,
  onConnected,
}: {
  compact?: boolean;
  onConnected?: () => void;
}) {
  const hf = useHuggingFaceConnection();
  const [pasting, setPasting] = useState(false);
  const [token, setToken] = useState("");
  const connected = hf.connection?.connected === true;
  const name = hf.connection?.account_name ?? null;
  const oauthAvailable = hf.connection?.oauth_available !== false;

  useEffect(() => {
    if (connected) onConnected?.();
  }, [connected, onConnected]);

  const returnUrl =
    typeof window === "undefined" ? "/settings" : `${window.location.pathname}${window.location.search}`;

  return (
    <Card id="integration-huggingface" className={cn("scroll-mt-20", connected && "border-emerald-500/40")}>
      <CardContent className={cn("space-y-3", compact ? "p-3" : "p-3 sm:p-4")}>
        <div className="flex items-start gap-3">
          {connected && hf.connection?.avatar_url ? (
            <Avatar className="mt-0.5 h-8 w-8 shrink-0">
              <AvatarImage src={hf.connection.avatar_url} alt={name ?? "Hugging Face"} />
              <AvatarFallback className="text-xs">{(name ?? "HF").slice(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
          ) : (
            <img src={HUGGING_FACE_ICON_URL} alt="" className="mt-0.5 h-6 w-6 shrink-0" />
          )}
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">Hugging Face</p>
            <p className="truncate text-xs text-muted-foreground">
              {hf.loading
                ? "Checking…"
                : connected
                  ? `Connected as @${name}`
                  : "Gated models and your private repos"}
            </p>
          </div>
          {connected ? (
            <Button
             
              variant="outline"
              disabled={hf.busy}
              onClick={async () => {
                const ok = await confirm({
                  title: "Disconnect Hugging Face?",
                  description: `AI Matrx forgets the token for @${name}. Gated and private models stop downloading.`,
                  confirmLabel: "Disconnect",
                  variant: "destructive",
                });
                if (ok) await hf.disconnect();
              }}
            >
              {hf.busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Unplug className="h-3.5 w-3.5" />}
              Disconnect
            </Button>
          ) : null}
        </div>

        {!connected && !hf.loading ? (
          <div className="flex flex-wrap gap-2">
            <Button
             
              disabled={hf.busy || !oauthAvailable}
              title={oauthAvailable ? undefined : "Not set up yet. Paste a token instead."}
              onClick={() => void hf.signIn(returnUrl)}
            >
              {hf.busy && !pasting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <LogIn className="h-3.5 w-3.5" />}
              Sign in with Hugging Face
            </Button>
            <Button variant="outline" disabled={hf.busy} onClick={() => setPasting((v) => !v)}>
              <KeyRound className="h-3.5 w-3.5" />
              Paste a token
            </Button>
          </div>
        ) : null}

        {pasting && !connected ? (
          <form
            className="flex flex-col gap-2 sm:flex-row"
            onSubmit={(event) => {
              event.preventDefault();
              if (!token.trim()) return;
              void hf.pasteToken(token).then((saved) => {
                if (saved) {
                  setToken("");
                  setPasting(false);
                }
              });
            }}
          >
            <Input
              type="password"
              autoComplete="off"
              spellCheck={false}
              placeholder="hf_…"
              aria-label="Hugging Face access token"
              value={token}
              onChange={(event) => setToken(event.target.value)}
              className="h-8 flex-1 font-mono text-xs"
            />
            <Button type="submit" disabled={hf.busy || !token.trim()}>
              {hf.busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
              Save
            </Button>
            <a
              href={HUGGING_FACE_TOKENS_URL}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 self-center text-xs text-muted-foreground hover:text-foreground"
            >
              Get a token <ExternalLink className="h-3 w-3" />
            </a>
          </form>
        ) : null}

        {hf.error ? <ErrorNotice size="inline" className="text-xs" message={hf.error} /> : null}
      </CardContent>
    </Card>
  );
}
