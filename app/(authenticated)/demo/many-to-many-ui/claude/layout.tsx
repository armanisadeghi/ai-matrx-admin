import { createRouteMetadata } from "@/utils/route-metadata";

export const metadata = createRouteMetadata("/demo", {
  titlePrefix: "Claude M2M",
  title: "Demo",
  description: "Claude many-to-many UI pattern demo",
  letter: "Cl",
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
