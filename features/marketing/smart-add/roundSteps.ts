/**
 * The identify workflow's step names, as the Smart Add screen reads them. Pure; shared by the live round reader
 * (SmartAddRound.tsx) and the finished-run reader (roundOutput.ts), so both read the same steps.
 */

/** Identify: the raw tier (site, accounts, web) then the confirmed tiers (news/videos/images, local). */
export const IDENTIFY_STEPS: readonly string[] = ["probe", "page", "avatars", "socials", "web", "deep", "local"];
/** Steps whose output may carry the facts agent's `brand_basics` (read for facts only, not shown as steps). */
export const FACT_STEPS: readonly string[] = ["facts", "brand_basics", "person_facts", "whats_new_1", "whats_new_2", "whats_new_3"];
/** The person branch's anchor stage and the email step (aidream brand.identify.email): their findings (read like any step's output, not shown as steps). */
export const ANCHOR_STEPS: readonly string[] = ["person_anchor_search", "person_anchor_extract", "email"];
/**
 * The "we think" step (mandate brand_intake.we_think): its `brand_we_think` suggestions, per finding key. Its guard
 * step (aidream brand.identify.we_think_guard: fixed facts correct the agent's pre-marks) comes after it, so its
 * answer wins wherever it arrived. `identity_marks` (aidream brand.identify.identity_marks) carries the is-this-us
 * decisions on the accounts the guard left as ask later, in the same `brand_we_think` shape, so it comes after the guard.
 */
export const WE_THINK_STEPS: readonly string[] = ["we_think", "we_think_guard", "identity_marks", "classify"];
