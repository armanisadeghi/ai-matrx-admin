// features/education/media/audio/useAudioStudyCreate.ts
//
// Owns the "start a new audio study" action: build the podcast request, create
// the durable run row (pc_studio_runs — the recovery spine), create the
// education artifact row (study_media), hand the request to the run page via
// the podcast pendingStart channel, and navigate. The run page (AudioStudyDetail
// → useStudioRun) picks up the pending request and streams — reusing the entire
// podcast generation + recovery machinery unchanged.

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "@/lib/toast";
import { studioRunsService } from "@/features/podcasts/studio/runs/service";
import { stashPendingStart } from "@/features/podcasts/studio/runs/pendingStart";
import { studyMediaService } from "../service";
import { buildAudioRequest } from "./audioBrief";
import { weakAreaNoteForDecks } from "./resolveAudioSource";
import type { EduAudioFormat } from "../types";
import type { PreparedMaterial } from "@/features/education/create/groundedMaterial";
import { linkMadeFrom, madeFromConfig } from "@/features/education/create/madeFrom";
import { ensureOrgId } from "@/lib/organizations/ensureOrgId";

export interface AudioStudyCreateInput {
  format: EduAudioFormat;
  /** The picks, read through the Source input (`useEducationSources().prepare()`). */
  material: PreparedMaterial;
  hostCount?: number;
  adaptive?: boolean;
  language?: string;
  /** Awaited just before the first save (the tab-bound run's `saving`). */
  beforeSave?: () => Promise<void>;
}

const FORMAT_LABEL: Record<EduAudioFormat, string> = {
  overview: "Audio overview",
  debate: "Debate",
  panel: "Panel",
  review: "Audio review",
};

export function useAudioStudyCreate() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  // Returns true only when the run + artifact were created and we navigated —
  // the caller meters the entitlement on that success (a failed/early-returned
  // generation returns false and never burns quota).
  async function create(input: AudioStudyCreateInput): Promise<boolean> {
    if (busy) return false;
    setBusy(true);
    try {
      // 1. The material was read by the Source input; decks add the adaptive note.
      const resolved = input.material;
      if (resolved.notes.length) toast.info(resolved.notes.join(" "));
      const weakAreaNote =
        input.adaptive && resolved.deckIds.length > 0 ? await weakAreaNoteForDecks(resolved.deckIds) : null;

      // 2. Build the podcast request for this format + adaptivity.
      const request = buildAudioRequest({
        format: input.format,
        // The server reads the Sources (once) and links each one to the episode;
        // a topic alone is what the person typed. Audio stays cited per Source.
        material:
          resolved.fromSources && resolved.chosen
            ? { kind: "sources", sourceSet: resolved.chosen }
            : { kind: "topic", topic: resolved.plainContent },
        hostCount: input.hostCount,
        language: input.language,
        weakAreaNote,
      });

      const title = `${FORMAT_LABEL[input.format]} · ${resolved.source.title}`;

      // 3. Create the durable run row (the recovery spine). Past this point the
      //    save may land even if this page never hears back.
      await input.beforeSave?.();
      const run = await studioRunsService.createRun({
        status: "running",
        input_data_type: request.input_data_type,
        podcast_type: request.podcast_type,
        request,
        title,
      });

      // 4. Create the education artifact row (points at the run).
      const media = await studyMediaService.create({
        mediaKind: "audio",
        title,
        source: resolved.source,
        config: {
          format: input.format,
          hostCount: request.host_count ?? 2,
          adaptive: Boolean(input.adaptive),
          language: request.language,
          ...madeFromConfig(resolved),
        },
        trust: resolved.trust,
        audioFormat: input.format,
        runId: run.id,
        status: "generating",
      });
      if (media.error || !media.data) {
        toast.error(media.error ?? "Couldn't create the audio study");
        return false;
      }

      // 5. Hand the request to the run page + navigate. A refresh clears the
      //    pending map → the durable run replays from the DB instead of
      //    re-generating (no duplicate work).
      await linkMadeFrom(
        resolved,
        {
          resourceType: "study_media",
          artifactId: media.data.id,
          targetKind: "audio",
          title,
          href: `/education/audio-study/${media.data.id}`,
        },
        await ensureOrgId(undefined),
      );
      stashPendingStart(run.id, request);
      router.push(`/education/audio-study/${media.data.id}`);
      return true;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't start generation");
      return false;
    } finally {
      setBusy(false);
    }
  }

  return { create, busy };
}
