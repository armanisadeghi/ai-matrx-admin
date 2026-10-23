// 2026-10-22 — a 360 review's row (and its meeting's back) opens THE 360 REVIEW (`/hr/performance/<id>`).
// Red before: the 360 list's Employee link and the meeting page's back used `hrPerformanceReviewHref`,
// the STANDARD review's workspace (`/hr/performance/reviews/<id>`), which knows no 360 review id.
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { hrPerformance360ReviewHref } from "@/features/hr/routes";

const ROOT = join(__dirname, "..", "..", "..", "..");
const read = (file: string) => readFileSync(join(ROOT, file), "utf8");

it("the 360 review's address is /hr/performance/<id>, carrying the employer", () => {
  expect(hrPerformance360ReviewHref("r1", "o1")).toBe("/hr/performance/r1?org_filter=o1");
});

it.each([
  "features/employee-performance-reviews/review-360/Review360Pages.tsx",
  "app/(core)/hr/performance/[reviewId]/meeting/page.tsx",
])("%s never links a 360 review to the standard review's workspace", (file) => {
  const text = read(file);
  expect(text).not.toMatch(/\bhrPerformanceReviewHref\b/);
  expect(text).toMatch(/\bhrPerformance360ReviewHref\(/);
});
