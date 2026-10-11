"use client";

/**
 * usePushDevice — React face of lib/pwa/push.ts for one browser.
 * Every surface that turns push on/off (notification settings, the study
 * reminder ask) uses this; nobody calls the PushManager directly.
 */

import { useEffect, useState } from "react";
import { toast } from "@/lib/toast";
import {
  disablePushOnThisDevice,
  enablePushOnThisDevice,
  pushAvailability,
  readPushDeviceState,
  type PushAvailability,
  type PushDeviceState,
} from "@/lib/pwa/push";

export interface PushDevice {
  availability: PushAvailability;
  state: PushDeviceState | null;
  busy: boolean;
  enable: () => Promise<PushDeviceState | null>;
  disable: () => Promise<void>;
}

export function usePushDevice(): PushDevice {
  const [availability, setAvailability] = useState<PushAvailability>("unsupported");
  const [state, setState] = useState<PushDeviceState | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setAvailability(pushAvailability());
    readPushDeviceState()
      .then((s) => {
        if (!cancelled) setState(s);
      })
      .catch((err: unknown) => {
        console.error("[push] could not read this browser's push state:", err);
        if (!cancelled) setState("off");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const enable = async (): Promise<PushDeviceState | null> => {
    setBusy(true);
    try {
      const next = await enablePushOnThisDevice();
      setState(next);
      if (next === "blocked") {
        toast.error("Notifications are blocked for this site in your browser settings.");
      }
      return next;
    } catch (err) {
      console.error("[push] turning push on failed:", err);
      toast.error(err instanceof Error ? err.message : "Could not turn on reminders.");
      return null;
    } finally {
      setBusy(false);
    }
  };

  const disable = async (): Promise<void> => {
    setBusy(true);
    try {
      setState(await disablePushOnThisDevice());
    } catch (err) {
      console.error("[push] turning push off failed:", err);
      toast.error(err instanceof Error ? err.message : "Could not turn off reminders.");
    } finally {
      setBusy(false);
    }
  };

  return { availability, state, busy, enable, disable };
}
