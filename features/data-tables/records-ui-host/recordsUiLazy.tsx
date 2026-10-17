"use client";

// recordsUiLazy.tsx — the ONE lazy edge to the records-ui front door (ITEM Y, `RecordsUiFrontDoor.tsx`).
//
// THE FRONT DOOR (Arman, 2026-10-16). `@ai-matrx/records-ui`'s root (ITEM X, ~1.85 MB) is imported
// by `RecordsUiFrontDoor.tsx` alone, and that file is imported by this one alone, through the ONE
// `import()` below (`loadFrontDoor`; THE FRAGMENTATION LAW: a shared loader is one edge). Every
// screen the app draws is a wrapper here, so a page pays for the root only when it RENDERS a screen
// (a route that mounts one, a dialog that opens one). Guard: `pnpm check:records-ui-front-door`.
//
// SSR: every wrapper keeps `ssr: true`. Each importer was a client component that server-rendered
// its screen; the public form (`/f/[formId]`) and the portal forms render for strangers, and a table
// page's first frame is its server HTML. Turning that off would blank the server render and shift
// the layout. `ssr: true` keeps the server HTML and defers only the browser's fetch to the render.
//
// LOADING: a screen with a skeleton paints it (from `@ai-matrx/records-ui/skeleton`, which never
// reaches the root); a provider or a small control paints nothing for the moment the chunk is out.
//
// THE CONSOLE TELLS THE TRUTH: each wrapper says once which component asked for it
// (`[records-ui] lazy <X> requested by <caller>`, the caller read from React's owner stack in
// development), and the front door says once which request opened it. A front door that evaluates
// before any request screams (`frontDoorFirstRequest`).
//
// Code that needs a value or a hook from the root while it draws (`scalarText`, `useRecordRights`)
// is a body given to `withRecordsUi`, which hands it the loaded module as `ru`; code already inside
// a lazy screen reads it with `useRecordsUiFromScreen`; an async caller awaits `loadRecordsUi`.

import dynamic from "next/dynamic";
import * as React from "react";
import { createContext, useContext, type ComponentType } from "react";
import { RecordsSkeleton, TablePageSkeleton } from "@ai-matrx/records-ui/skeleton";
import type { RecordsUiHost } from "@ai-matrx/records-ui";
import type * as FrontDoor from "./RecordsUiFrontDoor";

/** The front door's module: every screen, value and hook it re-exports from the root. */
export type RecordsUiModule = typeof FrontDoor;

type ComponentName = {
  [K in keyof RecordsUiModule]: RecordsUiModule[K] extends ComponentType<never> ? K : never;
}[keyof RecordsUiModule];
type Props<K extends ComponentName> = RecordsUiModule[K] extends ComponentType<infer P> ? P : never;

// ─── who asked, once per page load ──────────────────────────────────────────────────────────────

type Door = { first: string | null; told: Set<string> };
const DOOR = "__matrxRecordsUiFrontDoor__";

function door(): Door {
  const realm = globalThis as typeof globalThis & { [DOOR]?: Door };
  realm[DOOR] ??= { first: null, told: new Set() };
  return realm[DOOR];
}

/** The component that rendered the one asking, from React's owner stack (development only). */
function callerOfThisRender(): string {
  const capture = (React as { captureOwnerStack?: () => string | null }).captureOwnerStack;
  const stack = typeof capture === "function" ? capture() : null;
  const frame = stack
    ?.split("\n")
    .map((line) => line.trim())
    .find((line) => line.startsWith("at "));
  return frame ? (frame.slice(3).split(" ")[0] ?? "an unnamed component") : "an unnamed component";
}

function noteRequest(component: string, caller: () => string): void {
  const state = door();
  state.first ??= component;
  if (state.told.has(component)) return;
  state.told.add(component);
  console.info(`[records-ui] lazy ${component} requested by ${caller()}`);
}

/**
 * The request that opened the front door — called once, by the front door, as it evaluates. In
 * development a front door that evaluates with no request before it screams: something imported it
 * outside this file's one edge.
 */
export function frontDoorFirstRequest(): string {
  const first = door().first;
  if (first === null && process.env.NODE_ENV !== "production") {
    console.error("[records-ui] FRONT DOOR LOADED WITHOUT A REQUEST");
  }
  return first ?? "no request";
}

