/**
 * The featured spreadsheet templates (Google Sheets' gallery, our content).
 * Every number a formula shows is computed here too, so the stored snapshot,
 * its thumbnail and the first paint agree.
 */
import { buildWorkbook, colName, fx, serial, styled, type CellIn, type SheetSpec } from "./workbook-builder";

export type SeedTemplate = {
  seedKey: string;
  kind: "workbook" | "document" | "presentation";
  name: string;
  category: string;
  description: string;
  sortOrder: number;
  snapshot: Record<string, unknown>;
};

const sum = (xs: number[]) => Math.round(xs.reduce((a, b) => a + b, 0) * 100) / 100;
const GREEN = "#e6f4ea";
const GREEN_INK = "#137333";
const RED = "#fce8e6";
const RED_INK = "#c5221f";
const AMBER = "#fef7e0";
const AMBER_INK = "#b06000";

// ─── To-do list ──────────────────────────────────────────────────────────────
function todo(): SeedTemplate {
  const rows: CellIn[][] = [
    [1, "Renew car registration", serial("2026-10-14"), "High", "DMV appointment at 9:30"],
    [0, "Book flights for Thanksgiving", serial("2026-10-16"), "High", "Compare SFO and OAK"],
    [0, "Call Dr. Patel's office about refill", serial("2026-10-15"), "Medium", ""],
    [1, "Return library books", serial("2026-10-13"), "Low", "Branch on Elm St"],
    [0, "Order birthday gift for Maya", serial("2026-10-20"), "Medium", "She mentioned the pottery class"],
    [0, "Schedule furnace inspection", serial("2026-10-24"), "Medium", "Before first cold snap"],
    [0, "Submit expense report", serial("2026-10-17"), "High", "Receipts in the shared folder"],
    [1, "Update emergency contacts at work", serial("2026-10-12"), "Low", ""],
    [0, "Plan meals for next week", serial("2026-10-18"), "Low", "Try the lentil soup"],
  ];
  const spec: SheetSpec = {
    name: "To-do list",
    accent: "#1a73e8",
    title: "To-do list",
    subtitle: "Check things off as you go; priorities are color-coded.",
    columns: [
      { header: "Done", width: 64, checkbox: true },
      { header: "Task", width: 280 },
      { header: "Due date", width: 120, fmt: "date", date: true },
      { header: "Priority", width: 100, list: ["High", "Medium", "Low"] },
      { header: "Notes", width: 260 },
    ],
    rows,
    spareRows: 12,
    cf: [
      { col: 3, kind: "text", op: "equal", value: "High", bg: RED, cl: RED_INK },
      { col: 3, kind: "text", op: "equal", value: "Medium", bg: AMBER, cl: AMBER_INK },
      { col: 3, kind: "text", op: "equal", value: "Low", bg: GREEN, cl: GREEN_INK },
    ],
  };
  return { seedKey: "sheet-todo", kind: "workbook", name: "To-do list", category: "Personal", description: "Tasks with due dates, priorities and checkboxes.", sortOrder: 10, snapshot: buildWorkbook("To-do list", [spec]) };
}

