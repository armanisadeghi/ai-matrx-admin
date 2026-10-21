"use client";

/**
 * THE SETTLED UI SYSTEM, all at once (owner-accepted decisions, 2026-10-02/03)
 * composed as one product page so it can be judged as a whole. Built from THE
 * controls (`@ai-matrx/design-system/controls`) and `toast-system.tsx`.
 *
 * The page obeys what it shows: one surface level, sections split by
 * hairlines, 12px phone gutters (24px from sm), space between groups and
 * never padding inside padding. The whole page sits in the 28px scope with
 * matched inner padding.
 */

import { useEffect, useRef, useState } from "react";
import { Controls } from "./controls";
import { Data } from "./data";
import { Feedback } from "./feedback";
import { Foundations } from "./foundations";

import { Navigation } from "./navigation";
import { States } from "./states";
import { ControlScope, Tabs } from "@ai-matrx/design-system/controls";

const SECTIONS = [
  { value: "foundations", label: "Foundations" },
  { value: "controls", label: "Controls" },
  { value: "data", label: "Data" },
  { value: "states", label: "States" },
  { value: "feedback", label: "Feedback" },
  { value: "navigation", label: "Navigation" },
] as const;

type SectionId = (typeof SECTIONS)[number]["value"];

export function SystemPage() {
  const [active, setActive] = useState<SectionId>("foundations");
  const scroller = useRef<HTMLDivElement>(null);
  // The tabs follow the reading position: the section whose top last passed under the sticky
  // header is the active one (they stayed on Foundations for the whole page before).
  useEffect(() => {
    const root = scroller.current;
    if (!root) return;
    const onScroll = () => {
      const header = root.querySelector("header")?.getBoundingClientRect().bottom ?? 0;
      let current: SectionId = SECTIONS[0].value;
      for (const s of SECTIONS) {
        const top = document.getElementById(s.value)?.getBoundingClientRect().top;
        if (top !== undefined && top - header <= 24) current = s.value;
      }
      if (root.scrollTop + root.clientHeight >= root.scrollHeight - 2) current = SECTIONS[SECTIONS.length - 1].value;
      setActive(current);
    };
    onScroll();
    root.addEventListener("scroll", onScroll, { passive: true });
    return () => root.removeEventListener("scroll", onScroll);
  }, []);
  const jump = (id: SectionId) => {
    setActive(id);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  return (
    <div ref={scroller} className="h-full w-full overflow-y-auto overflow-x-hidden bg-background">
      <ControlScope>
        <header className="sticky top-0 z-10 bg-background/95 backdrop-blur">
          <div className="mx-auto flex max-w-6xl items-baseline gap-2 px-3 pt-2 sm:px-6">
            <h1 className="text-[0.8125rem] font-semibold text-foreground">UI system</h1>
            <span className="text-[0.6875rem] text-muted-foreground">Settled decisions, one page</span>
          </div>
          <div className="mx-auto max-w-6xl px-3 sm:px-6">
            <Tabs aria-label="Sections" value={active} onValueChange={jump} data={SECTIONS} />
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-3 pb-16 sm:px-6">
          <Foundations />
          <Controls />
          <Data />
          <States />
          <Feedback />
          <Navigation />
        </main>
      </ControlScope>
    </div>
  );
}
