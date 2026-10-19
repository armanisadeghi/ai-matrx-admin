"use client";

/**
 * The measured voice itself, shown inside the Current voice card: every dimension the
 * fingerprint holds (the shape written by aidream voice_measure extract_fingerprint), grouped,
 * with short labels, plain values and chips for lists. What each group means lives in a Peek.
 */

import { Badge } from "@/components/ui/badge";
import { PropertyRow } from "@ai-matrx/design-system/controls";
import { AboutPeek } from "@/features/marketing/components/shared/AboutPeek";

type Rec = Record<string, unknown>;

const rec = (v: unknown): Rec => (v && typeof v === "object" && !Array.isArray(v) ? (v as Rec) : {});
const list = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []);
const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);

const n1 = (v: unknown, unit = ""): string | null => {
  const x = num(v);
  return x === null ? null : `${Math.round(x * 10) / 10}${unit}`;
};
const pct = (v: unknown): string | null => {
  const x = num(v);
  return x === null ? null : `${Math.round(x * 100)}%`;
};
const per1k = (v: unknown): string | null => {
  const x = num(v);
  return x === null ? null : `${Math.round(x * 10) / 10} per 1k words`;
};
const yesNo = (v: unknown): string | null => (typeof v === "boolean" ? (v ? "Yes" : "No") : null);
const text = (v: unknown): string | null => (typeof v === "string" && v ? v.replace(/_/g, " ") : null);
const cap = (s: string | null): string | null => (s ? s[0].toUpperCase() + s.slice(1) : null);

function Group({ title, about, children }: { title: string; about: string; children: React.ReactNode }) {
  return (
    <div className="border-t border-border pt-3">
      <h3 className="mb-2 flex items-center gap-1 type-label text-foreground">
        {title}
        <AboutPeek title={title} about={about} />
      </h3>
      {children}
    </div>
  );
}

function Rows({ rows }: { rows: ReadonlyArray<readonly [string, string | null]> }) {
  const shown = rows.filter((r): r is readonly [string, string] => r[1] !== null);
  if (!shown.length) return null;
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {shown.map(([label, value]) => (
        <PropertyRow key={label} label={label} value={value} />
      ))}
    </div>
  );
}

function Chips({ label, items }: { label: string; items: string[] }) {
  if (!items.length) return null;
  return (
    <div className="mt-2 flex flex-wrap items-center gap-1.5">
      <span className="type-label text-muted-foreground">{label}</span>
      {items.map((item) => (
        <Badge key={item} variant="secondary">
          {item}
        </Badge>
      ))}
    </div>
  );
}

export function MeasuredVoice({ fingerprint }: { fingerprint: Record<string, unknown> }) {
  const fp = rec(fingerprint);
  const cadence = rec(fp.cadence);
  const sentence = rec(cadence.sentence_length);
  const paragraph = rec(cadence.paragraph_length);
  const mech = rec(fp.mechanics);
  const caps = rec(mech.capitalization_quirks);
  const lexical = rec(fp.lexical);
  const openers = rec(fp.openers);
  const closers = rec(fp.closers);
  const start = rec(fp.sentence_initial);
  const idioms = rec(fp.idioms);
  const axis = rec(fp.register_axis);
  const persp = rec(rec(fp.topic_signatures).perspective_anchors);
  const extraction = rec(fp.extraction);

  const rhythm = cap(text(cadence.rhythm_signature));
  const register = cap(text(fp.register_label));
  const warnings = list(extraction.warnings);

  return (
    <div className="mt-3 space-y-3" data-testid="voice-measured">
      <Group title="Tone and rhythm" about="How formal the writing sounds and how its sentences move, measured across all the samples together.">
        <Rows
          rows={[
            ["Register", register],
            ["Rhythm", rhythm],
            ["Formality score", n1(axis.involved_score)],
            ["Word variety", pct(lexical.mattr)],
            ["Avg sentence", n1(sentence.mean, " words")],
            ["Middle sentence", n1(sentence.median, " words")],
            ["Shortest 10%", n1(sentence.p10, " words")],
            ["Longest 10%", n1(sentence.p90, " words")],
            ["One-word sentences", pct(sentence.one_word_sentence_frequency)],
            ["Long sentences", pct(sentence.long_sentence_frequency)],
            ["Sentences per paragraph", n1(paragraph.mean_sentences)],
            ["One-line paragraphs", pct(paragraph.one_sentence_paragraph_frequency)],
          ]}
        />
      </Group>

      <Group title="Punctuation and style" about="The marks and habits that make the writing look like yours. Rates are per 1,000 words.">
        <Rows
          rows={[
            ["Contractions", cap(text(mech.contractions))],
            ["Em dashes", cap(text(mech.em_dash_usage))],
            ["Em dash rate", per1k(mech.em_dash_per_1k_words)],
            ["Oxford comma", cap(text(mech.oxford_comma))],
            ["Ellipses", cap(text(mech.ellipsis_usage))],
            ["Exclamations", per1k(mech.exclamation_rate_per_1k_words)],
            ["Questions", per1k(mech.question_rate_per_1k_words)],
            ["Semicolons", per1k(mech.semicolon_per_1k_words)],
            ["Parentheses", per1k(mech.parenthesis_per_1k_words)],
            ["Asides", cap(text(mech.parenthetical_aside_frequency))],
            ["Lowercase i", yesNo(caps.lowercase_i)],
            ["Sentence-case headers", yesNo(caps.sentence_case_headers)],
            ["All caps", cap(text(caps.all_caps_for_emphasis))],
            ["Smart quotes", cap(text(mech.smart_quotes))],
          ]}
        />
      </Group>

      <Group title="How sentences start and end" about="Openers and closers that repeat across your samples, and how often sentences begin with a conjunction or a transition.">
        <Rows
          rows={[
            ["And/But starts", pct(start.conjunction_start_rate)],
            ["Starts with an -ing phrase", pct(start.participial_start_rate)],
            ["However / Moreover", yesNo(start.uses_however_furthermore_moreover)],
            ["In conclusion", yesNo(start.uses_in_conclusion_in_summary)],
            ["Imagine if", yesNo(start.uses_imagine_if)],
          ]}
        />
        <Chips label="Openers" items={list(openers.observed)} />
        <Chips label="Closers" items={list(closers.observed)} />
        <Chips label="Transitions" items={list(start.transitions_used)} />
      </Group>

      <Group title="Signature language" about="Phrases and words you use far more than typical English, and the hedges you actually reach for.">
        <Chips label="Phrases" items={list(idioms.signature_phrases)} />
        <Chips label="Words" items={list(idioms.signature_words)} />
        <Chips label="Hedges you use" items={list(idioms.hedges_you_actually_use)} />
        <Chips label="Banned words you use" items={list(fp.global_words_in_samples)} />
      </Group>

      <Group title="Point of view" about="How often the writing speaks as I, we or you, or about others. Rates are per 1,000 words.">
        <Rows
          rows={[
            ["I / me", per1k(persp.first_person_singular_rate)],
            ["We / us", per1k(persp.first_person_plural_rate)],
            ["You", per1k(persp.second_person_rate)],
            ["He / she / they", per1k(persp.third_person_rate)],
          ]}
        />
      </Group>

      {warnings.length ? (
        <div className="flex flex-wrap items-center gap-1.5 border-t border-border pt-3">
          <span className="type-label text-muted-foreground">Heads-up</span>
          {warnings.map((w) => (
            <Badge key={w} variant="secondary" className="whitespace-normal text-left">
              {w}
            </Badge>
          ))}
        </div>
      ) : null}
    </div>
  );
}
