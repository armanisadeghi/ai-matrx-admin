import type { DataSource } from "../contract";
import { parseFetchedTables } from "../contract";
import { asWebAddress, dataTableOffer } from "../offer";
import { fetchInputFromToolSpec } from "../toolSpec";
import { getDataHref } from "../usePasteDataOffer";
import { previewColumns } from "../../chat-tool-renderers/renderers/site-data/parseSiteData";

jest.mock("@/lib/toast", () => ({ toast: jest.fn() }));
jest.mock("@/features/organizations/useOrganizationRequired", () => ({ useOrganizationRequired: jest.fn() }));
jest.mock("@/components/ui/file-upload/useClipboardPaste", () => ({ useClipboardPaste: jest.fn() }));
jest.mock("next/navigation", () => ({ useRouter: jest.fn() }));
jest.mock("@tanstack/react-query", () => ({ useQueryClient: jest.fn() }));

const trustpilot: DataSource = {
  key: "trustpilot_reviews",
  label: "Trustpilot reviews",
  group: "Reviews",
  input: { kind: "url", fields: [{ name: "url", label: "Link", required: true }] },
  example_url: "https://www.trustpilot.com/review/example.com",
  verified: true,
  usd_per_record: 0.002,
};
const jobs: DataSource = {
  key: "indeed_jobs",
  label: "Indeed jobs",
  group: "Jobs",
  input: {
    kind: "keyword",
    fields: [
      { name: "keyword", label: "Job title", required: true },
      { name: "location", label: "Location", required: false },
    ],
  },
  example_url: null,
  verified: true,
  usd_per_record: 0.003,
};

describe("a chat site_data call becomes a Get data fetch input", () => {
  it("a url call fills a url source", () => {
    expect(fetchInputFromToolSpec(trustpilot, { url: " https://www.trustpilot.com/review/stripe.com " })).toEqual({
      url: "https://www.trustpilot.com/review/stripe.com",
    });
  });
  it("query and location fill the keyword source's own fields", () => {
    expect(fetchInputFromToolSpec(jobs, { query: "plumber", location: "Austin" })).toEqual({
      inputs: [{ keyword: "plumber", location: "Austin" }],
    });
  });
  it("explicit inputs keep only the source's fields", () => {
    expect(fetchInputFromToolSpec(jobs, { inputs: [{ keyword: "nurse", extra: "x" }, { keyword: "chef" }] })).toEqual({
      inputs: [{ keyword: "nurse" }, { keyword: "chef" }],
    });
  });
  it("is null when a required field cannot be filled (no save offered)", () => {
    expect(fetchInputFromToolSpec(trustpilot, {})).toBeNull();
    expect(fetchInputFromToolSpec(jobs, { location: "Austin" })).toBeNull();
  });
});

describe("the shared address offer", () => {
  it("offers a covered address, never plain text", () => {
    expect(dataTableOffer("https://www.trustpilot.com/review/stripe.com", [trustpilot])?.source.key).toBe("trustpilot_reviews");
    expect(dataTableOffer("see trustpilot.com/review/stripe.com", [trustpilot])).toBeNull();
    expect(asWebAddress("hello")).toBeNull();
  });
  it("the Get data page address carries the source and the pasted link", () => {
    expect(getDataHref({ sourceKey: "trustpilot_reviews", field: "url", value: "https://x.com/a?b=1" })).toBe(
      "/data/get?source=trustpilot_reviews&field=url&value=https%3A%2F%2Fx.com%2Fa%3Fb%3D1",
    );
    expect(getDataHref()).toBe("/data/get");
  });
});

describe("tables made by Get data", () => {
  it("keeps the newest job per table and skips jobs with no table", () => {
    const rows = [
      { table_id: "t1", table_name: "Stripe reviews", source_key: "trustpilot_reviews", finished_at: "2026-10-11T10:00:00Z" },
      { table_id: null, table_name: null, source_key: "x" },
      { table_id: "t1", table_name: "older", source_key: "trustpilot_reviews", finished_at: "2026-10-10T10:00:00Z" },
      { table_id: "t2", table_name: null, source_key: "indeed_jobs", finished_at: null },
    ];
    expect(parseFetchedTables(rows).map((t) => [t.tableId, t.tableName])).toEqual([
      ["t1", "Stripe reviews"],
      ["t2", "Untitled table"],
    ]);
    expect(parseFetchedTables(null)).toEqual([]);
  });
});

describe("the chat card's preview columns", () => {
  it("takes plain-value fields in first-seen order, up to five, skipping nested values", () => {
    const records = [{ title: "Great", stars: 5, author: { name: "A" }, text: "ok", date: "2026-01-01", url: "u", extra: "e" }];
    expect(previewColumns(records)).toEqual(["title", "stars", "text", "date", "url"]);
  });
});
