"use client";

// features/research/components/reader/ResearchRecordReader.tsx
//
// A research record (a synthesis or the assembled document) in THE annotated
// reader (`features/rich-document/reader/AnnotatedReader`): outline, the full
// reading set, Notes & comments — plus the research surface on top: the
// right-click menu and the topic's agents read the open record, its comment
// threads and the person's own highlights (`ResearchReadingRecordBridge`).

import type { ReactNode } from "react";
import type { Layout } from "react-resizable-panels";
import { NonEditableContextMenu } from "@ai-matrx/context-menu/react";
import { buildApplicationScopeFromMenuContext } from "@ai-matrx/context-menu/engine";
import { AnnotatedReader, type AnnotatedReaderProps, type ReaderTab } from "@/features/rich-document/reader/AnnotatedReader";
import type { AnnotationSource } from "@/features/rich-document/annotations/types";
import { readEditedRecordVersion, saveReaderEdit } from "../../service";
import { useTopicContext } from "../../context/ResearchContext";
import {
  buildResearchContextData,
  RESEARCH_CONTEXT_MENU_PROPS,
} from "../../agent-context/buildResearchContextData";
import {
  ResearchReadingRecordBridge,
  useResearchReadingRecordRef,
  type ResearchReadingRecord,
} from "../../agent-context/readingRecord";

export type ResearchReaderRecord = Omit<ResearchReadingRecord, "comments" | "notes"> & {
  href: string;
  /** The row's edit counter. Present = an accepted suggestion can be saved into the record. */
  rowVersion?: number | null;
  /** Called after an accepted suggestion saved (the host re-reads the record). */
  onEdited?: () => void;
};

export function ResearchRecordReader({
  groupKey,
  defaultLayout,
  record,
  panelLabel,
  panelActions,
  library,
  details,
  toolbar,
  header,
  placeholder,
  extraTabs,
}: {
  groupKey: string;
  defaultLayout?: Layout;
  /** The record to read; null shows `placeholder` (loading, empty, failed, streaming). */
  record: ResearchReaderRecord | null;
  panelLabel: string;
  panelActions?: ReactNode;
  library?: AnnotatedReaderProps["library"];
  details?: ReactNode;
  toolbar?: ReactNode;
  header?: ReactNode;
  placeholder?: ReactNode;
  extraTabs?: readonly ReaderTab[];
}) {
  const { topic, progress } = useTopicContext();
  const recordRef = useResearchReadingRecordRef();

  const editable = Boolean(record && record.rowVersion != null && record.type !== "research_analysis");
  const source: AnnotationSource | null = record
    ? {
        token: record.type,
        id: record.id,
        title: record.title,
        body: record.body,
        contentVersion: Math.max(1, record.version),
        href: record.href,
        // Earlier text a reader edit kept, so anchors map through the change.
        ...(record.type !== "research_analysis"
          ? { readVersionBody: (captureVersion: number) => readEditedRecordVersion(record.type as "research_synthesis" | "research_document", record.id, captureVersion) }
          : {}),
        // An accepted suggestion saves INTO the record (old text kept as a version).
        ...(editable
          ? {
              save: async (nextBody: string) => {
                try {
                  await saveReaderEdit(record.type as "research_synthesis" | "research_document", record.id, nextBody, record.rowVersion!);
                } catch (cause) {
                  // Someone saved first: show their text, then say so (the sidecar names it).
                  if ((cause as { code?: unknown })?.code === "PT409") record.onEdited?.();
                  throw cause;
                }
                record.onEdited?.();
              },
            }
          : {}),
      }
    : null;

  const contextData = () =>
    buildResearchContextData({
      topic,
      progress,
      displayTitle: record?.title,
      readingRecord: recordRef?.current ?? (record ? { ...record } : null),
    });
  // Plain fn (React Compiler memoizes) — reads the live selection and reading set at click.
  const getApplicationScope = () =>
    buildApplicationScopeFromMenuContext({
      selectedText: typeof window !== "undefined" ? (window.getSelection()?.toString() ?? "") : "",
      selectionRange: null,
      contextData: contextData(),
    });

  return (
    <AnnotatedReader
      groupKey={groupKey}
      defaultLayout={defaultLayout}
      source={source}
      panelLabel={panelLabel}
      panelActions={panelActions}
      library={library}
      details={details}
      toolbar={toolbar}
      header={header}
      placeholder={placeholder}
      extraTabs={extraTabs}
      wrapBody={(body) => (
        <NonEditableContextMenu {...RESEARCH_CONTEXT_MENU_PROPS} getApplicationScope={getApplicationScope} contextData={contextData()}>
          <div>{body}</div>
        </NonEditableContextMenu>
      )}
    >
      {record && <ResearchReadingRecordBridge record={record} />}
    </AnnotatedReader>
  );
}
