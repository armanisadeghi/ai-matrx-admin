// features/forms/formLanguage.ts — CD-PAGE-08: A STRANGER MEETS A PUBLIC FORM IN HER LANGUAGE.
//
// The owner writes the form once and adds translations (`presentation.languages`). The public page picks one — the
// link's `?lang=` first, then the languages her browser asks for — and draws the form in its words, with the runner's
// own buttons and sentences in the same language. The answers land under the same keys whatever language she was
// asked in: only words change (`formInLanguage` from @ai-matrx/records/forms, the one translation door).

import { formBaseLanguage, formInLanguage, formLanguageName, formLanguagesFromDocument, pickFormLanguage } from "@ai-matrx/records/forms";

type Translatable = { title: string; presentation: Record<string, unknown>; fields: ReadonlyArray<Record<string, unknown>> };

export interface FormLanguageChoice {
  code: string;
  label: string;
  /** The link that opens the form in this language (the page's own query kept). */
  href: string;
  current: boolean;
}

export function publicFormInLanguage<T>(
  form: T,
  requested: string | string[] | undefined,
  acceptLanguage: string | null,
  path: string,
  query: Record<string, string | string[] | undefined>,
): { form: T; words: Record<string, string> | null; language: string | null; choices: FormLanguageChoice[] } {
  const doc = form as unknown as Translatable;
  const presentation = (doc.presentation ?? {}) as Record<string, unknown>;
  const asked = typeof requested === "string" ? requested : Array.isArray(requested) ? (requested[0] ?? null) : null;
  const code = pickFormLanguage(presentation, asked, acceptLanguage);
  const translated = formInLanguage({ ...doc, presentation, fields: doc.fields ?? [] }, code);
  const languages = formLanguagesFromDocument(presentation["languages"]);
  const base = formBaseLanguage(presentation);
  const link = (lang: string) => {
    const kept = new URLSearchParams();
    for (const [k, v] of Object.entries(query)) if (typeof v === "string" && k !== "lang" && k !== "wrong") kept.set(k, v);
    kept.set("lang", lang);
    return `${path}?${kept.toString()}`;
  };
  const choices: FormLanguageChoice[] =
    languages.length === 0
      ? []
      : [
          { code: base.code, label: base.label, href: link(base.code), current: translated.language === null },
          ...languages.map((l) => ({ code: l.code, label: formLanguageName(l), href: link(l.code), current: translated.language === l.code })),
        ];
  const { language, words, ...rest } = translated;
  return {
    form: { ...(form as object), ...rest } as T,
    words: language ? (words as unknown as Record<string, string>) : null,
    language,
    choices,
  };
}
