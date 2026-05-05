import type { WADocItem } from "../types";

const NOW = new Date("2026-05-04T21:30:00");
function iso(offset: number): string {
  return new Date(NOW.getTime() + offset).toISOString();
}
const DAY = 24 * 60 * 60_000;

export const MOCK_DOCS: WADocItem[] = [
  {
    id: "doc-1",
    fileName: "patient-schedule-may.pdf",
    fileSize: 487_312,
    mimeType: "application/pdf",
    message: "Patients' daily schedule is attached for review",
    senderName: "Melisa",
    createdAt: iso(-13 * 60 * 60_000),
  },
  {
    id: "doc-2",
    fileName: "Q1-financials.xlsx",
    fileSize: 142_088,
    mimeType:
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    message: "Q1 close — please review before Friday",
    senderName: "Kamal Accounting",
    createdAt: iso(-2 * DAY),
  },
  {
    id: "doc-3",
    fileName: "SEO-audit-CIC-April.pdf",
    fileSize: 2_380_142,
    mimeType: "application/pdf",
    message: "Latest audit results",
    senderName: "Aamir Hussain",
    createdAt: iso(-4 * DAY),
  },
  {
    id: "doc-4",
    fileName: "wireframes-dashboard-v3.fig",
    fileSize: 8_421_113,
    mimeType: "application/octet-stream",
    message: "v3 wireframes for review",
    senderName: "Steve Wright",
    createdAt: iso(-5 * DAY),
  },
  {
    id: "doc-5",
    fileName: "PO-4421.pdf",
    fileSize: 76_120,
    mimeType: "application/pdf",
    message: "Purchase order for tools",
    senderName: "Kamal Accounting",
    createdAt: iso(-7 * DAY),
  },
  {
    id: "doc-6",
    fileName: "regional-pages-keyword-set.csv",
    fileSize: 18_400,
    mimeType: "text/csv",
    message: "Updated keyword set",
    senderName: "Aamir Hussain",
    createdAt: iso(-9 * DAY),
  },
  {
    id: "doc-7",
    fileName: "design-review-notes.docx",
    fileSize: 31_510,
    mimeType:
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    message: "Notes from yesterday's design review",
    senderName: "Steve Wright",
    createdAt: iso(-11 * DAY),
  },
];

export function getMockDocs(): WADocItem[] {
  return MOCK_DOCS;
}
