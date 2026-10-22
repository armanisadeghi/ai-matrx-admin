/**
 * THE HOST-CHROME CONTRACT (Arman 2026-10-22: "determining what is part of the baseline of the
 * component and what is not and set those things up so it's easy to use everywhere").
 *
 * A board tile's header already names its record and offers Open / Full screen / the tile menu. The
 * live census of every tile type (2026-10-22) found 13 types whose wrapped record drew its OWN name,
 * "Open" button or page header inside the tile — the record named two or three times. The fix is one
 * primitive (`features/shell/host-chrome/RecordHostChrome.tsx`): BoardTile PROVIDES it for every tile,
 * and a record's header for THAT record drops what the host shows.
 *
 * This fails when:
 *   · BoardTile stops wrapping its body in the host chrome, or stops naming the tile's record;
 *   · a hosted record's header draws its own name / Open again (render test);
 *   · a record nested inside another record (a task inside a chat tile) loses its own name;
 *   · a migrated record header stops reading the primitive, or reads it under a token that is not the
 *     one its board type declares (the match would silently never hit);
 *   · a bespoke tile title row (`TileBar`, `EmbeddedRecordHeader`) or a bare "Open …" door comes back.
 */
import { act, useState } from "react";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { createRoot, type Root } from "react-dom/client";
import { BoardTile } from "../components/BoardTile";
import { FocusHostContext, BoardCameraStoreContext } from "../engine/react";
import { BoardCameraStore } from "../engine/camera-store";
import { HostedRecordBar } from "@/features/shell/host-chrome/RecordHostChrome";

const ROOT = join(__dirname, "..", "..", "..");
const read = (rel: string) => readFileSync(join(ROOT, rel), "utf8");

function Harness({ store }: { store: BoardCameraStore }) {
  const [focusHost, setFocusHost] = useState<HTMLDivElement | null>(null);
  return (
    <BoardCameraStoreContext.Provider value={store}>
      <FocusHostContext.Provider value={focusHost}>
        <div ref={setFocusHost} data-focus-host />
        <BoardTile
          id="tile"
          rect={{ x: 0, y: 0, w: 480, h: 320 }}
          title="Plain tile title"
          hostRecord={{ token: "task", id: "t1" }}
          menu={{ href: "/tasks/t1", actions: [] }}
          onMove={() => {}}
          onResize={null}
        >
          {() => (
            <div>
              <HostedRecordBar
                record={{ token: "task", id: "t1" }}
                titleField={<input aria-label="Hosted title field" defaultValue="Ship it" />}
                open={<button type="button">Open hosted task</button>}
                actions={<button type="button">Hosted action</button>}
              />
              {/* A DIFFERENT record inside the hosted one keeps its own name and door. */}
              <HostedRecordBar
                record={{ token: "task", id: "t2" }}
                name={<span>Nested task name</span>}
                open={<button type="button">Open nested task</button>}
              />
            </div>
          )}
        </BoardTile>
      </FocusHostContext.Provider>
    </BoardCameraStoreContext.Provider>
  );
}

describe("a board tile hosts its record's chrome", () => {
  let container: HTMLDivElement;
  let root: Root;
  beforeEach(() => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });
  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it("names the record once (its field in the tile header), drops Open, keeps actions and nested records", async () => {
    const store = new BoardCameraStore({ x: 0, y: 0, z: 1 });
    act(() => root.render(<Harness store={store} />));
    // Full screen mounts the body at once.
    act(() => store.focus("tile"));
    for (let i = 0; i < 5 && !document.querySelector("[aria-label='Hosted title field']"); i++) {
      await act(async () => {
        await new Promise((r) => setTimeout(r, 30));
      });
    }
    const text = document.body.textContent ?? "";
    const field = document.querySelector("[aria-label='Hosted title field']");
    expect(field).not.toBeNull();
    // The rename field sits in the tile HEADER's title slot, and the plain title gave way to it.
    expect(field?.closest("[data-board-title-slot]")).not.toBeNull();
    expect(text).not.toContain("Plain tile title");
    // The host offers Open: the record's own door is gone; its own action stays.
    expect(text).not.toContain("Open hosted task");
    expect(text).toContain("Hosted action");
    // The nested record is not the tile's record: its name and door stay.
    expect(text).toContain("Nested task name");
    expect(text).toContain("Open nested task");
  });
});

