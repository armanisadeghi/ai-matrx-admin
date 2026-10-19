/** @jest-environment jsdom */

import { act } from "react";
import { createRoot } from "react-dom/client";
import type { MatrxDataTableProps } from "@ai-matrx/design-system/data-table";
import type { MandatePatrolRun, MandatePatrolSection } from "../references";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let tableProps: MatrxDataTableProps<MandatePatrolRun> | null = null;

jest.mock("@ai-matrx/design-system/data-table", () => ({
  MatrxDataTable: (props: MatrxDataTableProps<MandatePatrolRun>) => {
    tableProps = props;
    return null;
  },
  MatrxDetailGrid: () => null,
}));
jest.mock("@/components/cost/useCostDisplay", () => ({
  useCostDisplay: () => ({ unit: "usd", rate: null, format: (n: number) => String(n) }),
}));
jest.mock("@/components/errors/ErrorAlchemyMenu", () => ({ ErrorAlchemyMenu: () => null }));
jest.mock("@/lib/api/call-api", () => ({ callApi: jest.fn() }));
jest.mock("@/utils/supabase/client", () => ({ createClient: jest.fn() }));
jest.mock("@/utils/supabase/webDb", () => ({ requireAuthenticatedSupabaseSession: jest.fn() }));

import { PatrolRunsTable } from "../MandateReferenceBoardView";

describe("patrol runs table", () => {
  it("opens a run in its window and says it shows the latest of all runs counted", async () => {
    const patrol = { runs: [], runs_counted: 258, enabled: true, trigger_enabled: true } as unknown as MandatePatrolSection;
    await act(async () => {
      createRoot(document.createElement("div")).render(<PatrolRunsTable patrol={patrol} />);
    });
    expect(tableProps?.detail?.enabled).not.toBe(false);
    expect(tableProps?.window?.enabled).not.toBe(false);
    expect(tableProps?.paginationLabelFormat?.(1, 10, 10)).toBe("Latest 10 of 258 runs");
  });
});
