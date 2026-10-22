/**
 * components/dialogs/value-prompts/ValuePromptsDialog.tsx — THE value-prompts dialog body (the app's writing
 * boxes: ProInput for one value, ProTextarea for several). Rendered as the summon overlay
 * `valuePromptsDialog` (definitions/valuePromptsDialog.render.tsx); chat's `promptForValues` opens it through its windows
 * port (CHAT_WINDOWS.valuePromptsDialog) and awaits summon's requestOverlay; the app renders its own body, not chat's. Submit answers
 * `{ name: answer }`; dismiss answers `null` — blocked while any field is `required`.
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
import type { ValuePromptsAnswers, ValuePromptsRequest } from "@ai-matrx/chat/ui/valuePromptsOpener";
import { useOverlayRequest, type OverlayRenderProps } from "@ai-matrx/summon/react";
import { ProTextarea } from "@/components/official/ProTextarea";
import { ProInput } from "@/components/official/ProInput";

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

/** The `valuePromptsDialog` overlay's render: answers the request chat's `promptForValues` filed. */
export default function ValuePromptsDialogRender({ data, close }: OverlayRenderProps) {
  const { request, settle } = useOverlayRequest<ValuePromptsRequest, ValuePromptsAnswers>(data, close);
  return request ? <ValuePromptsDialog request={request} settle={settle} /> : null;
}

/** THE value-prompts body. One request per mount (each ask opens the overlay afresh). */
export function ValuePromptsDialog({
  request,
  settle,
}: {
  request: ValuePromptsRequest;
  settle: (answers: ValuePromptsAnswers) => void;
}) {
  const [answers, setAnswers] = React.useState<Record<string, string>>(() => initialAnswers(request));
  const open = true;

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
      // Every prompt can be canceled (Escape, the X, outside click): required fields only
      // disable the submit button; callers get `null`.
      settle(null);
    },
    [request, settle],
  );

  // One short value (Rename, a title, a name) is a plain one-line field, current value selected,
  // Enter confirms — the shape every file manager gives it. Several values, or a value that
  // already spans lines, keep the multi-line boxes.
  const single =
    request && request.fields.length === 1 && !(answers[request.fields[0].name] ?? "").includes("\n")
      ? request.fields[0]
      : null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{request?.title ?? ""}</DialogTitle>
          {/* Dialog semantics need a description; with none supplied it stays screen-reader-only. */}
          <DialogDescription className={request?.description ? undefined : "sr-only"}>
            {request?.description ?? request?.title ?? ""}
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
              {single?.name === field.name ? (
                <ProInput
                  id={`value-prompt-${field.name}`}
                  value={answers[field.name] ?? ""}
                  autoFocus
                  onFocus={(e) => e.currentTarget.select()}
                  onChange={(e) =>
                    setAnswers((prev) => ({ ...prev, [field.name]: e.target.value }))
                  }
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.nativeEvent.isComposing) {
                      e.preventDefault();
                      handleSubmit();
                    }
                  }}
                  className="text-base md:text-sm"
                />
              ) : (
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
              )}
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
