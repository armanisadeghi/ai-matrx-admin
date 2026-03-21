import { InlineDecision } from "./types";

export const SAMPLE_INLINE_DECISIONS: InlineDecision[] = [
    {
      id: "conflict-scope",
      prompt: "Conflict Resolution Granularity",
      options: [
        {
          id: "per-note",
          label: "Per-Note Resolution",
          text: "Conflict resolution operates at the full-note level. When a conflict is detected, the user sees both versions side-by-side and selects one, or manually merges via a text editor. No automatic field-level diffing is performed.",
        },
        {
          id: "field-level",
          label: "Field-Level Diff / Merge",
          text: "A diff view highlights line-level or paragraph-level differences between local and cloud versions, allowing surgical merging of individual sections while preserving unchanged content.",
        },
        {
          id: "dev-decision",
          label: "Developer Decision",
          text: "The developer determines the appropriate level of merge granularity based on note content structure and available tooling, applying best practices for conflict resolution UX in offline-first applications.",
        },
      ],
    },
    {
      id: "auth-requirement",
      prompt: "Cloud Sync Authentication",
      options: [
        {
          id: "require-auth",
          label: "Require Login",
          text: "Cloud sync requires the user to be logged into an account. The sync button is hidden or disabled when unauthenticated.",
        },
        {
          id: "no-auth",
          label: "No Auth Required",
          text: "Cloud sync is available as long as a server endpoint is reachable, regardless of authentication state.",
        },
        {
          id: "dev-decision",
          label: "Developer Decision",
          text: "Assess the existing auth model and implement the sync access gate using best practices consistent with the current session/auth architecture.",
        },
      ],
    },
    {
      id: "sync-ui",
      prompt: "Sync Controls Placement",
      options: [
        {
          id: "in-notes",
          label: "Inside Notes Tab",
          text: "Sync controls (Pull / Push / Bidirectional and conflict resolution) live inside the Notes tab as a dedicated sync panel or modal.",
        },
        {
          id: "settings",
          label: "Settings Area",
          text: "Sync is accessible via a settings/preferences area, keeping the Notes tab focused purely on note-taking.",
        },
        {
          id: "dev-decision",
          label: "Developer Decision",
          text: "Place sync controls where they are most discoverable without cluttering the primary notes experience, based on existing UI layout and navigation patterns.",
        },
      ],
    },
    {
      id: "server-only-notes",
      prompt: "Handling Server-Only Notes",
      options: [
        {
          id: "auto-import",
          label: "Auto Import",
          text: "During a Pull, notes that exist on the server but not locally are automatically imported with no conflict prompt.",
        },
        {
          id: "manual-approve",
          label: "Manual Approval",
          text: "Server-only notes are listed in the sync review UI and the user must explicitly approve importing each one.",
        },
        {
          id: "dev-decision",
          label: "Developer Decision",
          text: "Define behavior that best fits the 'user is always in control' principle. Surface server-only notes for review but default to import unless excluded.",
        },
      ],
    },
  ];