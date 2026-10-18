"use client";

import NotificationsInboxWindow from "@/features/notifications/windows/InboxWindow";
import { useAppSelector } from "@/lib/redux/hooks";
import { selectOverlayData } from "@ai-matrx/summon";
import type { OverlayRenderProps } from "@ai-matrx/summon/react";

export default function OverlayRender({ data, instanceId, close }: OverlayRenderProps) {
  const notificationsInboxData = useAppSelector((s) =>
    selectOverlayData(s, "notificationsInboxWindow"),
  ) as { initialTab?: string } | null | undefined;
  return (true ? (
        <NotificationsInboxWindow
          onClose={() =>
            close()
          }
          initialTab={notificationsInboxData?.initialTab}
        />
      ) : null);
}
