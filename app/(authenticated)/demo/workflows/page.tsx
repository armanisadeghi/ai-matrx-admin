// app\(authenticated)\demo\workflows\page.tsx
import WorkflowEditor from './components/WorkflowEditor';
import { Button } from '@/components/ui/button';
import { Save, Play, Settings } from 'lucide-react';

// https://claude.ai/chat/8bc76086-87eb-421d-991c-48b6a82bebff - started, still going.
// https://claude.ai/chat/1bf62aa3-6322-4c2a-9a3b-8efa206de2ec - added some nodes. Can continue.


function WorkflowPage() {
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <header className="border-b bg-white dark:bg-gray-800 px-4 py-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-medium">My Workflow</h1>
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" className="flex items-center gap-1">
              <Settings className="h-4 w-4" />
              Settings
            </Button>
            <Button variant="outline" size="sm" className="flex items-center gap-1">
              <Play className="h-4 w-4" />
              Run
            </Button>
            <Button variant="default" size="sm" className="flex items-center gap-1">
              <Save className="h-4 w-4" />
              Save
            </Button>
          </div>
        </div>
      </header>

      {/* Workflow Editor */}
      <div className="flex-1 overflow-hidden">
        <WorkflowEditor />
      </div>
    </div>
  );
}

export default WorkflowPage;