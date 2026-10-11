import React from "react";
import {
    findVariableSections,
    isDeclarableVariableName,
    splitVariableText,
    type VariableSegment,
} from "@ai-matrx/chat/agents/utils/variable-utils";

import { BlockChip, type BlockHighlight } from "@/features/prompt-blocks/components/BlockChip";
import { blockChipState, splitBlockText } from "@/features/prompt-blocks/tokens";

interface HighlightedTextProps {
    text: string;
    validVariables?: string[];
    /** Prompt blocks: draws `{{<name>}}` as a chip (declared / missing / not declared). */
    blocks?: BlockHighlight;
}

// Helper component to render text with highlighted variables.
// Declared variables are green; undeclared-but-declarable names are red (a real
// mistake — they resolve to nothing at run time); tokens that can never be a
// variable name ({{step_N.output.field}}) are neutral, because the runtime
// substitutes by exact declared-name match and passes those through verbatim.
// This is the author's own prompt source, so a kind schema written into it
// (`"__kind": …`) is shown as written: the wrapper marks it a deliberate source
// view for the kind-leak sentinel; `contents` keeps it out of layout.
const SECTION_CHIP =
    "bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 border border-violet-200 dark:border-violet-800 rounded-md px-1 py-0.5 font-medium";
const LITERAL_CHIP = "bg-muted text-muted-foreground border border-border rounded-md px-1 py-0.5 font-medium";

// `{{#name}}…{{/name}}` / `{{^name}}…{{/name}}`: text kept only when the declared variable `name`
// is filled / empty. A matched pair of a declared name draws its markers as violet chips and shades
// the text between them; anything else (undeclared name, no matching end) is sent as written, so it
// stays neutral.
export const HighlightedText = ({ text, validVariables = [], blocks }: HighlightedTextProps) => {
    // `{{!name}}` is the author's example, not a variable: it stays plain text.
    const parts = splitVariableText(text);

    // Which marker segments belong to a matched section of a declared name.
    const starts: number[] = [];
    let at = 0;
    for (const segment of parts) {
        starts.push(at);
        at += segment.text.length;
    }
    const indexAt = new Map(starts.map((start, idx) => [start, idx]));
    const closeOf = new Map<number, number>();
    const matched = new Set<number>();
    for (const section of findVariableSections(text, (name) => validVariables.includes(name))) {
        const open = indexAt.get(section.openToken.start);
        const close = indexAt.get(section.closeToken.start);
        if (open === undefined || close === undefined) continue;
        closeOf.set(open, close);
        matched.add(open);
        matched.add(close);
    }

    const renderBlocks = (value: string, key: string | number): React.ReactNode =>
        blocks ? (
            <React.Fragment key={key}>
                {splitBlockText(value).map((piece, i) =>
                    piece.kind === "block" && piece.name ? (
                        <BlockChip
                            key={i}
                            name={piece.name}
                            state={blockChipState(piece.name, blocks.declared, blocks.missing)}
                            onOpen={blocks.onOpen}
                        />
                    ) : (
                        <span key={i}>{piece.text}</span>
                    ),
                )}
            </React.Fragment>
        ) : (
            <span key={key}>{value}</span>
        );

    const renderVariable = (segment: Extract<VariableSegment, { kind: "variable" }>, idx: number) => {
        const part = segment.text;
        // `{{<name>}}` is a prompt block, never a variable.
        if (blocks && part.startsWith("{{<")) return renderBlocks(part, idx);
        const variableName = segment.name;
        if (segment.section) {
            const isMatched = matched.has(idx);
            const when =
                segment.section === "open"
                    ? `Kept only when ${variableName} is filled`
                    : segment.section === "inverse"
                      ? `Kept only when ${variableName} is empty`
                      : `End of the section for ${variableName}`;
            return (
                <span
                    key={idx}
                    className={isMatched ? SECTION_CHIP : LITERAL_CHIP}
                    title={
                        isMatched
                            ? when
                            : validVariables.includes(variableName)
                              ? `No matching end — sent to the model as written`
                              : `Plain text: "${variableName}" is not declared`
                    }
                >
                    {part}
                </span>
            );
        }
        const isValid = validVariables.includes(variableName);
        const isLiteral = !isValid && !isDeclarableVariableName(variableName.trim());

        return (
            <span
                key={idx}
                className={
                    isValid
                        ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800 rounded-md px-1 py-0.5 font-medium"
                        : isLiteral
                          ? LITERAL_CHIP
                          : "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800 rounded-md px-1 py-0.5 font-medium"
                }
                title={
                    isValid
                        ? `Variable: ${variableName}`
                        : isLiteral
                          ? `Plain text: "${variableName}" is not a valid name`
                          : `Undefined variable: ${variableName}`
                }
            >
                {part}
            </span>
        );
    };

    const render = (from: number, to: number): React.ReactNode[] => {
        const out: React.ReactNode[] = [];
        for (let idx = from; idx < to; idx++) {
            const segment = parts[idx] as VariableSegment;
            const close = closeOf.get(idx);
            if (close !== undefined && segment.kind === "variable") {
                out.push(
                    <span
                        key={idx}
                        data-section={segment.name}
                        className="rounded-sm bg-violet-500/10 dark:bg-violet-400/10 shadow-[inset_2px_0_0_rgba(139,92,246,0.45)]"
                    >
                        {renderVariable(segment, idx)}
                        {render(idx + 1, close)}
                        {renderVariable(parts[close] as Extract<VariableSegment, { kind: "variable" }>, close)}
                    </span>,
                );
                idx = close;
            } else if (segment.kind === "variable") {
                out.push(renderVariable(segment, idx));
            } else {
                out.push(renderBlocks(segment.text, idx));
            }
        }
        return out;
    };

    // This is the author's own prompt source, so a kind schema written into it
    // (`"__kind": …`) is shown as written: the wrapper marks it a deliberate source
    // view for the kind-leak sentinel; `contents` keeps it out of layout.
    return (
        <span data-kind-source="explicit" className="contents">
            {render(0, parts.length)}
        </span>
    );
};
