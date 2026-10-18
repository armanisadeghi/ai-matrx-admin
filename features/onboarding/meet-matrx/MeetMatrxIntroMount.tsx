"use client";

/**
 * Render-free. Shows Meet Matrx ONCE to every existing person on their next visit to home, through the
 * overlay system (meetMatrxWindow). Rules live in ./meetMatrxIntro. It waits for the page to settle AND the
 * person to engage (lib/boot/engagedLate), reads the account flag from the local session (no network), and
 * the window floats, so nothing on the page shifts.
 */
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { useEngagedLateReady } from "@/lib/boot/engagedLate";
import { useAppSelector } from "@/lib/redux/hooks";
import { selectUser } from "@/lib/redux/selectors/userSelectors";
import { supabase } from "@/utils/supabase/client";
import { useOpenMeetMatrxWindow } from "@/features/overlays/definitions/meetMatrxWindow.overlay";
import { coppaService } from "@/features/education/compliance/coppaService";
import { ageQuestionSettled } from "@/features/education/compliance/FirstSignInAgeGateMount";
import { MEET_MATRX_INTRO_SESSION_KEY, isHomePath, shouldShowMeetMatrxIntro } from "./meetMatrxIntro";

function shownThisSession(): boolean {
  try {
    return sessionStorage.getItem(MEET_MATRX_INTRO_SESSION_KEY) === "1";
  } catch {
    return false;
  }
}

export function MeetMatrxIntroMount() {
  const pathname = usePathname();
  const userId = useAppSelector(selectUser)?.id ?? null;
  const ready = useEngagedLateReady();
  const open = useOpenMeetMatrxWindow();
  // Captured at mount: asked on an EARLIER load means the age popup is not about to open on this one.
  const [ageSettledAtMount] = useState(() => (userId ? ageQuestionSettled(userId) : false));
  const tried = useRef(false);

  useEffect(() => {
    if (!ready || !userId || tried.current || !isHomePath(pathname)) return;
    tried.current = true;
    void (async () => {
      const { data } = await supabase.auth.getSession();
      const user = data.session?.user ?? null;
      if (user?.id !== userId) return;
      // Cheap exits first: the age answer is read from the account (server) only when it could change the verdict.
      if (!shouldShowMeetMatrxIntro({ user, pathname, ageSettled: true, shownThisSession: shownThisSession() })) return;
      let settled = ageSettledAtMount || ageQuestionSettled(userId, { declaredOnly: true });
      if (!settled) {
        // The account knows whether the age question was answered, whatever browser they answered it in.
        const gate = await coppaService.getGate();
        settled = !gate.error && gate.data.ageBand !== null;
      }
      if (
        shouldShowMeetMatrxIntro({
          user,
          pathname,
          ageSettled: settled,
          shownThisSession: shownThisSession(),
        })
      ) {
        try {
          sessionStorage.setItem(MEET_MATRX_INTRO_SESSION_KEY, "1");
        } catch {
          /* storage disabled: the account flag still ends it */
        }
        open();
      }
    })();
  }, [ready, userId, pathname, ageSettledAtMount, open]);

  return null;
}
