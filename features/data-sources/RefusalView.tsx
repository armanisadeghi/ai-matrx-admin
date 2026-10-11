"use client";

import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { Button } from "@ai-matrx/design-system/controls";
import { formatCount } from "@ai-matrx/kit/format";

import { ErrorAlchemyMenu } from "@/components/errors/ErrorAlchemyMenu";

import type { DataFetchRefusal } from "./contract";
import { limitSettingHref } from "./hooks";

export function RefusalView({ refusal, organizationId, onBack }: { refusal: DataFetchRefusal; organizationId: string | null; onBack: () => void }) {
  const href = refusal.limit ? limitSettingHref(organizationId, refusal.limit.setting) : null;
  return (
    <div className="m-auto flex max-w-sm flex-col items-center gap-3 text-center" role="alert" data-fetch-refusal={refusal.code}>
      <AlertTriangle className="h-6 w-6 text-destructive" />
      <div className="flex items-center gap-1 text-sm font-medium text-foreground">
        {refusal.userMessage}
        <ErrorAlchemyMenu error={refusal.userMessage} />
      </div>
      {refusal.limit && (
        <div className="text-xs text-muted-foreground">
          Limit {formatCount(refusal.limit.value)}
          {href && (
            <>
              {" · "}
              <Link href={href} className="text-primary hover:underline" target="_blank">
                Change
              </Link>
            </>
          )}
        </div>
      )}
      <Button onClick={onBack}>Back</Button>
    </div>
  );
}
