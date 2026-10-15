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
