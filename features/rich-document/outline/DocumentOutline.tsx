"use client";

// features/rich-document/outline/DocumentOutline.tsx
//
// THE outline a reader shows beside a long markdown body (first adopted by the
// study guide reader, now every annotated reader): the document title, then the
// heading tree — root sections as one accordion, deeper levels independent.
// A row press calls `onJump(headingIndex)`; the host scrolls with
// `scrollToOutlineHeading`. -1 is the document title (the top of the reader).

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { parseNoteOutline, type NoteOutlineItem } from "@/features/notes/utils/noteOutline";
import {
  documentOutlineDisplayTitle,
  documentOutlineItems,
  documentOutlineTree,
  initialOutlineExpansion,
  toggleOutlineSection,
  type DocumentOutlineNode,
} from "./outline";
import { OutlineHeader } from "./OutlineHeader";

export function DocumentOutline({
  content,
  titleLabel,
  onJump,
  label = "Document outline",
  sections = "branches",
}: {
  content: string;
  titleLabel: string;
  onJump: (headingIndex: number) => void;
  label?: string;
  /** See `DocumentOutlineOptions.sections`. */
  sections?: "branches" | "all";
}) {
  const headings = parseNoteOutline(content);
  const title = documentOutlineDisplayTitle(headings, titleLabel, content);
  const outline = documentOutlineItems(headings, content, { sections });
  const tree = documentOutlineTree(outline);
  const [expanded, setExpanded] = useState(() => initialOutlineExpansion(outline));
  const [activeHeading, setActiveHeading] = useState<number | null>(null);
  if (!title && !outline.length) return null;
  return (
    <nav className="border-t border-border py-1" aria-label={label}>
      <ul className="list-none p-0">
        <li>
          <OutlineHeader title={title} active={activeHeading === title.headingIndex} onJump={(headingIndex) => { setActiveHeading(headingIndex); onJump(headingIndex); }} />
          <ul className="grid list-none grid-cols-[minmax(0,1fr)] gap-0.5 p-0">{tree.map((node) => <OutlineBranch key={`${node.item.headingIndex}:${node.item.charOffset}`} node={node} depth={1} outline={outline} expanded={expanded} setExpanded={setExpanded} activeHeading={activeHeading} setActiveHeading={setActiveHeading} onJump={onJump} />)}</ul>
        </li>
      </ul>
    </nav>
  );
}

function OutlineBranch({ node, depth, outline, expanded, setExpanded, activeHeading, setActiveHeading, onJump }: { node: DocumentOutlineNode; depth: number; outline: NoteOutlineItem[]; expanded: Readonly<Record<number, boolean>>; setExpanded: React.Dispatch<React.SetStateAction<Record<number, boolean>>>; activeHeading: number | null; setActiveHeading: React.Dispatch<React.SetStateAction<number | null>>; onJump: (index: number) => void }) {
  const { item, children } = node;
  const hasChildren = children.length > 0;
  const isExpanded = expanded[item.headingIndex] !== false;
  const toggle = () => setExpanded((current) => toggleOutlineSection(outline, current, item.headingIndex));
  return <li>
    <div className={cn("flex min-w-0 items-center border-l-2", activeHeading === item.headingIndex ? "border-primary bg-primary/10" : "border-transparent")} style={{ paddingLeft: "10px" }}>
      {hasChildren ? <button type="button" aria-expanded={isExpanded} aria-label={`${isExpanded ? "Collapse" : "Expand"} ${item.text}`} onClick={toggle} className="grid h-5 w-5 shrink-0 place-items-center rounded hover:bg-accent">{isExpanded ? <ChevronDown className="h-3.5 w-3.5" aria-hidden /> : <ChevronRight className="h-3.5 w-3.5" aria-hidden />}</button> : <span className="w-5 shrink-0" />}
      <button type="button" onClick={() => { setActiveHeading(item.headingIndex); if (hasChildren && !isExpanded) toggle(); onJump(item.headingIndex); }} title={item.text} className={cn("min-w-0 flex-1 overflow-hidden text-ellipsis whitespace-nowrap rounded px-1 py-1 text-left text-xs hover:bg-accent [mask-image:linear-gradient(to_right,black_calc(100%_-_12px),transparent)]", activeHeading === item.headingIndex ? "font-medium text-primary" : "text-muted-foreground hover:text-foreground")}>{item.text}</button>
    </div>
    {hasChildren && isExpanded && <ul className={cn("list-none p-0", depth < 3 && "ml-2.5")}>{children.map((child) => <OutlineBranch key={`${child.item.headingIndex}:${child.item.charOffset}`} node={child} depth={depth + 1} outline={outline} expanded={expanded} setExpanded={setExpanded} activeHeading={activeHeading} setActiveHeading={setActiveHeading} onJump={onJump} />)}</ul>}
  </li>;
}

/**
 * Scroll a rendered body to the outline row's heading: the Nth rendered
 * h1–h6 inside `contentRoot`, or the reader's top (`topTarget`) for -1.
 * Only the reader's own scroll container moves — `scrollIntoView` would also
 * scroll every scrollable ancestor (the app shell), shifting the whole page.
 */
export function scrollToOutlineHeading(contentRoot: Element | null | undefined, topTarget: Element | null | undefined, headingIndex: number): void {
  const target = headingIndex === -1 ? topTarget : contentRoot?.querySelectorAll("h1,h2,h3,h4,h5,h6").item(headingIndex);
  if (!target) return;
  const scroller = scrollParentOf(target);
  if (!scroller) return;
  const top = target.getBoundingClientRect().top - scroller.getBoundingClientRect().top + scroller.scrollTop;
  scroller.scrollTo({ top: headingIndex === -1 ? 0 : top, behavior: "smooth" });
}

function scrollParentOf(element: Element): HTMLElement | null {
  let node = element.parentElement;
  while (node) {
    const { overflowY } = getComputedStyle(node);
    if ((overflowY === "auto" || overflowY === "scroll") && node.scrollHeight > node.clientHeight) return node;
    node = node.parentElement;
  }
  return null;
}
