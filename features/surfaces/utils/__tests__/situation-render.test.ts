/**
 * The admin preview renders a situation exactly as the server does (aidream
 * services/conversation_context/situation.py render_situation). Fixture: a dental
 * clinic's appointment-notes surface.
 */
import { probePreviewValues, renderSituation, situationBlankNames } from "../situation-render";

const template =
  '{user.name|The person} is editing the note "{note_title}" ({word_count} words) for {patient|an unnamed patient}. Tags: {tags}. Urgent: {urgent}. Chair: {chair}.';
const labels = { note_title: "Note title", word_count: "Word count", chair: "Dental chair" };

describe("renderSituation", () => {
  it("fills blanks, dotted paths, booleans, numbers and scalar lists", () => {
    expect(
      renderSituation(
        template,
        {
          user: { name: "Dr. Priya Raman" },
          note_title: { label: "Note title", content: "Crown prep, tooth 14" },
          word_count: 212,
          patient: "Marcus Bell",
          tags: ["crown", "follow-up"],
          urgent: false,
          chair: 3,
        },
        labels,
      ),
    ).toBe(
      'Dr. Priya Raman is editing the note "Crown prep, tooth 14" (212 words) for Marcus Bell. Tags: crown, follow-up. Urgent: no. Chair: 3.',
    );
  });

  it("never leaves a blank empty: fallback words, else (not known: label)", () => {
    expect(renderSituation(template, { tags: [], note_title: "  " }, labels)).toBe(
      'The person is editing the note "(not known: note title)" ((not known: word count) words) for an unnamed patient. Tags: (not known: tags). Urgent: (not known: urgent). Chair: (not known: dental chair).',
    );
  });

  it("cuts a long value and counts object lists", () => {
    const long = "x".repeat(700);
    const out = renderSituation("{a} / {b}", { a: long, b: [{ id: 1 }, { id: 2 }] });
    expect(out.startsWith("x".repeat(599) + "…")).toBe(true);
    expect(out.endsWith("/ 2 items")).toBe(true);
  });

  it("names the values a template reads", () => {
    expect(situationBlankNames(template)).toEqual([
      "user",
      "note_title",
      "word_count",
      "patient",
      "tags",
      "urgent",
      "chair",
    ]);
  });
});

describe("probePreviewValues", () => {
  it("uses recorded probe values when a probe stored them", () => {
    expect(probePreviewValues({ values: { chair: 3 } }, labels)).toEqual({
      values: { chair: 3 },
      source: "probe-values",
    });
  });

  it("stands supplied keys in as [Label] and leaves empty ones missing", () => {
    const p = probePreviewValues(
      { suppliedValues: ["note_title", "word_count", "chair"], suppliedEmpty: ["word_count"] },
      labels,
    );
    expect(p.source).toBe("probe-keys");
    expect(renderSituation("{note_title} / {word_count|no count} / {chair}", p.values, labels)).toBe(
      "[Note title] / no count / [Dental chair]",
    );
  });

  it("has nothing without a probe", () => {
    expect(probePreviewValues(null, labels)).toEqual({ values: {}, source: "none" });
  });
});
