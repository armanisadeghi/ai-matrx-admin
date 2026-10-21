import { join } from "node:path";
import { resolvesInstalledAiMatrxSpecifier } from "../lib/ai-matrx-specifier";

const repoRoot = join(__dirname, "..", "..");

describe("resolvesInstalledAiMatrxSpecifier", () => {
  it("passes real installed specifiers", () => {
    expect(resolvesInstalledAiMatrxSpecifier("@ai-matrx/icons", repoRoot)).toBe(true);
    expect(
      resolvesInstalledAiMatrxSpecifier("@ai-matrx/design-system/data-table", repoRoot),
    ).toBe(true);
  });
  it("fails a subpath the installed package does not ship", () => {
    expect(
      resolvesInstalledAiMatrxSpecifier("@ai-matrx/design-system/no-such-subpath", repoRoot),
    ).toBe(false);
  });
  it("fails a package that is not installed", () => {
    expect(resolvesInstalledAiMatrxSpecifier("@ai-matrx/not-a-package", repoRoot)).toBe(false);
  });
});
