import { createRouteMetadata } from "@/utils/route-metadata";

export const metadata = createRouteMetadata("/sample-route", {
  title: "Sample Route",
  description: "A route for testing the shell",
  additionalMetadata: {
    keywords: [
      "AI agents",
      "agent builder",
      "Agentic Harness",
      "AI automation",
      "agent deployment",
    ],
  },
});

export default function AgentsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <span className="shell-hide-dock" aria-hidden="true" />
      {children}
    </>
  );
}
