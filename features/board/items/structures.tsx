/**
 * Every item type's L1 skeleton (`BoardItemType.structure`; the ladder in `engine/lod.ts`). Each one is
 * the type's own component with its words turned into calm bars — "a placeholder for text, kind of like
 * a loading component" (Arman, 2026-10-19) — its chrome, fields, avatars, grid lines and icons kept.
 * Props only: nothing here reads a store, fetches, or mounts feature code. Units are `--lod-u` (`u()`).
 */

import {
  AtSign,
  Bold,
  CalendarDays,
  CheckSquare,
  ChevronDown,
  Circle,
  FileText,
  Filter,
  Globe,
  Heart,
  Image as ImageIcon,
  Italic,
  Layers,
  Link2,
  List,
  MessageCircle,
  Mic,
  Play,
  Plus,
  Search,
  Share2,
  Square,
  Underline,
  Video,
} from "lucide-react";
import type { ComponentType } from "react";
import { Bar, Dot, Field, Glyph, Lines, Media, Pad, Pill, Row, Rule, Stack, accentFill, u } from "../components/lod/StructureKit";
import type { ItemStructureProps } from "./types";

type S = ComponentType<ItemStructureProps>;

// ── conversations ─────────────────────────────────────────────────────────────

/** A user turn: a tinted bubble at the right. */
function UserBubble({ w = "62%", lines = 1 }: { w?: string; lines?: number }) {
  return (
    <div className="flex shrink-0 justify-end">
      <div className="flex flex-col rounded-2xl" style={{ width: w, padding: u(10), gap: u(7), background: accentFill(0.12) }}>
        {Array.from({ length: lines }, (_, i) => (
          <Bar key={i} w={i === lines - 1 && lines > 1 ? "64%" : "100%"} h={7} />
        ))}
      </div>
    </div>
  );
}

/** An assistant turn: plain prose at the left, as the chat column draws it. */
function AssistantTurn({ widths }: { widths: readonly string[] }) {
  return <Lines widths={widths} gap={8} h={7} />;
}

export const ChatStructure: S = () => (
  <div className="flex h-full flex-col">
    <div className="flex min-h-0 flex-1 flex-col justify-end overflow-hidden" style={{ paddingInline: u(16), paddingTop: u(12), gap: u(16) }}>
      <UserBubble w="58%" />
      <AssistantTurn widths={["100%", "97%", "91%", "55%"]} />
      <UserBubble w="70%" lines={2} />
      <AssistantTurn widths={["100%", "94%", "99%", "88%", "40%"]} />
    </div>
    <div className="shrink-0" style={{ padding: u(12) }}>
      <div className="rounded-2xl border border-border bg-background" style={{ padding: u(10), borderWidth: u(1) }}>
        <Bar w="38%" h={7} />
        <Row className="justify-between" style={{ marginTop: u(14) }}>
          <Row gap={10}>
            <Glyph icon={Plus} size={16} />
            <Glyph icon={AtSign} size={16} />
          </Row>
          <Row gap={10}>
            <Glyph icon={Mic} size={16} />
            <div className="rounded-full" style={{ width: u(26), height: u(26), background: accentFill(0.85) }} />
          </Row>
        </Row>
      </div>
    </div>
  </div>
);

/** An agent's form: labelled fields and the run button. */
export const AgentFormStructure: S = () => (
  <Pad>
    <Bar w="46%" h={11} strong />
    {[0, 1, 2].map((i) => (
      <Stack key={i} gap={6}>
        <Bar w={i === 1 ? "22%" : "30%"} h={6} />
        <Field h={i === 2 ? 64 : 32} barW={i === 2 ? "70%" : "40%"} />
      </Stack>
    ))}
    <Row className="justify-end">
      <Pill w={84} h={28} solid />
    </Row>
  </Pad>
);

