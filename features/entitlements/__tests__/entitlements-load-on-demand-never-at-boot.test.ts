/**
 * The entitlement snapshot is read by the first consumer that needs it, never by the shell at
 * boot (a page with no meter, gate or tier reads nothing). Proven to fail if the boot read returns.
 */
import { readFileSync } from "fs";
import { join } from "path";

const root = join(__dirname, "../../..");
const read = (p: string) => readFileSync(join(root, p), "utf8");

test("the shell never reads the entitlement snapshot at boot", () => {
  expect(read("app/DeferredSingletonCore.tsx")).not.toMatch(/fetchEntitlementSnapshot/);
});

test("every snapshot consumer triggers the read itself", () => {
  expect(read("features/entitlements/hooks.ts")).toMatch(/useEnsureEntitlementSnapshot\(\);/);
  expect(read("features/pricing/education/EducationPricing.tsx")).toMatch(/useEnsureEntitlementSnapshot\(\);/);
});
