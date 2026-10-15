/**
 * components/dialogs/value-prompts/ValuePromptsDialogHostImpl.tsx
 *
 * Heavy implementation of the global value-prompts dialog host. Mounted
 * lazily by `ValuePromptsDialogHost.tsx` via `next/dynamic({ ssr: false })`.
 *
 * Imperative model: `promptForValues(...)` pushes a request into the opener's
 * queue and `useOpenerHost` (`@ai-matrx/kit/opener-react`) drains it one at a
 * time — the registration, queue and settle-once machinery are the package's,
 * never re-implemented here. This component renders a single dialog with one
 * input per field. Submit resolves `{ name: answer }`; dismiss resolves `null`
 * — but dismissal is blocked while any field is `required` (per the
 * ValueMapping contract: "the user cannot cancel; submit is the only way out").
 *
 * The per-request answer state is seeded through the hook's `onActivate`, which
 * runs inside the same React update that makes a request active — so no frame
 * ever shows the previous request's answers.
 */

"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useOpenerHost } from "@ai-matrx/kit/opener-react";
import {
  valuePromptsOpener,
  type ValuePromptsRequest,
} from "./valuePromptsOpener";
import { ProTextarea } from "@/components/official/ProTextarea";

function initialAnswers(req: ValuePromptsRequest): Record<string, string> {
  const out: Record<string, string> = {};
  for (const f of req.fields) {
    out[f.name] =
      f.defaultValue === undefined || f.defaultValue === null
        ? ""
        : String(f.defaultValue);
  }
  return out;
}

export default function ValuePromptsDialogHostImpl() {
  const [answers, setAnswers] = React.useState<Record<string, string>>({});
  const { request, open, settle } = useOpenerHost(valuePromptsOpener, {
    onActivate: (next) => setAnswers(initialAnswers(next)),
  });

  const missingRequired = !!request?.fields.some(
    (f) => f.required && !(answers[f.name] ?? "").trim(),
  );

  const handleSubmit = React.useCallback(() => {
    if (!request || missingRequired) return;
    settle(answers);
  }, [request, answers, missingRequired, settle]);

  const handleOpenChange = React.useCallback(
    (next: boolean) => {
      if (next || !request) return;
      // Every prompt can be cancelled (Escape, the X, outside click): required fields only
      // disable the submit button; callers get `null`.
      settle(null);
    },
    [request, settle],
  );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{request?.title ?? ""}</DialogTitle>
          <DialogDescription>
            {request?.description ??
              "This action needs a few values from you before it runs."}
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4 py-1">
          {request?.fields.map((field) => (
            <div key={field.name} className="flex flex-col gap-1.5">
              <Label
                htmlFor={`value-prompt-${field.name}`}
                className="text-sm text-foreground"
              >
                {field.prompt}
                {field.required && (
                  <span className="ml-1 text-destructive">*</span>
                )}
              </Label>
              <ProTextarea
                id={`value-prompt-${field.name}`}
                value={answers[field.name] ?? ""}
                onChange={(e) =>
                  setAnswers((prev) => ({
                    ...prev,
                    [field.name]: e.target.value,
                  }))
                }
                rows={2}
                className="min-h-9 resize-y text-base md:text-sm"
              />
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => settle(null)}>
            Cancel
          </Button>
          <Button
            variant="primary"
            type="button"
            onClick={handleSubmit}
            disabled={missingRequired}
          >
            {request?.submitLabel ?? "Continue"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
