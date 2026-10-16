"use client";

/**
 * EditorCodeSnippetBlock — chip rendering for `<editor_code_snippet>` tags.
 *
 * Hover reveals the full snippet with monospace formatting; the chip itself
 * shows file:range so the user can scan a message at a glance.
 */

import { Chip } from "@ai-matrx/design-system/controls";
import React from "react";
import { Code2 } from "lucide-react";
import { Peek, PeekHoverCard, type PeekRecord } from "@ai-matrx/design-system";

interface EditorCodeSnippetBlockProps {
  content: string;
  metadata?: Record<string, unknown>;
}

function basename(path: string): string {
  const i = Math.max(path.lastIndexOf("/"), path.lastIndexOf("\\"));
  return i === -1 ? path : path.slice(i + 1);
}

export default function EditorCodeSnippetBlock({
  content,
  metadata,
}: EditorCodeSnippetBlockProps) {
  const file = typeof metadata?.file === "string" ? metadata.file : "";
  const range = typeof metadata?.range === "string" ? metadata.range : "";
  const language = typeof metadata?.language === "string" ? metadata.language : "plaintext";

  const label = `${file ? basename(file) : "Snippet"}${range ? `:${range.replace(/^L?(\d+)-L?(\d+)$/, "$1-$2")}` : ""}`;
  const snippet = content.trim();

  const record: PeekRecord = {
    kind: "Code snippet",
    id: `${file}:${range}`,
    title: label,
    glyph: Code2,
    subtitle: language,
    body: [
      {
        section: "Snippet",
        code: {
          text: snippet,
          language,
          caption: `${file}${range ? ` · ${range}` : ""}` || undefined,
        },
      },
    ],
  };

  return (
    <PeekHoverCard
      side="top"
      trigger={<Chip tone="cyan" icon={<Code2 />} label={label} />}
      label={label}
    >
      <Peek size="md" record={record} />
    </PeekHoverCard>
  );
}
