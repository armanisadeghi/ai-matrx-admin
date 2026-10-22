import { finishedRound } from "../../roundOutput";
import { peopleGroups, MAX_PEOPLE } from "../peopleGroups";
import a from "../fixtures/sarah-johnson-anchor.json";
import n from "../fixtures/sarah-johnson-narrowed.json";
const sum = (p: ReturnType<typeof peopleGroups>) => JSON.stringify(p.people.map((x) => ({ line: x.line, place: x.place, acc: x.accounts.map((i) => i.key + " @" + (i.anchor?.location ?? "")) })), null, 1) + " more " + p.more;
it("explore", () => {
  const ra = finishedRound(a as Record<string, unknown>);
  const rn = finishedRound(n as Record<string, unknown>);
  const pa = peopleGroups(ra.evidence, "Sarah Johnson", MAX_PEOPLE);
  console.log("ROUND1", sum(pa));
  console.log("ROUND1 ALL", sum(peopleGroups(ra.evidence, "Sarah Johnson", 99)));
  console.log("NARROW", sum(peopleGroups(rn.evidence, "Sarah Johnson", 99)));
  console.log("NARROW anchors", rn.evidence.filter((i) => i.anchor).map((i) => [i.key, i.anchor?.display_name, i.anchor?.location, i.anchor?.score, (i.anchor?.reasons ?? []).join(";"), (i.snippet ?? "").slice(0, 100)].join(" | ")).join("\n"));
});
