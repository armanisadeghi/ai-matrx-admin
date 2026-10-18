// recordsUiLazy.jest-shim.tsx — the records-ui front door, made SYNCHRONOUS for Jest only.
//
// WHY THIS EXISTS (records-ui front door, 2026-10-17). In the app, every records-ui screen reaches a
// page through `recordsUiLazy.tsx`'s one `import()` of `RecordsUiFrontDoor.tsx` (ITEM Y), which
// alone imports `@ai-matrx/records-ui` (ITEM X). Jest suites written before that door mock the
// ROOT (`jest.mock("@ai-matrx/records-ui", …)`) and render synchronously; behind a lazy edge their
// mock arrives a tick late and the screen draws nothing. `jest.config.ts` maps
// `@/features/data-tables/records-ui-host/recordsUiLazy` to this file, so each suite's own root mock
// applies again, unchanged. It exports the same names as the real lazy file — and
// `the-jest-shim-exports-what-the-lazy-file-exports.test.ts` parses both and fails when they drift
// (2026-10-18: SectionCard and TableTokensProvider were missing; useRecordsUiFromScreen answered the
// module outside a screen where the app answers null).
//
// This file is NEVER part of the app: it sits in `__tests__/` (exempt from
// `pnpm check:records-ui-front-door` by name, and outside every route's graph). The real lazy file
// stays covered by that guard and by the localhost console proof.

import { createContext, useContext, type ComponentType } from "react";
import * as RecordsUi from "@ai-matrx/records-ui";
import type { RecordsUiHost } from "@ai-matrx/records-ui";
import type { RecordsUiModule } from "../recordsUiLazy";

const ru = RecordsUi as unknown as RecordsUiModule;

export type { RecordsUiModule };

// The same semantics as the real file: the module is in context only inside a screen or a
// `withRecordsUi` body; outside one `useRecordsUiFromScreen` answers null.
const RecordsUiModuleContext = createContext<RecordsUiModule | null>(null);

export function frontDoorFirstRequest(): string {
  return "jest (synchronous shim)";
}

export function loadRecordsUi(_caller: string): Promise<RecordsUiModule> {
  return Promise.resolve(ru);
}

export function useRecordsUiFromScreen(): RecordsUiModule | null {
  return useContext(RecordsUiModuleContext);
}

export function useRecordsUiModule(who: string): RecordsUiModule {
  const m = useContext(RecordsUiModuleContext);
  if (!m) throw new Error(`[records-ui] ${who} drew outside a records-ui screen, so the front door's module is not loaded for it.`);
  return m;
}

const NO_SCREEN_HOST: RecordsUiHost = {};
const noScreenHost = (): RecordsUiHost => NO_SCREEN_HOST;

export function useScreenRecordsUiHost(): RecordsUiHost {
  const m = useContext(RecordsUiModuleContext);
  const useHost = (typeof m?.useRecordsUi === "function" ? m.useRecordsUi : null) ?? noScreenHost;
  return useHost();
}

export function withRecordsUi<P extends object>(_name: string, Body: ComponentType<P & { ru: RecordsUiModule }>): ComponentType<P> {
  function WithRecordsUiSync(props: P) {
    return (
      <RecordsUiModuleContext.Provider value={ru}>
        <Body {...props} ru={ru} />
      </RecordsUiModuleContext.Provider>
    );
  }
  return WithRecordsUiSync;
}

/** A screen, synchronously: the suite's own root mock is read at render time, inside the module context. */
function screen(name: string): ComponentType<object> {
  function RecordsUiScreenSync(props: object) {
    const Screen = (RecordsUi as unknown as Record<string, ComponentType<object>>)[name];
    return (
      <RecordsUiModuleContext.Provider value={ru}>
        <Screen {...props} />
      </RecordsUiModuleContext.Provider>
    );
  }
  RecordsUiScreenSync.displayName = `RecordsUiScreenSync(${name})`;
  return RecordsUiScreenSync;
}

