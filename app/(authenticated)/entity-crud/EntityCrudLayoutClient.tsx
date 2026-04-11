"use client";

import { EntityPack } from "@/providers/packs/EntityPack";

export default function EntityCrudLayoutClient({
  children,
}: {
  children: React.ReactNode;
}) {
  return <EntityPack>{children}</EntityPack>;
}