// ─── Annual budget ───────────────────────────────────────────────────────────
function annualBudget(): SeedTemplate {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const income: Array<[string, number[]]> = [
    ["Salary", Array(12).fill(6850)],
    ["Freelance design", [400, 0, 650, 300, 0, 900, 0, 450, 600, 0, 750, 1200]],
    ["Interest & dividends", [42, 42, 45, 45, 47, 47, 48, 48, 50, 50, 52, 61]],
  ];
  const expenses: Array<[string, number[]]> = [
    ["Rent", Array(12).fill(2350)],
    ["Utilities", [210, 198, 175, 150, 140, 165, 190, 205, 170, 150, 180, 220]],
    ["Groceries", [640, 610, 655, 630, 660, 690, 700, 680, 645, 650, 720, 810]],
    ["Transportation", [280, 260, 290, 275, 300, 320, 340, 330, 290, 285, 300, 310]],
    ["Insurance", Array(12).fill(315)],
    ["Dining out", [180, 220, 160, 200, 240, 260, 300, 280, 210, 190, 230, 380]],
    ["Savings transfer", Array(12).fill(1000)],
    ["Gifts & holidays", [0, 80, 0, 60, 120, 0, 0, 0, 0, 40, 250, 900]],
  ];
  const head = 3;
  const line = (label: string, vals: number[], r: number): CellIn[] => [
    label,
    ...vals,
    fx(`=SUM(B${r + 1}:M${r + 1})`, sum(vals)),
  ];
  const rows: CellIn[][] = [];
  let r = head + 1;
  rows.push([styled("Income", { bl: true, cl: "#137333" })]);
  r++;
  const incStart = r;
  for (const [label, vals] of income) rows.push(line(label, vals, r++));
  const incTotals = months.map((_, m) => sum(income.map(([, v]) => v[m])));
  rows.push([
    styled("Total income", { bl: true }),
    ...incTotals.map((v, m) => ({ f: `=SUM(${colName(m + 1)}${incStart + 1}:${colName(m + 1)}${r})`, v, s: { bl: true, fmt: "currency0" as const } })),
    { f: `=SUM(N${incStart + 1}:N${r})`, v: sum(incTotals), s: { bl: true, fmt: "currency0" as const } },
  ]);
  const incTotalRow = r++;
  rows.push([]);
  r++;
  rows.push([styled("Expenses", { bl: true, cl: "#c5221f" })]);
  r++;
  const expStart = r;
  for (const [label, vals] of expenses) rows.push(line(label, vals, r++));
  const expTotals = months.map((_, m) => sum(expenses.map(([, v]) => v[m])));
  rows.push([
    styled("Total expenses", { bl: true }),
    ...expTotals.map((v, m) => ({ f: `=SUM(${colName(m + 1)}${expStart + 1}:${colName(m + 1)}${r})`, v, s: { bl: true, fmt: "currency0" as const } })),
    { f: `=SUM(N${expStart + 1}:N${r})`, v: sum(expTotals), s: { bl: true, fmt: "currency0" as const } },
  ]);
  const expTotalRow = r++;
  rows.push([]);
  r++;
  const net = months.map((_, m) => sum([incTotals[m], -expTotals[m]]));
  rows.push([
    styled("Net", { bl: true, fs: 12 }),
    ...net.map((v, m) => ({ f: `=${colName(m + 1)}${incTotalRow + 1}-${colName(m + 1)}${expTotalRow + 1}`, v, s: { bl: true, fmt: "currency0" as const } })),
    { f: `=N${incTotalRow + 1}-N${expTotalRow + 1}`, v: sum(net), s: { bl: true, fmt: "currency0" as const } },
  ]);
  const spec: SheetSpec = {
    name: "2027 budget",
    accent: "#0b8043",
    title: "Annual budget — 2027",
    subtitle: "Enter amounts by month; totals and net update by themselves.",
    columns: [{ header: "Category", width: 170 }, ...months.map((m) => ({ header: m, width: 76, fmt: "currency0" as const, align: "right" as const })), { header: "Year", width: 96, fmt: "currency0", align: "right" }],
    rows,
    banded: false,
    filter: false,
    cf: [{ col: 1, toCol: 13, kind: "number", op: "lessThan", value: 0, bg: RED, cl: RED_INK }],
  };
  return { seedKey: "sheet-annual-budget", kind: "workbook", name: "Annual budget", category: "Finance", description: "Income and expenses by month with yearly totals.", sortOrder: 20, snapshot: buildWorkbook("Annual budget", [spec]) };
}

// ─── Monthly budget ──────────────────────────────────────────────────────────
function monthlyBudget(): SeedTemplate {
  const items: Array<[string, string, number, number]> = [
    ["Oct 1", "Housing", 2350, 2350],
    ["Oct 2", "Utilities", 180, 164.32],
    ["Oct 3", "Groceries", 650, 702.18],
    ["Oct 5", "Transportation", 280, 241.5],
    ["Oct 6", "Phone & internet", 125, 125],
    ["Oct 9", "Health", 90, 45],
    ["Oct 11", "Dining out", 200, 236.4],
    ["Oct 14", "Entertainment", 80, 54.99],
    ["Oct 18", "Personal care", 60, 38.75],
    ["Oct 22", "Savings", 900, 900],
  ];
  const head = 8;
  const rows: CellIn[][] = items.map(([d, cat, plan, act], i) => {
    const r = head + 2 + i;
    return [d, cat, plan, act, fx(`=C${r}-D${r}`, Math.round((plan - act) * 100) / 100)];
  });
  const planned = sum(items.map((x) => x[2]));
  const actual = sum(items.map((x) => x[3]));
  const firstData = head + 2;
  const lastData = head + 1 + items.length;
  const spec: SheetSpec = {
    name: "October",
    accent: "#8e24aa",
    title: "Monthly budget — October 2026",
    subtitle: "Plan each category, log what you spend, watch the difference.",
    headerRow: head,
    above: [
      [3, 0, styled("Starting balance", { bl: true })],
      [3, 2, styled(3240, { fmt: "currency" })],
      [4, 0, styled("Income this month", { bl: true })],
      [4, 2, styled(6850, { fmt: "currency" })],
      [5, 0, styled("Spent so far", { bl: true })],
      [5, 2, { f: `=SUM(D${firstData}:D${lastData})`, v: actual, s: { fmt: "currency" } }],
      [6, 0, styled("Ending balance", { bl: true, cl: "#8e24aa" })],
      [6, 2, { f: `=C4+C5-C6`, v: sum([3240, 6850, -actual]), s: { fmt: "currency", bl: true, cl: "#8e24aa" } }],
    ],
    columns: [
      { header: "Date", width: 80 },
      { header: "Category", width: 170, list: ["Housing", "Utilities", "Groceries", "Transportation", "Phone & internet", "Health", "Dining out", "Entertainment", "Personal care", "Savings", "Other"] },
      { header: "Planned", width: 110, fmt: "currency", align: "right" },
      { header: "Actual", width: 110, fmt: "currency", align: "right" },
      { header: "Difference", width: 110, fmt: "currency", align: "right" },
    ],
    rows,
    below: [[0, 1, styled("Total", { bl: true })], [0, 2, { f: `=SUM(C${firstData}:C${lastData})`, v: planned, s: { bl: true, fmt: "currency" } }], [0, 3, { f: `=SUM(D${firstData}:D${lastData})`, v: actual, s: { bl: true, fmt: "currency" } }], [0, 4, { f: `=C${lastData + 1}-D${lastData + 1}`, v: sum([planned, -actual]), s: { bl: true, fmt: "currency" } }]],
    cf: [
      { col: 4, kind: "number", op: "lessThan", value: 0, bg: RED, cl: RED_INK },
      { col: 4, kind: "number", op: "greaterThan", value: 0, bg: GREEN, cl: GREEN_INK },
    ],
  };
  return { seedKey: "sheet-monthly-budget", kind: "workbook", name: "Monthly budget", category: "Finance", description: "Planned versus actual spending for one month.", sortOrder: 30, snapshot: buildWorkbook("Monthly budget", [spec]) };
}

