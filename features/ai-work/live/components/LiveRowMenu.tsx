"use client";

import { ExternalLink, Link2, MessagesSquare, PanelRight, ScrollText } from "lucide-react";
import type { ItemMenuConfig } from "@ai-matrx/design-system/item";
import { ItemContextMenu, ItemMenu } from "@ai-matrx/design-system/item";
import { MoreHorizontalTapButton } from "@ai-matrx/design-system/tap-target/buttons";
import { buildConversationMenu } from "@ai-matrx/chat/agents/components/conversation-actions/conversationActionRegistry";
import { useAppDispatch } from "@/lib/redux/hooks";
import { copyToClipboard } from "@/lib/clipboard/copy";
import { cn } from "@/lib/utils";

const STATELESS_PLATFORM_ACTIONS = new Set(["Copy link", "Share…", "Add to project…"]);

const liveHref = (q: string) => `/work/live?${q}`;
const absolute = (href: string) =>
  typeof window === "undefined" ? href : new URL(href, window.location.origin).toString();

/**
 * A session row's menu: where to open it, then the platform's own
 * conversation actions (share, project, archive…) — the session's address IS
 * its AI Matrx conversation, so those doors already exist.
 */
function sessionMenu(
  address: string,
  title: string,
  onOpenHere: () => void,
  dispatch: ReturnType<typeof useAppDispatch>,
): ItemMenuConfig {
  const live = liveHref(`session=${address}`);
  const platform = buildConversationMenu({
    conversationId: address,
    title,
    isFavorite: false,
    isArchived: false,
    excludeFromKg: false,
    href: live,
    showRename: false,
    showFavorite: false,
    showDelete: false,
    dispatch,
  });
  return {
    sections: [
      {
        id: "open",
        items: [
          { id: "open-here", label: "Open here", icon: PanelRight, onSelect: onOpenHere },
          { id: "open-tab", kind: "link", label: "Open in new tab", icon: ExternalLink, href: live, target: "_blank" },
          {
            id: "open-transcript",
            kind: "link",
            label: "Open full conversation",
            icon: ScrollText,
            href: `/work/conversations/${address}`,
            target: "_blank",
          },
        ],
      },
      // Only the platform actions that need no per-row state: Archive, the
      // knowledge-graph toggle and favourites would show a state this list
      // never read, and "Open in new tab" would repeat ours.
      ...platform.sections
        .map((section) => ({
          ...section,
          items: section.items.filter((item) => STATELESS_PLATFORM_ACTIONS.has(item.label)),
        }))
        .filter((section) => section.items.length > 0),
    ],
  };
}

function roomMenu(id: string, onOpenHere: () => void): ItemMenuConfig {
  const live = liveHref(`room=${id}`);
  return {
    sections: [
      {
        id: "open",
        items: [
          { id: "open-here", label: "Open here", icon: PanelRight, onSelect: onOpenHere },
          { id: "open-tab", kind: "link", label: "Open in new tab", icon: ExternalLink, href: live, target: "_blank" },
          {
            id: "open-messages",
            kind: "link",
            label: "Open in Messages",
            icon: MessagesSquare,
            href: `/messages/${id}`,
            target: "_blank",
          },
        ],
      },
      {
        id: "share",
        items: [
          {
            id: "copy-link",
            label: "Copy link",
            icon: Link2,
            onSelect: () => void copyToClipboard(absolute(live), "Link copied"),
          },
        ],
      },
    ],
  };
}

/**
 * One Live list row with its "…" menu (shown on hover / focus, always on
 * touch) and the same menu on right-click. The kebab overlays the row's
 * trailing time, which hides while it shows.
 */
export function LiveRowMenu({
  target,
  title,
  onOpenHere,
  children,
}: {
  target: { kind: "session"; address: string } | { kind: "room"; id: string };
  title: string;
  onOpenHere: () => void;
  children: React.ReactNode;
}) {
  const dispatch = useAppDispatch();
  const config = () =>
    target.kind === "session"
      ? sessionMenu(target.address, title, onOpenHere, dispatch)
      : roomMenu(target.id, onOpenHere);
  return (
    <ItemContextMenu
      config={config}
      sourceFeature="messages"
      entity={
        target.kind === "session"
          ? { type: "conversation", id: target.address, title }
          : { type: "conversation", id: target.id, title }
      }
    >
      <div className="group/row relative">
        {children}
        <span
          className={cn(
            "absolute right-0.5 top-1/2 -translate-y-1/2 opacity-0 transition-opacity",
            "group-hover/row:opacity-100 focus-within:opacity-100 has-[[data-state=open]]:opacity-100 pointer-coarse:opacity-100",
          )}
        >
          <ItemMenu config={config} align="end">
            <MoreHorizontalTapButton variant="transparent" ariaLabel={`Options for ${title.length > 40 ? `${title.slice(0, 40)}…` : title}`} tooltip="More" />
          </ItemMenu>
        </span>
      </div>
    </ItemContextMenu>
  );
}
