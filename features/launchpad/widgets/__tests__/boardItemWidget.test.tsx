// A Board item placed on a launchpad draws THAT TYPE'S OWN Body for the saved record (lane U: one widget registry).
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
let root: Root | null = null;
let host: HTMLDivElement;
async function draw(node: React.ReactNode): Promise<HTMLDivElement> {
  if (!root) {
    host = document.createElement("div");
    document.body.appendChild(host);
    root = createRoot(host);
  }
  await act(async () => {
    root!.render(node);
  });
  // The catalog loads through a dynamic import: let it settle.
  await act(async () => {
    await new Promise((r) => setTimeout(r, 0));
  });
  return host;
}
afterEach(() => {
  act(() => root?.unmount());
  root = null;
});

jest.mock("next/link", () => ({ __esModule: true, default: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a> }));
jest.mock("@/features/board/items/catalog", () => {
  const Body = ({ source, title, interacting }: { source: { entity: string; id: string }; title: string; interacting: boolean }) => (
    <p data-testid="note-body">{`${source.entity}:${source.id}:${title}:${interacting ? "live" : "quiet"}`}</p>
  );
  const note = { key: "note", label: "Note", Body, bringIn: { label: "Bring in", Picker: () => null } };
  return { itemTypeByKey: (k: string) => (k === "note" ? note : null), BOARD_ITEM_TYPES: [note] };
});

import { BoardItemWidget, boardItemSource } from "../bodies/BoardItemWidget";

describe("board_item widget", () => {
  it("mounts the Board type's own Body for the saved reference", async () => {
    const el = await draw(<BoardItemWidget config={{ itemType: "note", id: "n1", title: "Plan" }} editing={false} capacity={5} />);
    expect(el.querySelector('[data-testid="note-body"]')!.textContent).toBe("note:n1:Plan:live");
  });

  it("is quiet while the launchpad is being edited, and names an unknown type instead of dropping it", async () => {
    let el = await draw(<BoardItemWidget config={{ itemType: "note", id: "n1" }} editing capacity={5} />);
    expect(el.querySelector('[data-testid="note-body"]')!.textContent).toBe("note:n1:Note:quiet");
    el = await draw(<BoardItemWidget config={{ itemType: "gone", id: "x" }} editing={false} capacity={5} />);
    expect(el.textContent).toContain('Unavailable item "gone"');
  });

  it("asks for an item when none is chosen", async () => {
    expect(boardItemSource({})).toBeNull();
    const el = await draw(<BoardItemWidget config={{}} editing={false} capacity={5} />);
    expect(el.textContent).toContain("No item chosen");
  });
});