/** A War Room: the people in the room, the shared thread, the composer. */
export const WarRoomStructure: S = () => (
  <div className="flex h-full flex-col">
    <Row gap={6} style={{ padding: u(12) }}>
      {[0, 1, 2, 3].map((i) => (
        <Dot key={i} size={26} />
      ))}
      <Bar w={70} h={7} style={{ marginLeft: u(6) }} />
    </Row>
    <Rule />
    <div className="flex min-h-0 flex-1 flex-col justify-end overflow-hidden" style={{ padding: u(14), gap: u(14) }}>
      {[0, 1, 2].map((i) => (
        <Row key={i} gap={10} className="items-start">
          <Dot size={24} />
          <Stack gap={7} className="flex-1">
            <Bar w="24%" h={6} strong />
            <Lines widths={i === 1 ? ["100%", "70%"] : ["96%", "88%", "52%"]} gap={7} h={7} />
          </Stack>
        </Row>
      ))}
    </div>
    <div style={{ padding: u(12) }}>
      <Field h={38} action />
    </div>
  </div>
);

// ── notes & docs ──────────────────────────────────────────────────────────────

/** A formatting toolbar silhouette: the editor's own icons. */
function EditorToolbar() {
  return (
    <Row gap={12} style={{ paddingInline: u(16), height: u(36) }}>
      <Glyph icon={Bold} size={14} />
      <Glyph icon={Italic} size={14} />
      <Glyph icon={Underline} size={14} />
      <Rule vertical />
      <Glyph icon={List} size={14} />
      <Glyph icon={CheckSquare} size={14} />
      <Glyph icon={Link2} size={14} />
    </Row>
  );
}

export const NoteStructure: S = () => (
  <div className="flex h-full flex-col">
    <EditorToolbar />
    <Rule />
    <Pad>
      <Lines widths={["100%", "98%", "93%", "61%"]} />
      <Lines widths={["96%", "100%", "84%"]} />
      <Stack gap={9}>
        {[0, 1, 2].map((i) => (
          <Row key={i} gap={8}>
            <div className="shrink-0 rounded-full bg-border" style={{ width: u(5), height: u(5) }} />
            <Bar w={["70%", "58%", "76%"][i]} />
          </Row>
        ))}
      </Stack>
      <Lines widths={["100%", "90%", "45%"]} />
    </Pad>
  </div>
);

/** A document: a page on its desk, with the editor's toolbar above it. */
export const DocumentStructure: S = () => (
  <div className="flex h-full flex-col bg-muted">
    <div className="bg-card">
      <EditorToolbar />
      <Rule />
    </div>
    <div className="min-h-0 flex-1 overflow-hidden" style={{ paddingInline: u(24), paddingTop: u(16) }}>
      <div className="h-full rounded-t-md bg-card shadow-sm" style={{ padding: u(24) }}>
        <Stack gap={16}>
          <Bar w="60%" h={14} strong />
          <Lines />
          <Lines widths={["100%", "94%", "72%"]} />
          <Bar w="40%" h={10} strong />
          <Lines widths={["98%", "100%", "56%"]} />
        </Stack>
      </div>
    </div>
  </div>
);

/** A write-up: an article — title, byline, prose. */
export const WriteUpStructure: S = () => (
  <Pad x={20} y={18}>
    <Bar w="72%" h={14} strong />
    <Row gap={8}>
      <Dot size={18} />
      <Bar w="28%" h={6} />
    </Row>
    <Lines />
    <Lines widths={["100%", "92%", "97%", "48%"]} />
    <Lines widths={["94%", "60%"]} />
  </Pad>
);

/** A cover: the hero block in the board's color, then the opening prose. */
export const CoverStructure: S = () => (
  <div className="flex h-full flex-col overflow-hidden">
    <div className="flex shrink-0 flex-col justify-end" style={{ height: "52%", padding: u(24), gap: u(12), background: accentFill(0.16) }}>
      <Bar w="64%" h={20} strong />
      <Bar w="42%" h={9} />
    </div>
    <Pad x={24} y={18}>
      <Lines />
      <Lines widths={["98%", "86%", "40%"]} />
    </Pad>
  </div>
);

// ── files & media ─────────────────────────────────────────────────────────────

export const FileStructure: S = () => (
  <div className="flex h-full flex-col items-center justify-center" style={{ gap: u(14), padding: u(16) }}>
    <div className="flex items-center justify-center rounded-xl" style={{ width: u(64), height: u(76), background: accentFill(0.12) }}>
      <Glyph icon={FileText} size={30} accent />
    </div>
    <Bar w="46%" h={8} strong />
    <Bar w="28%" h={6} />
  </div>
);

