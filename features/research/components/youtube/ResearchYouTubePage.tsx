"use client";

import { SegmentedControl } from "@ai-matrx/design-system/controls";
import { useEffect, useRef, useState } from "react";
import { Brain, Library, LoaderCircle, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ReadFailure } from "@ai-matrx/design-system";
import { useAppDispatch } from "@/lib/redux/hooks";
import { removeRequest } from "@ai-matrx/chat/agents/redux/execution-system/active-requests/active-requests.slice";
import { toast } from "@/lib/toast";
import { runWithConcurrency } from "@ai-matrx/kit/concurrency";
import { YouTubeDiscovery } from "@/features/marketing/discovery/youtube/YouTubeDiscovery";
import {
  getYouTubeLibraryVideo,
  streamYouTubeVideoAnalysis,
} from "@/features/marketing/discovery/youtube/service";
import { enumUrlCodec, useUrlState } from "@ai-matrx/kit/url-state";
import { useTopicId } from "../../context/ResearchContext";
import { useOpenLiveRunWindow } from "@/features/overlays/definitions/liveRunWindow.overlay";
import { useResearchKeywords } from "../../hooks/useResearchState";
import { TopicYouTubeLibrary } from "./TopicYouTubeLibrary";
import { loadTopicVideoLibrary, type RankedTopicVideo } from "./topicVideoLibrary";

/** Video analyses streamed at once; a large selection queues behind this. */
const ANALYSIS_CONCURRENCY = 3;

