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

/** Replace `export default` with `return` so it works inside new Function(). */
function replaceExportDefault(code: string): string {
    let result = code;
    result = result.replace(/^export\s+default\s+/m, "return ");
    result = result.replace(/^export\s+\{[^}]+\}\s*;?\s*$/gm, "");
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
 * The code should be a function body that receives `toolUpdates` and returns
 * a string|null (subtitle) or ReactNode (extras).
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
    processedCode = babelTransform(processedCode, language);
    processedCode = replaceExportDefault(processedCode);

    // If code doesn't have a return/function, wrap it as a function body
    const trimmed = processedCode.trim();
    const isAlreadyFunction =
        trimmed.startsWith("return ") ||
        trimmed.startsWith("function ") ||
        trimmed.startsWith("(");

    if (!isAlreadyFunction) {
        // Assume it's a function body — wrap it
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
