'use client';

import React, { useState, useEffect } from 'react';
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
  selectUIState,
  selectPromptSettings,
  selectRequiresVariableReplacement,
} from '@/lib/redux/prompt-execution/selectors';
import { buildAPIPayload, type APIPayloadResult } from '@/lib/redux/prompt-execution/utils/api-payload-builder';

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
  const [apiPayload, setApiPayload] = useState<APIPayloadResult | null>(null);
  const [isLoadingPayload, setIsLoadingPayload] = useState(false);

  // Read EVERYTHING from Redux
  const instance = useAppSelector(state => selectInstance(state, runId));
  const currentInput = useAppSelector(state => selectCurrentInput(state, runId));
  const resources = useAppSelector(state => selectResources(state, runId));
  const variables = useAppSelector(state => selectMergedVariables(state, runId));
  const templateMessages = useAppSelector(state => selectTemplateMessages(state, runId));
  const conversationMessages = useAppSelector(state => selectMessages(state, runId));
  const uiState = useAppSelector(state => selectUIState(state, runId));
  const promptSettings = useAppSelector(state => selectPromptSettings(state, runId));
  const requiresVariableReplacement = useAppSelector(state => selectRequiresVariableReplacement(state, runId));

  if (!instance) {
    return null;
  }

  // Determine mode
  const isFirstMessage = requiresVariableReplacement;
  const currentMode = isFirstMessage ? 'Mode 1: Templated First Message' : 'Mode 2: Ongoing Conversation';

  // Auto-load API payload when section is expanded or data changes
  useEffect(() => {
    if (expandedSection === 'api-payload' && !apiPayload) {
      loadAPIPayload();
    }
  }, [expandedSection]);

  // Reload payload when inputs change
  useEffect(() => {
    if (apiPayload) {
      // Debounce reload
      const timer = setTimeout(() => {
        loadAPIPayload();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [currentInput, resources.length, variables]);

  // Build accurate API payload
  const loadAPIPayload = async () => {
    setIsLoadingPayload(true);
    try {
      const payload = await buildAPIPayload({
        requiresVariableReplacement,
        messages: conversationMessages,
        currentInput,
        resources,
        variables,
      });
      setApiPayload(payload);
    } catch (error) {
      console.error('Failed to build API payload:', error);
      setApiPayload({
        messages: [],
        isSimulation: isFirstMessage,
        error: 'Failed to build payload',
      });
    } finally {
      setIsLoadingPayload(false);
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
                <span className="text-gray-600 dark:text-gray-400">Requires Var Replacement:</span>
                <p className="font-medium">{requiresVariableReplacement ? 'Yes' : 'No'}</p>
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
                <p className="font-medium text-xs">{promptSettings?.modelId || 'N/A'}</p>
              </div>
              <div>
                <span className="text-gray-600 dark:text-gray-400">Run Saved to DB:</span>
                <p className="font-medium">{instance.runTracking.savedToDatabase ? 'Yes' : 'No'}</p>
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

          <Section id="conversation" title="Stored Messages (instance.messages)" icon={Database}>
            <div className="space-y-4">
              <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded p-3">
                <p className="text-xs text-blue-800 dark:text-blue-200">
                  <strong>📝 What is this:</strong> These are the messages stored in Redux state (<code>instance.messages</code>).
                </p>
                <p className="text-xs text-blue-800 dark:text-blue-200 mt-2">
                  <strong>Before first execution:</strong> Contains template messages (system, user, assistant) with variables NOT replaced yet.<br />
                  <strong>After first execution:</strong> Templates are processed (variables replaced) and stored here. This becomes the conversation history.<br />
                  <strong>During chat:</strong> New messages are appended here. This is what gets sent to the API (see API Payload section).
                </p>
              </div>
              
              {conversationMessages.length === 0 ? (
                <p className="text-xs text-gray-500">No messages stored (should not happen - check initialization)</p>
              ) : (
                <div className="space-y-3">
                  {conversationMessages.map((msg, idx) => (
                    <div key={idx} className="border border-gray-200 dark:border-gray-700 rounded p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded ${
                          msg.role === 'system' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' :
                          msg.role === 'assistant' 
                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' 
                            : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                        }`}>
                          {msg.role}
                        </span>
                        {msg.timestamp && (
                          <span className="text-xs text-gray-500">{new Date(msg.timestamp).toLocaleString()}</span>
                        )}
                        {!msg.timestamp && requiresVariableReplacement && (
                          <span className="text-xs text-orange-600 dark:text-orange-400 font-medium">
                            (Template - will be processed on first execution)
                          </span>
                        )}
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
                label="Stored Messages (JSON)"
              />
            </div>
          </Section>

          <Section id="user-message" title="Current Input Preview" icon={Eye}>
            <div className="space-y-4">
              <div className="bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-800 rounded p-3">
                <p className="text-xs text-yellow-800 dark:text-yellow-200">
                  <strong>📝 What you're typing:</strong> This shows your current input and attached resources.
                  To see what will ACTUALLY be sent to the API, check the "API Payload" section below.
                </p>
              </div>
              
              <div>
                <h5 className="text-xs font-semibold mb-2">Current Input</h5>
                <CodeBlock 
                  content={currentInput || '(empty)'}
                  label="Current Input Text"
                />
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

          <Section id="api-payload" title="🎯 EXACT API Payload (What Gets Sent)" icon={Eye}>
            <div className="space-y-4">
              <div className="bg-red-50 dark:bg-red-950/30 border-2 border-red-400 dark:border-red-600 rounded p-3">
                <p className="text-xs text-red-900 dark:text-red-200 font-semibold">
                  ⚡ THIS IS THE ACTUAL API PAYLOAD ⚡
                </p>
                <p className="text-xs text-red-800 dark:text-red-200 mt-2">
                  This is built using the EXACT SAME LOGIC as executeMessageThunk.ts.
                  {apiPayload?.isSimulation 
                    ? ' Since you haven\'t sent the message yet, this is a simulation of what WILL be sent.'
                    : ' This shows the exact messages that are currently being sent or will be sent.'
                  }
                </p>
              </div>

              {isLoadingPayload ? (
                <div className="text-center py-8">
                  <div className="inline-block w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">Building accurate payload...</p>
                </div>
              ) : apiPayload?.error ? (
                <div className="bg-red-50 dark:bg-red-950/30 border border-red-300 dark:border-red-700 rounded p-3">
                  <p className="text-xs text-red-800 dark:text-red-200">
                    <strong>Error:</strong> {apiPayload.error}
                  </p>
                </div>
              ) : !apiPayload ? (
                <div className="text-center py-8">
                  <button
                    onClick={loadAPIPayload}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded font-medium"
                  >
                    Load API Payload
                  </button>
                </div>
              ) : (
                <>
                  <div className="space-y-3">
                    {apiPayload.messages.map((msg, idx) => (
                      <div key={idx} className="border-2 border-gray-300 dark:border-gray-600 rounded p-3">
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`text-xs font-bold px-2 py-1 rounded ${
                            msg.role === 'system' ? 'bg-purple-200 text-purple-800 dark:bg-purple-800 dark:text-purple-200' :
                            msg.role === 'assistant' ? 'bg-green-200 text-green-800 dark:bg-green-800 dark:text-green-200' :
                            'bg-blue-200 text-blue-800 dark:bg-blue-800 dark:text-blue-200'
                          }`}>
                            {msg.role.toUpperCase()}
                          </span>
                          <span className="text-xs text-gray-500">Message {idx + 1}/{apiPayload.messages.length}</span>
                        </div>
                        <pre className="text-xs whitespace-pre-wrap break-words bg-white dark:bg-black p-3 rounded border border-gray-200 dark:border-gray-700 max-h-64 overflow-y-auto">
                          {msg.content}
                        </pre>
                      </div>
                    ))}
                  </div>
                  
                  <CodeBlock 
                    content={JSON.stringify(apiPayload.messages, null, 2)}
                    label="Complete API Payload (JSON)"
                  />
                  
                  <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded p-3">
                    <p className="text-xs text-blue-800 dark:text-blue-200">
                      <strong>Total Messages:</strong> {apiPayload.messages.length}<br />
                      <strong>Total Characters:</strong> {JSON.stringify(apiPayload.messages).length.toLocaleString()}<br />
                      <strong>Model:</strong> {promptSettings?.modelId || 'N/A'}<br />
                      <strong>Payload Type:</strong> {apiPayload.isSimulation ? 'Simulation (will be sent)' : 'Actual (sent/sending)'}
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={loadAPIPayload}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded font-medium"
                    >
                      🔄 Refresh Payload
                    </button>
                    <button
                      onClick={() => copyToClipboard(JSON.stringify(apiPayload.messages, null, 2), 'API Payload')}
                      className="px-3 py-1.5 bg-gray-600 hover:bg-gray-700 text-white text-xs rounded font-medium"
                    >
                      {copiedSection === 'API Payload' ? '✓ Copied' : '📋 Copy JSON'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </Section>
        </ScrollArea>
      </Card>
    </div>
  );
};

