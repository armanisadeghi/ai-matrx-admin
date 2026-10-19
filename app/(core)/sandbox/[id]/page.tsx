"use client";

import { useParams } from "next/navigation";
import { SandboxRecord } from "@/features/code/views/sandboxes/SandboxRecord";

export default function SandboxDetailPage() {
  const params = useParams();
  return <SandboxRecord id={params.id as string} />;
}