// ─── Investment tracker ──────────────────────────────────────────────────────
function investments(): SeedTemplate {
  const holdings: Array<[string, string, string, number, number, number]> = [
    ["VTI", "Vanguard Total Stock Market ETF", "ETF", 42, 221.4, 289.15],
    ["VXUS", "Vanguard Total International Stock ETF", "ETF", 60, 56.1, 64.82],
    ["BND", "Vanguard Total Bond Market ETF", "Bond ETF", 85, 74.9, 72.31],
    ["AAPL", "Apple Inc.", "Stock", 15, 168.2, 231.6],
    ["MSFT", "Microsoft Corp.", "Stock", 10, 312.5, 428.9],
    ["COST", "Costco Wholesale", "Stock", 6, 540.0, 902.35],
    ["NKE", "Nike Inc.", "Stock", 20, 108.4, 79.62],
    ["SWVXX", "Schwab Value Advantage Money Fund", "Cash", 2500, 1, 1],
  ];
  const head = 3;
  const rows: CellIn[][] = holdings.map(([t, n, type, sh, cost, px], i) => {
    const r = head + 2 + i;
    const mv = Math.round(sh * px * 100) / 100;
    const gain = Math.round((mv - sh * cost) * 100) / 100;
    return [t, n, type, sh, cost, px, fx(`=D${r}*F${r}`, mv), fx(`=G${r}-D${r}*E${r}`, gain), fx(`=IF(D${r}*E${r}=0,0,H${r}/(D${r}*E${r}))`, Math.round((gain / (sh * cost)) * 10000) / 10000)];
  });
  const first = head + 2;
  const last = head + 1 + holdings.length;
  const mvTotal = sum(holdings.map(([, , , sh, , px]) => sh * px));
  const gainTotal = sum(holdings.map(([, , , sh, cost, px]) => sh * px - sh * cost));
  const spec: SheetSpec = {
    name: "Portfolio",
    accent: "#174ea6",
    title: "Investment tracker",
    subtitle: "Update the current price column; value, gain and return follow.",
    columns: [
      { header: "Ticker", width: 72, align: "left" },
      { header: "Name", width: 250 },
      { header: "Type", width: 90, list: ["Stock", "ETF", "Bond ETF", "Mutual fund", "Cash", "Crypto"] },
      { header: "Shares", width: 76, fmt: "decimal", align: "right" },
      { header: "Cost / share", width: 100, fmt: "currency", align: "right" },
      { header: "Price", width: 90, fmt: "currency", align: "right" },
      { header: "Market value", width: 116, fmt: "currency", align: "right" },
      { header: "Gain / loss", width: 106, fmt: "currency", align: "right" },
      { header: "Return", width: 80, fmt: "percent", align: "right" },
    ],
    rows,
    below: [[0, 5, styled("Total", { bl: true })], [0, 6, { f: `=SUM(G${first}:G${last})`, v: mvTotal, s: { bl: true, fmt: "currency" } }], [0, 7, { f: `=SUM(H${first}:H${last})`, v: gainTotal, s: { bl: true, fmt: "currency" } }]],
    cf: [
      { col: 7, toCol: 8, kind: "number", op: "greaterThan", value: 0, bg: GREEN, cl: GREEN_INK },
      { col: 7, toCol: 8, kind: "number", op: "lessThan", value: 0, bg: RED, cl: RED_INK },
    ],
  };
  return { seedKey: "sheet-investments", kind: "workbook", name: "Investment tracker", category: "Finance", description: "Holdings, market value, gain and return.", sortOrder: 40, snapshot: buildWorkbook("Investment tracker", [spec]) };
}

