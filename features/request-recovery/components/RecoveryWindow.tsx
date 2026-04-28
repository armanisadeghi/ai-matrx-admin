/**
 * Recovery Window — thin client shell.
 *
 * Statically importable from anywhere (server or client tree). Returns
 * `null` when no recovery dialog is requested. The heavy body (Dialog +
 * lucide icons + Button + Textarea + sonner) lives in
 * `RecoveryWindowImpl.tsx` and is `next/dynamic`-loaded ONLY on first
 * `isOpen === true`, so the chunk never enters the static graph of any
 * route and never even fetches for users who don't open the panel.
 */

"use client";

import dynamic from "next/dynamic";
import { useRequestRecovery } from "../providers/RequestRecoveryProvider";

const RecoveryWindowImpl = dynamic(() => import("./RecoveryWindowImpl"), {
  ssr: false,
  loading: () => null,
});

export function RecoveryWindow() {
  const { isOpen } = useRequestRecovery();
  if (!isOpen) return null;
  return <RecoveryWindowImpl />;
}
