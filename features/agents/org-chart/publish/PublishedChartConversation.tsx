"use client";

// Under a published chart: the canonical comment thread (platform.comments through CommentThread —
// any signed-in person may comment on a published chart, the kernel's public-comment arm) and
// "Message the creator" (a direct message through the messaging package, carrying a link back to
// this page). A signed-out visitor is asked to sign in at the moment they act, and comes back here.

import { useState } from "react";
import Link from "next/link";
import { MessageCircle, Send } from "lucide-react";
import { CommentThread } from "@ai-matrx/associations/react";
import { Button } from "@ai-matrx/design-system/controls";

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ProTextarea } from "@/components/official/ProTextarea";
import { ErrorAlchemyMenu } from "@/components/errors/ErrorAlchemyMenu";
import { useLoginHref } from "@/hooks/auth/useLoginHref";
import { toast } from "@/lib/toast";
import { sendDirectActionMessage } from "@/features/messaging/service/sendDirectActionMessage";

import { publicationPath } from "./publishService";

export interface PublishedChartConversationProps {
  publicationId: string;
  slug: string;
  title: string;
  creatorName: string | null;
  viewerId: string | null;
  creatorId: string | null;
}

function MessageCreatorDialog({
  open,
  onClose,
  slug,
  title,
  creatorId,
  creatorName,
}: {
  open: boolean;
  onClose: () => void;
  slug: string;
  title: string;
  creatorId: string;
  creatorName: string | null;
}) {
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const send = async () => {
    if (!text.trim() || sending) return;
    setSending(true);
    setError(null);
    try {
      await sendDirectActionMessage({
        recipientId: creatorId,
        content: `About your org chart "${title}":\n\n${text.trim()}`,
        actionData: { kind: "open_link", version: 1, payload: { href: publicationPath(slug), label: "Open the chart" } },
      });
      toast.success(creatorName ? `Message sent to ${creatorName}` : "Message sent");
      setText("");
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "The message was not sent.");
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !sending && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Message {creatorName ?? "the creator"}</DialogTitle>
          <DialogDescription>They get it in their messages, with a link to this chart.</DialogDescription>
        </DialogHeader>
        <ProTextarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Write your message…"
          rows={4}
          disabled={sending}
          autoFocus
        />
        {error && (
          <p className="type-secondary text-destructive">
            {error}
            <ErrorAlchemyMenu />
          </p>
        )}
        <div className="flex justify-end gap-2">
          <Button variant="quiet" onClick={onClose} disabled={sending}>
            Cancel
          </Button>
          <Button variant="primary" icon={<Send />} onClick={() => void send()} disabled={sending || !text.trim()}>
            {sending ? "Sending…" : "Send"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function PublishedChartConversation({
  publicationId,
  slug,
  title,
  creatorName,
  viewerId,
  creatorId,
}: PublishedChartConversationProps) {
  const loginHref = useLoginHref();
  const [messaging, setMessaging] = useState(false);
  const isCreator = Boolean(viewerId && creatorId && viewerId === creatorId);

  return (
    <section className="flex flex-col gap-3" aria-label="Discussion">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="type-title text-foreground">Comments</h2>
        {!isCreator &&
          (viewerId && creatorId ? (
            <Button variant="outline" icon={<MessageCircle />} onClick={() => setMessaging(true)}>
              Message {creatorName ?? "the creator"}
            </Button>
          ) : !viewerId ? (
            <Button variant="outline" icon={<MessageCircle />} asChild>
              <Link href={loginHref}>Message {creatorName ?? "the creator"}</Link>
            </Button>
          ) : null)}
      </div>
      {viewerId ? (
        <CommentThread token="org_chart_publication" id={publicationId} showHeader={false} />
      ) : (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-card px-3 py-2.5">
          <span className="type-secondary text-muted-foreground">Sign in to read and add comments.</span>
          <Button variant="primary" asChild>
            <Link href={loginHref}>Sign in</Link>
          </Button>
        </div>
      )}
      {creatorId && messaging && (
        <MessageCreatorDialog
          open={messaging}
          onClose={() => setMessaging(false)}
          slug={slug}
          title={title}
          creatorId={creatorId}
          creatorName={creatorName}
        />
      )}
    </section>
  );
}
