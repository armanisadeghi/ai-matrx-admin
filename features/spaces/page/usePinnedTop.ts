// features/spaces/page/usePinnedTop.ts — A TEMPLATE PREVIEW OPENS AT ITS TOP, EVERY TIME, in every host: the in-app
// gallery (sidebar/TemplateGallery.tsx) and the public page (public/TemplatePackPreview.tsx).
//
// ADVERSARIAL-1 #6 / ADVERSARIAL-2 #4: blocks that mount late scroll themselves into view (a calendar finding
// today, a grid focusing a cell) and drag the preview pane — on the public page the window too — with them: the
// public preview opened 595px down with its title and cover gone. So each time `key` changes the pane goes to its
// top and stays there, and (`pinWindow`) the window stays where it was, until the person scrolls, presses or types.
// No timer: on a busy machine the editor's blocks mount seconds later (measured: 671px down 12 s after load with a
// 2.5 s pin), and only the person's own input ever moves the preview.

import { useLayoutEffect, type RefObject } from "react";

const USER_INPUT = ["wheel", "touchstart", "pointerdown", "keydown"] as const;

export function usePinnedTop(ref: RefObject<HTMLElement | null>, key: string, options: { pinWindow?: boolean } = {}) {
  const pinWindow = options.pinWindow ?? false;
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.scrollTop = 0;
    const windowY = window.scrollY;
    let pinned = true;
    const release = () => {
      pinned = false;
    };
    const onScroll = () => {
      if (pinned && el.scrollTop !== 0) el.scrollTop = 0;
    };
    const onWindowScroll = () => {
      if (pinned && window.scrollY !== windowY) window.scrollTo({ top: windowY, behavior: "instant" });
    };
    for (const t of USER_INPUT) {
      el.addEventListener(t, release, { passive: true });
      if (pinWindow) window.addEventListener(t, release, { passive: true });
    }
    el.addEventListener("scroll", onScroll);
    if (pinWindow) window.addEventListener("scroll", onWindowScroll);
    return () => {
      el.removeEventListener("scroll", onScroll);
      if (pinWindow) window.removeEventListener("scroll", onWindowScroll);
      for (const t of USER_INPUT) {
        el.removeEventListener(t, release);
        if (pinWindow) window.removeEventListener(t, release);
      }
    };
  }, [ref, key, pinWindow]);
}
