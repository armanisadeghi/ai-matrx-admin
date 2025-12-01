/**
 * Matrx Actions Demo
 * 
 * Demonstrates the new hierarchical Matrx Actions system
 */

"use client";

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TextSelectionMatrxMenu } from '../components/MatrxActionsContextMenu';
import { ActionResultModal } from '../components/ActionResultModal';
import { ActionConversationModal } from '../components/ActionConversationModal';
import { useActionExecution } from '../hooks/useActionExecution';
import { AlertCircle, Info, Loader2 } from 'lucide-react';
import { 
  SYSTEM_ACTIONS, 
  SYSTEM_MENU_ITEMS, 
  buildContextMenu,
  CATEGORY_INFO 
} from '../index';

const sampleContent = `
Artificial Intelligence and Machine Learning

Artificial Intelligence (AI) has transformed the way we interact with technology. 
From voice assistants to autonomous vehicles, AI systems are becoming increasingly 
sophisticated and integrated into our daily lives.

Machine learning, a subset of AI, enables computers to learn from data without being 
explicitly programmed. These systems can identify patterns, make decisions, and improve 
their performance over time. Deep learning, using neural networks with multiple layers, 
has led to breakthroughs in image recognition, natural language processing, and game playing.

Key Benefits:
• Automation of repetitive tasks
• Enhanced decision-making with data analysis
• Personalized user experiences
• Improved efficiency and productivity

Challenges:
• Ethical considerations around bias and fairness
• Privacy concerns with data collection
• Need for transparency in AI decision-making
• Job displacement and workforce adaptation

The future of AI development will likely focus on making these systems more transparent, 
reliable, and beneficial for everyone. As we continue to advance this technology, it's 
crucial to consider its societal impact and ensure responsible development practices.
`;

