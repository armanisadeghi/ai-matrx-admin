/**
 * The handful of plain jobs the Tools home opens on. Each is a search seed in a person's own words: a press
 * fills the one box, so the list that follows is exactly what typing it would give. Never a vendor, never a
 * store category. Labels are layout: a verb and a thing.
 */

import { Building2, Eye, Link2, Megaphone, MessagesSquare, Search, Star, UserSearch, type LucideIcon } from "lucide-react";

export interface ToolTask {
  id: string;
  title: string;
  /** What fills the box. */
  query: string;
  /** Narrows the search to one job family when the words alone are too loose. */
  family: string | null;
  icon: LucideIcon;
}

export const TOOL_TASKS: readonly ToolTask[] = [
  { id: "email", title: "Find a person's email", query: "work email", family: "people", icon: UserSearch },
  { id: "site", title: "Check a website's strength", query: "domain authority", family: "seo", icon: Link2 },
  { id: "social", title: "See a social account", query: "social profile", family: "social", icon: MessagesSquare },
  { id: "business", title: "Look up a business", query: "company profile", family: "company", icon: Building2 },
  { id: "reviews", title: "Read what customers say", query: "reviews", family: "reviews", icon: Star },
  { id: "ads", title: "See a competitor's ads", query: "ads", family: "ads", icon: Megaphone },
  { id: "web", title: "Search the web", query: "web search", family: "search", icon: Search },
  { id: "ai", title: "See how AI talks about a brand", query: "AI visibility", family: "ai_visibility", icon: Eye },
];
