import { createElement } from "react";
import {
  BedDouble,
  Briefcase,
  Building2,
  Car,
  Database,
  Home,
  MapPin,
  MessageCircle,
  Newspaper,
  Plane,
  Search,
  ShoppingBag,
  Star,
  Store,
  Video,
  type LucideIcon,
} from "lucide-react";

/** One Lucide mark per group, matched on the group's own words (the server names the groups). */
const MARKS: [RegExp, LucideIcon][] = [
  [/review/i, Star],
  [/online store|store/i, Store],
  [/shop|ecommerce|commerce|product|marketplace/i, ShoppingBag],
  [/job|career|hiring/i, Briefcase],
  [/compan|business|b2b/i, Building2],
  [/local|place|map/i, MapPin],
  [/social|people|profile|forum|communit/i, MessageCircle],
  [/video|youtube|tiktok|stream/i, Video],
  [/real estate|property|home/i, Home],
  [/travel|flight/i, Plane],
  [/hotel|stay|lodging/i, BedDouble],
  [/car|auto|vehicle/i, Car],
  [/news|media|article/i, Newspaper],
  [/search/i, Search],
];

export function groupIcon(group: string, subgroup?: string | null): LucideIcon {
  const words = `${subgroup ?? ""} ${group}`;
  return MARKS.find(([re]) => re.test(words))?.[1] ?? Database;
}

export function GroupMark({ group, subgroup, className }: { group: string; subgroup?: string | null; className?: string }) {
  return (
    <span className={className ?? "flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary"} aria-hidden>
      {createElement(groupIcon(group, subgroup), { className: "h-4 w-4" })}
    </span>
  );
}