export default function ResearchYouTubePage() {
  const dispatch = useAppDispatch();
  const openLiveRun = useOpenLiveRunWindow();
  const topicId = useTopicId();
  const keywords = useResearchKeywords(topicId);
  // The topic's own videos are the page; Discover is the way to add more.
  const [view, setView] = useUrlState("view", enumUrlCodec(["library", "discover"] as const, "library"));
  const [videos, setVideos] = useState<RankedTopicVideo[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [libraryError, setLibraryError] = useState<unknown>(null);
  const [batchProgress, setBatchProgress] = useState<string | null>(null);
  /** Adopted `activeRequests` rows for the bounded batch. */
  const adoptedRequestIdsRef = useRef(new Set<string>());
  /** In-flight stream controllers — each fetch and adopter watchdog share the
   * same object. All are aborted on unmount so orphaned streams never keep
   * draining into reaped rows (events on a missing row are silently dropped; see
   * common-docs/systems/architecture/execution-runtime/LIVE-RUN-RETENTION.md seam #3). */
  const streamAbortControllersRef = useRef(new Set<AbortController>());

  useEffect(
    () => () => {
      // Stop the client fetch FIRST (server-side processing continues and the
      // saved records recover it), then reap the adopted row.
      for (const controller of streamAbortControllersRef.current) {
        controller.abort();
      }
      streamAbortControllersRef.current.clear();
      for (const requestId of adoptedRequestIdsRef.current) {
        dispatch(removeRequest(requestId));
      }
      adoptedRequestIdsRef.current.clear();
    },
    [dispatch],
  );

  const loadLibrary = async () => {
    setLoading(true);
    try {
      setVideos(await loadTopicVideoLibrary(topicId));
      setLibraryError(null);
    } catch (caught) {
      setLibraryError(caught ?? true);
    } finally {
      setLoading(false);
    }
  };

  // Loaded once per topic, whichever view opens first, so the library count
  // shows on the switch even from Discover.
  useEffect(() => {
    let active = true;
    loadTopicVideoLibrary(topicId)
      .then((result) => {
        if (!active) return;
        setVideos(result);
        setLibraryError(null);
      })
      .catch((caught: unknown) => {
        if (active) setLibraryError(caught ?? true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [topicId]);

  const toggle = (videoId: string) => {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(videoId)) next.delete(videoId);
      else next.add(videoId);
      return next;
    });
  };

  const [analyzing, setAnalyzing] = useState<Set<string>>(new Set());
  // Derived, never its own state: two overlapping Analyze clicks each add and
  // remove their own ids, so neither can switch the other's progress off.
  const processing = analyzing.size > 0;

  const processVideos = async (videoIds: string[]) => {
    if (videoIds.length === 0) return;
    setAnalyzing((current) => new Set([...current, ...videoIds]));
    // A single analysis streams into the floating live run window (never a
    // spinner while AI works); a batch keeps its progress button instead of
    // stacking one window per video.
    const single = videoIds.length === 1 ? videoIds[0] : null;
    const singleTitle = single
      ? (videos.find((entry) => entry.video.youtube_video_id === single)?.video.title ?? "video")
      : null;
    const runWindow = single
      ? openLiveRun({ instanceId: `research-video-${single}`, label: `Analyzing ${singleTitle}`, pending: true })
      : null;
    if (!single) setBatchProgress(`Connecting to ${videoIds.length} videos…`);
    try {
      let completed = 0;
      const result = await runWithConcurrency(
        videoIds,
        ANALYSIS_CONCURRENCY,
        async (videoId) => {
          const abortController = new AbortController();
          streamAbortControllersRef.current.add(abortController);
          let adoptedRequestId: string | null = null;
          try {
            await streamYouTubeVideoAnalysis(dispatch, videoId, false, {
              signal: abortController.signal,
              abortController,
              onAdopted: ({ requestId }) => {
                adoptedRequestId = requestId;
                if (runWindow) {
                  // The window owns this run's rows from here; they outlive the page.
                  runWindow.update({ requestId, pending: false });
                } else {
                  adoptedRequestIdsRef.current.add(requestId);
                }
              },
              onEvent: (event) => {
                if (!runWindow && event.event === "info" && event.data.user_message) {
                  setBatchProgress(
                    `${completed}/${videoIds.length} finished · ${event.data.user_message}`,
                  );
                }
              },
            });
            const updated = await getYouTubeLibraryVideo(videoId);
            setVideos((current) =>
              current.map((entry) =>
                entry.video.youtube_video_id === videoId
                  ? { ...entry, video: { ...updated, topic_source_id: entry.video.topic_source_id, is_in_topic: true } }
                  : entry,
              ),
            );
          } catch (caught) {
            runWindow?.update({
              pending: false,
              failure: caught instanceof Error ? caught.message : "The analysis could not finish.",
            });
            throw caught;
          } finally {
            completed += 1;
            setAnalyzing((current) => {
              const next = new Set(current);
              next.delete(videoId);
              return next;
            });
            if (!runWindow) setBatchProgress(`${completed}/${videoIds.length} finished`);
            streamAbortControllersRef.current.delete(abortController);
            if (adoptedRequestId && !runWindow) {
              adoptedRequestIdsRef.current.delete(adoptedRequestId);
              dispatch(removeRequest(adoptedRequestId));
            }
          }
        },
      );
      if (result.failed > 0) {
        toast.error(
          `Completed ${result.succeeded} of ${videoIds.length} analyses; ${result.failed} failed.`,
        );
      } else {
        toast.success(
          `Completed ${videoIds.length} video ${videoIds.length === 1 ? "analysis" : "analyses"}.`,
        );
        setSelected(new Set());
      }
    } finally {
      if (!runWindow) setBatchProgress(null);
    }
  };

  return (
    <div className="min-h-full bg-background">
      <div className="sticky top-0 z-20 border-b border-border/60 bg-background/90 px-4 py-2 backdrop-blur-xl sm:px-6">
        <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-3">
          <SegmentedControl
            aria-label="Research view"
            value={view}
            onValueChange={(next) => setView(next)}
            data={[
              {
                value: "library",
                label: (
                  <span className="inline-flex items-center gap-1.5">
                    <Library className="size-3.5" />Topic videos
                  </span>
                ),
              },
              { value: "discover", label: <span className="inline-flex items-center gap-1.5"><Search className="size-3.5" />Find more</span> },
            ]}
          />
          {view === "library" && selected.size > 0 && (
            <Button
              icon={processing ? <LoaderCircle className="animate-spin" /> : <Brain />}
              variant="primary"
              type="button"
              onClick={() => void processVideos([...selected])}
              disabled={processing}
            >
              {processing
                ? (batchProgress ?? "Analyzing selected videos…")
                : `Analyze ${selected.size} selected`}
            </Button>
          )}
        </div>
      </div>

      {view === "discover" ? (
        <YouTubeDiscovery
          topicId={topicId}
          suggestedQueries={(keywords.data ?? []).map((keyword) => keyword.keyword)}
          onVideosAdded={() => void loadLibrary()}
        />
      ) : loading ? (
        <div className="grid min-h-64 place-items-center text-muted-foreground">
          <LoaderCircle className="h-6 w-6 animate-spin" />
        </div>
      ) : libraryError != null && videos.length === 0 ? (
        <div className="mx-auto max-w-3xl px-4 py-10">
          <ReadFailure
            error={libraryError}
            what="this topic's videos"
            onRetry={() => void loadLibrary()}
          />
        </div>
      ) : videos.length === 0 ? (
        <div className="mx-auto max-w-xl px-4 py-16 text-center">
          <Library className="mx-auto h-8 w-8 text-muted-foreground" />
          <h2 className="mt-4 font-semibold">No videos in this topic yet</h2>
          <Button variant="primary" type="button" onClick={() => setView("discover")} className="mt-5">
            Find videos
          </Button>
        </div>
      ) : (
        <TopicYouTubeLibrary
          videos={videos}
          selected={selected}
          onToggle={toggle}
          analyzing={analyzing}
          onAnalyze={(videoId) => void processVideos([videoId])}
        />
      )}
    </div>
  );
}
