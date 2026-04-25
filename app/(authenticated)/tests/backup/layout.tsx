import { createRouteMetadata } from "@/utils/route-metadata";

export const metadata = createRouteMetadata("/tests", {
  titlePrefix: "Backup",
  title: "Tests",
  description: "Backup and restore tests",
  letter: "Bk",
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
