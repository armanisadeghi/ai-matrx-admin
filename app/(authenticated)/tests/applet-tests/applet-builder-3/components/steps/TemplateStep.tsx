// components/steps/TemplateStep.tsx
import { FileSpreadsheet, FileText, LayoutDashboard } from 'lucide-react';
import { Card } from '../common';
import { StepHeader } from '../common';
import { useAppletStore } from '../../hooks/useAppletState';

const TEMPLATES = [
  {
    id: 'project',
    name: 'Project Management',
    description: 'Track tasks, deadlines, and team assignments',
    icon: <LayoutDashboard className="h-5 w-5 text-blue-600 dark:text-blue-400" />
  },
  {
    id: 'data',
    name: 'Data Management',
    description: 'Organize and analyze structured data',
    icon: <FileSpreadsheet className="h-5 w-5 text-green-600 dark:text-green-400" />
  },
  {
    id: 'collab',
    name: 'Collaboration Hub',
    description: 'Create shared workspaces for your team',
    icon: <FileText className="h-5 w-5 text-purple-600 dark:text-purple-400" />
  }
] as const;

export function TemplateStep() {
  const { selectedTemplate, setTemplate } = useAppletStore();

  return (
    <div className="space-y-8">
      <StepHeader
        title="Choose a template"
        description="Start with a template or build from scratch"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {TEMPLATES.map((template) => (
          <Card
            key={template.id}
            onClick={() => setTemplate(template.id)}
            className={`${
              selectedTemplate === template.id
                ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-950/50'
                : 'border-gray-200 dark:border-gray-700'
            }`}
          >
            <div className="flex items-start space-x-3">
              <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
                {template.icon}
              </div>
              <div>
                <h3 className="font-medium text-gray-900 dark:text-white">
                  {template.name}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {template.description}
                </p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="pt-8 border-t border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
          Or, start with your data
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="border-gray-200 dark:border-gray-700 hover:border-blue-400 dark:hover:border-blue-400">
            <div className="flex items-start space-x-3">
              <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
                <FileSpreadsheet className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white">
                  Import spreadsheets
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Turn CSV, Excel, and Google Sheets into a powerful app
                </p>
              </div>
            </div>
          </Card>

          <Card className="border-gray-200 dark:border-gray-700 hover:border-blue-400 dark:hover:border-blue-400">
            <div className="flex items-start space-x-3">
              <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
                <FileText className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white">
                  Import documents
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Turn contracts, presentations, and other docs into structured data
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

