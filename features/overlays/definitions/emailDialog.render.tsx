"use client";

import { useCallback } from "react";
import { EmailInputDialog } from "@ai-matrx/design-system";
import { toast } from "@/lib/toast-service";
import type { OverlayRenderProps } from "@ai-matrx/summon/react";

/**
 * The `emailDialog` overlay: design-system's EmailInputDialog plus the app's send (POST
 * `/api/chat/email-response` with the content + metadata + the entered address).
 *
 * `onSubmit` cannot travel through Redux, so it is resolved here from the overlay instance's data.
 * Nothing is read from the store: `emailDialog` is a MULTI-instance overlay, and a default-instance read
 * is false for every real instance (sweep 2026-10-18). Used by the signed-out "Email to me" flows in
 * features/rich-document/actions/handlers/export.ts.
 */
export default function OverlayRender({ data, close }: OverlayRenderProps) {
  const content = typeof data?.content === "string" ? data.content : "";
  const metadata =
    data?.metadata && typeof data.metadata === "object" && !Array.isArray(data.metadata)
      ? (data.metadata as Record<string, unknown>)
      : null;
  const title = typeof data?.title === "string" ? data.title : undefined;

  const handleSubmit = useCallback(
    async (email: string) => {
      if (!content) {
        toast.error("Nothing to email — content is empty.");
        return;
      }
      const response = await fetch("/api/chat/email-response", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: email,
          content,
          metadata: { ...(metadata ?? {}), ...(title ? { title } : {}), timestamp: new Date().toLocaleString() },
        }),
      });
      const payload = await response.json().catch(() => ({ success: false }));
      if (!response.ok || !payload.success) throw new Error(payload.msg || "Failed to send email");
      toast.success("Email sent!");
    },
    [content, metadata, title],
  );

  return (
    <EmailInputDialog
      isOpen
      onClose={close}
      onSubmit={handleSubmit}
      title="Email this response"
      description="Enter your email address to receive this content."
      submitLabel="Send to Email"
    />
  );
}
