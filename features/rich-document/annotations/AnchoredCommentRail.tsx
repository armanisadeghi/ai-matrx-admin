"use client";

// features/rich-document/annotations/AnchoredCommentRail.tsx — the Google-style comment rail for a Doc or a
// Sheet (C9). Open threads float beside their anchor (the passage's first line, the cell's top) and stack without
// overlapping; the active one sits exactly at its anchor and pushes the others away. A thread whose anchor left
// the content (all its text deleted, its row removed) is listed at the top as removed — never dropped. Resolved
// threads are one tab away, with Re-open. Writing is the platform's MentionComposer (`@` lists the people who
// can read the record) and each body renders through CommentBody, so a comment reads as it does everywhere.
//
// The rail is a fixed-width column whose open state is known at the first render (kept per person; open by
// default on wide screens), so threads loading or arriving never move the page; only the person's own toggle does.

import { Avatar, AvatarFallback, AvatarImage, Popover, PopoverContent, PopoverTrigger } from "@ai-matrx/design-system";
import { Button, EmptyState, SegmentedControl } from "@ai-matrx/design-system/controls";
import { Check, MessageSquare, MoreHorizontal, RotateCcw, Trash2, X } from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";

import { confirm } from "@/components/dialogs/confirm/ConfirmDialogHost";
import { cn } from "@/lib/utils";
import { toast } from "@/lib/toast";

import type { AnchoredComment, AnchoredThread } from "./anchored-comments";
import { CommentBody } from "./AnnotationPanel";
import { MentionComposer } from "./MentionComposer";
import type { AnnotationSource } from "./types";
import type { AnchoredComments } from "./useAnchoredComments";

/** A thread's anchor not seen in the content for this long after it was written is removed, not still arriving. */
const ARRIVING_MS = 15_000;
const GAP = 8;

export interface AnchoredCommentDraft {
  anchorId: string;
  quote: string;
}

export interface AnchoredCommentRailProps {
  source: AnnotationSource;
  comments: AnchoredComments;
  /** Client-Y of each anchor that is in the content and laid out (first line / cell top). */
  anchorTops: ReadonlyMap<string, number>;
  /** Every anchor id the content holds now (laid out or not). */
  present: ReadonlySet<string>;
  /** What the thread points at now ("B6"), shown above its quote; null keeps the quote alone. */
  liveLabel?: (anchorId: string) => string | null;
  /** The label of a thread whose anchor left the content ("Text removed", "Cell removed"). */
  removedLabel: string;
  activeThreadId: string | null;
  onActivate: (threadId: string | null) => void;
  draft: AnchoredCommentDraft | null;
  onDraftDone: (threadId: string | null) => void;
  onClose: () => void;
  canComment: boolean;
  className?: string;
}

function initials(name: string): string {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("") || "?";
}

const fail = (e: unknown, fallback: string) => toast.error(e instanceof Error ? e.message : fallback);

