import { getScopeEntry } from "@ai-matrx/code-runtime/scope";
import { FRAME_LIB_CHUNKS, chunkForSpecifier } from "./frame-lib-chunks";
import { LAZY_SPECIFIERS, neededLazySpecifiers } from "./frame-lazy-modules";

/** The allow-listed libraries the frame's main bundle does not carry (census 2026-10-10). */
const NOT_IN_MAIN_BUNDLE = [
    "motion/react",
    "react-katex",
    "react-pdf",
    "xlsx",
    "@react-three/fiber",
    "three",
    "date-fns",
    "lodash",
];

function body(code: string, imports: string[] = []) {
    return {
        graph: {
            modules: {
                "kind-component.tsx": {
                    code,
                    importBindings: imports.map((source) => ({ source })),
                },
            },
        },
    };
}

describe("frame on-demand libraries", () => {
    it("every allow-listed library missing from the main bundle has a chunk and is a documented scope entry", () => {
        for (const spec of NOT_IN_MAIN_BUNDLE) {
            expect(chunkForSpecifier(spec)).not.toBeNull();
            expect(getScopeEntry(spec)).toBeTruthy();
            expect(LAZY_SPECIFIERS).toContain(spec);
        }
    });

    it("three and fiber share ONE chunk (fiber must render the single three copy)", () => {
        expect(chunkForSpecifier("three")).toBe(chunkForSpecifier("@react-three/fiber"));
        expect(FRAME_LIB_CHUNKS.three.specifiers).toEqual(["three", "@react-three/fiber"]);
    });

    it("loads only what a body reaches for: imports, or a bare name the entry provides", () => {
        expect(neededLazySpecifiers(body("export default () => null;"))).toEqual([]);
        expect(neededLazySpecifiers(body("x", ["react", "lodash", "@/components/ui/button"]))).toEqual(["lodash"]);
        expect(neededLazySpecifiers(body("export default () => <motion.div />;"))).toEqual(["motion/react"]);
        // A lookalike (member access, longer word) is not the bare name.
        expect(neededLazySpecifiers(body("const a = foo.motion; const b = motionless;"))).toEqual([]);
        expect(
            neededLazySpecifiers(body("a", ["date-fns"]), body("b", ["xlsx"])).sort(),
        ).toEqual(["date-fns", "xlsx"]);
    });
});
