/**
 * Owner ruling (Arman, 2026-10-11): when the learner's material does not cover
 * a question, the tutor answers from general knowledge right away, with a
 * clear label. Grounded answers are unchanged.
 *
 * Proven failing before passing: before this change `assembleTutorGrounding`
 * had no `grounding_mode`, told the agent not to answer from general
 * knowledge, and the per-turn surface rendered the "I won't guess" refusal.
 */

import React, { act } from "react";
import { createRoot } from "react-dom/client";

const retrieveGroundedPassages = jest.fn();

jest.mock("@/features/rag/api/grounding", () => ({
  retrieveGroundedPassages: (...args: unknown[]) => retrieveGroundedPassages(...args),
  serializeGroundedPassages: () => "[GROUNDING_PASSAGE chunk_id=c1] Mitochondria make ATP.",
}));
jest.mock("../learnerMemory", () => ({
  assembleLearnerMemory: async () => ({ summaryText: "", weakAreas: [] }),
}));
jest.mock("../settings", () => ({
  getTutorSettings: () => ({ teachingMode: "Direct", personalityStyle: "Balanced" }),
}));

// The chips open real sources through Redux; here they only need to show up.
jest.mock("@/features/education/trust/components/SourceCitations", () => ({
  SourceCitations: ({ trust }: { trust: { citations: { sourceId: string; title?: string }[] } }) => (
    <ul>{trust.citations.map((c) => <li key={c.sourceId}>{c.title}</li>)}</ul>
  ),
}));

import { assembleTutorGrounding } from "../grounding";
import { TutorTurnTrust } from "../components/TutorTurnTrust";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const emptyRetrieval = {
  status: "empty",
  passages: [],
  trust: { citations: [], confidence: "not_in_material", groundedIn: "" },
};
const chunk = {
  sourceId: "c1",
  sourceKind: "chunk" as const,
  title: "Biology ch. 4",
  locator: "p. 12",
  excerpt: "Mitochondria make ATP.",
};
const retrieved = {
  status: "retrieved",
  passages: [{ chunkId: "c1", text: "Mitochondria make ATP.", title: "Biology ch. 4", sourceKind: "chunk", sourceId: "c1", locator: "p. 12", score: 0.9 }],
  trust: { citations: [chunk], confidence: "grounded", groundedIn: "Biology ch. 4" },
};

describe("tutor grounding mode", () => {
  beforeEach(() => retrieveGroundedPassages.mockReset());

  test("no matching passage → general-knowledge mode, labelled not_in_material", async () => {
    retrieveGroundedPassages.mockResolvedValue(emptyRetrieval);
    const g = await assembleTutorGrounding({ query: "Who won the 1998 World Cup?", userId: "u1" });
    expect(g.grounding_mode).toBe("general_knowledge");
    expect(g.trust?.confidence).toBe("not_in_material");
    expect(g.trust?.citations).toEqual([]);
    expect(g.study_material).not.toMatch(/do not silently answer/i);
  });

  test("nothing loaded at all → general-knowledge mode", async () => {
    const g = await assembleTutorGrounding({});
    expect(g.grounding_mode).toBe("general_knowledge");
    expect(g.trust?.confidence).toBe("not_in_material");
  });

  test("matching passage → grounded in the material, chips kept", async () => {
    retrieveGroundedPassages.mockResolvedValue(retrieved);
    const g = await assembleTutorGrounding({ query: "What do mitochondria do?", userId: "u1" });
    expect(g.grounding_mode).toBe("material");
    expect(g.trust?.confidence).not.toBe("not_in_material");
    expect(g.trust?.citations.map((c) => c.sourceId)).toContain("c1");
    expect(g.study_material).toContain("GROUNDING_PASSAGE");
  });
});

describe("TutorTurnTrust label", () => {
  function render(node: React.ReactElement): HTMLDivElement {
    const host = document.createElement("div");
    document.body.appendChild(host);
    const root = createRoot(host);
    act(() => root.render(node));
    return host;
  }

  test("a general-knowledge answer is labelled, never a refusal", () => {
    const host = render(
      <TutorTurnTrust trust={{ confidence: "not_in_material", citations: [] }} />,
    );
    expect(host.textContent).toContain("Not from your material");
    expect(host.textContent).not.toMatch(/won't guess/i);
    expect(host.querySelector("button")).toBeNull();
  });

  test("a grounded answer is unchanged: badge + source chips", () => {
    const host = render(
      <TutorTurnTrust trust={{ confidence: "grounded", citations: [chunk], groundedIn: "Biology ch. 4" }} />,
    );
    expect(host.textContent).toContain("Grounded");
    expect(host.textContent).toContain("Biology ch. 4");
    expect(host.textContent).not.toContain("Not from your material");
  });
});