// ─── Weekly planner ──────────────────────────────────────────────────────────
function schedule(): SeedTemplate {
  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  const hours = ["7:00 AM", "8:00 AM", "9:00 AM", "10:00 AM", "11:00 AM", "12:00 PM", "1:00 PM", "2:00 PM", "3:00 PM", "4:00 PM", "5:00 PM", "6:00 PM", "7:00 PM"];
  const plan: Record<string, Record<number, [string, string]>> = {
    "7:00 AM": { 0: ["Run — 5k", "#e6f4ea"], 2: ["Run — 5k", "#e6f4ea"], 5: ["Farmers market", "#fef7e0"] },
    "9:00 AM": { 0: ["Team standup", "#e8f0fe"], 1: ["Team standup", "#e8f0fe"], 2: ["Team standup", "#e8f0fe"], 3: ["Team standup", "#e8f0fe"], 4: ["Team standup", "#e8f0fe"] },
    "10:00 AM": { 1: ["Design review", "#f3e8fd"], 3: ["Client call — Harbor Co.", "#fce8e6"], 6: ["Brunch with Sam", "#fef7e0"] },
    "12:00 PM": { 0: ["Lunch", "#f1f3f4"], 1: ["Lunch", "#f1f3f4"], 2: ["Lunch & learn", "#f3e8fd"], 3: ["Lunch", "#f1f3f4"], 4: ["Lunch", "#f1f3f4"] },
    "2:00 PM": { 0: ["Focus: Q4 plan", "#e8f0fe"], 2: ["Focus: Q4 plan", "#e8f0fe"], 4: ["1:1 with Jordan", "#fce8e6"] },
    "4:00 PM": { 1: ["Dentist", "#fef7e0"], 4: ["Week wrap-up", "#e8f0fe"] },
    "6:00 PM": { 0: ["Cook dinner", "#e6f4ea"], 2: ["Guitar lesson", "#f3e8fd"], 4: ["Movie night", "#fef7e0"], 5: ["Dinner at Lena's", "#fef7e0"] },
  };
  const rows: CellIn[][] = hours.map((h) => [styled(h, { cl: "#5f6368", ht: "right" }), ...days.map((_, d) => {
    const e = plan[h]?.[d];
    return e ? styled(e[0], { bg: e[1] }) : "";
  })]);
  const spec: SheetSpec = {
    name: "This week",
    accent: "#e37400",
    title: "Weekly planner",
    subtitle: "Week of October 12, 2026",
    columns: [{ header: "", width: 76 }, ...days.map((d) => ({ header: d, width: 128, align: "center" as const }))],
    rows,
    banded: false,
    filter: false,
    rowHeights: Object.fromEntries(hours.map((_, i) => [4 + i, 34])),
  };
  return { seedKey: "sheet-schedule", kind: "workbook", name: "Weekly planner", category: "Personal", description: "Hour-by-hour plan for the week.", sortOrder: 50, snapshot: buildWorkbook("Weekly planner", [spec]) };
}

// ─── Invoice ─────────────────────────────────────────────────────────────────
function invoice(): SeedTemplate {
  const lines: Array<[string, number, number]> = [
    ["Brand identity — logo, palette, type system", 1, 2400],
    ["Website design — 6 page templates", 6, 450],
    ["Copywriting — home and services pages", 8, 95],
    ["Product photography edit (per image)", 24, 18],
    ["Project management", 5, 85],
  ];
  const head = 10;
  const rows: CellIn[][] = lines.map(([d, q, p], i) => {
    const r = head + 2 + i;
    return [d, q, p, fx(`=B${r}*C${r}`, q * p)];
  });
  const first = head + 2;
  const last = head + 1 + lines.length;
  const subtotal = sum(lines.map(([, q, p]) => q * p));
  const tax = Math.round(subtotal * 0.0875 * 100) / 100;
  const spec: SheetSpec = {
    name: "Invoice",
    accent: "#202124",
    headerRow: head,
    above: [
      [0, 0, styled("Juniper & Pine Studio", { fs: 18, bl: true })],
      [1, 0, styled("418 Alder Street, Portland, OR 97205", { cl: "#5f6368" })],
      [2, 0, styled("hello@juniperpine.studio · (503) 555-0148", { cl: "#5f6368" })],
      [0, 3, styled("INVOICE", { fs: 22, bl: true, ht: "right", cl: "#1a73e8" })],
      [4, 0, styled("Bill to", { bl: true })],
      [5, 0, "Harbor Coffee Roasters"],
      [6, 0, "Attn: Dana Whitfield"],
      [7, 0, "92 Wharf Road, Astoria, OR 97103"],
      [4, 2, styled("Invoice #", { bl: true, ht: "right" })],
      [4, 3, styled("JP-2026-041", { ht: "right" })],
      [5, 2, styled("Date", { bl: true, ht: "right" })],
      [5, 3, styled(serial("2026-10-12"), { fmt: "date", ht: "right" })],
      [6, 2, styled("Due", { bl: true, ht: "right" })],
      [6, 3, styled(serial("2026-11-11"), { fmt: "date", ht: "right" })],
    ],
    columns: [
      { header: "Description", width: 330 },
      { header: "Qty", width: 70, fmt: "int", align: "right" },
      { header: "Unit price", width: 110, fmt: "currency", align: "right" },
      { header: "Amount", width: 120, fmt: "currency", align: "right" },
    ],
    rows,
    below: [
      [1, 2, styled("Subtotal", { ht: "right" })],
      [1, 3, { f: `=SUM(D${first}:D${last})`, v: subtotal, s: { fmt: "currency" } }],
      [2, 2, styled("Tax (8.75%)", { ht: "right" })],
      [2, 3, { f: `=ROUND(D${last + 2}*0.0875,2)`, v: tax, s: { fmt: "currency" } }],
      [3, 2, styled("Total due", { ht: "right", bl: true, fs: 12 })],
      [3, 3, { f: `=D${last + 2}+D${last + 3}`, v: sum([subtotal, tax]), s: { fmt: "currency", bl: true, fs: 12, bg: "#e8f0fe" } }],
      [5, 0, styled("Payment by bank transfer or card within 30 days. Thank you!", { it: true, cl: "#5f6368" })],
    ],
    filter: false,
    gridlines: false,
  };
  return { seedKey: "sheet-invoice", kind: "workbook", name: "Invoice", category: "Work", description: "Line items, tax and total due.", sortOrder: 60, snapshot: buildWorkbook("Invoice", [spec]) };
}

