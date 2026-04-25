import EntitiesLayoutClient from "./EntitiesLayoutClient";
import { createRouteMetadata } from "@/utils/route-metadata";

export const metadata = createRouteMetadata("/entities", {
  title: "Entity admin",
  description: "Browse and manage entity definitions and admin views",
});

export default function EntitiesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <EntitiesLayoutClient>{children}</EntitiesLayoutClient>;
}
