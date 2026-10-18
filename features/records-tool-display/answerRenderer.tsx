"use client";

/**
 * The data tools' renderer factory — LIGHT, because it is registered when the shell loads
 * (`./registerDataToolRenderers`). It reads the answer from the result's own shape here
 * (`readRecordsAnswer`, no imports) and draws through the lazy bodies, which load from the
 * tool-renderer registry's ONE impl module (`features/chat-tool-renderers/toolRendererImpls`).
 * An answer it does not read goes to `Fallback` (the tool's existing renderer), so registering
 * it never takes a view away.
 */

import type { ComponentType } from "react";
import type { ToolRendererProps } from "@ai-matrx/chat/tool-call-visualization/types";
import { resultAsObject } from "@ai-matrx/chat/tool-call-visualization/renderers/_shared";
import { lazyToolRenderer } from "@/features/chat-tool-renderers/lazyToolRenderer";
import { readRecordsAnswer, type RecordsAnswer } from "./readRecordsAnswer";

const RecordsAnswerBody = lazyToolRenderer("RecordsAnswerBody");
const RefusalLine = lazyToolRenderer("RefusalLine");

export function answerRenderer(Fallback: ComponentType<ToolRendererProps>) {
  function DataToolAnswer(props: ToolRendererProps) {
    const { entry } = props;
    if (entry.status === "error") return <RefusalLine message={entry.errorMessage} />;
    const answer = readRecordsAnswer(resultAsObject(entry));
    if (!answer) return <Fallback {...props} />;
    return <RecordsAnswerBody answer={withRunHint(answer, entry.arguments)} />;
  }
  DataToolAnswer.displayName = `DataToolAnswer(${Fallback.displayName ?? Fallback.name ?? "Renderer"})`;
  return DataToolAnswer;
}

function argsOf(args: Record<string, unknown> | null | undefined): Record<string, unknown> {
  const nested = args?.args;
  return nested && typeof nested === "object" && !Array.isArray(nested) ? (nested as Record<string, unknown>) : args ?? {};
}

/**
 * Which copy a background answer is, from what was asked when the answer cannot say (a start
 * answer carries only the run id). Only a HINT: the card reads the run's own input first.
 */
function withRunHint(answer: RecordsAnswer, args: Record<string, unknown> | null | undefined): RecordsAnswer {
  if (answer.kind !== "background" || answer.run) return answer;
  const asked = argsOf(args);
  if (typeof asked.import_root === "string") return { ...answer, run: "import" };
  if (asked.map != null || typeof asked.map_name === "string") return { ...answer, run: "copy" };
  return answer;
}

/**
 * A `notion_sync` / `data_sync` call that runs (or reads) a background copy. Read from the answer
 * when it is held, else from what was asked — a reopened conversation can hold the call before its
 * result is loaded, and the card must not fold away into a line meanwhile.
 */
export function isBackgroundRunCall(entry: ToolRendererProps["entry"]): boolean {
  if (readRecordsAnswer(resultAsObject(entry))?.kind === "background") return true;
  const top = entry.arguments ?? {};
  const action = typeof top.action === "string" ? top.action : null;
  if (action !== "notion_sync" && action !== "data_sync") return false;
  const asked = argsOf(top);
  return typeof asked.import_root === "string" || asked.background === true || typeof asked.run_id === "string";
}

