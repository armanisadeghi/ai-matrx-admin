/**
 * Forcing tests for the file-template rules (lanes, create-from, save-as).
 * The ports are in-memory; each assertion fails if the rule it names breaks.
 */
import { createTemplateService, type InsertTemplate, type TemplatePorts } from "../template-service-core";
import { SYSTEM_ORGANIZATION_ID, type TemplateRow } from "../types";

const ORG = "11111111-1111-1111-1111-111111111111";
const ME = "22222222-2222-2222-2222-222222222222";

function row(p: Partial<TemplateRow>): TemplateRow {
  return {
    id: p.id ?? "t1",
    kind: p.kind ?? "workbook",
    name: p.name ?? "Monthly budget",
    category: p.category ?? "Finance",
    description: null,
    thumbnail_file_id: p.thumbnail_file_id ?? null,
    organization_id: p.organization_id ?? SYSTEM_ORGANIZATION_ID,
    visibility: p.visibility ?? "internal",
    created_by: p.created_by ?? null,
    updated_at: "2026-10-12T00:00:00Z",
    sort_order: 1,
  };
}

function fakePorts(over: Partial<TemplatePorts> = {}) {
  const calls: Record<string, unknown[]> = { listRows: [], insertRow: [], createRecord: [], setThumbnail: [], renderThumbnail: [] };
  const ports: TemplatePorts = {
    userId: async () => ME,
    activeOrgId: async () => ORG,
    listRows: async (f) => {
      calls.listRows.push(f);
      return [row({ id: "f1" }), row({ id: "c1", organization_id: ORG, visibility: "public" })];
    },
    getSnapshot: async (id) => ({ row: row({ id, kind: "document", name: "Meeting notes" }), snapshot: { body: { dataStream: "x\r\n" } } }),
    insertRow: async (r: InsertTemplate) => {
      calls.insertRow.push(r);
      return row({ id: "new", kind: r.kind, name: r.name, category: r.category, organization_id: r.organization_id, visibility: r.visibility, created_by: ME });
    },
    setThumbnail: async (id, fileId) => void calls.setThumbnail.push([id, fileId]),
    latestRecordSnapshot: async () => ({ sheets: {} }),
    createRecord: async (kind, name, orgId, snapshot) => {
      calls.createRecord.push({ kind, name, orgId, snapshot });
      return "rec-1";
    },
    renderThumbnail: async (kind, _s, lane) => {
      calls.renderThumbnail.push({ kind, lane });
      return "file-1";
    },
    ...over,
  };
  return { svc: createTemplateService(ports), calls };
}

describe("file templates — lanes", () => {
  it("a lane returns only rows of that lane, whatever the read hands back", async () => {
    const { svc } = fakePorts();
    const featured = await svc.listTemplates("workbook", { lane: "featured" });
    expect(featured.map((t) => t.id)).toEqual(["f1"]);
    const community = await svc.listTemplates("workbook", { lane: "community" });
    expect(community.map((t) => t.id)).toEqual(["c1"]);
  });

  it("derives the lane from owner org and visibility", async () => {
    const { svc } = fakePorts();
    const all = await svc.listTemplates("workbook");
    expect(all.map((t) => [t.id, t.lane])).toEqual([["f1", "featured"], ["c1", "community"]]);
  });

  it("Mine asks for the caller's own rows, and is empty when signed out", async () => {
    const { svc, calls } = fakePorts();
    await svc.listTemplates("document", { lane: "mine" });
    expect(calls.listRows[0]).toMatchObject({ kind: "document", lane: "mine", userId: ME });
    const signedOut = fakePorts({ userId: async () => null });
    expect(await signedOut.svc.listTemplates("document", { lane: "mine" })).toEqual([]);
    expect(signedOut.calls.listRows).toHaveLength(0);
  });

  it("never reads by the active organization (lists are not org-filtered)", async () => {
    const activeOrgId = jest.fn(async () => ORG);
    const { svc } = fakePorts({ activeOrgId });
    await svc.listTemplates("workbook", { lane: "org" });
    expect(activeOrgId).not.toHaveBeenCalled();
  });
});

describe("file templates — create from template", () => {
  it("creates a record of the template's kind, in the active org, with the template's content", async () => {
    const { svc, calls } = fakePorts();
    const out = await svc.createFromTemplate("t9");
    expect(out).toEqual({ kind: "document", id: "rec-1" });
    expect(calls.createRecord[0]).toEqual({ kind: "document", name: "Meeting notes", orgId: ORG, snapshot: { body: { dataStream: "x\r\n" } } });
  });

  it("refuses a template with no content", async () => {
    const { svc, calls } = fakePorts({ getSnapshot: async (id) => ({ row: row({ id }), snapshot: null }) });
    await expect(svc.createFromTemplate("t9")).rejects.toThrow(/no content/);
    expect(calls.createRecord).toHaveLength(0);
  });
});

describe("file templates — save as template", () => {
  it.each([
    ["mine", "personal", "mine"],
    ["org", "internal", "org"],
    ["community", "public", "community"],
  ] as const)("lane %s is stored as visibility %s and listed back in %s", async (lane, visibility, back) => {
    const { svc, calls } = fakePorts();
    const t = await svc.saveAsTemplate("workbook", "wb-1", { name: "  Crew roster ", category: "Work", lane });
    const inserted = calls.insertRow[0] as InsertTemplate;
    expect(inserted).toMatchObject({ kind: "workbook", name: "Crew roster", visibility, organization_id: ORG, source_record_id: "wb-1" });
    expect(t.lane).toBe(back);
    expect(calls.renderThumbnail[0]).toEqual({ kind: "workbook", lane: back });
    expect(calls.setThumbnail[0]).toEqual(["new", "file-1"]);
    expect(t.thumbnailUrl).toBe("file-1");
  });

  it("refuses an unknown category, an empty name, featured, and an unsaved record", async () => {
    const { svc } = fakePorts();
    await expect(svc.saveAsTemplate("workbook", "wb-1", { name: "X", category: "Nope", lane: "org" })).rejects.toThrow(/category/);
    await expect(svc.saveAsTemplate("workbook", "wb-1", { name: "  ", category: "Work", lane: "org" })).rejects.toThrow(/Name/);
    await expect(
      svc.saveAsTemplate("workbook", "wb-1", { name: "X", category: "Work", lane: "featured" as never }),
    ).rejects.toThrow(/curated/);
    const empty = fakePorts({ latestRecordSnapshot: async () => null });
    await expect(empty.svc.saveAsTemplate("document", "d-1", { name: "X", category: "Work", lane: "org" })).rejects.toThrow(/Save the document/);
  });

  it("never files a person's template in the system organization", async () => {
    const { svc, calls } = fakePorts({ activeOrgId: async () => SYSTEM_ORGANIZATION_ID });
    await expect(svc.saveAsTemplate("workbook", "wb-1", { name: "X", category: "Work", lane: "org" })).rejects.toThrow(/organizations/);
    expect(calls.insertRow).toHaveLength(0);
  });
});
