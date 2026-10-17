/**
 * People & company lookups on the Tools home (third-party services lane L12b). Pure.
 *
 * Three jobs, none of which needs a table or a setup step:
 * 1. `planLookup` reads what a person typed in the one box and says which Tool answers it
 *    (website → company profile, email → email check, phone → phone check, "Ari Weinzweig at
 *    zingermans.com" → work email). The detection is the platform's own `classifyText`.
 * 2. `nextSteps` names what usually comes after an answer, so the waterfall is one press at a time
 *    and every press is visible and priced (the champion's hidden waterfall, made honest).
 * 3. `partyToKeep` says what an answer may add to the CRM. A found address is a guess until a check
 *    says it can receive mail, and a guess is never attached as a way to reach someone
 *    (features/crm/FEATURE.md: a candidate is never a contact).
 */

import { KIND_KEY } from "@ai-matrx/content-ir";
import { classifyText } from "@ai-matrx/chat/mandates/invoke/smart-box";

/** The catalog job keys this lane works with (aidream `tool_catalog/seeds`). */
export const PEOPLE_JOBS = {
  companyProfile: "company_profile",
  companyEmails: "company_emails",
  workEmail: "people_work_email",
  emailCheck: "email_verify",
  phoneCheck: "phone_check",
} as const;

export type PeopleJobKey = (typeof PEOPLE_JOBS)[keyof typeof PEOPLE_JOBS];

/** The Tools home address for a lookup. The ONE builder: a record that offers a lookup links here. */
export const TOOLS_HOME_HREF = "/data/library";

/**
 * A link that opens one lookup with its box filled. It never presses the button (`run` stays off): a link is not
 * consent to spend, so the person sees the price on the page and presses it themselves.
 */
export function toolLookupHref(jobKey: PeopleJobKey, inputs: Record<string, string>): string {
  const params = new URLSearchParams({ tool: jobKey, with: JSON.stringify(inputs) });
  return `${TOOLS_HOME_HREF}?${params.toString()}`;
}

export interface LookupPlan {
  jobKey: PeopleJobKey;
  /** Inputs by the Tool's own field names, ready to prefill its form. */
  inputs: Record<string, string>;
  /** What the person is about to get, in their words ("Company profile for zingermans.com"). */
  label: string;
}

