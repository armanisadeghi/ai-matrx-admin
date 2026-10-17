// recordsUiLazy.jest-shim.tsx — the records-ui front door, made SYNCHRONOUS for Jest only.
//
// WHY THIS EXISTS (records-ui front door, 2026-10-17). In the app, every records-ui screen reaches a
// page through `recordsUiLazy.tsx`'s one `import()` of `RecordsUiFrontDoor.tsx` (ITEM Y), which
// alone imports `@ai-matrx/records-ui` (ITEM X). Jest suites written before that door mock the
// ROOT (`jest.mock("@ai-matrx/records-ui", …)`) and render synchronously; behind a lazy edge their
// mock arrives a tick late and the screen draws nothing. `jest.config.ts` maps
// `@/features/data-tables/records-ui-host/recordsUiLazy` to this file, so each suite's own root mock
// applies again, unchanged. It exports the same names as the real lazy file.
//
// This file is NEVER part of the app: it sits in `__tests__/` (exempt from
// `pnpm check:records-ui-front-door` by name, and outside every route's graph). The real lazy file
// stays covered by that guard and by the localhost console proof.

import type { ComponentType } from "react";
import * as RecordsUi from "@ai-matrx/records-ui";
import type { RecordsUiHost } from "@ai-matrx/records-ui";
import type { RecordsUiModule } from "../recordsUiLazy";

const ru = RecordsUi as unknown as RecordsUiModule;

export type { RecordsUiModule };

export function frontDoorFirstRequest(): string {
  return "jest (synchronous shim)";
}

export function loadRecordsUi(_caller: string): Promise<RecordsUiModule> {
  return Promise.resolve(ru);
}

export function useRecordsUiFromScreen(): RecordsUiModule | null {
  return ru;
}

export function useRecordsUiModule(_who: string): RecordsUiModule {
  return ru;
}

export function useScreenRecordsUiHost(): RecordsUiHost {
  return typeof RecordsUi.useRecordsUi === "function" ? RecordsUi.useRecordsUi() : {};
}

export function withRecordsUi<P extends object>(_name: string, Body: ComponentType<P & { ru: RecordsUiModule }>): ComponentType<P> {
  function WithRecordsUiSync(props: P) {
    return <Body {...props} ru={ru} />;
  }
  return WithRecordsUiSync;
}

export {
  ActionInbox,
  ArchiveDeliberatelyDialog,
  ArchivedDisclosure,
  BookingBuilder,
  CalendarLinks,
  CaptureRun,
  ChartBlock,
  ChecklistTemplateEditor,
  ConditionGroup,
  CustomFieldsSection,
  DashboardCanvas,
  EntityChartBlock,
  FieldControl,
  FieldEditor,
  FormBuilder,
  FormLookFrame,
  FormRunner,
  Grid,
  InterfaceScreen,
  NotifyRuleEditor,
  PageScreen,
  Peek,
  PickOrAdd,
  PortalBuilder,
  RecordForm,
  RecordPanel,
  RecordsMount,
  RecordsUiProvider,
  RefusalLine,
  RefusalNotice,
  SaveToTable,
  SignaturePad,
  StandardRecordForm,
  TableDuplicateDialog,
  TablePage,
  TableRenameDialog,
  TableSettings,
  TablesHome,
  ViewSwitcher,
  WhereItLives,
} from "@ai-matrx/records-ui";
