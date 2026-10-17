/**
 * W1-STORE 3 - A RECORD PAGE ASKS A MEMBER-ONLY DOOR ONLY FOR AN ORGANIZATION SHE IS IN.
 * Use case: a platform admin opens a Matrx System agent (/agents/<id>). The agent is hers to read through
 * another path, but its organization is the System one she is not a member of, and `custom.entity_record_read`
 * and `custom.entity_back_links` answered "You are not a member of that organization" (about 24 error rows in
 * 7 days). RED before the fix: both doors are asked; GREEN after: neither is, and the section says it is not hers.
 */
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import storeReadsReducer from "@/lib/redux/slices/storeReadsSlice";

const CEDAR_RIDGE = "0a54df90-eab8-4d07-ab29-81a45fb41e04";
const MEETING = "7f75a779-b63c-4c0b-b342-ceeea2670ae4";

const doors = {
  home: jest.fn(async () => ({ ok: true, data: { organization_id: CEDAR_RIDGE } }) as unknown),
  readable: jest.fn(async () => ({ ok: true, data: null }) as unknown),
};

jest.mock("@ai-matrx/records-ui", () => ({
  CustomFieldsSection: () => <div data-test-section="" />,
  RecordsMount: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  personActor: () => ({ actor: "user" }),
  recordsDataSource: () => ({}),
}));
const backLinks = jest.fn();
jest.mock("@/features/unified-data/components/EntityBackLinks", () => ({ EntityBackLinks: (p: { organizationId: string | null }) => { backLinks(p.organizationId); return null; } }));
jest.mock("@/features/unified-data/hub/doors", () => ({
  entityRecordHome: (...args: unknown[]) => (doors.home as (...a: unknown[]) => unknown)(...args),
  entityRecordReadable: (...args: unknown[]) => (doors.readable as (...a: unknown[]) => unknown)(...args),
}));
jest.mock("@/features/organizations/organizationsIAmIn", () => ({ mayReadAsMember: async () => (globalThis as { __member?: boolean }).__member !== false }));
jest.mock("@/lib/redux/slices/appContextSlice", () => ({ selectOrganizationId: () => CEDAR_RIDGE }));
jest.mock("@/lib/redux/selectors/userSelectors", () => ({ selectUserId: () => "user" }));
jest.mock("@/lib/redux/thunks/activeOrgBootstrap", () => ({ chooseActiveOrganization: () => ({ type: "noop" }) }));
jest.mock("@/features/scopes/hooks/useScopeTree", () => ({ useScopeTree: () => ({ organizations: [] }) }));
jest.mock("@/features/scopes/registry/entityRegistry", () => ({ tryGetEntityInfo: () => null }));
// The host module also exports the share surface (ShareModal -> scopes -> associations store), none of which
// this test is about; EntityCustomFields takes only `useAppRecordsConfig` from it.
jest.mock("@/features/data-tables/records-ui-host/recordsUiHost", () => ({
  useAppRecordsConfig: (organizationId: string | null) => ({ dataSource: {}, actor: { actor: "user" }, organizationId }),
}));
jest.mock("@/features/make/MakeMount", () => ({ NewTableDialog: () => null }));
jest.mock("@/utils/supabase/client", () => ({ createClient: () => ({}) }));
jest.mock("@ai-matrx/chat/surfaces/runtime/custom-field-targets", () => ({
  CUSTOM_FIELDS_VALUE_NAME: "custom_fields",
  customFieldsScopeValue: () => null,
  registerCustomFieldsDoor: () => () => undefined,
}));
jest.mock("@ai-matrx/chat/surfaces/runtime/SurfaceRuntimeContext", () => ({
  useSurfaceDormant: () => false,
  useSurfaceRuntime: () => null,
  useSurfaceScopeContribution: () => undefined,
}));
jest.mock("@/features/surfaces/manifests/registry", () => ({ getManifest: () => undefined }));
jest.mock("@/components/ui/button", () => ({
  Button: ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) => (
    <button onClick={onClick}>{children}</button>
  ),
}));



import { EntityCustomFields } from "../EntityCustomFields";
import { forgetAllKeptAnswers } from "@/lib/kept-answer/keptAnswer";

const makeStore = () => configureStore({ reducer: { storeReads: storeReadsReducer } });

describe("a record of an organization she is not in asks no member-only door", () => {
  let host: HTMLDivElement;
  let root: Root;
  beforeAll(() => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  });
  beforeEach(() => {
    forgetAllKeptAnswers();
    jest.clearAllMocks();
    host = document.createElement("div");
    document.body.appendChild(host);
    root = createRoot(host);
  });
  afterEach(() => {
    act(() => root.unmount());
    host.remove();
    (globalThis as { __member?: boolean }).__member = undefined;
  });
  async function show(ui: React.ReactNode) {
    await act(async () => {
      root.render(<Provider store={makeStore()}>{ui}</Provider>);
    });
    for (let i = 0; i < 10; i += 1) await act(async () => void (await Promise.resolve()));
  }

  it("not a member: no record read, no linked-records ask, the line says it is not hers", async () => {
    (globalThis as { __member?: boolean }).__member = false;
    await show(<EntityCustomFields entityToken="agent" recordId={MEETING} organizationId={CEDAR_RIDGE} />);
    expect(doors.readable).not.toHaveBeenCalled();
    expect(backLinks).not.toHaveBeenCalledWith(CEDAR_RIDGE);
    expect(host.textContent).toContain("not in");
  });

  it("a member still reads both", async () => {
    (globalThis as { __member?: boolean }).__member = true;
    await show(<EntityCustomFields entityToken="agent" recordId={MEETING} organizationId={CEDAR_RIDGE} />);
    expect(doors.readable).toHaveBeenCalledTimes(1);
    expect(backLinks).toHaveBeenCalledWith(CEDAR_RIDGE);
  });
});