// ─── THE ONE EDGE ───────────────────────────────────────────────────────────────────────────────

const loadFrontDoor = () => import("./RecordsUiFrontDoor");

/** For a caller that needs the root outside a render (an async save, a preview built on click). */
export function loadRecordsUi(caller: string): Promise<RecordsUiModule> {
  noteRequest(caller, () => caller);
  return loadFrontDoor();
}

// ─── the loaded module, for code drawn inside a screen ─────────────────────────────────────────

const RecordsUiModuleContext = createContext<RecordsUiModule | null>(null);

/** The front door's module when this component is drawn inside a lazy screen; null outside one. */
export function useRecordsUiFromScreen(): RecordsUiModule | null {
  return useContext(RecordsUiModuleContext);
}

/**
 * The front door's module for a component that is ALWAYS drawn inside a lazy screen or a
 * `withRecordsUi` body. Drawn anywhere else it throws, naming itself: a records-ui value read
 * outside the screen that provides it is a wiring defect, never a silent blank.
 */
export function useRecordsUiModule(who: string): RecordsUiModule {
  const m = useContext(RecordsUiModuleContext);
  if (!m) throw new Error(`[records-ui] ${who} drew outside a records-ui screen, so the front door's module is not loaded for it.`);
  return m;
}

const NO_SCREEN_HOST: RecordsUiHost = {};
const noScreenHost = (): RecordsUiHost => NO_SCREEN_HOST;

/**
 * THE HOST THE SCREEN ABOVE WAS GIVEN (records-ui's `useRecordsUi`), for a hook drawn inside a lazy
 * screen. Outside any screen there is no host, as `useRecordsUi` itself answers: `{}`.
 */
export function useScreenRecordsUiHost(): RecordsUiHost {
  const useHost = useContext(RecordsUiModuleContext)?.useRecordsUi ?? noScreenHost;
  return useHost();
}

function provided<K extends ComponentName>(m: RecordsUiModule, name: K): ComponentType<Props<K>> {
  // The screen's own props pass through untouched; the generic name cannot narrow `m[name]` for JSX.
  const Screen = m[name] as unknown as ComponentType<object>;
  function WithModule(props: Props<K>) {
    return (
      <RecordsUiModuleContext.Provider value={m}>
        <Screen {...(props as object)} />
      </RecordsUiModuleContext.Provider>
    );
  }
  WithModule.displayName = `RecordsUiLoaded(${name})`;
  return WithModule;
}

function requested<P extends object>(name: string, Loaded: ComponentType<P>): ComponentType<P> {
  function RecordsUiLazy(props: P) {
    noteRequest(name, callerOfThisRender);
    return <Loaded {...props} />;
  }
  RecordsUiLazy.displayName = `RecordsUiLazy(${name})`;
  return RecordsUiLazy;
}

/**
 * A component of this app that needs the root WHILE IT DRAWS (a value like `scalarText`, a hook like
 * `useRecordRights`): its body receives the loaded module as `ru`, and the whole body waits behind
 * the one edge. `name` is what the console says asked.
 */
export function withRecordsUi<P extends object>(
  name: string,
  Body: ComponentType<P & { ru: RecordsUiModule }>,
): ComponentType<P> {
  const Loaded = dynamic<P>(
    () =>
      loadFrontDoor().then((m) => {
        function WithRecordsUi(props: P) {
          return (
            <RecordsUiModuleContext.Provider value={m}>
              <Body {...props} ru={m} />
            </RecordsUiModuleContext.Provider>
          );
        }
        WithRecordsUi.displayName = `WithRecordsUi(${name})`;
        return WithRecordsUi;
      }),
    { ssr: true, loading: () => null },
  );
  return requested(name, Loaded);
}

// ─── THE SCREENS (one wrapper each; all behind `loadFrontDoor`) ─────────────────────────────────

