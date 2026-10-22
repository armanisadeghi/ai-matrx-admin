/**
 * WHICH COLUMNS A FETCHED TABLE OPENS ON. A table made by "Get data" has every field the source
 * returned — dozens, several of them developer plumbing. It opens on the source's telling fields
 * (the catalog's `output_fields`, telling-first via `orderTellingFields`, capped), and every other
 * column stays one click away in the table's own column control. Nothing is deleted: this only
 * produces the list of field keys the grid's ordinary "hidden columns" look starts with.
 *
 * THE ONE COLUMN REGISTRY (lane L4, 2026-10-22): a source may name its short opening set with plain
 * names (`SOURCE_COLUMNS`); developer fields ("Is listing claimed by current signed in user", a run's
 * `input`/`timestamp`) never open and sit last behind "All columns". The library's "What you get",
 * the inline results grid and the full table page all read their opening columns from here.
 */

import { fieldWords, orderTellingFields } from "./library/catalog";

/** How many columns a fetched table opens on. */
export const OPENING_COLUMN_CAP = 8;

interface FieldLike {
  key: string;
  label?: string | null;
  name?: string | null;
}

const norm = (s: string | null | undefined) => (s ?? "").toLowerCase().replace(/[^a-z0-9]+/g, "");

/** One opening column: the source's own field and the plain name a person reads. */
export interface OpeningColumn {
  field: string;
  label: string;
}

const col = (field: string, label: string): OpeningColumn => ({ field, label });

/** Each everyday source's short opening set, best first, in plain names. A source not listed opens on its telling fields. */
export const SOURCE_COLUMNS: Readonly<Record<string, readonly OpeningColumn[]>> = {
  zillow_listing: [col("address", "Address"), col("price", "Price"), col("bedrooms", "Beds"), col("bathrooms", "Baths"), col("homeStatus", "Status"), col("yearBuilt", "Built"), col("city", "City")],
  trustpilot_reviews: [col("review_rating", "Rating"), col("review_title", "Title"), col("review_content", "Review"), col("reviewer_name", "Reviewer"), col("review_date", "Date"), col("company_name", "Company")],
  google_maps_place: [col("name", "Name"), col("rating", "Rating"), col("reviews_count", "Reviews"), col("category", "Category"), col("address", "Address"), col("phone_number", "Phone"), col("open_website", "Website")],
  yelp_reviews: [col("business_name", "Business"), col("Rating", "Rating"), col("Content", "Review"), col("review_author", "Reviewer"), col("Date", "Date")],
  g2_reviews: [col("stars", "Rating"), col("title", "Title"), col("text", "Review"), col("author", "Reviewer"), col("company_size", "Company size"), col("date", "Date")],
  app_store_reviews: [col("review_rating", "Rating"), col("review_title", "Title"), col("review", "Review"), col("reviewer_name", "Reviewer"), col("review_date", "Date")],
  google_play_reviews: [col("review_rating", "Rating"), col("review", "Review"), col("reviewer_name", "Reviewer"), col("review_date", "Date"), col("found_helpful", "Helpful"), col("app_title", "App")],
  linkedin_jobs_search: [col("job_title", "Role"), col("company_name", "Company"), col("job_location", "Where"), col("job_employment_type", "Type"), col("job_seniority_level", "Level"), col("job_base_pay_range", "Pay"), col("job_posted_time", "Posted")],
  indeed_jobs: [col("job_title", "Role"), col("company_name", "Company"), col("location", "Where"), col("job_type", "Type"), col("salary_formatted", "Pay"), col("date_posted_parsed", "Posted")],
  glassdoor_jobs_search: [col("job_title", "Role"), col("company_name", "Company"), col("job_location", "Where"), col("company_rating", "Company rating"), col("company_size", "Company size")],
  amazon_product: [col("title", "Product"), col("initial_price", "Price"), col("availability", "Stock"), col("brand", "Brand"), col("reviews_count", "Reviews"), col("seller_name", "Seller")],
  amazon_product_search: [col("title", "Product"), col("initial_price", "Price"), col("availability", "Stock"), col("brand", "Brand"), col("reviews_count", "Reviews"), col("seller_name", "Seller")],
  walmart_product: [col("final_price", "Price"), col("brand", "Brand"), col("rating_stars", "Rating"), col("available_for_delivery", "Delivery"), col("available_for_pickup", "Pickup")],
  walmart_product_search: [col("final_price", "Price"), col("brand", "Brand"), col("rating_stars", "Rating"), col("available_for_delivery", "Delivery"), col("available_for_pickup", "Pickup")],
  google_shopping_search: [col("title", "Product"), col("total_price", "Price"), col("seller_name", "Seller"), col("rating", "Rating"), col("reviews_count", "Reviews"), col("delivery_price", "Delivery")],
  facebook_marketplace_search: [col("title", "Item"), col("final_price", "Price"), col("condition", "Condition"), col("location", "Where"), col("description", "Details")],
  crunchbase_company: [col("name", "Name"), col("about", "About"), col("industries", "Industries"), col("num_employees", "Employees"), col("founded_date", "Founded"), col("region", "Region"), col("website", "Website")],
  linkedin_company: [col("name", "Name"), col("industries", "Industry"), col("company_size", "Size"), col("followers", "Followers"), col("employees_in_linkedin", "On LinkedIn"), col("founded", "Founded"), col("website", "Website")],
  tiktok_posts: [col("description", "Post"), col("play_count", "Views"), col("digg_count", "Likes"), col("comment_count", "Comments"), col("share_count", "Shares"), col("create_time", "Posted")],
  x_posts: [col("description", "Post"), col("views", "Views"), col("likes", "Likes"), col("replies", "Replies"), col("reposts", "Reposts"), col("date_posted", "Posted")],
};

