/**
 * @jest-environment jsdom
 *
 * /devices draws each computer ONCE, and each row says ONE truth (walk 41 at 375 px read every row
 * twice, the twin saying "Last seen 2 minutes ago" beside "Online"). The real list, in a browser
 * document, with the relay's live answers arriving after the first paint: one link per computer,
 * and in each row the dot and the words come from the same answer.
 */
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";

jest.mock("next/link", () => ({
  __esModule: true,
  default: ({ children, href, className }: { children: React.ReactNode; href: string; className?: string }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
  useLinkStatus: () => ({ pending: false }),
}));
jest.mock("@/features/shell/components/header/PageHeader", () => ({ __esModule: true, default: () => null }));
jest.mock("@/components/errors/ErrorAlchemyMenu", () => ({ ErrorAlchemyMenu: () => null }));
jest.mock("@/lib/python-client", () => ({ getAccessTokenOrNull: async () => "token" }));
const ONLINE = new Set(["d-online"]);
jest.mock("../relay", () => ({
  fetchRelayStatus: async (id: string) => ({ online: ONLINE.has(id), since_ms: ONLINE.has(id) ? null : Date.now() - 120_000 }),
}));

import { DeviceList } from "../DeviceList";
import type { DeviceRow } from "../../types";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
class NoIntersection {
  observe() {}
  disconnect() {}
}
(globalThis as { IntersectionObserver?: unknown }).IntersectionObserver = NoIntersection;

const recent = new Date(Date.now() - 60_000).toISOString();
function device(id: string, name: string): DeviceRow {
  return { id, instance_name: name, instance_id: `inst_${id}`, hostname: null, platform: "darwin", os_version: "26.0", app_version: "1", last_seen: recent, is_active: true, created_at: recent } as DeviceRow;
}

let root: Root | null = null;
let host: HTMLDivElement | null = null;
afterEach(() => {
  act(() => root?.unmount());
  host?.remove();
  root = null;
  host = null;
});

it("draws one link per computer, and each row's dot and words agree", async () => {
  // Two copies with ONE name (an installation each, B42): two rows, never four.
  const devices = [device("d-online", "Studio (test)"), device("d-offline", "Studio (test)"), device("d-other", "MacBook")];
  host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);
  await act(async () => {
    root?.render(<DeviceList devices={devices} error={null} />);
  });
  // The relay's answers land after the first paint.
  await act(async () => {
    await new Promise((r) => setTimeout(r, 20));
  });
  const links = [...host.querySelectorAll("a[href^='/devices/']")];
  expect(links.map((a) => a.getAttribute("href"))).toEqual(["/devices/d-online", "/devices/d-offline", "/devices/d-other"]);
  for (const link of links) {
    const dot = link.querySelector("[role='img']")?.getAttribute("aria-label");
    const words = link.textContent ?? "";
    // One status line per row, and it says what the dot says.
    expect(words.match(/Online|Last seen|Never connected/g)).toHaveLength(1);
    if (dot === "Online") expect(words).toContain("Online");
    else expect(words).not.toContain("Online");
  }
  expect(links[0]?.querySelector("[role='img']")?.getAttribute("aria-label")).toBe("Online");
  expect(links[1]?.textContent).toMatch(/Last seen 1 minute ago/);
});
