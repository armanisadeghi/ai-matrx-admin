"use client";

// THE open-on-mount Controller for openers whose open logic is their own. Its own module (React only, no
// summon import) so a Controller never drags createOpener into a route's first load.
import { useEffect, useRef } from "react";

function propsSignature(props: unknown): string {
  try {
    return JSON.stringify(props, (_key, value) => (typeof value === "function" ? undefined : value));
  } catch {
    return String(Date.now());
  }
}

/**
 * The open-on-mount Controller for an opener whose open logic is its own (callback groups, thunks,
 * computed ids): opens through `useOpen()` on mount, closes on unmount, re-opens when the serialisable
 * props change (functions never reopen). Openers built by `appOpener` use summon's Controller instead;
 * this is the one Controller for the rest, so no opener hand-writes the effect.
 */
export function hookController<Props, OpenArg = Props>(
  useOpen: () => ((options: OpenArg) => { close(): void }) | null,
  toOptions?: (props: Props) => OpenArg,
): (props: Props) => null {
  return function OpenerController(props: Props): null {
    const open = useOpen();
    const latest = useRef(props);
    latest.current = props;
    const signature = propsSignature(props);
    useEffect(() => {
      if (!open) return undefined;
      const current = latest.current;
      const handle = open(toOptions ? toOptions(current) : (current as unknown as OpenArg));
      return () => handle.close();
    }, [open, signature]);
    return null;
  };
}
