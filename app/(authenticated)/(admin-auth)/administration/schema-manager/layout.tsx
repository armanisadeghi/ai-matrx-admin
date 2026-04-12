import { createRouteMetadata } from "@/utils/route-metadata";

export const metadata = createRouteMetadata("/administration", {
  titlePrefix: "Schema Manager",
  title: "Admin",
  description: "Database schema management, migrations, and editor",
  letter: "SM",
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
