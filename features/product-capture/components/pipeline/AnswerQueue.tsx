"use client";

/**
 * AnswerQueue — the focused mobile Q&A surface: one question at a time,
 * image-first (the item's featured photo makes identification instant),
 * core info + a link to the full item, then the fastest possible answer:
 * choice chips / Yes-No / text with a voice option (recorded, transcribed,
 * dropped into the answer). Skip sends the question to the BACK of the
 * queue; "Not a quick answer" defers it out of this flow entirely
 * (physical-testing questions route elsewhere).
 */

import { ReadFailure } from "@ai-matrx/design-system";
import { StaleDataNotice } from "@ai-matrx/design-system";
import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Camera,
  Check,
  CheckCircle2,
  ExternalLink,
  Loader2,
  RotateCw,
  SkipForward,
  Wrench,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { CaptureThumb } from "@/features/media-capture/components/CaptureThumb";
import { transcribeAudioFile } from "@/features/audio/services/speechApi";
import { toAudioFile } from "@ai-matrx/browser-audio/core";
import { useAppSelector } from "@/lib/redux/hooks";
import { toast } from "@/lib/toast";

import { VoiceNoteButton } from "../VoiceNoteButton";
import {
  answerQuestion,
  deferQuestion,
  listItemsByIds,
  listOpenQuestions,
  skipQuestion,
  type PipelineItem,
  type PipelineQuestion,
} from "../../pipeline-service";
import { SurfaceRuntimeProvider } from "@ai-matrx/chat/surfaces/runtime/SurfaceRuntimeContext";
import { refuseSurfaceWrite } from "@ai-matrx/chat/surfaces/runtime/surface-writeback";
import {
  PRODUCT_CAPTURE_ANSWER_SURFACE_NAME,
  createProductCaptureAnswerScope,
} from "@/features/surfaces/manifests/product-capture-answer.manifest";
import { listFilesForItems } from "../../service";
import { STAGE_LABELS } from "../../pipeline-types";
import { OrganizationTag } from "@/features/commerce-review/components/OrganizationTag";

interface QueueEntry {
  question: PipelineQuestion;
  item: PipelineItem;
  thumbFileId: string | null;
}

