/**
 * Shared value + write-target declarations for the search page
 * (`features/search/components/SearchExperience.tsx`), which renders on two
 * surfaces: `matrx-user/search` (/search) and `matrx-user/scraper`
 * (/scraper/search). ONE emitter (`features/search/agent/searchSurface.ts`)
 * fills these names on both, so both manifests declare them from here.
 */

import type {
  SurfaceValue,
  SurfaceWriteTarget,
} from "@ai-matrx/chat/surfaces/types";
import { SOCIAL_SEARCH_PLATFORMS } from "@/features/search/types";

const PLATFORMS = SOCIAL_SEARCH_PLATFORMS.map((p) => `"${p}"`).join(" | ");

/**
 * `always` is true only on a surface whose every route renders the search page
 * (`matrx-user/search`); the scraper surface has other routes, so false there.
 */
export function searchExperienceValues(
  group: string,
  base: number,
  always: boolean,
): SurfaceValue[] {
  const where = always ? "" : " Only on the /scraper/search route.";
  return [
    {
      name: "social_platform",
      label: "Social platform",
      description: `Which platform the Social tab searches: ${PLATFORMS} ("all" = every one). It only matters while search_vertical is "social".${where}`,
      valueType: "string",
      alwaysAvailable: always,
      typicalCharCount: 6,
      sortOrder: base,
      group,
    },
    {
      name: "input_mode",
      label: "Input mode",
      description:
        'What the search box understood the on-screen input to be: "words" (tab results), "handle" (a bare @handle — platform choices shown), "profile" (a profile lookup), "post" (a post link, read), "link" (a web page, read) or "image" (search by image).' + where,
      valueType: "string",
      alwaysAvailable: always,
      typicalCharCount: 7,
      sortOrder: base + 1,
      group,
    },
    {
      name: "special_result",
      label: "Looked-up result",
      description:
        "What the non-words input produced, when input_mode is not \"words\": a social_search_results kind for a profile, a reverse_image_search_results kind for an image, { url, title, text, images, links } for a read page, or { handle } while platform choices are shown. Absent for word searches and while it loads.",
      valueType: "object",
      alwaysAvailable: false,
      typicalCharCount: 6000,
      autoContext: false,
      sortOrder: base + 2,
      group,
    },
  ];
}

export function searchExperienceWriteTargets(group: string, base: number): SurfaceWriteTarget[] {
  return [
    {
      name: "social_platform",
      label: "Social platform",
      description: `Stages which platform the Social tab searches: ${PLATFORMS}. Anything else is refused. Staged only: a social search spends the user's points, so the user still presses Search. Read back from social_platform. Refused while a search is running.`,
      valueType: "string",
      updatesValue: "social_platform",
      mode: "draft",
      applyPolicy: "ask",
      group,
      sortOrder: base,
    },
  ];
}
