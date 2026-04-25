import { createRouteMetadata } from "@/utils/route-metadata";

export const metadata = createRouteMetadata("/tests", {
  titlePrefix: "Metadata",
  title: "Tests",
  description: "Route metadata and SEO behavior tests",
  letter: "MT",
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return <div>{children}</div>;
}
