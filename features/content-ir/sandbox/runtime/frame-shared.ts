/**
 * frame-shared — hand the frame's ONE React to the on-demand library chunks.
 *
 * A chunk (`motion`, `three`/fiber, `react-pdf`, …) is built with `react`,
 * `react-dom` and the JSX runtime EXTERNAL; its imports resolve to the objects
 * below, so every hook runs against the same React the component uses (two
 * copies of React is the classic "invalid hook call"). Keyed by a registered
 * Symbol so component code has no name to reach for it by.
 */
import * as React from "react";
import * as ReactDOM from "react-dom";
import * as ReactDOMClient from "react-dom/client";
import * as JsxRuntime from "react/jsx-runtime";
import { FRAME_SHARED_KEY } from "./frame-lib-chunks";

export function installSharedForChunks(): void {
    const g = globalThis as unknown as Record<symbol, unknown>;
    g[FRAME_SHARED_KEY] = {
        react: React,
        "react-dom": ReactDOM,
        "react-dom/client": ReactDOMClient,
        "react/jsx-runtime": JsxRuntime,
        "react/jsx-dev-runtime": JsxRuntime,
    };
}
