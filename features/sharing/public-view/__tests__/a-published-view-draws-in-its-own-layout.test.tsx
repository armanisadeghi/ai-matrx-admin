// A published view is drawn in the layout its owner chose, with only what the store returned for it:
// the board has the choice columns with the cards in them, the calendar puts a post on its day, the grid
// shows only the shown fields, people and clients by NAME (an unmatched guest too), and an empty view
// says it is empty.
import { renderToStaticMarkup } from "react-dom/server";
// jest globals

import { PublicViewBody } from "../PublicViewBody";
import { cellValue } from "../format";
import type { PublishedViewOpen } from "../types";

const field = (key: string, label: string, type: string, extra: Partial<PublishedViewOpen["fields"][number]> = {}) => ({
  key, label, type, multi: false, system: null, relation_target: null, format: null, ...extra,
});

const base: PublishedViewOpen = {
  state: "open", title: "Content board", table: "Content", layout: "kanban",
  group_field: "status", date_field: "post_date", end_field: null, namespace: null, notice: null,
  fields: [
    field("post", "Post", "text"),
    field("status", "Status", "list"),
    field("post_date", "Post date", "range", { format: "datetime" }),
    field("client", "Client", "relation", { relation_target: "c1" }),
    field("editor", "Editor", "relation", { relation_target: "11111111-0000-4000-8000-000000000005" }),
  ],
  rows: [
    { id: "r1", created_at: "2026-10-01T00:00:00Z", updated_at: "2026-10-01T00:00:00Z",
      values: { post: "Spring reel", status: "scripting", post_date: "2026-10-17", client: "k1", editor: "guest1" } },
    { id: "r2", created_at: "2026-10-01T00:00:00Z", updated_at: "2026-10-01T00:00:00Z",
      values: { post: "Carousel", status: "approved", post_date: "2026-11-03T15:00:00Z", client: "k1", editor: ["guest1"] } },
  ],
  count: 2, truncated: false,
  refs: { k1: "Juniper Yoga", guest1: "Maya Okafor" },
  labels: { status: { idea: "Idea", scripting: "Scripting", approved: "Approved" } },
};

describe("a published view", () => {
  it("is a board by its group field, in the choices' own order, empty columns kept", () => {
    const html = renderToStaticMarkup(<PublicViewBody view={base} />);
    expect(html.indexOf("Idea")).toBeLessThan(html.indexOf("Scripting"));
    expect(html).toContain("Spring reel");
    expect(html).toContain("Carousel");
    expect(html).toContain("Juniper Yoga");
  });

  it("collapses an empty column to a narrow header and gives populated ones a real width", () => {
    const html = renderToStaticMarkup(<PublicViewBody view={base} />);
    expect(html.match(/data-public-board-empty/g)).toHaveLength(1); // Idea has no card
    expect(html.match(/data-public-board-lane/g)).toHaveLength(2);
    expect(html).toContain("w-9"); // the narrow header
    expect(html).not.toContain("w-64"); // no fixed 256px columns
    expect(html).toContain("w-[calc(100vw-2rem)]"); // a phone: one column wide
    expect(html).toContain("overflow-x-auto"); // sideways scroll inside the board's own box
  });

  it("drops empty groups altogether when the owner chose to hide them", () => {
    const html = renderToStaticMarkup(<PublicViewBody view={{ ...base, board_hide_empty: true }} />);
    expect(html).not.toContain("data-public-board-empty");
    expect(html).not.toContain("Idea");
    expect(html).toContain("Scripting");
  });

  it("names an unmatched guest by name, never by id", () => {
    const html = renderToStaticMarkup(<PublicViewBody view={{ ...base, layout: "grid" }} />);
    expect(html).toContain("Maya Okafor");
    expect(html).not.toContain("guest1");
  });

  it("is a calendar: each post sits in its month", () => {
    const html = renderToStaticMarkup(<PublicViewBody view={{ ...base, layout: "calendar" }} />);
    expect(html).toContain("October 2026");
    expect(html).toContain("November 2026");
    expect(html).toContain("Spring reel");
  });

  it("shows only the fields it was given", () => {
    const html = renderToStaticMarkup(<PublicViewBody view={{ ...base, layout: "grid", fields: base.fields.filter((f) => f.key !== "client") }} />);
    expect(html).not.toContain("Client");
    expect(html).not.toContain("Juniper Yoga");
  });

  it("says it is empty when the view has no rows", () => {
    expect(renderToStaticMarkup(<PublicViewBody view={{ ...base, rows: [], count: 0 }} />)).toContain("Nothing is on this board yet");
  });

  it("reads a datetime cell in UTC so the server and the browser agree", () => {
    const f = base.fields[2]!;
    expect(cellValue(base, f, base.rows[1]!)).toEqual(["Nov 3, 2026, 3:00 PM UTC"]);
  });
});
