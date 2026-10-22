// MOVED to @ai-matrx/media/files/engine/virtual-sources/types (L4 — the files UI lives in @ai-matrx/media beside the engine).
// This path stays so the app's importers keep working; grow it in the package. A jest.mock of
// THIS path reaches only importers of this path — mock the package module to reach the engine/chat.
export type * from "@ai-matrx/media/files/engine/virtual-sources/types";
