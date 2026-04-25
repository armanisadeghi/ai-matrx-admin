import EntityCrudLayoutClient from "./EntityCrudLayoutClient";
import { createRouteMetadata } from "@/utils/route-metadata";

export const metadata = createRouteMetadata("/entity-crud", {
  title: "Entities",
  description:
    "Create, read, update, and delete records for your data entities",
});

export default function EntityCrudLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <EntityCrudLayoutClient>{children}</EntityCrudLayoutClient>;
}
