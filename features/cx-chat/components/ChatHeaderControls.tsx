"use client";

// ChatHeaderControls — Desktop header controls for the SSR chat route.
//
// Self-contained client island — reads all state from Redux.
// Injects via PageHeaderPortal into #shell-header-center on desktop (lg+).
// On mobile, this component renders nothing (the mobile bar is separate).
//
// Features:
//   - Admin-only: localhost toggle + block mode toggle
//   - Share button when in a conversation

import { useState } from "react";
import { Share2, Blocks } from "lucide-react";
import dynamic from "next/dynamic";
import PageHeaderPortal from "@/features/ssr-trials/components/PageHeaderPortal";
import IconButton from "@/features/ssr-trials/components/IconButton";
import { useAppSelector, useAppDispatch } from "@/lib/redux/hooks";
import {
  selectIsAuthenticated,
  selectIsAdmin,
} from "@/lib/redux/slices/userSlice";
import {
  selectUseBlockMode,
  setUseBlockMode,
} from "@/features/agents/redux/execution-system/instance-ui-state";
import { usePathname, useSearchParams } from "next/navigation";

const ShareModal = dynamic(
  () => import("@/features/sharing").then((m) => ({ default: m.ShareModal })),
  { ssr: false },
);

export default function ChatHeaderControls() {
  const dispatch = useAppDispatch();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const isAdmin = useAppSelector(selectIsAdmin);

  const blockMode = useAppSelector(selectUseBlockMode);

  // Derive conversationId from URL — header only needs it for the share button.
  const conversationId = (() => {
    const pathMatch = pathname.match(/\/ssr\/chat\/c\/([^/?]+)/);
    return pathMatch?.[1] ?? searchParams.get("conversation") ?? null;
  })();

  const [isShareOpen, setIsShareOpen] = useState(false);

  const showShare = isAuthenticated && !!conversationId;
  if (!showShare && !isAdmin) return null;

  return (
    <>
      <PageHeaderPortal>
        <div className="hidden lg:flex items-center justify-end w-full gap-1">
          {isAdmin && (
            <button
              onClick={() => dispatch(setUseBlockMode(!blockMode))}
              title={
                blockMode
                  ? "Block mode ON — click to disable."
                  : "Block mode OFF — click to enable."
              }
              className={`p-1.5 rounded-md transition-colors ${
                blockMode
                  ? "text-violet-600 dark:text-violet-400 bg-violet-500/15 border border-violet-500/30"
                  : "text-muted-foreground/50 hover:text-muted-foreground hover:bg-accent/50 border border-transparent"
              }`}
            >
              <Blocks className="h-3.5 w-3.5" />
            </button>
          )}

          {showShare && (
            <IconButton
              icon={<Share2 />}
              onClick={() => setIsShareOpen(true)}
              label="Share conversation"
            />
          )}
        </div>
      </PageHeaderPortal>

      {isShareOpen && conversationId && (
        <ShareModal
          isOpen={isShareOpen}
          onClose={() => setIsShareOpen(false)}
          resourceType="cx_conversation"
          resourceId={conversationId}
          resourceName="Chat"
          isOwner={true}
        />
      )}
    </>
  );
}
