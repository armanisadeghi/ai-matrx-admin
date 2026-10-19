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
  /** Wired through a carrier other than the channel itself. */
  via?: "contextItems";
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
    // ProTextareaAgentPanel sends its contextItems as `variables` (and context)
    // on the mandate door — proven 2026-10-18 (conversation 46558aa1).
    file: "features/data-tables/records-ui-host/recordsAgentPorts.tsx",
    status: "wired",
    via: "contextItems",
  },
  {
    site: "war room room",
    mandateKey: "war_room.room",
    provision: "war_room.room_context",
    file: "features/war-room/hooks/useRoomAgent.ts",
    status: "wired",
  },
  {
    site: "war room master",
    mandateKey: "war_room.master",
    provision: "war_room.room_context",
    file: "features/war-room/hooks/useMasterAgent.ts",
    status: "wired",
  },
  {
    site: "war room thread",
    mandateKey: "war_room.thread",
    provision: "war_room.thread_context",
    file: "features/war-room/components/thread/ThreadAgentPanel.tsx",
    status: "wired",
  },
  {
    site: "transcript studio",
    mandateKey: "transcript_studio.document_edit",
    provision: "transcript_studio.session_context",
    file: "features/transcript-studio/hooks/useStudioAssistant.ts",
    status: "wired",
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
    site: "page guidance record in view",
    mandateKey: "notes.page_guidance",
    provision: "ambient.page_guidance",
    // One provider per rung of the page's chain; pages call
    // usePageGuidanceRecord (first: features/notes/hooks/useNotesSurfaceScope.ts).
    file: "features/mandates/host-values/usePageGuidanceRecord.ts",
    status: "wired",
  },
  {
    site: "notes page guide, open note",
    mandateKey: "notes.page_guidance",
    provision: "notes.page_guidance",
    file: "features/notes/hooks/useNotesSurfaceScope.ts",
    status: "wired",
  },
  {
    site: "backlink work planner chip",
    mandateKey: "seo.backlink_work_planner",
    provision: "seo.backlinks_assist_sweep",
    file: "features/marketing/components/backlinks/BacklinksAssistStrip.tsx",
    status: "wired",
  },
];

/** The open list only shrinks. */
export const OPEN_SITE_CEILING = 1;
