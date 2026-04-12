import { createRouteMetadata } from "@/utils/route-metadata";

export const metadata = createRouteMetadata("/demo", {
  titlePrefix: "Many-to-Many UI",
  title: "Demo",
  description: "Many-to-many relationship UI component demos",
  letter: "MM",
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
