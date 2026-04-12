import { createRouteMetadata } from "@/utils/route-metadata";

export const metadata = createRouteMetadata("/administration", {
  titlePrefix: "System Files",
  title: "Admin",
  description: "System file browser and configuration editor",
  letter: "SF",
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
