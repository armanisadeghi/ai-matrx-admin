/** @jest-environment jsdom */

import { act } from "react";
import { createRoot } from "react-dom/client";
import type { MatrxDataTableProps } from "@ai-matrx/design-system/data-table";
import type { BattleView } from "../types";
import { ToolBattleListPage } from "../components/ToolBattleListPage";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let tableProps: MatrxDataTableProps<BattleView> | null = null;

jest.mock("@ai-matrx/design-system/data-table", () => ({
  MatrxDataTable: (props: MatrxDataTableProps<BattleView>) => {
    tableProps = props;
    return null;
  },
}));
jest.mock("@/features/shell/components/header/templates/RecordPageHeader", () => ({ RecordPageHeader: () => null }));
jest.mock("../service", () => ({ listBattles: () => Promise.resolve([]) }));

describe("tool battle list page", () => {
  it("is the shared data table with search, URL state and a link to each battle", async () => {
    const host = document.createElement("div");
    await act(async () => {
      createRoot(host).render(<ToolBattleListPage />);
    });
    expect(tableProps).not.toBeNull();
    expect(tableProps?.toolbar).toMatchObject({ search: true });
    expect(tableProps?.urlState).toMatchObject({ id: "tool-battles" });
    expect(tableProps?.getRowHref?.({ id: "b1" } as BattleView)).toBe("/administration/tool-battle/b1");
  });
});
