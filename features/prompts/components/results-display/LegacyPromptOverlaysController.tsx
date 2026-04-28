"use client";

/**
 * LegacyPromptOverlaysController
 *
 * Tiny dedicated controller for the 7 prompt-runner overlays that still hang
 * off `promptRunnerSlice` and have not been absorbed into the unified
 * `windowRegistry` (because the entire prompt subsystem is scheduled for
 * deletion in migration phases 16-19 — see `features/agents/migration/`).
 *
 * Why this file exists separately:
 *   - The shared `OverlaySurface` reads from `overlaySlice` via `useOverlay*`
 *     hooks. The 7 overlays below dispatch to `promptRunnerSlice` and have
 *     bespoke selectors. Forcing them through the registry would mean
 *     migrating an entire slice — wasteful given imminent deletion.
 *   - The original 2,569-line `components/overlays/OverlayController.tsx`
 *     hosted these alongside ~92 other overlays. Having them all in one
 *     file ballooned the build cost (Turbopack had to walk every dynamic
 *     `import()` target). Excising them into this 7-import file preserves
 *     the build-time win measured on 2026-04-28 (~22min → ~9min on Vercel).
 *
 * Lazy-loading contract:
 *   - Each overlay uses `dynamic({ ssr: false })`.
 *   - Each `<dynamic-component>` is rendered ONLY inside a Surface gated by
 *     its own `isOpen` selector. `dynamic()` defers chunk fetch to first
 *     render, so chunks only download when a user actually opens that
 *     specific overlay. Mounting this controller costs zero overlay JS.
 *
 * Deletion plan: when phase 16-19 of the agents migration removes
 * `promptRunnerSlice` and the `features/prompts/` tree, delete this file
 * AND the two `<LegacyPromptOverlaysController />` mounts in
 * `app/DeferredSingletons.tsx` and `app/(public)/PublicProviders.tsx`.
 */

import dynamic from "next/dynamic";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import {
  selectIsPromptModalOpen,
  selectPromptModalConfig,
  selectPromptModalTaskId,
  selectIsCompactModalOpen,
  selectCompactModalRunId,
  selectCompactModalTaskId,
  selectIsInlineOverlayOpen,
  selectInlineOverlayData,
  selectInlineOverlayRunId,
  selectIsSidebarResultOpen,
  selectSidebarResultConfig,
  selectSidebarResultRunId,
  selectSidebarPosition,
  selectSidebarSize,
  selectSidebarTaskId,
  selectIsFlexiblePanelOpen,
  selectFlexiblePanelConfig,
  selectFlexiblePanelRunId,
  selectFlexiblePanelPosition,
  selectFlexiblePanelTaskId,
  selectToastQueue,
  selectIsPreExecutionModalOpen,
  closePromptModal,
  closeCompactModal,
  closeInlineOverlay,
  closeSidebarResult,
  closeFlexiblePanel,
  removeToast,
} from "@/lib/redux/slices/promptRunnerSlice";
import { selectPrimaryResponseTextByTaskId } from "@/lib/redux/socket-io/selectors/socket-response-selectors";

const PromptRunnerModal = dynamic(
  () =>
    import("./PromptRunnerModal").then((m) => ({
      default: m.PromptRunnerModal,
    })),
  { ssr: false },
);

const PromptCompactModal = dynamic(() => import("./PromptCompactModal"), {
  ssr: false,
});

const PromptInlineOverlay = dynamic(() => import("./PromptInlineOverlay"), {
  ssr: false,
});

const PromptSidebarRunner = dynamic(() => import("./PromptSidebarRunner"), {
  ssr: false,
});

const PromptFlexiblePanel = dynamic(() => import("./PromptFlexiblePanel"), {
  ssr: false,
});

const PromptToast = dynamic(() => import("./PromptToast"), { ssr: false });

const PreExecutionInputModalContainer = dynamic(
  () =>
    import("./PreExecutionInputModalContainer").then((m) => ({
      default: m.PreExecutionInputModalContainer,
    })),
  { ssr: false },
);

function PromptRunnerModalSurface() {
  const dispatch = useAppDispatch();
  const isOpen = useAppSelector(selectIsPromptModalOpen);
  const config = useAppSelector(selectPromptModalConfig);
  const taskId = useAppSelector(selectPromptModalTaskId);
  const responseText = useAppSelector((s) =>
    taskId ? selectPrimaryResponseTextByTaskId(taskId)(s) : "",
  );

  if (!isOpen || !config?.runId) return null;
  return (
    <PromptRunnerModal
      isOpen={true}
      onClose={() => dispatch(closePromptModal({ responseText }))}
      runId={config.runId}
      title={config.title}
      onExecutionComplete={config.onExecutionComplete}
    />
  );
}

