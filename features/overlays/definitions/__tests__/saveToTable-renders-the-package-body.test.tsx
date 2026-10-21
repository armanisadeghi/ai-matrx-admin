/**
 * The `saveToTable` overlay renders the chat package's Save to a table body — the SAME body Matrx 2
 * opens — with the web's four host ports bound (placement rule, records config, router Open, the
 * one lazy records-ui edge). The web's own copy of the body (features/save-to-table) is gone.
 *
 * Red before: the render file drew `@/features/save-to-table/SaveToTableOverlay`, a web copy.
 */
import { act } from "react";
import { createRoot } from "react-dom/client";
import { existsSync } from "node:fs";
import { join } from "node:path";

const bodyProps: Array<Record<string, unknown>> = [];
const push = jest.fn();
const emit = jest.fn(async () => undefined);

jest.mock("@ai-matrx/chat/window-panels/windows/tables/SaveToTableWindow", () => ({
  SaveToTableBody: (props: Record<string, unknown>) => {
    bodyProps.push(props);
    return null;
  },
}));
jest.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
jest.mock("next/link", () => ({ __esModule: true, default: () => null }));
jest.mock("@/features/data-tables/records-ui-host/recordsUiLazy", () => ({ RecordsMount: () => null, SaveToTable: () => null }));
jest.mock("@/features/data-tables/records-ui-host/recordsUiHost", () => ({ useAppRecordsConfig: jest.fn() }));
jest.mock("@/features/data-tables/data-source/where-a-table-is-born", () => ({
  whereANewTableIsBorn: jest.fn(async (org: string | null) => {
    if (org === "cancel") throw new Error("closed the picker");
    return { ok: true, store: "record", home: { store: "record", organizationId: org ?? "org-active", userId: "u-1" } };
  }),
}));
jest.mock("@/features/unified-data/recordsNotify", () => ({ RECORDS_NOTIFY: {} }));
jest.mock("@/components/errors/ErrorAlchemyMenu", () => ({ ErrorAlchemyMenu: () => null }));
jest.mock("@/components/ui/dialog", () => {
  const Pass = ({ children }: { children?: unknown }) => children ?? null;
  return { Dialog: Pass, DialogContent: Pass, DialogHeader: Pass, DialogTitle: Pass, DialogDescription: Pass };
});
jest.mock("@/features/overlays/definitions/callbacks/saveToTable", () => ({
  disposeSaveToTableCallbackGroup: jest.fn(),
  emitSaveToTableEvent: (...args: unknown[]) => emit(...(args as [])),
}));
jest.mock("@/lib/redux/hooks", () => ({ useAppSelector: () => "u-1" }));
jest.mock("@/lib/redux/selectors/userSelectors", () => ({ selectUserId: () => "u-1" }));

import OverlayRender, { webWhereBorn } from "../saveToTable.render";
import { useAppRecordsConfig } from "@/features/data-tables/records-ui-host/recordsUiHost";
import { RecordsMount, SaveToTable } from "@/features/data-tables/records-ui-host/recordsUiLazy";

describe("the saveToTable overlay", () => {
  it("renders the package body with the opener's payload and the web's ports", async () => {
    Object.defineProperty(globalThis, "IS_REACT_ACT_ENVIRONMENT", { configurable: true, value: true });
    const close = jest.fn();
    const root = createRoot(document.createElement("div"));
    const data = { text: null, value: [{ a: 1 }], hasValue: true, grid: { headers: ["a"], rows: [["1"]], from: "sheet" }, title: "T", shapeIndex: 2, organizationId: "org-9", makeAtOnce: true, callbackGroupId: "g-1" };
    await act(async () => root.render(<OverlayRender overlayId="saveToTable" isOpen hidden={false} data={data} instanceId="i-1" close={close} />));
    const p = bodyProps[bodyProps.length - 1]!;
    expect(p).toMatchObject({ value: [{ a: 1 }], hasValue: true, grid: { headers: ["a"], rows: [["1"]], from: "sheet" }, title: "T", shapeIndex: 2, organizationId: "org-9", makeAtOnce: true, userId: "u-1" });
    expect(p.whereBorn).toBe(webWhereBorn);
    expect(p.useRecordsConfig).toBe(useAppRecordsConfig);
    expect(p.screens).toEqual({ RecordsMount, SaveToTable });
    (p.onOpenTable as (id: string) => void)("t-1");
    expect(close).toHaveBeenCalled();
    expect(push).toHaveBeenCalledWith("/data/t-1");
    (p.onSaved as (id: string, how: string) => void)("t-1", "new");
    expect(emit).toHaveBeenCalledWith("g-1", { type: "saved", tableId: "t-1", how: "new", tableName: null });
    await act(async () => root.unmount());
  });

  it("asks the web's placement rule; a closed organization picker is 'not now'", async () => {
    await expect(webWhereBorn("org-2")).resolves.toEqual({ ok: true, organizationId: "org-2" });
    await expect(webWhereBorn("cancel")).resolves.toEqual({ ok: false, cancelled: true });
  });

  it("keeps no web copy of the body", () => {
    expect(existsSync(join(process.cwd(), "features/save-to-table/SaveToTableOverlay.tsx"))).toBe(false);
  });
});
