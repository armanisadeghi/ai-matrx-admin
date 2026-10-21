"use client";

/**
 * Test cases — the ONE writer (Agent Evaluation, CONTRACT v2 §1.1).
 *
 * A test case is an `agent.exemplar` row with `kind='test_case'`. Every surface
 * that makes one (the test page's "Add test case", the Agent Studio's "Save as
 * test case" and its first approved answer) writes through `createTestCase`
 * here, so there is one store and the eval runner reads every case it makes.
 *
 * A case the runner can decide: a case with no checks and no judge facts is
 * always `inconclusive` ("nothing decided"), so every case written here carries
 * at least one judge fact. A case made from an approved answer carries that
 * answer as its fact (the judge reads facts, never `reference_output`).
 */

import { createClient } from "@/utils/supabase/client";
import { ensureOrgId } from "@/lib/organizations/ensureOrgId";
import type { Database, Json } from "@/types/database.types";
import { readAllRows } from "@ai-matrx/data/db";
import {
  SAMPLE_INPUT_CONTENT_KEY,
  fetchRunFinalResponse,
  type AgentContractHead,
  type CandidateRun,
} from "@/features/agents/samples/service";

export type TestCaseRow = Database["agent"]["Tables"]["exemplar"]["Row"];
type ExemplarInsert = Database["agent"]["Tables"]["exemplar"]["Insert"];

/** A judge fact as stored on the case (`JudgeFact {id, statement}`). */
export interface JudgeFactInput {
  id: string;
  statement: string;
}

/** The fact id an approved answer is stored under (one per case). */
export const APPROVED_ANSWER_FACT_ID = "approved-answer";
/** How much of an approved answer rides in its fact (the full answer stays in `reference_output`). */
export const APPROVED_ANSWER_FACT_CHARS = 1500;

/** The approved answer as a fact the judge can decide. */
export function approvedAnswerFact(answer: string): JudgeFactInput | null {
  const text = answer.trim();
  if (!text) return null;
  const shown =
    text.length > APPROVED_ANSWER_FACT_CHARS
      ? `${text.slice(0, APPROVED_ANSWER_FACT_CHARS)}…`
      : text;
  return {
    id: APPROVED_ANSWER_FACT_ID,
    statement: `The reply gives the same substance as this approved answer; wording may differ:\n"""\n${shown}\n"""`,
  };
}

/** "What a good reply does", one per line, as facts (`f1`, `f2`, …). */
export function factsFromLines(text: string): JudgeFactInput[] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((statement, i) => ({ id: `f${i + 1}`, statement }));
}

export interface NewTestCase {
  agentId: string;
  label: string;
  /** Declared-variable values; empty values are dropped, text is kept verbatim. */
  variables: Record<string, Json>;
  /** What the person typed (never structured content). */
  userInput: string;
  /**
   * The whole input of the run the case comes from: the typed text AND every attached file
   * (media or resource part). When given, it is stored as the case's input content, so the run
   * the case makes is the run the person saved (a file is never replaced by its description).
   */
  inputContent?: readonly unknown[];
  /** The approved answer, when the case comes from one (also becomes a fact). */
  approvedAnswer?: string | null;
  /** Extra facts a good reply must hold. */
  facts?: readonly JudgeFactInput[];
  /** The run the case came from (dedupe + provenance). */
  sourceConversationId?: string | null;
  /** Provenance of the row (`authored` typed by hand, `borrowed` from a run). */
  source?: "authored" | "borrowed";
  head: AgentContractHead | null;
}

/**
 * What a case keeps as its input content: the run's own parts when it has any (text and files
 * in order), otherwise the typed text alone.
 */
export function storedInputContent(parts: readonly unknown[] | undefined, userInput: string | null): Json[] {
  if (parts && parts.length > 0) return parts as unknown as Json[];
  return userInput ? [{ type: "text", text: userInput }] : [];
}

/** The insert a new case makes — pure, so the shape is tested without a database. */
export function testCaseInsert(
  input: NewTestCase,
  organizationId: string,
): ExemplarInsert {
  const label = input.label.trim();
  if (!label) throw new Error("Give the test case a name.");
  const variables: Record<string, Json> = {};
  for (const [name, value] of Object.entries(input.variables)) {
    if (value !== "" && value !== null && value !== undefined) variables[name] = value;
  }
  const approved = input.approvedAnswer ?? null;
  const approvedFact = approved ? approvedAnswerFact(approved) : null;
  const facts = [
    ...(approvedFact ? [approvedFact] : []),
    ...(input.facts ?? []).filter((f) => f.statement.trim()),
  ];
  if (facts.length === 0) {
    throw new Error("Say what a good reply does, so the test can pass or fail.");
  }
  const userInput = input.userInput === "" ? null : input.userInput;
  return {
    agent_id: input.agentId,
    kind: "test_case",
    label,
    variables,
    user_input: userInput,
    reference_output: approved && approved.trim() ? approved : null,
    judge_facts: facts as unknown as Json,
    checks: [],
    door: "random",
    source: input.source ?? "authored",
    status: "candidate",
    source_conversation_id: input.sourceConversationId ?? null,
    agent_version: input.head?.version ?? null,
    input_contract_hash: input.head?.inputContractHash ?? null,
    output_contract_hash: input.head?.outputContractHash ?? null,
    visibility: "personal",
    organization_id: organizationId,
    metadata: {
      [SAMPLE_INPUT_CONTENT_KEY]: storedInputContent(input.inputContent, userInput),
    },
  };
}

export async function createTestCase(input: NewTestCase): Promise<TestCaseRow> {
  // org-filter: write-target writes into the organization the person is working in; no list reads it
  const organizationId = await ensureOrgId(null);
  const { data, error } = await createClient()
    .schema("agent")
    .from("exemplar")
    .insert(testCaseInsert(input, organizationId))
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

/** One real run saved as a test case: its inputs, and its final answer as the approved answer. */
export async function saveRunAsTestCase(input: {
  agentId: string;
  run: CandidateRun;
  head: AgentContractHead | null;
  label?: string;
}): Promise<TestCaseRow> {
  const answer = await fetchRunFinalResponse(input.run.conversationId);
  return createTestCase({
    agentId: input.agentId,
    label:
      input.label?.trim() ||
      input.run.title?.trim() ||
      `Run of ${new Date(input.run.createdAt).toLocaleDateString()}`,
    variables: input.run.variables as Record<string, Json>,
    userInput: input.run.userInput ?? "",
    inputContent: input.run.inputContent,
    approvedAnswer: answer,
    sourceConversationId: input.run.conversationId,
    source: "borrowed",
    head: input.head,
  });
}

/** Every live test case of one agent, as stored (the Studio opens one in its center). */
export async function fetchTestCaseRows(agentId: string): Promise<TestCaseRow[]> {
  const supabase = createClient();
  return readAllRows<TestCaseRow>(
    ({ from, to }) =>
      supabase
        .schema("agent")
        .from("exemplar")
        .select("*", { count: "exact" })
        .eq("agent_id", agentId)
        .eq("kind", "test_case")
        .is("deleted_at", null)
        .order("created_at", { ascending: true })
        .order("id", { ascending: true })
        .range(from, to),
    { label: "agent.exemplar test cases" },
  );
}