// ─── Team roster ─────────────────────────────────────────────────────────────
function roster(): SeedTemplate {
  const people: CellIn[][] = [
    ["Priya Raman", "Engineering manager", "Platform", "priya.raman@northwind.io", "(415) 555-0132", serial("2021-03-15"), "San Francisco", 1],
    ["Marcus Bell", "Senior engineer", "Platform", "marcus.bell@northwind.io", "(415) 555-0177", serial("2022-08-01"), "Remote — Denver", 1],
    ["Ana Lucía Ortega", "Product designer", "Design", "ana.ortega@northwind.io", "(415) 555-0119", serial("2023-01-09"), "San Francisco", 1],
    ["Tom Nguyen", "Data analyst", "Insights", "tom.nguyen@northwind.io", "(206) 555-0188", serial("2023-06-19"), "Seattle", 1],
    ["Grace Okafor", "Product manager", "Growth", "grace.okafor@northwind.io", "(415) 555-0164", serial("2020-11-02"), "San Francisco", 1],
    ["Eli Brandt", "Engineer", "Growth", "eli.brandt@northwind.io", "(512) 555-0141", serial("2024-02-26"), "Remote — Austin", 1],
    ["Hana Sato", "Support lead", "Customer", "hana.sato@northwind.io", "(206) 555-0105", serial("2019-07-22"), "Seattle", 1],
    ["Diego Ferreira", "Engineer (contract)", "Platform", "diego.ferreira@northwind.io", "(305) 555-0193", serial("2025-05-12"), "Remote — Miami", 0],
  ];
  const spec: SheetSpec = {
    name: "Team",
    accent: "#00796b",
    title: "Team roster",
    subtitle: "Northwind product team — filter by team or location from the header.",
    columns: [
      { header: "Name", width: 160 },
      { header: "Role", width: 170 },
      { header: "Team", width: 100, list: ["Platform", "Design", "Insights", "Growth", "Customer"] },
      { header: "Email", width: 220 },
      { header: "Phone", width: 120 },
      { header: "Start date", width: 110, fmt: "date", date: true },
      { header: "Location", width: 140 },
      { header: "Active", width: 64, checkbox: true },
    ],
    rows: people,
    spareRows: 10,
  };
  return { seedKey: "sheet-roster", kind: "workbook", name: "Team roster", category: "Work", description: "People, roles, teams and contact details.", sortOrder: 70, snapshot: buildWorkbook("Team roster", [spec]) };
}

