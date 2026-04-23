/**
 * Babel-based compiler for dynamic tool UI components.
 *
 * Takes raw TSX/JSX code stored in the database and compiles it into
 * usable React components at runtime. Adapted from the Prompt Apps
 * compilation pipeline.
 *
 * @module compiler
 */

import { transform } from "@babel/standalone";
import {
    buildToolRendererScope,
    patchScopeForMissingIdentifiers,
    getScopeFunctionParameters,
} from "./allowed-imports";
import type {
    ToolUiComponentRow,
    CompiledToolRenderer,
    ContractVersion,
    DynamicRendererProps,
} from "./types";
import type { ToolLifecycleEntry } from "@/features/agents/types/request.types";
import type { ToolEventPayload } from "@/types/python-generated/stream-events";

// ---------------------------------------------------------------------------
// Code transformation helpers
// ---------------------------------------------------------------------------

/**
 * Strip all import statements — deps are injected via scope.
 * Handles both single-line and multiline imports:
 *   import React from 'react';
 *   import {
 *       foo, bar,
 *   } from 'baz';
 * Also strips "use client" / "use server" directives which are meaningless
 * (and potentially breaking) inside new Function() script mode.
 */
function stripImports(code: string): string {
    // Remove "use client" / "use server" directives (with or without semicolons)
    let result = code.replace(/^\s*["']use (client|server)["'];?\s*$/gm, "");

    // Remove multiline imports: import ... from '...';
    // Matches from `import` through the closing `from '...';` spanning multiple lines
    result = result.replace(
        /^import\s[\s\S]*?from\s+['"][^'"]+['"]\s*;?\s*$/gm,
        ""
    );

    // The above regex uses $ in multiline mode which only matches end-of-line,
    // so multiline imports won't be fully removed by it alone.
    // Use a non-greedy block match for multiline imports instead:
    result = result.replace(
        /import\s+(?:type\s+)?(?:\*\s+as\s+\w+|\w+(?:\s*,\s*\{[^}]*\})?|\{[^}]*\})\s+from\s+['"][^'"]+['"];?/gs,
        ""
    );

    // Side-effect imports: import 'foo';
    result = result.replace(/^import\s+['"][^'"]+['"];?\s*$/gm, "");

    return result;
}

/**
 * Strip `export` keywords and inject a `return` so named/default exports work
 * inside `new Function()` (which runs in script mode, not module mode).
 *
 * Handles:
 *   export default ...              → return ...
 *   export const Foo = ...          → const Foo = ...   (+ return Foo appended)
 *   export let Foo = ...            → let Foo = ...     (+ return Foo appended)
 *   export var Foo = ...            → var Foo = ...     (+ return Foo appended)
 *   export function Foo() {}        → function Foo() {} (+ return Foo appended)
 *   export class Foo {}             → class Foo {}      (+ return Foo appended)
 *   export { Foo, Bar }             → (removed)
 */
function replaceExportDefault(code: string): string {
    let result = code;

    // If there's an `export default`, convert it to `return` and we're done
    if (/^export\s+default\s+/m.test(result)) {
        result = result.replace(/^export\s+default\s+/m, "return ");
        result = result.replace(/^export\s+\{[^}]+\}\s*;?\s*$/gm, "");
        return result;
    }

    // Track the last named export so we can return it at the end
    let lastExportedName: string | null = null;

    // export const/let/var Name = ... → const/let/var Name = ...
    result = result.replace(
        /^export\s+(const|let|var)\s+(\w+)/gm,
        (_match, keyword, name) => {
            lastExportedName = name;
            return `${keyword} ${name}`;
        }
    );

    // export function Name(...) { → function Name(...) {
    result = result.replace(
        /^export\s+function\s+(\w+)/gm,
        (_match, name) => {
            lastExportedName = name;
            return `function ${name}`;
        }
    );

    // export class Name { → class Name {
    result = result.replace(
        /^export\s+class\s+(\w+)/gm,
        (_match, name) => {
            lastExportedName = name;
            return `class ${name}`;
        }
    );

    // Remove bare re-export blocks: export { Foo, Bar };
    result = result.replace(/^export\s+\{[^}]+\}\s*;?\s*$/gm, "");

    // If we stripped a named export, append a return for it
    if (lastExportedName) {
        result = result.trimEnd() + `\nreturn ${lastExportedName};`;
    }

    return result;
}

/** Babel transform JSX/TSX → plain JS. */
function babelTransform(code: string, language: "tsx" | "jsx"): string {
    const presets: string[] = ["react"];
    if (language === "tsx") {
        presets.push("typescript");
    }

    const result = transform(code, {
        presets,
        filename: `dynamic-tool-component.${language}`,
    });

    if (!result.code) {
        throw new Error("Babel transform produced empty output");
    }

    return result.code;
}

// ---------------------------------------------------------------------------
// Component compiler
// ---------------------------------------------------------------------------

/**
 * Compiles a code string into a React component.
 *
 * Pipeline:
 *   1. Strip imports
 *   2. Babel transform JSX/TSX → JS
 *   3. Replace export default → return
 *   4. Build scoped import environment
 *   5. Patch missing PascalCase identifiers
 *   6. Execute via `new Function()` to get the component
 */
