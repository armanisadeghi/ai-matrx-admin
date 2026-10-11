/**
 * frame-lazy-modules — the allow-listed libraries the frame does not carry in
 * its main bundle, loaded when (and only when) a component imports them.
 *
 * Two halves:
 *  - `provideFrameLazyModules()` registers an ASYNC loader per specifier with
 *    the code-runtime scope registry (`provideScopeModules`); the loader
 *    injects the chunk's `<script>` (see `frame-lib-chunks.ts`) and reads the
 *    module the chunk registered.
 *  - `neededLazySpecifiers(payload)` + `prepareFrameLazyModules(payload)` say
 *    which of them THIS body reaches for (an import, or a bare name the entry
 *    `provides`, e.g. `motion`) and wait for exactly those. Everything else
 *    stays out of the scope spec, so `executeGraph` never starts a load nobody
 *    asked for.
 *
 * A chunk that cannot load (file missing, offline) fails LOUDLY: the scope
 * registry announces it and the import renders a marked stand-in. It is never
 * faked.
 */
import { getScopeEntry, provideScopeModules } from "@ai-matrx/code-runtime/scope";
import { prepareScopeModules } from "@ai-matrx/code-runtime/execute";
import {
    FRAME_LIBS_KEY,
    FRAME_LIB_CHUNKS,
    chunkForSpecifier,
} from "./frame-lib-chunks";

/** chunk name → { js, css? } file names (content-hashed), injected by the build. */
declare const __FRAME_LIB_FILES__: Record<string, { js: string; css?: string }> | undefined;

function libFiles(): Record<string, { js: string; css?: string }> {
    return typeof __FRAME_LIB_FILES__ === "undefined" ? {} : (__FRAME_LIB_FILES__ ?? {});
}

type Registry = Record<string, Promise<Record<string, unknown>> | undefined>;

function registry(): Registry {
    const g = globalThis as unknown as Record<symbol, Registry | undefined>;
    return (g[FRAME_LIBS_KEY] ??= {});
}

const inflight = new Map<string, Promise<Record<string, unknown>>>();

function addTag(tag: "script" | "link", url: string): Promise<void> {
    return new Promise((resolve, reject) => {
        const el = document.createElement(tag);
        if (tag === "script") (el as HTMLScriptElement).src = url;
        else {
            (el as HTMLLinkElement).rel = "stylesheet";
            (el as HTMLLinkElement).href = url;
        }
        el.onload = () => resolve();
        el.onerror = () => reject(new Error(`could not load ${url}`));
        document.head.appendChild(el);
    });
}

function loadChunk(name: string): Promise<Record<string, unknown>> {
    const existing = inflight.get(name);
    if (existing) return existing;
    const files = libFiles()[name];
    const promise = (async () => {
        if (!files) {
            throw new Error(`the library chunk "${name}" is not part of this build of the sandbox`);
        }
        await Promise.all([
            addTag("script", `/kind-sandbox-lib/${files.js}`),
            files.css ? addTag("link", `/kind-sandbox-lib/${files.css}`) : Promise.resolve(),
        ]);
        const registered = registry()[name];
        if (!registered) throw new Error(`the library chunk "${name}" loaded but registered nothing`);
        return await registered;
    })();
    inflight.set(name, promise);
    // A failed load may be retried by a later component.
    promise.catch(() => inflight.delete(name));
    return promise;
}

let provided = false;

/** Idempotent. Registers an async loader per lazy specifier. */
export function provideFrameLazyModules(): void {
    if (provided) return;
    provided = true;
    const loaders: Record<string, () => Promise<unknown>> = {};
    for (const [name, chunk] of Object.entries(FRAME_LIB_CHUNKS)) {
        for (const spec of chunk.specifiers) {
            loaders[spec] = async () => (await loadChunk(name))[spec];
        }
    }
    provideScopeModules(loaders);
}

/** Every lazy specifier in the library list. */
export const LAZY_SPECIFIERS: readonly string[] = Object.values(FRAME_LIB_CHUNKS).flatMap(
    (c) => c.specifiers,
);

interface BodyLike {
    graph?: {
        modules?: Record<string, { importBindings?: Array<{ source: string }>; code?: string }>;
    };
}

function escapeRegExp(id: string): string {
    return id.replace(/[$.*+?^()[\]{}|\\]/g, "\\$&");
}

/** The lazy specifiers these bodies actually reach for. */
export function neededLazySpecifiers(...bodies: Array<BodyLike | null | undefined>): string[] {
    const needed = new Set<string>();
    for (const body of bodies) {
        for (const mod of Object.values(body?.graph?.modules ?? {})) {
            for (const b of mod.importBindings ?? []) {
                if (chunkForSpecifier(b.source)) needed.add(b.source);
            }
            // A bare name an entry provides (`motion`, `THREE`, `XLSX`…).
            const code = mod.code ?? "";
            for (const spec of LAZY_SPECIFIERS) {
                if (needed.has(spec)) continue;
                for (const id of getScopeEntry(spec)?.provides ?? []) {
                    if (new RegExp(`(?<![\\w$.])${escapeRegExp(id)}\\b`).test(code)) {
                        needed.add(spec);
                        break;
                    }
                }
            }
        }
    }
    return [...needed];
}

/**
 * Load the lazy libraries these bodies need. Never rejects: a failed load is
 * recorded by the scope registry and surfaces as a marked stand-in.
 */
export async function prepareFrameLazyModules(
    ...bodies: Array<BodyLike | null | undefined>
): Promise<string[]> {
    provideFrameLazyModules();
    const needed = neededLazySpecifiers(...bodies);
    if (needed.length > 0) await prepareScopeModules(needed);
    return needed;
}
