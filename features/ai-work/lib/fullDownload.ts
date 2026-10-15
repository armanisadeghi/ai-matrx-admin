"use client";

/**
 * FULL DOWNLOAD — the complete provider transcript of a coding conversation.
 *
 * AI Matrx keeps only a coding session's text and the NAMES of its tool calls
 * (aidream `coding_session_bridge/kept_shape.py`). The full file — every tool
 * input and output — is found in this order (Arman, 2026-09-28: "it should look
 * on your computer first and get it directly first if it's available and then
 * go to s3 if it's not"):
 *
 *   1. THE PERSON'S COMPUTER — a Matrx 2 computer sends the provider's own
 *      file over the relay (`coding.transcript.raw`, protocol 1.38) and this
 *      browser saves it; it refreshes the opt-in cloud backup while it has the
 *      file and counts the subagent transcripts. Else the Matrx Local app
 *      copies it into that computer's Downloads (`coding_session.full_download`
 *      over the existing bridge channel), refreshing the backup the same way.
 *   2. THE CLOUD BACKUP — the gzip copy stored only for owners who opted in
 *      (Feature Knob `coding_session_bridge.raw_transcript_backup`, default off).
 *   3. AN HONEST NO — every step that could not deliver says why, in words.
 */

import { callApi } from "@/lib/api/call-api";
import type { AppDispatch } from "@/lib/redux/store";
import type { components } from "@ai-matrx/api/types";
import { downloadFile } from "@/features/files/api/files";
import { callMatrxLocal } from "./matrxLocalRuntime";
import { browserCodingDoors } from "./matrx2Computers";
import { firstComputerWith, pickComputer } from "./matrx2Coding";
import { downloadFile as saveFile } from "@ai-matrx/kit/download";

export type RawTranscriptSource = components["schemas"]["RawTranscriptSource"];

export type FullDownloadStep =
  | { kind: "this_computer"; savedPath: string; subagentStreams: number; backupNote: string | null }
  | { kind: "cloud_backup"; fileName: string; thisComputer: string }
  | { kind: "not_available"; reasons: string[] };

export interface FullDownloadResult {
  provider: string;
  providerSessionId: string;
  step: FullDownloadStep;
}

interface LocalFullDownloadReply {
  found: boolean;
  detail?: string;
  saved_path?: string;
  subagent_streams?: number;
  backup?: { backed_up: boolean; detail?: string };
}

/** How long to wait for this computer before trying the cloud backup. */
const THIS_COMPUTER_TIMEOUT_MS = 20_000;

/** The note a computer's backup refresh earns, in the panel's words. Pure. */
export function backupNoteFor(refreshed: boolean): string | null {
  return refreshed ? "The cloud backup was refreshed too." : null;
}

/** Step 1 on a Matrx 2 computer: its file over the relay, saved by this browser. */
async function fromMatrx2Computer(
  provider: "claude" | "codex",
  providerSessionId: string,
): Promise<{ step: FullDownloadStep } | { reasons: string[] }> {
  const answer = await firstComputerWith<{ name: string; fileName: string; subagents: number; backup: boolean }>(browserCodingDoors, await pickComputer(browserCodingDoors), async (client, computer) => {
    const chunks: Uint8Array[] = [];
    const stream = client.stream("coding.transcript.raw", { provider, provider_session_id: providerSessionId }, {
      onData: (payload) => void chunks.push(payload),
    });
    const head = (await stream.result) as { available: boolean; reason?: string | null; file_name?: string | null; subagents: number; backup_refreshed: boolean };
    if (!head.available) {
      stream.cancel();
      return { notHere: `${computer.name}: ${head.reason ?? "this chat is not on it."}` };
    }
    await stream.done;
    const fileName = head.file_name ?? `${providerSessionId}.jsonl`;
    saveBlob(new Blob(chunks as BlobPart[], { type: "application/x-ndjson" }), fileName);
    return { value: { name: computer.name, fileName, subagents: head.subagents, backup: head.backup_refreshed } };
  });
  if (!answer.found) {
    const reasons = [...answer.reasons, ...answer.notHere];
    return { reasons: reasons.length ? reasons : ["Not on your Matrx 2 computers."] };
  }
  return {
    step: {
      kind: "this_computer",
      savedPath: `${answer.value.fileName}, from ${answer.value.name}`,
      subagentStreams: answer.value.subagents,
      backupNote: backupNoteFor(answer.value.backup),
    },
  };
}

