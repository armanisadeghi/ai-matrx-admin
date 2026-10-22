// features/marketing/owner-sitting/service.ts
//
// THE OWNER'S SITTING (brand discovery wave 2, common-docs
// projects/brand-discovery/WAVE-2.md § The owner's sittings). A signed-in brand
// member answers the owner story questions one per screen, spoken or typed, on
// the Question Desk's shared answer bar. Everything is an `interview` row read
// and written directly under RLS (no custom table):
//
// - a sitting is a `decision_interview` (source `brand_discovery.owner_sitting`)
//   addressed to the person who opened it, in the BRAND'S organization, with
//   `settings.brand_id` / `settings.room = "owner"` and
//   `settings.follow_through = false` (the desk's follow-through files Work Loop
//   items for decisions; a story answer is testimony, never a ruling);
// - its questions are copied from the owner question bank — a
//   `decision_interview` (source `brand_discovery.owner_question_bank`) in the
//   platform's global-readable system organization — skipping every slug this
//   person was already asked about this brand. The bank is DATA: until the
//   next-question picker (`brand_discovery.ask`) exists, it is the one source.
// - a sitting that ends is marked complete and starts the system workflow
//   `brand_discovery_owner_room` (aidream), whose detective files what the owner
//   said as testimony in the owner room.

import type { AppDispatch } from "@/lib/redux/store";
import { startSystemRun } from "@/lib/workflows/system-runs";
import { db } from "@/features/question-desk/data/db";

export const OWNER_SITTING_SOURCE = "brand_discovery.owner_sitting";
export const OWNER_QUESTION_BANK_SOURCE = "brand_discovery.owner_question_bank";
export const OWNER_ROOM_WORKFLOW_KEY = "brand_discovery_owner_room";

export interface OwnerSittingArgs {
  brandId: string;
  brandName: string;
  organizationId: string;
  userId: string;
}

export type OpenedSitting =
  | { status: "open"; interviewId: string; created: boolean }
  | { status: "all_asked"; lastInterviewId: string | null };

interface BankQuestion {
  slug: string;
  position: number | null;
  title: string;
  question: string;
  why_it_matters: string | null;
  kind: string | null;
  door: string | null;
}

/** Pure: the bank questions this person has not been asked yet, in bank order. */
export function questionsToAsk(bank: BankQuestion[], askedSlugs: Iterable<string>): BankQuestion[] {
  const asked = new Set(askedSlugs);
  return bank
    .filter((q) => !asked.has(q.slug))
    .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
}

async function mySittings(args: OwnerSittingArgs) {
  const { data, error } = await db()
    .from("decision_interview")
    .select("id, status, created_at")
    .eq("source", OWNER_SITTING_SOURCE)
    .eq("respondent_user_id", args.userId)
    .eq("settings->>brand_id", args.brandId)
    .is("deleted_at", null)
    .order("created_at", { ascending: true });
  if (error) throw new Error(`Your earlier sittings could not be read: ${error.message}`);
  return data ?? [];
}

async function readBank(): Promise<BankQuestion[]> {
  const { data: banks, error } = await db()
    .from("decision_interview")
    .select("id")
    .eq("source", OWNER_QUESTION_BANK_SOURCE)
    .is("deleted_at", null);
  if (error) throw new Error(`The story questions could not be read: ${error.message}`);
  const ids = (banks ?? []).map((b) => b.id);
  if (ids.length === 0) throw new Error("No story questions are set up yet.");
  const { data, error: qError } = await db()
    .from("decision_question")
    .select("slug, position, title, question, why_it_matters, kind, door")
    .in("interview_id", ids)
    .eq("mode", "ask")
    .is("deleted_at", null);
  if (qError) throw new Error(`The story questions could not be read: ${qError.message}`);
  return data ?? [];
}

/** One open in flight per person per brand: two mounts share it (never two inserts). */
const inFlight = new Map<string, Promise<OpenedSitting>>();

/**
 * Resume this person's open sitting for the brand, or open a new one holding
 * every bank question they have not been asked. Never a second open sitting:
 * concurrent callers share one promise, and the database's unique index
 * `interview.decision_interview_one_open_owner_sitting` refuses a second open
 * row from another tab — that refusal (23505) resumes the winner's sitting.
 */
