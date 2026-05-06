import ImageStudioHeader from "@/features/image-studio/components/header/ImageStudioHeader";

/**
 * Shared layout for every full-screen Image Studio tool.
 *
 * Routes inside `app/(a)/image-studio/(tools)/` (edit, avatar, annotate,
 * convert, from-base64, generate) all render through this shell:
 *
 *   ┌─ shell-header (transparent, overlays top 2.5rem) ────────┐
 *   │  ImageStudioHeader portals nav + title into here        │
 *   ├─────────────────────────────────────────────────────────┤
 *   │  pt-10 clears the header overlay                         │
 *   │  ┌─ (future) ImageStudioSidebar ─┬──────────────────────┐│
 *   │  │                               │   children           ││
 *   │  │                               │   (tool inner shell) ││
 *   │  └───────────────────────────────┴──────────────────────┘│
 *   └─────────────────────────────────────────────────────────┘
 *
 * The flex row below `pt-10` is a deliberate seam: a sidebar can be
 * slotted in next to `children` later without restructuring.
 *
 * Tool pages render only their inner shell (no local header, no outer
 * `h-[calc(...)]` wrapper) — the layout owns the chrome.
 */
export default function ImageStudioToolsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <ImageStudioHeader />
      <div className="flex-1 min-h-0 pt-10 flex">
        {/* Future: <ImageStudioSidebar /> slot goes here */}
        <div className="flex-1 min-w-0 min-h-0">{children}</div>
      </div>
    </>
  );
}
