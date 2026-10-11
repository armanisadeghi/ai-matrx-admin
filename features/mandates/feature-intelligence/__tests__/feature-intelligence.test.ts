import {
  fillUrlPattern,
  keepVisibleJobs,
  mergePlaces,
  resolveDeclaredPlaces,
} from "../places";
import { keyInFeature, lanesFor, shortMandateName } from "../service";
import { featureIntelligenceHref, intelligenceHref } from "../hrefs";
import { declaredPlacesFor } from "../registry";
import { effectiveRunOverride } from "../run-override";
import type { FeatureIntelligenceRow, ResolvedPlace } from "../types";
import { storedMandateKey } from "@ai-matrx/agents/mandates";

const place = (over: Partial<ResolvedPlace>): ResolvedPlace => ({
  id: "p",
  label: "P",
  trigger: "",
  href: null,
  urlPattern: null,
  mandateKeys: [],
  origin: "declared",
  ...over,
});

describe("feature intelligence — places", () => {
  it("fills a pattern only when every value is known", () => {
    expect(
      fillUrlPattern("/research/topics/[topicId]/tags", { topicId: "t1" }),
    ).toBe("/research/topics/t1/tags");
    expect(
      fillUrlPattern("/research/topics/[topicId]/tags/[tagId]", {
        topicId: "t1",
      }),
    ).toBeNull();
    expect(fillUrlPattern("/education/flashcards/new", {})).toBe(
      "/education/flashcards/new",
    );
    expect(fillUrlPattern(null, {})).toBeNull();
  });

  it("merges a registered screen into the declared place at the same route", () => {
    const merged = mergePlaces(
      [place({ id: "deck", urlPattern: "/x/[id]", mandateKeys: [storedMandateKey("a.one")] })],
      [
        place({
          id: "r1",
          urlPattern: "/x/[id]",
          mandateKeys: [storedMandateKey("a.two")],
          origin: "registered",
        }),
        place({
          id: "r2",
          urlPattern: "/y",
          mandateKeys: [storedMandateKey("a.three")],
          origin: "registered",
        }),
      ],
    );
    expect(merged.map((entry) => entry.id)).toEqual(["deck", "r2"]);
    expect(merged[0].mandateKeys).toEqual(["a.one", "a.two"]);
  });

  it("declared research places link inside the topic", () => {
    const keys = new Set<string>(
      (declaredPlacesFor("research")?.places ?? []).flatMap((entry) => entry.mandateKeys),
    );
    const places = resolveDeclaredPlaces(keys, { topicId: "abc" });
    expect(places.find((entry) => entry.id === "research:synthesis")?.href).toBe(
      "/research/topics/abc/synthesis",
    );
    expect(places.find((entry) => entry.id === "research:source")?.href).toBeNull();
  });
});

describe("feature intelligence — rows", () => {
  it("shows a topic pin to the resolved agent as recorded, not as a second active choice", () => {
    const row = {
      holderType: "agent",
      holderId: "agent-1",
    } as FeatureIntelligenceRow;
    const choice = {
      holderId: "agent-1",
      holderName: "Agent",
      manageHref: "/topics/1/agents",
      contextLabel: "This topic",
    };
    // Dormant today, but it takes over the moment the mandate choice changes —
    // so it must stay visible (Factory Playground's auto-tagger, 2026-09-25).
    expect(effectiveRunOverride(row, choice)).toEqual({
      ...choice,
      matchesMandate: true,
    });
    expect(effectiveRunOverride(row, undefined)).toBeNull();
    expect(
      effectiveRunOverride(row, { ...choice, holderId: "agent-2" }),
    ).toEqual({ ...choice, holderId: "agent-2" });
  });

  it("matches keys to a code feature by first segment only", () => {
    expect(keyInFeature("flashcards.generate_cards", "flashcards")).toBe(true);
    expect(keyInFeature("education.study_pack_flashcards", "flashcards")).toBe(
      false,
    );
  });

  it("drops a leading feature name from a label", () => {
    expect(
      shortMandateName("Flashcards — Generate Cards (topic)", "Flashcards"),
    ).toBe("Generate Cards (topic)");
    expect(shortMandateName("Research Report Generator", "Research")).toBe(
      "Research Report Generator",
    );
  });

  it("asks only the lanes the definitions live in", () => {
    const sys = "sys";
    expect(
      lanesFor(
        [{ organization_id: sys, created_by: "x" }],
        sys,
        "me",
        "person",
      ),
    ).toEqual(["system"]);
    expect(
      lanesFor(
        [{ organization_id: "o", created_by: "me" }],
        sys,
        "me",
        "person",
      ),
    ).toEqual(["mine"]);
    expect(
      lanesFor(
        [{ organization_id: "o", created_by: "other" }],
        sys,
        "me",
        "person",
      ).sort(),
    ).toEqual(["orgs"]);
    expect(
      lanesFor(
        [{ organization_id: "o", created_by: "me" }],
        sys,
        "me",
        "organization",
      ),
    ).toEqual(["orgs"]);
  });
});

describe("feature intelligence — registered places", () => {
  it("keeps only the jobs the viewer can see, and drops a screen left with none", () => {
    const kept = keepVisibleJobs(
      [
        place({
          id: "a",
          mandateKeys: [storedMandateKey("seo.x"), storedMandateKey("seo.hidden")],
          origin: "registered",
        }),
        place({ id: "b", mandateKeys: [storedMandateKey("seo.hidden")], origin: "registered" }),
      ],
      new Set(["seo.x"]),
    );
    expect(kept.map((p) => [p.id, p.mandateKeys])).toEqual([["a", ["seo.x"]]]);
  });
});

describe("feature intelligence — hrefs (no placement in the link)", () => {
  it("a job link asks the server, carrying every context value", () => {
    expect(
      featureIntelligenceHref("research", {
        mandateKey: "research.report",
        context: { topicId: "t1" },
      }),
    ).toBe("/intelligence?mandate=research.report&topicId=t1");
    expect(intelligenceHref("seo.finding_fixer", { brandId: "b1" })).toBe(
      "/intelligence?mandate=seo.finding_fixer&brandId=b1",
    );
  });

  it("research without a job, inside a topic, stays in the topic", () => {
    expect(featureIntelligenceHref("research", { context: { topicId: "t1", tab: "x" } })).toBe(
      "/research/topics/t1/intelligence?tab=x",
    );
  });

  it("any other page uses the generic route and carries its context", () => {
    expect(
      featureIntelligenceHref("flashcards", { context: { setId: "s1" } }),
    ).toBe("/intelligence/flashcards?setId=s1");
    expect(featureIntelligenceHref("seo-keywords")).toBe("/intelligence/seo-keywords");
  });
});
