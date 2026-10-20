/**
 * @jest-environment jsdom
 */
// features/unified-data/base/__tests__/base-page-draws-once-with-its-saved-name.test.tsx — TEMPLATE-UI-POLISH (2026-10-20).
//
// THE USE CASE. A member opens a base that has a saved name. BEFORE: the page drew as soon as the tables were read, with the
// first table's name as the title and "Name this base" on the button, then swapped both when the saved name arrived (a layout
// shift and a prompt for something already done). NOW: the page draws when the tables AND the saved name are read, together.
// RED on the prior bytes: while the name read was pending the page showed "Name this base".
import * as React from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";

let finishName: (v: unknown) => void = () => undefined;
const readBase = jest.fn(() => new Promise((resolve) => { finishName = resolve; }));
jest.mock("../baseStore", () => ({
  readBase: (...a: unknown[]) => readBase(...(a as [])),
  listBases: jest.fn(), saveBase: jest.fn(), archiveBaseIdentity: jest.fn(), baseMoveAccessKept: jest.fn(), baseMoveRemoveAccess: jest.fn(),
  listSnapshots: jest.fn(), saveSnapshot: jest.fn(), setSnapshotSchedule: jest.fn(), trashSnapshot: jest.fn(),
}));
const client = {
  tableList: jest.fn(async () => ({ ok: true, data: [{ id: "t1", name: "Staff list", organization_id: "org-1", home_id: "home-1", archived_at: null }] })),
  dashboards: jest.fn(async () => ({ ok: true, data: [] })),
  automations: jest.fn(async () => ({ ok: true, data: { automations: [] } })),
};
jest.mock("@ai-matrx/records/react", () => ({ useRecordsClient: () => client }));
jest.mock("@ai-matrx/records/core", () => ({ ensureTable: jest.fn() }));
jest.mock("@ai-matrx/records", () => ({ duplicateBase: jest.fn(), restoredBaseName: jest.fn(), snapshotBase: jest.fn() }));
jest.mock("@ai-matrx/records-ui/helpers", () => ({ recordsDataSource: () => ({}), isInterface: () => false, isPage: () => false }));
jest.mock("next/navigation", () => ({ useRouter: () => ({ refresh: jest.fn(), push: jest.fn() }) }));
jest.mock("next/link", () => ({ __esModule: true, default: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a> }));
jest.mock("@/lib/redux/hooks", () => ({ useAppSelector: () => [] }));
jest.mock("@/features/scopes/redux/selectors/tree", () => ({ selectOrganizationsList: () => [] }));
jest.mock("@/features/unified-data/table-page/TableAccessBar", () => ({ ActivityFeedButton: () => null }));
jest.mock("@/features/make/MakeMount", () => ({ MakeMount: ({ children }: { children: React.ReactNode }) => children }));
jest.mock("@/features/make/gallery/galleryHref", () => ({ TEMPLATE_GALLERY_HREF: "/templates" }));
jest.mock("@/features/overlays/definitions/saveTemplateDialog.overlay", () => ({ useOpenSaveTemplateDialog: () => jest.fn() }));
jest.mock("@/features/unified-data/objectOrganization", () => ({ useObjectOrganization: () => ({ state: "found", organizationId: "org-1" }) }));
jest.mock("@/utils/supabase/client", () => ({ createClient: () => ({}) }));
jest.mock("@/features/organizations/useOrganizationRequired", () => ({ useOrganizationRequired: () => ({ organizationState: "ready", organizationId: "org-1" }) }));
jest.mock("@/features/organizations/components/OrganizationChooser", () => ({ OrganizationChooser: () => null }));
jest.mock("../AirtableImportDialog", () => ({ AirtableImportDialog: () => null }));
jest.mock("../SheetsImportDialog", () => ({ SheetsImportDialog: () => null }));
jest.mock("../GithubImportDialog", () => ({ GithubImportDialog: () => null }));
jest.mock("../useBasePort", () => ({ useBasePort: () => ({ archive: jest.fn() }) }));
jest.mock("../baseMoveJob", () => ({ followBaseSnapshotJob: jest.fn(), planBaseMove: jest.fn(), readBaseMoveJob: jest.fn(), snapshotProgressLine: jest.fn(), startBaseMoveJob: jest.fn(), startBaseSnapshotJob: jest.fn(), startSnapshotRestoreJob: jest.fn() }));
jest.mock("@/components/ui/confirm-dialog", () => ({ ConfirmDialog: () => null }));
jest.mock("@/components/ui/dialog", () => ({
  Dialog: ({ open, children }: { open: boolean; children: React.ReactNode }) => (open ? <div>{children}</div> : null),
  DialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
}));
jest.mock("@ai-matrx/design-system", () => ({ ErrorNotice: ({ message }: { message: string }) => <p>{message}</p> }));
jest.mock("@ai-matrx/design-system/controls", () => ({
  Button: ({ children, variant: _v, ...p }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: string }) => <button type="button" {...p}>{children}</button>,
  Field: (p: React.InputHTMLAttributes<HTMLInputElement>) => <input {...p} />,
}));

import { BasePage } from "../BaseScreens";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root | null = null;
let el: HTMLDivElement | null = null;
afterEach(() => { act(() => root?.unmount()); el?.remove(); root = null; });
const settle = async () => { for (let i = 0; i < 30; i += 1) await act(async () => Promise.resolve()); };

it("never shows 'Name this base' or the first table's name while the saved name is still being read", async () => {
  el = document.createElement("div");
  document.body.append(el);
  root = createRoot(el);
  act(() => root!.render(<BasePage homeId="home-1" />));
  await settle();
  expect(readBase).toHaveBeenCalled();
  expect(el.textContent).not.toContain("Name this base");
  expect(el.querySelector("[data-base-name]")).toBeNull();
  await act(async () => finishName({ id: "b1", name: "Harbor Staffing Base", home_id: "home-1", organization_id: "org-1", icon: null, color: null, description: null }));
  await settle();
  expect(el.querySelector("[data-base-name]")?.textContent).toBe("Harbor Staffing Base");
  expect(el.textContent).toContain("Edit");
  expect(el.textContent).not.toContain("Name this base");
});
