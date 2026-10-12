"use client";

import { useEffect, useRef, useState } from "react";
import { InlineMediaRef } from "@ai-matrx/media/react";
import { downloadFile } from "@ai-matrx/kit/download";
import { ErrorNotice } from "@ai-matrx/design-system";
import { Button } from "@/components/ui/button";
import { InfoHint } from "@/components/official/InfoHint";
import type { PersonalAttachment, PersonalWhatsAppClient } from "@/features/social-connections/personal-whatsapp-service";

/** Only native identity/byte custody: the shared media component owns playback. */
type AttachmentProps = { client: PersonalWhatsAppClient; chatId: string; messageId: string; attachment: PersonalAttachment };
export function NativeWhatsAppAttachment(props: AttachmentProps) {
  return <NativeWhatsAppAttachmentContent key={`${props.chatId}:${props.messageId}:${props.attachment.revision}`} {...props} />;
}

function NativeWhatsAppAttachmentContent({ client, chatId, messageId, attachment }: AttachmentProps) {
  const [asset, setAsset] = useState<{ blob: Blob; url: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const controller = useRef<AbortController | null>(null);
  const objectUrl = useRef<string | null>(null);
  const lifetime = useRef(0);

  useEffect(() => {
    const version = ++lifetime.current;
    return () => {
      if (lifetime.current === version) lifetime.current += 1;
      controller.current?.abort();
      if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
      objectUrl.current = null;
    };
  }, [attachment.revision, chatId, messageId]);

  async function load() {
    if (loading || asset) return;
    const version = lifetime.current;
    const request = new AbortController();
    controller.current = request;
    setLoading(true); setError(null);
    try {
      const blob = await client.attachment(chatId, messageId, attachment, request.signal);
      if (request.signal.aborted || lifetime.current !== version) return;
      const url = URL.createObjectURL(blob);
      objectUrl.current = url;
      setAsset({ blob, url });
    } catch (cause) {
      if (!request.signal.aborted && lifetime.current === version) setError(cause instanceof Error ? cause.message : "Attachment could not load. Retry.");
    } finally { if (lifetime.current === version) setLoading(false); }
  }

  const as = asset?.blob.type.startsWith("image/") ? "img" : asset?.blob.type.startsWith("audio/") ? "audio" : asset?.blob.type.startsWith("video/") ? "video" : null;
  return <div className="space-y-2 py-1">
    {!attachment.available ? <span className="flex items-center gap-2 text-sm">{attachment.name}<InfoHint text="Open this attachment in Beeper." /></span> : !asset ? <Button variant="outline" disabled={loading} onClick={() => void load()}>{loading ? "Loading attachment…" : `Open ${attachment.name}`}</Button> : <>
      {as && <InlineMediaRef ref={{ url: asset.url, mime_type: asset.blob.type }} as={as} controls={as !== "img"} size="fill" fit="contain" alt={attachment.name} playbackLabel={attachment.name} className="max-h-[50dvh] w-full" />}
      <Button variant="quiet" onClick={() => downloadFile(attachment.name, asset.blob, asset.blob.type)}>Download {attachment.name}</Button>
    </>}
    {error && <ErrorNotice size="inline" message={error} />}
  </div>;
}
