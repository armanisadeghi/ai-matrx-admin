import { useState, useEffect } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';

const TaskChecklistShadcn = ({ content, initialState = {}, onStateChange = (state) => {} }) => {
  const [checklist, setChecklist] = useState([]);
  const [checkboxState, setCheckboxState] = useState(initialState);
  
  // Parse the markdown content to extract checklist structure
  useEffect(() => {
    if (!content) return;
    
    const parsedChecklist = parseMarkdownChecklist(content);
    setChecklist(parsedChecklist);
    
    // Initialize any missing state with false (unchecked)
    const newState = { ...checkboxState };
    let stateChanged = false;
    
    const processItems = (items) => {
      items.forEach(item => {
        if (item.id && newState[item.id] === undefined) {
          newState[item.id] = false;
          stateChanged = true;
        }
        
        if (item.children) {
          processItems(item.children);
        }
      });
    };
    
    processItems(parsedChecklist);
    
    if (stateChanged) {
      setCheckboxState(newState);
    }
  }, [content]);
  
  // Notify parent when state changes
  useEffect(() => {
    onStateChange(checkboxState);
  }, [checkboxState, onStateChange]);
  
  // Parse markdown checklist format into structured data
  const parseMarkdownChecklist = (markdownText) => {
    const lines = markdownText.split('\n');
    const result = [];
    let currentSection = null;
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
          const item = {
            id: `task-${index}-${title.replace(/[^a-zA-Z0-9]/g, '-')}`,
            title,
            type: 'task',
            bold: !!match[2],
            checked: match[1] === 'x',
            children: []
          };
          
          if (insideSection && currentSection) {
            currentSection.children.push(item);
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
          const item = {
            id: `subtask-${index}-${title.replace(/[^a-zA-Z0-9]/g, '-')}`,
            title,
            type: 'subtask',
            bold: !!match[2],
            checked: match[1] === 'x',
          };
          
          const lastTopLevelItem = insideSection && currentSection?.children.length > 0
            ? currentSection.children[currentSection.children.length - 1]
            : result[result.length - 1];
            
          if (lastTopLevelItem) {
            lastTopLevelItem.children.push(item);
          }
        }
      }
    });
    
    return result;
  };
  
  // Toggle a checkbox state
  const handleToggle = (id) => {
    setCheckboxState(prevState => {
      const newState = { 
        ...prevState,
        [id]: !prevState[id]
      };
      return newState;
    });
  };
  
  // Calculate completion stats
  const calculateProgress = () => {
    let total = 0;
    let completed = 0;
    
    const countTasks = (items) => {
      items.forEach(item => {
        if (item.type === 'task' || item.type === 'subtask') {
          total++;
          if (checkboxState[item.id]) {
            completed++;
          }
        }
        
        if (item.children && item.children.length > 0) {
          countTasks(item.children);
        }
      });
    };
    
    countTasks(checklist);
    
    return {
      total,
      completed,
      percentage: total > 0 ? Math.round((completed / total) * 100) : 0
    };
  };
  
  // Render a task item with its children
  const renderTaskItem = (item, depth = 0) => {
    const checkboxId = item.id;
    const isChecked = checkboxState[checkboxId] ?? item.checked;
    
    return (
      <div 
        key={checkboxId} 
        className={`mb-2 ${depth > 0 ? 'ml-8' : ''}`}
      >
        <div className="flex items-start gap-3 group">
          <Checkbox
            id={checkboxId}
            checked={isChecked}
            onCheckedChange={() => handleToggle(checkboxId)}
            className="mt-0.5"
          />
          <label 
            htmlFor={checkboxId}
            className={`text-sm cursor-pointer ${
              isChecked 
                ? 'text-muted-foreground line-through' 
                : 'text-foreground'
            } ${item.bold ? 'font-medium' : ''}`}
          >
            {item.title}
          </label>
        </div>
        
        {item.children && item.children.length > 0 && (
          <div className="mt-2 space-y-2">
            {item.children.map(child => renderTaskItem(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };
  
  const progress = calculateProgress();
  
  return (
    <Card className="w-full">
      <CardHeader className="pb-2">
        {checklist.length > 0 && checklist[0].type === 'section' && (
          <CardTitle>{checklist[0].title}</CardTitle>
        )}
        
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            {progress.completed} of {progress.total} tasks completed
          </div>
          <Badge variant="outline" className="ml-auto">
            {progress.percentage}%
          </Badge>
        </div>
        
        <Progress value={progress.percentage} className="h-2" />
      </CardHeader>
      
      <CardContent className="pt-4 space-y-4">
        {checklist.map(item => {
          if (item.type === 'section') {
            return (
              <div key={item.id} className="space-y-3">
                {item.children.map(task => renderTaskItem(task))}
              </div>
            );
          } else {
            return renderTaskItem(item);
          }
        })}
      </CardContent>
    </Card>
  );
};

export default TaskChecklistShadcn;