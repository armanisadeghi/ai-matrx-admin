/**
 * AN EVENT WITH NO DESCRIPTION LINE HAS NO DESCRIPTION (review 2026-10-19 #14).
 * "Architecture spike" used to repeat its own title as its description.
 */
import { parseTimelineMarkdown } from "./parseTimelineMarkdown";

it("keeps a written description and invents none", () => {
  const t = parseTimelineMarkdown("### Plan\n\n**Phase 1**\n- **Kickoff** (Jan 5)\n  Everyone meets.\n- **Architecture spike** (Feb 1)\n");
  const events = t!.periods.flatMap((p) => p.events);
  expect(events.map((e) => [e.title, e.description])).toEqual([
    ["Kickoff", "Everyone meets."],
    ["Architecture spike", ""],
  ]);
});
