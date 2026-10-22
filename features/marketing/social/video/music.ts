/**
 * The music choice of a video: nothing, a bed generated from a mood and a tempo, or the person's own track. One shape for
 * the clone brief, the format form and the project page. `brief.music` is exactly `{file}` or `{bed: {mood, tempo}}`.
 */

import { MUSIC_BED_MOODS, MUSIC_BED_TEMPOS, musicBedPrompt, effectiveRequestHash, type Composition, type MusicBedMood, type MusicBedTempo } from "@ai-matrx/media/video";

import type { BriefFile } from "./clone";
import type { EstimateAnswer, JsonDoc } from "./types";

export type MusicChoice =
  | { kind: "none" }
  | { kind: "bed"; mood: MusicBedMood; tempo: MusicBedTempo }
  | { kind: "file"; file: BriefFile; name: string };

export const NO_MUSIC: MusicChoice = { kind: "none" };

export const MOOD_OPTIONS: ReadonlyArray<{ value: MusicBedMood; label: string }> = (Object.keys(MUSIC_BED_MOODS) as MusicBedMood[]).map((value) => ({
  value,
  label: value[0]!.toUpperCase() + value.slice(1),
}));

export const TEMPO_OPTIONS: ReadonlyArray<{ value: MusicBedTempo; label: string }> = (Object.keys(MUSIC_BED_TEMPOS) as MusicBedTempo[]).map((value) => ({
  value,
  label: `${value[0]!.toUpperCase()}${value.slice(1)} · ${MUSIC_BED_TEMPOS[value]} BPM`,
}));

export const DEFAULT_BED: MusicChoice = { kind: "bed", mood: "warm", tempo: "medium" };

/** `brief.music` for the server, or nothing for "no music". */
export function musicForBrief(c: MusicChoice): { bed: { mood: MusicBedMood; tempo: MusicBedTempo } } | { file: BriefFile } | undefined {
  if (c.kind === "bed") return { bed: { mood: c.mood, tempo: c.tempo } };
  if (c.kind === "file") return { file: c.file };
  return undefined;
}

/** The short name of the choice, shown live as it is picked: "Warm · medium · 96 BPM". */
export function musicName(c: MusicChoice): string {
  if (c.kind === "none") return "No music";
  if (c.kind === "file") return c.name;
  const mood = c.mood[0]!.toUpperCase() + c.mood.slice(1);
  return `${mood} · ${c.tempo} · ${MUSIC_BED_TEMPOS[c.tempo]} BPM`;
}

/** What the mood sounds like, in plain words (the first clause of the model's phrase). */
export function musicSound(c: MusicChoice): string | null {
  if (c.kind !== "bed") return null;
  return MUSIC_BED_MOODS[c.mood].replace(/^[A-Za-z]+,\s*/, "").replace(/^(.*?)\s+with\s+(.*)$/, "$1, with $2");
}

/** The bed's line in a cost summary: "Music bed", "Music bed reused", or null when the video has no bed to make. */
export function musicCostLine(est: Pick<EstimateAnswer, "lines" | "cached">): string | null {
  const line = est.lines.find((l) => l.capability === "music");
  if (line) {
    return "Music bed";
  }
  return est.cached.includes("music") ? "Music bed reused" : null;
}

/** The music a composition carries now, or none. */
export function musicOfDocument(doc: JsonDoc | null | undefined): MusicChoice {
  const media = ((doc as Composition | null | undefined)?.media ?? {}) as Composition["media"];
  const m = media.music;
  if (!m) return NO_MUSIC;
  const prompt = m.request?.prompt;
  // A generated bed keeps the request that made it after its file lands (Generate), so the request, not the source, says it is a bed.
  if (prompt) {
    for (const mood of Object.keys(MUSIC_BED_MOODS) as MusicBedMood[]) {
      for (const tempo of Object.keys(MUSIC_BED_TEMPOS) as MusicBedTempo[]) {
        if (musicBedPrompt({ mood, tempo }) === prompt && MUSIC_BED_TEMPOS[tempo] === (m.request?.params as { bpm?: number } | undefined)?.bpm) return { kind: "bed", mood, tempo };
      }
    }
    return { kind: "bed", mood: "warm", tempo: "medium" };
  }
  return { kind: "file", file: { fileId: m.source.type === "file" ? m.source.fileId : "", contentHash: m.source.type === "file" ? m.source.contentHash : "" }, name: "Your track" };
}

type SetOp = { op: "set"; path: (string | { id: string })[]; value: unknown };
type RemoveOp = { op: "remove"; path: (string | { id: string })[] };

/**
 * Patch ops that make the project's music the choice (a bed is a pending request the generator fills; a file is a library
 * track). Seconds are the video's length so far. Returns the ops plus the document they make (for the request hash).
 */
export function musicOps(doc: Composition, c: MusicChoice, seconds: number): Array<SetOp | RemoveOp> {
  const has = Boolean(doc.media.music);
  const ops: Array<SetOp | RemoveOp> = [];
  if (c.kind === "none") {
    if (!has) return [];
    if (doc.slots?.music) ops.push({ op: "remove", path: ["slots", "music"] });
    if (doc.tracks.audio.music) ops.push({ op: "remove", path: ["tracks", "audio", "music"] });
    ops.push({ op: "remove", path: ["media", "music"] });
    return ops;
  }
  const secs = Math.max(1, Math.round(seconds * 10) / 10);
  const item =
    c.kind === "bed"
      ? {
          kind: "audio",
          role: "music",
          source: { type: "pending" },
          estimatedSeconds: secs,
          request: { capability: "music", alias: "music.default", prompt: musicBedPrompt({ mood: c.mood, tempo: c.tempo }), params: { durationSeconds: secs, bpm: MUSIC_BED_TEMPOS[c.tempo], instrumental: true }, inputs: {} },
        }
      : {
          kind: "audio",
          role: "music",
          source: { type: "file", fileId: c.file.fileId, contentHash: c.file.contentHash, ...(c.file.durationSeconds ? { durationSeconds: c.file.durationSeconds } : {}) },
        };
  const clip = doc.tracks.audio.music ?? { media: "music", during: { kind: "window", window: "aroll" }, gainDb: -20, fadeInSeconds: 0.5, fadeOutSeconds: 1.5 };
  const next = { ...doc, media: { ...doc.media, music: item as never } } as Composition;
  if (c.kind === "bed") {
    const hash = effectiveRequestHash(next, "music");
    if (hash) (item as { requestHash?: string }).requestHash = hash;
  }
  ops.push({ op: "set", path: ["media", "music"], value: item });
  ops.push({ op: "set", path: ["slots", "music"], value: { source: c.kind === "bed" ? "generated" : "library", media: ["music"] } });
  ops.push({ op: "set", path: ["tracks", "audio", "music"], value: clip });
  return ops;
}

/** The video's length so far in seconds: its voice takes (made or estimated), 30 when the plan names none. */
export function videoSecondsOf(doc: Composition): number {
  let sum = 0;
  for (const m of Object.values(doc.media)) {
    if (m.role !== "take") continue;
    sum += (m.source.type === "file" ? m.source.durationSeconds : undefined) ?? m.estimatedSeconds ?? 0;
  }
  return sum > 0 ? sum : 30;
}
