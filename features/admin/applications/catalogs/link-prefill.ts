// features/admin/applications/catalogs/link-prefill.ts
//
// Catalogs "Fill from link" for kinds that are not models the discovery view promotes (voices, voice
// model files, presets, and every other catalog kind): ONE file at a link, read by the discovery engine
//   POST {base}/ai-catalog/discover/probe  { link }
// (aidream local_models/direct.py probe_link: Hugging Face files pinned to a commit with their LFS
// sha256, Civitai files with Civitai's sha256, any other https file checked server-side), then mapped
// to an entry prefill for the kind. The editor validates the payload and says what is still missing.

import { postJsonAsUser } from "@/lib/api/post-json-as-user";
import type { EntryPrefill } from "@/features/admin/applications/catalogs/types";

/** The probe answer (aidream probe_link). */
export interface LinkFile {
  url: string;
  filename: string | null;
  size_bytes: number | null;
  sha256: string | null;
  sha_source: string;
  source: "huggingface" | "civitai" | "direct_url";
  repo?: string | null;
  revision?: string | null;
}

/** The catalog kinds the discovery view adds as models; every other kind fills from one file at a link. */
export const MODEL_KINDS: ReadonlySet<string> = new Set(["llm_model", "whisper_model", "image_gen_model", "video_gen_model", "lora"]);

export const PROBE_PATH = "/ai-catalog/discover/probe";

function stemOf(filename: string): string {
  const base = filename.split("/").pop() ?? filename;
  const dot = base.lastIndexOf(".");
  return dot > 0 ? base.slice(0, dot) : base;
}

function slug(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "entry";
}

function titleOf(stem: string): string {
  return stem.replace(/[_-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()).trim();
}

/** Kokoro's voice naming: `<language letter><f|m>_<name>` (af_heart = American English, female). */
const KOKORO_VOICE = /^([a-z])([fm])_(.+)$/;

/** A file at a link → the entry prefill for `kind`. Pure (unit-tested). */
export function prefillFromLink(kind: string, file: LinkFile, link: string): EntryPrefill {
  const filename = file.filename || link.split("/").pop() || link;
  const stem = stemOf(filename);
  let payload: Record<string, unknown>;
  if (kind === "tts_model_file") {
    const lower = filename.toLowerCase();
    payload = { filename, role: lower.endsWith(".onnx") ? "onnx_model" : lower.endsWith(".bin") ? "voices_bin" : "" };
  } else if (kind === "tts_voice") {
    const m = KOKORO_VOICE.exec(stem);
    payload = m
      ? { voice_id: stem, name: titleOf(m[3]!), lang_code: m[1], gender: m[2] === "f" ? "female" : "male" }
      : { voice_id: stem, name: titleOf(stem) };
  } else if (kind === "workflow_preset") {
    const model = file.source === "civitai" && file.repo && file.revision ? `${file.repo}@${file.revision}` : file.repo ?? null;
    payload = { preset_id: slug(stem), name: titleOf(stem), ...(model ? { suggested_model_id: model } : {}) };
  } else {
    payload = { name: titleOf(stem), filename };
  }
  const shaWords = file.sha256 ? `sha256 from ${file.sha_source === "civitai_api" ? "Civitai" : "Hugging Face"}` : "sha256 recorded by the first download";
  return {
    kind,
    key: slug(stem),
    payload,
    artifact_url: file.url,
    artifact_sha256: file.sha256,
    artifact_size_bytes: file.size_bytes,
    notes: `Filled from ${link} (${shaWords}).`,
  };
}

export async function readLinkFile(params: {
  baseUrl: string;
  accessToken: string;
  organizationId: string;
  link: string;
  signal?: AbortSignal;
}): Promise<LinkFile> {
  return postJsonAsUser<LinkFile>({
    baseUrl: params.baseUrl,
    accessToken: params.accessToken,
    organizationId: params.organizationId,
    path: PROBE_PATH,
    body: { link: params.link },
    signal: params.signal,
  });
}
