/**
 * CD-PAGE-08 — a public form in the visitor's language. Real use case: a dental clinic's new-patient form, written in
 * English with a Spanish translation; a patient whose browser asks for Spanish meets it in Spanish, the runner's own
 * buttons included, and her answer still lands under the English form's keys.
 */
import { publicFormInLanguage } from "../formLanguage";

const form = {
  form_id: "f1",
  title: "New patient form",
  presentation: {
    intro: "A few questions before your first visit.",
    questions: [{ field: "reason", ask: "What brings you in?" }, { field: "insured", ask: "Do you have dental insurance?" }],
    languages: [
      {
        code: "es",
        label: "Español",
        title: "Formulario para pacientes nuevos",
        intro: "Unas preguntas antes de su primera visita.",
        questions: { reason: { ask: "¿Qué le trae por aquí?" }, insured: { ask: "¿Tiene seguro dental?", choices: { yes: "Sí" } } },
      },
    ],
  },
  fields: [
    { key: "reason", label: "Reason", type: "text" },
    { key: "insured", label: "Insured", type: "choice", public_choices: [{ key: "yes", label: "Yes" }, { key: "no", label: "No" }] },
  ],
};

describe("a public form speaks the visitor's language (CD-PAGE-08)", () => {
  it("her browser's Spanish puts the Spanish words over the English, the runner's buttons too", () => {
    const out = publicFormInLanguage(form, undefined, "es-MX,es;q=0.9,en;q=0.5", "/f/f1", {});
    expect(out.language).toBe("es");
    expect(out.form.title).toBe("Formulario para pacientes nuevos");
    expect((out.form.presentation.questions as Array<{ ask: string }>)[0]!.ask).toBe("¿Qué le trae por aquí?");
    expect(out.words?.next).toBe("Siguiente");
    expect(out.words?.submit).toBe("Enviar");
  });
  it("a choice's label is translated and its key is not, so her answer lands under the same value", () => {
    const out = publicFormInLanguage(form, "es", null, "/f/f1", {});
    const choices = (out.form.fields[1] as { public_choices: Array<{ key: string; label: string }> }).public_choices;
    expect(choices[0]).toEqual({ key: "yes", label: "Sí" });
    expect(out.form.fields.map((f) => f.key)).toEqual(["reason", "insured"]);
  });
  it("the link's ?lang= wins over the browser, and the base language keeps the form as written", () => {
    const out = publicFormInLanguage(form, "en", "es", "/f/f1", { ref: "flyer" });
    expect(out.language).toBeNull();
    expect(out.form.title).toBe("New patient form");
    expect(out.words).toBeNull();
    expect(out.choices.map((c) => [c.code, c.current])).toEqual([["en", true], ["es", false]]);
    expect(out.choices[1]!.href).toBe("/f/f1?ref=flyer&lang=es");
  });
  it("a form with no translations offers no switcher", () => {
    const out = publicFormInLanguage({ ...form, presentation: { ...form.presentation, languages: [] } }, "es", "es", "/f/f1", {});
    expect(out.choices).toEqual([]);
    expect(out.language).toBeNull();
  });
});
