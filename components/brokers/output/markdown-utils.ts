export type SectionItem = {
    name: string;
    description?: string;
  };
  
  export type ParsedContent = {
    intro: string;
    sections: { title: string; items: SectionItem[] }[];
    outro: string;
  };
  
  export function parseMarkdownContent(markdown: string): ParsedContent {
    const lines = markdown.split("\n").map(line => line.trim());
  
    let intro = "";
    let outro = "";
    const sections: { title: string; items: SectionItem[] }[] = [];
    let currentSection: { title: string; items: SectionItem[] } | null = null;
  
    const isHeader = (line: string) => line.startsWith("### ") || line.startsWith("## ") || line.startsWith("**");
    const isDivider = (line: string) => line.startsWith("===") || line.startsWith("---");
  
    let collectingIntro = true;
    let collectingOutro = false;
  
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
  
      if (isDivider(line)) continue; // Ignore dividers
  
      if (isHeader(line)) {
        // If we were collecting intro, stop here
        collectingIntro = false;
  
        // Start a new section
        if (currentSection) {
          sections.push(currentSection);
        }
        currentSection = { title: line.replace("###", "").trim(), items: [] } 
        continue;
      }
  
      if (currentSection) {
        // Check if it's a list item (supports both numbered and unordered lists)
        const listItemMatch = line.match(/^[\d*-]\.\s*(\*\*?.+?\*\*?):?\s*(.*)/);
  
        if (listItemMatch) {
          const name = listItemMatch[1].replace(/\*\*/g, "").trim();
          const description = listItemMatch[2]?.trim() || "";
          currentSection.items.push({ name, description });
        } else if (line) {
          // If it's just a paragraph, append to last item description or create a new one
          if (currentSection.items.length > 0) {
            currentSection.items[currentSection.items.length - 1].description += ` ${line}`;
          } else {
            currentSection.items.push({ name: line });
          }
        }
      } else if (collectingIntro) {
        intro += (intro ? "\n" : "") + line;
      } else {
        // Once all sections are done, collect outro
        collectingOutro = true;
        outro += (outro ? "\n" : "") + line;
      }
    }
  
    // Push last section if it exists
    if (currentSection) sections.push(currentSection);
  
    return { intro: intro.trim(), sections, outro: outro.trim() };
  }
  

