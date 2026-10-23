/**
 * features/pdf/workspace/extractor/confirmPaidAi.tsx — the confirm step in front of every PAID AI action of the
 * PDF workspace (AI clean, re-clean, the full pipeline). One home: a click that spends never fires the call
 * itself, it asks here first. The cost sits behind the platform Cost door inside the question
 * (`components/cost/CostDoor`, points-and-money-in-the-ui: a confirm step keeps its confirm, the cost moves in the door).
 *
 * `workspace/__tests__/paid-ai-needs-the-confirm.test.ts` fails the build when a workspace file starts a paid
 * extractor call without importing this.
 */
import { confirm } from "@/components/dialogs/confirm/ConfirmDialogHost";
import { CostDoor } from "@/components/cost/CostDoor";

export type PaidPdfAiAction = "clean" | "reclean" | "pipeline";

export interface PaidPdfAiQuestion {
  title: string;
  confirmLabel: string;
  /** Plain words: what will happen and what it changes. */
  what: string;
  /** The Cost door row: what the price depends on (the server bills per page cleaned). */
  costRow: string;
}

export function paidPdfAiQuestion(action: PaidPdfAiAction, pageCount: number): PaidPdfAiQuestion {
  const pages = pageCount > 0 ? `${pageCount.toLocaleString()} ${pageCount === 1 ? "page" : "pages"}` : "every page";
  const costRow = `AI reads ${pages}. Larger documents cost more.`;
  switch (action) {
    case "clean":
      return { title: "Clean this document with AI?", confirmLabel: "Clean", what: "An AI model rewrites the extracted text of each page so it reads cleanly.", costRow };
    case "reclean":
      return { title: "Clean this document with AI again?", confirmLabel: "Clean again", what: "An AI model rewrites the extracted text again and replaces the current clean text.", costRow };
    case "pipeline":
      return { title: "Run the full pipeline?", confirmLabel: "Run", what: "Extracts, cleans with AI and chunks the document again.", costRow };
  }
}

/** True when the person said yes. Never throws: `confirm` always settles. */
export async function confirmPaidPdfAi(action: PaidPdfAiAction, pageCount: number): Promise<boolean> {
  const q = paidPdfAiQuestion(action, pageCount);
  return confirm({
    title: q.title,
    description: (
      <>
        {q.what} <CostDoor rows={[{ label: "This run", text: q.costRow }]} />
      </>
    ),
    confirmLabel: q.confirmLabel,
    cancelLabel: "Cancel",
  });
}
