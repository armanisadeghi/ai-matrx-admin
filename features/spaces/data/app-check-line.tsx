// AT-FIX-H 3: the "Checked ..." line of a connected-app trigger. It moves with the REAL result of "Check now" the moment the
// server answers, and never goes back to an older stored time (the re-read of the list may still hold the one before).
import type { AutomationItem } from "@ai-matrx/records";

/** What one "Check now" answered, and when the answer arrived. */
export interface AppCheckResult {
  at: string;
  ok: boolean;
  says: string | null;
}

/** The sentence and its tone for an automation's check line. */
export function appCheckLine(
  item: Pick<AutomationItem, "app_says" | "app_checked_at">,
  result: AppCheckResult | null | undefined,
): { text: string; problem: boolean } {
  const stored = item.app_checked_at ? Date.parse(item.app_checked_at) : Number.NEGATIVE_INFINITY;
  if (result && Date.parse(result.at) >= stored) {
    return result.ok === false && result.says
      ? { text: result.says, problem: true }
      : { text: `Checked ${new Date(result.at).toLocaleString()}`, problem: false };
  }
  if (item.app_says) return { text: item.app_says, problem: true };
  return item.app_checked_at
    ? { text: `Checked ${new Date(item.app_checked_at).toLocaleString()}`, problem: false }
    : { text: "Not checked yet", problem: false };
}

export function AppCheckText({ item, result }: { item: Pick<AutomationItem, "app_says" | "app_checked_at">; result?: AppCheckResult | null }) {
  const line = appCheckLine(item, result);
  return (
    <span className={`type-secondary min-w-0 flex-1 truncate ${line.problem ? "text-destructive" : "text-muted-foreground"}`} data-testid="spaces-automation-app-checked">
      {line.text}
    </span>
  );
}
