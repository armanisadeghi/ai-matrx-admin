/**
 * File templates — the real service (Docs / Sheets template gallery).
 * Rules live in `template-service-core.ts`; this file binds the ports:
 * supabase (RLS decides who may open a row), the workbook / document services
 * (a new record is created exactly like "Blank", then given the template's
 * content), and the thumbnail renderer + the ONE file client.
 */
import { getClaimsUser } from "@ai-matrx/auth";
import { supabase } from "@/utils/supabase/client";
import { ensureOrgId } from "@/lib/organizations/ensureOrgId";
import {
  createWorkbook,
  getLatestSnapshot,
  saveSnapshot,
} from "@/features/workbooks/workbook-service";
import {
  createDocument,
  getLatestDocumentSnapshot,
  saveDocumentSnapshot,
} from "@/features/documents/document-service";
import { isServiceFailure } from "@/features/data-tables/types";
import {
  TEMPLATE_SUMMARY_COLUMNS,
  TemplateError,
  createTemplateService,
  type TemplatePorts,
} from "./template-service-core";
import { SYSTEM_ORGANIZATION_ID, type TemplateRow } from "./types";
import { renderAndStoreThumbnail } from "./thumbnail/store-thumbnail";

const table = () => supabase.schema("workbench").from("file_template");

const ports: TemplatePorts = {
  async userId() {
    const { data } = await getClaimsUser(supabase);
    return data?.user?.id ?? null;
  },
  activeOrgId: () => ensureOrgId(null),
  async listRows(f) {
    let q = table()
      .select(TEMPLATE_SUMMARY_COLUMNS)
      .eq("kind", f.kind)
      .is("deleted_at", null);
    if (f.category) q = q.eq("category", f.category);
    if (f.lane === "featured") q = q.eq("organization_id", SYSTEM_ORGANIZATION_ID);
    else if (f.lane) q = q.neq("organization_id", SYSTEM_ORGANIZATION_ID);
    if (f.lane === "mine") q = q.eq("created_by", f.userId ?? "");
    if (f.lane === "org") q = q.eq("visibility", "internal");
    if (f.lane === "community") q = q.eq("visibility", "public");
    const { data, error } = await q
      .order("sort_order", { ascending: true })
      .order("updated_at", { ascending: false })
      .limit(f.limit);
    if (error) throw new TemplateError(error.message);
    return (data ?? []) as TemplateRow[];
  },
  async getSnapshot(templateId) {
    const { data, error } = await table()
      .select(`${TEMPLATE_SUMMARY_COLUMNS}, snapshot`)
      .eq("id", templateId)
      .is("deleted_at", null)
      .maybeSingle();
    if (error) throw new TemplateError(error.message);
    if (!data) throw new TemplateError("This template is no longer available.");
    const { snapshot, ...row } = data as TemplateRow & { snapshot: unknown };
    return { row, snapshot };
  },
  async insertRow(row) {
    const { data, error } = await table()
      .insert({ ...row, snapshot: row.snapshot as never })
      .select(TEMPLATE_SUMMARY_COLUMNS)
      .single();
    if (error) throw new TemplateError(error.message);
    return data as TemplateRow;
  },
  async setThumbnail(templateId, fileId) {
    const { data, error } = await table()
      .update({ thumbnail_file_id: fileId })
      .eq("id", templateId)
      .select("id");
    if (error) throw new TemplateError(error.message);
    if (!data || data.length === 0) {
      throw new TemplateError("The thumbnail was not saved (no permission on this template).");
    }
  },
  async latestRecordSnapshot(kind, recordId) {
    if (kind === "workbook") {
      const res = await getLatestSnapshot(recordId);
      if (isServiceFailure(res)) throw new TemplateError(res.error);
      return res.data?.snapshot ?? null;
    }
    const res = await getLatestDocumentSnapshot(recordId);
    if (isServiceFailure(res)) throw new TemplateError(res.error);
    return res.data?.snapshot ?? null;
  },
  async createRecord(kind, name, orgId, snapshot) {
    if (kind === "workbook") {
      const created = await createWorkbook({ name, organizationId: orgId });
      if (isServiceFailure(created)) throw new TemplateError(created.error);
      const saved = await saveSnapshot({ workbookId: created.data.id, snapshot, origin: "autosave" });
      if (isServiceFailure(saved)) throw new TemplateError(saved.error);
      return created.data.id;
    }
    const created = await createDocument({ name, organizationId: orgId });
    if (isServiceFailure(created)) throw new TemplateError(created.error);
    const saved = await saveDocumentSnapshot({ documentId: created.data.id, snapshot, origin: "autosave" });
    if (isServiceFailure(saved)) throw new TemplateError(saved.error);
    return created.data.id;
  },
  renderThumbnail: renderAndStoreThumbnail,
};

const service = createTemplateService(ports);

export const listTemplates = service.listTemplates;
export const createFromTemplate = service.createFromTemplate;
export const saveAsTemplate = service.saveAsTemplate;
export { TemplateError };

/** The template's stored content (for a live preview while its thumbnail is missing). */
export async function getTemplateSnapshot(templateId: string): Promise<unknown> {
  return (await ports.getSnapshot(templateId)).snapshot;
}
