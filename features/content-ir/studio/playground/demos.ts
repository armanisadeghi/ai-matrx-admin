import type { PlaygroundDemo } from "./types";
import { LAUNCH_BRIEF_DEMO } from "./demos/launch-brief";
import { SPRINT_BACKLOG_DEMO } from "./demos/sprint-backlog";
import { CAMPAIGN_IDEAS_DEMO } from "./demos/campaign-ideas";
import { VENDOR_CONTACTS_DEMO } from "./demos/vendor-contacts";
import { SIGNUP_METRICS_DEMO } from "./demos/signup-metrics";
import { LOAN_MATH_DEMO } from "./demos/loan-math";
import { CREW_TIMESHEET_DEMO } from "./demos/crew-timesheet";
import { INVOICE_PDF_DEMO } from "./demos/invoice-pdf";
import { WAREHOUSE_3D_DEMO } from "./demos/warehouse-3d";
import { READING_LIST_DEMO } from "./demos/reading-list";

/** Every playground demo, in page order. Each source follows the shape-authoring rulebook. */
export const PLAYGROUND_DEMOS: readonly PlaygroundDemo[] = [
  LAUNCH_BRIEF_DEMO,
  SPRINT_BACKLOG_DEMO,
  CAMPAIGN_IDEAS_DEMO,
  VENDOR_CONTACTS_DEMO,
  SIGNUP_METRICS_DEMO,
  LOAN_MATH_DEMO,
  CREW_TIMESHEET_DEMO,
  INVOICE_PDF_DEMO,
  WAREHOUSE_3D_DEMO,
  READING_LIST_DEMO,
];
