import { createRouteMetadata } from "@/utils/route-metadata";

export const metadata = createRouteMetadata("/war-room", {
  titlePrefix: "Admin",
  title: "War Room",
  description: "War Room feature map, routes, and admin resources.",
  letter: "WA",
});

export default function WarRoomAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // The module layout above draws the derived trail for every page here (crumb doors).
  return <>{children}</>;
}
