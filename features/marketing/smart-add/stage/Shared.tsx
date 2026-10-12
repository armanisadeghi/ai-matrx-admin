"use client";

/**
 * Shared elements of the Smart Add morph. A finding shown on the intake stage (its logo, its name,
 * an account's photo) and the same finding on the structured page carry the same `layoutId`, so the
 * moment the stage gives way the element flies from where it sat to its new home (motion layout
 * projection). Under prefers-reduced-motion `MotionConfig reducedMotion="user"` makes it a swap.
 */

import type { ReactNode } from "react";
import { motion } from "motion/react";

/** Marks a shared element, so the page's rise-in leaves it (and its ancestors' opacity) alone. */
export const SHARED_ATTR = "data-smart-add-shared";

/** One shared flight: the panel motion pace, a touch longer so the eye can follow it. */
export const FLIGHT = { duration: 0.72, ease: [0.4, 0, 0.2, 1] as const };

export function sharedId(key: string): string {
  return `smart-add:${key}`;
}

export function Shared({
  id,
  children,
  className,
  as = "span",
}: {
  /** The evidence item key (or a fixed element name like "signals"). */
  id: string;
  children: ReactNode;
  className?: string;
  as?: "span" | "div";
}) {
  const Tag = as === "div" ? motion.div : motion.span;
  return (
    <Tag layoutId={sharedId(id)} transition={FLIGHT} className={`relative z-10 ${className ?? ""}`} {...{ [SHARED_ATTR]: "" }}>
      {children}
    </Tag>
  );
}

/**
 * The structured page's arrival: once the shared elements have flown, everything else rises in.
 * Containers that hold a shared element are never faded themselves (that would hide the flight);
 * their other children rise instead.
 */
export function riseIn(page: HTMLElement | null) {
  if (!page || typeof page.animate !== "function") return;
  if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
  let i = 0;
  const delay = FLIGHT.duration * 1000 * 0.55;
  const rise = (el: Element) => {
    if (!(el instanceof HTMLElement) || el.hasAttribute(SHARED_ATTR)) return;
    if (el.querySelector(`[${SHARED_ATTR}]`)) {
      Array.from(el.children).forEach(rise);
      return;
    }
    el.animate(
      [
        { opacity: 0, transform: "translateY(14px)" },
        { opacity: 1, transform: "none" },
      ],
      { duration: 520, delay: delay + Math.min(i++, 14) * 45, easing: "cubic-bezier(0.2, 0.8, 0.2, 1)", fill: "backwards" },
    );
  };
  Array.from(page.children).forEach(rise);
}
