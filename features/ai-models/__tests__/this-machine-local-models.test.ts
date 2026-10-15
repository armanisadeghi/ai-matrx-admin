/**
 * The web chat composer's local models: only Matrx 2 on THIS computer, only when paired, installed
 * models only; a pick sends the aimatrx link that opens a NEW Confidential Chat conversation there.
 */

import { confidentialChatLink, createThisMachineLocalModels, discoverMatrx2, pairWithMatrx2 } from "../local/this-machine-local-models";

const HERE = { baseUrl: "http://127.0.0.1:22140", deviceId: "dev-1" };

describe("this machine's local models", () => {
  it("no Matrx 2 on this computer: no entries, and the reason is logged", async () => {
    const log = jest.fn();
    const pair = jest.fn();
    const port = createThisMachineLocalModels({ discover: async () => null, pair, openLink: jest.fn(), log });
    await port.refresh();
    expect(port.getModels()).toEqual([]);
    expect(pair).not.toHaveBeenCalled();
    expect(log).toHaveBeenCalledWith(expect.stringContaining("not running"));
  });

  it("Matrx 2 here but not paired: nothing, logged once", async () => {
    const log = jest.fn();
    const port = createThisMachineLocalModels({ discover: async () => HERE, pair: async () => null, openLink: jest.fn(), log });
    await port.refresh();
    await port.refresh();
    expect(port.getModels()).toEqual([]);
    expect(log).toHaveBeenCalledTimes(1);
    expect(log.mock.calls[0]?.[0]).toContain("not paired");
  });

  it("paired: the installed models, as local:<id>, the snapshot stable between equal reads", async () => {
    const session = { installedTextModels: jest.fn(async () => [{ id: "smollm2-135m", name: "SmolLM2 135M", maker: "Hugging Face" }]) };
    const port = createThisMachineLocalModels({ discover: async () => HERE, pair: async () => session, openLink: jest.fn(), log: jest.fn() });
    await port.refresh();
    const first = port.getModels();
    expect(first).toEqual([{ id: "local:smollm2-135m", name: "SmolLM2 135M", maker: "Hugging Face" }]);
    await port.refresh();
    expect(port.getModels()).toBe(first);
  });

  it("a pick sends the link that opens a new Confidential Chat conversation on this computer", () => {
    const openLink = jest.fn();
    const port = createThisMachineLocalModels({ discover: async () => null, pair: async () => null, openLink });
    port.open?.("local:smollm2-135m");
    expect(openLink).toHaveBeenCalledWith("aimatrx://chat/confidential-chat?new=1&model=smollm2-135m");
    expect(confidentialChatLink("llama-3.2-3b")).toBe("aimatrx://chat/confidential-chat?new=1&model=llama-3.2-3b");
  });

  it("discovery answers only Matrx 2's own health door, never Matrx Local's", async () => {
    const fetchImpl = jest.fn(async (url: string) => {
      if (url === "http://127.0.0.1:22141/v1/health") return new Response(JSON.stringify({ service: "matrx-desktop", device_id: "d" }));
      if (url === "http://127.0.0.1:22140/v1/health") return new Response(JSON.stringify({ service: "matrx-local" }));
      throw new Error("closed");
    });
    expect(await discoverMatrx2(fetchImpl as unknown as typeof fetch)).toEqual({ baseUrl: "http://127.0.0.1:22141", deviceId: "d" });
    expect(fetchImpl.mock.calls.every(([u]) => String(u).endsWith("/v1/health"))).toBe(true);
  });

  it("the browser pairing is an announced stand-in until Matrx 2 has a door for it: no loopback probe, the reason logged", async () => {
    expect(await pairWithMatrx2(HERE)).toBeNull();
    const discover = jest.fn(async () => HERE);
    const log = jest.fn();
    const port = createThisMachineLocalModels({ discover, pair: async () => null, openLink: jest.fn(), canPair: false, log });
    await port.refresh();
    expect(discover).not.toHaveBeenCalled();
    expect(port.getModels()).toEqual([]);
    expect(log.mock.calls[0]?.[0]).toContain("cannot pair");
  });
});
