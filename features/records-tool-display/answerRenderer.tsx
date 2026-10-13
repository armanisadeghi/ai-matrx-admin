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
import { readRecordsAnswer } from "./readRecordsAnswer";

const RecordsAnswerBody = lazyToolRenderer("RecordsAnswerBody");
const RefusalLine = lazyToolRenderer("RefusalLine");

export function answerRenderer(Fallback: ComponentType<ToolRendererProps>) {
  function DataToolAnswer(props: ToolRendererProps) {
    const { entry } = props;
    if (entry.status === "error") return <RefusalLine message={entry.errorMessage} />;
    const answer = readRecordsAnswer(resultAsObject(entry));
    if (!answer) return <Fallback {...props} />;
    return <RecordsAnswerBody answer={answer} />;
  }
  DataToolAnswer.displayName = `DataToolAnswer(${Fallback.displayName ?? Fallback.name ?? "Renderer"})`;
  return DataToolAnswer;
}
