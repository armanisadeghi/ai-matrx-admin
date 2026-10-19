/** @jest-environment jsdom */
// One Track press must never pay for the same account twice: leaving the field starts the paid lookup, and the
// Track that follows waits for it and reuses what it fetched (live pass 2: 49 same-input pairs ~1 s apart).
import React, { act, useEffect } from "react";
import { createRoot, type Root } from "react-dom/client";
import { useSocialAccountInput } from "../components/SocialAccountInput";
import { fetchAccount, findCachedAccount } from "../account-lookup";
import type { FoundAccount } from "../account-input";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
jest.mock("../account-lookup", () => ({ fetchAccount: jest.fn(), findCachedAccount: jest.fn(async () => null) }));
const confirmSpend = jest.fn(async () => true);
jest.mock("../cost", () => ({ useSocialSpend: () => ({ confirmSpend, costText: () => null }) }));
jest.mock("../server", () => ({
  profileAvatarDoor: () => "avatar",
  socialErrorCode: () => null,
  socialErrorMessage: (_e: unknown, fallback: string) => fallback,
}));
jest.mock("@/components/errors/ErrorAlchemyMenu", () => ({ ErrorAlchemyMenu: () => null }));

const khaby: FoundAccount = {
  profileId: "6f0d2c1e-tiktok-khaby",
  platform: "tiktok",
  handle: "khaby.lame",
  displayName: "Khabane lame",
  avatarUrl: null,
  hasStoredAvatar: false,
  followers: 163_000_000,
  source: "fetched",
};

let host: HTMLDivElement;
let root: Root;
let input: ReturnType<typeof useSocialAccountInput> | null = null;
function Harness({ onInput }: { onInput: (next: ReturnType<typeof useSocialAccountInput>) => void }) {
  const current = useSocialAccountInput({ initialText: "https://www.tiktok.com/@khaby.lame", organizationId: "travel-org" });
  useEffect(() => onInput(current));
  return null;
}

beforeEach(async () => {
  host = document.createElement("div");
  root = createRoot(host);
  await act(async () => { root.render(<Harness onInput={(next) => { input = next; }} />); });
});
afterEach(() => { act(() => root.unmount()); jest.clearAllMocks(); });

test("Track pressed while the lookup runs gets the fetched profile, and the vendor is called once", async () => {
  let finish: (found: FoundAccount) => void = () => {};
  jest.mocked(fetchAccount).mockImplementation(() => new Promise((resolve) => { finish = resolve; }));
  let lookup: Promise<void> | undefined;
  await act(async () => { lookup = input?.check(); });           // leaving the field
  const waiting = input?.fetchedAccount();                       // Track pressed before the lookup answered
  await act(async () => { void input?.check(); });               // a second blur starts nothing new
  await act(async () => { finish(khaby); await lookup; });
  await expect(waiting).resolves.toEqual(khaby);
  expect(fetchAccount).toHaveBeenCalledTimes(1);
});

test("no lookup started means Track fetches as before", async () => {
  await expect(input?.fetchedAccount()).resolves.toBeNull();
  expect(fetchAccount).not.toHaveBeenCalled();
});

test("a declined lookup leaves Track to fetch as before", async () => {
  confirmSpend.mockResolvedValueOnce(false);
  await act(async () => { await input?.check(); });
  await expect(input?.fetchedAccount()).resolves.toBeNull();
  expect(fetchAccount).not.toHaveBeenCalled();
});

test("a profile only read from our store is never handed to Track (the 12-hour reuse rule still decides)", async () => {
  jest.mocked(findCachedAccount).mockResolvedValueOnce({ ...khaby, source: "cache" });
  await act(async () => { await new Promise((resolve) => setTimeout(resolve, 500)); }); // the free store check
  await act(async () => { await input?.check(); });
  await expect(input?.fetchedAccount()).resolves.toBeNull();
  expect(fetchAccount).not.toHaveBeenCalled();
});
