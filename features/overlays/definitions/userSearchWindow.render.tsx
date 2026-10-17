"use client";

import { UserSearchWindowDataSchema } from "@/features/user-search/types";
import { UserSearchWindow } from "@/features/window-panels/windows/admin/user-search/UserSearchWindow";
import type { OverlayRenderProps } from "@ai-matrx/summon/react";

export default function OverlayRender({ data, instanceId, close }: OverlayRenderProps) {

        const parsed = UserSearchWindowDataSchema.safeParse(data);
        if (!parsed.success) {
          console.error(
            "[UserSearchWindow] Invalid overlay data",
            parsed.error.flatten(),
          );
          return null;
        }
        return (
          <UserSearchWindow
            key={instanceId}
            isOpen
            instanceId={instanceId}
            onClose={() =>
              close()
            }
            callbackGroupId={parsed.data.callbackGroupId}
            title={parsed.data.title}
            initialQuery={parsed.data.initialQuery}
            directory={parsed.data.directory}
            candidates={parsed.data.candidates}
            excludeUserIds={parsed.data.excludeUserIds}
          />
        );
}