export function MatrxActionsDemo() {
  const [lastAction, setLastAction] = React.useState<{ id: string; context: any } | null>(null);
  const { executeAction, isExecuting, streamingText, result, clearResult } = useActionExecution();

  // Build menu to show statistics
  const menuStructure = buildContextMenu();
  const totalActions = SYSTEM_ACTIONS.length;
  const totalMenuItems = SYSTEM_MENU_ITEMS.length;
  const categories = menuStructure.length;

  const handleActionTrigger = (actionId: string, context: any) => {
    setLastAction({ id: actionId, context });
    console.log('Action triggered:', actionId, context);
    
    // Execute the action for real!
    executeAction(actionId, context);
  };

  return (
    <div className="space-y-6">
      {/* Info Card */}
      <Card className="border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/30">
        <CardHeader>
          <CardTitle className="text-blue-900 dark:text-blue-100 flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            Matrx Actions System Demo
          </CardTitle>
          <CardDescription className="text-blue-800 dark:text-blue-200">
            Demonstrating hierarchical action menus with separation of concerns
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-3 bg-white dark:bg-blue-900/30 rounded-lg border border-blue-200 dark:border-blue-700">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {totalActions}
              </div>
              <div className="text-sm text-blue-800 dark:text-blue-200">
                System Actions
              </div>
            </div>
            <div className="p-3 bg-white dark:bg-blue-900/30 rounded-lg border border-blue-200 dark:border-blue-700">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {totalMenuItems}
              </div>
              <div className="text-sm text-blue-800 dark:text-blue-200">
                Menu Items
              </div>
            </div>
            <div className="p-3 bg-white dark:bg-blue-900/30 rounded-lg border border-blue-200 dark:border-blue-700">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {categories}
              </div>
              <div className="text-sm text-blue-800 dark:text-blue-200">
                Categories
              </div>
            </div>
          </div>

          <div className="p-3 bg-white dark:bg-blue-900/30 rounded-lg border border-blue-200 dark:border-blue-700">
            <div className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-2">
              Available Categories:
            </div>
            <div className="flex flex-wrap gap-2">
              {menuStructure.map(category => (
                <Badge 
                  key={category.category} 
                  variant="outline"
                  className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 border-blue-300 dark:border-blue-700"
                >
                  {category.label} ({category.items.length + (category.subcategories?.reduce((acc, sub) => acc + sub.items.length, 0) || 0)} items)
                </Badge>
              ))}
            </div>
          </div>

          <div className="flex items-start gap-2 p-3 bg-white dark:bg-blue-900/30 rounded-lg border border-blue-200 dark:border-blue-700">
            <Info className="h-4 w-4 mt-0.5 flex-shrink-0 text-blue-600 dark:text-blue-400" />
            <div className="text-sm text-blue-900 dark:text-blue-100">
              <strong>Try it:</strong> Right-click on the text below (with or without selecting) to see the hierarchical menu.
              Notice how standalone actions appear at the top level, and grouped actions are in submenus.
              <span className="block mt-2 font-semibold text-green-700 dark:text-green-400">
                🎉 The Persian translation action is now LIVE! Select text and try "Translation → Persian"
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Interactive Demo Area */}
      <Card>
        <CardHeader>
          <CardTitle>Interactive Demo</CardTitle>
          <CardDescription>
            Right-click anywhere on the content below to see the Matrx Actions menu
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TextSelectionMatrxMenu onActionTrigger={handleActionTrigger}>
            <div className="p-6 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 min-h-[400px]">
              <div className="prose dark:prose-invert max-w-none">
                <div className="whitespace-pre-line text-sm leading-relaxed select-text">
                  {sampleContent}
                </div>
              </div>
            </div>
          </TextSelectionMatrxMenu>
        </CardContent>
      </Card>

      {/* Note: Execution status removed - streaming happens directly in the modal */}

      {/* Last Action Triggered */}
      {lastAction && !isExecuting && (
        <Card className="border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/30">
          <CardHeader>
            <CardTitle className="text-green-900 dark:text-green-100 text-lg">
              Last Action Triggered
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="p-3 bg-white dark:bg-green-900/30 rounded-lg border border-green-200 dark:border-green-700">
              <div className="text-sm">
                <div className="font-semibold text-green-900 dark:text-green-100 mb-1">
                  Action ID:
                </div>
                <code className="text-xs bg-green-100 dark:bg-green-900 px-2 py-1 rounded text-green-800 dark:text-green-200">
                  {lastAction.id}
                </code>
              </div>
            </div>
            {lastAction.context.selectedText && (
              <div className="p-3 bg-white dark:bg-green-900/30 rounded-lg border border-green-200 dark:border-green-700">
                <div className="text-sm">
                  <div className="font-semibold text-green-900 dark:text-green-100 mb-1">
                    Selected Text ({lastAction.context.selectedText.length} characters):
                  </div>
                  <div className="text-xs text-green-800 dark:text-green-200 bg-green-100 dark:bg-green-900 p-2 rounded max-h-32 overflow-y-auto">
                    "{lastAction.context.selectedText}"
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Technical Details */}
      <Card>
        <CardHeader>
          <CardTitle>How It Works</CardTitle>
          <CardDescription>
            Understanding the separation of concerns
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="p-4 bg-purple-50 dark:bg-purple-950/30 rounded-lg border border-purple-200 dark:border-purple-800">
              <div className="font-semibold text-purple-900 dark:text-purple-100 mb-2">
                1. Actions (WHAT)
              </div>
              <div className="text-sm text-purple-800 dark:text-purple-200 space-y-1">
                <div>• Define what the action does</div>
                <div>• Store execution configuration</div>
                <div>• Map variables to context sources</div>
                <div>• Reference prompts/tools/workflows</div>
                <div className="pt-2 text-xs italic">
                  See: <code>features/matrx-actions/constants/system-actions.ts</code>
                </div>
              </div>
            </div>

            <div className="p-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
              <div className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
                2. Menu Items (WHERE)
              </div>
              <div className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                <div>• Define where actions appear</div>
                <div>• Set context requirements</div>
                <div>• Override display properties</div>
                <div>• Control visibility and order</div>
                <div className="pt-2 text-xs italic">
                  See: <code>features/matrx-actions/constants/system-menu-items.ts</code>
                </div>
              </div>
            </div>
          </div>

          <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="font-semibold mb-2">Benefits of This Architecture:</div>
            <div className="grid gap-2 text-sm">
              <div className="flex items-start gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500 mt-1.5" />
                <div><strong>Reusability:</strong> One action can appear in multiple menus with different configurations</div>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500 mt-1.5" />
                <div><strong>Flexibility:</strong> Easy to reorganize menus without touching action definitions</div>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500 mt-1.5" />
                <div><strong>Maintainability:</strong> Clean separation makes it easier to manage and extend</div>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500 mt-1.5" />
                <div><strong>User Customization:</strong> Users can create custom menu layouts using existing actions</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Result Modal - Single-turn or Multi-turn based on action type */}
      {result && result.resultType === 'multi-turn' ? (
        <ActionConversationModal
          isOpen={!!result}
          onClose={clearResult}
          title={`${result.actionName} Conversation`}
          actionName={result.actionName}
          taskId={result.taskId}
          initialPromptConfig={result.promptConfig}
        />
      ) : result && (
        <ActionResultModal
          isOpen={!!result}
          onClose={clearResult}
          title={`${result.actionName} Result`}
          actionName={result.actionName}
          taskId={result.taskId}
        />
      )}
    </div>
  );
}

