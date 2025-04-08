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
    // Top-level task item
    else if (line.match(/^-\s+\[([ x])\]\s+/)) {
      const match = line.match(/^-\s+\[([ x])\]\s+(?:\*\*(.*?)\*\*|(.*))/);
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
    // Indented sub-task
    else if (line.match(/^\s{4}-\s+\[([ x])\]\s+/)) {
      const match = line.match(/^\s{4}-\s+\[([ x])\]\s+(?:\*\*(.*?)\*\*|(.*))/);
      if (match && result.length > 0) {
        const title = (match[2] || match[3] || '').trim();
        const item: TaskItemType = {
          id: `subtask-${index}-${title.replace(/[^a-zA-Z0-9]/g, '-')}`,
          title,
          type: 'subtask',
          bold: !!match[2],
          checked: match[1] === 'x',
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

