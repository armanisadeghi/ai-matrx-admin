"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ErrorNotice } from "@ai-matrx/design-system";
import { InfoHint } from "@/components/official/InfoHint";
import { resolveEntityDoors } from "@/components/official/entity-ref/doors";
import { loadTransferContexts } from "./transfer-context-service";
import type { TransferContextItem } from "./transfer-context";
export function VoiceTransferHistory() {
  const [items, setItems] = useState<TransferContextItem[]>([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState("");
  async function refresh() {
    setLoading(true);
    setError("");
    try {
      setItems(await loadTransferContexts());
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Unable to load transfer context.",
      );
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    let current = true;
    void loadTransferContexts()
      .then((rows) => {
        if (current) setItems(rows);
      })
      .catch((e) => {
        if (current)
          setError(
            e instanceof Error ? e.message : "Unable to load transfer context.",
          );
      })
      .finally(() => {
        if (current) setLoading(false);
      });
    return () => {
      current = false;
    };
  }, []);
  return (
    <section
      aria-label="Recent transfer callbacks"
      className="space-y-3 border-t pt-5"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <h2 className="font-semibold">Recent transfer callbacks</h2>
          <InfoHint text="Latest 20 callbacks, grouped by call. Links open saved conversations; these rows do not confirm transfer success." />
        </div>
        <Button
          variant="outline"
          disabled={loading}
          onClick={() => void refresh()}
        >
          Refresh callbacks
        </Button>
      </div>
      {loading ? (
        <p role="status">Loading callbacks…</p>
      ) : error ? (
        <ErrorNotice message={error} size="compact" />
      ) : items.length === 0 ? (
        <p className="text-sm text-muted-foreground">No transfer callbacks.</p>
      ) : (
        <ul className="space-y-2">
          {items.map((item) => {
            const conversationHref = item.conversationId
              ? resolveEntityDoors("conversation", item.conversationId).href
              : null;
            return (
              <li
                key={item.callId}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3"
              >
                <time dateTime={item.observedAt} className="text-sm">
                  {new Date(item.observedAt).toLocaleString()}
                </time>
                {conversationHref ? (
                  <Link
                    className="text-sm text-primary underline underline-offset-4"
                    href={conversationHref}
                  >
                    Open conversation
                  </Link>
                ) : (
                  <span className="text-sm text-muted-foreground">
                    Context unavailable
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
