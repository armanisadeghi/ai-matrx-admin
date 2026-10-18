"use client";

/**
 * Meet Matrx in a window over home, for people who signed up before it existed. Dismissible two ways
 * (Continue / Later / the window's close): all are remembered on the account so it is shown once.
 * Opening one of the pieces counts as having met Matrx too.
 */
import { WindowPanel } from "@ai-matrx/summon/window";
import { Button } from "@ai-matrx/design-system/controls";
import { supabase } from "@/utils/supabase/client";
import { MeetMatrx } from "./meetMatrx";
import { MEET_MATRX_SEEN_KEY } from "@/features/onboarding/welcome-steps/welcomeSteps";

let remembered = false;

async function rememberMet(): Promise<void> {
  if (remembered) return;
  remembered = true;
  const { error } = await supabase.auth.updateUser({ data: { [MEET_MATRX_SEEN_KEY]: true } });
  if (error) {
    remembered = false;
    return;
  }
  await supabase.auth.refreshSession();
}

export function MeetMatrxWindow({ onClose }: { onClose: () => void }) {
  const leave = () => {
    void rememberMet();
    onClose();
  };
  return (
    <WindowPanel
      id="meet-matrx-window"
      overlayId="meetMatrxWindow"
      title="Meet Matrx"
      width={980}
      height={720}
      minWidth={380}
      minHeight={360}
      position="center"
      bodyClassName="flex min-h-0 flex-1 flex-col overflow-hidden p-0"
      onClose={leave}
    >
      <div
        className="min-h-0 flex-1 overflow-y-auto px-5 pt-6"
        data-testid="meet-matrx-window"
        onClickCapture={(e) => {
          if ((e.target as HTMLElement).closest("[data-intro-item]")) void rememberMet();
        }}
      >
        <MeetMatrx />
        <div className="sticky bottom-0 z-10 -mx-5 flex items-center justify-center gap-2 bg-gradient-to-t from-background via-background/90 to-transparent px-5 pb-4 pt-6">
          <Button variant="primary" onClick={leave} data-testid="meet-window-continue">
            Continue
          </Button>
          <Button variant="quiet" onClick={leave} data-testid="meet-window-later">
            Later
          </Button>
        </div>
      </div>
    </WindowPanel>
  );
}

export default MeetMatrxWindow;
