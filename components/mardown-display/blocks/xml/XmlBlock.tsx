"use client";

import React, { useState } from "react";
import { cn } from "@/styles/themes/utils";
import { ChevronRight, ChevronDown, Copy, Check } from "lucide-react";

interface XmlBlockProps {
  content: string;
  language?: string;
  className?: string;
}

interface XmlToken {
  type:
    | "open"
    | "close"
    | "selfClose"
    | "text"
    | "comment"
    | "declaration"
    | "cdata";
  tagName?: string;
  attributes?: Array<{ name: string; value: string }>;
  text?: string;
  raw: string;
  indent: number;
}

function tokenizeXml(content: string): XmlToken[] {
  const tokens: XmlToken[] = [];
  const lines = content.split("\n");

  for (const line of lines) {
    const indent = line.search(/\S|$/);
    const trimmed = line.trim();

    if (!trimmed) {
      tokens.push({ type: "text", text: "", raw: line, indent });
      continue;
    }

    if (trimmed.startsWith("<!--")) {
      tokens.push({ type: "comment", text: trimmed, raw: line, indent });
      continue;
    }

    if (trimmed.startsWith("<?")) {
      tokens.push({ type: "declaration", text: trimmed, raw: line, indent });
      continue;
    }

    if (trimmed.startsWith("<![CDATA[")) {
      tokens.push({ type: "cdata", text: trimmed, raw: line, indent });
      continue;
    }

    // Match tags on this line
    const tagRegex =
      /<\/?([a-zA-Z][\w.-]*)((?:\s+[\w.-]+\s*=\s*(?:"[^"]*"|'[^']*'))*)\s*(\/?)>/g;
    let lastEnd = 0;
    let match: RegExpExecArray | null;
    let foundTag = false;

    while ((match = tagRegex.exec(trimmed)) !== null) {
      foundTag = true;
      const beforeTag = trimmed.slice(lastEnd, match.index).trim();
      if (beforeTag) {
        tokens.push({
          type: "text",
          text: beforeTag,
          raw: beforeTag,
          indent: lastEnd === 0 ? indent : indent + 2,
        });
      }

      const isClosing = match[0].startsWith("</");
      const isSelfClosing = match[3] === "/" || match[0].endsWith("/>");
      const tagName = match[1];
      const attrString = match[2];

      const attributes: Array<{ name: string; value: string }> = [];
      const attrRegex = /([\w.-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g;
      let attrMatch: RegExpExecArray | null;
      while ((attrMatch = attrRegex.exec(attrString)) !== null) {
        attributes.push({
          name: attrMatch[1],
          value: attrMatch[2] ?? attrMatch[3],
        });
      }

      if (isClosing) {
        tokens.push({ type: "close", tagName, raw: match[0], indent });
      } else if (isSelfClosing) {
        tokens.push({
          type: "selfClose",
          tagName,
          attributes,
          raw: match[0],
          indent,
        });
      } else {
        tokens.push({
          type: "open",
          tagName,
          attributes,
          raw: match[0],
          indent,
        });
      }

      lastEnd = match.index + match[0].length;
    }

    if (!foundTag) {
      tokens.push({ type: "text", text: trimmed, raw: line, indent });
    } else {
      const remaining = trimmed.slice(lastEnd).trim();
      if (remaining) {
        tokens.push({
          type: "text",
          text: remaining,
          raw: remaining,
          indent: indent + 2,
        });
      }
    }
  }

  return tokens;
}

function renderAttributes(
  attrs: Array<{ name: string; value: string }>,
): React.ReactNode {
  return attrs.map((attr, i) => (
    <span key={i}>
      {" "}
      <span className="text-amber-600 dark:text-amber-400">{attr.name}</span>
      <span className="text-muted-foreground">=</span>
      <span className="text-green-600 dark:text-green-400">
        &quot;{attr.value}&quot;
      </span>
    </span>
  ));
}

const XmlBlock: React.FC<XmlBlockProps> = ({
  content,
  language = "xml",
  className,
}) => {
  const [copied, setCopied] = useState(false);
  const [collapsed, setCollapsed] = useState<Set<number>>(new Set());
  const tokens = tokenizeXml(content);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const toggleCollapse = (idx: number) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const findMatchingClose = (openIdx: number): number => {
    const openToken = tokens[openIdx];
    if (openToken.type !== "open" || !openToken.tagName) return openIdx;
    let depth = 1;
    for (let j = openIdx + 1; j < tokens.length; j++) {
      const t = tokens[j];
      if (t.type === "open" && t.tagName === openToken.tagName) depth++;
      if (t.type === "close" && t.tagName === openToken.tagName) {
        depth--;
        if (depth === 0) return j;
      }
    }
    return tokens.length - 1;
  };

  const hiddenRanges: Set<number> = new Set();
  for (const idx of collapsed) {
    const end = findMatchingClose(idx);
    for (let j = idx + 1; j <= end; j++) hiddenRanges.add(j);
  }

  return (
    <div
      className={cn(
        "my-3 rounded-lg border border-border bg-card overflow-hidden",
        className,
      )}
    >
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-border/50 bg-muted/30">
        <span className="text-xs font-mono font-semibold text-orange-600 dark:text-orange-400">
          {language.toUpperCase()}
        </span>
        <button
          onClick={handleCopy}
          className="p-1 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
        >
          {copied ? (
            <Check className="w-3.5 h-3.5 text-green-500" />
          ) : (
            <Copy className="w-3.5 h-3.5" />
          )}
        </button>
      </div>
      <div className="px-3 py-2 font-mono text-sm leading-relaxed overflow-x-auto">
        {tokens.map((token, idx) => {
          if (hiddenRanges.has(idx)) return null;

          const style = { paddingLeft: token.indent * 8 };

          if (token.type === "text" && !token.text) {
            return <div key={idx} className="h-3" />;
          }

          if (token.type === "comment") {
            return (
              <div
                key={idx}
                className="text-muted-foreground italic"
                style={style}
              >
                {token.text}
              </div>
            );
          }

          if (token.type === "declaration" || token.type === "cdata") {
            return (
              <div key={idx} className="text-muted-foreground" style={style}>
                {token.text}
              </div>
            );
          }

          if (token.type === "text") {
            return (
              <div key={idx} className="text-foreground" style={style}>
                {token.text}
              </div>
            );
          }

          if (token.type === "close") {
            return (
              <div key={idx} style={style}>
                <span className="text-muted-foreground">&lt;/</span>
                <span className="text-red-600 dark:text-red-400">
                  {token.tagName}
                </span>
                <span className="text-muted-foreground">&gt;</span>
              </div>
            );
          }

          if (token.type === "selfClose") {
            return (
              <div key={idx} style={style}>
                <span className="text-muted-foreground">&lt;</span>
                <span className="text-blue-600 dark:text-blue-400">
                  {token.tagName}
                </span>
                {token.attributes && renderAttributes(token.attributes)}
                <span className="text-muted-foreground"> /&gt;</span>
              </div>
            );
          }

          // open tag
          const isCollapsed = collapsed.has(idx);
          const hasChildren =
            idx + 1 < tokens.length && tokens[idx + 1].type !== "close";

          return (
            <div
              key={idx}
              className="flex items-start group/line hover:bg-muted/30 rounded-sm -mx-1 px-1"
              style={style}
            >
              {hasChildren ? (
                <button
                  onClick={() => toggleCollapse(idx)}
                  className="mr-1 mt-0.5 p-0 flex-shrink-0 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {isCollapsed ? (
                    <ChevronRight className="w-3.5 h-3.5" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5" />
                  )}
                </button>
              ) : (
                <span className="w-[18px] flex-shrink-0" />
              )}
              <span>
                <span className="text-muted-foreground">&lt;</span>
                <span className="text-blue-600 dark:text-blue-400">
                  {token.tagName}
                </span>
                {token.attributes && renderAttributes(token.attributes)}
                <span className="text-muted-foreground">&gt;</span>
                {isCollapsed && (
                  <span className="ml-1 text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                    ...
                  </span>
                )}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default XmlBlock;
