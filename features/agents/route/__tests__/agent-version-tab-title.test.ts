/**
 * The version pages' tab titles name the agent (Lane D walk, 2026-10-21: /agents/<id>/v/1 read a bare
 * "v1"). Drives the routes' own generateMetadata with the agent read stubbed.
 */
jest.mock("@/lib/agents/data", () => ({
  getAgent: jest.fn(async (id: string) => (id === "a1" ? { id: "a1", name: "Research brief", version: 3 } : null)),
}));
jest.mock("@/utils/route-metadata", () => ({
  createDynamicRouteMetadata: (_path: string, o: { title: string; titlePrefix?: string }) => ({ title: o.titlePrefix ? `${o.titlePrefix} | ${o.title}` : o.title }),
}));
jest.mock("@/features/agents/components/diff/AgentVersionDiffPage", () => ({ AgentVersionDiffPage: () => null }));
jest.mock("@/features/shell/components/header/PageHeader", () => ({ __esModule: true, default: () => null }));
jest.mock("@ai-matrx/chat/agents/components/shared/AgentHeader", () => ({ AgentHeader: () => null }));
jest.mock("@ai-matrx/sharing/access/react", () => ({
  ...jest.requireActual("@ai-matrx/sharing/access/react"), AccessGate: () => null }));

import { generateMetadata as versionMetadata } from "@/app/(core)/agents/[id]/v/[version]/page";
import { generateMetadata as latestMetadata } from "@/app/(core)/agents/[id]/latest/layout";

describe("version page tab titles", () => {
  it("/agents/<id>/v/<n> reads '<agent name> · v<n>'", async () => {
    expect((await versionMetadata({ params: Promise.resolve({ id: "a1", version: "1" }) })).title).toBe("Research brief · v1");
  });
  it("/agents/<id>/latest reads '<agent name> · v<current>'", async () => {
    expect((await latestMetadata({ params: Promise.resolve({ id: "a1" }) })).title).toBe("Research brief · v3");
  });
  it("an unreadable agent keeps a generic title", async () => {
    expect((await versionMetadata({ params: Promise.resolve({ id: "gone", version: "2" }) })).title).toBe("Agent · v2");
  });
});
