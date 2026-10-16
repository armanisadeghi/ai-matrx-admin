import { defaultKind } from "@/features/marketing/discovery-classification";
import type { DiscoveredItem } from "@/features/marketing/types";

const fact = (guessed_kind: string | null): DiscoveredItem => ({ category: "fact", guessed_kind }) as DiscoveredItem;

describe("a fact the facts agent named starts on its kind, never Other", () => {
  it("uses the server's field → kind rules", () => {
    expect(defaultKind(fact("technology_used"), { technology_used: "technology" })).toBe("technology");
    expect(defaultKind(fact("yelp_page"), { yelp_page: "listing" })).toBe("listing");
  });
  it("keeps a field that is already a kind, and files an unknown field under other", () => {
    expect(defaultKind(fact("email"))).toBe("email");
    expect(defaultKind(fact("response_time"), { technology_used: "technology" })).toBe("other");
  });
  it("ignores a mapped kind the pool does not allow", () => {
    expect(defaultKind(fact("x"), { x: "not_a_kind" })).toBe("other");
  });
});
