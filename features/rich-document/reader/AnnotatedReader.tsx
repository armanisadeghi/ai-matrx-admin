"use client";

// features/rich-document/reader/AnnotatedReader.tsx
//
// THE annotated reading surface for one saved long-form record — the study
// guide's layout as a primitive: the outline on the left (under an optional
// record navigator), the body in the middle with the full reading set
// (highlight, private note, comment, suggest, link — the ONE selection
// toolbar), Notes & comments on the right, Cmd/Ctrl+F find. Phones get the
// two side panels as drawers.
//
// The host supplies the record as an AnnotationSource (token + id + body +
// version) and owns everything record-specific: the header row, extra
// right-hand tabs, a context-menu wrapper, and `children` mounted INSIDE the
// sidecar (e.g. a bridge that publishes the reading set to an agent scope).
// Adopters: research synthesis + document. The study guide reader shares the
// outline and the sidecar and is the next to move onto this shell.

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Panel, type Layout } from "react-resizable-panels";
import { LayoutPanelLeft, ListTree, MessageSquareText, PanelRight, Search } from "lucide-react";
import { Button, Tabs } from "@ai-matrx/design-system/controls";
import type { Action } from "@ai-matrx/alchemy/actions";
import { RichDocument } from "@ai-matrx/rich-content/rich-document/RichDocument";
import { RenderedFindBar } from "@ai-matrx/rich-content/rich-document/search/RenderedFindBar";
import { useIsMobile } from "@ai-matrx/kit/media-query";
import { Drawer, DrawerBody, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { AnnotatedContent, AnnotationSidecarProvider } from "@/features/rich-document/annotations/AnnotationSidecar";
import { AnnotationPanel } from "@/features/rich-document/annotations/AnnotationPanel";
import type { AnnotationSource } from "@/features/rich-document/annotations/types";
import { DocumentOutline, scrollToOutlineHeading } from "@/features/rich-document/outline/DocumentOutline";
import { ClientGroup } from "@/features/resizable-panels/ClientGroup";
import { Handle } from "@/features/resizable-panels/Handle";
import { PanelControlProvider, usePanelControls } from "@/features/resizable-panels/PanelControlProvider";
import { RegisteredPanel } from "@/features/resizable-panels/RegisteredPanel";
import { cn } from "@/lib/utils";

export interface ReaderTab {
  id: string;
  label: string;
  content: ReactNode;
}

export interface AnnotatedReaderProps {
  /** Panel group id; the layout persists in the `panels:<groupKey>` cookie. */
  groupKey: string;
  defaultLayout?: Layout;
  /** The open record, or null while nothing is open (then `placeholder` fills the middle). */
  source: AnnotationSource | null;
  /** Above the outline in the left panel: the list of records to switch between. */
  navigator?: ReactNode;
  /** A fixed row above the scrolling middle (filters, list-level actions). */
  toolbar?: ReactNode;
  /** The record's own rows above its body, scrolling with it (title, badges, notices). */
  header?: ReactNode;
  /** Rendered in the middle instead of the body: loading, empty, a failure, a live stream. */
  placeholder?: ReactNode;
  /** Right-hand tabs after Notes & comments. */
  extraTabs?: readonly ReaderTab[];
  /** Wraps the rendered body (e.g. the surface's right-click menu). */
  wrapBody?: (body: ReactNode) => ReactNode;
  /** Record-specific passage actions added to the one selection toolbar. */
  passageActions?: readonly Action[];
  /** Mounted inside the sidecar (agent bridges). */
  children?: ReactNode;
}

const NOTES_TAB = "notes";

function PanelToggles() {
  const controls = usePanelControls();
  return <>
    <Button icon={<LayoutPanelLeft aria-hidden />} variant="quiet" className="absolute left-1 top-1 z-20" aria-label="Toggle contents" aria-expanded={!controls.isCollapsed("navigator")} onClick={() => controls.toggle("navigator")} />
    <Button icon={<PanelRight aria-hidden />} variant="quiet" className="absolute right-1 top-1 z-20" aria-label="Toggle notes and comments" aria-expanded={!controls.isCollapsed("inspector")} onClick={() => controls.toggle("inspector")} />
  </>;
}

function CenterBody({ children }: { children: ReactNode }) {
  const controls = usePanelControls();
  return <div className={cn("h-full min-h-0", controls.isCollapsed("navigator") && "pl-8", controls.isCollapsed("inspector") && "pr-8")}>{children}</div>;
}

export function AnnotatedReader(props: AnnotatedReaderProps) {
  const { source } = props;
  // One sidecar per record: switching records re-keys it (anchors index into that record's body).
  return source
    ? <AnnotationSidecarProvider key={`${source.token}:${source.id}`} source={source}>{props.children}<ReaderLayout {...props} /></AnnotationSidecarProvider>
    : <ReaderLayout {...props} />;
}

function ReaderLayout({ groupKey, defaultLayout, source, navigator, toolbar, header, placeholder, extraTabs = [], wrapBody, passageActions }: AnnotatedReaderProps) {
  const isMobile = useIsMobile();
  const readerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [tab, setTab] = useState<string>(NOTES_TAB);
  const [mobilePanel, setMobilePanel] = useState<"navigator" | "inspector" | null>(null);
  const [findOpen, setFindOpen] = useState(false);
  const [findFocus, setFindFocus] = useState(0);
  const openFind = () => { setFindOpen(true); setFindFocus((n) => n + 1); };

  useEffect(() => {
    if (!source) return;
    const onFind = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "f") {
        event.preventDefault();
        setFindOpen(true);
        setFindFocus((n) => n + 1);
      }
    };
    window.addEventListener("keydown", onFind, true);
    return () => window.removeEventListener("keydown", onFind, true);
  }, [source]);

  const jump = (headingIndex: number) => {
    scrollToOutlineHeading(contentRef.current, readerRef.current, headingIndex);
    if (isMobile) setMobilePanel(null);
  };

  const body = source ? (
    <AnnotatedContent passageActions={passageActions}>
      <div ref={contentRef}>
        <RichDocument imagePolicy="ai" content={source.body} source={{ type: "raw", title: source.title }} actionsVariant="icon-only" actionsPosition="top-right" actionsBehavior="hover-only" />
      </div>
    </AnnotatedContent>
  ) : null;

  const center = (
    <main className="relative flex h-full min-h-0 flex-col bg-background">
      {(toolbar || source) && <div className="flex shrink-0 items-center gap-1 px-3 pt-1">
        <div className="min-w-0 flex-1">{toolbar}</div>
        {source && <Button icon={<Search aria-hidden />} variant="quiet" aria-label="Find in this document" title="Find in this document" onClick={openFind} />}
      </div>}
      {findOpen && source && <div className="absolute right-3 top-10 z-30 w-[min(96%,520px)]"><RenderedFindBar rootRef={readerRef} onClose={() => setFindOpen(false)} label="Find in this document" focusRequest={findFocus} /></div>}
      <div className="scroll-page-end-space min-h-0 flex-1 overflow-y-auto">
        <div ref={readerRef} className="w-full px-3 py-3">
          {header}
          {source ? (wrapBody ? wrapBody(body) : body) : placeholder}
        </div>
      </div>
    </main>
  );

  const left = (
    <aside className="matrx-touch-targets flex h-full min-h-0 flex-col bg-muted/20">
      <div className="scroll-page-end-space min-h-0 flex-1 overflow-y-auto p-1 pt-9">
        {navigator}
        {source && <DocumentOutline key={`${source.id}:${source.contentVersion}`} content={source.body} titleLabel={source.title} onJump={jump} />}
      </div>
    </aside>
  );

  const tabs = [{ value: NOTES_TAB, label: "Notes & comments" }, ...extraTabs.map((t) => ({ value: t.id, label: t.label }))];
  const activeExtra = extraTabs.find((t) => t.id === tab);
  const right = (
    <aside className="matrx-touch-targets flex h-full min-h-0 flex-col bg-muted/20">
      {tabs.length > 1 && <div className="shrink-0 pr-8"><Tabs aria-label="Reader details" value={activeExtra ? tab : NOTES_TAB} onValueChange={setTab} data={tabs} /></div>}
      {activeExtra ? <div className="min-h-0 flex-1 overflow-y-auto">{activeExtra.content}</div>
        : source ? <AnnotationPanel className={cn("min-h-0 flex-1", tabs.length === 1 && "pt-8")} />
        : <p className="px-3 py-8 text-sm text-muted-foreground">Open a document to see its notes and comments.</p>}
    </aside>
  );

  if (isMobile) {
    return (
      <div className="matrx-touch-targets flex h-full min-h-0 flex-col">
        <div className="flex items-center justify-between border-b border-border bg-background px-3 py-2">
          <Button icon={<ListTree aria-hidden />} variant="quiet" onClick={() => setMobilePanel("navigator")}>Contents</Button>
          <Button icon={<MessageSquareText aria-hidden />} variant="quiet" onClick={() => setMobilePanel("inspector")}>Notes & comments</Button>
        </div>
        <div className="min-h-0 flex-1">{center}</div>
        <Drawer open={mobilePanel === "navigator"} onOpenChange={(open) => !open && setMobilePanel(null)}><DrawerContent className="h-[92dvh]"><DrawerHeader><DrawerTitle>Contents</DrawerTitle></DrawerHeader><DrawerBody>{left}</DrawerBody></DrawerContent></Drawer>
        <Drawer open={mobilePanel === "inspector"} onOpenChange={(open) => !open && setMobilePanel(null)}><DrawerContent className="h-[92dvh]"><DrawerHeader><DrawerTitle>Notes & comments</DrawerTitle></DrawerHeader><DrawerBody>{right}</DrawerBody></DrawerContent></Drawer>
      </div>
    );
  }

  return (
    <PanelControlProvider initialLayouts={[defaultLayout]}>
      <div className="relative h-full min-h-0 overflow-hidden">
        <PanelToggles />
        <ClientGroup id={groupKey} groupKey={groupKey} cookieName={`panels:${groupKey}`} defaultLayout={defaultLayout} orientation="horizontal" className="h-full w-full" resizeTargetMinimumSize={{ coarse: 20, fine: 10 }}>
          <RegisteredPanel registerAs="navigator" groupKey={groupKey} id="navigator" collapsible collapsedSize="0%" defaultSize="250px" minSize="190px">{left}</RegisteredPanel>
          <Handle hideWhenCollapsed={["navigator"]} />
          <Panel id="reader" minSize="35%"><CenterBody>{center}</CenterBody></Panel>
          <Handle hideWhenCollapsed={["inspector"]} />
          <RegisteredPanel registerAs="inspector" groupKey={groupKey} id="inspector" collapsible collapsedSize="0%" defaultSize="300px" minSize="220px">{right}</RegisteredPanel>
        </ClientGroup>
      </div>
    </PanelControlProvider>
  );
}
