"use client";

/**
 * The per-kind page when its read did not answer (SHAPES-BUGS 2.1): one honest
 * line and Try again, never a crashed page and never a guessed verdict.
 */

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { DatabaseZap } from "lucide-react";
import { Button, EmptyState } from "@ai-matrx/design-system/controls";

export default function KindDetailUnavailable({ kind, message }: { kind: string; message: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <div className="flex h-full items-center justify-center p-6">
      <EmptyState
        icon={<DatabaseZap className="h-5 w-5" />}
        title={`Couldn't load "${kind}" right now`}
        line={<span title={message}>The database did not answer in time.</span>}
        action={
          <Button variant="outline" disabled={pending} onClick={() => startTransition(() => router.refresh())}>
            {pending ? "Trying…" : "Try again"}
          </Button>
        }
      />
    </div>
  );
}
