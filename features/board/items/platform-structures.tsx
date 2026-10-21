/**
 * L1 skeletons (`BoardItemType.structure`) for the platform items: Schedule, Knowledge source,
 * Visual map, Report and Sandbox. Props only — each is its component with the words turned into
 * calm bars (see `structures.tsx`).
 */

import { CalendarClock, Database, FileText, Terminal } from "lucide-react";
import type { ComponentType } from "react";
import { Bar, Dot, Field, Glyph, Lines, Pad, Pill, Row, Rule, Stack, u } from "../components/lod/StructureKit";
import type { ItemStructureProps } from "./types";

type S = ComponentType<ItemStructureProps>;

/** A card: a heading bar over a few rows, bordered like the page's cards. */
function SkeletonCard({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <div className={`flex flex-col rounded-lg border border-border bg-card ${className ?? ""}`} style={{ padding: u(12), gap: u(9), borderWidth: u(1) }}>
      <Bar w="38%" h={8} strong />
      <Lines widths={["100%", "86%", "70%", "54%"].slice(0, lines)} gap={8} h={6} />
    </div>
  );
}

/** A schedule: the View / Edit toggle and action buttons over its spec, trigger and run history. */
export const ScheduleStructure: S = () => (
  <div className="flex h-full flex-col">
    <Row className="shrink-0 border-b border-border" gap={10} style={{ padding: `${u(10)} ${u(14)}` }}>
      <Pill w={92} h={26} />
      <div className="ml-auto flex" style={{ gap: u(8) }}>
        <Pill w={74} h={26} solid />
        <Pill w={60} h={26} />
        <Pill w={64} h={26} />
      </div>
    </Row>
    <Pad>
      <Row gap={10}>
        <Glyph icon={CalendarClock} size={18} accent />
        <Bar w="40%" h={11} strong />
      </Row>
      <Lines widths={["92%", "60%"]} gap={7} h={7} />
      <div className="grid grid-cols-2" style={{ gap: u(12) }}>
        <SkeletonCard lines={4} />
        <SkeletonCard lines={3} />
      </div>
      <SkeletonCard lines={4} />
    </Pad>
  </div>
);

/** A knowledge source: its name, kind and switches over the member table. */
export const KnowledgeSourceStructure: S = () => (
  <div className="flex h-full flex-col">
    <Stack gap={9} className="shrink-0 border-b border-border" style={{ padding: `${u(12)} ${u(16)}` }}>
      <Row gap={10}>
        <Glyph icon={Database} size={18} accent />
        <Bar w="36%" h={11} strong />
        <Pill w={54} h={18} />
      </Row>
      <Row gap={8}>
        <Pill w={70} h={24} solid />
        <Pill w={64} h={24} />
        <Pill w={58} h={24} />
      </Row>
    </Stack>
    <Pad>
      <Field h={30} barW="30%" />
      {[0, 1, 2, 3, 4].map((i) => (
        <Row key={i} gap={12} className="border-b border-border" style={{ paddingBottom: u(9) }}>
          <Glyph icon={FileText} size={14} />
          <Bar w={["44%", "52%", "38%", "48%", "34%"][i]} h={7} />
          <Bar w="14%" h={6} />
          <div className="ml-auto">
            <Pill w={48} h={16} />
          </div>
        </Row>
      ))}
    </Pad>
  </div>
);

/** A visual map: the name strip over a canvas of boxes joined by arrows. */
export const MapStructure: S = () => (
  <div className="flex h-full flex-col">
    <Row className="shrink-0 border-b border-border" gap={10} style={{ padding: `${u(10)} ${u(14)}` }}>
      <div className="flex-1">
        <Field h={28} barW="30%" />
      </div>
      <Bar w={64} h={6} />
    </Row>
    <div className="relative min-h-0 flex-1 overflow-hidden" style={{ backgroundImage: "radial-gradient(hsl(var(--border)) 1px, transparent 1px)", backgroundSize: `${u(18)} ${u(18)}` }}>
      {[
        { x: "8%", y: "14%" },
        { x: "40%", y: "14%" },
        { x: "72%", y: "14%" },
        { x: "24%", y: "52%" },
        { x: "58%", y: "52%" },
      ].map((b, i) => (
        <div key={i} className="absolute flex items-center rounded-lg border border-border bg-card" style={{ left: b.x, top: b.y, width: "22%", height: u(46), padding: u(10), borderWidth: u(1.5) }}>
          <Bar w="80%" h={7} />
        </div>
      ))}
      {[
        { x: "30%", y: "21%", w: "10%" },
        { x: "62%", y: "21%", w: "10%" },
        { x: "46%", y: "60%", w: "12%" },
      ].map((a, i) => (
        <div key={i} className="absolute" style={{ left: a.x, top: a.y, width: a.w }}>
          <Rule />
        </div>
      ))}
    </div>
  </div>
);

/** A report: its header with refresh over a rollup table beside a detail pane. */
export const ReportStructure: S = () => (
  <div className="flex h-full flex-col">
    <Row className="shrink-0 border-b border-border" gap={10} style={{ padding: `${u(10)} ${u(14)}` }}>
      <Bar w="22%" h={10} strong />
      <div className="ml-auto">
        <Pill w={74} h={26} />
      </div>
    </Row>
    <div className="flex min-h-0 flex-1">
      <Stack gap={10} className="w-1/2 border-r border-border" style={{ padding: u(14) }}>
        <Row gap={8}>
          <Pill w={50} h={18} />
          <Pill w={50} h={18} />
          <Pill w={50} h={18} />
        </Row>
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <Row key={i} gap={10}>
            <Dot size={18} />
            <Bar w={["48%", "40%", "54%", "36%", "44%", "50%"][i]} h={7} />
            <div className="ml-auto flex" style={{ gap: u(6) }}>
              <Pill w={22} h={16} />
              <Pill w={22} h={16} />
            </div>
          </Row>
        ))}
      </Stack>
      <div className="flex flex-1 items-center justify-center">
        <Bar w="46%" h={7} />
      </div>
    </div>
  </div>
);

/** A sandbox: its name, status and actions over the cards and the terminal. */
export const SandboxStructure: S = () => (
  <div className="flex h-full flex-col">
    <Row className="shrink-0 border-b border-border" gap={10} style={{ padding: `${u(10)} ${u(14)}` }}>
      <Bar w="26%" h={10} strong />
      <Pill w={58} h={20} />
      <div className="ml-auto flex" style={{ gap: u(8) }}>
        <Pill w={46} h={26} />
        <Pill w={54} h={26} />
        <Pill w={64} h={26} />
      </div>
    </Row>
    <Pad>
      <Bar w="30%" h={6} />
      <div className="grid grid-cols-3" style={{ gap: u(12) }}>
        <SkeletonCard lines={2} />
        <SkeletonCard lines={2} />
        <SkeletonCard lines={2} />
      </div>
      <div className="flex min-h-0 flex-1 flex-col rounded-lg border border-border bg-card" style={{ padding: u(12), gap: u(8), borderWidth: u(1) }}>
        <Row gap={8}>
          <Glyph icon={Terminal} size={14} />
          <Bar w="22%" h={7} strong />
        </Row>
        <Lines widths={["70%", "52%", "84%", "40%"]} gap={8} h={6} />
        <div className="mt-auto">
          <Field h={28} action />
        </div>
      </div>
    </Pad>
  </div>
);