// ─── Project timeline (Gantt) ────────────────────────────────────────────────
function timeline(): SeedTemplate {
  const weekStart = serial("2026-10-05");
  const weeks = Array.from({ length: 10 }, (_, i) => weekStart + i * 7);
  const tasks: Array<[string, string, string, string, string]> = [
    ["Kickoff & goals", "Grace", "2026-10-05", "2026-10-09", "Done"],
    ["User interviews", "Ana", "2026-10-07", "2026-10-23", "Done"],
    ["Requirements doc", "Grace", "2026-10-19", "2026-10-30", "In progress"],
    ["Design explorations", "Ana", "2026-10-26", "2026-11-13", "In progress"],
    ["API design", "Marcus", "2026-11-02", "2026-11-13", "Not started"],
    ["Build — sprint 1", "Priya", "2026-11-09", "2026-11-20", "Not started"],
    ["Build — sprint 2", "Priya", "2026-11-23", "2026-12-04", "Not started"],
    ["Beta with 20 customers", "Hana", "2026-11-30", "2026-12-11", "Not started"],
    ["Launch", "Grace", "2026-12-07", "2026-12-11", "Not started"],
  ];
  const head = 3;
  const hdrRowNum = head + 1; // 1-based row of the header
  const fixed = 5;
  const rows: CellIn[][] = tasks.map(([t, o, s, e, st], i) => {
    const r = head + 2 + i;
    const S = serial(s);
    const E = serial(e);
    return [t, o, S, E, st, ...weeks.map((w, k) => {
      const c = colName(fixed + k);
      const on = w + 6 >= S && w <= E;
      return fx(`=IF(AND(${c}$${hdrRowNum}+6>=$C${r},${c}$${hdrRowNum}<=$D${r}),1,"")`, on ? 1 : "");
    })];
  });
  const spec: SheetSpec = {
    name: "Timeline",
    accent: "#3949ab",
    title: "Project timeline — Customer portal",
    subtitle: "Change a start or end date and the bars move.",
    columns: [
      { header: "Task", width: 190 },
      { header: "Owner", width: 80 },
      { header: "Start", width: 92, fmt: "date", date: true },
      { header: "End", width: 92, fmt: "date", date: true },
      { header: "Status", width: 100, list: ["Not started", "In progress", "Done", "Blocked"] },
      ...weeks.map(() => ({ header: "", width: 60, align: "center" as const })),
    ],
    rows,
    banded: false,
    cf: [
      { col: fixed, toCol: fixed + weeks.length - 1, kind: "number", op: "equal", value: 1, bg: "#7986cb", cl: "#7986cb" },
      { col: 4, kind: "text", op: "equal", value: "Done", bg: GREEN, cl: GREEN_INK },
      { col: 4, kind: "text", op: "equal", value: "In progress", bg: "#e8f0fe", cl: "#1967d2" },
      { col: 4, kind: "text", op: "equal", value: "Blocked", bg: RED, cl: RED_INK },
    ],
  };
  const wb = buildWorkbook("Project timeline", [spec]);
  // Week-start dates in the header row (formatted like "Oct 5").
  const sheet = (wb.sheets as Record<string, { cellData: Record<number, Record<number, Record<string, unknown>>> }>)["sheet-1"];
  const styles = wb.styles as Record<string, Record<string, unknown>>;
  styles.weekhdr = { bg: { rgb: "#3949ab" }, cl: { rgb: "#ffffff" }, bl: 1, ht: 2, vt: 2, fs: 9, n: { pattern: "mmm d" } };
  weeks.forEach((w, k) => (sheet.cellData[head][fixed + k] = { v: w, t: 2, s: "weekhdr" }));
  return { seedKey: "sheet-timeline", kind: "workbook", name: "Project timeline", category: "Project management", description: "Gantt-style weekly bars driven by start and end dates.", sortOrder: 80, snapshot: wb };
}

// ─── Event planner ───────────────────────────────────────────────────────────
function eventPlanner(): SeedTemplate {
  const tasks: Array<[number, string, string, string, string, number, number]> = [
    [1, "Book venue — Lakeside Pavilion", "Venue", "Jordan", "2026-09-30", 3200, 3000],
    [1, "Send save-the-dates", "Guests", "Priya", "2026-10-03", 120, 96.5],
    [1, "Choose caterer & menu tasting", "Food", "Lena", "2026-10-10", 4800, 4650],
    [0, "Order flowers and centerpieces", "Decor", "Ana", "2026-10-20", 900, 0],
    [0, "Confirm DJ and playlist", "Entertainment", "Marcus", "2026-10-22", 1100, 0],
    [0, "Print programs and place cards", "Guests", "Priya", "2026-10-28", 260, 0],
    [0, "Arrange shuttle from hotel", "Logistics", "Jordan", "2026-11-02", 650, 0],
    [0, "Final headcount to caterer", "Food", "Lena", "2026-11-04", 0, 0],
  ];
  const head = 3;
  const rows: CellIn[][] = tasks.map(([d, t, c, o, due, b, a], i) => {
    const r = head + 2 + i;
    return [d, t, c, o, serial(due), b, a, fx(`=F${r}-G${r}`, b - a)];
  });
  const first = head + 2;
  const last = head + 1 + tasks.length + 6; // through the spare rows
  const spec: SheetSpec = {
    name: "Plan",
    accent: "#d81b60",
    title: "Event planner — Fall fundraiser gala",
    subtitle: "Saturday, November 7, 2026 · Lakeside Pavilion · 180 guests",
    columns: [
      { header: "Done", width: 64, checkbox: true },
      { header: "Task", width: 250 },
      { header: "Area", width: 110, list: ["Venue", "Food", "Decor", "Guests", "Entertainment", "Logistics"] },
      { header: "Owner", width: 90 },
      { header: "Due", width: 110, fmt: "date", date: true },
      { header: "Budget", width: 100, fmt: "currency0", align: "right" },
      { header: "Spent", width: 100, fmt: "currency", align: "right" },
      { header: "Remaining", width: 100, fmt: "currency", align: "right" },
    ],
    rows,
    below: [[0, 4, styled("Totals", { bl: true })], [0, 5, { f: `=SUM(F${first}:F${last})`, v: sum(tasks.map((t) => t[5])), s: { bl: true, fmt: "currency0" } }], [0, 6, { f: `=SUM(G${first}:G${last})`, v: sum(tasks.map((t) => t[6])), s: { bl: true, fmt: "currency" } }], [0, 7, { f: `=F${last + 1}-G${last + 1}`, v: sum(tasks.map((t) => t[5] - t[6])), s: { bl: true, fmt: "currency" } }]],
    cf: [{ col: 7, kind: "number", op: "lessThan", value: 0, bg: RED, cl: RED_INK }],
    spareRows: 6,
  };
  return { seedKey: "sheet-event", kind: "workbook", name: "Event planner", category: "Personal", description: "Tasks, owners, deadlines and budget for an event.", sortOrder: 90, snapshot: buildWorkbook("Event planner", [spec]) };
}

