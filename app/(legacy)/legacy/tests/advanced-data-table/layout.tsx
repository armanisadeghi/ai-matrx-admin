import { createRouteMetadata } from "@/utils/route-metadata";

export const metadata = createRouteMetadata("/tests", {
  titlePrefix: "Data Table",
  title: "Tests",
  description: "Advanced data table component tests",
  letter: "DT",
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
