/**
 * Review 2026-10-20: `/agents/new/studio?mode=describe` opened the Studio Assistant ("Do it
 * together") instead of the Describe box. Every `?mode=` value opens the mode it names.
 */
import { STUDIO_MODES, studioMode, studioPageHref, studioStartStep } from "../modes";
import { readStudioState } from "../studio-state";

const at = (qs: string) => readStudioState(new URLSearchParams(qs));

it.each(STUDIO_MODES.map((m) => [m.id] as const))("?mode=%s opens that mode", (id) => {
  const state = at(`mode=${id}`);
  const mode = STUDIO_MODES.find((m) => m.id === id)!;
  if (mode.href) {
    // Its own page: the link goes there.
    expect(studioPageHref(id)).toBe(mode.href);
    expect(studioMode(id)).toBeNull();
  } else if (id === "do-with-me") {
    // Its first step IS the workspace's assistant.
    expect(studioStartStep(state)).toBeNull();
    expect(studioMode(id)?.id).toBe("do-with-me");
  } else {
    // Its first step is on the start screen (the box, the picker, the examples), opened on it.
    expect(studioStartStep(state)).toBe(id);
  }
});

it("a mode that started something opens the workspace", () => {
  expect(studioStartStep(at("mode=describe&build=b1"))).toBeNull();
  expect(studioStartStep(at("mode=improve&agent=a1"))).toBeNull();
  expect(studioStartStep(at("mode=from-examples&chat=c1"))).toBeNull();
  expect(studioStartStep(at("mode=nonsense"))).toBeNull();
});
