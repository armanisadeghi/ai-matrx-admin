"use client";

/**
 * EditorErrorBlock — chip rendering for `<editor_error>` tags.
 *
 * The chat-markdown splitter parses the XML and feeds attributes into
 * `metadata`. This component renders the chip; on hover, a popover shows the
 * full message + surrounding code.
 */

import React from "react";
import { AlertCircle, AlertTriangle, Info, Lightbulb } from "lucide-react";
import {
  Peek,
  PeekHoverCard,
  type PeekBlock,
  type PeekRecord,
  type PeekTone,
} from "@ai-matrx/design-system";

interface EditorErrorBlockProps {
  content: string;
  metadata?: Record<string, unknown>;
}

const SEVERITY_STYLE: Record<
  string,
  { icon: React.ComponentType<{ className?: string }>; color: string; bg: string; border: string }
> = {
  error: {
    icon: AlertCircle,
    color: "text-red-700 dark:text-red-300",
    bg: "bg-red-50 dark:bg-red-950/30",
    border: "border-red-200 dark:border-red-900/50",
  },
  warning: {
    icon: AlertTriangle,
    color: "text-amber-700 dark:text-amber-300",
    bg: "bg-amber-50 dark:bg-amber-950/30",
    border: "border-amber-200 dark:border-amber-900/50",
  },
  info: {
    icon: Info,
    color: "text-blue-700 dark:text-blue-300",
    bg: "bg-blue-50 dark:bg-blue-950/30",
    border: "border-blue-200 dark:border-blue-900/50",
  },
  hint: {
    icon: Lightbulb,
    color: "text-emerald-700 dark:text-emerald-300",
    bg: "bg-emerald-50 dark:bg-emerald-950/30",
    border: "border-emerald-200 dark:border-emerald-900/50",
  },
};

const SEVERITY_TONE: Record<string, PeekTone> = {
  error: "danger",
  warning: "warning",
  info: "info",
  hint: "success",
};

function basename(path: string): string {
  const i = Math.max(path.lastIndexOf("/"), path.lastIndexOf("\\"));
  return i === -1 ? path : path.slice(i + 1);
}

function extractMessage(content: string): {
  message: string;
  surrounding: string | null;
} {
  // Inner XML: <message>…</message><surrounding_code>…</surrounding_code>
  // We do a tolerant extract — if tags are absent we use the raw content.
  const msgMatch = content.match(/<message>([\s\S]*?)<\/message>/);
  const surrMatch = content.match(
    /<surrounding_code>([\s\S]*?)<\/surrounding_code>/,
  );
  return {
    message: msgMatch ? msgMatch[1].trim() : content.trim(),
    surrounding: surrMatch ? surrMatch[1].trim() : null,
  };
}

export default function EditorErrorBlock({
  content,
  metadata,
}: EditorErrorBlockProps) {
  const file = typeof metadata?.file === "string" ? metadata.file : "";
  const line = typeof metadata?.line === "string" ? metadata.line : undefined;
  const severity = typeof metadata?.severity === "string" ? metadata.severity : "error";
  const source = typeof metadata?.source === "string" ? metadata.source : undefined;
  const code = typeof metadata?.code === "string" ? metadata.code : undefined;

  const { message, surrounding } = extractMessage(content);
  const style = SEVERITY_STYLE[severity] ?? SEVERITY_STYLE.error;
  const Icon = style.icon;
  const label = `${file ? basename(file) : "Diagnostic"}${line ? `:${line}` : ""}`;

  const body: PeekBlock[] = [];
  if (file) {
    body.push({ fact: `${file}${line ? `:${line}` : ""}`, muted: true, wrap: true });
  }
  body.push({
    section: severity.charAt(0).toUpperCase() + severity.slice(1),
    glyph: style.icon,
    tone: SEVERITY_TONE[severity] ?? "danger",
    text: message,
    breaks: true,
  });
  if (surrounding) {
    body.push({ section: "Surrounding code", code: { text: surrounding } });
  }
  const record: PeekRecord = {
    kind: "Diagnostic",
    id: `${file}:${line ?? ""}:${code ?? ""}`,
    title: label,
    glyph: style.icon,
    subtitle: source ? `${source}${code ? ` · ${code}` : ""}` : undefined,
    body,
  };

  return (
    <PeekHoverCard
      side="top"
      label={label}
      trigger={
        <span
          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium border ${style.bg} ${style.border} ${style.color} cursor-default align-middle`}
        >
          <Icon className="w-3.5 h-3.5 shrink-0" />
          <span className="font-mono truncate max-w-[16ch]">{label}</span>
        </span>
      }
    >
      <Peek size="md" record={record} />
    </PeekHoverCard>
  );
}