function compileComponentCode(
    code: string,
    language: "tsx" | "jsx",
    allowedImports: string[],
    existingScope?: Record<string, any>
): React.ComponentType<DynamicRendererProps> {
    // 1. Strip imports
    let processedCode = stripImports(code);

    // 2. Babel transform
    processedCode = babelTransform(processedCode, language);

    // 3. Replace export default
    processedCode = replaceExportDefault(processedCode);

    // 4. Build scope (reuse if provided, e.g. when utility_code already built it)
    const scope = existingScope
        ? { ...existingScope }
        : buildToolRendererScope(allowedImports);

    // 5. Patch missing identifiers
    patchScopeForMissingIdentifiers(processedCode, scope);

    // 6. Execute
    const { paramNames, paramValues } = getScopeFunctionParameters(scope);

    const componentFunction = new Function(...paramNames, processedCode);
    const component = componentFunction(...paramValues);

    if (typeof component !== "function") {
        throw new Error(
            "Component code must export default a function component. " +
                `Got ${typeof component} instead.`
        );
    }

    return component as React.ComponentType<DynamicRendererProps>;
}

/**
 * Compiles utility code and returns its exports merged into the scope.
 * The utility code should use `export` statements; the compiler collects them.
 */
function compileUtilityCode(
    code: string,
    language: "tsx" | "jsx",
    allowedImports: string[]
): Record<string, any> {
    const scope = buildToolRendererScope(allowedImports);

    let processedCode = stripImports(code);
    processedCode = babelTransform(processedCode, language);

    // Collect named exports by wrapping in an object
    // Convert: export function foo() {} → _exports.foo = function foo() {}
    // Convert: export const bar = ... → _exports.bar = ...
    let wrappedCode = "var _exports = {};\n";
    wrappedCode += processedCode
        .replace(
            /^export\s+function\s+(\w+)/gm,
            "_exports.$1 = function $1"
        )
        .replace(
            /^export\s+const\s+(\w+)\s*=/gm,
            "_exports.$1 = "
        )
        .replace(
            /^export\s+let\s+(\w+)\s*=/gm,
            "_exports.$1 = "
        )
        .replace(
            /^export\s+var\s+(\w+)\s*=/gm,
            "_exports.$1 = "
        )
        .replace(/^export\s+default\s+/m, "_exports.default = ")
        .replace(/^export\s+\{[^}]+\}\s*;?\s*$/gm, "");
    wrappedCode += "\nreturn _exports;";

    patchScopeForMissingIdentifiers(wrappedCode, scope);
    const { paramNames, paramValues } = getScopeFunctionParameters(scope);

    const utilFunction = new Function(...paramNames, wrappedCode);
    const utilExports = utilFunction(...paramValues);

    // Merge utility exports into scope
    const mergedScope = { ...scope };
    if (utilExports && typeof utilExports === "object") {
        for (const [key, value] of Object.entries(utilExports)) {
            if (key !== "default" && key !== "__esModule") {
                mergedScope[key] = value;
            }
        }
    }

    return mergedScope;
}

/**
 * Compiles a header function (subtitle or extras).
 *
 * Accepts two code styles:
 *   1. A complete function:  `export default function(toolUpdates) { ... }`
 *   2. A bare function body: `const x = ...; return x;`
 *
 * In both cases, a callable `(toolUpdates) => any` is returned.
 *
 * IMPORTANT: the function-body wrapping must happen BEFORE babelTransform,
 * otherwise Babel sees `return` at the top level of a script and throws
 * "return outside of function".
 */
type CompiledHeaderFn = (
    entry: ToolLifecycleEntry,
    events?: ToolEventPayload[],
) => any;