export async function readRawTranscriptSources(
  dispatch: AppDispatch,
  conversationId: string,
  organizationId: string | null,
): Promise<RawTranscriptSource[]> {
  const result = await dispatch(
    callApi({
      path: "/coding-sessions/raw-transcripts",
      method: "GET",
      queryParams: { conversation_id: conversationId },
      // The conversation's OWN organization, exactly as the reply composer
      // asks: never whichever organization the header happens to show.
      scopeOverrides: organizationId ? { organization_id: organizationId } : undefined,
    }),
  );
  if (result.error) {
    throw new Error(result.error.message || "Couldn't list transcripts");
  }
  const data = result.data as components["schemas"]["RawTranscriptSources"] | undefined;
  return data?.sources ?? [];
}

function saveBlob(blob: Blob, fileName: string): void {
  saveFile(fileName, blob, blob.type);
}

/** "<Place>: why" — unless the sentence already names that place. Pure. */
function place(label: string, why: string): string {
  const named = why.toLowerCase().startsWith(label.toLowerCase()) || (label === "Cloud backup" && /^no cloud backup/i.test(why));
  return named ? why : `${label}: ${why}`;
}

/** One source, resolved through the three steps (Matrx 2, Matrx Local, cloud backup). Never throws for a "no". */
export async function fullDownloadOne(
  source: RawTranscriptSource,
  organizationId: string | null,
): Promise<FullDownloadResult> {
  const reasons: string[] = [];
  const base = { provider: source.provider, providerSessionId: source.provider_session_id };

  const relayProvider = source.provider === "claude_code" ? "claude" : source.provider === "codex" ? "codex" : null;
  if (source.native_session_id && relayProvider) {
    const fromMatrx2 = await fromMatrx2Computer(relayProvider, source.native_session_id);
    if ("step" in fromMatrx2) return { ...base, step: fromMatrx2.step };
    reasons.push(`Matrx 2: ${fromMatrx2.reasons.join(" ")}`);
  } else {
    reasons.push("Matrx 2: this chat's file name is not known, so no computer can be asked.");
  }

  if (source.native_session_id) {
    try {
      const reply = await callMatrxLocal<LocalFullDownloadReply>(
        "coding_session.full_download",
        {
          provider: source.provider,
          native_session_id: source.native_session_id,
          provider_session_id: source.provider_session_id,
          transcript_path: source.transcript_path ?? null,
          backup: source.backup_enabled,
        },
        THIS_COMPUTER_TIMEOUT_MS,
      );
      if (reply.found && reply.saved_path) {
        const backupNote = reply.backup
          ? reply.backup.backed_up
            ? "The cloud backup was refreshed too."
            : `The cloud backup was not refreshed: ${reply.backup.detail ?? "unknown reason"}`
          : null;
        return {
          ...base,
          step: {
            kind: "this_computer",
            savedPath: reply.saved_path,
            subagentStreams: reply.subagent_streams ?? 0,
            backupNote,
          },
        };
      }
      reasons.push(place("Matrx Local", reply.detail ?? "not on this computer."));
    } catch (error) {
      reasons.push(place("Matrx Local", error instanceof Error ? error.message : String(error)));
    }
  } else {
    reasons.push("Matrx Local: file name unknown on this computer.");
  }

  if (source.backup_available && source.backup_file_id) {
    try {
      // The backup lives in the session's organization, which is the
      // conversation's; name it so the download is admitted there.
      const { blob, filename } = await downloadFile(
        source.backup_file_id,
        {},
        organizationId ? { organizationId } : {},
      );
      const fileName =
        filename || `${source.provider}-${source.native_session_id ?? "session"}.jsonl.gz`;
      saveBlob(blob, fileName);
      return {
        ...base,
        step: { kind: "cloud_backup", fileName, thisComputer: reasons.join(" ") },
      };
    } catch (error) {
      reasons.push(`Cloud backup: the download failed (${error instanceof Error ? error.message : String(error)}).`);
      return { ...base, step: { kind: "not_available", reasons } };
    }
  }
  reasons.push(place("Cloud backup", source.backup_sentence));
  return { ...base, step: { kind: "not_available", reasons } };
}
