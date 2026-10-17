
import { APP_OVERLAYS } from "@/features/overlays/definitions/registry";

/** The old catalogue's shape, read from the definitions (the catalogue file is gone). */
const OVERLAY_CATALOGUE: Record<string, { label: string; isWindow: boolean; instanceMode: "singleton" | "multi"; closesOnNavigation: boolean }> = Object.fromEntries(
  APP_OVERLAYS.map((d) => [d.id, { label: d.label, isWindow: !!d.window, instanceMode: d.instance === "multi" ? "multi" : "singleton", closesOnNavigation: !!d.closesOnNavigation }]),
);
/** The old window-metadata rows, read from the definitions: windows with a window id, other overlays with a link. */
const ALL_WINDOW_STATIC_METADATA = APP_OVERLAYS.filter((d) => (d.window ? d.window.windowId !== undefined : d.link !== undefined)).map((d) => ({
  overlayId: d.id,
  slug: d.window?.windowId ?? d.id,
  urlSync: d.link ? { key: d.link.key } : undefined,
  defaultData: d.window?.restoreDefaults as Record<string, unknown> | undefined,
}));


describe("the overlay catalogue is the one id list", () => {
  it("carries both Google import windows", () => {
    expect(OVERLAY_CATALOGUE).toHaveProperty("googleContactsImportWindow");
    expect(OVERLAY_CATALOGUE).toHaveProperty("googleTasksImportWindow");
  });

  it("carries every overlay id the window registry declares", () => {
    const missing = ALL_WINDOW_STATIC_METADATA.map((entry) =>
      typeof entry.overlayId === "string" ? entry.overlayId : "",
    )
      .filter((id) => id !== "")
      .filter((id) => !(id in OVERLAY_CATALOGUE));

    expect(missing).toEqual([]);
  });
});