// ─── Expense report ──────────────────────────────────────────────────────────
function expenseReport(): SeedTemplate {
  const items: Array<[string, string, string, string, number, number]> = [
    ["2026-10-05", "Flight SFO → ORD", "Travel", "United Airlines", 412.6, 1],
    ["2026-10-05", "Taxi to hotel", "Travel", "Chicago Yellow Cab", 46.25, 1],
    ["2026-10-05", "Hotel — 3 nights", "Lodging", "The Langham Chicago", 897.0, 1],
    ["2026-10-06", "Client dinner (4 people)", "Meals", "Girl & the Goat", 318.4, 1],
    ["2026-10-07", "Conference registration", "Conference", "RetailTech Summit", 695.0, 1],
    ["2026-10-07", "Lunch", "Meals", "Revival Food Hall", 18.75, 1],
    ["2026-10-08", "Airport parking", "Travel", "SFO Long Term", 72.0, 1],
    ["2026-10-08", "Noise-cancelling headphones", "Equipment", "Hudson News", 129.99, 0],
  ];
  const head = 6;
  const rows: CellIn[][] = items.map(([d, desc, cat, m, amt, re]) => [serial(d), desc, cat, m, amt, re]);
  const first = head + 2;
  const last = head + 1 + items.length;
  const reimb = sum(items.filter((x) => x[5] === 1).map((x) => x[4]));
  const spec: SheetSpec = {
    name: "Report",
    accent: "#5f6368",
    title: "Expense report",
    headerRow: head,
    above: [
      [2, 0, styled("Employee", { bl: true })], [2, 1, "Tom Nguyen"],
      [3, 0, styled("Purpose", { bl: true })], [3, 1, "RetailTech Summit, Chicago"],
      [4, 0, styled("Period", { bl: true })], [4, 1, "Oct 5 – Oct 8, 2026"],
      [2, 3, styled("Manager", { bl: true })], [2, 4, "Priya Raman"],
      [3, 3, styled("Cost center", { bl: true })], [3, 4, "INS-204"],
    ],
    columns: [
      { header: "Date", width: 100, fmt: "date", date: true },
      { header: "Description", width: 220 },
      { header: "Category", width: 110, list: ["Travel", "Lodging", "Meals", "Conference", "Equipment", "Other"] },
      { header: "Merchant", width: 170 },
      { header: "Amount", width: 100, fmt: "currency", align: "right" },
      { header: "Reimbursable", width: 100, checkbox: true },
    ],
    rows,
    below: [
      [0, 3, styled("Total", { bl: true, ht: "right" })],
      [0, 4, { f: `=SUM(E${first}:E${last})`, v: sum(items.map((x) => x[4])), s: { bl: true, fmt: "currency" } }],
      [1, 3, styled("Reimbursable", { bl: true, ht: "right" })],
      [1, 4, { f: `=SUMIF(F${first}:F${last},1,E${first}:E${last})`, v: reimb, s: { bl: true, fmt: "currency", bg: "#e8f0fe" } }],
    ],
    cf: [{ col: 4, kind: "number", op: "greaterThan", value: 500, bg: AMBER, cl: AMBER_INK }],
  };
  return { seedKey: "sheet-expense", kind: "workbook", name: "Expense report", category: "Work", description: "Trip expenses with categories and reimbursable totals.", sortOrder: 100, snapshot: buildWorkbook("Expense report", [spec]) };
}

