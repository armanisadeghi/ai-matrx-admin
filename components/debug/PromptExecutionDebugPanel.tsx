'use client';

import React, { useState } from 'react';
import { X, ChevronDown, ChevronRight, Copy, Check, Eye, Database } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAppSelector } from '@/lib/redux/hooks';
import {
  selectInstance,
  selectCurrentInput,
  selectResources,
  selectMergedVariables,
  selectTemplateMessages,
  selectMessages,
  selectSystemMessage,
  selectConversationTemplate,
  selectUIState,
  selectModelConfig,
} from '@/lib/redux/prompt-execution/selectors';
import { replaceVariablesInText } from '@/features/prompts/utils/variable-resolver';
import { buildFinalMessage } from '@/lib/redux/prompt-execution/utils/message-builder';

interface PromptExecutionDebugPanelProps {
  runId: string;
  onClose: () => void;
}

type Section = 'overview' | 'template' | 'conversation' | 'user-message' | 'state' | 'api-payload';

export const PromptExecutionDebugPanel: React.FC<PromptExecutionDebugPanelProps> = ({
  runId,
  onClose,
}) => {
  const [expandedSection, setExpandedSection] = useState<Section>('overview');
  const [copiedSection, setCopiedSection] = useState<string | null>(null);
  const [userMessagePreview, setUserMessagePreview] = useState<string>('');
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);

  // Read EVERYTHING from Redux
  const instance = useAppSelector(state => selectInstance(state, runId));
  const currentInput = useAppSelector(state => selectCurrentInput(state, runId));
  const resources = useAppSelector(state => selectResources(state, runId));
  const variables = useAppSelector(state => selectMergedVariables(state, runId));
  const templateMessages = useAppSelector(state => selectTemplateMessages(state, runId));
  const conversationMessages = useAppSelector(state => selectMessages(state, runId));
  const systemMessage = useAppSelector(state => selectSystemMessage(state, runId));
  const conversationTemplate = useAppSelector(state => selectConversationTemplate(state, runId));
  const uiState = useAppSelector(state => selectUIState(state, runId));
  const modelConfig = useAppSelector(state => selectModelConfig(state, runId));

  if (!instance) {
    return null;
  }

  // Determine mode
  const isFirstMessage = conversationMessages.length === 0;
  const lastTemplateMessage = conversationTemplate[conversationTemplate.length - 1];
  const isLastTemplateMessageUser = lastTemplateMessage?.role === 'user';
  const currentMode = isFirstMessage ? 'Mode 1: Templated First Message' : 'Mode 2: Ongoing Conversation';

  // Build what would be sent to API (simulated)
  const buildAPIPayload = () => {
    const systemWithVars = replaceVariablesInText(systemMessage, variables);
    
    if (isFirstMessage && isLastTemplateMessageUser) {
      // Mode 1: Replace last template message
      const templatesWithoutLast = conversationTemplate.slice(0, -1).map(msg => ({
        role: msg.role,
        content: replaceVariablesInText(msg.content, variables),
      }));
      
      return [
        { role: 'system', content: systemWithVars },
        ...templatesWithoutLast,
        { role: 'user', content: '[WOULD BE BUILT FROM: template + input + resources]' },
      ];
    } else if (isFirstMessage) {
      // Mode 1: Append to templates
      const templatesWithVars = conversationTemplate.map(msg => ({
        role: msg.role,
        content: replaceVariablesInText(msg.content, variables),
      }));
      
      return [
        { role: 'system', content: systemWithVars },
        ...templatesWithVars,
        { role: 'user', content: '[WOULD BE BUILT FROM: input + resources]' },
      ];
    } else {
      // Mode 2: Use conversation history
      return [
        { role: 'system', content: systemWithVars },
        ...conversationMessages.map(m => ({
          role: m.role,
          content: m.content,
        })),
      ];
    }
  };

  const apiPayload = buildAPIPayload();

  // Build current user message preview
  const buildUserMessagePreview = async () => {
    if (!currentInput.trim() && resources.length === 0) {
      return '(No input or resources)';
    }
    
    setIsLoadingPreview(true);
    try {
      const result = await buildFinalMessage({
        isFirstMessage,
        isLastTemplateMessageUser,
        lastTemplateMessage,
        userInput: currentInput,
        resources,
        variables,
      });
      setUserMessagePreview(result.finalContent);
      return result.finalContent;
    } catch (error) {
      console.error('Failed to build preview:', error);
      return 'Error building preview';
    } finally {
      setIsLoadingPreview(false);
    }
  };

  const copyToClipboard = async (content: string, section: string) => {
    await navigator.clipboard.writeText(content);
    setCopiedSection(section);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  const Section = ({ 
    id, 
    title, 
    icon: Icon,
    children 
  }: { 
    id: Section; 
    title: string; 
    icon: any;
    children: React.ReactNode 
  }) => {
    const isExpanded = expandedSection === id;
    
    return (
      <div className="border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={() => setExpandedSection(isExpanded ? 'overview' : id)}
          className="w-full flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Icon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span className="font-semibold text-sm">{title}</span>
          </div>
          {isExpanded ? (
            <ChevronDown className="w-4 h-4" />
          ) : (
            <ChevronRight className="w-4 h-4" />
          )}
        </button>
        
        {isExpanded && (
          <div className="p-4 bg-gray-50 dark:bg-zinc-900">
            {children}
          </div>
        )}
      </div>
    );
  };

  const CodeBlock = ({ content, label }: { content: string; label: string }) => (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-gray-600 dark:text-gray-400">{label}</span>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 px-2"
          onClick={() => copyToClipboard(content, label)}
        >
          {copiedSection === label ? (
            <>
              <Check className="w-3 h-3 mr-1 text-green-500" />
              <span className="text-xs">Copied</span>
            </>
          ) : (
            <>
              <Copy className="w-3 h-3 mr-1" />
              <span className="text-xs">Copy</span>
            </>
          )}
        </Button>
      </div>
      <pre className="text-xs bg-white dark:bg-black p-3 rounded border border-gray-200 dark:border-gray-800 overflow-x-auto">
        <code className="whitespace-pre-wrap break-words font-mono">{content}</code>
      </pre>
    </div>
  );

  return (
    <div
      style={{
        position: 'fixed',
        right: '20px',
        top: '80px',
        bottom: '20px',
        width: '600px',
        zIndex: 9998,
      }}
    >
      <Card className="h-full shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-blue-600 to-blue-700 text-white">
          <div className="flex items-center gap-2">
            <Database className="w-5 h-5" />
            <div>
              <h3 className="font-bold">Prompt Execution State</h3>
              <p className="text-xs opacity-90">{currentMode}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-white/20 transition-colors"
            title="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <ScrollArea className="flex-1">
          {/* Overview Section (Always Visible) */}
          <div className="p-4 bg-blue-50 dark:bg-blue-950/30 border-b border-blue-200 dark:border-blue-800">
            <h4 className="text-sm font-semibold mb-3 text-blue-900 dark:text-blue-100">Current State</h4>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-gray-600 dark:text-gray-400">Mode:</span>
                <p className="font-medium">{isFirstMessage ? 'Mode 1 (First)' : 'Mode 2 (Chat)'}</p>
              </div>
              <div>
                <span className="text-gray-600 dark:text-gray-400">Status:</span>
                <p className="font-medium capitalize">{instance.status}</p>
              </div>
              <div>
                <span className="text-gray-600 dark:text-gray-400">Messages:</span>
                <p className="font-medium">{conversationMessages.length} total</p>
              </div>
              <div>
                <span className="text-gray-600 dark:text-gray-400">Resources:</span>
                <p className="font-medium">{resources.length} attached</p>
              </div>
              <div>
                <span className="text-gray-600 dark:text-gray-400">Variables:</span>
                <p className="font-medium">{Object.keys(variables).length} defined</p>
              </div>
              <div>
                <span className="text-gray-600 dark:text-gray-400">Show Variables:</span>
                <p className="font-medium">{uiState.showVariables ? 'Yes' : 'No'}</p>
              </div>
              <div>
                <span className="text-gray-600 dark:text-gray-400">Current Input:</span>
                <p className="font-medium">{currentInput ? `${currentInput.length} chars` : 'Empty'}</p>
              </div>
              <div>
                <span className="text-gray-600 dark:text-gray-400">Model:</span>
                <p className="font-medium text-xs">{modelConfig?.modelId || 'N/A'}</p>
              </div>
            </div>
          </div>

          {/* Expandable Sections */}
          <Section id="template" title="Template Messages" icon={Eye}>
            <div className="space-y-4">
              <p className="text-xs text-gray-600 dark:text-gray-400">
                These are the initial prompt template messages. Used in Mode 1 only.
              </p>
              
              {templateMessages.length === 0 ? (
                <p className="text-xs text-gray-500">No template messages</p>
              ) : (
                <div className="space-y-3">
                  {templateMessages.map((msg, idx) => (
                    <div key={idx} className="border border-gray-200 dark:border-gray-700 rounded p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded ${
                          msg.role === 'system' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' :
                          msg.role === 'assistant' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' :
                          'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                        }`}>
                          {msg.role}
                        </span>
                        {idx === templateMessages.length - 1 && msg.role === 'user' && (
                          <span className="text-xs text-orange-600 dark:text-orange-400 font-medium">
                            (Will be replaced in Mode 1)
                          </span>
                        )}
                      </div>
                      <pre className="text-xs whitespace-pre-wrap break-words bg-white dark:bg-black p-2 rounded">
                        {msg.content}
                      </pre>
                    </div>
                  ))}
                </div>
              )}
              
              <CodeBlock 
                content={JSON.stringify(templateMessages, null, 2)}
                label="Template Messages (JSON)"
              />
            </div>
          </Section>

          <Section id="conversation" title="Conversation History" icon={Database}>
            <div className="space-y-4">
              <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded p-3">
                <p className="text-xs text-blue-800 dark:text-blue-200">
                  <strong>📝 Note:</strong> This shows the conversation messages (user/assistant exchanges). 
                  The <strong>system message is always included</strong> when sent to the API (see API Payload section). 
                  It's not stored here because it doesn't change.
                </p>
              </div>
              
              {/* Always show system message at top for clarity */}
              {systemMessage && (
                <div className="border-2 border-purple-300 dark:border-purple-700 rounded p-3 bg-purple-50 dark:bg-purple-950/30">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-bold px-2 py-1 rounded bg-purple-200 text-purple-800 dark:bg-purple-800 dark:text-purple-200">
                      SYSTEM
                    </span>
                    <span className="text-xs text-purple-700 dark:text-purple-300 font-medium">
                      (Always included in API calls - from template)
                    </span>
                  </div>
                  <pre className="text-xs whitespace-pre-wrap break-words bg-white dark:bg-black p-2 rounded max-h-32 overflow-y-auto">
                    {replaceVariablesInText(systemMessage, variables)}
                  </pre>
                </div>
              )}
              
              {conversationMessages.length === 0 ? (
                <p className="text-xs text-gray-500">No conversation messages yet (Mode 1 - first message not sent)</p>
              ) : (
                <div className="space-y-3">
                  {conversationMessages.map((msg, idx) => (
                    <div key={idx} className="border border-gray-200 dark:border-gray-700 rounded p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded ${
                          msg.role === 'assistant' 
                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' 
                            : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                        }`}>
                          {msg.role}
                        </span>
                        <span className="text-xs text-gray-500">{new Date(msg.timestamp).toLocaleString()}</span>
                      </div>
                      <pre className="text-xs whitespace-pre-wrap break-words bg-white dark:bg-black p-2 rounded max-h-48 overflow-y-auto">
                        {msg.content}
                      </pre>
                    </div>
                  ))}
                </div>
              )}
              
              <CodeBlock 
                content={JSON.stringify(conversationMessages, null, 2)}
                label="Conversation Messages Only (JSON)"
              />
            </div>
          </Section>

          <Section id="user-message" title="Current User Message Preview" icon={Eye}>
            <div className="space-y-4">
              <div className="bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-800 rounded p-3">
                <p className="text-xs text-yellow-800 dark:text-yellow-200">
                  <strong>📝 Preview:</strong> This shows exactly what will be sent when you click Send.
                  {isFirstMessage 
                    ? ' Includes template + your input + resources with variables replaced.'
                    : ' Includes your input + resources (no template in Mode 2).'
                  }
                </p>
              </div>
              
              {!currentInput && resources.length === 0 ? (
                <p className="text-xs text-gray-500">No input or resources yet. Start typing or attach resources to see preview.</p>
              ) : (
                <>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                        Message Preview (Click to generate)
                      </span>
                      <button
                        onClick={buildUserMessagePreview}
                        disabled={isLoadingPreview}
                        className="text-xs px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded disabled:opacity-50"
                      >
                        {isLoadingPreview ? 'Building...' : 'Generate Preview'}
                      </button>
                    </div>
                    
                    {userMessagePreview && (
                      <>
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Final Message</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2"
                            onClick={() => copyToClipboard(userMessagePreview, 'User Message Preview')}
                          >
                            {copiedSection === 'User Message Preview' ? (
                              <>
                                <Check className="w-3 h-3 mr-1 text-green-500" />
                                <span className="text-xs">Copied</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3 mr-1" />
                                <span className="text-xs">Copy</span>
                              </>
                            )}
                          </Button>
                        </div>
                        <div className="border-2 border-blue-300 dark:border-blue-700 rounded p-3 bg-blue-50 dark:bg-blue-950/30">
                          <pre className="text-xs whitespace-pre-wrap break-words font-mono max-h-96 overflow-y-auto">
                            {userMessagePreview}
                          </pre>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div className="bg-muted p-2 rounded">
                            <span className="text-gray-600 dark:text-gray-400">Characters:</span>
                            <p className="font-medium">{userMessagePreview.length}</p>
                          </div>
                          <div className="bg-muted p-2 rounded">
                            <span className="text-gray-600 dark:text-gray-400">Lines:</span>
                            <p className="font-medium">{userMessagePreview.split('\n').length}</p>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                  
                  <div className="pt-3 border-t space-y-2">
                    <h5 className="text-xs font-semibold">Components:</h5>
                    <div className="space-y-1 text-xs">
                      {isFirstMessage && isLastTemplateMessageUser && (
                        <div className="flex items-start gap-2 text-purple-700 dark:text-purple-300">
                          <span className="font-medium">1.</span>
                          <span>Template message from prompt</span>
                        </div>
                      )}
                      {currentInput && (
                        <div className="flex items-start gap-2 text-blue-700 dark:text-blue-300">
                          <span className="font-medium">{isFirstMessage && isLastTemplateMessageUser ? '2' : '1'}.</span>
                          <span>Your input ({currentInput.length} chars)</span>
                        </div>
                      )}
                      {resources.length > 0 && (
                        <div className="flex items-start gap-2 text-green-700 dark:text-green-300">
                          <span className="font-medium">{
                            isFirstMessage && isLastTemplateMessageUser 
                              ? (currentInput ? '3' : '2')
                              : (currentInput ? '2' : '1')
                          }.</span>
                          <span>{resources.length} resource{resources.length !== 1 ? 's' : ''} (formatted as XML)</span>
                        </div>
                      )}
                      {Object.keys(variables).length > 0 && (
                        <div className="flex items-start gap-2 text-orange-700 dark:text-orange-300">
                          <span className="font-medium">+</span>
                          <span>Variables replaced throughout</span>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          </Section>

          <Section id="state" title="Current State Details" icon={Database}>
            <div className="space-y-4">
              <div>
                <h5 className="text-xs font-semibold mb-2">Current Input</h5>
                <CodeBlock 
                  content={currentInput || '(empty)'}
                  label="Current Input Text"
                />
              </div>
              
              <div>
                <h5 className="text-xs font-semibold mb-2">Variables ({Object.keys(variables).length})</h5>
                {Object.keys(variables).length === 0 ? (
                  <p className="text-xs text-gray-500">No variables defined</p>
                ) : (
                  <CodeBlock 
                    content={JSON.stringify(variables, null, 2)}
                    label="Merged Variables"
                  />
                )}
              </div>
              
              <div>
                <h5 className="text-xs font-semibold mb-2">Resources ({resources.length})</h5>
                {resources.length === 0 ? (
                  <p className="text-xs text-gray-500">No resources attached</p>
                ) : (
                  <div className="space-y-2">
                    {resources.map((resource, idx) => (
                      <div key={idx} className="text-xs border border-gray-200 dark:border-gray-700 rounded p-2">
                        <div className="font-medium">{resource.type}</div>
                        <div className="text-gray-500 text-[10px] mt-1">
                          {JSON.stringify(resource.data).substring(0, 100)}...
                        </div>
                      </div>
                    ))}
                    <CodeBlock 
                      content={JSON.stringify(resources, null, 2)}
                      label="Resources (Full JSON)"
                    />
                  </div>
                )}
              </div>
              
              <div>
                <h5 className="text-xs font-semibold mb-2">UI State</h5>
                <CodeBlock 
                  content={JSON.stringify(uiState, null, 2)}
                  label="UI State"
                />
              </div>
            </div>
          </Section>

          <Section id="api-payload" title="API Payload (What LLM Sees)" icon={Eye}>
            <div className="space-y-4">
              <div className="bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-800 rounded p-3">
                <p className="text-xs text-yellow-800 dark:text-yellow-200">
                  <strong>⚠️ Important:</strong> This shows the messages array that will be sent to the API.
                  {isFirstMessage 
                    ? ' In Mode 1, the last user message will be built from: template + current input + resources.'
                    : ' In Mode 2, this is the exact conversation history sent to the model.'
                  }
                </p>
              </div>
              
              <div className="space-y-3">
                {apiPayload.map((msg, idx) => (
                  <div key={idx} className="border-2 border-gray-300 dark:border-gray-600 rounded p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`text-xs font-bold px-2 py-1 rounded ${
                        msg.role === 'system' ? 'bg-purple-200 text-purple-800 dark:bg-purple-800 dark:text-purple-200' :
                        msg.role === 'assistant' ? 'bg-green-200 text-green-800 dark:bg-green-800 dark:text-green-200' :
                        'bg-blue-200 text-blue-800 dark:bg-blue-800 dark:text-blue-200'
                      }`}>
                        {msg.role.toUpperCase()}
                      </span>
                      <span className="text-xs text-gray-500">Message {idx + 1}/{apiPayload.length}</span>
                    </div>
                    <pre className="text-xs whitespace-pre-wrap break-words bg-white dark:bg-black p-3 rounded border border-gray-200 dark:border-gray-700 max-h-64 overflow-y-auto">
                      {msg.content}
                    </pre>
                  </div>
                ))}
              </div>
              
              <CodeBlock 
                content={JSON.stringify(apiPayload, null, 2)}
                label="Complete API Payload (JSON)"
              />
              
              <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded p-3">
                <p className="text-xs text-blue-800 dark:text-blue-200">
                  <strong>Total Messages:</strong> {apiPayload.length}<br />
                  <strong>Total Characters:</strong> {JSON.stringify(apiPayload).length.toLocaleString()}<br />
                  <strong>Model:</strong> {modelConfig?.modelId || 'N/A'}
                </p>
              </div>
            </div>
          </Section>
        </ScrollArea>
      </Card>
    </div>
  );
};