export function openOwnerSitting(args: OwnerSittingArgs): Promise<OpenedSitting> {
  const key = `${args.userId}:${args.brandId}`;
  const pending = inFlight.get(key);
  if (pending) return pending;
  const run = openOrResume(args).finally(() => inFlight.delete(key));
  inFlight.set(key, run);
  return run;
}

async function openOrResume(args: OwnerSittingArgs): Promise<OpenedSitting> {
  const sittings = await mySittings(args);
  const open = sittings.find((s) => s.status !== "complete");
  if (open) return { status: "open", interviewId: open.id, created: false };

  let askedSlugs: string[] = [];
  if (sittings.length > 0) {
    const { data, error } = await db()
      .from("decision_question")
      .select("slug")
      .in(
        "interview_id",
        sittings.map((s) => s.id),
      )
      .is("deleted_at", null);
    if (error) throw new Error(`Your earlier answers could not be read: ${error.message}`);
    askedSlugs = (data ?? []).map((q) => q.slug);
  }
  const toAsk = questionsToAsk(await readBank(), askedSlugs);
  if (toAsk.length === 0) {
    return { status: "all_asked", lastInterviewId: sittings.at(-1)?.id ?? null };
  }

  const now = new Date().toISOString();
  const { data: interview, error } = await db()
    .from("decision_interview")
    .insert({
      title: "Your story",
      subtitle: args.brandName,
      respondent_user_id: args.userId,
      source: OWNER_SITTING_SOURCE,
      status: "open",
      settings: { brand_id: args.brandId, room: "owner", follow_through: false },
      organization_id: args.organizationId,
      created_by: args.userId,
      updated_by: args.userId,
    })
    .select("id")
    .single();
  if (error?.code === "23505") {
    // Another tab opened the sitting between our read and our insert: resume it.
    const winner = (await mySittings(args)).find((s) => s.status !== "complete");
    if (winner) return { status: "open", interviewId: winner.id, created: false };
  }
  if (error || !interview) {
    throw new Error(`The sitting could not be opened: ${error?.message ?? "no row came back"}`);
  }
  const { error: qError } = await db()
    .from("decision_question")
    .insert(
      toAsk.map((q, i) => ({
        interview_id: interview.id,
        slug: q.slug,
        position: i + 1,
        mode: "ask",
        title: q.title,
        question: q.question,
        why_it_matters: q.why_it_matters,
        kind: q.kind ?? "open_ended",
        door: q.door ?? "two_way",
        status: "asked",
        asked_at: now,
        organization_id: args.organizationId,
        filed_by_user_id: args.userId,
        created_by: args.userId,
        updated_by: args.userId,
      })),
    );
  if (qError) {
    // A sitting with no questions is withdrawn, never left half-built.
    await db().from("decision_interview").update({ deleted_at: now }).eq("id", interview.id);
    throw new Error(`The questions could not be added to the sitting: ${qError.message}`);
  }
  return { status: "open", interviewId: interview.id, created: true };
}

/**
 * The last answer is in: mark the sitting complete and start the owner-room
 * run (person-fired: the person who just answered). Returns the run id.
 */
export async function finishOwnerSitting(
  dispatch: AppDispatch,
  args: { brandId: string; organizationId: string; interviewId: string },
): Promise<{ runId: string; duplicate: boolean }> {
  const now = new Date().toISOString();
  // write-lands-exempt: a sitting already complete (another tab) is the same outcome
  const { error } = await db()
    .from("decision_interview")
    .update({ status: "complete", completed_at: now })
    .eq("id", args.interviewId)
    .neq("status", "complete");
  if (error) throw new Error(`The sitting could not be closed: ${error.message}`);
  return startSystemRun(
    dispatch,
    OWNER_ROOM_WORKFLOW_KEY,
    {
      subject: `brand:${args.brandId}`,
      organizationId: args.organizationId,
      sourceFeature: "marketing",
      inputs: { brand_id: args.brandId, interview_id: args.interviewId },
    },
    "Reading your answers could not start.",
  );
}
