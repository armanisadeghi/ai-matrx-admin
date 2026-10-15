"use client";

/**
 * The one door from typed text to a Mastodon server check (MKT-102): when `text` is an unknown `host/@user`
 * profile, check the host once (social/fediverse.ts) and re-render when it turns out to run Mastodon, so the
 * text then reads as an account everywhere `resolveAccountInput` is used. Teaches the registry on the way.
 */
import { useEffect, useState } from "react";
import { learnFediverseFromText } from "@/features/marketing/social/fediverse";
import { fediverseProfileShape } from "@/features/marketing/social/profile-sites";
import { teachFediverseHost } from "./learnDomains";

export function useFediverseHost(text: string): number {
  const [checked, setChecked] = useState(0);
  useEffect(() => {
    if (!fediverseProfileShape(text)) return;
    let live = true;
    void learnFediverseFromText(text, { onLearned: teachFediverseHost }).then((ok) => live && ok && setChecked((n) => n + 1));
    return () => {
      live = false;
    };
  }, [text]);
  // The learned hosts live outside React, and the React compiler memoizes `resolveAccountInput({ text })` by its
  // arguments: callers pass this count as `learned` so the account is read again when a host has just been proven.
  return checked;
}
