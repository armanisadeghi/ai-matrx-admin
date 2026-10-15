"use client";

import { useEffect, useState } from "react";
import { isOrganizationRequiredError } from "@ai-matrx/auth/organizations";
import type { components } from "@ai-matrx/api/types";
import type { PodcastSpeaker } from "./types";
import type { VoiceProvider } from "./voiceCatalog";
import { castPreviewEndpoint } from "@ai-matrx/api/publish";
import { serverApi } from "@/lib/api/server-api";

type PodcastCastPreviewWire = components["schemas"]["PodcastCastPreview"];

export interface PodcastCastPreview {
  hostCount: number;
  provider: VoiceProvider;
  speakers: PodcastSpeaker[];
}

function normalizePreview(wire: PodcastCastPreviewWire): PodcastCastPreview {
  return {
    hostCount: wire.host_count,
    provider: wire.provider,
    speakers: wire.speakers.map((speaker, index) => {
      if (!speaker.voice) {
        throw new Error(`Podcast cast speaker ${index + 1} has no voice.`);
      }
      if (
        speaker.gender !== "male" &&
        speaker.gender !== "female" &&
        speaker.gender !== "neutral"
      ) {
        throw new Error(`Podcast cast speaker ${index + 1} has an invalid gender.`);
      }
      return {
        name: speaker.name,
        voice: speaker.voice,
        gender: speaker.gender,
      };
    }),
  };
}

export function usePodcastCastPreview(
  hostCount: number,
  showId: string | null,
) {
  const [reloadKey, setReloadKey] = useState(0);
  const requestKey = `${hostCount}:${showId ?? ""}:${reloadKey}`;
  const [result, setResult] = useState<{
    key: string;
    preview: PodcastCastPreview | null;
    error: string | null;
    orgRequired: boolean;
  }>({ key: "", preview: null, error: null, orgRequired: false });

  useEffect(() => {
    const controller = new AbortController();

    void castPreviewEndpoint(serverApi, { query: { host_count: hostCount, show_id: showId } }, { signal: controller.signal })
      .then((data) =>
        setResult({
          key: requestKey,
          preview: normalizePreview(data),
          error: null,
          orgRequired: false,
        }),
      )
      .catch((cause: unknown) => {
        if (controller.signal.aborted) return;
        if (isOrganizationRequiredError(cause)) {
          setResult({
            key: requestKey,
            preview: null,
            error: null,
            orgRequired: true,
          });
          return;
        }
        setResult({
          key: requestKey,
          preview: null,
          orgRequired: false,
          error:
            cause instanceof Error
              ? cause.message
              : "Couldn't load the server's cast policy.",
        });
      });

    return () => controller.abort();
  }, [hostCount, requestKey, showId]);

  const current = result.key === requestKey ? result : null;

  return {
    preview: current?.preview ?? null,
    loading: current === null,
    error: current?.error ?? null,
    orgRequired: current?.orgRequired ?? false,
    reload: () => setReloadKey((key) => key + 1),
  };
}
