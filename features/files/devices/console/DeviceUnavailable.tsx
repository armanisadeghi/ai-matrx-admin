import Link from "next/link";

import type { ConsoleDeviceVerdict } from "./devices-query";

type Refusal = Exclude<ConsoleDeviceVerdict, { kind: "ok" } | { kind: "not_yours" }>;

/** The real reason a device page cannot open, one line each (never a blanket "no access"). */
export function refusalText(verdict: Refusal): { title: string; detail: string } {
  switch (verdict.kind) {
    case "not_found":
      return { title: "Device not found", detail: "No device with this link is on your account." };
    case "removed":
      return { title: "This device was removed", detail: "Sign in to Matrx 2 on it to add it again." };
    case "not_a_computer":
      return { title: "This isn't a computer", detail: "Only computers open here." };
    case "turned_off":
      return { title: "This device is turned off", detail: "Sign in to Matrx 2 on it to turn it back on." };
  }
}

export function DeviceUnavailable({ verdict }: { verdict: Refusal }) {
  const { title, detail } = refusalText(verdict);
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-2 px-4 py-16 text-center" role="status">
      <p className="text-[17px] font-semibold text-foreground">{title}</p>
      <p className="text-sm text-muted-foreground">{detail}</p>
      <Link href="/devices" className="mt-2 text-[15px] text-primary">
        Devices
      </Link>
    </div>
  );
}
