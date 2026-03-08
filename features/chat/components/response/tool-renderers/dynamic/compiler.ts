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
    DynamicRendererProps,
} from "./types";

// ---------------------------------------------------------------------------
// Code transformation helpers
// ---------------------------------------------------------------------------

/** Strip all import statements — deps are injected via scope. */
function stripImports(code: string): string {
    return code
        .replace(/^import\s+.*from\s+['"].*['"];?\s*$/gm, "")
        .replace(/^import\s+['"].*['"];?\s*$/gm, "");
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
function compileHeaderFunction(
    code: string,
    language: "tsx" | "jsx",
    allowedImports: string[],
    existingScope?: Record<string, any>
): (toolUpdates: unknown[]) => any {
    const scope = existingScope
        ? { ...existingScope }
        : buildToolRendererScope(allowedImports);

    let processedCode = stripImports(code);

    // ── Detect if the raw code is already a complete callable definition ──
    // We check BEFORE Babel so we know whether to wrap it as a function body.
    const trimmedRaw = processedCode.trim();
    const isAlreadyComplete =
        trimmedRaw.startsWith("export default") ||
        trimmedRaw.startsWith("export async") ||
        trimmedRaw.startsWith("function ") ||
        trimmedRaw.startsWith("async function ") ||
        trimmedRaw.startsWith("(function") ||
        trimmedRaw.startsWith("(async function") ||
        /^(?:const|let|var)\s+\w+\s*=/.test(trimmedRaw);

    if (!isAlreadyComplete) {
        // Bare function body (has top-level `return`, `if`, etc.).
        // Wrap it BEFORE Babel so `return` is inside a function — valid JS.
        processedCode = `export default function __headerFn__(toolUpdates) {\n${processedCode}\n}`;
    }

    // Now Babel is always given syntactically complete code
    processedCode = babelTransform(processedCode, language);
    processedCode = replaceExportDefault(processedCode);

    // After replaceExportDefault the code starts with `return ` (wrapped case)
    // or is a named function / arrow assignment (complete-function case).
    // If for any reason neither fits, wrap as a final safety net.
    const trimmed = processedCode.trim();
    const isReadyToExecute =
        trimmed.startsWith("return ") ||
        trimmed.startsWith("function ") ||
        trimmed.startsWith("(");

    if (!isReadyToExecute) {
        processedCode = `return function headerFn(toolUpdates) {\n${processedCode}\n}`;
    }

    patchScopeForMissingIdentifiers(processedCode, scope);
    const { paramNames, paramValues } = getScopeFunctionParameters(scope);

    const factory = new Function(...paramNames, processedCode);
    const fn = factory(...paramValues);

    if (typeof fn !== "function") {
        throw new Error(
            "Header code must export default a function. " +
                `Got ${typeof fn} instead.`
        );
    }

    return fn;
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
export function compileToolUiComponent(
    row: ToolUiComponentRow
): CompiledToolRenderer {
    const { language, allowed_imports } = row;

    // 1. Compile utility code first (if any) so its exports are in scope
    let sharedScope: Record<string, any> | undefined;
    if (row.utility_code?.trim()) {
        sharedScope = compileUtilityCode(
            row.utility_code,
            language,
            allowed_imports
        );
    }

    // 2. Compile inline component (required)
    const InlineComponent = compileComponentCode(
        row.inline_code,
        language,
        allowed_imports,
        sharedScope
    );

    // 3. Compile overlay component (optional)
    let OverlayComponent: React.ComponentType<DynamicRendererProps> | null =
        null;
    if (row.overlay_code?.trim()) {
        try {
            OverlayComponent = compileComponentCode(
                row.overlay_code,
                language,
                allowed_imports,
                sharedScope
            );
        } catch (err) {
            console.error(
                `[DynamicToolRenderer] Failed to compile overlay for ${row.tool_name}:`,
                err
            );
        }
    }

    // 4. Compile header extras (optional)
    let getHeaderExtras:
        | ((toolUpdates: unknown[]) => React.ReactNode)
        | null = null;
    if (row.header_extras_code?.trim()) {
        try {
            getHeaderExtras = compileHeaderFunction(
                row.header_extras_code,
                language,
                allowed_imports,
                sharedScope
            );
        } catch (err) {
            console.error(
                `[DynamicToolRenderer] Failed to compile header extras for ${row.tool_name}:`,
                err
            );
        }
    }

    // 5. Compile header subtitle (optional)
    let getHeaderSubtitle:
        | ((toolUpdates: unknown[]) => string | null)
        | null = null;
    if (row.header_subtitle_code?.trim()) {
        try {
            getHeaderSubtitle = compileHeaderFunction(
                row.header_subtitle_code,
                language,
                allowed_imports,
                sharedScope
            );
        } catch (err) {
            console.error(
                `[DynamicToolRenderer] Failed to compile header subtitle for ${row.tool_name}:`,
                err
            );
        }
    }

    return {
        toolName: row.tool_name,
        displayName: row.display_name,
        resultsLabel: row.results_label,
        keepExpandedOnStream: row.keep_expanded_on_stream,
        version: row.version,
        componentId: row.id,
        InlineComponent,
        OverlayComponent,
        getHeaderExtras,
        getHeaderSubtitle,
    };
}