export const ActionInbox = screen("ActionInbox") as unknown as RecordsUiModule["ActionInbox"];
export const ArchiveDeliberatelyDialog = screen("ArchiveDeliberatelyDialog") as unknown as RecordsUiModule["ArchiveDeliberatelyDialog"];
export const ArchivedDisclosure = screen("ArchivedDisclosure") as unknown as RecordsUiModule["ArchivedDisclosure"];
export const BookingBuilder = screen("BookingBuilder") as unknown as RecordsUiModule["BookingBuilder"];
export const CalendarLinks = screen("CalendarLinks") as unknown as RecordsUiModule["CalendarLinks"];
export const CaptureRun = screen("CaptureRun") as unknown as RecordsUiModule["CaptureRun"];
export const ChartBlock = screen("ChartBlock") as unknown as RecordsUiModule["ChartBlock"];
export const ChecklistTemplateEditor = screen("ChecklistTemplateEditor") as unknown as RecordsUiModule["ChecklistTemplateEditor"];
export const ConditionGroup = screen("ConditionGroup") as unknown as RecordsUiModule["ConditionGroup"];
export const CustomFieldsSection = screen("CustomFieldsSection") as unknown as RecordsUiModule["CustomFieldsSection"];
export const DashboardCanvas = screen("DashboardCanvas") as unknown as RecordsUiModule["DashboardCanvas"];
export const EntityChartBlock = screen("EntityChartBlock") as unknown as RecordsUiModule["EntityChartBlock"];
export const FieldControl = screen("FieldControl") as unknown as RecordsUiModule["FieldControl"];
export const FieldEditor = screen("FieldEditor") as unknown as RecordsUiModule["FieldEditor"];
export const FormBuilder = screen("FormBuilder") as unknown as RecordsUiModule["FormBuilder"];
export const FormLookFrame = screen("FormLookFrame") as unknown as RecordsUiModule["FormLookFrame"];
export const FormRunner = screen("FormRunner") as unknown as RecordsUiModule["FormRunner"];
export const Grid = screen("Grid") as unknown as RecordsUiModule["Grid"];
export const InterfaceScreen = screen("InterfaceScreen") as unknown as RecordsUiModule["InterfaceScreen"];
export const NotifyRuleEditor = screen("NotifyRuleEditor") as unknown as RecordsUiModule["NotifyRuleEditor"];
export const PageScreen = screen("PageScreen") as unknown as RecordsUiModule["PageScreen"];
export const Peek = screen("Peek") as unknown as RecordsUiModule["Peek"];
export const PickOrAdd = screen("PickOrAdd") as unknown as RecordsUiModule["PickOrAdd"];
export const PortalBuilder = screen("PortalBuilder") as unknown as RecordsUiModule["PortalBuilder"];
export const RecordForm = screen("RecordForm") as unknown as RecordsUiModule["RecordForm"];
export const RecordPanel = screen("RecordPanel") as unknown as RecordsUiModule["RecordPanel"];
export const RecordsMount = screen("RecordsMount") as unknown as RecordsUiModule["RecordsMount"];
export const RecordsUiProvider = screen("RecordsUiProvider") as unknown as RecordsUiModule["RecordsUiProvider"];
export const RefusalLine = screen("RefusalLine") as unknown as RecordsUiModule["RefusalLine"];
export const RefusalNotice = screen("RefusalNotice") as unknown as RecordsUiModule["RefusalNotice"];
export const SaveToTable = screen("SaveToTable") as unknown as RecordsUiModule["SaveToTable"];
export const SignaturePad = screen("SignaturePad") as unknown as RecordsUiModule["SignaturePad"];
export const StandardRecordForm = screen("StandardRecordForm") as unknown as RecordsUiModule["StandardRecordForm"];
export const TableDuplicateDialog = screen("TableDuplicateDialog") as unknown as RecordsUiModule["TableDuplicateDialog"];
export const TablePage = screen("TablePage") as unknown as RecordsUiModule["TablePage"];
export const TableRenameDialog = screen("TableRenameDialog") as unknown as RecordsUiModule["TableRenameDialog"];
export const TableSettings = screen("TableSettings") as unknown as RecordsUiModule["TableSettings"];
export const SectionCard = screen("SectionCard") as unknown as RecordsUiModule["SectionCard"];
export const TableTokensProvider = screen("TableTokensProvider") as unknown as RecordsUiModule["TableTokensProvider"];
export const TablesHome = screen("TablesHome") as unknown as RecordsUiModule["TablesHome"];
export const ViewSwitcher = screen("ViewSwitcher") as unknown as RecordsUiModule["ViewSwitcher"];
export const WhereItLives = screen("WhereItLives") as unknown as RecordsUiModule["WhereItLives"];