describe("source contract", () => {
  it("BoardTile provides the host chrome around every body, naming the tile's record", () => {
    const tile = read("features/board/components/BoardTile.tsx");
    const host = tile.slice(tile.indexOf("<RecordHostChrome"), tile.indexOf("</RecordHostChrome>"));
    expect(host.length).toBeGreaterThan(0);
    expect(host).toContain("record={hostRecord}");
    expect(host).toContain("titleTarget=");
    expect(host).toContain("children(tier)");
    expect(tile).toContain("data-board-title-slot");
    // Every board item tile passes its type's record (the same identity comments use).
    expect(read("features/board/home/UserBoard.tsx")).toMatch(/hostRecord=\{type\?\.comments\?\.\(source\) \?\? null\}/);
  });

  // [board items file, the type's comments token, the record header file that must read the primitive with that token]
  const MIGRATED: Array<[label: string, itemsFile: string, token: string, headerFile: string]> = [
    ["Person or company", "crm-items.tsx", "party", "features/crm/components/record/PartyRecordPage.tsx"],
    ["Task", "feature-items.tsx", "task", "features/tasks/components/TaskEditor.tsx"],
    ["Research", "feature-items.tsx", "research_topic", "features/board/items/feature-items.tsx"],
    ["Project", "feature-items.tsx", "project", "features/board/items/feature-items.tsx"],
    ["War Room", "feature-items.tsx", "war_room", "features/board/items/feature-items.tsx"],
    ["Workflow run", "feature-items.tsx", "workflow_run", "features/board/items/feature-items.tsx"],
    ["Agent", "agent-items.tsx", "agent", "features/agents/route/AgentViewContent.tsx"],
    ["Document", "document-items.tsx", "udt_document", "features/board/items/document-items.tsx"],
    ["Workbook", "office-items.tsx", "workbook", "features/workbooks/components/WorkbookEditor.tsx"],
    ["Presentation", "office-items.tsx", "presentation", "features/presentations/components/PresentationEditor.tsx"],
    ["Visual map", "platform-items.tsx", "canvas_item", "features/canvas/maps/MapEditor.tsx"],
    ["Knowledge source", "platform-items.tsx", "data_store", "features/rag/components/data-stores/DataStoresPage.tsx"],
    ["Meeting", "feature-items.tsx", "meet_meeting", "features/meet/components/manage/MeetingDetail.tsx"],
    ["Sandbox", "platform-items.tsx", "sandbox_instance", "features/code/views/sandboxes/SandboxRecord.tsx"],
    ["Scope", "scope-items.tsx", "scope", "features/scopes/components/pages/ScopeDetailEditor.tsx"],
    ["Transcript", "transcript-items.tsx", "transcript", "features/transcripts/components/TranscriptViewer.tsx"],
  ];

  it.each(MIGRATED)("%s: its record header reads the host chrome under the board type's own token", (_label, itemsFile, token, headerFile) => {
    const items = read(`features/board/items/${itemsFile}`);
    // The board type declares this record identity (what BoardTile hands the host chrome).
    expect(items).toMatch(new RegExp(`(entityComments\\("${token}"\\)|token: "${token}")`));
    expect(existsSync(join(ROOT, headerFile))).toBe(true);
    const header = read(headerFile);
    // Reads the primitive itself, or through the shared editor header that does (Workbook, Presentation).
    const direct = header.includes("@/features/shell/host-chrome/RecordHostChrome");
    const viaEditorHeader = /<EditorDocumentHeader\s+record=\{\{ token: "/.test(header);
    expect(direct || viaEditorHeader).toBe(true);
    expect(header).toContain(`token: "${token}"`);
  });

  it("the shared editor header reads the host chrome for the record it is given", () => {
    const src = read("features/shell/components/header/templates/EditorDocumentHeader.tsx");
    expect(src).toContain("useHostNamesRecord(record)");
    expect(src).toContain("<HostTitle record={record}>");
  });

  it("no bespoke tile title row or bare Open door is left in the board's bodies", () => {
    const dir = "features/board/items";
    for (const f of ["feature-items.tsx", "document-items.tsx", "crm-items.tsx"]) {
      const src = read(`${dir}/${f}`);
      expect(src).not.toMatch(/function TileBar\(/);
      // Every "Open <record>" door is the host bar's `open` (dropped when the tile offers Open).
      for (const m of src.matchAll(/\n\s*Open (project|topic|room|run)\n/g)) {
        const before = src.slice(Math.max(0, (m.index ?? 0) - 260), m.index);
        expect(before).toContain("open={");
      }
    }
    expect(existsSync(join(ROOT, "features/crm/components/record/EmbeddedRecordHeader.tsx"))).toBe(false);
  });
});