export const ActionInbox = requested("ActionInbox", dynamic<Props<"ActionInbox">>(() => loadFrontDoor().then((m) => provided(m, "ActionInbox")), { ssr: true, loading: () => null }));
export const ArchiveDeliberatelyDialog = requested("ArchiveDeliberatelyDialog", dynamic<Props<"ArchiveDeliberatelyDialog">>(() => loadFrontDoor().then((m) => provided(m, "ArchiveDeliberatelyDialog")), { ssr: true, loading: () => null }));
export const ArchivedDisclosure = requested("ArchivedDisclosure", dynamic<Props<"ArchivedDisclosure">>(() => loadFrontDoor().then((m) => provided(m, "ArchivedDisclosure")), { ssr: true, loading: () => null }));
export const BookingBuilder = requested("BookingBuilder", dynamic<Props<"BookingBuilder">>(() => loadFrontDoor().then((m) => provided(m, "BookingBuilder")), { ssr: true, loading: () => null }));
export const CalendarLinks = requested("CalendarLinks", dynamic<Props<"CalendarLinks">>(() => loadFrontDoor().then((m) => provided(m, "CalendarLinks")), { ssr: true, loading: () => null }));
export const CaptureRun = requested("CaptureRun", dynamic<Props<"CaptureRun">>(() => loadFrontDoor().then((m) => provided(m, "CaptureRun")), { ssr: true, loading: () => null }));
export const ChartBlock = requested("ChartBlock", dynamic<Props<"ChartBlock">>(() => loadFrontDoor().then((m) => provided(m, "ChartBlock")), { ssr: true, loading: () => <RecordsSkeleton layout="chart" /> }));
export const ChecklistTemplateEditor = requested("ChecklistTemplateEditor", dynamic<Props<"ChecklistTemplateEditor">>(() => loadFrontDoor().then((m) => provided(m, "ChecklistTemplateEditor")), { ssr: true, loading: () => null }));
export const ConditionGroup = requested("ConditionGroup", dynamic<Props<"ConditionGroup">>(() => loadFrontDoor().then((m) => provided(m, "ConditionGroup")), { ssr: true, loading: () => null }));
export const CustomFieldsSection = requested("CustomFieldsSection", dynamic<Props<"CustomFieldsSection">>(() => loadFrontDoor().then((m) => provided(m, "CustomFieldsSection")), { ssr: true, loading: () => null }));
export const DashboardCanvas = requested("DashboardCanvas", dynamic<Props<"DashboardCanvas">>(() => loadFrontDoor().then((m) => provided(m, "DashboardCanvas")), { ssr: true, loading: () => null }));
export const EntityChartBlock = requested("EntityChartBlock", dynamic<Props<"EntityChartBlock">>(() => loadFrontDoor().then((m) => provided(m, "EntityChartBlock")), { ssr: true, loading: () => <RecordsSkeleton layout="chart" /> }));
export const FieldControl = requested("FieldControl", dynamic<Props<"FieldControl">>(() => loadFrontDoor().then((m) => provided(m, "FieldControl")), { ssr: true, loading: () => null }));
export const FieldEditor = requested("FieldEditor", dynamic<Props<"FieldEditor">>(() => loadFrontDoor().then((m) => provided(m, "FieldEditor")), { ssr: true, loading: () => null }));
export const FormBuilder = requested("FormBuilder", dynamic<Props<"FormBuilder">>(() => loadFrontDoor().then((m) => provided(m, "FormBuilder")), { ssr: true, loading: () => null }));
export const FormLookFrame = requested("FormLookFrame", dynamic<Props<"FormLookFrame">>(() => loadFrontDoor().then((m) => provided(m, "FormLookFrame")), { ssr: true, loading: () => null }));
export const FormRunner = requested("FormRunner", dynamic<Props<"FormRunner">>(() => loadFrontDoor().then((m) => provided(m, "FormRunner")), { ssr: true, loading: () => <RecordsSkeleton layout="form" /> }));
export const Grid = requested("Grid", dynamic<Props<"Grid">>(() => loadFrontDoor().then((m) => provided(m, "Grid")), { ssr: true, loading: () => <RecordsSkeleton layout="grid" /> }));
export const InterfaceScreen = requested("InterfaceScreen", dynamic<Props<"InterfaceScreen">>(() => loadFrontDoor().then((m) => provided(m, "InterfaceScreen")), { ssr: true, loading: () => null }));
export const NotifyRuleEditor = requested("NotifyRuleEditor", dynamic<Props<"NotifyRuleEditor">>(() => loadFrontDoor().then((m) => provided(m, "NotifyRuleEditor")), { ssr: true, loading: () => null }));
export const PageScreen = requested("PageScreen", dynamic<Props<"PageScreen">>(() => loadFrontDoor().then((m) => provided(m, "PageScreen")), { ssr: true, loading: () => null }));
export const Peek = requested("Peek", dynamic<Props<"Peek">>(() => loadFrontDoor().then((m) => provided(m, "Peek")), { ssr: true, loading: () => null }));
export const PickOrAdd = requested("PickOrAdd", dynamic<Props<"PickOrAdd">>(() => loadFrontDoor().then((m) => provided(m, "PickOrAdd")), { ssr: true, loading: () => null }));
export const PortalBuilder = requested("PortalBuilder", dynamic<Props<"PortalBuilder">>(() => loadFrontDoor().then((m) => provided(m, "PortalBuilder")), { ssr: true, loading: () => null }));
export const RecordForm = requested("RecordForm", dynamic<Props<"RecordForm">>(() => loadFrontDoor().then((m) => provided(m, "RecordForm")), { ssr: true, loading: () => <RecordsSkeleton layout="form" /> }));
export const RecordPanel = requested("RecordPanel", dynamic<Props<"RecordPanel">>(() => loadFrontDoor().then((m) => provided(m, "RecordPanel")), { ssr: true, loading: () => <RecordsSkeleton layout="record" /> }));
export const RecordsMount = requested("RecordsMount", dynamic<Props<"RecordsMount">>(() => loadFrontDoor().then((m) => provided(m, "RecordsMount")), { ssr: true, loading: () => null }));
export const RecordsUiProvider = requested("RecordsUiProvider", dynamic<Props<"RecordsUiProvider">>(() => loadFrontDoor().then((m) => provided(m, "RecordsUiProvider")), { ssr: true, loading: () => null }));
export const RefusalLine = requested("RefusalLine", dynamic<Props<"RefusalLine">>(() => loadFrontDoor().then((m) => provided(m, "RefusalLine")), { ssr: true, loading: () => null }));
export const RefusalNotice = requested("RefusalNotice", dynamic<Props<"RefusalNotice">>(() => loadFrontDoor().then((m) => provided(m, "RefusalNotice")), { ssr: true, loading: () => null }));
export const SaveToTable = requested("SaveToTable", dynamic<Props<"SaveToTable">>(() => loadFrontDoor().then((m) => provided(m, "SaveToTable")), { ssr: true, loading: () => null }));
export const SignaturePad = requested("SignaturePad", dynamic<Props<"SignaturePad">>(() => loadFrontDoor().then((m) => provided(m, "SignaturePad")), { ssr: true, loading: () => null }));
export const StandardRecordForm = requested("StandardRecordForm", dynamic<Props<"StandardRecordForm">>(() => loadFrontDoor().then((m) => provided(m, "StandardRecordForm")), { ssr: true, loading: () => <RecordsSkeleton layout="form" /> }));
export const TableDuplicateDialog = requested("TableDuplicateDialog", dynamic<Props<"TableDuplicateDialog">>(() => loadFrontDoor().then((m) => provided(m, "TableDuplicateDialog")), { ssr: true, loading: () => null }));
export const TablePage = requested("TablePage", dynamic<Props<"TablePage">>(() => loadFrontDoor().then((m) => provided(m, "TablePage")), { ssr: true, loading: () => <TablePageSkeleton /> }));
export const TableRenameDialog = requested("TableRenameDialog", dynamic<Props<"TableRenameDialog">>(() => loadFrontDoor().then((m) => provided(m, "TableRenameDialog")), { ssr: true, loading: () => null }));
export const TableSettings = requested("TableSettings", dynamic<Props<"TableSettings">>(() => loadFrontDoor().then((m) => provided(m, "TableSettings")), { ssr: true, loading: () => null }));
export const TablesHome = requested("TablesHome", dynamic<Props<"TablesHome">>(() => loadFrontDoor().then((m) => provided(m, "TablesHome")), { ssr: true, loading: () => <RecordsSkeleton layout="home" /> }));
export const ViewSwitcher = requested("ViewSwitcher", dynamic<Props<"ViewSwitcher">>(() => loadFrontDoor().then((m) => provided(m, "ViewSwitcher")), { ssr: true, loading: () => null }));
export const WhereItLives = requested("WhereItLives", dynamic<Props<"WhereItLives">>(() => loadFrontDoor().then((m) => provided(m, "WhereItLives")), { ssr: true, loading: () => null }));
