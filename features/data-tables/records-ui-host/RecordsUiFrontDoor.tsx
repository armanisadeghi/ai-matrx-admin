"use client";

// RecordsUiFrontDoor.tsx — ITEM Y: the ONE file in this app that imports `@ai-matrx/records-ui`'s
// runtime values (ITEM X, the package root: every screen, ~1.85 MB).
//
// THE FRONT DOOR (Arman, 2026-10-16): "Make absolute certain that it's only imported ONE time and
// that everything else only imports Y CONDITIONALLY." Nothing imports this file except
// `recordsUiLazy.tsx`, through its one `import()` (`loadFrontDoor`), which runs only when a lazy
// screen renders or an async caller asks (`loadRecordsUi`). Types stay `import type` from the root
// anywhere (erased); pure names come from the light entries (`/helpers`, `/data-source`,
// `/table-shape`, `/object-actions`, `/skeleton`). Guard: `pnpm check:records-ui-front-door`.
//
// Adding a screen: export it here, then give it a wrapper in `recordsUiLazy.tsx`.

import { frontDoorFirstRequest } from "./recordsUiLazy";

console.info("[records-ui] FRONT DOOR LOADED (ITEM X chunk) — first opened by:", frontDoorFirstRequest());

export {
  // Screens.
  ActionInbox,
  ArchiveDeliberatelyDialog,
  ArchivedDisclosure,
  BookingBuilder,
  CalendarLinks,
  CalendarView,
  CaptureRun,
  ChartBlock,
  ChecklistTemplateEditor,
  ConditionGroup,
  CustomFieldsSection,
  DashboardCanvas,
  EntityBoard,
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
  ProvenanceBadge,
  RecordForm,
  RecordLabelProvider,
  RecordPanel,
  RecordValue,
  RecordsMount,
  RecordsTableCard,
  RecordsUiProvider,
  RefusalLine,
  RefusalNotice,
  SaveToTable,
  SectionCard,
  SignaturePad,
  StandardRecordForm,
  TableDuplicateDialog,
  TablePage,
  TableRenameDialog,
  TableTokensProvider,
  TableSettings,
  TablesHome,
  TemplatePreview,
  TimelineView,
  ViewSwitcher,
  WhereItLives,
  // Values a screen-side caller needs (they reach screens or React, so `/helpers` cannot carry them).
  cardWords,
  clusterPins,
  scalarText,
  saveTableDescription,
  // Hooks that read the contexts the screens above provide.
  useRecordActionHost,
  useRecordLabels,
  useRecordRights,
  useRecordsUi,
} from "@ai-matrx/records-ui";
