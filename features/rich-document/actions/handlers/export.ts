// features/rich-document/actions/handlers/export.ts
//
// Email-to-me (source-agnostic). Publish HTML is @ai-matrx/chat's row; this app's half of it
// (the htmlPreview overlay and its save through the source adapters) is ./host-edit-bodies.

import { Mail } from "lucide-react";
import { toast } from "@/lib/toast";
import { openOverlay } from "@/lib/redux/slices/overlaySlice";
import { registerActionIfAbsent } from "./register-if-absent";
import { getErrorMessage, contentForDestination } from "../utils";

registerActionIfAbsent({
  id: "email-to-me",
  label: "Email to me",
  icon: Mail,
  iconColor: "text-sky-500 dark:text-sky-400",
  category: "export",
  supportedSources: "*",
  renderSlot: "overflow",
  order: 2,
  run: async (ctx) => {
    // Anonymous path — open the email-dialog overlay so the user can supply
    // an address. Auth'd path posts straight to /api/chat/email-response
    // using the signed-in user's email server-side.
    if (!ctx.isAuthenticated) {
      ctx.dispatch(
        openOverlay({
          overlayId: "emailDialog",
          data: {
            content: contentForDestination(ctx),
            metadata: ctx.metadata ?? null,
          },
        }),
      );
      return;
    }
    try {
      const response = await fetch("/api/chat/email-response", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: contentForDestination(ctx),
          metadata: {
            ...ctx.metadata,
            timestamp: new Date().toLocaleString(),
          },
        }),
      });
      const data = await response.json();
      if (!data.success) throw new Error(data.msg || "Failed to send email");
      toast.success("Email sent!");
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to send email"));
    }
  },
});
