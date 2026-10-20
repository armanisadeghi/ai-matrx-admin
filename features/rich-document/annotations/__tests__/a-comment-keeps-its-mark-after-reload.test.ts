/**
 * A COMMENT ON A CHAT ANSWER KEEPS ITS MARK AFTER A RELOAD (review 3, R4, 2026-10-20).
 *
 * Real case, measured on live: a Test Reply answer (a reasoning model) was commented on right
 * after it streamed. The tab held the answer with its reasoning inline
 * (`<reasoning>…</reasoning>` inside the text), so the anchor was built against that body and
 * saved reasoning as its prefix. The stored row keeps reasoning in its own part, so after a reload
 * the answer body is the answer alone. The resolver found the one exact occurrence of the quote,
 * saw a saved prefix that could never agree, refused it as "changed or removed", and the passage
 * drew plain. The thread was then only reachable through the "…" menu.
 *
 * WHAT BREAKS THIS TEST: a resolver that scores context against reasoning text the reload never
 * draws; a resolver that accepts a lone quote whose real context disagrees.
 */

import { buildTextAnchor, type TextAnchor } from "../anchor";
import { resolveAnchor } from "../resolve";

const ANSWER = "Green tea is known for its subtle flavor and health‑boosting antioxidants.";
/** The body as the tab held it right after the stream (inline reasoning). */
const LIVE_BODY = `<reasoning>\nNeed short sentence.\n</reasoning>\n${ANSWER}`;
/** The body after a reload (the stored row: a thinking part + a text part; thinking is not answer text). */
const RELOAD_BODY = ANSWER;

/** The anchor exactly as live stored it (platform.comments 5b5ea7b2…, 2026-10-20). */
const STORED: TextAnchor = {
  __kind: "text_anchor",
  start: 45,
  end: 119,
  exact: ANSWER,
  prefix: "ed short sentence.\n</reasoning>\n",
  block: { hash: "98678bdc", index: 2 },
  content_version: 1,
} as TextAnchor;

describe("a chat-answer comment after a reload", () => {
  it("the anchor saved on live resolves against the reloaded answer", () => {
    const res = resolveAnchor({ anchor: STORED, body: RELOAD_BODY, contentVersion: 1 });
    expect(res.status).not.toBe("orphaned");
    expect(RELOAD_BODY.slice(res.start16!, res.end16!)).toBe(ANSWER);
  });

  it("an anchor built on the streamed body resolves after the reload", () => {
    const at = LIVE_BODY.indexOf(ANSWER);
    const anchor = buildTextAnchor(LIVE_BODY, at, at + ANSWER.length, 1);
    const res = resolveAnchor({ anchor, body: RELOAD_BODY, contentVersion: 1 });
    expect(res.status).not.toBe("orphaned");
    expect(RELOAD_BODY.slice(res.start16!, res.end16!)).toBe(ANSWER);
  });

  it("a passage pinned mid-answer after reasoning keeps its real context", () => {
    const live = `<reasoning>\nThink.\n</reasoning>\nFirst point. ${ANSWER}`;
    const reload = `First point. ${ANSWER}`;
    const at = live.indexOf(ANSWER);
    const anchor = buildTextAnchor(live, at, at + ANSWER.length, 1);
    const res = resolveAnchor({ anchor, body: reload, contentVersion: 1 });
    expect(res.status).not.toBe("orphaned");
    expect(reload.slice(res.start16!, res.end16!)).toBe(ANSWER);
  });

  it("a lone quote whose real (non-reasoning) context disagrees is still refused", () => {
    const anchor: TextAnchor = { ...STORED, prefix: "Totally unrelated:" };
    const res = resolveAnchor({ anchor, body: `Other words. ${ANSWER}`, contentVersion: 2 });
    expect(res.status).toBe("orphaned");
  });
});
