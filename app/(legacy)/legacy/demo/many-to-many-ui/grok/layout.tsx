import { createRouteMetadata } from "@/utils/route-metadata";

export const metadata = createRouteMetadata("/demo", {
  titlePrefix: "Grok M2M",
  title: "Demo",
  description: "Grok many-to-many UI pattern demo",
  letter: "Gr",
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
