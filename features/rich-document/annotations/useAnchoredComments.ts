"use client";

// features/rich-document/annotations/useAnchoredComments.ts — one open Doc's or Sheet's threads (C9) and every
// action on them. Reads once, re-reads on another person's change to platform.comments for this record (row
// security gates delivery; same binding Spaces uses) and after each own write. A failed write throws a plain
// sentence; the composer keeps the text. Mentions notify through cmt_mention_notify with a link back to the thread.

import { defineChannelNamespace } from "@ai-matrx/data/realtime";
import { useChannel } from "@ai-matrx/data/realtime/react";
import { useEffect, useRef, useState } from "react";

import { toast } from "@/lib/toast";

import { humanError } from "./errors";

import {
  addAnchoredComment,
  deleteComment,
  editComment,
  listAnchoredThreads,
  mentionedUserIds,
  notifyMentions,
  resolveComment,
  type AnchoredThread,
} from "./anchored-comments";

const officeComments = defineChannelNamespace({
  namespace: "office-comments",
  parts: ["recordId"],
  description: "One open Doc or Sheet: its comment threads (platform.comments changes).",
});

export interface AnchoredComments {
  threads: AnchoredThread[];
  status: "loading" | "ready" | "error";
  /** The sentence for a failed read (status "error"), and whether its remedy is signing in again. */
  error: { message: string; signedOut: boolean } | null;
  reload: () => void;
  post: (body: string, opts: { anchor?: { anchorId: string; quote: string } | null; parentId?: string | null }) => Promise<string>;
  edit: (id: string, body: string, base: { body: string; version: number | null }) => Promise<void>;
  remove: (id: string) => Promise<void>;
  resolve: (id: string, resolved: boolean) => Promise<void>;
}

export function useAnchoredComments(token: string, id: string, href: string, enabled = true): AnchoredComments {
  const [threads, setThreads] = useState<AnchoredThread[]>([]);
  const [status, setStatus] = useState<AnchoredComments["status"]>("loading");
  const [error, setError] = useState<AnchoredComments["error"]>(null);
  const seq = useRef(0);

  const reload = () => {
    const mine = ++seq.current;
    void listAnchoredThreads(token, id, () => mine !== seq.current).then(
      (t) => {
        if (mine !== seq.current) return;
        setThreads(t);
        setError(null);
        setStatus("ready");
      },
      (e: unknown) => {
        if (mine !== seq.current) return;
        // The sentence reaches the rail (a signed-out tab is told to sign in), never only the console.
        const h = humanError("loading the comments", e);
        setError({ message: h.message, signedOut: h.signedOut });
        setStatus("error");
      },
    );
  };

  useEffect(() => {
    if (!enabled) return;
    reload();
    return () => {
      seq.current++;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- read once per record
  }, [token, id, enabled]);

  useChannel(
    enabled
      ? {
          topic: officeComments.topic({ recordId: id }),
          postgresChanges: [
            {
              event: "*",
              schema: "platform",
              table: "comments",
              filter: `entity_id=eq.${id}`,
              rowId: (row) => (typeof row.id === "string" ? row.id : undefined),
              onChange: () => reload(),
            },
          ],
          onBackfill: () => reload(),
        }
      : null,
  );

  const post: AnchoredComments["post"] = async (body, opts) => {
    const threadId = await addAnchoredComment({ token, id, body, anchor: opts.anchor ?? null, parentId: opts.parentId ?? null, requestId: crypto.randomUUID() });
    reload();
    const people = mentionedUserIds(body);
    if (people.length) {
      const root = opts.parentId ?? threadId;
      void notifyMentions(threadId, people, `${href}?comment=${root}`).catch((e: unknown) =>
        toast.error(e instanceof Error ? e.message : "We couldn't tell the people you mentioned."),
      );
    }
    return threadId;
  };

  return {
    threads,
    status,
    error,
    reload,
    post,
    edit: async (commentId, body, base) => {
      await editComment({ token, id, title: "", body: "", contentVersion: 0, href }, commentId, body, base, true);
      reload();
    },
    remove: async (commentId) => {
      await deleteComment(commentId);
      reload();
    },
    resolve: async (commentId, resolved) => {
      await resolveComment(commentId, resolved);
      reload();
    },
  };
}
