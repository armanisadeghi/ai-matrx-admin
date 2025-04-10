import { TaskItemType } from "./TaskChecklist";

// Parse markdown checklist format into structured data
export const parseMarkdownChecklist = (markdownText: string): TaskItemType[] => {
  const lines = markdownText.split('\n');
  const result: TaskItemType[] = [];
  let currentSection: TaskItemType | null = null;
  let insideSection = false;
  
  lines.forEach((line, index) => {
    // Section header (##)
    if (line.startsWith('##')) {
      insideSection = true;
      currentSection = {
        id: `section-${index}`,
        title: line.replace(/^##\s+/, '').trim(),
        type: 'section',
        children: []
      };
      result.push(currentSection);
    } 
    // Top-level task item (- or * followed by checkbox)
    else if (line.match(/^[-*]\s+\[([ x])\]\s+/)) {
      const match = line.match(/^[-*]\s+\[([ x])\]\s+(?:\*\*(.*?)\*\*|(.*))/);
      if (match) {
        const title = (match[2] || match[3] || '').trim();
        const item: TaskItemType = {
          id: `task-${index}-${title.replace(/[^a-zA-Z0-9]/g, '-')}`,
          title,
          type: 'task',
          bold: !!match[2],
          checked: match[1] === 'x',
          children: []
        };
        
        if (insideSection && currentSection) {
          currentSection.children?.push(item);
        } else {
          result.push(item);
        }
      }
    } 
    // Indented sub-task (2+ spaces with - [ ] OR indented * [ ] OR 2+ spaces [ ])
    else if (line.match(/^(?:\s{2,}-\s+\[([ x])\]|\s*\*\s+\[([ x])\]|\s{2,}\[([ x])\])\s+/)) {
      const match = line.match(/^(?:\s{2,}-\s+\[([ x])\]|\s*\*\s+\[([ x])\]|\s{2,}\[([ x])\])\s+(?:\*\*(.*?)\*\*|(.*))/);
      if (match && result.length > 0) {
        // match[1], match[2], match[3] are for the three checkbox patterns respectively
        const checked = match[1] === 'x' || match[2] === 'x' || match[3] === 'x';
        // match[4] is bold text, match[5] is regular text (shifted due to multiple patterns)
        const title = (match[4] || match[5] || '').trim();
        const item: TaskItemType = {
          id: `subtask-${index}-${title.replace(/[^a-zA-Z0-9]/g, '-')}`,
          title,
          type: 'subtask',
          bold: !!match[4],
          checked,
        };
        
        const lastTopLevelItem = insideSection && currentSection?.children && currentSection.children.length > 0
          ? currentSection.children[currentSection.children.length - 1]
          : result[result.length - 1];
          
        if (lastTopLevelItem && lastTopLevelItem.children) {
          lastTopLevelItem.children.push(item);
        } else if (lastTopLevelItem) {
          lastTopLevelItem.children = [item];
        }
      }
    }
  });
  
  return result;
};