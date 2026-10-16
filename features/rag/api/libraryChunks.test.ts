/** Seam test: the chunk list goes to Supabase (rag.fn_list_library_chunks), never the Python server. */
const abortSignal = jest.fn();
const rpc = jest.fn();
const schema = jest.fn(() => ({ rpc }));
jest.mock("@/utils/supabase/client", () => ({
  createClient: () => ({ schema }),
}));
const serverCall = jest.fn();
jest.mock("@/lib/python-client", () => ({
  getJson: (...a: unknown[]) => serverCall(...a),
}));

import { fetchLibraryChunks } from "./libraryChunks";
import { fetchDerivativeChunks } from "./derivations";

beforeEach(() => {
  rpc.mockReset();
  abortSignal.mockReset();
  schema.mockClear();
  serverCall.mockReset();
});

describe("library chunks read", () => {
  it("calls the rag RPC with the page filter and returns the server's shape", async () => {
    rpc.mockResolvedValue({
      data: {
        total: 7,
        limit: 50,
        offset: 0,
        chunks: [{ id: "c1", chunk_index: 0, content_text: "hi" }],
      },
      error: null,
    });
    const out = await fetchLibraryChunks("doc-1", { limit: 50, pageNumber: 3 });
    expect(schema).toHaveBeenCalledWith("rag");
    expect(rpc).toHaveBeenCalledWith("fn_list_library_chunks", {
      p_id: "doc-1",
      p_limit: 50,
      p_offset: 0,
      p_parent_only: false,
      p_children_only: false,
      p_page_number: 3,
    });
    expect(out.total).toBe(7);
    expect(out.chunks).toHaveLength(1);
    expect(serverCall).not.toHaveBeenCalled();
  });

  it("fetchDerivativeChunks no longer touches the Python server", async () => {
    rpc.mockResolvedValue({ data: { total: 0, limit: 50, offset: 0, chunks: [] }, error: null });
    await fetchDerivativeChunks("d1", { limit: 50, offset: 10 });
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(serverCall).not.toHaveBeenCalled();
  });

  it("fetchDerivativeChunks honours its abort signal (supabase-js .abortSignal)", async () => {
    const ctl = new AbortController();
    const result = { data: { total: 0, limit: 50, offset: 0, chunks: [] }, error: null };
    abortSignal.mockResolvedValue(result);
    rpc.mockReturnValue({ abortSignal, then: (res: (v: unknown) => unknown) => Promise.resolve(result).then(res) });
    await fetchDerivativeChunks("d1", { limit: 50, signal: ctl.signal });
    expect(abortSignal).toHaveBeenCalledWith(ctl.signal);
  });

  it("surfaces an RPC error", async () => {
    rpc.mockResolvedValue({ data: null, error: { code: "P0002", message: "nope" } });
    await expect(fetchLibraryChunks("x")).rejects.toBeTruthy();
  });
});
