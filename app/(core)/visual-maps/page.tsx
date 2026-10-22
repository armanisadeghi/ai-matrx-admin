// /visual-maps — no page of its own yet: the Visual map lab is its first (and only) sub-feature.
import { redirect } from "next/navigation";

export default function VisualMapsIndexPage() {
  redirect("/visual-maps/lab");
}
