import { useState, useEffect, useRef } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
  ContextMenuSeparator,
} from '@/components/ui/context-menu';
import { MoreHorizontal, Edit, Trash, Plus, Check, Save, RotateCcw } from 'lucide-react';

// Define TypeScript types for our components and data structures
type CheckboxStateType = Record<string, boolean>;

type TaskItemType = {
  id: string;
  title: string;
  type: 'section' | 'task' | 'subtask';
  bold?: boolean;
  checked?: boolean;
  children?: TaskItemType[];
};

type TaskChecklistProps = {
  content: string;
  initialState?: CheckboxStateType;
  onStateChange?: (state: CheckboxStateType) => void;
  onSave?: (state: CheckboxStateType) => void;
  hideTitle?: boolean;
};

// Main component
const TaskChecklist = ({ 
  content, 
  initialState = {}, 
  onStateChange = (state: CheckboxStateType) => {},
  onSave = (state: CheckboxStateType) => {},
  hideTitle = false
}: TaskChecklistProps) => {
  const [checklist, setChecklist] = useState<TaskItemType[]>([]);
  const [checkboxState, setCheckboxState] = useState<CheckboxStateType>(initialState);
  const [hideCompleted, setHideCompleted] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const initialStateRef = useRef<CheckboxStateType>({});
  const initialChecklistRef = useRef<TaskItemType[]>([]);
  
  // Modal state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskItemType | null>(null);
  const [editValue, setEditValue] = useState('');
  const [editIsSubtask, setEditIsSubtask] = useState(false);
  const [addPosition, setAddPosition] = useState<'above' | 'below' | ''>('');
  const [addToTaskId, setAddToTaskId] = useState('');
  
  // Parse the markdown content to extract checklist structure
  useEffect(() => {
    if (!content) return;
    
    const parsedChecklist = parseMarkdownChecklist(content);
    setChecklist(parsedChecklist);
    initialChecklistRef.current = JSON.parse(JSON.stringify(parsedChecklist));
    
    // Initialize any missing state with false (unchecked)
    const newState = { ...checkboxState };
    let stateChanged = false;
    
    const processItems = (items: TaskItemType[]) => {
      items.forEach(item => {
        if (item.id && newState[item.id] === undefined) {
          newState[item.id] = item.checked || false;
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
      initialStateRef.current = JSON.parse(JSON.stringify(newState));
    } else if (Object.keys(initialStateRef.current).length === 0) {
      initialStateRef.current = JSON.parse(JSON.stringify(newState));
    }
  }, [content]);
  
  // Notify parent when state changes
  useEffect(() => {
    onStateChange(checkboxState);
  }, [checkboxState, onStateChange]);
  
  // Parse markdown checklist format into structured data
  const parseMarkdownChecklist = (markdownText: string): TaskItemType[] => {
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
  
  // Toggle a checkbox state
  const handleToggle = (id: string, isMainTask = false) => {
    setCheckboxState(prevState => {
      const newValue = !prevState[id];
      const newState = { ...prevState, [id]: newValue };
      
      // If this is a main task, update all subtasks
      if (isMainTask && newValue) {
        const updateSubtasksRecursively = (items: TaskItemType[]) => {
          for (const item of items) {
            if (item.id === id && item.children) {
              item.children.forEach(subtask => {
                newState[subtask.id] = true;
              });
              break;
            }
            
            if (item.children) {
              updateSubtasksRecursively(item.children);
            }
          }
        };
        
        updateSubtasksRecursively(checklist);
      }
      
      return newState;
    });
  };
  
  // Edit task functions
  const openEditModal = (task: TaskItemType, isForAdd: boolean = false, position: 'above' | 'below' | '' = '', parentId: string = '') => {
    setEditingTask(task);
    setEditValue(isForAdd ? '' : task.title);
    setEditIsSubtask(task.type === 'subtask');
    setIsEditModalOpen(true);
    setAddPosition(position);
    setAddToTaskId(parentId);
  };
  
  const handleEditSave = () => {
    if (!editingTask || !editValue.trim()) {
      setIsEditModalOpen(false);
      return;
    }
    
    if (addPosition) {
      // Adding a new task
      addNewTask();
    } else {
      // Editing existing task
      updateTask();
    }
    
    setIsEditModalOpen(false);
    setEditingTask(null);
    setEditValue('');
    setAddPosition('');
    setAddToTaskId('');
  };
  
  const updateTask = () => {
    if (!editingTask) return;
    
    const updatedChecklist = [...checklist];
    
    const updateTaskInArray = (items: TaskItemType[]): boolean => {
      for (let i = 0; i < items.length; i++) {
        if (items[i].id === editingTask.id) {
          items[i] = { ...items[i], title: editValue };
          return true;
        }
        
        if (items[i].children) {
          const found = updateTaskInArray(items[i].children!);
          if (found) return true;
        }
      }
      
      return false;
    };
    
    updateTaskInArray(updatedChecklist);
    setChecklist(updatedChecklist);
  };
  
  const addNewTask = () => {
    if (!editingTask || !addPosition) return;
    
    const newTask: TaskItemType = {
      id: `task-${Date.now()}-${editValue.replace(/[^a-zA-Z0-9]/g, '-')}`,
      title: editValue,
      type: editIsSubtask ? 'subtask' : 'task',
      children: editIsSubtask ? undefined : []
    };
    
    const updatedChecklist = [...checklist];
    
    // If adding a subtask
    if (editIsSubtask && addToTaskId) {
      const addSubtaskToParent = (items: TaskItemType[]): boolean => {
        for (let i = 0; i < items.length; i++) {
          if (items[i].id === addToTaskId) {
            if (!items[i].children) items[i].children = [];
            items[i].children.push(newTask);
            return true;
          }
          
          if (items[i].children) {
            const found = addSubtaskToParent(items[i].children!);
            if (found) return true;
          }
        }
        
        return false;
      };
      
      addSubtaskToParent(updatedChecklist);
    } else {
      // Adding a main task
      const addTaskRelativeToTarget = (items: TaskItemType[]): boolean => {
        for (let i = 0; i < items.length; i++) {
          if (items[i].id === editingTask.id) {
            if (addPosition === 'above') {
              items.splice(i, 0, newTask);
            } else if (addPosition === 'below') {
              items.splice(i + 1, 0, newTask);
            }
            return true;
          }
          
          if (items[i].children) {
            const found = addTaskRelativeToTarget(items[i].children!);
            if (found) return true;
          }
        }
        
        return false;
      };
      
      addTaskRelativeToTarget(updatedChecklist);
    }
    
    setChecklist(updatedChecklist);
  };
  
  const deleteTask = (taskId: string) => {
    const updatedChecklist = [...checklist];
    
    const removeTaskFromArray = (items: TaskItemType[]): boolean => {
      for (let i = 0; i < items.length; i++) {
        if (items[i].id === taskId) {
          items.splice(i, 1);
          return true;
        }
        
        if (items[i].children) {
          const found = removeTaskFromArray(items[i].children!);
          if (found) return true;
        }
      }
      
      return false;
    };
    
    removeTaskFromArray(updatedChecklist);
    
    // Also remove from state
    setCheckboxState(prevState => {
      const newState = { ...prevState };
      delete newState[taskId];
      return newState;
    });
    
    setChecklist(updatedChecklist);
  };
  
  // Handle save and reset
  const handleSave = () => {
    onSave(checkboxState);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2000);
  };
  
  const handleReset = () => {
    setCheckboxState(JSON.parse(JSON.stringify(initialStateRef.current)));
    setChecklist(JSON.parse(JSON.stringify(initialChecklistRef.current)));
  };
  
  // Calculate completion stats
  const calculateProgress = () => {
    let totalTasks = 0;
    let completedTasks = 0;
    let totalItems = 0;
    let completedItems = 0;
    
    const countItems = (items: TaskItemType[]) => {
      items.forEach(item => {
        if (item.type === 'task') {
          totalTasks++;
          if (checkboxState[item.id]) {
            completedTasks++;
          }
          
          totalItems++;
          if (checkboxState[item.id]) {
            completedItems++;
          }
        } else if (item.type === 'subtask') {
          totalItems++;
          if (checkboxState[item.id]) {
            completedItems++;
          }
        }
        
        if (item.children) {
          countItems(item.children);
        }
      });
    };
    
    countItems(checklist);
    
    return {
      totalTasks,
      completedTasks,
      totalItems,
      completedItems,
      totalPercentage: totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0,
    };
  };
  
  // Render a task item with its children
  const renderTaskItem = (item: TaskItemType, depth = 0) => {
    const checkboxId = item.id;
    const isChecked = checkboxState[checkboxId] ?? item.checked ?? false;
    const isMainTask = item.type === 'task';
    
    // Skip if hiding completed and this is checked
    if (hideCompleted && isChecked) {
      return null;
    }
    
    // Task actions menu items
    const TaskActionMenuItems = () => (
      <>
        <ContextMenuItem onClick={() => openEditModal(item)}>
          <Edit className="h-4 w-4 mr-2" /> Edit
        </ContextMenuItem>
        <ContextMenuItem onClick={() => deleteTask(item.id)} className="text-destructive focus:text-destructive">
          <Trash className="h-4 w-4 mr-2" /> Delete
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem onClick={() => openEditModal(item, true, 'above')}>
          <Plus className="h-4 w-4 mr-2" /> Add Above
        </ContextMenuItem>
        <ContextMenuItem onClick={() => openEditModal(item, true, 'below')}>
          <Plus className="h-4 w-4 mr-2" /> Add Below
        </ContextMenuItem>
        {isMainTask && (
          <ContextMenuItem onClick={() => {
            const subtaskTemplate: TaskItemType = {
              id: `temp-${Date.now()}`,
              title: '',
              type: 'subtask'
            };
            openEditModal(subtaskTemplate, true, '', item.id);
            setEditIsSubtask(true);
          }}>
            <Plus className="h-4 w-4 mr-2" /> Add Subtask
          </ContextMenuItem>
        )}
      </>
    );
    
    return (
      <ContextMenu key={checkboxId}>
        <ContextMenuTrigger>
          <div className={`mb-2 ${depth > 0 ? 'ml-8' : ''}`}>
            <div className="flex items-start gap-3 group relative">
              <Checkbox
                id={checkboxId}
                checked={isChecked}
                onCheckedChange={() => handleToggle(checkboxId, isMainTask)}
                className="mt-0.5 transition-colors hover:border-primary/80"
              />
              <label 
                htmlFor={checkboxId}
                className={`text-sm cursor-pointer group-hover:text-primary ${
                  isChecked 
                    ? 'text-muted-foreground line-through' 
                    : 'text-foreground'
                } ${item.bold ? 'font-medium' : ''} transition-colors`}
              >
                {item.title}
              </label>
              
              <div className="ml-auto">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                      <MoreHorizontal className="h-4 w-4" />
                      <span className="sr-only">Actions</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => openEditModal(item)}>
                      <Edit className="h-4 w-4 mr-2" /> Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => deleteTask(item.id)} className="text-destructive focus:text-destructive">
                      <Trash className="h-4 w-4 mr-2" /> Delete
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => openEditModal(item, true, 'above')}>
                      <Plus className="h-4 w-4 mr-2" /> Add Above
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => openEditModal(item, true, 'below')}>
                      <Plus className="h-4 w-4 mr-2" /> Add Below
                    </DropdownMenuItem>
                    {isMainTask && (
                      <DropdownMenuItem onClick={() => {
                        const subtaskTemplate: TaskItemType = {
                          id: `temp-${Date.now()}`,
                          title: '',
                          type: 'subtask'
                        };
                        openEditModal(subtaskTemplate, true, '', item.id);
                        setEditIsSubtask(true);
                      }}>
                        <Plus className="h-4 w-4 mr-2" /> Add Subtask
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
            
            {item.children && item.children.length > 0 && (
              <div className="mt-2 space-y-2">
                {item.children.map(child => renderTaskItem(child, depth + 1))}
              </div>
            )}
          </div>
        </ContextMenuTrigger>
        
        <ContextMenuContent>
          <TaskActionMenuItems />
        </ContextMenuContent>
      </ContextMenu>
    );
  };
  
  const progress = calculateProgress();
  
  return (
    <TooltipProvider>
      <Card className="w-full">
        <CardHeader className="pb-2">
          {!hideTitle && checklist.length > 0 && checklist[0].type === 'section' && (
            <CardTitle>
              <div className="flex justify-between items-center">
                <span>{checklist[0].title}</span>
                <div className="flex items-center space-x-2 text-sm font-normal">
                  <span>Hide completed</span>
                  <Switch 
                    checked={hideCompleted}
                    onCheckedChange={setHideCompleted}
                  />
                </div>
              </div>
            </CardTitle>
          )}
          
          <div className="space-y-4 mt-2">
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                Main tasks: {progress.completedTasks} of {progress.totalTasks}
              </div>
              <div className="text-sm text-muted-foreground">
                All items: {progress.completedItems} of {progress.totalItems} ({progress.totalPercentage}%)
              </div>
            </div>
            
            <Progress value={progress.totalPercentage} className="h-2" />
          </div>
        </CardHeader>
        
        <CardContent className="pt-4 space-y-4 relative">
          {checklist.map(item => {
            if (item.type === 'section') {
              return (
                <div key={item.id} className="space-y-3">
                  {item.children?.map(task => renderTaskItem(task))}
                </div>
              );
            } else {
              return renderTaskItem(item);
            }
          })}
          
          {/* Bottom right save/reset buttons */}
          <div className="absolute bottom-4 right-4 flex space-x-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={handleReset}
                  className="flex items-center"
                >
                  <RotateCcw className="h-3.5 w-3.5 mr-1" /> Reset
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                Reset to initial state
              </TooltipContent>
            </Tooltip>
            
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  size="sm" 
                  onClick={handleSave} 
                  className="flex items-center"
                  variant={saveSuccess ? "outline" : "default"}
                >
                  {saveSuccess ? (
                    <>
                      <Check className="h-3.5 w-3.5 mr-1" /> Saved
                    </>
                  ) : (
                    <>
                      <Save className="h-3.5 w-3.5 mr-1" /> Save
                    </>
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                Save current state
              </TooltipContent>
            </Tooltip>
          </div>
        </CardContent>
      </Card>
      
      {/* Edit/Add Task Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {addPosition ? 'Add New Task' : 'Edit Task'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="task-title">Task title</Label>
              <Input
                id="task-title"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                placeholder="Enter task title"
                autoFocus
              />
            </div>
            
            {addPosition && (
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="is-subtask"
                  checked={editIsSubtask}
                  onCheckedChange={(checked) => setEditIsSubtask(checked === true)}
                />
                <label
                  htmlFor="is-subtask"
                  className="text-sm cursor-pointer"
                >
                  {addToTaskId ? 'Add as subtask' : 'Create as subtask'}
                </label>
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEditSave}>
              <Check className="h-4 w-4 mr-2" />
              {addPosition ? 'Add' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
};

export default TaskChecklist;