// Self-test for matrx/alchemy-data-in.  node --test scripts/lint-rules/alchemy-data-in.selftest.mjs
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";
import { RuleTester } from "eslint";
import tseslint from "typescript-eslint";
import { alchemyDataIn as rule } from "./alchemy-data-in.mjs";

RuleTester.describe = describe;
RuleTester.it = it;
RuleTester.itOnly = it.only;

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const inFeatures = path.join(ROOT, "features/selftest/Example.tsx");
const inTest = path.join(ROOT, "features/selftest/__tests__/Example.test.tsx");
const tester = new RuleTester({ languageOptions: { parser: tseslint.parser, parserOptions: { sourceType: "module", ecmaFeatures: { jsx: true } } } });

tester.run("alchemy-data-in", rule, {
  valid: [
    { filename: inFeatures, code: `export const A = ({ agent }: any) => <CopyButtons label="Agent" data={agent} dataType="Agent" />;` },
    // A caller moving over may keep its extras beside data.
    { filename: inFeatures, code: `export const A = ({ agent }: any) => <MatrxCopyMenu label="Agent" data={agent} json={agent} />;` },
    { filename: inFeatures, code: `export const A = () => <OtherMenu human="x" />;` },
    { filename: inTest, code: `export const A = () => <CopyButtons label="x" human="x" />;` },
  ],
  invalid: [
    { filename: inFeatures, code: `export const A = ({ t }: any) => <CopyButtons label="Task" human={() => t.title} json={t} />;`, errors: [{ messageId: "handBuilt" }] },
    { filename: inFeatures, code: `export const A = ({ t }: any) => <MatrxCopyMenu label="Task" agent={() => ({ kind: "task", data: t })} />;`, errors: [{ messageId: "handBuilt" }] },
    { filename: inFeatures, code: `export const A = ({ t }: any) => <Copy.AiCopyMenu label="Task" json={t} />;`, errors: [{ messageId: "handBuilt" }] },
  ],
});
