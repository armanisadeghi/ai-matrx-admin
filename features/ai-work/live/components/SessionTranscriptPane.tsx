"use client";

import { useEffect, useState } from "react";
import { ErrorNotice } from "@ai-matrx/design-system";
import { Button } from "@/components/ui/button";
import { supabase } from "@/utils/supabase/client";
import { ProviderConversationTranscript } from "../../components/ProviderConversationTranscript";
import {
  readProviderConversationWith,
  type ProviderConversationRead,
} from "../../service/providerConversationRead";

/**
 * What the pane says for a read that did not produce a transcript. Three
 * different truths, never one "could not be read":
 * - the read itself failed → its own reason, with Retry;
 * - no row came back → the conversation is missing or not shared with this
 *   account (RLS answers both with silence), with Retry;
 * - the transcript is real and empty → "No transcript yet".
 */
export type TranscriptPaneState =
  | { kind: "loading" }
  | { kind: "ready" }
  | { kind: "empty" }
  | { kind: "not-provider" }
  | { kind: "not-visible" }
  | { kind: "failed"; message: string; error: unknown };

export function transcriptPaneState(read: ProviderConversationRead | null): TranscriptPaneState {
  if (!read) return { kind: "loading" };
  if (read.state === "ready") {
    return read.detail.visibleMessageCount === 0 ? { kind: "empty" } : { kind: "ready" };
  }
  if (read.state === "not-provider") return { kind: "not-provider" };
  if (read.error == null) return { kind: "not-visible" };
  const message =
    read.error instanceof Error
      ? read.error.message
      : typeof read.error === "object" && read.error !== null && "message" in read.error
        ? String((read.error as { message: unknown }).message)
        : String(read.error);
  return { kind: "failed", message: `The transcript read failed: ${message}`, error: read.error };
}

/** The session's mirrored transcript, read client-side through the one reader. */
export function SessionTranscriptPane({ address }: { address: string }) {
  const [loaded, setLoaded] = useState<{
    address: string;
    attempt: number;
    read: ProviderConversationRead;
  } | null>(null);
  const [attempt, setAttempt] = useState(0);
  const read = loaded?.address === address && loaded.attempt === attempt ? loaded.read : null;

  useEffect(() => {
    let current = true;
    void readProviderConversationWith(supabase, address).then(
      (result) => {
        if (current) setLoaded({ address, attempt, read: result });
      },
      (cause: unknown) => {
        if (current) {
          setLoaded({ address, attempt, read: { state: "unavailable", detail: null, error: cause ?? new Error("Unknown failure") } });
        }
      },
    );
    return () => {
      current = false;
    };
  }, [address, attempt]);

  const state = transcriptPaneState(read);
  const retry = (
    <Button variant="outline" onClick={() => setAttempt((n) => n + 1)}>
      Retry
    </Button>
  );

  switch (state.kind) {
    case "loading":
      return (
        <div className="space-y-3 p-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-lg bg-muted/60" />
          ))}
        </div>
      );
    case "empty":
      return (
        <div className="p-4">
          <p className="text-sm text-muted-foreground">No transcript yet.</p>
        </div>
      );
    case "not-provider":
      return (
        <div className="p-4">
          <p className="text-sm text-muted-foreground">
            This conversation is not a coding-session mirror.
          </p>
        </div>
      );
    case "not-visible":
      return (
        <div className="space-y-2 p-4">
          <p className="text-sm text-muted-foreground">
            No transcript: this session's conversation is missing or not shared with your account.
          </p>
          {retry}
        </div>
      );
    case "failed":
      return (
        <div className="p-4">
          <ErrorNotice message={state.message} error={state.error} size="compact" actions={retry} />
        </div>
      );
    default:
      return read?.state === "ready" ? (
        <ProviderConversationTranscript key={address} detail={read.detail} embedded />
      ) : null;
  }
}
