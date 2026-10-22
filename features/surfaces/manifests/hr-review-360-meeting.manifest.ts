/**
 * Surface manifest — the 360 review meeting held in person
 * (`matrx-user/hr-review-360-meeting`), `/hr/performance/[reviewId]/meeting`.
 *
 * Inherits the review (`hr-review-360`): the same review and both halves, read through the
 * same doors. Adds the section both people are looking at, one at a time. The meeting notes box
 * on the page is the notes record's own editor and is not written from here.
 *
 * Emitter: `SurfaceRuntimeProvider` in `Review360InPersonPage`, values from
 * `Review360SideBySide` (`useSurfaceScopeContribution`).
 */

import type { SurfaceScopePayload, SurfaceValueGroup } from "@ai-matrx/chat/surfaces/types";
import { hrPageSurface, hrTarget, hrValue } from "./hr-surface-kit";
import { HR_REVIEW_360_SURFACE } from "./hr-review-360.manifest";

export const HR_REVIEW_360_MEETING_SURFACE = "matrx-user/hr-review-360-meeting";

export const REVIEW_360_MEETING_SECTIONS = ["responsibilities", "accomplishments", "strengths", "opportunities", "goals"] as const;

const groups: SurfaceValueGroup[] = [
  { key: "meeting", label: "Meeting", sortOrder: 200, description: "The section in focus." },
];

export const hrReview360MeetingManifest = hrPageSurface({
  surfaceName: HR_REVIEW_360_MEETING_SURFACE,
  inheritsFrom: HR_REVIEW_360_SURFACE,
  label: "360 review meeting",
  description: "The 360 review meeting in person: both halves, one section at a time (/hr/performance/[reviewId]/meeting).",
  urlPattern: "/hr/performance/[reviewId]/meeting",
  situation:
    "They are in the review meeting, looking at the {meeting_section|accomplishments} section side by side. You can move the meeting to another section.",
  intro: `<surface_intro>
The 360 review meeting, held in person on one screen. Both halves of the review show one section at a time; meeting_section names it and section_items holds what each side wrote there.
- meeting_section moves the screen to another section (${REVIEW_360_MEETING_SECTIONS.join(", ")}). Nothing is saved.
</surface_intro>`,
  groups,
  values: [
    hrValue("meeting_section", "Section in focus", "string", "meeting", 10, `The section on screen: ${REVIEW_360_MEETING_SECTIONS.join(" | ")}.`, {
      alwaysAvailable: true,
      typicalCharCount: 16,
    }),
    hrValue(
      "section_items",
      "This section, both sides",
      "object",
      "meeting",
      20,
      "What each side wrote in the section on screen: { employee: [items] | null, manager: [items] | null } (null = not in yet or not readable).",
      { typicalCharCount: 500, inlineUpTo: 1500 },
    ),
  ],
  writeTargets: [
    hrTarget(
      "meeting_section",
      "Move to a section",
      { valueType: "string", mode: "ui", updatesValue: "meeting_section", group: "meeting", sortOrder: 100 },
      `Show another section of the review on the meeting screen. NOTHING is saved. Value: one of ${REVIEW_360_MEETING_SECTIONS.map((s) => `"${s}"`).join(", ")}. Refused: any other word.`,
    ),
  ],
});

export function createHrReview360MeetingScope(values: Record<string, unknown>): SurfaceScopePayload {
  return values as SurfaceScopePayload;
}
