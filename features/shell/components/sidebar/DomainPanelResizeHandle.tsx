"use client";

// DomainPanelResizeHandle — the drag edge on the sidebar's right border. Drag to resize the
// domain panel (chats list); double-click resets to the default width. CSS shows it only while a
// domain panel is open (styles/shell.css `.shell-sidebar-resize`).

import type { KeyboardEvent, PointerEvent } from "react";
import {
  DOMAIN_PANEL_VAR,
  clampDomainPanelWidth,
  rememberDomainPanelWidth,
} from "./domain-panel-width";

const KEY_STEP_PX = 16;

function currentPanelWidth(): number {
  const root = document.querySelector<HTMLElement>(".shell-root");
  const rem = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
  const raw = root ? getComputedStyle(root).getPropertyValue("--shell-domain-panel-w").trim() : "";
  const n = parseFloat(raw);
  if (!Number.isFinite(n)) return 15 * rem;
  return raw.endsWith("rem") ? n * rem : n;
}

function applyWidth(px: number): number {
  const w = clampDomainPanelWidth(px);
  document.documentElement.style.setProperty(DOMAIN_PANEL_VAR, `${w}px`);
  return w;
}

export default function DomainPanelResizeHandle() {
  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    const target = event.currentTarget;
    target.setPointerCapture(event.pointerId);
    target.setAttribute("data-dragging", "");
    const html = document.documentElement;
    html.setAttribute("data-shell-resizing", "");
    const startX = event.clientX;
    const startW = currentPanelWidth();
    let latest = startW;
    const move = (e: globalThis.PointerEvent) => {
      latest = applyWidth(startW + e.clientX - startX);
    };
    const end = () => {
      target.removeEventListener("pointermove", move);
      target.removeEventListener("pointerup", end);
      target.removeEventListener("pointercancel", end);
      target.removeAttribute("data-dragging");
      html.removeAttribute("data-shell-resizing");
      rememberDomainPanelWidth(latest);
    };
    target.addEventListener("pointermove", move);
    target.addEventListener("pointerup", end);
    target.addEventListener("pointercancel", end);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    const delta = event.key === "ArrowRight" ? KEY_STEP_PX : -KEY_STEP_PX;
    rememberDomainPanelWidth(applyWidth(currentPanelWidth() + delta));
  };

  const onDoubleClick = () => {
    document.documentElement.style.removeProperty(DOMAIN_PANEL_VAR);
    rememberDomainPanelWidth(null);
  };

  return (
    <div
      className="shell-sidebar-resize"
      role="separator"
      aria-orientation="vertical"
      aria-label="Resize sidebar"
      tabIndex={0}
      onPointerDown={onPointerDown}
      onKeyDown={onKeyDown}
      onDoubleClick={onDoubleClick}
    />
  );
}
