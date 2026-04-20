/**
 * AI post-processing agents available in VoicePadAi.
 *
 * Each agent declares the variable key that should receive the transcribed
 * text and, optionally, the context slot that should receive free-form user
 * context. Variable and slot keys differ per agent — the pad wires them up
 * by name when it launches the agent.
 */

export interface AiPostProcessAgent {
  id: string;
  name: string;
  /** Variable key that receives the full transcribed text. */
  transcriptVariableKey: string;
  /** Optional context slot key for user-typed context. */
  contextSlotKey?: string;
}

export const AI_POST_PROCESS_AGENTS: AiPostProcessAgent[] = [
  {
    id: "cd95ff85-367e-4b62-a0fd-8064a431b5a1",
    name: "Transcription Cleaner (no context var)",
    transcriptVariableKey: "transcribed_text",
    contextSlotKey: "transcription_user_context",
  },
  {
    id: "dd4ac1a7-5743-4924-aaf8-aa42168dc957",
    name: "Transcription Cleaner (Copy)",
    transcriptVariableKey: "transcribed_text",
  },
  {
    id: "2bad0278-1eb2-4d31-9f69-cdef0b491ca7",
    name: "Transcription Cleaner",
    transcriptVariableKey: "transcribed_text",
  },
  {
    id: "cd496fe2-5bf5-4d31-8efc-7db0779c64ba",
    name: "Arman Employee Tasks From Transcript",
    transcriptVariableKey: "full_transcript_text",
  },
  {
    id: "adaff370-98fa-44d6-bf9c-2a49bef41f69",
    name: "Instruction Transcript Cleaner (no context)",
    transcriptVariableKey: "transcript",
  },
  {
    id: "40174c4a-c138-4d47-ab80-0a5b94471533",
    name: "Instruction Transcript Cleaner",
    transcriptVariableKey: "transcript",
  },
];

export const DEFAULT_AI_POST_PROCESS_AGENT_ID = AI_POST_PROCESS_AGENTS[0].id;
