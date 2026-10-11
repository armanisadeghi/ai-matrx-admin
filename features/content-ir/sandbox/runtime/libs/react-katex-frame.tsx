/**
 * The `react-katex` module inside the sealed frame. Same names and props as the
 * package (`BlockMath`, `InlineMath`: `math` or string children, `errorColor`,
 * `renderError`, `settings`), rendered with KaTeX directly because the page's
 * version goes through the app's markdown core, which the frame does not carry.
 * A formula KaTeX rejects renders `renderError`, or the TeX source in the error
 * colour — never an empty box.
 *
 * Built ONLY into the on-demand `katex` chunk (frame-lib-chunks.ts), together
 * with KaTeX's stylesheet (fonts inlined as data: URLs, since the frame's
 * opaque origin cannot fetch fonts cross-origin).
 */
import katex, { type KatexOptions } from "katex";
import { createElement, type ReactNode } from "react";

interface MathProps {
    math?: string;
    children?: ReactNode;
    errorColor?: string;
    renderError?: (error: Error) => ReactNode;
    settings?: KatexOptions;
    [key: string]: unknown;
}

function source({ math, children }: MathProps): string {
    if (typeof math === "string") return math;
    if (typeof children === "string") return children;
    return "";
}

function make(displayMode: boolean) {
    return function Math(props: MathProps) {
        const tex = source(props);
        try {
            const html = katex.renderToString(tex, {
                displayMode,
                throwOnError: true,
                errorColor: props.errorColor,
                ...(props.settings ?? {}),
            });
            return createElement(displayMode ? "div" : "span", {
                dangerouslySetInnerHTML: { __html: html },
            });
        } catch (err) {
            const error = err instanceof Error ? err : new Error(String(err));
            if (props.renderError) return createElement("span", null, props.renderError(error));
            return createElement(
                "span",
                { role: "alert", style: { color: props.errorColor ?? "#cc0000" } },
                tex,
            );
        }
    };
}

export const BlockMath = make(true);
export const InlineMath = make(false);
