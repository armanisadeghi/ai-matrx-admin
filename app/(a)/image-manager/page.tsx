/**
 * app/(a)/image-manager/page.tsx
 *
 * Server Component entry. The shell itself is interactive (Redux,
 * tab switching, file selection) so it lives in a Client Component
 * sibling. We render the shell directly here — no data fetching at
 * this level; the layout already mounts the realtime provider that
 * hydrates the slice client-side.
 */

import { ImageManagerPageShell } from "./_components/ImageManagerPageShell";

export default function ImageManagerPage() {
  return <ImageManagerPageShell />;
}
