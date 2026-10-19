"use client";

import { createContext } from "react";

/**
 * A storeless host's answer to "is a person signed in?". The light public layout mounts no Redux
 * store for a guest (PUBLIC-LAYOUT-PERF); it states `false` here so `useSignedIn` never mistakes the
 * missing store for a signed-in harness. `null` = no host said anything.
 */
export const SignedInHintContext = createContext<boolean | null>(null);
