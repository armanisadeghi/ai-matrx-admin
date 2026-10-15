import type { RelayDeviceStatusEvent } from "@ai-matrx/desktop-protocol";

import type { DeviceRow } from "@/features/files/devices/types";

import { chooserComputer, computerSessionLink, orderComputers } from "./computerChooser";

function device(id: string, name: string | null): DeviceRow {
  return { id, instance_name: name, platform: "darwin", os_version: null, app_version: null, last_seen: null, is_active: true, created_at: null };
}

function status(online: boolean, protocol: string | null = "1.44"): RelayDeviceStatusEvent {
  return { online, since_ms: 1, app_version: null, protocol_version: protocol } as RelayDeviceStatusEvent;
}

describe("Runs on: a computer's choice is the relay's word", () => {
  it("an online computer new enough for coding.* can be chosen", () => {
    const c = chooserComputer(device("a", "Studio"), status(true));
    expect(c).toMatchObject({ name: "Studio", state: "online", selectable: true, reason: null });
  });

  it("offline, unreachable and too-old computers are shown with a reason and cannot be chosen", () => {
    const offline = chooserComputer(device("b", "Laptop"), status(false));
    const unknown = chooserComputer(device("c", null), null);
    const old = chooserComputer(device("d", "Old"), status(true, "1.30"));
    for (const c of [offline, unknown, old]) {
      expect(c.selectable).toBe(false);
      expect(c.reason).toBeTruthy();
    }
    expect(offline.state).toBe("offline");
    expect(unknown.state).toBe("unknown");
    expect(unknown.name).toBe("Your computer");
    expect(old.state).toBe("update");
  });

  it("online computers come first, the rest keep their order", () => {
    const list = orderComputers([
      chooserComputer(device("off1", "A"), status(false)),
      chooserComputer(device("on", "B"), status(true)),
      chooserComputer(device("off2", "C"), status(false)),
    ]);
    expect(list.map((c) => c.device.id)).toEqual(["on", "off1", "off2"]);
  });

  it("the link opens that computer's Sessions view on the new session", () => {
    expect(computerSessionLink("dev-1", "s.1")).toBe("/devices/dev-1?view=sessions&s=%23s%2Fs.1");
    expect(new URL(`https://x${computerSessionLink("dev-1", "s.1")}`).searchParams.get("s")).toBe("#s/s.1");
  });
});

describe("telling computers apart, and what to do next", () => {
  it("names shared by several computers also say when each was last seen", async () => {
    const { duplicateNames, lastSeenLabel } = await import("./computerChooser");
    expect([...duplicateNames(["My Computer", "Studio", "My Computer"])]).toEqual(["My Computer"]);
    expect(lastSeenLabel("2026-10-12T10:00:00Z")).toMatch(/^last seen /);
    expect(lastSeenLabel(null)).toBe("");
  });

  it("an app that cannot run on that computer says what to do", async () => {
    const { nextStep } = await import("../components/ComputerWorkFields");
    expect(nextStep({ label: "Codex", why: "not signed in" }, "Studio")).toBe("Codex: sign in on Studio in Matrx 2 › Code › Accounts");
    expect(nextStep({ label: "Codex", why: "not installed" }, "Studio")).toBe("Codex: install it on Studio");
  });
});

describe("same-day computers with one name", () => {
  it("are told apart by the time last seen and the machine", async () => {
    const { distinguishing } = await import("./computerChooser");
    const a = distinguishing({ last_seen: "2026-10-14T09:05:00Z", hostname: null, platform: "darwin", os_version: "15.1" });
    const b = distinguishing({ last_seen: "2026-10-14T17:40:00Z", hostname: "studio.local", platform: "darwin", os_version: "15.1" });
    expect(a).not.toBe(b);
    expect(a).toMatch(/last seen .*\d:\d\d/);
    expect(a).toContain("darwin 15.1");
    expect(b).toContain("studio.local");
  });
});