function ago(iso: string): string {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "now";
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function CommentLine({ c, thread, source, comments }: { c: AnchoredComment; thread?: AnchoredThread; source: AnnotationSource; comments: AnchoredComments }) {
  const [editing, setEditing] = useState(false);
  const [menu, setMenu] = useState(false);
  return (
    <div className="group flex flex-col gap-1">
      <div className="flex min-w-0 items-center gap-2">
        <Avatar size="sm" className="size-6 shrink-0">
          {c.author.avatarUrl ? <AvatarImage src={c.author.avatarUrl} alt="" /> : null}
          <AvatarFallback>{initials(c.author.name)}</AvatarFallback>
        </Avatar>
        <span className="min-w-0 truncate text-sm font-medium text-foreground">{c.author.name}</span>
        <span className="shrink-0 text-xs text-muted-foreground">
          {ago(c.createdAt)}
          {c.editedAt ? " · edited" : ""}
        </span>
        <span className="flex-1" />
        {thread ? (
          <Button
            variant="quiet"
            icon={thread.resolvedAt ? <RotateCcw /> : <Check />}
            aria-label={thread.resolvedAt ? "Re-open" : "Resolve"}
            title={thread.resolvedAt ? "Re-open" : "Resolve"}
            data-comment-resolve=""
            onClick={(e) => {
              e.stopPropagation();
              void comments.resolve(thread.id, !thread.resolvedAt).catch((err: unknown) => fail(err, "We couldn't change the thread."));
            }}
          />
        ) : null}
        {c.mine ? (
          <Popover open={menu} onOpenChange={setMenu}>
            <PopoverTrigger asChild>
              <Button variant="quiet" icon={<MoreHorizontal />} aria-label="More actions" onClick={(e) => e.stopPropagation()} />
            </PopoverTrigger>
            <PopoverContent /* sizing: fixed — a two-row menu */ surface="solid" align="end" className="w-44 p-1">
              <Button variant="quiet" className="w-full justify-start" onClick={() => { setMenu(false); setEditing(true); }}>
                Edit
              </Button>
              <Button
                variant="quiet"
                icon={<Trash2 />}
                className="w-full justify-start"
                onClick={() => {
                  setMenu(false);
                  void (async () => {
                    const ok = await confirm({ title: "Delete this comment?", description: "It moves to Trash, where you can restore it.", confirmLabel: "Delete" });
                    if (ok) await comments.remove(c.id);
                  })().catch((err: unknown) => fail(err, "We couldn't delete the comment."));
                }}
              >
                Delete
              </Button>
            </PopoverContent>
          </Popover>
        ) : null}
      </div>
      {editing ? (
        <MentionComposer
          source={source}
          autoFocus
          initialValue={c.body}
          submitLabel="Save"
          onCancel={() => setEditing(false)}
          onSubmit={async (text) => {
            await comments.edit(c.id, text, { body: c.body, version: c.version });
            setEditing(false);
          }}
        />
      ) : (
        <CommentBody body={c.body} className="pl-8" />
      )}
    </div>
  );
}

function ThreadCard({
  thread,
  source,
  comments,
  active,
  label,
  removed,
  canComment,
  onActivate,
}: {
  thread: AnchoredThread;
  source: AnnotationSource;
  comments: AnchoredComments;
  active: boolean;
  label: string | null;
  removed: string | null;
  canComment: boolean;
  onActivate: (id: string | null) => void;
}) {
  return (
    <div
      data-comment-thread={thread.id}
      data-active={active ? "true" : undefined}
      data-clickable=""
      className={cn(
        "flex flex-col gap-2 rounded-lg border bg-card p-3 text-left shadow-sm",
        active ? "border-primary shadow-md" : "border-border",
      )}
      onClick={() => onActivate(thread.id)}
    >
      {removed || label || thread.quote ? (
        <div className="flex min-w-0 flex-col gap-0.5 border-l-2 border-amber-400 pl-2 dark:border-amber-500">
          {removed ? <span className="text-xs font-medium text-muted-foreground">{removed}</span> : null}
          {label ? <span className="text-xs font-medium text-foreground">{label}</span> : null}
          {thread.quote ? <span className="line-clamp-2 text-xs text-muted-foreground">{thread.quote}</span> : null}
        </div>
      ) : null}
      <CommentLine c={thread} thread={thread} source={source} comments={comments} />
      {thread.replies.map((r) => (
        <CommentLine key={r.id} c={r} source={source} comments={comments} />
      ))}
      {active && !thread.resolvedAt && canComment ? (
        <MentionComposer
          source={source}
          placeholder="Reply…"
          submitLabel="Reply"
          onSubmit={async (text) => {
            await comments.post(text, { parentId: thread.id });
          }}
        />
      ) : null}
    </div>
  );
}

type Tab = "open" | "resolved";

export function AnchoredCommentRail({
  source,
  comments,
  anchorTops,
  present,
  liveLabel,
  removedLabel,
  activeThreadId,
  onActivate,
  draft,
  onDraftDone,
  onClose,
  canComment,
  className,
}: AnchoredCommentRailProps) {
  const [tab, setTab] = useState<Tab>("open");
  const areaRef = useRef<HTMLDivElement | null>(null);
  const [areaTop, setAreaTop] = useState(0);
  const [heights, setHeights] = useState<Record<string, number>>({});
  const seen = useRef(new Set<string>());
  for (const id of present) seen.current.add(id);

  useLayoutEffect(() => {
    const top = areaRef.current?.getBoundingClientRect().top ?? 0;
    if (Math.abs(top - areaTop) > 0.5) setAreaTop(top);
  });

  // Card heights, for stacking without overlap.
  const observer = useRef<ResizeObserver | null>(null);
  useEffect(() => {
    observer.current = new ResizeObserver((entries) => {
      setHeights((prev) => {
        let next = prev;
        for (const e of entries) {
          const key = (e.target as HTMLElement).dataset.railKey;
          if (!key) continue;
          const h = Math.round((e.target as HTMLElement).offsetHeight);
          if (prev[key] !== h) next = next === prev ? { ...prev, [key]: h } : { ...next, [key]: h };
        }
        return next;
      });
    });
    return () => observer.current?.disconnect();
  }, []);
  const measure = (key: string) => (el: HTMLDivElement | null) => {
    if (!el) return;
    el.dataset.railKey = key;
    observer.current?.observe(el);
  };

  const now = Date.now();
  const open = comments.threads.filter((t) => !t.resolvedAt);
  const resolved = comments.threads.filter((t) => !!t.resolvedAt);
  const isRemoved = (t: AnchoredThread) =>
    !!t.anchorId && !present.has(t.anchorId) && (seen.current.has(t.anchorId) || now - new Date(t.createdAt).getTime() > ARRIVING_MS);
  const removedOpen = open.filter(isRemoved);
  const wholeRecord = open.filter((t) => !t.anchorId);

  // Floating cards: open threads whose anchor is laid out, plus the draft; ordered by anchor.
  type Float = { key: string; top: number; thread?: AnchoredThread };
  const floats: Float[] = [];
  for (const t of open) {
    if (!t.anchorId) continue;
    const y = anchorTops.get(t.anchorId);
    if (y === undefined) continue;
    floats.push({ key: t.id, top: y - areaTop, thread: t });
  }
  if (draft) {
    const y = anchorTops.get(draft.anchorId);
    floats.push({ key: "draft", top: (y ?? areaTop) - areaTop });
  }
  floats.sort((a, b) => a.top - b.top || a.key.localeCompare(b.key));
  const placed = new Map<string, number>();
  const pin = draft ? "draft" : activeThreadId && floats.some((f) => f.key === activeThreadId) ? activeThreadId : null;
  const pinAt = pin ? floats.findIndex((f) => f.key === pin) : -1;
  const h = (k: string) => heights[k] ?? 96;
  if (pinAt >= 0) {
    placed.set(floats[pinAt]!.key, floats[pinAt]!.top);
    for (let i = pinAt - 1; i >= 0; i--) {
      const below = placed.get(floats[i + 1]!.key)!;
      placed.set(floats[i]!.key, Math.min(floats[i]!.top, below - h(floats[i]!.key) - GAP));
    }
    for (let i = pinAt + 1; i < floats.length; i++) {
      const above = floats[i - 1]!;
      placed.set(floats[i]!.key, Math.max(floats[i]!.top, placed.get(above.key)! + h(above.key) + GAP));
    }
  } else {
    let bottom = -Infinity;
    for (const f of floats) {
      const y = Math.max(f.top, bottom + GAP);
      placed.set(f.key, y);
      bottom = y + h(f.key);
    }
  }

  // Nothing floats above the area's top (an anchor scrolled above it, or under the removed list): keep the
  // order, push down, never overlap.
  {
    let bottom = -GAP;
    for (const f of floats) {
      const y = Math.max(placed.get(f.key) ?? f.top, bottom + GAP);
      placed.set(f.key, y);
      bottom = y + h(f.key);
    }
  }

  return (
    <aside
      aria-label="Comments"
      data-comment-rail=""
      className={cn("flex w-80 shrink-0 flex-col border-l border-border bg-textured", className)}
    >
      <div className="flex items-center gap-2 border-b border-border px-3 py-2">
        <MessageSquare className="size-4 text-muted-foreground" />
        <span className="text-sm font-medium text-foreground">Comments</span>
        <span className="flex-1" />
        <SegmentedControl
          aria-label="Which comments"
          value={tab}
          onValueChange={setTab}
          data={[
            { value: "open", label: "Open", count: open.length },
            { value: "resolved", label: "Resolved", count: resolved.length },
          ]}
        />
        <Button variant="quiet" icon={<X />} aria-label="Close comments" onClick={onClose} />
      </div>
      {tab === "resolved" ? (
        <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto p-3">
          {resolved.length === 0 ? (
            <EmptyState icon={<MessageSquare />} title="No resolved comments" />
          ) : (
            resolved.map((t) => (
              <ThreadCard
                key={t.id}
                thread={t}
                source={source}
                comments={comments}
                active={false}
                label={t.anchorId ? liveLabel?.(t.anchorId) ?? null : null}
                removed={isRemoved(t) ? removedLabel : null}
                canComment={canComment}
                onActivate={onActivate}
              />
            ))
          )}
        </div>
      ) : (
        <>
          {removedOpen.length || wholeRecord.length || comments.status === "error" ? (
            <div className="flex max-h-[40%] shrink-0 flex-col gap-2 overflow-y-auto border-b border-border p-3">
              {comments.status === "error" ? (
                <EmptyState icon={<MessageSquare />} title="Comments didn't load" action={<Button variant="outline" onClick={comments.reload}>Try again</Button>} />
              ) : null}
              {[...removedOpen, ...wholeRecord].map((t) => (
                <ThreadCard
                  key={t.id}
                  thread={t}
                  source={source}
                  comments={comments}
                  active={t.id === activeThreadId}
                  label={null}
                  removed={t.anchorId ? removedLabel : null}
                  canComment={canComment}
                  onActivate={onActivate}
                />
              ))}
            </div>
          ) : null}
          <div ref={areaRef} className="relative min-h-0 flex-1 overflow-hidden" data-comment-rail-area="">
            {comments.status === "ready" && open.length === 0 && !draft ? (
              <div className="p-3">
                <EmptyState icon={<MessageSquare />} title="No open comments" />
              </div>
            ) : null}
            {floats.map((f) => (
              <div
                key={f.key}
                ref={measure(f.key)}
                className="absolute inset-x-3"
                style={{ top: placed.get(f.key) ?? f.top }}
              >
                {f.thread ? (
                  <ThreadCard
                    thread={f.thread}
                    source={source}
                    comments={comments}
                    active={f.thread.id === activeThreadId}
                    label={f.thread.anchorId ? liveLabel?.(f.thread.anchorId) ?? null : null}
                    removed={null}
                    canComment={canComment}
                    onActivate={onActivate}
                  />
                ) : draft ? (
                  <div className="flex flex-col gap-2 rounded-lg border border-primary bg-card p-3 shadow-md" data-comment-draft="">
                    {liveLabel?.(draft.anchorId) || draft.quote ? (
                      <div className="flex min-w-0 flex-col gap-0.5 border-l-2 border-amber-400 pl-2 dark:border-amber-500">
                        {liveLabel?.(draft.anchorId) ? <span className="text-xs font-medium text-foreground">{liveLabel(draft.anchorId)}</span> : null}
                        {draft.quote ? <span className="line-clamp-2 text-xs text-muted-foreground">{draft.quote}</span> : null}
                      </div>
                    ) : null}
                    <MentionComposer
                      source={source}
                      autoFocus
                      placeholder="Add a comment…"
                      submitLabel="Comment"
                      onCancel={() => onDraftDone(null)}
                      onSubmit={async (text) => {
                        const id = await comments.post(text, { anchor: { anchorId: draft.anchorId, quote: draft.quote } });
                        onDraftDone(id);
                      }}
                    />
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </>
      )}
    </aside>
  );
}
