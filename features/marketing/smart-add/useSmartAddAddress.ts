"use client";

/**
 * The Smart Add page's binding to its address (smartAddUrl.ts is the grammar).
 *
 * - mode (company ↔ person) is a ROUTE change: `router.push`, so Back returns to the other mode;
 * - the way in (`via`) is pushed without navigating (Back closes the card);
 * - the compare view is PUSHED without navigating (a link opens it, Back closes it; its own close goes back);
 * - typed fields and run ids are REPLACED without navigating (no history spam, no RSC fetch);
 * - starting a search PUSHES one entry (`markSearch`): Back returns to the entry, what was typed kept, the search stopped.
 *
 * Auto-start: a link that carries a prefill starts searching on open (it spends points, like Go) —
 * once per address per tab. A reload, Back/Forward or a duplicate tab never starts a second run;
 * an address with `run=` resumes its runs instead.
 */
import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  currentPathWithSearch,
  pushAddressWithoutNavigating,
  replaceAddressWithoutNavigating,
} from "@/lib/url-state/addressWithoutNavigating";
import {
  hasSmartAddPrefill,
  parseSmartAddUrl,
  patchSmartAddSearch,
  smartAddPath,
  type SmartAddAddress,
  type SmartAddPatch,
  type SmartAddMode,
  type SmartAddVia,
  type SmartAddView,
} from "./smartAddUrl";

export interface SmartAddAddressBinding {
  address: SmartAddAddress;
  /** True (once, after mount) when this arrival is a link that should start searching. */
  autoStart: boolean;
  setMode: (mode: SmartAddMode) => void;
  setVia: (via: SmartAddVia | null) => void;
  /** Open (push) or close the compare view; closing an opened one goes Back. */
  setView: (view: SmartAddView | null) => void;
  /** Replace this module's keys in the address (`undefined` keeps, `null` removes). */
  write: (patch: SmartAddPatch) => void;
  /** A search starts: one history entry, so Back returns to the entry with what was typed. */
  markSearch: () => void;
}

const AUTO_KEY = "smart-add:auto-started";

/** True the first time this tab sees `key`; never again (sessionStorage, so a reload remembers). */
function firstTimeInTab(key: string): boolean {
  try {
    const seen: string[] = JSON.parse(window.sessionStorage.getItem(AUTO_KEY) ?? "[]");
    if (seen.includes(key)) return false;
    window.sessionStorage.setItem(AUTO_KEY, JSON.stringify([...seen.slice(-49), key]));
    return true;
  } catch {
    // No storage (private mode): a reload may start again, which is what pressing Go would do.
    return true;
  }
}

export function useSmartAddAddress(): SmartAddAddressBinding {
  const pathname = usePathname();
  const search = useSearchParams();
  const router = useRouter();
  const address = parseSmartAddUrl(pathname, search);
  const [autoStart, setAutoStart] = useState(false);

  useEffect(() => {
    const a = parseSmartAddUrl(window.location.pathname, window.location.search);
    if (!a.mode || a.runs.length || !hasSmartAddPrefill(a)) return;
    const key = `${window.location.pathname}?${patchSmartAddSearch(new URLSearchParams(), { ...a.prefill, via: a.viaParam }).toString()}`;
    if (firstTimeInTab(key)) setAutoStart(true);
  }, []);

  // The address as this page last wrote it: Back out of the compare view keeps every run started meanwhile.
  const latest = useRef<string | null>(null);
  const pushedView = useRef(false);
  const write = (patch: SmartAddPatch) => {
    const next = patchSmartAddSearch(window.location.search, patch).toString();
    if (next === window.location.search.replace(/^\?/, "")) return;
    replaceAddressWithoutNavigating(currentPathWithSearch(next));
    latest.current = next;
  };
  const setView = (view: SmartAddView | null) => {
    const here = window.location.search.replace(/^\?/, "");
    const next = patchSmartAddSearch(here, { view }).toString();
    if (next === here) return;
    if (view) {
      pushedView.current = true;
      latest.current = next;
      pushAddressWithoutNavigating(currentPathWithSearch(next));
      // Back (the browser's or the close button's) lands on the entry before it opened: carry over what changed since.
      window.addEventListener(
        "popstate",
        () => {
          pushedView.current = false;
          if (!latest.current) return;
          const kept = patchSmartAddSearch(latest.current, { view: null }).toString();
          if (kept !== window.location.search.replace(/^\?/, "")) replaceAddressWithoutNavigating(currentPathWithSearch(kept));
        },
        { once: true },
      );
      return;
    }
    if (pushedView.current) return window.history.back();
    replaceAddressWithoutNavigating(currentPathWithSearch(next));
  };
  return {
    address,
    autoStart,
    setMode: (mode) => {
      if (mode === address.mode) return;
      router.push(`${smartAddPath(mode)}${window.location.search}`, { scroll: false });
    },
    setVia: (via) => {
      const next = patchSmartAddSearch(window.location.search, { via }).toString();
      if (next === window.location.search.replace(/^\?/, "")) return;
      pushAddressWithoutNavigating(currentPathWithSearch(next));
    },
    setView,
    write,
    markSearch: () => pushAddressWithoutNavigating(currentPathWithSearch(window.location.search.replace(/^\?/, ""))),
  };
}
