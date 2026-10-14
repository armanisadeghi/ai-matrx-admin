"use client";

/**
 * The Smart Add page's binding to its address (smartAddUrl.ts is the grammar).
 *
 * - mode (company ↔ person) is a ROUTE change: `router.push`, so Back returns to the other mode;
 * - the way in (`via`) is pushed without navigating (Back closes the card);
 * - typed fields, run ids and the view are REPLACED without navigating (no history spam, no RSC fetch).
 *
 * Auto-start: a link that carries a prefill starts searching on open (it spends points, like Go) —
 * once per address per tab. A reload, Back/Forward or a duplicate tab never starts a second run;
 * an address with `run=` resumes its runs instead.
 */
import { useEffect, useState } from "react";
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
} from "./smartAddUrl";

export interface SmartAddAddressBinding {
  address: SmartAddAddress;
  /** True (once, after mount) when this arrival is a link that should start searching. */
  autoStart: boolean;
  setMode: (mode: SmartAddMode) => void;
  setVia: (via: SmartAddVia | null) => void;
  /** Replace this module's keys in the address (`undefined` keeps, `null` removes). */
  write: (patch: SmartAddPatch) => void;
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

  const write = (patch: SmartAddPatch) => {
    const next = patchSmartAddSearch(window.location.search, patch).toString();
    if (next === window.location.search.replace(/^\?/, "")) return;
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
    write,
  };
}