export const ImageStructure: S = () => (
  <div className="h-full" style={{ padding: u(8) }}>
    <Media icon={ImageIcon} className="h-full" />
  </div>
);

/** A web page: the browser's frame, then the page's blocks. */
export const WebPageStructure: S = () => (
  <div className="flex h-full flex-col">
    <Row gap={8} style={{ paddingInline: u(12), height: u(34) }} className="bg-muted">
      <Glyph icon={Globe} size={14} />
      <div className="flex flex-1 items-center rounded-full bg-background" style={{ height: u(20), paddingInline: u(10) }}>
        <Bar w="44%" h={6} />
      </div>
    </Row>
    <Pad x={18}>
      <Row className="justify-between">
        <Bar w="22%" h={9} strong />
        <Row gap={10}>
          <Bar w={34} h={6} />
          <Bar w={34} h={6} />
          <Bar w={34} h={6} />
        </Row>
      </Row>
      <Media icon={ImageIcon} ratio="16 / 6" />
      <Bar w="58%" h={12} strong />
      <Lines widths={["100%", "95%", "70%"]} />
      <Row gap={12}>
        <Media ratio="4 / 3" />
        <Media ratio="4 / 3" />
        <Media ratio="4 / 3" />
      </Row>
    </Pad>
  </div>
);

/** Any app page in a frame: its page header and content blocks. */
export const PageStructure: S = () => (
  <div className="flex h-full flex-col">
    <Row gap={10} style={{ paddingInline: u(16), height: u(40) }}>
      <Bar w="26%" h={9} strong />
      <div className="ml-auto" />
      <Pill w={60} h={22} />
      <Pill w={60} h={22} solid />
    </Row>
    <Rule />
    <Pad>
      <Row gap={12}>
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex flex-1 flex-col rounded-lg border border-border" style={{ padding: u(10), gap: u(8), borderWidth: u(1) }}>
            <Bar w="50%" h={6} />
            <Bar w="34%" h={12} strong />
          </div>
        ))}
      </Row>
      <TableRows rows={5} cols={3} />
    </Pad>
  </div>
);

// ── data ──────────────────────────────────────────────────────────────────────

