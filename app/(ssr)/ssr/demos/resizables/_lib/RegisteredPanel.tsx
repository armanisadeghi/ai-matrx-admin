"use client";

import { useEffect } from "react";
import {
  Panel,
  usePanelRef,
  type PanelProps,
  type OnPanelResize,
} from "react-resizable-panels";
import { usePanelControls } from "./PanelControlProvider";

interface Props extends Omit<PanelProps, "panelRef" | "onResize"> {
  /** Logical name used by usePanelControls()/header buttons. */
  registerAs: string;
}

// Wraps <Panel> with two responsibilities:
//   1. Acquire a usePanelRef and publish it to PanelControlProvider so a button
//      anywhere in the tree (including portaled PageHeader content) can call
//      .collapse() / .expand() on it.
//   2. Detect collapse transitions inside onResize (compare prev vs next size)
//      and update the boolean intent in context, so toggle icons flip even
//      when the user drags below minSize and triggers an auto-collapse.
//
// `children` is passed straight through to <Panel> — Server Components are
// fine here, RSC composition allows it.
export function RegisteredPanel({ registerAs, children, ...rest }: Props) {
  const ref = usePanelRef();
  const { register, setCollapsed } = usePanelControls();

  useEffect(() => {
    register(registerAs, ref);
  }, [register, registerAs, ref]);

  const trackCollapse: OnPanelResize = (next, _id, prev) => {
    if (prev === undefined) return;
    const wasCollapsed = prev.asPercentage === 0;
    const isCollapsed = next.asPercentage === 0;
    if (wasCollapsed !== isCollapsed) setCollapsed(registerAs, isCollapsed);
  };

  return (
    <Panel {...rest} panelRef={ref} onResize={trackCollapse}>
      {children}
    </Panel>
  );
}
