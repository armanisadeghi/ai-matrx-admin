import assert from "node:assert/strict";
import test from "node:test";
import { inspectChunkText } from "./check-turbopack-unbound-bindings.mjs";

test("names the live 2026-10-14 motion/react leak and the export it serves", () => {
  const text = 'e.s(["ViewTransitionBuilder",0,nE,"VisualElement",()=>__TURBOPACK__imported__module__60386__.F,"WillChangeMotionValue",0,rE],6042536)';
  assert.deepEqual(inspectChunkText("static/immutable/chunks/1xjya6p288h5z.js", text), [
    { file: "static/immutable/chunks/1xjya6p288h5z.js", moduleId: "60386", exportName: "VisualElement" },
  ]);
});

test("a correctly renamed binding is clean", () => {
  assert.deepEqual(inspectChunkText("a.js", 'var nP=e.i(60386);e.s(["VisualElement",()=>nP.F],6042536)'), []);
});