export function AnswerQueue() {
  // Reads span EVERY organization the person can access (access-by-person
  // law) — never the header's selected organization. Items name their own org.
  const organizationId: string | null = null;
  const [queue, setQueue] = useState<QueueEntry[] | null>(null);
  const [answeredCount, setAnsweredCount] = useState(0);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  // The queue read's failure — never "No open questions" over it.
  const [loadError, setLoadError] = useState<unknown>(null);

  const load = useCallback(async () => {
    try {
      const open = await listOpenQuestions(organizationId);
      const itemIds = [...new Set(open.map((q) => q.itemId))];
      const [itemsById, filesByItem] = await Promise.all([
        listItemsByIds(itemIds),
        listFilesForItems(itemIds),
      ]);
      setQueue(
        open.flatMap((question) => {
          const item = itemsById.get(question.itemId);
          if (!item) return [];
          const photos = (filesByItem.get(item.id) ?? []).filter(
            (f) => f.kind === "photo",
          );
          return [
            {
              question,
              item,
              thumbFileId: item.featuredFileId ?? photos[0]?.fileId ?? null,
            },
          ];
        }),
      );
      setAnsweredCount(0);
      setLoadError(null);
    } catch (err) {
      console.error("[product-pipeline] answer queue load failed", err);
      setLoadError(err ?? true);
    }
  }, [organizationId]);

  useEffect(() => {
    const timer = setTimeout(() => void load(), 0);
    return () => clearTimeout(timer);
  }, [organizationId, load]);

  const current = queue?.[0] ?? null;
  const total = (queue?.length ?? 0) + answeredCount;

  const advance = useCallback(
    (opts: { requeue?: QueueEntry; answered?: boolean }) => {
      setDraft("");
      setQueue((prev) => {
        if (!prev || prev.length === 0) return prev;
        const rest = prev.slice(1);
        return opts.requeue ? [...rest, opts.requeue] : rest;
      });
      if (opts.answered) setAnsweredCount((n) => n + 1);
    },
    [],
  );

  // One door for the buttons and the agent's answer_question write: throws on failure.
  const answerNow = async (entry: QueueEntry, value: string) => {
    setBusy(true);
    try {
      await answerQuestion(entry.question, value.trim());
      advance({ answered: true });
    } finally {
      setBusy(false);
    }
  };

  const submitAnswer = async (value: string) => {
    if (!current || !value.trim()) return;
    try {
      await answerNow(current, value);
    } catch (err) {
      console.error("[product-pipeline] answer failed", err);
      toast.error("Could not save the answer.");
    }
  };

  const skip = useCallback(async () => {
    if (!current) return;
    // Skip sends a question to the BACK of the queue; with one question the
    // back is the front, and a tap that changes nothing has to say so.
    if ((queue?.length ?? 0) <= 1) {
      toast.info("This is the only open question — skip has nowhere to send it.");
      return;
    }
    setBusy(true);
    try {
      const updated = await skipQuestion(current.question);
      advance({ requeue: { ...current, question: updated } });
    } catch (err) {
      console.error("[product-pipeline] skip failed", err);
      toast.error("Could not skip the question.");
    } finally {
      setBusy(false);
    }
  }, [current, advance, queue]);

  const defer = useCallback(async () => {
    if (!current) return;
    setBusy(true);
    try {
      await deferQuestion(current.question, "Not a quick answer");
      advance({});
      toast.info("Routed out of the quick-answer flow.");
    } catch (err) {
      console.error("[product-pipeline] defer failed", err);
      toast.error("Could not defer the question.");
    } finally {
      setBusy(false);
    }
  }, [current, advance]);

  const onVoiceAnswer = useCallback(
    (blob: Blob) => {
      setTranscribing(true);
      void (async () => {
        try {
          const file = toAudioFile(blob, { prefix: `answer-${Date.now()}` });
          const result = await transcribeAudioFile(file);
          const text = result.text.trim();
          if (!text) {
            toast.info("No speech detected — try again.");
            return;
          }
          setDraft((prev) => (prev ? `${prev} ${text}` : text));
        } catch (err) {
          console.error("[product-pipeline] voice answer failed", err);
          toast.error("Could not transcribe the recording.");
        } finally {
          setTranscribing(false);
        }
      })();
    },
    [],
  );

  // Surface `matrx-user/product-capture-answer`: the question in view; answers through the buttons' door.
  const readAnswer = (value: unknown): string => {
    if (!current) refuseSurfaceWrite("No question is in view.");
    if (typeof value !== "string" || !value.trim()) refuseSurfaceWrite("The answer must be non-empty text.");
    const answer = (value as string).trim();
    const q = (current as QueueEntry).question;
    if (q.kind === "choice" && !q.options.some((o) => o.value === answer)) {
      refuseSurfaceWrite(`Pick one option value: ${q.options.map((o) => `"${o.value}"`).join(", ")}.`);
    }
    if (q.kind === "boolean" && answer !== "yes" && answer !== "no") refuseSurfaceWrite('Answer "yes" or "no".');
    return answer;
  };
  const getScope = () =>
    createProductCaptureAnswerScope({
      queue_load_status: loadError && !current ? "failed" : queue === null ? "loading" : "loaded",
      open_question_count: queue?.length,
      answered_count: answeredCount,
      question_prompt: current?.question.prompt,
      question: current
        ? {
            id: current.question.id,
            prompt: current.question.prompt,
            context: current.question.context,
            kind: current.question.kind,
            options: current.question.options,
            source: current.question.source,
            skip_count: current.question.skipCount,
            priority: current.question.priority,
            created_at: current.question.createdAt,
          }
        : undefined,
      question_subject: current
        ? {
            item_id: current.item.id,
            organization_id: current.item.organizationId,
            code: current.item.code,
            notes: current.item.notes,
            stage: current.item.stage,
            status: current.item.status,
          }
        : undefined,
      answer_draft: current ? draft : undefined,
    });
  const getWriteHandlers = () => ({
    answer_draft: {
      validate: (value: unknown) => {
        if (!current) refuseSurfaceWrite("No question is in view.");
        if (typeof value !== "string") refuseSurfaceWrite("answer_draft must be text.");
      },
      apply: (value: unknown) => {
        setDraft(value as string);
        return { summary: "The answer box is filled. Nothing is saved until the person presses Answer.", data: { answer: value } };
      },
    },
    answer_question: {
      validate: (value: unknown) => {
        readAnswer(value);
      },
      apply: async (value: unknown) => {
        const answer = readAnswer(value);
        if (busy) refuseSurfaceWrite("An answer is already being saved; try again in a moment.");
        const entry = current as QueueEntry;
        await answerNow(entry, answer);
        return {
          summary: "Saved the answer; the next question is up.",
          data: { question_id: entry.question.id, answer },
        };
      },
    },
  });
  const withSurface = (node: React.ReactNode) => (
    <SurfaceRuntimeProvider
      surfaceName={PRODUCT_CAPTURE_ANSWER_SURFACE_NAME}
      getScope={getScope}
      getWriteHandlers={getWriteHandlers}
    >
      {node}
    </SurfaceRuntimeProvider>
  );

  if (loadError && !current) {
    return withSurface(
      <ReadFailure
        error={loadError}
        what="the question queue"
        onRetry={() => void load()}
      />
    );
  }

  if (queue === null) {
    return withSurface(
      <div className="flex justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!current) {
    return withSurface(
      <div className="flex flex-col items-center gap-3 py-16 text-center">
        <CheckCircle2 className="h-10 w-10 text-primary" />
        <p className="text-base font-medium">
          {answeredCount > 0
            ? `All done — ${answeredCount} answered.`
            : "No open questions right now."}
        </p>
        <p className="text-sm text-muted-foreground">
          The agents keep working with what you gave them.
        </p>
        <Button icon={<RotateCw />} variant="outline" onClick={() => void load()}>
          Check again
        </Button>
      </div>
    );
  }

  const { question, item, thumbFileId } = current;

  return withSurface(
    <div className="mx-auto flex w-full max-w-lg flex-col gap-3 pb-safe">
      {loadError ? (
        <StaleDataNotice
          hasData
          what="the question queue"
          onRetry={() => void load()}
        />
      ) : null}
      <p className="text-center text-xs text-muted-foreground">
        Question {answeredCount + 1} of {total}
      </p>

      {/* The item, image-first */}
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <Link
          href={`/tools/product-capture/item/${item.id}`}
          className="block"
          aria-label="Open the full item"
        >
          <div className="aspect-[4/3] w-full bg-muted">
            {thumbFileId ? (
              <CaptureThumb
                fileId={thumbFileId}
                alt={item.code ?? "Item photo"}
              />
            ) : (
              <div className="flex h-full items-center justify-center">
                <Camera className="h-8 w-8 text-muted-foreground" />
              </div>
            )}
          </div>
        </Link>
        <div className="flex items-center justify-between gap-2 p-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">
              {item.code ?? "No product number"}
            </p>
            <p className="flex items-center gap-2 truncate text-xs text-muted-foreground">
              <OrganizationTag
                organizationId={item.organizationId}
                className="h-4 max-w-[110px] px-1 text-[10px]"
              />
              {STAGE_LABELS[item.stage]}
              {item.notes ? ` · ${item.notes}` : ""}
            </p>
          </div>
          <Button asChild variant="quiet" className="shrink-0">
            <Link href={`/tools/product-capture/manage?item=${item.id}`} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="mr-1 h-3.5 w-3.5" />
              Open in pipeline
            </Link>
          </Button>
        </div>
      </div>

      {/* The question */}
      <div className="rounded-xl border border-border bg-card p-4">
        <p className="text-base font-medium">{question.prompt}</p>
        {question.context && (
          <p className="mt-1 text-sm text-muted-foreground">
            {question.context}
          </p>
        )}

        <div className="mt-3 space-y-2.5">
          {question.kind === "choice" && question.options.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {question.options.map((o) => (
                <Button
                  key={o.value}
                  variant="outline"
                  className="flex-1 basis-[calc(50%-0.25rem)]"
                  disabled={busy}
                  onClick={() => void submitAnswer(o.value)}
                >
                  {o.label}
                </Button>
              ))}
            </div>
          )}
          {question.kind === "boolean" && (
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                disabled={busy}
                onClick={() => void submitAnswer("yes")}
              >
                Yes
              </Button>
              <Button
                variant="outline"
                className="flex-1"
                disabled={busy}
                onClick={() => void submitAnswer("no")}
              >
                No
              </Button>
            </div>
          )}

          <div className="flex items-center gap-2">
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={
                transcribing ? "Transcribing…" : "Type or dictate an answer…"
              }
              enterKeyHint="send"
              onKeyDown={(e) => {
                if (e.key === "Enter") void submitAnswer(draft);
              }}
              className="h-11 min-w-0 flex-1 rounded-full border border-input bg-background px-4 text-base focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <VoiceNoteButton
              onRecordingComplete={onVoiceAnswer}
              disabled={busy}
            />
          </div>

          <Button
            icon={busy ? (
              <Loader2 className="animate-spin" />
            ) : (
              <Check />
            )}
            variant="primary"
            className="w-full"
            disabled={busy || !draft.trim()}
            onClick={() => void submitAnswer(draft)}
          >
            Answer &amp; next
          </Button>
        </div>
      </div>

      {/* Queue controls */}
      <div className="flex gap-2">
        <Button
          icon={<SkipForward />}
          variant="outline"
          className="flex-1"
          disabled={busy}
          onClick={() => void skip()}
        >
          Skip for now
        </Button>
        <Button
          icon={<Wrench />}
          variant="outline"
          className="flex-1"
          disabled={busy}
          onClick={() => void defer()}
        >
          Not a quick answer
        </Button>
      </div>
    </div>
  );
}