/** A header row and grid rows of cells, separated by the table's own lines. */
function TableRows({ rows, cols }: { rows: number; cols: number }) {
  const widths = ["72%", "54%", "80%", "40%", "64%"];
  return (
    <div className="flex min-h-0 flex-col overflow-hidden rounded-md border border-border" style={{ borderWidth: u(1) }}>
      <div className="grid shrink-0 bg-muted" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)`, height: u(30), alignItems: "center", paddingInline: u(10), gap: u(12) }}>
        {Array.from({ length: cols }, (_, c) => (
          <Bar key={c} w="56%" h={6} strong />
        ))}
      </div>
      {Array.from({ length: rows }, (_, r) => (
        <div
          key={r}
          className="grid shrink-0 border-t border-border"
          style={{ gridTemplateColumns: `repeat(${cols}, 1fr)`, height: u(32), alignItems: "center", paddingInline: u(10), gap: u(12), borderTopWidth: u(1) }}
        >
          {Array.from({ length: cols }, (_, c) => (
            <Bar key={c} w={widths[(r + c * 2) % widths.length]} h={6} />
          ))}
        </div>
      ))}
    </div>
  );
}

export const TableStructure: S = () => (
  <Pad>
    <Row gap={8}>
      <div className="flex flex-1 items-center rounded-md border border-border" style={{ height: u(28), paddingInline: u(8), gap: u(6), borderWidth: u(1) }}>
        <Glyph icon={Search} size={13} />
        <Bar w="30%" h={6} />
      </div>
      <Glyph icon={Filter} size={14} />
      <Pill w={58} h={26} solid />
    </Row>
    <TableRows rows={12} cols={4} />
  </Pad>
);

/** A workbook: the formula bar, column letters, row numbers and the cell grid, with the sheet tabs below. */
export const WorkbookStructure: S = () => {
  const cols = 6;
  const rows = 14;
  const cell = { height: u(24), borderRightWidth: u(1), borderBottomWidth: u(1) } as const;
  return (
    <div className="flex h-full flex-col">
      <Row gap={8} style={{ paddingInline: u(10), height: u(32) }}>
        <Bar w={30} h={7} strong />
        <Rule vertical />
        <Bar w="40%" h={7} />
      </Row>
      <div className="grid min-h-0 flex-1 overflow-hidden border-t border-border" style={{ gridTemplateColumns: `${u(34)} repeat(${cols}, 1fr)`, alignContent: "start", borderTopWidth: u(1) }}>
        {Array.from({ length: (rows + 1) * (cols + 1) }, (_, i) => {
          const r = Math.floor(i / (cols + 1));
          const c = i % (cols + 1);
          const head = r === 0 || c === 0;
          return (
            <div key={i} className={head ? "flex items-center justify-center border-border bg-muted" : "flex items-center border-border"} style={{ ...cell, borderStyle: "solid", borderTopWidth: 0, borderLeftWidth: 0, paddingInline: u(6) }}>
              {head ? (r === 0 && c === 0 ? null : <Bar w={c === 0 ? 10 : 12} h={6} strong />) : (r + c) % 3 === 0 ? <Bar w={(r * c) % 2 ? "70%" : "45%"} h={6} /> : null}
            </div>
          );
        })}
      </div>
      <Row gap={6} style={{ paddingInline: u(10), height: u(28) }} className="border-t border-border">
        <div className="rounded-md bg-card" style={{ boxShadow: `inset 0 0 0 ${u(1)} hsl(var(--border))`, padding: `${u(4)} ${u(10)}` }}>
          <Bar w={36} h={6} accent />
        </div>
        <Bar w={36} h={6} />
        <Glyph icon={Plus} size={12} />
      </Row>
    </div>
  );
};

/** One record: label over value, down the page. */
export const RecordStructure: S = () => (
  <Pad>
    <Bar w="48%" h={12} strong />
    {[0, 1, 2, 3, 4, 5].map((i) => (
      <Stack key={i} gap={6}>
        <Bar w="18%" h={5} />
        <Bar w={["52%", "34%", "70%", "44%", "60%", "28%"][i]} h={8} strong />
      </Stack>
    ))}
  </Pad>
);

/** A pick list: its choices, each with its swatch. */
export const PickListStructure: S = () => (
  <Pad>
    {[0, 1, 2, 3, 4, 5, 6].map((i) => (
      <Row key={i} gap={10}>
        <div className="shrink-0 rounded-full" style={{ width: u(10), height: u(10), background: accentFill(0.3 + (i % 3) * 0.2) }} />
        <Bar w={["40%", "56%", "32%", "48%", "62%", "36%", "44%"][i]} />
      </Row>
    ))}
  </Pad>
);

// ── work ──────────────────────────────────────────────────────────────────────

export const TaskStructure: S = () => (
  <Pad>
    <Row gap={10}>
      <div className="shrink-0 rounded-full border-border" style={{ width: u(18), height: u(18), borderWidth: u(2), borderStyle: "solid" }} />
      <Bar w="60%" h={11} strong />
    </Row>
    <Row gap={8}>
      <Pill w={64} h={20} />
      <Row gap={6}>
        <Glyph icon={CalendarDays} size={13} />
        <Bar w={44} h={6} />
      </Row>
      <Dot size={20} />
    </Row>
    <Lines widths={["100%", "88%"]} />
    <Stack gap={10}>
      {[0, 1, 2, 3].map((i) => (
        <Row key={i} gap={10}>
          <div className="shrink-0 rounded border-border" style={{ width: u(14), height: u(14), borderWidth: u(1.5), borderStyle: "solid", ...(i === 0 ? { background: accentFill(0.85), borderColor: "transparent" } : null) }} />
          <Bar w={["46%", "58%", "38%", "52%"][i]} />
        </Row>
      ))}
    </Stack>
  </Pad>
);

/** A project: progress, then its tasks. */
export const ProjectStructure: S = () => (
  <Pad>
    <Row className="justify-between">
      <Bar w="40%" h={11} strong />
      <Bar w={36} h={7} />
    </Row>
    <div className="w-full overflow-hidden rounded-full bg-muted" style={{ height: u(6) }}>
      <div className="h-full rounded-full" style={{ width: "42%", background: accentFill(0.85) }} />
    </div>
    {[0, 1, 2, 3, 4].map((i) => (
      <Row key={i} gap={10}>
        <Glyph icon={i < 2 ? CheckSquare : Square} size={14} accent={i < 2} />
        <Bar w={["52%", "38%", "60%", "44%", "30%"][i]} />
        <div className="ml-auto">
          <Dot size={18} />
        </div>
      </Row>
    ))}
  </Pad>
);

/** A workflow run: its steps as pills down a line. */
export const WorkflowRunStructure: S = () => (
  <Pad>
    <Row className="justify-between">
      <Bar w="36%" h={10} strong />
      <Pill w={60} h={20} />
    </Row>
    <div className="relative flex flex-col" style={{ gap: u(14), paddingLeft: u(4) }}>
      <div className="absolute bg-border" style={{ left: u(13), top: u(10), bottom: u(10), width: u(2) }} />
      {[0, 1, 2, 3, 4].map((i) => (
        <Row key={i} gap={12} className="relative">
          <div className="flex shrink-0 items-center justify-center rounded-full bg-card" style={{ width: u(20), height: u(20), boxShadow: `inset 0 0 0 ${u(2)} ${i < 3 ? accentFill(0.85) : "hsl(var(--border))"}` }}>
            {i < 3 && <div className="rounded-full" style={{ width: u(8), height: u(8), background: accentFill(0.85) }} />}
          </div>
          <div className="flex flex-1 items-center rounded-full border border-border" style={{ height: u(28), paddingInline: u(12), borderWidth: u(1) }}>
            <Bar w={["50%", "38%", "62%", "44%", "30%"][i]} h={6} />
          </div>
        </Row>
      ))}
    </div>
  </Pad>
);

/** A research topic: the question, then sources with their findings. */
export const ResearchStructure: S = () => (
  <Pad>
    <Field h={32} barW="56%" />
    {[0, 1, 2].map((i) => (
      <Row key={i} gap={10} className="items-start">
        <div className="shrink-0 rounded-md bg-muted" style={{ width: u(36), height: u(36) }} />
        <Stack gap={7} className="flex-1">
          <Bar w={["62%", "48%", "70%"][i]} h={8} strong />
          <Lines widths={["100%", "76%"]} gap={6} h={6} />
        </Stack>
      </Row>
    ))}
  </Pad>
);

/** A scope: its page — a heading, what it holds, a list. */
export const ScopeStructure: S = () => (
  <Pad>
    <Row gap={10}>
      <div className="shrink-0 rounded-lg" style={{ width: u(32), height: u(32), background: accentFill(0.18) }} />
      <Stack gap={6} className="flex-1">
        <Bar w="44%" h={10} strong />
        <Bar w="26%" h={6} />
      </Stack>
    </Row>
    <Row gap={8}>
      <Pill w={52} />
      <Pill w={68} />
      <Pill w={44} />
    </Row>
    {[0, 1, 2, 3, 4].map((i) => (
      <Row key={i} gap={10}>
        <Glyph icon={Layers} size={14} />
        <Bar w={["50%", "36%", "58%", "42%", "30%"][i]} />
      </Row>
    ))}
  </Pad>
);

// ── meetings ──────────────────────────────────────────────────────────────────

export const MeetingStructure: S = () => (
  <Pad>
    <Row className="justify-between">
      <Row gap={8}>
        <Glyph icon={CalendarDays} size={15} accent />
        <Bar w={90} h={7} strong />
      </Row>
      <Pill w={56} h={22} solid />
    </Row>
    <Row gap={0}>
      {[0, 1, 2, 3, 4].map((i) => (
        <div key={i} style={{ marginLeft: i === 0 ? 0 : u(-6) }}>
          <div className="rounded-full bg-card" style={{ padding: u(2) }}>
            <Dot size={26} />
          </div>
        </div>
      ))}
    </Row>
    <Bar w="24%" h={6} strong />
    {[0, 1, 2, 3].map((i) => (
      <Row key={i} gap={10}>
        <Bar w={40} h={6} accent />
        <Bar w={["58%", "44%", "66%", "36%"][i]} />
      </Row>
    ))}
  </Pad>
);

/** Meeting notes (a transcript, decisions…): speakers and what they said. */
export const MeetingNotesStructure: S = () => (
  <Pad>
    {[0, 1, 2, 3].map((i) => (
      <Row key={i} gap={10} className="items-start">
        <Dot size={22} />
        <Stack gap={6} className="flex-1">
          <Row gap={8}>
            <Bar w="22%" h={6} strong />
            <Bar w={30} h={5} />
          </Row>
          <Lines widths={i % 2 ? ["90%", "60%"] : ["100%", "94%", "42%"]} gap={6} h={6} />
        </Stack>
      </Row>
    ))}
  </Pad>
);

// ── research & learning ───────────────────────────────────────────────────────

/** A deck: the top card of a stack, with its prompt. */
export const FlashcardStructure: S = () => (
  <div className="flex h-full flex-col items-center justify-center" style={{ padding: u(20), gap: u(14) }}>
    <div className="relative w-4/5" style={{ aspectRatio: "3 / 2" }}>
      <div className="absolute inset-0 rounded-xl border border-border bg-muted" style={{ transform: `translate(${u(8)}, ${u(8)})`, borderWidth: u(1) }} />
      <div className="absolute inset-0 flex flex-col items-center justify-center rounded-xl border border-border bg-card" style={{ gap: u(10), borderWidth: u(1) }}>
        <Bar w="60%" h={10} strong />
        <Bar w="40%" h={7} />
      </div>
    </div>
    <Row gap={10}>
      <Pill w={60} h={24} />
      <Pill w={60} h={24} solid />
    </Row>
  </div>
);

/** A study kit: its sections, each with its icon. */
export const StudyKitStructure: S = () => (
  <Pad>
    <Bar w="50%" h={12} strong />
    {[0, 1, 2, 3].map((i) => (
      <div key={i} className="flex items-center rounded-lg border border-border" style={{ padding: u(10), gap: u(10), borderWidth: u(1) }}>
        <div className="shrink-0 rounded-md" style={{ width: u(28), height: u(28), background: accentFill(0.16) }} />
        <Stack gap={6} className="flex-1">
          <Bar w={["44%", "52%", "36%", "48%"][i]} h={8} strong />
          <Bar w="28%" h={5} />
        </Stack>
        <Glyph icon={ChevronDown} size={14} />
      </div>
    ))}
  </Pad>
);

// ── web & social ──────────────────────────────────────────────────────────────

function Handle() {
  return (
    <Row gap={10}>
      <Dot size={32} />
      <Stack gap={6} className="flex-1">
        <Bar w="36%" h={8} strong />
        <Bar w="22%" h={6} />
      </Stack>
    </Row>
  );
}

export const SocialPostStructure: S = () => (
  <Pad>
    <Handle />
    <Lines widths={["100%", "84%"]} gap={7} h={7} />
    <Media icon={ImageIcon} grow />
    <Row gap={18}>
      <Glyph icon={Heart} size={15} />
      <Glyph icon={MessageCircle} size={15} />
      <Glyph icon={Share2} size={15} />
    </Row>
  </Pad>
);

export const SocialProfileStructure: S = () => (
  <Pad>
    <Row gap={14}>
      <Dot size={56} />
      <Stack gap={7} className="flex-1">
        <Bar w="50%" h={10} strong />
        <Bar w="32%" h={6} />
      </Stack>
    </Row>
    <Row gap={10}>
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex flex-1 flex-col items-center rounded-lg bg-muted" style={{ padding: u(8), gap: u(6) }}>
          <Bar w="50%" h={10} strong />
          <Bar w="66%" h={5} />
        </div>
      ))}
    </Row>
    <div className="grid min-h-0 flex-1 grid-cols-3 overflow-hidden" style={{ gap: u(6) }}>
      {Array.from({ length: 9 }, (_, i) => (
        <div key={i} className="rounded bg-muted" style={{ aspectRatio: "1" }} />
      ))}
    </div>
  </Pad>
);

export const OutlierFeedStructure: S = () => (
  <Pad>
    {[0, 1, 2, 3, 4].map((i) => (
      <Row key={i} gap={10}>
        <div className="flex shrink-0 items-center justify-center rounded-md bg-muted" style={{ width: u(44), height: u(56) }}>
          <Glyph icon={Play} size={14} />
        </div>
        <Stack gap={7} className="flex-1">
          <Bar w={["70%", "56%", "64%", "48%", "60%"][i]} h={7} strong />
          <Bar w="34%" h={6} />
        </Stack>
        <Pill w={42} h={20} solid />
      </Row>
    ))}
  </Pad>
);

export const AdStructure: S = () => (
  <Pad>
    <Handle />
    <Media icon={ImageIcon} grow />
    <Bar w="66%" h={10} strong />
    <Bar w="88%" h={7} />
    <Row className="justify-end">
      <Pill w={84} h={26} solid />
    </Row>
  </Pad>
);

export const SwipeCollectionStructure: S = () => (
  <Pad>
    <Row className="justify-between">
      <Bar w="38%" h={10} strong />
      <Bar w={30} h={6} />
    </Row>
    <div className="grid min-h-0 flex-1 grid-cols-3 overflow-hidden" style={{ gap: u(8) }}>
      {Array.from({ length: 9 }, (_, i) => (
        <div key={i} className="flex flex-col rounded-md border border-border" style={{ padding: u(6), gap: u(6), borderWidth: u(1) }}>
          <div className="rounded bg-muted" style={{ aspectRatio: "4 / 5" }} />
          <Bar w="70%" h={5} />
        </div>
      ))}
    </div>
  </Pad>
);

/** A video clone: the reference and the clone side by side, then the plan's steps. */
export const VideoCloneStructure: S = () => (
  <Pad>
    <Row gap={12} className="min-h-0 flex-1 items-stretch">
      {[0, 1].map((i) => (
        <div key={i} className="flex flex-1 items-center justify-center rounded-lg bg-muted" style={i === 1 ? { boxShadow: `inset 0 0 0 ${u(2)} ${accentFill(0.6)}` } : undefined}>
          <Glyph icon={i === 0 ? Video : Play} size={22} accent={i === 1} />
        </div>
      ))}
    </Row>
    <Row gap={8}>
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="flex-1 rounded-full" style={{ height: u(6), background: i < 2 ? accentFill(0.85) : "hsl(var(--muted))" }} />
      ))}
    </Row>
    <Lines widths={["80%", "52%"]} gap={7} h={7} />
  </Pad>
);

/** A person or company: avatar and name, contact rows, recent activity. */
export const PartyStructure: S = () => (
  <Pad>
    <Row gap={12}>
      <Dot size={44} />
      <Stack gap={7} className="flex-1">
        <Bar w="46%" h={10} strong />
        <Bar w="30%" h={6} />
      </Stack>
    </Row>
    {[0, 1, 2].map((i) => (
      <Row key={i} gap={10}>
        <Glyph icon={[AtSign, Globe, CalendarDays][i]} size={13} />
        <Bar w={["44%", "36%", "28%"][i]} h={7} />
      </Row>
    ))}
    <Rule />
    {[0, 1, 2].map((i) => (
      <Row key={i} gap={10} className="items-start">
        <div className="shrink-0 rounded-full" style={{ width: u(8), height: u(8), marginTop: u(3), background: accentFill(0.6) }} />
        <Lines widths={i === 1 ? ["80%"] : ["92%", "54%"]} gap={6} h={6} />
      </Row>
    ))}
  </Pad>
);

/** An agent's page: who it is, what it does, its model and tools. */
export const AgentStructure: S = () => (
  <Pad>
    <Row gap={12}>
      <div className="flex shrink-0 items-center justify-center rounded-xl" style={{ width: u(40), height: u(40), background: accentFill(0.18) }} />
      <Stack gap={7} className="flex-1">
        <Bar w="42%" h={10} strong />
        <Bar w="24%" h={6} />
      </Stack>
      <Pill w={64} h={24} solid />
    </Row>
    <Lines widths={["100%", "90%", "58%"]} gap={7} h={7} />
    <Row gap={8}>
      <Pill w={70} />
      <Pill w={52} />
      <Pill w={60} />
    </Row>
    <Field h={34} action />
  </Pad>
);

// ── canvas ────────────────────────────────────────────────────────────────────

/** The retired Label tile: its one line, centered. */
export const LabelStructure: S = () => (
  <div className="flex h-full items-center" style={{ paddingInline: u(16), gap: u(10) }}>
    <Glyph icon={Circle} size={10} accent />
    <Bar w="60%" h={12} strong />
  </div>
);
