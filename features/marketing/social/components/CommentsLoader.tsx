"use client";

/** Post detail: "Load comments" with a count choice and its estimate. */

import { formatCount } from "@ai-matrx/kit/format";
import { useState } from "react";

import { Button, Select, type SelectOption } from "@ai-matrx/design-system/controls";
import { useQueryClient } from "@tanstack/react-query";

import { useSocialSpend } from "../cost";
import { COMMENT_COUNT_CHOICES } from "../post-count";
import { ingestPost, socialErrorMessage } from "../server";
import type { IngestPostResult } from "../types";
import { socialKeys } from "../hooks";
import { LimitLine } from "./FetchLines";
import { ProviderChip } from "./ProviderFallbackNotice";

const OPTIONS: SelectOption<string>[] = COMMENT_COUNT_CHOICES.map((n) => ({ value: String(n), label: String(n) }));

export function CommentsLoader({ url, organizationId }: { url: string; organizationId: string }) {
  const client = useQueryClient();
  const { commentsText } = useSocialSpend(organizationId);
  const [count, setCount] = useState("20");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<IngestPostResult | null>(null);

  async function load() {
    setBusy(true);
    setError("");
    try {
      const r = await ingestPost({ url, landMedia: false, transcript: false, force: true, commentsMax: Number(count) }, { organizationId });
      setResult(r);
      await client.invalidateQueries({ queryKey: socialKeys.all });
    } catch (err) {
      setError(socialErrorMessage(err, "Couldn't load comments"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2" data-testid="comments-loader">
      <Select aria-label="How many comments" value={count} options={OPTIONS} onValueChange={setCount} disabled={busy} />
      <Button variant="outline" onClick={() => void load()} disabled={busy}>
        {busy ? "Loading…" : "Load comments"}
      </Button>
      <span className="text-xs text-muted-foreground" aria-live="polite">
        {error ? <span className="text-destructive">{error}</span> : result ? `${formatCount(result.comments_stored ?? 0, { locale: "en-US" })} comments loaded` : (commentsText(Number(count)) ?? "")}
      </span>
      {result ? <ProviderChip trace={result.trace} /> : null}
      <LimitLine limit={result?.comments_limit_applied} organizationId={organizationId} />
    </div>
  );
}
