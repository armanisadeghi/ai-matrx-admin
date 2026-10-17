// features/unified-data/home/archiveFormFromHome.ts — NARROW-FIXES item 3
//
// A FORM ARCHIVES FROM ITS ROW. The store's one form door (`custom.form_archive`, through the client's
// `formArchive`; `formRestore` is its way back) already existed; the list's row menu just never
// offered it. The row leaves the list at once, the archive runs behind it, and a refusal (the store's
// own sentence — admin on its table) puts the row back and says why. Never silent.

import type { RecordsClient } from "@ai-matrx/records/core";

export type FormArchiveOutcome =
  | { outcome: "archived"; sentence: string }
  | { outcome: "refused"; sentence: string };

export async function archiveFormFromHome({
  client,
  formId,
  onOptimisticHide,
  onRollback,
}: {
  client: Pick<RecordsClient, "formArchive">;
  formId: string;
  onOptimisticHide: () => void;
  onRollback: () => void;
}): Promise<FormArchiveOutcome> {
  onOptimisticHide();
  const answered = await client.formArchive({ form_id: formId });
  if (!answered.ok) {
    onRollback();
    return { outcome: "refused", sentence: answered.error.message || "Couldn’t archive the form. Try again." };
  }
  const data = answered.data as { sentence?: string | null };
  return { outcome: "archived", sentence: data.sentence?.trim() || "Form archived." };
}

export async function restoreFormFromHome({
  client,
  formId,
}: {
  client: Pick<RecordsClient, "formRestore">;
  formId: string;
}): Promise<FormArchiveOutcome> {
  const answered = await client.formRestore({ form_id: formId });
  if (!answered.ok) return { outcome: "refused", sentence: answered.error.message || "Couldn’t restore the form. Try again." };
  const data = answered.data as { sentence?: string | null };
  return { outcome: "archived", sentence: data.sentence?.trim() || "Form restored." };
}
