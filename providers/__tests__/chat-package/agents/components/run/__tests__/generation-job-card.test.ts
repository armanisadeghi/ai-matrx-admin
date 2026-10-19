/**
 * The video job card's facts are honest: a variable-bound duration (the run
 * form's answer) wins over the literal setting. The card shows no price.
 */

jest.mock("@ai-matrx/chat/host/db", () => ({ supabase: {} }));
// App modules this card reaches still import the app's own client.

jest.mock("@ai-matrx/chat/host/diagnostics", () => ({ captureError: jest.fn() }));
// The subject still reaches the app's Error Inspector through other host
// modules; both sinks share one mock so no capture escapes the assertions.


import {
  resolvedControl,
} from "@ai-matrx/chat/agents/components/run/GenerationJobCard";


test("a variable bound to the control wins over the literal setting", () => {
  const defs = [{ name: "clip_length", control: { key: "duration_seconds" } }];
  expect(resolvedControl("duration_seconds", { duration_seconds: 4 }, defs, { clip_length: "8" })).toBe("8");
  expect(resolvedControl("duration_seconds", { duration_seconds: 4 }, defs, { clip_length: "" })).toBe(4);
  expect(resolvedControl("aspect_ratio", { aspect_ratio: "9:16" }, defs, {})).toBe("9:16");
});
