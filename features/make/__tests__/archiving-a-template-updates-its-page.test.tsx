/**
 * @jest-environment jsdom
 */
// features/make/__tests__/archiving-a-template-updates-its-page.test.tsx — TEMPLATE-UI-POLISH (2026-10-20).
//
// THE USE CASE. A member opens her organization's saved template and presses "Archive template", then Archive. The door answers
// "archived". BEFORE: the page kept offering Install and Archive template until she reloaded (the push to the gallery never
// moved a page that stays). NOW: the page follows the door's answer: no Install, no Archive template, and a line saying so.
// RED on the prior bytes: Install and Archive template stay after the door answered.
import * as React from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";

const templateArchive = jest.fn();
jest.mock("next/navigation", () => ({ useRouter: () => ({ push: jest.fn() }) }));
const templates = jest.fn();
jest.mock("@ai-matrx/records/core", () => ({
  storeDoors: () => ({ templates, templateArchive }),
  supabaseDataSource: () => ({}),
}));
jest.mock("@ai-matrx/records/templates", () => ({ runTemplateDoor: jest.fn(), templateUpgradeHint: () => null, upgradeTemplateInstall: jest.fn() }));
jest.mock("@/utils/supabase/client", () => ({ createClient: () => ({}) }));
jest.mock("@/lib/redux/hooks", () => ({ useAppDispatch: () => jest.fn(), useAppSelector: () => null }));
jest.mock("@/features/templates/agentCopyHost", () => ({ templateAgentCopier: jest.fn(), templateAgentArchiver: jest.fn(), templateWorkflowCreator: jest.fn() }));
jest.mock("@/features/templates/components/InstalledTemplate", () => ({ InstalledTemplate: () => null }));
jest.mock("@/features/overlays/definitions/saveTemplateDialog.overlay", () => ({ useOpenSaveTemplateDialog: () => jest.fn() }));
jest.mock("@/lib/entity-list/components/EntityOrgFilter", () => ({ EntityOrgFilter: () => null }));
jest.mock("@/lib/entity-list/orgFilterUrl", () => ({ useOrgFilterParam: () => [null, jest.fn()] }));
jest.mock("@/features/templates/knobs", () => ({ templateKnob: jest.fn() }));
jest.mock("@/features/workflow-runtime/browse/service", () => ({ setWorkflowFlag: jest.fn() }));
jest.mock("@/features/organizations/useOrganizationRequired", () => ({ useOrganizationRequired: () => ({ organizationState: "ready", organizationId: "org-1" }) }));
jest.mock("@/features/organizations/components/OrganizationRequiredNotice", () => ({ OrganizationContextNotice: () => null }));
jest.mock("@/components/errors/ErrorAlchemyMenu", () => ({ ErrorAlchemyMenu: () => null }));
jest.mock("../MakeMount", () => ({ SAVED_WHERE_CHOSEN: "x", SavesTo: () => null }));
jest.mock("../gallery/TemplateCards", () => ({ TemplateCardGrid: () => null, TemplateSummary: () => null }));
jest.mock("@/components/ui/confirm-dialog", () => ({
  ConfirmDialog: ({ open, confirmLabel, onConfirm }: { open: boolean; confirmLabel: string; onConfirm: () => void }) =>
    open ? <button type="button" data-confirm="" onClick={onConfirm}>{confirmLabel}</button> : null,
}));
jest.mock("@/components/ui/button", () => ({
  Button: ({ children, icon: _i, variant: _v, ...p }: React.ButtonHTMLAttributes<HTMLButtonElement> & { icon?: unknown; variant?: string }) => <button type="button" {...p}>{children}</button>,
}));
jest.mock("@/components/ui/select", () => ({ Select: () => null, SelectContent: () => null, SelectItem: () => null, SelectTrigger: () => null, SelectValue: () => null }));
jest.mock("@ai-matrx/design-system", () => ({ Skeleton: () => <span data-skeleton="" /> }));

import { TemplatePreview } from "../gallery/TemplateGallery";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const CARD = { id: "tpl-1", catalogue_id: "cat-1", name: "My setup", scope: "org", version: 1, installed: null, ephemeral: false };
let root: Root | null = null;
let el: HTMLDivElement | null = null;
afterEach(() => {
  act(() => root?.unmount());
  el?.remove();
  root = null;
  jest.clearAllMocks();
});
const settle = async () => { for (let i = 0; i < 20; i += 1) await act(async () => Promise.resolve()); };
const named = (host: HTMLElement, words: string) => [...host.querySelectorAll("button")].find((b) => (b.textContent ?? "").trim() === words);

it("after the door answers archived, the page stops offering Install and Archive template, and says so", async () => {
  templates.mockResolvedValue({ data: { total: 1, cards: [CARD] }, error: null });
  templateArchive.mockResolvedValue({ data: { archived: true }, error: null });
  el = document.createElement("div");
  document.body.append(el);
  root = createRoot(el);
  act(() => root!.render(<TemplatePreview templateId="tpl-1" bare />));
  await settle();
  expect(named(el, "Install")).toBeTruthy();
  await act(async () => named(el!, "Archive template")!.click());
  await act(async () => (el!.querySelector("[data-confirm]") as HTMLButtonElement).click());
  await settle();
  expect(templateArchive).toHaveBeenCalledWith("tpl-1");
  expect(named(el, "Install")).toBeUndefined();
  expect(named(el, "Archive template")).toBeUndefined();
  expect(el.querySelector("[data-make-template-archived]")).toBeTruthy();
});
