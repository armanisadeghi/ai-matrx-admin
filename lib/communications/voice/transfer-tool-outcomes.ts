import type { Tables } from "@/types/database.types";

export interface TransferToolOutcomes {
  recorded: number;
  returnedWithoutError: number;
  reportedErrors: number;
  unconfirmed: number;
  failedToolNames: string[];
}
type ToolEvidence = Pick<
  Tables<{ schema: "chat" }, "tool_call">,
  "status" | "success" | "is_error" | "tool_name"
>;

/** Recorded tool outcomes never establish that a real-world action succeeded. */
export function projectTransferToolOutcomes(
  rows: ToolEvidence[],
): TransferToolOutcomes | null {
  const result: TransferToolOutcomes = {
    recorded: rows.length,
    returnedWithoutError: 0,
    reportedErrors: 0,
    unconfirmed: 0,
    failedToolNames: [],
  };
  const names = new Set<string>();
  for (const row of rows) {
    if (
      !["pending", "running", "delegated", "completed", "error"].includes(
        row.status,
      ) ||
      typeof row.success !== "boolean" ||
      ![true, false, null].includes(row.is_error)
    )
      return null;
    // An explicit reported error wins over the legacy success=true default on error rows.
    if (row.status === "error" || row.is_error === true) {
      result.reportedErrors++;
      if (
        typeof row.tool_name === "string" &&
        /^[a-zA-Z][a-zA-Z0-9_.: -]{0,63}$/.test(row.tool_name)
      )
        names.add(
          row.tool_name
            .replace(/[_.:]+/g, " ")
            .replace(/\s+/g, " ")
            .trim(),
        );
    } else if (
      row.status === "completed" &&
      row.success === true &&
      row.is_error === false
    ) {
      result.returnedWithoutError++;
    } else result.unconfirmed++;
  }
  result.failedToolNames = [...names].sort().slice(0, 3);
  return result;
}
