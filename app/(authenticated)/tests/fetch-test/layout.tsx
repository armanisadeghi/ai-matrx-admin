import { createRouteMetadata } from "@/utils/route-metadata";

export const metadata = createRouteMetadata("/tests", {
  titlePrefix: "Fetch",
  title: "Tests",
  description: "HTTP fetch and API integration tests",
  letter: "Ft",
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