/**
 * Developer plumbing a person never reads: the site's own "signed-in viewer" flags, a run's echo of
 * its input, collection timestamps, vendor error codes. Never in the opening set; last under "All columns".
 */
export function isDeveloperField(name: string): boolean {
  const n = norm(name);
  return (
    /signedin/.test(n) ||
    /^(input|discoveryinput|timestamp|warning|warningcode|error|errorcode|page|categoryindex|cidlocation|fidlocation)$/.test(n) ||
    /dimension$/.test(n) ||
    /^(is)?(zillowowned|housingconnector|rentalsleadcapmet|instantofferenabled|premierbuilder)$/.test(n)
  );
}

/** The plain name a field reads by: the source's own curated name, else the catalog's worded field name. */
export function columnLabel(sourceKey: string | null | undefined, field: string): string {
  const named = sourceKey ? SOURCE_COLUMNS[sourceKey]?.find((c) => norm(c.field) === norm(field)) : undefined;
  return named?.label ?? fieldWords(field);
}

/**
 * A source's columns in the order a person meets them: its curated opening set (only fields it really
 * returns), then the other telling fields; developer fields are dropped from `opening` and kept last in `all`.
 */
export function sourceColumns(sourceKey: string | null | undefined, outputFields: readonly string[]): { opening: OpeningColumn[]; all: OpeningColumn[] } {
  const have = new Map(outputFields.map((f) => [norm(f), f]));
  const curated = (sourceKey ? SOURCE_COLUMNS[sourceKey] ?? [] : [])
    .filter((c) => have.has(norm(c.field)))
    .map((c) => ({ field: have.get(norm(c.field))!, label: c.label }));
  const taken = new Set(curated.map((c) => norm(c.field)));
  const rest = orderTellingFields(outputFields).filter((f) => !taken.has(norm(f)));
  const telling = rest.filter((f) => !isDeveloperField(f)).map((f) => ({ field: f, label: columnLabel(sourceKey, f) }));
  const developer = rest.filter(isDeveloperField).map((f) => ({ field: f, label: columnLabel(sourceKey, f) }));
  const opening = curated.length >= 2 ? curated : telling.slice(0, OPENING_COLUMN_CAP);
  const openSet = new Set(opening.map((c) => norm(c.field)));
  return { opening, all: [...opening, ...telling.filter((c) => !openSet.has(norm(c.field))), ...developer] };
}

/**
 * The field keys to start hidden: every field that is not one of the source's first `cap` telling
 * output fields present in the table. Null when there is nothing to do (the table already fits,
 * or too few of its fields are recognized to say which ones tell).
 */
export function openingHiddenFields(
  fields: readonly FieldLike[],
  outputFields: readonly string[],
  cap: number = OPENING_COLUMN_CAP,
  sourceKey?: string | null,
): string[] | null {
  const devHit = fields.some((f) => [f.key, f.name, f.label].some((x) => x && isDeveloperField(x)));
  if (fields.length <= cap && !devHit && !(sourceKey && SOURCE_COLUMNS[sourceKey])) return null;
  const shown: string[] = [];
  for (const out of sourceColumns(sourceKey, outputFields).opening.map((c) => c.field)) {
    const wanted = new Set([norm(out), norm(fieldWords(out))]);
    const hit = fields.find((f) => !shown.includes(f.key) && [f.key, f.name, f.label].some((x) => x && wanted.has(norm(x))));
    if (hit) shown.push(hit.key);
    if (shown.length >= cap) break;
  }
  if (shown.length < 2) return null;
  const hidden = fields.filter((f) => !shown.includes(f.key)).map((f) => f.key);
  return hidden.length > 0 ? hidden : null;
}

/** Whether the person (or a view's author) has already chosen which columns show: then we never override it. */
export function hasChosenColumns(
  address: { hidden?: readonly string[] } | null | undefined,
  views: readonly { presentation?: { hiddenFields?: readonly string[] } | null }[],
  looks: Record<string, { presentation?: { hiddenFields?: readonly string[] } | null } | undefined> | null | undefined,
): boolean {
  if ((address?.hidden?.length ?? 0) > 0) return true;
  if (views.some((v) => (v.presentation?.hiddenFields?.length ?? 0) > 0)) return true;
  return Object.values(looks ?? {}).some((l) => (l?.presentation?.hiddenFields?.length ?? 0) > 0);
}