function PromptCompactModalSurface() {
  const dispatch = useAppDispatch();
  const isOpen = useAppSelector(selectIsCompactModalOpen);
  const runId = useAppSelector(selectCompactModalRunId);
  const taskId = useAppSelector(selectCompactModalTaskId);
  const responseText = useAppSelector((s) =>
    taskId ? selectPrimaryResponseTextByTaskId(taskId)(s) : "",
  );

  if (!isOpen || !runId) return null;
  return (
    <PromptCompactModal
      isOpen={true}
      onClose={() => dispatch(closeCompactModal({ responseText }))}
      runId={runId}
    />
  );
}

function PromptInlineOverlaySurface() {
  const dispatch = useAppDispatch();
  const isOpen = useAppSelector(selectIsInlineOverlayOpen);
  const data = useAppSelector(selectInlineOverlayData);
  const runId = useAppSelector(selectInlineOverlayRunId);

  if (!isOpen || !data) return null;
  return (
    <PromptInlineOverlay
      isOpen={true}
      onClose={() => dispatch(closeInlineOverlay())}
      result={data.result || ""}
      originalText={data.originalText || ""}
      promptName={data.promptName || ""}
      runId={runId || undefined}
      taskId={data.taskId || undefined}
      isStreaming={data.isStreaming}
      onReplace={data.callbacks?.onReplace}
      onInsertBefore={data.callbacks?.onInsertBefore}
      onInsertAfter={data.callbacks?.onInsertAfter}
    />
  );
}

function PromptSidebarRunnerSurface() {
  const dispatch = useAppDispatch();
  const isOpen = useAppSelector(selectIsSidebarResultOpen);
  const config = useAppSelector(selectSidebarResultConfig);
  const runId = useAppSelector(selectSidebarResultRunId);
  const position = useAppSelector(selectSidebarPosition);
  const size = useAppSelector(selectSidebarSize);
  const taskId = useAppSelector(selectSidebarTaskId);
  const responseText = useAppSelector((s) =>
    taskId ? selectPrimaryResponseTextByTaskId(taskId)(s) : "",
  );

  if (!isOpen || !(runId || config?.runId)) return null;
  return (
    <PromptSidebarRunner
      isOpen={true}
      onClose={() => dispatch(closeSidebarResult({ responseText }))}
      runId={runId || config?.runId || ""}
      position={position}
      size={size}
      title={config?.title}
    />
  );
}

function PromptFlexiblePanelSurface() {
  const dispatch = useAppDispatch();
  const isOpen = useAppSelector(selectIsFlexiblePanelOpen);
  const config = useAppSelector(selectFlexiblePanelConfig);
  const runId = useAppSelector(selectFlexiblePanelRunId);
  const position = useAppSelector(selectFlexiblePanelPosition);
  const taskId = useAppSelector(selectFlexiblePanelTaskId);
  const responseText = useAppSelector((s) =>
    taskId ? selectPrimaryResponseTextByTaskId(taskId)(s) : "",
  );

  if (!isOpen || !(runId || config?.runId)) return null;
  return (
    <PromptFlexiblePanel
      isOpen={true}
      onClose={() => dispatch(closeFlexiblePanel({ responseText }))}
      runId={runId || config?.runId || ""}
      position={position}
      title={config?.title}
    />
  );
}

function PromptToastQueueSurface() {
  const dispatch = useAppDispatch();
  const toastQueue = useAppSelector(selectToastQueue);

  if (toastQueue.length === 0) return null;
  return (
    <>
      {toastQueue.map((toast, index) => (
        <div
          key={toast.id}
          style={{
            position: "fixed",
            bottom: `${16 + index * 100}px`,
            right: "16px",
            zIndex: 200 + index,
          }}
        >
          <PromptToast
            toastId={toast.id}
            result={toast.result}
            promptName={toast.promptName || ""}
            promptData={toast.promptData}
            executionConfig={toast.executionConfig}
            runId={toast.runId}
            taskId={toast.taskId}
            isStreaming={toast.isStreaming}
            onDismiss={(id: string) => dispatch(removeToast(id))}
          />
        </div>
      ))}
    </>
  );
}

function PreExecutionInputModalSurface() {
  const isOpen = useAppSelector(selectIsPreExecutionModalOpen);
  if (!isOpen) return null;
  return <PreExecutionInputModalContainer />;
}

export default function LegacyPromptOverlaysController() {
  return (
    <>
      <PreExecutionInputModalSurface />
      <PromptRunnerModalSurface />
      <PromptCompactModalSurface />
      <PromptInlineOverlaySurface />
      <PromptSidebarRunnerSurface />
      <PromptFlexiblePanelSurface />
      <PromptToastQueueSurface />
    </>
  );
}
