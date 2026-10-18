/**
 * THE HOST-VALUE SITES — every frontend place whose mandate's provision
 * declares values the place holds but that its launch does not put on
 * `variables` itself. Each one either sends them through the host-values
 * channel (`wired`, proven by the guard test reading `file`) or is `open`
 * with the reason it cannot yet. The guard fails when a wired site stops
 * calling the channel for its provision, and when the open list grows.
 *
 * Census: common-docs systems/intelligence/mandates/HANDOFF.md
 * ("Provisions on the frontend", 9 sites, 2026-10-18).
 */

export interface HostValueSite {
  site: string;
  mandateKey: string;
  provision: string;
  /** Repo-relative file that calls the channel (wired) or would (open). */
  file: string;
  status: "wired" | "open";
  /** Open only: why it is not wired yet. */
  reason?: string;
}

export const HOST_VALUE_SITES: readonly HostValueSite[] = [
  {
    site: "notes assist",
    mandateKey: "notes.organizer",
    provision: "notes.unorganized_pile",
    file: "features/notes/notes-assists-producer.ts",
    status: "wired",
  },
  {
    site: "tasks assist",
    mandateKey: "tasks.triage",
    provision: "tasks.overdue_pileup",
    file: "features/tasks/tasks-assists-producer.ts",
    status: "wired",
  },
  {
    site: "data formula box",
    mandateKey: "data.formula_writing",
    provision: "data.formula_box",
    file: "features/data-tables/records-ui-host/recordsAgentPorts.tsx",
    status: "open",
    reason: "values ride ProTextareaAgentPanel contextItems (context, not variables); target_column_* not held by the port",
  },
  {
    site: "war room room/master",
    mandateKey: "war_room.room",
    provision: "war_room.room_context",
    file: "features/war-room/hooks/useRoomAgent.ts",
    status: "open",
    reason: "runs on the agent door (edge-recorded agent); moving new chats to the mandate door needs a proof that the pinned `war_room` context satisfies the guaranteed value",
  },
  {
    site: "war room thread",
    mandateKey: "war_room.thread",
    provision: "war_room.thread_context",
    file: "features/war-room/components/thread/ThreadAgentPanel.tsx",
    status: "open",
    reason: "same agent-door routing as the room agent",
  },
  {
    site: "voice tutor",
    mandateKey: "education.voice_tutor",
    provision: "education.voice_tutor",
    file: "features/flashcards/components/study/VoiceTutorPanel.tsx",
    status: "open",
    reason: "realtime voice session: never passes /ai/mandates, so no request carries offered values (server realtime door needed)",
  },
  {
    site: "transcript studio",
    mandateKey: "transcript_studio.document_edit",
    provision: "transcript_studio.session_context",
    file: "features/transcript-studio/hooks/useStudioAssistant.ts",
    status: "open",
    reason: "values pushed as context entries; mandate-door routing of the studio conversation not yet confirmed",
  },
  {
    site: "CleanupPad",
    mandateKey: "transcript_studio.document_edit",
    provision: "transcript_studio.session_context",
    file: "features/transcription-cleanup/components/CleanupPad.tsx",
    status: "open",
    reason: "launch path not yet traced",
  },
  {
    site: "page guidance live values",
    mandateKey: "ambient.page_guidance",
    provision: "ambient.page_guidance",
    file: "aidream/apps/shared/chat/src/agents/components/ambient-assistant/ScrollAssistantLauncherImpl.tsx",
    status: "open",
    reason: "route/module/section/org already ride the mandate door; record-in-view values need each page to call useMandateHostValues for the answering rung",
  },
];

/** The open list only shrinks. */
export const OPEN_SITE_CEILING = 7;
