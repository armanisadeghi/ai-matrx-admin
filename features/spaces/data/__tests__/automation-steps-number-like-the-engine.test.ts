/** AT-AUTO3: the visual editor numbers steps exactly as custom._automation_number does (depth-first, a group before its inner steps),
 * because a chip "Step 8 · Script answer" is stored as {{step8.output.x}}. The pipeline is atauto2_green.sql's. */
import { stepCount, type Step } from "../AutomationSteps";

const pipeline: Step[] = [
  { do: "find" },
  { do: "add_row" },
  { do: "if", branches: [{ when: { all: [] }, actions: [{ do: "slack" }] }], else: [{ do: "email" }] },
  { do: "for_each", list: "{{trigger.body.lines}}", actions: [{ do: "add_row" }] },
  { do: "script" },
  { do: "update" },
];

describe("step numbers", () => {
  it("count a group and everything inside it", () => {
    expect(stepCount(pipeline[2]!)).toBe(3);
    expect(stepCount(pipeline[3]!)).toBe(2);
  });
  it("put the script at step 8 and the update at step 9, as the live engine does", () => {
    let n = 1;
    const at: Record<string, number> = {};
    for (const s of pipeline) {
      at[s.do + (at[s.do] ? "2" : "")] = n;
      n += stepCount(s);
    }
    expect(at["script"]).toBe(8);
    expect(at["update"]).toBe(9);
  });
});
