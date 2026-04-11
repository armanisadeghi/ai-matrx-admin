import { createRouteMetadata } from "@/utils/route-metadata";

export const metadata = createRouteMetadata("/demo", {
  titlePrefix: "Socket Form",
  title: "Demo",
  description: "Socket form builder demo.",
  letter: "SK", // Socket Form
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
