// Self-test for matrx/no-code-authored-user-input.  node --test scripts/lint-rules/no-code-authored-user-input.selftest.mjs
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";
import { RuleTester } from "eslint";
import tseslint from "typescript-eslint";
import { noCodeAuthoredUserInput as rule } from "./no-code-authored-user-input.mjs";

RuleTester.describe = describe;
RuleTester.it = it;
RuleTester.itOnly = it.only;

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const file = path.join(ROOT, "features/selftest/Example.tsx");
const testFile = path.join(ROOT, "features/selftest/__tests__/Example.test.tsx");
const tester = new RuleTester({ languageOptions: { parser: tseslint.parser, parserOptions: { sourceType: "module", ecmaFeatures: { jsx: true } } } });
const E = [{ messageId: "authored" }];

tester.run("no-code-authored-user-input", rule, {
  valid: [
    // The person's words, verbatim.
    { filename: file, code: `function f(text: string) { const body: any = {}; if (text.trim()) body.user_input = text.trim(); }` },
    { filename: file, code: `function f(a: string, b: string) { return { user_input: [a, b].filter(Boolean).join("\\n\\n") }; }` },
    { filename: file, code: `const init = { userInput: "" };` },
    { filename: file, code: `function f(draft: string) { setUserInputText(draft); }` },
    { filename: file, code: `function f(m: any) { return { role: "user", content: m.text }; }` },
    { filename: file, code: `function f(x: string) { return { user_input: x ?? "" }; }` },
    // userMessage is error text shown TO the person, not a turn.
    { filename: file, code: `const e = { userMessage: "Could not load." };` },
    // Tests are fixtures.
    { filename: testFile, code: `const r = { user_input: "Hello there" };` },
  ],
  invalid: [
    // THE INCIDENT, exactly as committed in 2edb1c8aa65.
    {
      filename: file,
      code: `function f(topic: any, extra: string) {
        const body: any = {};
        const keywordCap = topic.max > 0 ? \`Suggest at most \${topic.max} search keywords.\` : "";
        const userInput = [extra.trim(), keywordCap].filter(Boolean).join("\\n\\n");
        if (userInput) body.user_input = userInput;
      }`,
      errors: E,
    },
    { filename: file, code: `function f(x: string) { return { user_input: "Please summarize: " + x }; }`, errors: E },
    { filename: file, code: `function f(x: string) { return { userInput: \`Review this: \${x}\` }; }`, errors: E },
    { filename: file, code: `function f(x: string) { return { user_input: x || "Summarize this page" }; }`, errors: E },
    { filename: file, code: `function f(x: string) { let m = x; m = m + "\\n\\nBe concise."; return { userInput: m }; }`, errors: E },
    { filename: file, code: `function f() { setUserInputText("Explain this code"); }`, errors: E },
    { filename: file, code: `function f(x: string) { return { role: "user", content: \`Context:\\n\${x}\` }; }`, errors: E },
    { filename: file, code: `const RULE = "Answer in JSON."; function f(x: string) { const b: any = {}; b.user_input = \`\${x}\\n\${RULE}\`; }`, errors: E },
    // Built in a same-file helper.
    { filename: file, code: `function wrap(x: string) { return \`Instructions: \${x}\`; } function f(x: string) { return { user_input: wrap(x) }; }`, errors: E },
    { filename: file, code: `const wrap = (x: string) => x + " — be brief"; function f(x: string) { return { userInput: wrap(x) }; }`, errors: E },
    // The person left the box empty and code invents a message.
    { filename: file, code: `function f(userInput: string) { launch({ runtime: { userInput: userInput || "Hello, please respond briefly." } }); }`, errors: E },
  ],
});
