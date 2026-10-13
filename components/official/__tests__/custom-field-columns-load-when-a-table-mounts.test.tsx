/**
 * THE TABLE HOST'S CUSTOM-FIELD READ LOADS WHEN A TABLE ASKS, NOT WHEN THE APP BOOTS.
 *
 * `MatrxDataTableHost` is mounted on every route by app/Providers.tsx, and every MatrxDataTable
 * calls its `useCustomFieldColumns` port. That port's read (the records clients,
 * `@ai-matrx/records-ui`) used to be imported statically by `useStandardFieldColumns`; it now lives
 * in `loadStandardFields.ts`, reached through ONE `import()` inside the hook's effect.
 *
 * Drives a REAL MatrxDataTable through the REAL host: rows of a registry token mount, and only then
 * is the read's module evaluated and asked for that token across the rows' organizations.
 *
 * RED without the fix: with `useStandardFieldColumns.tsx` importing the read statically, the
 * module is evaluated the moment the host is imported, before any table exists.
 */

import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { MatrxDataTable } from "@ai-matrx/design-system/data-table";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const mockEvaluated: string[] = [];
const mockLoadFields = jest.fn(async () => ({ fields: [], unavailable: 0, error: null }));

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn() }),
  usePathname: () => "/crm",
}));
jest.mock("@/lib/toast", () => ({
  toast: { error: jest.fn(), success: jest.fn(), info: jest.fn(), warning: jest.fn() },
  toastErrorAlreadyCaptured: jest.fn(),
  recordToast: { info: jest.fn() },
}));
// The density knob is a server read; not what this test is about.
jest.mock("@/lib/scoped-config/effectiveKnobs.client", () => ({ useEffectiveKnob: () => undefined }));
jest.mock("@/features/unified-data/standard-field-columns/loadStandardFields", () => {
  mockEvaluated.push("loadStandardFields");
  return { loadFields: (...args: unknown[]) => (mockLoadFields as (...a: unknown[]) => unknown)(...args) };
});

import { MatrxDataTableHost } from "@/components/official/MatrxDataTableHost";

interface Row {
  id: string;
  name: string;
  organization_id: string;
}
const ROWS: Row[] = [
  { id: "r1", name: "Acme", organization_id: "org-1" },
  { id: "r2", name: "Globex", organization_id: "org-1" },
];

const store = configureStore({
  reducer: {
    appContext: () => ({ organization_id: "org-1" }),
    userAuth: () => ({ id: "user-1" }),
  },
});

let root: Root;
let container: HTMLDivElement;
beforeEach(() => {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});
afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

const flush = async () => {
  for (let i = 0; i < 5; i += 1) {
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
  }
};

it("the host alone loads no read; a table of registry rows loads it once and asks for its token", async () => {
  expect(mockEvaluated).toEqual([]);

  act(() => {
    root.render(
      <Provider store={store}>
        <MatrxDataTableHost>
          <div data-testid="page">no table yet</div>
        </MatrxDataTableHost>
      </Provider>,
    );
  });
  await flush();
  expect(mockEvaluated).toEqual([]);

  act(() => {
    root.render(
      <Provider store={store}>
        <MatrxDataTableHost>
          <MatrxDataTable<Row>
            data={ROWS}
            columns={[{ accessorKey: "name", header: "Name" }]}
            getRowId={(row) => row.id}
            rowToken="party"
            pageSize={0}
            selection={false}
            detail={{ enabled: false }}
            window={{ enabled: false }}
            virtualize={{ enabled: false }}
          />
        </MatrxDataTableHost>
      </Provider>,
    );
  });
  await flush();

  expect(container.textContent).toContain("Acme");
  expect(mockEvaluated).toEqual(["loadStandardFields"]);
  expect(mockLoadFields).toHaveBeenCalledWith("party", ["org-1"], "user-1");
});
