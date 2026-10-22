/**
 * Surface manifest — one computer's console (`matrx-user/device-console`), route `/devices/[deviceId]`.
 *
 * A computer the person connected through the desktop app: whether it is online, which view is open
 * (terminal, files, sessions, info), the folder being browsed and the terminal session. Emitter:
 * `DeviceConsole` (`features/files/devices/console/`).
 *
 * Parent: the Computer module (`matrx-default/computer`, the domain tree's `computer` node: the
 * person's own computer through the desktop app). Created in W2-B for /devices and this page; it was
 * under Files until then.
 *
 * READ-ONLY: typing into the terminal and moving files are the person's own hands on their machine.
 */

import type { SurfaceManifest, SurfaceScopePayload, SurfaceValue } from "@ai-matrx/chat/surfaces/types";
import { mergeBaselineValues, pickBaseline } from "@ai-matrx/chat/surfaces/manifests/_baseline.manifest";
import { MATRX_WEB_APP_EXECUTOR } from "@ai-matrx/chat/surfaces/executor";

export const DEVICE_CONSOLE_SURFACE_NAME = "matrx-user/device-console";

const v = (
  name: string,
  label: string,
  valueType: SurfaceValue["valueType"],
  sortOrder: number,
  description: string,
  extra: Partial<SurfaceValue> = {},
): SurfaceValue => ({
  name,
  label,
  description,
  valueType,
  alwaysAvailable: false,
  autoContext: true,
  typicalCharCount: valueType === "boolean" ? 5 : 30,
  sortOrder,
  ...extra,
});

const surfaceSpecific: SurfaceValue[] = [
  v("device_id", "Device ID", "string", 100, "UUID of the computer (from the address).", { alwaysAvailable: true, typicalCharCount: 36 }),
  v("device_name", "Name", "string", 110, "The computer's name.", { alwaysAvailable: true }),
  v("device_platform", "Platform", "string", 120, "Its operating system family (macOS, Windows, Linux)."),
  v("device_os_version", "OS version", "string", 130, "Its operating system version.", { autoContext: false }),
  v("device_app_version", "App version", "string", 140, "The desktop app version it runs.", { autoContext: false }),
  v("device_hostname", "Host name", "string", 150, "The machine's host name, when reported.", { autoContext: false }),
  v("device_status", "Status", "string", 160, 'The status pill: e.g. "online", "offline", "refused", "connecting".', { alwaysAvailable: true, typicalCharCount: 10 }),
  v("device_status_label", "Status label", "string", 170, "The status in the page's words."),
  v("device_status_detail", "Status detail", "string", 180, "Why it is offline or refused (last seen …), or null.", { typicalCharCount: 80 }),
  v("device_connected", "Connected", "boolean", 190, "True when the live connection to the computer is open."),
  v("console_view", "View", "string", 200, '"terminal", "files", "sessions" or "info".', { alwaysAvailable: true, typicalCharCount: 9 }),
  v("files_path", "Folder", "string", 210, "The folder open in Files, or null for the start folder.", { typicalCharCount: 60 }),
  v("terminal_session_id", "Terminal session", "string", 220, "The terminal session open, or null.", { autoContext: false }),
  v("selected_session", "Selected session", "string", 230, "The coding session selected in Sessions, or null.", { autoContext: false }),
];

const declared: SurfaceManifest = {
  surfaceName: DEVICE_CONSOLE_SURFACE_NAME,
  situation:
    "They are on the console of their computer {device_name|this computer} ({device_status|status unknown}), in the {console_view|terminal} view. Only they type into it.",
  inheritsFrom: "matrx-default/computer",
  client: "matrx-user",
  executor: MATRX_WEB_APP_EXECUTOR,
  executionMode: "python-stream",
  label: "Computer console",
  description: "One connected computer: status, terminal, files and coding sessions.",
  urlPattern: "/devices/[deviceId]",
  values: mergeBaselineValues(pickBaseline("selection"), surfaceSpecific),
};

export const deviceConsoleManifest = declared;

export function createDeviceConsoleScope(values: Record<string, unknown>): SurfaceScopePayload {
  return values as SurfaceScopePayload;
}