// ─── Attendance ──────────────────────────────────────────────────────────────
function attendance(): SeedTemplate {
  const students = ["Aisha Bello", "Ben Carter", "Chloe Dubois", "Daniel Kim", "Emma Rossi", "Felix Wagner", "Gabriela Silva", "Hiro Tanaka", "Isla Murphy", "Jamal Hughes"];
  const days = ["2026-10-05", "2026-10-06", "2026-10-07", "2026-10-08", "2026-10-09", "2026-10-12", "2026-10-13", "2026-10-14"];
  const pattern = ["P", "P", "P", "L", "P", "P", "A", "P", "P", "P", "P", "P", "L", "P", "P", "A"];
  const head = 3;
  const firstDay = 1;
  const lastDayCol = colName(firstDay + days.length - 1);
  const rows: CellIn[][] = students.map((s, i) => {
    const r = head + 2 + i;
    const marks = days.map((_, d) => pattern[(i * 3 + d * 5) % pattern.length]);
    const count = (m: string) => marks.filter((x) => x === m).length;
    return [s, ...marks, fx(`=COUNTIF(B${r}:${lastDayCol}${r},"P")`, count("P")), fx(`=COUNTIF(B${r}:${lastDayCol}${r},"L")`, count("L")), fx(`=COUNTIF(B${r}:${lastDayCol}${r},"A")`, count("A"))];
  });
  const spec: SheetSpec = {
    name: "October",
    accent: "#f9ab00",
    title: "Attendance — Room 12, Grade 7 Science",
    subtitle: "P present · L late · A absent",
    columns: [
      { header: "Student", width: 150 },
      ...days.map((d) => ({ header: d.slice(5).replace("-", "/"), width: 56, align: "center" as const, list: ["P", "L", "A"] })),
      { header: "Present", width: 70, align: "center" },
      { header: "Late", width: 56, align: "center" },
      { header: "Absent", width: 64, align: "center" },
    ],
    rows,
    cf: [
      { col: 1, toCol: days.length, kind: "text", op: "equal", value: "A", bg: RED, cl: RED_INK },
      { col: 1, toCol: days.length, kind: "text", op: "equal", value: "L", bg: AMBER, cl: AMBER_INK },
      { col: 1, toCol: days.length, kind: "text", op: "equal", value: "P", bg: GREEN, cl: GREEN_INK },
    ],
  };
  return { seedKey: "sheet-attendance", kind: "workbook", name: "Attendance", category: "Education", description: "Daily attendance with present, late and absent counts.", sortOrder: 110, snapshot: buildWorkbook("Attendance", [spec]) };
}

// ─── Sales pipeline ──────────────────────────────────────────────────────────
function pipeline(): SeedTemplate {
  const deals: Array<[string, string, string, string, number, number, string]> = [
    ["Annual license renewal", "Harbor Coffee Roasters", "Grace", "Negotiation", 48000, 0.8, "2026-10-30"],
    ["POS integration pilot", "Fernwood Grocers", "Eli", "Proposal", 22500, 0.5, "2026-11-14"],
    ["Multi-site rollout", "Cascade Fitness", "Grace", "Qualified", 96000, 0.3, "2026-12-12"],
    ["Analytics add-on", "Lumen Dental Group", "Tom", "Closed won", 12000, 1, "2026-10-02"],
    ["Starter plan", "Blue Heron Books", "Eli", "Lead", 4800, 0.1, "2026-12-20"],
    ["Enterprise upgrade", "Northgate Logistics", "Grace", "Negotiation", 135000, 0.7, "2026-11-06"],
    ["Support package", "Maple Street Vet", "Tom", "Closed lost", 6000, 0, "2026-09-28"],
    ["Seasonal expansion", "Summit Outfitters", "Eli", "Proposal", 31000, 0.5, "2026-11-21"],
  ];
  const head = 3;
  const rows: CellIn[][] = deals.map(([n, co, o, st, v, p, close], i) => {
    const r = head + 2 + i;
    return [n, co, o, st, v, p, fx(`=E${r}*F${r}`, Math.round(v * p * 100) / 100), serial(close)];
  });
  const first = head + 2;
  const last = head + 1 + deals.length;
  const spec: SheetSpec = {
    name: "Pipeline",
    accent: "#0277bd",
    title: "Sales pipeline — Q4 2026",
    subtitle: "Weighted value = deal value × probability.",
    columns: [
      { header: "Deal", width: 190 },
      { header: "Company", width: 180 },
      { header: "Owner", width: 76 },
      { header: "Stage", width: 110, list: ["Lead", "Qualified", "Proposal", "Negotiation", "Closed won", "Closed lost"] },
      { header: "Value", width: 100, fmt: "currency0", align: "right" },
      { header: "Probability", width: 90, fmt: "percent", align: "right" },
      { header: "Weighted", width: 100, fmt: "currency0", align: "right" },
      { header: "Close date", width: 106, fmt: "date", date: true },
    ],
    rows,
    below: [[0, 3, styled("Totals", { bl: true })], [0, 4, { f: `=SUM(E${first}:E${last})`, v: sum(deals.map((d) => d[4])), s: { bl: true, fmt: "currency0" } }], [0, 6, { f: `=SUM(G${first}:G${last})`, v: sum(deals.map((d) => d[4] * d[5])), s: { bl: true, fmt: "currency0" } }]],
    cf: [
      { col: 3, kind: "text", op: "equal", value: "Closed won", bg: GREEN, cl: GREEN_INK },
      { col: 3, kind: "text", op: "equal", value: "Closed lost", bg: RED, cl: RED_INK },
      { col: 3, kind: "text", op: "equal", value: "Negotiation", bg: "#e8f0fe", cl: "#1967d2" },
    ],
    spareRows: 8,
  };
  return { seedKey: "sheet-pipeline", kind: "workbook", name: "Sales pipeline", category: "Work", description: "Deals by stage with weighted forecast.", sortOrder: 120, snapshot: buildWorkbook("Sales pipeline", [spec]) };
}

export function workbookSeeds(): SeedTemplate[] {
  return [todo(), annualBudget(), monthlyBudget(), investments(), schedule(), invoice(), roster(), timeline(), eventPlanner(), expenseReport(), attendance(), pipeline()];
}
