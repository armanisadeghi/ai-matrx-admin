"use client";

// features/sharing/components/WhoCouldSeeOn.tsx — "Who could see this on…" (lane CLOSE-SHARE, acceptance test 15).
//
// A person with Full access picks a past moment; the store replays History (custom.who_could_see_on →
// history.who_could_see) and answers in names, each marked when they no longer have access. Refusals (History was not
// recording then, not Full access) are the store's own sentence, shown as is.

import { useState } from "react";
import { History, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DateTimeField } from "@ai-matrx/design-system/controls";
import { storeDoors } from "@ai-matrx/records/core";

import { supabase } from "@/utils/supabase/client";
import { PERMISSION_LEVEL_SHORT_LABELS } from "@/utils/permissions/levels";
import type { PermissionLevel } from "@/utils/permissions/types";

interface PastViewer {
  kind: string;
  id: string | null;
  name: string | null;
  email: string | null;
  level: string | null;
  via: string;
  has_access_now: boolean | null;
}

export function WhoCouldSeeOn({ recordId }: { recordId: string }) {
  const [at, setAt] = useState("");
  const [busy, setBusy] = useState(false);
  const [people, setPeople] = useState<PastViewer[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function ask() {
    setBusy(true);
    setError(null);
    const { data, error: failed } = await storeDoors(supabase).rpc("who_could_see_on", { p_record_id: recordId, p_at: new Date(at).toISOString() });
    setBusy(false);
    const answer = data as { success?: boolean; error?: string; people?: PastViewer[] } | null;
    if (failed || !answer?.success) {
      setPeople(null);
      setError(failed?.message ?? answer?.error ?? "That moment could not be replayed.");
      return;
    }
    setPeople(answer.people ?? []);
  }

  return (
    <section className="mt-3 flex flex-col gap-1.5 border-t border-border pt-3" data-who-could-see-on={recordId}>
      <span className="flex items-center gap-1 text-xs font-medium">
        <History className="h-3.5 w-3.5" />
        Who could see this on…
      </span>
      <div className="flex items-center gap-1">
        <DateTimeField
          aria-label="Moment to ask about"
          value={at}
          onValueChange={(v) => setAt(v ?? "")}
          className="min-w-0 flex-1"
        />
        <Button icon={busy ? <Loader2 className="animate-spin" /> : null} variant="outline" disabled={busy || at === ""} onClick={() => void ask()} data-who-could-see-ask="">
          Ask
        </Button>
      </div>
      {people ? (
        people.length === 0 ? (
          <p className="text-xs text-muted-foreground">Nobody could see it then.</p>
        ) : (
          <ul className="flex flex-col gap-0.5" data-who-could-see-list="">
            {people.map((p) => (
              <li key={`${p.kind}:${p.id ?? "public"}`} className="flex items-center justify-between gap-2 text-xs" data-who-could-see-person={p.id ?? ""}>
                <span className="min-w-0 truncate">
                  {p.name ?? p.email ?? "Someone"}
                  <span className="text-muted-foreground"> · {p.via}</span>
                </span>
                <span className="flex shrink-0 items-center gap-1 text-muted-foreground">
                  {p.level ? (PERMISSION_LEVEL_SHORT_LABELS[p.level as PermissionLevel] ?? p.level) : null}
                  {p.has_access_now === false ? <span className="rounded border border-border px-1" data-who-could-see-lost="">No access now</span> : null}
                </span>
              </li>
            ))}
          </ul>
        )
      ) : null}
      {error ? (
        <p role="alert" className="text-xs text-destructive" data-who-could-see-error="">
          {error}
        </p>
      ) : null}
    </section>
  );
}
