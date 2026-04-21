/**
 * policies.define.test.ts — rules enforced by definePolicy().
 */

import { definePolicy } from "../policies/define";

describe("definePolicy", () => {
    it("accepts a minimal volatile policy", () => {
        const p = definePolicy({ sliceName: "vol", preset: "volatile", version: 1 });
        expect(p.config.sliceName).toBe("vol");
        expect(p.broadcastActions.size).toBe(0);
        expect(p.storageKey).toBe("");
        expect(p.prePaintDescriptors).toEqual([]);
    });

    it("rejects volatile with broadcast actions", () => {
        expect(() =>
            definePolicy({
                sliceName: "vol",
                preset: "volatile",
                version: 1,
                broadcast: { actions: ["vol/set"] },
            }),
        ).toThrow(/does not allow broadcast/);
    });

    it("rejects volatile with persistence fields", () => {
        expect(() =>
            definePolicy({
                sliceName: "vol",
                preset: "volatile",
                version: 1,
                storageKey: "matrx:vol",
            }),
        ).toThrow(/must not declare/);
    });

    it("rejects ui-broadcast without broadcast actions", () => {
        expect(() =>
            definePolicy({ sliceName: "ui", preset: "ui-broadcast", version: 1 }),
        ).toThrow(/requires at least one broadcast/);
    });

    it("rejects boot-critical without broadcast actions", () => {
        expect(() =>
            definePolicy({ sliceName: "bc", preset: "boot-critical", version: 1 }),
        ).toThrow(/requires at least one broadcast/);
    });

    it("accepts boot-critical with broadcast + prePaint", () => {
        const p = definePolicy<{ mode: "light" | "dark" }>({
            sliceName: "theme",
            preset: "boot-critical",
            version: 1,
            broadcast: { actions: ["theme/setMode"] },
            partialize: ["mode"],
            prePaint: {
                kind: "classToggle",
                target: "html",
                className: "dark",
                fromKey: "mode",
                whenEquals: "dark",
            },
        });
        expect(p.broadcastActions.has("theme/setMode")).toBe(true);
        expect(p.prePaintDescriptors).toHaveLength(1);
        expect(p.storageKey).toBe("matrx:theme");
    });

    it("accepts an array of prePaint descriptors in order", () => {
        const p = definePolicy({
            sliceName: "theme",
            preset: "boot-critical",
            version: 1,
            broadcast: { actions: ["theme/setMode"] },
            prePaint: [
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
            ],
        });
        expect(p.prePaintDescriptors).toHaveLength(2);
        expect(p.prePaintDescriptors[0].kind).toBe("classToggle");
        expect(p.prePaintDescriptors[1].kind).toBe("attribute");
    });

    it("rejects prePaint on ui-broadcast", () => {
        expect(() =>
            definePolicy({
                sliceName: "ui",
                preset: "ui-broadcast",
                version: 1,
                broadcast: { actions: ["ui/set"] },
                prePaint: {
                    kind: "classToggle",
                    target: "html",
                    className: "x",
                    fromKey: "x",
                    whenEquals: "x",
                },
            } as never),
        ).toThrow(/does not allow prePaint/);
    });

    it("defaults storageKey to matrx:${sliceName}", () => {
        const p = definePolicy({
            sliceName: "foo",
            preset: "boot-critical",
            version: 1,
            broadcast: { actions: ["foo/set"] },
        });
        expect(p.storageKey).toBe("matrx:foo");
    });

    it("honors explicit storageKey", () => {
        const p = definePolicy({
            sliceName: "foo",
            preset: "boot-critical",
            version: 1,
            broadcast: { actions: ["foo/set"] },
            storageKey: "custom:key",
        });
        expect(p.storageKey).toBe("custom:key");
    });

    it("rejects duplicate broadcast actions within a policy", () => {
        expect(() =>
            definePolicy({
                sliceName: "foo",
                preset: "ui-broadcast",
                version: 1,
                broadcast: { actions: ["foo/set", "foo/set"] },
            }),
        ).toThrow(/duplicate broadcast action/);
    });

    it("rejects zero/negative version", () => {
        expect(() =>
            definePolicy({ sliceName: "foo", preset: "volatile", version: 0 }),
        ).toThrow(/positive integer/);
    });
});
