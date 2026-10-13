/**
 * A CONTINUATION TURN shows what IT carried — never the door's provision as if it applied.
 *
 * The frame below is the server's frame for the recorded `applets.build` fix round (aidream
 * `watch_frame.build_turn_frame`, conversation 3ada4319…, round-2 request de133235…: a host
 * turn "applets.build fix round" with context `applet` + `last_check`, read with SELECT on
 * 2026-10-13). Red before green: before `continuationView` the window rendered such a frame as
 * "Provision · routed at the door (0) — No provision values on this run" and the rung slot as
 * the door's; these tests fail there (the helpers did not exist).
 */
import type { MandateRunData } from "@ai-matrx/agents/generated/stream-events";
import { continuationView, earlierFrames, mandateIdentity } from "../watch-run-truth";

const FIX_ROUND = "de133235-5091-4dd0-b71b-b9bd39911535";
const STARTED_BY = "354275cc-5472-4862-b9e9-e3964a0a5cd8";
const LAST_CHECK =
  '{"file":"record","message":"Not saved: RetainerDetailsPage.tsx asks \\"removed\\" before archive() — an archived row can be restored: the button, title and confirmLabel say Archive and the line says she can restore it."}';

const doorFrame: MandateRunData = {
  type: "mandate_run",
  mandate_key: "applets.build",
  door: "chat_start",
  request_id: STARTED_BY,
  rung: "system",
  placement: { provisions: [{ name: "request", kind: "text", value: "A retainer page", value_inline: true }] },
};

const fixRound: MandateRunData = {
  type: "mandate_run",
  mandate_key: "applets.build",
  door: "conversation_continue",
  request_id: FIX_ROUND,
  conversation_id: "3ada4319-1bf8-4704-828e-2ab5a7301ed7",
  rung: null,
  holder_source: "conversation_agent",
  holder_id: "37397019-7a92-4cd8-b6be-ea5d95831df2",
  placement: null,
  placement_captured_at: "not_applied_on_continuation",
  provision_applied: false,
  started_by_request_id: STARTED_BY,
  turn_author: "host",
  turn_input:
    "Your last answer could not be saved (the removed field). The reason is in last_check. Fix only that and return the whole record.",
  host_turn_reason: "applets.build fix round",
  turn_context: { applet: '{"name":"Retainers"}', last_check: LAST_CHECK },
  earlier_frames: [],
};

describe("a continuation turn's own frame", () => {
  it("says the provision was not re-applied and shows what the turn carried", () => {
    const view = continuationView(fixRound);
    expect(view).not.toBeNull();
    expect(view?.author).toBe("host");
    expect(view?.hostReason).toBe("applets.build fix round");
    expect(view?.startedBy).toBe(STARTED_BY);
    expect(view?.input).toMatch(/^Your last answer could not be saved/);
    expect(Object.fromEntries(view?.context ?? [])).toEqual({ applet: '{"name":"Retainers"}', last_check: LAST_CHECK });
  });

  it("is never shown for a door frame, whose provision is its placement", () => {
    expect(continuationView(doorFrame)).toBeNull();
    expect(continuationView(null)).toBeNull();
  });

  it("binds only to its own request, never to the run that started the conversation", () => {
    expect(mandateIdentity([], fixRound, FIX_ROUND).frame).toBe(fixRound);
    expect(mandateIdentity([], fixRound, STARTED_BY).frame).toBeNull();
  });

  it("a resume shows the same request's earlier frames, oldest first", () => {
    const resumed: MandateRunData = {
      ...fixRound,
      door: "conversation_resume",
      request_id: STARTED_BY,
      turn_author: "resume",
      earlier_frames: [doorFrame] as unknown as MandateRunData["earlier_frames"],
    };
    const earlier = earlierFrames(resumed);
    expect(earlier.map((f) => f.door)).toEqual(["chat_start"]);
    expect(continuationView(earlier[0])).toBeNull();
  });
});
