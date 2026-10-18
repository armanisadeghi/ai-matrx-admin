/**
 * The detail deep link: the `detail` token round-trips record + presentation through the `?panels=`
 * grammar, hydrates the window by default and a record-peek canvas tab on `as-docked`, and refuses
 * a token that names no record. Ported onto the package link door + the definition's link.hydrate.
 */
import { configureStore } from "@reduxjs/toolkit";

import { selectOverlay } from "@ai-matrx/summon/open";
import { overlaysReducer as overlays } from "@ai-matrx/summon";
import { canvasItemId, canvasReducer } from "@ai-matrx/canvas";
import { detailInstanceKey, parseDetailInstanceKey, presentationFromUrlArg, DETAIL_URL_AS_ARG, DETAIL_URL_TYPE_KEY } from "@ai-matrx/detail";
import { decodeListQuery, encodeListQuery } from "@ai-matrx/detail";
import { readDetailOverlayData, toDetailInstanceData } from "../detail/detailOverlayData";
import { linkHydrator, parsePanels, registerAppLinks, serializePanels } from "@/features/overlays/definitions/__tests__/linkKit";

const REF = { type: "task", id: "0f0a2a2e-5b8e-4a11-9c8f-1d2e3f4a5b6c" };

describe("detail deep link", () => {
  beforeAll(() => registerAppLinks());

  it("writes a ?panels= token the link manager parses back to the same record and presentation", () => {
    const written = serializePanels([{ typeKey: DETAIL_URL_TYPE_KEY, instanceId: detailInstanceKey(REF), args: { [DETAIL_URL_AS_ARG]: "docked" } }]);
    expect(written).toBe(`detail:task.${REF.id}:as-docked`);
    const [parsed] = parsePanels(written);
    expect(parsed!.typeKey).toBe("detail");
    expect(parseDetailInstanceKey(parsed!.instanceId)).toEqual(REF);
    expect(presentationFromUrlArg(parsed!.args?.[DETAIL_URL_AS_ARG])).toBe("docked");
  });

  it("hydrates the window by default and a record-peek canvas tab on as-docked", async () => {
    const hydrator = linkHydrator("detail");
    expect(hydrator).toBeDefined();

    const store = configureStore({ reducer: { overlays } });
    await hydrator!(store.dispatch, detailInstanceKey(REF), {});
    const windowInstance = selectOverlay(store.getState(), "detailWindow");
    expect(windowInstance.isOpen).toBe(true);
    expect(windowInstance.data).toEqual({
      type: REF.type,
      id: REF.id,
      seedName: null,
      seedAbout: null,
      listItems: null,
      listIndex: null,
      listTrimmedFrom: null,
    });

    const docked = configureStore({ reducer: { overlays, canvasHost: canvasReducer } });
    await hydrator!(docked.dispatch, detailInstanceKey(REF), { as: "docked" });
    const canvas = docked.getState().canvasHost;
    expect(canvas.isOpen).toBe(true);
    expect(canvas.items[canvasItemId("record-peek", detailInstanceKey(REF))]).toMatchObject({ kind: "record-peek", data: { type: REF.type, id: REF.id } });
    expect(selectOverlay(docked.getState(), "detailWindow").isOpen).toBe(false);
  });

  it("refuses a token that names no record instead of opening an empty detail", async () => {
    const dispatch = jest.fn();
    const warn = jest.spyOn(console, "warn").mockImplementation(() => {});
    await linkHydrator("detail")!(dispatch, "not-a-record", {});
    expect(dispatch).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it("round-trips the overlay payload and the page list query", () => {
    const list = { items: [REF, { type: "task", id: "b" }, { type: "note", id: "c" }], index: 1 };
    const data = readDetailOverlayData({ type: REF.type, id: REF.id, seedName: "A task", seedAbout: null, listItems: list.items, listIndex: list.index });
    expect(data).not.toBeNull();
    expect(toDetailInstanceData(data!)).toEqual({ type: REF.type, id: REF.id, seed: { name: "A task", about: null }, list });
    const query = encodeListQuery(list);
    const params = new URLSearchParams(query);
    expect(decodeListQuery(params.get("l"), params.get("i"), params.get("lt"))).toEqual(list);
    expect(decodeListQuery(null, null)).toBeNull();
  });
});
