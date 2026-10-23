import { createRouteMetadata } from "@/utils/route-metadata";
import { DerivedCrumbTrailHeader } from "@/features/shell/breadcrumbs/DerivedBreadcrumb";

export const metadata = createRouteMetadata("/camera", {
  title: "Camera",
  description:
    "Capture photos with your camera — review, save to your files, and browse recent captures.",
  letter: "Ca",
  additionalMetadata: {
    keywords: ["camera", "photo capture", "media capture", "webcam"],
  },
});

export default function CameraLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Every page here names its levels through the derived trail; a page with its own header draws it
  // and this steps aside (crumb doors, features/shell/FEATURE.md § Every crumb is a door).
  return (
    <>
      <DerivedCrumbTrailHeader fallback />
      {children}
    </>
  );
}
