/** @jest-environment jsdom */
/**
 * MKT-102, first screen: a self-hosted Mastodon link pasted into the social box is rejected until its host is
 * checked, then reads as a Mastodon account (the box re-renders). A plain site stays rejected.
 */
import { act } from "react";
import { createRoot } from "react-dom/client";
import { resolveAccountInput } from "@/features/marketing/social/account-input";
import { forgetFediverseHosts } from "@/features/marketing/social/profile-sites";
import { useFediverseHost } from "../useFediverseHost";

jest.mock("../learnDomains", () => ({ teachFediverseHost: jest.fn() }));
(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const LINK = "https://mastodon.gamedev.place/@dronn";
const mockFetch = (ok: boolean) => {
  global.fetch = jest.fn(async () =>
    ok ? { ok: true, json: async () => ({ acct: "dronn", url: LINK }) } : { ok: false, json: async () => ({}) },
  ) as unknown as typeof fetch;
};

beforeEach(() => forgetFediverseHosts());

function Box({ text }: { text: string }) {
  useFediverseHost(text);
  const p = resolveAccountInput({ text });
  return <span data-testid="out">{p.status === "ok" ? `${p.platform}:${p.handle}` : p.status}</span>;
}

async function render(text: string) {
  const host = document.createElement("div");
  const root = createRoot(host);
  await act(async () => root.render(<Box text={text} />));
  await act(async () => {
    await new Promise((r) => setTimeout(r, 30));
  });
  return host.textContent;
}

it("reads a self-hosted Mastodon link as a Mastodon account once its host passes", async () => {
  mockFetch(true);
  expect(await render(LINK)).toBe("mastodon:dronn@mastodon.gamedev.place");
});

it("a host that is not a Mastodon server stays rejected", async () => {
  mockFetch(false);
  expect(await render("https://blog.example.org/@dronn")).toBe("invalid");
});
