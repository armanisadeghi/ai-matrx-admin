// features/connectors/connector-search-terms.ts
//
// WHAT EACH CATALOG CONNECTOR COVERS, for the + menu's search (Arman,
// 2026-10-20: searching "Outlook" or "Teams" must find the Microsoft
// connector, "Jira" must find Atlassian). Google's products come from
// `google-chat-connector.ts` (provider-config.ts), Microsoft's from
// `MICROSOFT_CAMPAIGN_DESCRIPTORS` — nothing here repeats those. What remains is
// the short list of products no other file in the app names, keyed by the
// catalog slug; add a row when a connector's product is not in its name.

import { MICROSOFT_CAMPAIGN_DESCRIPTORS } from "@/features/microsoft-integration/campaigns";

const MICROSOFT_EXTRA = ["Microsoft 365", "Office", "Word", "Excel", "PowerPoint"];

const NAMED_ELSEWHERE: Readonly<Record<string, readonly string[]>> = {
  "microsoft-work-iq": [
    ...MICROSOFT_CAMPAIGN_DESCRIPTORS.filter((descriptor) => !descriptor.alwaysOn).map((descriptor) => descriptor.label),
    ...MICROSOFT_EXTRA,
  ],
};

const OTHER: Readonly<Record<string, readonly string[]>> = {
  github: ["Git", "Repositories", "Pull requests", "Issues"],
  gitlab: ["Git", "Repositories", "Merge requests"],
  atlassian: ["Jira", "Confluence"],
  slack: ["Channels", "Messages"],
  notion: ["Pages", "Databases", "Wiki"],
  hubspot: ["CRM", "Contacts", "Deals"],
  asana: ["Tasks", "Projects"],
  linear: ["Issues", "Projects"],
  calendly: ["Scheduling", "Meetings"],
  box: ["Files", "Documents"],
  dropbox: ["Files", "Documents"],
  stripe: ["Payments", "Invoices"],
  sentry: ["Errors", "Monitoring"],
  postgres: ["Database", "SQL"],
  neon: ["Database", "Postgres"],
  supabase: ["Database", "Postgres"],
  monday: ["Tasks", "Boards"],
  clickup: ["Tasks", "Projects"],
  canva: ["Design", "Presentations"],
  airtable: ["Spreadsheets", "Databases"],
  intercom: ["Support", "Customer chat"],
};

export const CATALOG_SEARCH_TERMS: Readonly<Record<string, readonly string[]>> = {
  ...OTHER,
  ...NAMED_ELSEWHERE,
};
