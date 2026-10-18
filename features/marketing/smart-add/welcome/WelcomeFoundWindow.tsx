"use client";

/**
 * The found-you window — the sign-up welcome door in a WindowPanel, over whatever page the person is on.
 *
 * It WRAPS the canonical component (`WelcomeDoor`, which hosts `SmartAddBrand door="welcome"` on the account's
 * stable subject), so it RESUMES the background search's rounds and shows "Which one is you?" or "Here's what we
 * found" — never a second renderer. Done, Skip or Continue closes it. Opened by the found-you notice
 * (`?panels=welcome-found`); rendered only behind the lazy overlay boundary.
 */

import { WindowPanel } from "@ai-matrx/summon/window";
import { WelcomeDoor } from "./WelcomeDoor";

export function WelcomeFoundWindow({ onClose }: { onClose: () => void }) {
  return (
    <WindowPanel
      id="welcome-found-window"
      overlayId="welcomeFoundWindow"
      title="We found you"
      width={960}
      height={720}
      minWidth={380}
      minHeight={360}
      position="center"
      bodyClassName="flex min-h-0 flex-1 flex-col overflow-hidden p-0"
      onClose={onClose}
    >
      <div className="min-h-0 flex-1 overflow-y-auto p-6" data-testid="welcome-found-window">
        <WelcomeDoor showDoor onFinished={onClose} />
      </div>
    </WindowPanel>
  );
}

export default WelcomeFoundWindow;
