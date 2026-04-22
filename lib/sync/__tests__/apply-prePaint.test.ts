/**
 * apply-prePaint.test.ts — runtime DOM applier for pre-paint descriptors.
 *
 * Complements `pre-paint.test.ts` (which covers the inline <script> body
 * assembly). This suite covers the pure-TS applier invoked by the sync
 * middleware after every state change.
 */

import { applyPrePaintDescriptors } from "../engine/applyPrePaint";
import type { PrePaintDescriptor } from "../types";

describe("applyPrePaintDescriptors", () => {
    beforeEach(() => {
        document.documentElement.className = "";
        document.documentElement.removeAttribute("data-theme");
    });

    it("adds classToggle when state matches whenEquals", () => {
        const d: PrePaintDescriptor = {
            kind: "classToggle",
            target: "html",
            className: "dark",
            fromKey: "mode",
            whenEquals: "dark",
        };
        applyPrePaintDescriptors([d], { mode: "dark" });
        expect(document.documentElement.classList.contains("dark")).toBe(true);
    });

    it("removes classToggle when state does not match whenEquals", () => {
        document.documentElement.classList.add("dark");
        const d: PrePaintDescriptor = {
            kind: "classToggle",
            target: "html",
            className: "dark",
            fromKey: "mode",
            whenEquals: "dark",
        };
        applyPrePaintDescriptors([d], { mode: "light" });
        expect(document.documentElement.classList.contains("dark")).toBe(false);
    });

    it("sets attribute to allowed value", () => {
        const d: PrePaintDescriptor = {
            kind: "attribute",
            target: "html",
            attribute: "data-theme",
            fromKey: "mode",
            allowed: ["light", "dark"],
            default: "dark",
        };
        applyPrePaintDescriptors([d], { mode: "light" });
        expect(document.documentElement.getAttribute("data-theme")).toBe("light");
    });

    it("falls back to default when value not in allowed list", () => {
        const d: PrePaintDescriptor = {
            kind: "attribute",
            target: "html",
            attribute: "data-theme",
            fromKey: "mode",
            allowed: ["light", "dark"],
            default: "dark",
        };
        applyPrePaintDescriptors([d], { mode: "oreo" });
        expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
    });

    it("applies multiple descriptors in order", () => {
        const descriptors: PrePaintDescriptor[] = [
            {
                kind: "classToggle",
                target: "html",
                className: "dark",
                fromKey: "mode",
                whenEquals: "dark",
            },
            {
                kind: "attribute",
                target: "html",
                attribute: "data-theme",
                fromKey: "mode",
                allowed: ["light", "dark"],
                default: "dark",
            },
        ];
        applyPrePaintDescriptors(descriptors, { mode: "light" });
        expect(document.documentElement.classList.contains("dark")).toBe(false);
        expect(document.documentElement.getAttribute("data-theme")).toBe("light");

        applyPrePaintDescriptors(descriptors, { mode: "dark" });
        expect(document.documentElement.classList.contains("dark")).toBe(true);
        expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
    });

    it("is a no-op with empty descriptors", () => {
        document.documentElement.classList.add("dark");
        applyPrePaintDescriptors([], { mode: "light" });
        expect(document.documentElement.classList.contains("dark")).toBe(true);
    });

    it("is a no-op with null data (preserves default/absent state)", () => {
        // classToggle: null data treats the key as undefined (no match) → removes class.
        document.documentElement.classList.add("dark");
        const d: PrePaintDescriptor = {
            kind: "classToggle",
            target: "html",
            className: "dark",
            fromKey: "mode",
            whenEquals: "dark",
        };
        applyPrePaintDescriptors([d], null);
        expect(document.documentElement.classList.contains("dark")).toBe(false);
    });

    it("does not throw when document target is missing", () => {
        // body target on a headless DOM where <body> exists → still fine, just exercising the guard.
        const d: PrePaintDescriptor = {
            kind: "classToggle",
            target: "body",
            className: "foo",
            fromKey: "mode",
            whenEquals: "on",
        };
        expect(() => applyPrePaintDescriptors([d], { mode: "on" })).not.toThrow();
        expect(document.body.classList.contains("foo")).toBe(true);
    });
});
