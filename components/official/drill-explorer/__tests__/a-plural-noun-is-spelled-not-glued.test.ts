// "The identitys could not be read" (live 2026-10-22, /administration/users/acquisition): a record noun was
// pluralized by gluing an "s" on. Every plural of a definition's noun goes through pluralNoun.
import fs from "node:fs";
import path from "node:path";
import { pluralNoun } from "../explorerWords";

describe("a plural noun is spelled, never glued", () => {
  it("spells the nouns the definitions use", () => {
    expect(pluralNoun("identity", 2)).toBe("identities");
    expect(pluralNoun("entry", 2)).toBe("entries");
    expect(pluralNoun("batch", 2)).toBe("batches");
    expect(pluralNoun("execution", 2)).toBe("executions");
    expect(pluralNoun("identity", 1)).toBe("identity");
  });

  it("no explorer file glues an s onto a noun variable", () => {
    const dir = path.join(__dirname, "..");
    const glued = fs
      .readdirSync(dir)
      .filter((f) => /\.(ts|tsx)$/.test(f) && f !== "explorerWords.ts") // explorerWords.ts holds pluralNoun itself
      .flatMap((f) =>
        fs
          .readFileSync(path.join(dir, f), "utf8")
          .split("\n")
          .map((line, i) => ({ where: `${f}:${i + 1}`, line }))
          .filter(({ line }) => /\$\{[\w.]*[nN]oun\}s\b/.test(line)),
      );
    expect(glued).toEqual([]);
  });
});
