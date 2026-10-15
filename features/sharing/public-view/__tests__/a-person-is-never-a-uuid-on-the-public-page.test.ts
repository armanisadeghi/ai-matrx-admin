// A person id a published view holds (a kept-aside or departed person) reads as words on the public
// page, never as the uuid. jest globals
import { cellValue, PERSON_GONE_WORDS } from "../format";
import type { PublishedViewField, PublishedViewOpen, PublishedViewRow } from "../types";

const KNOWN = "5a5a5a5a-0000-4000-8000-000000000001";
const GONE = "5a5a5a5a-0000-4000-8000-000000000002";
const view = { refs: { [KNOWN]: "Maria Chen" }, labels: {} } as unknown as PublishedViewOpen;
const field = { key: "owner", label: "Owner", type: "range", multi: false, system: null, relation_target: null, format: null } as PublishedViewField;
const row = (value: unknown) => ({ id: "r", created_at: "", updated_at: "", values: { owner: value } }) as PublishedViewRow;

describe("public view person words", () => {
  it("names a known person and never prints an id", () => {
    expect(cellValue(view, field, row(KNOWN))).toEqual(["Maria Chen"]);
    expect(cellValue(view, field, row(GONE))).toEqual([PERSON_GONE_WORDS]);
    expect(cellValue(view, field, row([KNOWN, GONE]))).toEqual(["Maria Chen", PERSON_GONE_WORDS]);
    expect(cellValue(view, field, row("plain words"))).toEqual(["plain words"]);
  });
});
