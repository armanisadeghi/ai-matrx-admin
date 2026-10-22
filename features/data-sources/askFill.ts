/**
 * From a read sentence to a filled form — pure. `readAsk` (`./ask`) says the task, the place and the
 * filters; this file picks the source that answers it and writes the reading into that source's own
 * input fields, so the form shows (and the person can edit) exactly what runs. Whatever the source
 * cannot apply is listed, never silently dropped.
 */

import type { AskReading } from "./ask";
import { buildInput, inputFieldsFor, type DataSource, type DataSourceField } from "./contract";
import { modeOf } from "./SourceInputFields";
import { shownFilters, type FilterName } from "./filterChoices";

type Keyed = Pick<DataSource, "key" | "input" | "search_filters">;

const norm = (name: string) => name.toLowerCase().replace(/[^a-z0-9]/g, "");
const PLACE = new Set(["location", "locations", "city", "zip", "zipcode", "postalcode", "region", "state"]);
const KEYWORD = new Set(["keyword", "keywords", "keywordsearch", "query", "search", "searchterm", "q", "searchkeyword"]);
const COMPANY = new Set(["domain", "company", "companyname", "name"]);

/** The data-source values Bright Data's Zillow search takes for the reader's status and home type. */
const BD_STATUS: Record<string, string> = { for_sale: "House for sale", for_rent: "House for rent", sold: "Sold" };
const BD_TYPE: Record<string, string> = { house: "Houses", townhouse: "Townhomes", condo: "Condos", apartment: "Apartments" };

const KEYS_OF_WORDS = ["keyword", "company", "brand", "handle", "platform"];

/**
 * The source an ask opens among the task's sources: a source whose search takes the ask's filters
 * through a faster provider that is on for this organization wins (`search_filters` listed), else the
 * first live-confirmed source, else the first.
 */
export function pickAskSource<S extends Keyed & { confirmed?: boolean; knownIssue?: string | null }>(
  sources: readonly S[],
): S | null {
  const usable = sources.filter((s) => !s.knownIssue);
  const pool = usable.length > 0 ? usable : sources;
  return pool.find((s) => (s.search_filters ?? []).length > 0) ?? pool.find((s) => s.confirmed) ?? pool[0] ?? null;
}

const money = (n: number) => String(Math.round(n));

export interface AskFill {
  /** The form's values, by the source's own field names. */
  values: Record<string, string>;
  /** The search option the values belong to (null: the source's first everyday search, or its link). */
  option: string | null;
  /** True when the fill is enough to run (every required field is set). */
  complete: boolean;
  /** Labels of what the person said that this source cannot apply. */
  unapplied: string[];
}

function wordsFor(reading: AskReading): string {
  const f = reading.filters;
  const byTask: Partial<Record<AskReading["task"], string[]>> = {
    jobs: [f.company, f.keyword, reading.subject],
    company_research: [f.company, reading.subject],
    company_reviews: [f.company, reading.subject],
    app_reviews: [reading.subject, f.company],
    social_posts: [f.handle, reading.subject],
    products: [reading.subject, f.keyword],
    local_business: [reading.subject, f.keyword],
  };
  return (byTask[reading.task] ?? [reading.subject, f.keyword, f.company]).find((w) => w && w.trim())?.trim() ?? "";
}

/** Write a reading into a source's form. */
export function fillFromAsk(source: DataSource, reading: AskReading): AskFill {
  const f = reading.filters;
  const values: Record<string, string> = {};
  const used = new Set<string>();
  const shown = shownFilters(source);

  // A page address in the sentence is the link itself.
  if (f.url && source.input.kind === "url") {
    const link = inputFieldsFor(source, null)[0];
    if (link) values[link.name] = f.url;
    return { values, option: null, complete: buildInput(source, values, null).input != null, unapplied: reading.chips.map((c) => c.label).filter((l) => l !== f.url) };
  }

  const { option } = modeOf(source, null, values);
  const fields: DataSourceField[] = inputFieldsFor(source, option);
  for (const field of fields) {
    const n = norm(field.name);
    if (PLACE.has(n) && reading.place) {
      values[field.name] = reading.place;
      used.add("place");
    } else if (KEYWORD.has(n) || COMPANY.has(n)) {
      const words = n === "domain" ? (f.url || wordsFor(reading)) : wordsFor(reading);
      if (words) {
        values[field.name] = words;
        KEYS_OF_WORDS.forEach((k) => used.add(k));
      }
    } else if (n === "username" && f.handle) {
      values[field.name] = f.handle.replace(/^@/, "");
      used.add("handle");
    } else if (n === "listingcategory" && f.status) {
      values[field.name] = BD_STATUS[f.status];
      used.add("status");
    } else if (n === "hometype" && f.homeType && BD_TYPE[f.homeType]) {
      values[field.name] = BD_TYPE[f.homeType];
      used.add("home_type");
    }
  }
  // A listing search with no word fields still names the place in its sentence.
  if (reading.task === "homes" && reading.place && !Object.values(values).includes(reading.place) && source.search_filters?.length) {
    const place = fields.find((x) => PLACE.has(norm(x.name)));
    if (place) values[place.name] = reading.place;
  }

  // The filters the server listed for this source.
  const take = (name: FilterName, value: string | null, chip: string): boolean => {
    if (!shown.has(name) || !value) return false;
    values[name] = value;
    used.add(chip);
    return true;
  };
  take("status", f.status, "status");
  take("home_type", f.homeType, "home_type");
  const lo = take("price_min", f.priceMin == null ? null : money(f.priceMin), "price_min");
  const hi = take("price_max", f.priceMax == null ? null : money(f.priceMax), "price_max");
  if ((lo || f.priceMin == null) && (hi || f.priceMax == null) && (lo || hi)) used.add("price");
  if (take("beds_min", f.bedsMin == null ? null : String(f.bedsMin), "beds_min") && f.bedsExact) values.beds_exact = "true";
  take("baths_min", f.bathsMin == null ? null : String(f.bathsMin), "baths_min");

  const unapplied = reading.chips.filter((c) => !used.has(c.key)).map((c) => c.label);
  return { values, option, complete: buildInput(source, values, option).input != null, unapplied };
}
