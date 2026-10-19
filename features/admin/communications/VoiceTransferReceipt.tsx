"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { InfoHint } from "@/components/official/InfoHint";
import { ErrorNotice } from "@ai-matrx/design-system";
import type { VoiceTransferReceipt as Receipt } from "@/lib/communications/voice/transfer-receipt";
import { loadTransferReceipt } from "./transfer-receipt-service";

export function VoiceTransferReceipt({
  eventId,
  callId,
}: {
  eventId: number;
  callId: string;
}) {
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [loading, setLoading] = useState(false),
    [error, setError] = useState("");
  async function review() {
    setLoading(true);
    setError("");
    setReceipt(null);
    try {
      setReceipt(await loadTransferReceipt(eventId, callId));
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Transfer result could not be loaded.",
      );
    } finally {
      setLoading(false);
    }
  }
  const outcome =
    receipt?.state === "conflict"
      ? "Conflicting evidence"
      : receipt?.connection === "connected"
        ? "Connected"
        : receipt?.connection === "not-connected"
          ? "Not connected"
          : "Unconfirmed";
  return (
    <div className="flex w-full flex-wrap items-center gap-3">
      <Button
        variant="outline"
        disabled={loading}
        onClick={() => void review()}
      >
        {loading
          ? "Loading result…"
          : receipt
            ? "Refresh result"
            : "Review result"}
      </Button>
      {error && <ErrorNotice message={error} size="compact" />}
      {receipt && (
        <div
          role="status"
          className="flex flex-wrap items-center gap-2 text-sm"
        >
          <span>{outcome}</span>
          <span>Callbacks: {receipt.deliveryCount}</span>
          <InfoHint text="Current provider evidence, including duplicate callbacks. A connection does not prove the caller's task was completed." />
        </div>
      )}
    </div>
  );
}
