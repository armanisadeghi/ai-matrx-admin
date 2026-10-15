import { z } from "zod";
import catalog from "./univer-showcase-templates.json";
import { TEMPLATE_CATEGORIES } from "../types";

const showcaseTemplate = z.object({
  seedKey: z.string().startsWith("univer:"),
  kind: z.enum(["workbook", "document"]),
  name: z.string().min(1),
  category: z.enum(TEMPLATE_CATEGORIES),
  description: z.string(),
  sortOrder: z.number().int(),
  snapshot: z.record(z.string(), z.unknown()),
  metadata: z.record(z.string(), z.unknown()),
});

/** Captured native content, including calculated values and free add-on resources. */
export function univerShowcaseSeeds() {
  return z.array(showcaseTemplate).parse(catalog);
}
