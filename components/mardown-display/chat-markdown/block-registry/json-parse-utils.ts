/**
 * JSON parse helpers for block content (LaTeX-aware, never throw).
 * Used by BlockRenderer for quiz, presentation, math blocks.
 */

const LATEX_COMMANDS = [
    "alpha", "beta", "gamma", "delta", "epsilon", "varepsilon",
    "zeta", "eta", "theta", "vartheta", "iota", "kappa", "lambda",
    "mu", "nu", "xi", "pi", "varpi", "rho", "varrho", "sigma",
    "varsigma", "tau", "upsilon", "phi", "varphi", "chi", "psi", "omega",
    "Gamma", "Delta", "Theta", "Lambda", "Xi", "Pi", "Sigma", "Upsilon",
    "Phi", "Psi", "Omega",
    "frac", "dfrac", "tfrac", "sqrt", "sum", "prod", "int", "oint",
    "iint", "iiint", "lim", "sup", "inf", "max", "min",
    "sin", "cos", "tan", "cot", "sec", "csc",
    "arcsin", "arccos", "arctan", "sinh", "cosh", "tanh", "coth",
    "log", "ln", "exp", "det", "dim", "ker", "rank", "deg",
    "infty", "nabla", "partial", "forall", "exists", "nexists",
    "emptyset", "varnothing",
    "cdot", "cdots", "ldots", "vdots", "ddots",
    "times", "div", "pm", "mp", "leq", "geq", "le", "ge", "neq", "ne",
    "approx", "equiv", "sim", "simeq", "cong", "propto",
    "in", "notin", "subset", "supset", "subseteq", "supseteq",
    "cup", "cap", "setminus", "wedge", "vee", "neg", "oplus", "otimes", "oslash",
    "rightarrow", "leftarrow", "leftrightarrow",
    "Rightarrow", "Leftarrow", "Leftrightarrow",
    "to", "gets", "mapsto", "uparrow", "downarrow", "updownarrow",
    "left", "right", "middle",
    "langle", "rangle", "lfloor", "rfloor", "lceil", "rceil", "lbrace", "rbrace",
    "hat", "tilde", "bar", "vec", "dot", "ddot",
    "overline", "underline", "overbrace", "underbrace", "widehat", "widetilde",
    "text", "mathrm", "mathbf", "mathbb", "mathcal", "mathit",
    "mathsf", "mathtt", "mathfrak",
    "displaystyle", "textstyle", "scriptstyle", "scriptscriptstyle",
    "boldmath", "boldsymbol", "begin", "end", "quad", "qquad",
    "binom", "choose", "over", "atop", "limits", "nolimits",
    "prime", "circ", "bullet", "angle", "perp", "parallel",
    "dagger", "ddagger", "star", "ast", "Re", "Im", "hbar", "ell", "wp",
] as const;

/**
 * Preprocess JSON content to fix common escape sequence issues before parsing.
 * CRITICAL: Must never throw. Always returns a string (original or fixed).
 */
export function preprocessJsonContent(jsonString: string): string {
    const input = typeof jsonString === "string" ? jsonString : String(jsonString);
    try {
        JSON.parse(input);
        return input;
    } catch {
        try {
            let fixed = input;
            fixed = fixed.replace(/"([^"\\]*(\\.[^"\\]*)*)"/g, (match, content: string) => {
                let fixedContent = typeof content === "string" ? content : "";
                try {
                    for (const cmd of LATEX_COMMANDS) {
                        const pattern = new RegExp(`(?<!\\\\)\\\\(${cmd})`, "g");
                        fixedContent = fixedContent.replace(pattern, "\\\\$1");
                    }
                    return `"${fixedContent}"`;
                } catch {
                    return match;
                }
            });
            JSON.parse(fixed);
            return fixed;
        } catch {
            return input;
        }
    }
}

/**
 * Safe JSON parsing with preprocessing. Returns null if parsing fails.
 */
export function safeJsonParse(jsonString: string): unknown {
    try {
        const preprocessed = preprocessJsonContent(jsonString);
        return JSON.parse(preprocessed);
    } catch {
        return null;
    }
}