function compileHeaderFunction(
    code: string,
    language: "tsx" | "jsx",
    allowedImports: string[],
    contractVersion: ContractVersion,
    existingScope?: Record<string, any>,
): CompiledHeaderFn {
    const scope = existingScope
        ? { ...existingScope }
        : buildToolRendererScope(allowedImports);

    let processedCode = stripImports(code);

    const trimmedRaw = processedCode.trim();
    const isAlreadyComplete =
        trimmedRaw.startsWith("export default") ||
        /^export\s+(?:async\s+)?function\s+\w+/.test(trimmedRaw) ||
        /^export\s+(?:const|let|var)\s+\w+\s*=/.test(trimmedRaw);

    // Parameter list depends on contract version for backwards-compat with
    // bare-function-body code stored in v1 components.
    const paramList = contractVersion === 2 ? "entry, events" : "toolUpdates";

    if (!isAlreadyComplete) {
        processedCode = `export default function __headerFn__(${paramList}) {\n${processedCode}\n}`;
    }

    processedCode = babelTransform(processedCode, language);
    processedCode = replaceExportDefault(processedCode);

    const trimmed = processedCode.trim();
    const isReadyToExecute = trimmed.startsWith("return ");

    if (!isReadyToExecute) {
        const namedFnMatch = trimmed.match(/^function\s+(\w+)\s*\(/);
        if (namedFnMatch) {
            processedCode = processedCode.trimEnd() + `\nreturn ${namedFnMatch[1]};`;
        } else {
            processedCode = `return function headerFn(${paramList}) {\n${processedCode}\n}`;
        }
    }

    patchScopeForMissingIdentifiers(processedCode, scope);
    const { paramNames, paramValues } = getScopeFunctionParameters(scope);

    const factory = new Function(...paramNames, processedCode);
    const rawFn = factory(...paramValues);

    if (typeof rawFn !== "function") {
        throw new Error(
            "Header code must export default a function. " +
                `Got ${typeof rawFn} instead.`,
        );
    }

    // v1 components expect (toolUpdates) — adapt them so the registry can call
    // everything with the v2 (entry, events) signature.  v1 is treated as a
    // no-op header (returns null/undefined) because ToolCallObject is gone.
    if (contractVersion === 1) {
        return () => null;
    }

    return rawFn as CompiledHeaderFn;
}


// ---------------------------------------------------------------------------
// Main entry: compile a full ToolUiComponentRow
// ---------------------------------------------------------------------------

/**
 * Compiles a database row into a fully usable `CompiledToolRenderer`.
 * Returns the compiled components ready for the registry.
 *
 * @throws Error if inline_code fails to compile (it's required).
 */
/**
 * Runtime policy: v1 components are compiled but always fall back to the
 * GenericRenderer via a stub that throws, because their internal data shape
 * (`ToolCallObject[]`) no longer exists.  Admins must migrate them.
 */
function makeV1Stub(
    toolName: string,
): React.ComponentType<DynamicRendererProps> {
    const Stub: React.ComponentType<DynamicRendererProps> = () => {
        throw new Error(
            `tool_ui_component "${toolName}" uses contract v1 (ToolCallObject-based) ` +
                `which is no longer supported. Migrate the component to contract v2 ` +
                `(entry / events based) from the admin UI.`,
        );
    };
    Stub.displayName = `V1ContractStub(${toolName})`;
    return Stub;
}

export function compileToolUiComponent(
    row: ToolUiComponentRow,
): CompiledToolRenderer {
    const { allowed_imports } = row;
    const language: "jsx" | "tsx" = row.language === "jsx" ? "jsx" : "tsx";

    // contract_version is a first-class DB column (check constraint 1 | 2).
    const contractVersion: ContractVersion = row.contract_version === 2 ? 2 : 1;

    // v1 components: compile nothing — the whole renderer becomes a stub that
    // throws into the error boundary → GenericRenderer fallback.
    if (contractVersion === 1) {
        const Stub = makeV1Stub(row.tool_name);
        return {
            toolName: row.tool_name,
            displayName: row.display_name,
            resultsLabel: row.results_label,
            keepExpandedOnStream: row.keep_expanded_on_stream,
            version: String(row.version),
            componentId: row.id,
            contractVersion,
            InlineComponent: Stub,
            OverlayComponent: null,
            getHeaderExtras: null,
            getHeaderSubtitle: null,
        };
    }

    // v2 — canonical (entry, events) contract — compile normally.
    let sharedScope: Record<string, any> | undefined;
    if (row.utility_code?.trim()) {
        sharedScope = compileUtilityCode(
            row.utility_code,
            language,
            allowed_imports,
        );
    }

    const InlineComponent = compileComponentCode(
        row.inline_code,
        language,
        allowed_imports,
        sharedScope,
    );

    let OverlayComponent: React.ComponentType<DynamicRendererProps> | null =
        null;
    if (row.overlay_code?.trim()) {
        try {
            OverlayComponent = compileComponentCode(
                row.overlay_code,
                language,
                allowed_imports,
                sharedScope,
            );
        } catch (err) {
            console.error(
                `[DynamicToolRenderer] Failed to compile overlay for ${row.tool_name}:`,
                err,
            );
        }
    }

    let getHeaderExtras: CompiledHeaderFn | null = null;
    if (row.header_extras_code?.trim()) {
        try {
            getHeaderExtras = compileHeaderFunction(
                row.header_extras_code,
                language,
                allowed_imports,
                contractVersion,
                sharedScope,
            );
        } catch (err) {
            console.error(
                `[DynamicToolRenderer] Failed to compile header extras for ${row.tool_name}:`,
                err,
            );
        }
    }

    let getHeaderSubtitle: CompiledHeaderFn | null = null;
    if (row.header_subtitle_code?.trim()) {
        try {
            getHeaderSubtitle = compileHeaderFunction(
                row.header_subtitle_code,
                language,
                allowed_imports,
                contractVersion,
                sharedScope,
            );
        } catch (err) {
            console.error(
                `[DynamicToolRenderer] Failed to compile header subtitle for ${row.tool_name}:`,
                err,
            );
        }
    }

    return {
        toolName: row.tool_name,
        displayName: row.display_name,
        resultsLabel: row.results_label,
        keepExpandedOnStream: row.keep_expanded_on_stream,
        version: String(row.version),
        componentId: row.id,
        contractVersion,
        InlineComponent,
        OverlayComponent,
        getHeaderExtras,
        getHeaderSubtitle,
    };
}
