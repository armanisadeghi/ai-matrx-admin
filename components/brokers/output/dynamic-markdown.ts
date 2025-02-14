export type SectionItem = {
  name: string;
  description?: string;
};

export type TableData = {
  headers: string[];
  rows: string[][];
};

export type ParsedContent = {
  intro: string;
  sections: { title: string; items: SectionItem[] }[];
  tables: { title: string; data: TableData }[];
  outro: string;
};

export function parseDynamicMarkdownContent(markdown: string): ParsedContent {
  const lines = markdown.split("\n").map(line => line.trim());

  let intro = "";
  let outro = "";
  const sections: { title: string; items: SectionItem[] }[] = [];
  const tables: { title: string; data: TableData }[] = [];
  let currentSection: { title: string; items: SectionItem[] } | null = null;
  let currentTable: { title: string; data: TableData } | null = null;
  let isTable = false;
  let tableHeaders: string[] = [];
  let tableRows: string[][] = [];

  const isHeader = (line: string) => /^#{1,3}\s/.test(line);
  const isDivider = (line: string) => /^={3,}$/.test(line);
  const isTableSeparator = (line: string) => /^\|[-\s|]+\|$/.test(line);
  const isTableRow = (line: string) => /^\|.*\|$/.test(line);
  const isListItem = (line: string) => /^[-*]\s+|^\d+\.\s+/.test(line);
  const extractBold = (text: string) => text.replace(/\*\*(.*?)\*\*/g, "$1");

  let collectingIntro = true;
  let collectingOutro = false;

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];

    if (isDivider(line)) continue; // Ignore dividers

    // Detect Table Start
    if (isTableRow(line) && !isTable) {
      isTable = true;
      tableHeaders = line.split("|").map(header => header.trim()).filter(Boolean);
      continue;
    }

    // Process Table Content
    if (isTable) {
      if (isTableSeparator(line)) continue; // Ignore separator row

      if (isTableRow(line)) {
        tableRows.push(line.split("|").map(cell => cell.trim()).filter(Boolean));
        continue;
      } else {
        // Table ended
        if (currentTable) {
          tables.push(currentTable);
        }
        currentTable = {
          title: sections.length ? sections[sections.length - 1].title : "Untitled Table",
          data: { headers: tableHeaders, rows: tableRows },
        };
        isTable = false;
        tableRows = [];
      }
    }

    // Detect Headers
    if (isHeader(line)) {
      collectingIntro = false;
      if (currentSection) sections.push(currentSection);
      currentSection = { title: extractBold(line.replace(/^#{1,3}\s/, "")), items: [] };
      continue;
    }

    // Process Lists
    if (isListItem(line)) {
      const listMatch = line.match(/^[-*\d.]\s+(.*)/);
      if (listMatch) {
        const name = extractBold(listMatch[1].trim());
        currentSection?.items.push({ name });
      }
      continue;
    }

    // Process Regular Text (Paragraphs)
    if (currentSection) {
      if (currentSection.items.length > 0) {
        const lastItem = currentSection.items[currentSection.items.length - 1];
        lastItem.description = (lastItem.description ?? "") + ` ${line}`;
      } else {
        currentSection.items.push({ name: extractBold(line), description: "" });
      }
    } else if (collectingIntro) {
      intro += (intro ? "\n" : "") + extractBold(line);
    } else {
      collectingOutro = true;
      outro += (outro ? "\n" : "") + extractBold(line);
    }
  }

  // Push the last section
  if (currentSection) sections.push(currentSection);
  if (currentTable) tables.push(currentTable);

  return { intro: intro.trim(), sections, tables, outro: outro.trim() };
}

export default parseDynamicMarkdownContent;