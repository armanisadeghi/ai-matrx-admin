import PageHeader from "@/features/shell/components/header/PageHeader";
import { ImageStudioHeaderDesktop } from "./ImageStudioHeaderDesktop";
import { ImageStudioHeaderMobile } from "./ImageStudioHeaderMobile";

/**
 * Route-aware header for every Image Studio sub-route.
 *
 * Server Component shell — mirrors the `AgentHeader` pattern. The shell
 * lays out structure only; the desktop and mobile islands are tiny client
 * components that read `usePathname()` to compute their own active state.
 *
 * Architecture:
 *   - Wrapped in `<PageHeader>` so contents render into the global
 *     shell-header center slot via portal. Host pages just render
 *     `<ImageStudioHeader />` and add `pt-10` below to clear the
 *     transparent shell-header overlay.
 *   - Desktop / mobile split via CSS classes (`lg:hidden` /
 *     `hidden lg:flex`). Both islands ship to the DOM but only one is
 *     visible — same pattern AgentHeader uses, so SSR is deterministic
 *     and there's no client-side breakpoint flicker.
 */
export default function ImageStudioHeader() {
  return (
    <PageHeader>
      <div className="lg:hidden w-full">
        <ImageStudioHeaderMobile />
      </div>
      <div className="hidden lg:flex w-full">
        <ImageStudioHeaderDesktop />
      </div>
    </PageHeader>
  );
}
