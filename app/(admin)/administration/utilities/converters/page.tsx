// Converters — every registered converter (source format → target) with its version, real samples
// and last-run figures. Read-only. Super-admin gated by the (admin) layout; /admin/converters is
// admin-gated server-side.

import type { Metadata } from "next";

import { ConvertersConsole } from "@/features/admin/converters/ConvertersConsole";

export const metadata: Metadata = {
  title: "Converters",
  description: "Every data converter: source format, target, version, samples and last runs.",
};

export default function ConvertersPage() {
  return <ConvertersConsole />;
}