/** A name followed by a website: "Ari Weinzweig zingermans.com", "ari weinzweig at zingermans.com". */
function personAtSite(text: string): LookupPlan | null {
  const words = text.trim().split(/\s+/).filter((w) => w.toLowerCase() !== "at" && w !== "@");
  if (words.length < 3 || words.length > 5) return null;
  const last = classifyText(words[words.length - 1] ?? "", { anyEnding: true });
  if (!last || (last.type !== "domain" && last.type !== "url")) return null;
  const name = words.slice(0, -1);
  if (!name.every((w) => /^[\p{L}][\p{L}'’.-]*$/u.test(w))) return null;
  const first = name[0] as string;
  const lastName = name.slice(1).join(" ");
  const site = last.type === "url" ? hostOf(last.value) : last.value;
  if (!site) return null;
  return {
    jobKey: PEOPLE_JOBS.workEmail,
    inputs: { first_name: capitalise(first), last_name: capitalise(lastName), domain: site },
    label: `Work email for ${capitalise(first)} ${capitalise(lastName)} at ${site}`,
  };
}

function capitalise(word: string): string {
  return word.replace(/(^|[\s-])(\p{L})/gu, (_m, pre: string, ch: string) => pre + ch.toUpperCase());
}

function hostOf(url: string): string | null {
  try {
    return new URL(url).hostname.replace(/^www\./, "") || null;
  } catch {
    return null;
  }
}

/** What the one box does with `raw`; null when it cannot tell (the caller says so, never guesses). */
export function planLookup(raw: string): LookupPlan | null {
  const text = raw.trim();
  if (!text) return null;
  const person = personAtSite(text);
  if (person) return person;
  const seen = classifyText(text, { anyEnding: true });
  if (!seen) return null;
  switch (seen.type) {
    case "email":
      return { jobKey: PEOPLE_JOBS.emailCheck, inputs: { email: seen.value }, label: `Check whether ${seen.value} can receive mail` };
    case "phone":
      return { jobKey: PEOPLE_JOBS.phoneCheck, inputs: { phone: seen.value }, label: `Check the number ${seen.value}` };
    case "domain":
      return { jobKey: PEOPLE_JOBS.companyProfile, inputs: { domain: seen.value }, label: `Company profile for ${seen.value}` };
    case "url": {
      const site = hostOf(seen.value);
      return site ? { jobKey: PEOPLE_JOBS.companyProfile, inputs: { domain: site }, label: `Company profile for ${site}` } : null;
    }
    default:
      return null;
  }
}

/** What to say when the box cannot tell what was typed. */
export function lookupHelp(raw: string): string | null {
  const text = raw.trim();
  if (!text || planLookup(text)) return null;
  const seen = classifyText(text, { anyEnding: true });
  if (seen?.type === "person_name") return "Add the company's website after the name.";
  return "Type a website, email, phone, or a name and website.";
}

export interface NextStep {
  /** Button words ("Find emails at this company"). */
  label: string;
  jobKey: PeopleJobKey;
  inputs: Record<string, string>;
}

type Out = Record<string, unknown> | null | undefined;

function text(o: Out, key: string): string | null {
  const v = o?.[key];
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

function asRecord(output: unknown): Out {
  return output !== null && typeof output === "object" && !Array.isArray(output) ? (output as Record<string, unknown>) : null;
}

/** The kind marker an answer carries (`KIND_KEY`), which is how an answer says what it is. */
export function kindOf(output: unknown): string | null {
  return text(asRecord(output), KIND_KEY);
}

/**
 * What usually comes next, from the answer alone. Nothing here runs by itself: each step is a button
 * that opens the next Tool with its box filled, where the price shows before the press.
 */
export function nextSteps(output: unknown): NextStep[] {
  const o = asRecord(output);
  switch (kindOf(output)) {
    case "company_profile": {
      const domain = text(o, "domain") ?? null;
      if (!domain) return [];
      const steps: NextStep[] = [{ label: "Find emails at this company", jobKey: PEOPLE_JOBS.companyEmails, inputs: { domain } }];
      const phone = text(o, "phone");
      if (phone) steps.push({ label: "Check its phone number", jobKey: PEOPLE_JOBS.phoneCheck, inputs: { phone } });
      return steps;
    }
    case "work_email": {
      const email = text(o, "email");
      return email ? [{ label: "Check this email", jobKey: PEOPLE_JOBS.emailCheck, inputs: { email } }] : [];
    }
    case "email_candidates": {
      const rows = Array.isArray(o?.emails) ? (o?.emails as unknown[]) : [];
      const steps: NextStep[] = [];
      for (const row of rows) {
        const r = asRecord(row);
        const email = text(r, "email");
        if (!email || steps.length >= 3) continue;
        const who = [text(r, "first_name"), text(r, "last_name")].filter(Boolean).join(" ");
        steps.push({ label: `Check ${who || email}`, jobKey: PEOPLE_JOBS.emailCheck, inputs: { email } });
      }
      return steps;
    }
    default:
      return [];
  }
}

/** Plain words for a verdict from an email check. Null when the answer holds none. */
export function emailVerdictWords(output: unknown): { text: string; tone: "good" | "warn" | "bad" } | null {
  const o = asRecord(output);
  if (kindOf(output) !== "email_verdict") return null;
  const result = (text(o, "result") ?? "").toLowerCase();
  if (["ok", "good", "valid", "deliverable"].includes(result)) return { text: "Confirmed: this address can receive mail", tone: "good" };
  if (["risky", "catch_all", "catch-all", "unknown", "accept_all"].includes(result)) return { text: "Risky: the mailbox may not exist", tone: "warn" };
  if (["invalid", "bad", "undeliverable", "disposable"].includes(result)) return { text: "This address does not exist", tone: "bad" };
  return null;
}

/** What a finder said about the address it found, in words. Never "verified" by the finder's say-so. */
export function foundEmailWords(output: unknown): string | null {
  if (kindOf(output) !== "work_email") return null;
  return "Found, not confirmed yet";
}

export interface PartyToKeep {
  kind: "person" | "organization";
  displayName: string;
  firstName?: string;
  lastName?: string;
  jobTitle?: string;
  primaryDomain?: string;
  /** Only an address a check confirmed; never a found guess. */
  emails: string[];
  /** Only a number a phone check confirmed; the profile's own number waits in `attributes` until then. */
  phones: string[];
  /** A number found but not checked yet. */
  unconfirmedPhone: string | null;
  /** Found but unconfirmed address, kept on the record's data so a later check can use it. */
  unconfirmedEmail: string | null;
  attributes: Record<string, unknown>;
  /** One sentence for the person: what the save did and did not do. */
  note: string;
}

/**
 * What an answer may add to the CRM. `confirmedEmail` is the address an email check just confirmed
 * (the caller passes it only when that check's verdict was good); an answer from a finder alone never
 * attaches an address.
 */
export function partyToKeep(
  output: unknown,
  opts: { confirmedEmail?: string | null; confirmedPhone?: string | null; inputs?: Record<string, unknown> } = {},
): PartyToKeep | null {
  const o = asRecord(output);
  const kind = kindOf(output);
  if (kind === "company_profile") {
    const name = text(o, "name");
    const domain = text(o, "domain");
    if (!name && !domain) return null;
    const attributes: Record<string, unknown> = {};
    for (const key of ["industry", "employees", "founded", "description", "linkedin_url", "twitter_url", "facebook_url", "address", "city", "state", "country", "revenue", "funding"]) {
      const v = o?.[key];
      if (v !== null && v !== undefined && v !== "") attributes[key] = v;
    }
    const phone = text(o, "phone");
    const digits = (v: string) => v.replace(/\D/g, "");
    const phoneOk = phone !== null && opts.confirmedPhone != null && digits(opts.confirmedPhone) === digits(phone);
    if (phone) attributes.phone = phone;
    return {
      kind: "organization",
      displayName: name ?? (domain as string),
      primaryDomain: domain ?? undefined,
      emails: [],
      phones: phoneOk ? [phone] : [],
      unconfirmedPhone: phone && !phoneOk ? phone : null,
      unconfirmedEmail: null,
      attributes: { company_profile: attributes },
      note: phoneOk ? "Saved the company and its checked phone number." : phone ? "Saved. The phone waits until a check confirms it." : "Saved the company.",
    };
  }
  if (kind === "work_email") {
    const email = text(o, "email");
    // A source may leave the name out of its answer; what the person typed is what they asked about.
    const typed = (key: string) => {
      const v = opts.inputs?.[key];
      return typeof v === "string" && v.trim() ? v.trim() : null;
    };
    const first = text(o, "first_name") ?? typed("first_name");
    const last = text(o, "last_name") ?? typed("last_name");
    const full = text(o, "full_name") ?? [first, last].filter(Boolean).join(" ");
    if (!email || !full) return null;
    const confirmed = opts.confirmedEmail && opts.confirmedEmail.toLowerCase() === email.toLowerCase() ? email : null;
    return {
      kind: "person",
      displayName: full,
      firstName: first ?? undefined,
      lastName: last ?? undefined,
      jobTitle: text(o, "position") ?? undefined,
      // A person carries no company website of their own (the party table refuses it), so the company's
      // website rides on the record's data beside where the address was found.
      emails: confirmed ? [confirmed] : [],
      phones: [],
      unconfirmedPhone: null,
      unconfirmedEmail: confirmed ? null : email,
      attributes: {
        works_at_domain: text(o, "domain") ?? typed("domain"),
        ...(confirmed ? {} : { found_work_email: { address: email, status: "not_confirmed" } }),
      },
      note: confirmed
        ? "Saved the person and their confirmed email."
        : "Saved. The email waits until a check confirms it.",
    };
  }
  return null;
}

/** The number a phone check found real (its own written-out form), or null when it did not say so. */
export function checkedPhone(output: unknown): string | null {
  const o = asRecord(output);
  if (kindOf(output) !== "phone_check" || o?.valid !== true) return null;
  return text(o, "display_number") ?? text(o, "number");
}
