/**
 * frame-lib-chunks — which allow-listed libraries the sealed frame loads ON
 * DEMAND, and from which chunk.
 *
 * The frame bundle (`public/kind-sandbox.js`) must not grow for every shape
 * just because a few import `three` or `xlsx`. Each chunk below is its own
 * script, built by `build-kind-sandbox.ts` into `public/kind-sandbox-lib/`
 * (content-hashed file names) and loaded by a classic `<script src>` ONLY
 * when a component's graph imports one of its specifiers. A classic script —
 * not an ES module — because the frame's origin is opaque: a module script is
 * a CORS fetch and would be refused, a classic script is not (the CSP's
 * `script-src <app origin>` admits it, exactly as it admits the main bundle).
 *
 * Pure data, shared by the build script and the frame runtime.
 */

export interface FrameLibChunk {
    /** The scope-entry paths this chunk supplies (`gate-lists.json#allowedImports`). */
    specifiers: readonly string[];
}

export const FRAME_LIB_CHUNKS: Readonly<Record<string, FrameLibChunk>> = {
    "date-fns": { specifiers: ["date-fns"] },
    lodash: { specifiers: ["lodash"] },
    motion: { specifiers: ["motion/react"] },
    katex: { specifiers: ["react-katex"] },
    xlsx: { specifiers: ["xlsx"] },
    // ONE chunk: fiber must share the single `three` copy it renders.
    three: { specifiers: ["three", "@react-three/fiber"] },
    pdf: { specifiers: ["react-pdf"] },
};

/** Specifier → chunk name. */
export function chunkForSpecifier(specifier: string): string | null {
    for (const [name, chunk] of Object.entries(FRAME_LIB_CHUNKS)) {
        if (chunk.specifiers.includes(specifier)) return name;
    }
    return null;
}

/** The registry the chunks write into (shared, symbol-keyed, never enumerable by name). */
export const FRAME_LIBS_KEY_NAME = "matrx.frame.libs";
export const FRAME_LIBS_KEY = Symbol.for(FRAME_LIBS_KEY_NAME);
/** What the main bundle shares with chunks so they use the frame's ONE React. */
export const FRAME_SHARED_KEY_NAME = "matrx.frame.shared";
export const FRAME_SHARED_KEY = Symbol.for(FRAME_SHARED_KEY_NAME);
