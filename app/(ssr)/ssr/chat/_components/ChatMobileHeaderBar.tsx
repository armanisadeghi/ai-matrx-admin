// ChatMobileHeaderBar — Pure server component. No 'use client'. Renders on first paint.
//
// Layout: [Hamburger] [New Chat] [Agent Name (flex-1)] [44px gap for shell avatar]
//
// The shell header already renders the user avatar (UserMenuTrigger, w-11) on the far
// right. Our fixed bar covers the full width at the same z-index, so it MUST leave
// the right 44px (pr-11) clear — otherwise we'd overlap the avatar.
//
// New Chat is placed LEFT (next to the hamburger), not right, for the same reason.
//
// The tiny ChatMobileAgentName client island hydrates the agent-name button in-place
// with the same size/shape as the static text, so there is zero layout shift.

import Link from "next/link";
import { SquarePen } from "lucide-react";
import { TapTargetButton } from "@/app/(ssr)/_components/core/TapTargetButton";
import ChatMobileAgentName from "./ChatMobileAgentName";
import ChatMobileAdminToggles from "./ChatMobileAdminToggles";

export default function ChatMobileHeaderBar() {
  return (
    // Fixed to the header zone, mobile only (lg:hidden).
    // pr-11 reserves 44px on the right for the shell's UserMenuTrigger (avatar).
    // z-[41] matches the shell header elements — avatar is also z-41-ish.
    <div
      className="lg:hidden fixed top-0 left-0 right-0 z-[41] flex items-center pr-11 pointer-events-none"
      style={{ height: "var(--shell-header-h)" }}
    >
      {/* Hamburger — pure CSS label for #shell-panel-mobile checkbox.
                Opens the panel sidebar drawer via shell.css :has() rule. Zero JS. */}
      <span className="pointer-events-auto flex-shrink-0">
        <TapTargetButton
          as="label"
          htmlFor="shell-panel-mobile"
          ariaLabel="Open chat menu"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
          />
        </TapTargetButton>
      </span>

      {/* New chat — Link wrapper preserves native Cmd+click → new tab behaviour. */}
      <Link href="/ssr/chat" aria-label="New chat" className="flex-shrink-0 pointer-events-auto">
        <TapTargetButton
          ariaLabel="New chat"
          icon={<SquarePen className="w-4 h-4 text-foreground" />}
        />
      </Link>

      {/* Agent name — takes remaining center space.
                ChatMobileAgentName (tiny client island) hydrates in-place.
                Visual shape is identical before and after hydration → no layout shift. */}
      <div className="flex-1 flex items-center justify-center min-w-0 pointer-events-auto">
        <ChatMobileAgentName />
      </div>

      {/* Admin toggles — client island, renders nothing for non-admins. */}
      <span className="pointer-events-auto flex-shrink-0">
        <ChatMobileAdminToggles />
      </span>
    </div>
  );
}
