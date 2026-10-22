"use client";

// ShellHeaderButtons — THE HEADER CONTROL SET in the order and selection of THE LAYOUT, plus the person's
// own header buttons (custom-experience §5.3).
//
// The five controls are rendered on the server by `HeaderControlSet` and handed in as `controls`; this
// island only orders them. With no saved layout the order is the default (Search, Intelligence, Messages,
// Notifications, Canvas), so the row is exactly the old one. Custom buttons are the same 44px transparent
// tap targets, touching, no gap — the row height never changes. Search and Notifications can never
// disappear (the resolver puts them back). A `mandate` button opens that fixed job in place through the
// one mandate door — never a raw agent id, never a link.

import { Fragment, type ReactNode } from "react";
import { TapTargetButtonTransparent } from "@ai-matrx/design-system/tap-target";
import type { AnyMandateKey } from "@ai-matrx/agents/mandates";
import ShellIcon from "../ShellIcon";
import { useRunNavTile } from "../../navigation/navPanelActions";
import type { HeaderControlId } from "@/features/shell/shell-layout/contract";
import type { ResolvedHeaderButton } from "@/features/shell/shell-layout/resolve";
import { useResolvedShellLayout } from "@/features/shell/shell-layout/useResolvedShellLayout";
import { useLazyAppOpener } from "@/features/overlays/useLazyAppOpener";

/** One custom header button (a destination, a tile or a mandate). Shared with the phone fold. */
export function useRunHeaderButton(): (button: Exclude<ResolvedHeaderButton, { kind: "control" }>) => void {
  const runTile = useRunNavTile();
  const openMandate = useLazyAppOpener("mandateWindow", () =>
    import("@/features/overlays/definitions/mandateWindow.overlay").then((m) => m.createMandateWindowOpener),
  );
  return (button) => {
    if (button.kind === "mandate") {
      // The stored key is a declared mandate key chosen in the editor; the window refuses an unknown one by name.
      openMandate({ initialMandateKey: button.mandateKey as AnyMandateKey, mandateKeys: [button.mandateKey as AnyMandateKey] });
    } else if (button.tileId) {
      runTile(button.tileId);
    }
  };
}

function CustomHeaderButton({ button }: { button: Exclude<ResolvedHeaderButton, { kind: "control" }> }) {
  const run = useRunHeaderButton();
  const icon = <ShellIcon name={button.iconName} />;
  if (button.kind === "destination" && !button.tileId) {
    return (
      <TapTargetButtonTransparent
        icon={icon}
        ariaLabel={button.label}
        href={button.href}
        prefetch={false}
        {...(button.openInNewTab || button.external ? { target: "_blank" as const } : {})}
      />
    );
  }
  return <TapTargetButtonTransparent icon={icon} ariaLabel={button.label} onClick={() => run(button)} />;
}

export function ShellHeaderButtons({ controls }: { controls: Record<HeaderControlId, ReactNode> }) {
  const layout = useResolvedShellLayout();
  return (
    <>
      {layout.header.map((button) =>
        button.kind === "control" ? (
          // A built-in control, unwrapped: no DOM of its own, so the row is exactly the old markup.
          <Fragment key={button.id}>{controls[button.control]}</Fragment>
        ) : (
          <CustomHeaderButton key={button.id} button={button} />
        ),
      )}
    </>
  );
}
