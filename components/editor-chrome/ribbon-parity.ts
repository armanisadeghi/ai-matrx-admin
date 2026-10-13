/**
 * The Microsoft look's homes for the Google parity rows every editor shares (`google-parity.ts`):
 * the Help group's head and the Automate tab (add-ins, scripts). Spread into each editor's
 * ribbon so the shared rows are placed once, the same way.
 */

import { CircleHelp, Code2, FileText, GraduationCap, Megaphone, MessageSquareWarning, Puzzle, ShieldCheck } from "lucide-react";

import type { RibbonControlSpec, RibbonTabSpec } from "./ribbon-model";

export const HELP_HEAD_CONTROLS: RibbonControlSpec[] = [
  { ref: "help.search", size: "large", icon: CircleHelp },
  { ref: "help.training", label: "Training", icon: GraduationCap },
  { ref: "help.updates", label: "Updates", icon: Megaphone },
  { ref: "help.feedback", label: "Feedback", icon: MessageSquareWarning },
  { ref: "help.privacy", label: "Privacy Policy", icon: ShieldCheck },
  { ref: "help.terms", label: "Terms of Service", icon: FileText },
];

export const AUTOMATE_TAB: RibbonTabSpec = {
  id: "automate",
  label: "Automate",
  groups: [
    { id: "add-ins", label: "Add-ins", controls: [{ ref: "extensions.add-ons", size: "large", label: "Add-ins", icon: Puzzle }] },
    { id: "scripts", label: "Scripts", controls: [{ ref: "extensions.scripts", size: "large", label: "Scripts", icon: Code2 }] },
  ],
};
