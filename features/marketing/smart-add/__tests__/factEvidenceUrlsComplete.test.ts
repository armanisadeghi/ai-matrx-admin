// eudorabrewing.com, run 4fe04c35 (2026-10-16): a fact streams in pieces, and the merged copy kept the cut-off
// addresses ("https", "https://www.eudorabrewing.") beside the finished ones, so every reader of its sources saw
// extra, broken hosts. A partial address is replaced by the one that completes it and is never stored.
import { completeUrls, factsFromPayload, mergeFacts } from "../validate/queue";

const fact = (evidence_urls: string[]) => ({
  __kind: "brand_basics_fact",
  field: "city",
  field_label: "City",
  value: "Kettering",
  certainty: "confirmed",
  reason: "Footer",
  evidence_urls,
});
const parsed = (urls: string[]) => factsFromPayload({ brand_basics: { __kind: "brand_basics", facts: [fact(urls)] } });

describe("a fact's evidence addresses are only ever complete", () => {
  it("cut-off addresses are dropped, and one another address completes is replaced by it", () => {
    expect(completeUrls(["https", "https://www.eudorabrewing.", "https://www.eudorabrewing.com/", "https://www.yelp.com/biz/eudo", "https://www.yelp.com/biz/eudora-brewing"])).toEqual([
      "https://www.eudorabrewing.com/",
      "https://www.yelp.com/biz/eudora-brewing",
    ]);
  });

  it("a homepage beside a page of the same site is two real addresses", () => {
    expect(completeUrls(["https://nlpkak.com/", "https://nlpkak.com/contact/", "https://nlpkak.com", "https://nlpkak.com/contact/?a=1"])).toEqual([
      "https://nlpkak.com/",
      "https://nlpkak.com/contact/",
      "https://nlpkak.com",
      "https://nlpkak.com/contact/?a=1",
    ]);
  });

  it("a streamed copy merged with the finished one stores only the finished addresses, and merging again changes nothing", () => {
    const early = parsed(["https", "https://www.eudorabrewing."]);
    expect(early[0].evidence_urls).toEqual([]);
    const midway = mergeFacts([], [{ ...early[0], evidence_urls: ["https://www.eudorabrewing.com/con"] }]);
    const done = mergeFacts(midway, parsed(["https://www.eudorabrewing.com/contact", "https://www.yelp.com/biz/eudora-brewing-company-kettering-3"]));
    expect(done[0].evidence_urls).toEqual(["https://www.eudorabrewing.com/contact", "https://www.yelp.com/biz/eudora-brewing-company-kettering-3"]);
    expect(mergeFacts(done, parsed(["https://www.eudorabrewing.com/contact"]))).toBe(done);
  });
});
