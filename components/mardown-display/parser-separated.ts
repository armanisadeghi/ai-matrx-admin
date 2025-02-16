// parser.ts

import { parseMarkdownTable } from "./parse-markdown-table";


export interface ListItem {
    name: string;
    children?: ListItem[]; // sub-items
  }
  
  export interface Section {
    title: string;
    intro: string;
    items: ListItem[];
    tables: { title: string; data: any }[];
    outro: string;
  }
  
  export interface ParsedContent {
    intro: string;
    sections: Section[];
    outro: string;
  }

  

export function separatedMarkdownParser(markdown: string): ParsedContent {
  // Split into lines
  const allLines = markdown.split("\n");
  const isHeading = (line: string) => /^#{1,3}\s+/.test(line.trim());
  const isBoldHeading = (line: string) => /^\*\*[^*]+\*\*$/.test(line.trim());
  const isDivider = (line: string) => /^(?:={3,}|-{3,}|\*{3,}|_{3,})$/.test(line.trim());
  const isListItem = (line: string) =>
    /^[*\-]\s+/.test(line.trim()) || /^\d+\.\s+/.test(line.trim());
  const extractBold = (text: string) => text.replace(/\*\*(.*?)\*\*/g, "$1");

  // Final results
  let intro = "";
  let sections: Section[] = [];
  let outro = "";

  // State
  let currentSection: Section | null = null;
  let hasSeenFirstItem = false; // used to separate a section's intro vs. outro
  let collectingIntro = true; // top-level intro until the first heading/divider
  let collectingOutro = false; // after final heading or divider

  // Helper: finalize (push) the current section
  function finalizeSection() {
    if (currentSection) {
      sections.push(currentSection);
      currentSection = null;
    }
    hasSeenFirstItem = false;
  }

  let i = 0;
  while (i < allLines.length) {
    const rawLine = allLines[i];
    const trimmed = rawLine.trim();

    // 1. Divider => finalize section
    if (isDivider(trimmed)) {
      finalizeSection();
      collectingIntro = false; 
      collectingOutro = false; 
      i++;
      continue;
    }

    // 2. Heading => finalize old section, create new
    if (isHeading(trimmed) || isBoldHeading(trimmed)) {
      finalizeSection();
      collectingIntro = false;
      collectingOutro = false;

      // remove heading markers
      let headingText = trimmed;
      if (isHeading(trimmed)) {
        headingText = headingText.replace(/^#{1,3}\s+/, "");
      } else {
        headingText = headingText.replace(/^\*\*(.*)\*\*$/, "$1");
      }

      currentSection = {
        title: extractBold(headingText),
        intro: "",
        items: [],   // <== Our items are now ListItem[]
        tables: [],
        outro: "",
      };

      i++;
      continue;
    }

    // 3. Table detection: gather consecutive lines starting with "|"
    if (trimmed.startsWith("|")) {
      const tableLines: string[] = [];
      let j = i;
      while (j < allLines.length && allLines[j].trim().startsWith("|")) {
        tableLines.push(allLines[j]);
        j++;
      }

      // Attempt to parse as table
      const tableBlock = tableLines.join("\n");
      const tableData = parseMarkdownTable(tableBlock);

      if (tableData) {
        if (!currentSection) {
          outro += (outro ? "\n" : "") + "[Table found outside any section]";
        } else {
          currentSection.tables.push({
            title: currentSection.title,
            data: tableData,
          });
        }
        i = j;
        continue;
      }
    }

    // 4. If this line is a list item, parse the entire list block
    if (isListItem(rawLine)) {
      if (!currentSection) {
        // top-level list => might be part of intro or outro
        if (collectingIntro) {
          // Use parseListBlock to gather all consecutive list lines
          const [parsedList, linesConsumed] = parseListBlock(
            allLines,
            i,
            extractBold
          );
          // Flatten them into the 'intro' text if you prefer, or skip that.
          // For example, you could just append bullet lines to intro:
          parsedList.forEach((item) => {
            intro += (intro ? "\n" : "") + item.name;
            // If item.children exist, you'd need to flatten them to text
            // or handle them differently. Up to you.
          });

          i += linesConsumed;
          continue;
        } else if (collectingOutro) {
          // Similarly for outro
          const [parsedList, linesConsumed] = parseListBlock(
            allLines,
            i,
            extractBold
          );
          parsedList.forEach((item) => {
            outro += (outro ? "\n" : "") + item.name;
            // Flatten or store children, depending on your preference
          });

          i += linesConsumed;
          continue;
        }
      } else {
        // We are in a section: parse the entire sub-list
        const [parsedListItems, linesConsumed] = parseListBlock(
          allLines,
          i,
          extractBold
        );
        // push them into currentSection.items
        currentSection.items.push(...parsedListItems);
        hasSeenFirstItem = true;
        i += linesConsumed;
        continue;
      }
    }

    // 5. Plain text
    if (!currentSection) {
      // not in any section => global intro or outro
      if (collectingIntro) {
        if (trimmed.length) {
          intro += (intro ? "\n" : "") + extractBold(trimmed);
        }
      } else {
        collectingOutro = true;
        if (trimmed.length) {
          outro += (outro ? "\n" : "") + extractBold(trimmed);
        }
      }
    } else {
      // within a section
      if (!hasSeenFirstItem) {
        // goes into section intro
        if (trimmed.length) {
          if (currentSection.intro) {
            currentSection.intro += " ";
          }
          currentSection.intro += extractBold(trimmed);
        }
      } else {
        // goes into section outro
        if (trimmed.length) {
          if (currentSection.outro) {
            currentSection.outro += " ";
          }
          currentSection.outro += extractBold(trimmed);
        }
      }
    }

    i++;
  }

  // Finalize the last section if still open
  finalizeSection();

  return {
    intro: intro.trim(),
    sections,
    outro: outro.trim(),
  };
}

// The same parseListBlock() function, placed below or imported from a separate file.
// Just make sure it references the same "isListItem" and "extractBold" logic:

function parseListBlock(
  lines: string[],
  startIndex: number,
  extractBold: (text: string) => string
): [ListItem[], number] {
  const items: ListItem[] = [];
  const stack: Array<{ indent: number; list: ListItem[] }> = [
    { indent: 0, list: items },
  ];

  let i = startIndex;

  while (i < lines.length) {
    const rawLine = lines[i];
    if (!rawLine.trim()) {
      i++;
      continue;
    }
    if (!isListItem(rawLine)) {
      break;
    }
    const leadingSpaceMatch = rawLine.match(/^( +)/);
    const indent = leadingSpaceMatch ? leadingSpaceMatch[1].length : 0;

    const trimmed = rawLine.trim();
    const match = trimmed.match(/^([*\-]|\d+\.)\s+(.*)/);
    if (!match) {
      break;
    }
    const text = match[2];

    while (indent < stack[stack.length - 1].indent) {
      stack.pop();
    }
    if (indent > stack[stack.length - 1].indent) {
      // We are nesting deeper
      const parentList = stack[stack.length - 1].list;
      const parentItem = parentList[parentList.length - 1];
      if (!parentItem.children) {
        parentItem.children = [];
      }
      stack.push({ indent, list: parentItem.children });
    }

    stack[stack.length - 1].list.push({
      name: extractBold(text),
    });

    i++;
  }

  return [items, i - startIndex];
}

// Re-use the same check from the main parser if you like
function isListItem(line: string): boolean {
  const t = line.trim();
  return /^[*\-]\s+/.test(t) || /^\d+\.\s+/.test(t);
}
