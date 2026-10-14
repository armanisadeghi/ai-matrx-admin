/**
 * `navigate` — accepting the assist opens, in a NEW TAB, the place where the
 * thing happens (a savior page, a fix surface, a wizard).
 */

import type {
  AssistActionDefinition,
  AssistActionResult,
} from "../assist-action-types";

export const navigateAssistAction: AssistActionDefinition = {
  label: "Open page",
  kind: "navigate",
  description: "Open the assist's href in a new tab — an assist never moves the page.",
  handler: async (assist, ctx): Promise<AssistActionResult> => {
    if (assist.action.kind !== "navigate") {
      return { ok: false, error: "navigate: wrong action payload" };
    }
    ctx.navigate(assist.action.href);
    return { ok: true, result: { href: assist.action.href } };
  },
};
