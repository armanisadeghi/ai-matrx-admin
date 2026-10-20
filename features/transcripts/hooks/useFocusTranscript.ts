"use client";

/**
 * useFocusTranscript — `/transcripts/processor?focus=<id>`, the canonical route for ONE transcript.
 *
 * The sidebar list is scoped "mine", so the id is matched there first and otherwise read by id (RLS
 * decides) and selected; a clean "not available" is said out loud. One read per id: a read that is
 * in flight is NEVER cancelled by a re-render (the list read landing mid-flight re-renders the
 * layout, and a cleanup-cancelled read whose retry is blocked by the one-attempt guard drops the
 * answer, leaving the page on the first transcript in the list). Only unmount discards it.
 */

import { useEffect, useRef } from "react";
import { useTranscripts } from "./useTranscripts";
import { fetchTranscriptById } from "../service/transcriptsService";
import { useToastManager } from "@/hooks/useToastManager";

export function useFocusTranscript(focusId: string | null): void {
  const { isLoading, activeTranscript, transcripts, setActiveTranscript } = useTranscripts();
  const toast = useToastManager("transcripts");
  const attempted = useRef<string | null>(null);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (!focusId) return;
    if (activeTranscript?.id === focusId) return;

    const inList = transcripts.find((t) => t.id === focusId);
    if (inList) {
      setActiveTranscript(inList);
      return;
    }
    if (isLoading) return;
    if (attempted.current === focusId) return;
    attempted.current = focusId;

    void (async () => {
      try {
        const target = await fetchTranscriptById(focusId);
        if (!mounted.current) return;
        if (target) setActiveTranscript(target);
        else {
          toast.error(
            "That transcript isn't available — it may have been deleted, or it isn't shared with you.",
          );
        }
      } catch (err) {
        if (!mounted.current) return;
        // A THROWN error is transient: release the guard so a later render retries. A clean `null`
        // is a real answer and must not retry.
        attempted.current = null;
        console.error("Failed to open the linked transcript", err);
        toast.error("Couldn't open that transcript.");
      }
    })();
  }, [focusId, transcripts, activeTranscript?.id, setActiveTranscript, isLoading, toast]);
}
