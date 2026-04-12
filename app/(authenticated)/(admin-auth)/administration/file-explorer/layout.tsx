import { createRouteMetadata } from "@/utils/route-metadata";

export const metadata = createRouteMetadata("/administration", {
  titlePrefix: "File Explorer",
  title: "Admin",
  description: "Browse and manage server-side files and assets",
  letter: "FE",
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
