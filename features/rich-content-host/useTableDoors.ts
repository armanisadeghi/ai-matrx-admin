"use client";

/**
 * The app's doors for a rendered table's "…" menu (@ai-matrx/rich-content `useTableDoors`):
 * Save to notes opens the one saveToNotes overlay with the table's markdown; Send to an agent opens
 * a new chat with the table in the composer (@ai-matrx/chat `openNewChatWithText`).
 */
import * as React from "react";
import { useRouter } from "next/navigation";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import { selectUserId } from "@/lib/redux/slices/userSlice";
import { selectOrganizationId } from "@/lib/redux/slices/appContextSlice";
import { openOverlay } from "@/lib/redux/slices/overlaySlice";
import { toast } from "@/lib/toast";
import type { RichContentTableDoors } from "@ai-matrx/rich-content/host/types";

export function useTableDoors(): RichContentTableDoors {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const userId = useAppSelector(selectUserId);
  const organizationId = useAppSelector(selectOrganizationId);
  return React.useMemo<RichContentTableDoors>(
    () => ({
      saveToNotes: (markdown, title) =>
        dispatch(
          openOverlay({
            overlayId: "saveToNotes",
            instanceId: `table-notes:${crypto.randomUUID()}`,
            data: { initialContent: title ? `## ${title}\n\n${markdown}` : markdown },
          }),
        ),
      sendToAgent: (markdown) => {
        void import("@ai-matrx/chat/agents/components/chat/new-chat-about")
          .then(({ openNewChatWithText }) =>
            openNewChatWithText({
              text: markdown,
              identity: { userId: userId ?? null, organizationId: organizationId ?? null },
              dispatch: dispatch as never,
              navigate: (href) => React.startTransition(() => router.push(href)),
            }),
          )
          .catch((error: unknown) => toast.error(error instanceof Error ? error.message : "The new chat could not open"));
      },
    }),
    [dispatch, router, userId, organizationId],
  );
}
