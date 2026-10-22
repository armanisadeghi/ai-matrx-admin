// Audit round 2 (minor): the dashboard widget's Table picker was a plain menu of 1,391 tables. It is the
// searchable option combobox (the house rule: above twelve options, a list is scanned by typing).
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const rows = Array.from({ length: 40 }, (_, i) => ({ kind: "table", itemId: `t${i}`, name: `Table ${i}`, mine: i % 2 === 0, organizationName: "Org" }));
const stable = {};
jest.mock("@ai-matrx/records/react", () => ({ useRecordsClient: () => stable }));
jest.mock("@ai-matrx/records/core", () => ({ clientInOrganization: jest.fn() }));
jest.mock("@ai-matrx/records-ui/helpers", () => ({ isInterface: () => false, isPage: () => false }));
jest.mock("@/features/unified-data/objectOrganization", () => ({ useObjectOrganization: () => ({ state: "resolving" }) }));
jest.mock("@/features/data-tables/records-ui-host/recordsDataSource", () => ({ useRecordsDataSource: () => stable }));
jest.mock("@/features/unified-data/home/dataHomeCorpus", () => ({ createDataHomeCorpus: () => ({ load: async () => rows }) }));
jest.mock("@/components/errors/ErrorAlchemyMenu", () => ({ ErrorAlchemyMenu: () => null }));

import { act } from "react";
import { createRoot } from "react-dom/client";
import { DataTablePicker } from "../DataPagePicker";

it("the table picker is a searchable combobox", async () => {
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  await act(async () => root.render(<DataTablePicker value="" onChange={() => {}} />));
  const trigger = host.querySelector('[aria-label="Table"]') as HTMLElement | null;
  expect(trigger?.getAttribute("role")).toBe("combobox");
  act(() => root.unmount());
});
