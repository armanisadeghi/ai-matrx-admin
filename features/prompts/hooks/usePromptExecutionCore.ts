"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useAppDispatch, useAppSelector } from '@/lib/redux/hooks';
import { createAndSubmitTask } from '@/lib/redux/socket-io/thunks/submitTaskThunk';
import { selectPrimaryResponseTextByTaskId, selectPrimaryResponseEndedByTaskId } from '@/lib/redux/socket-io/selectors/socket-response-selectors';
import { useAiRun } from '@/features/ai-runs/hooks/useAiRun';
import { generateRunNameFromMessage } from '@/features/ai-runs/utils/name-generator';
import { replaceVariablesInText } from '../utils/variable-resolver';
import { useResourceMessageFormatter } from './useResourceMessageFormatter';
import { v4 as uuidv4 } from 'uuid';
import type { PromptData } from '../types/modal';
import type { PromptMessage, PromptVariable } from '../types/core';
import type { Resource } from '../components/resource-display';

interface UsePromptExecutionOptions {
  promptData: PromptData;
  executionConfig?: {
    auto_run?: boolean;
    allow_chat?: boolean;
    show_variables?: boolean;
    apply_variables?: boolean;
  };
  variables?: Record<string, string>;
  initialMessage?: string;
  initialRunId?: string;
  onExecutionComplete?: (result: { runId: string; response: string; metadata: any }) => void;
}

/**
 * Core hook for prompt execution logic
 * Extracted from PromptRunner to be reusable across all display types
 * Use this hook for UI components that need full state management
 */
export function usePromptExecutionCore({
  promptData,
  executionConfig = {},
  variables: initialVariables = {},
  initialMessage = '',
  initialRunId,
  onExecutionComplete,
}: UsePromptExecutionOptions) {
  const dispatch = useAppDispatch();
  const { formatMessageWithResources } = useResourceMessageFormatter();
  
  const {
    auto_run: autoRun = false,
    allow_chat: allowChat = true,
    show_variables: showVariables = false,
    apply_variables: applyVariables = true,
  } = executionConfig;

  // Extract prompt data
  const templateMessages = promptData?.messages || [];
  const variableDefaultsFromPrompt = promptData?.variableDefaults || [];
  const settings = promptData?.settings || {};
  const modelId = settings.model_id;
  const { model_id, ...modelConfig } = settings;
  
  const systemMessage = templateMessages.find(m => m.role === "system")?.content || "";
  const conversationTemplate = templateMessages.filter(m => m.role !== "system");

  // State management
  const [variableDefaults, setVariableDefaults] = useState<PromptVariable[]>([]);
  const [chatInput, setChatInput] = useState(initialMessage);
  const [resources, setResources] = useState<Resource[]>([]);
  const [conversationMessages, setConversationMessages] = useState<Array<{ 
    role: string; 
    content: string;
    taskId?: string;
    metadata?: any;
  }>>([]);
  const [apiConversationHistory, setApiConversationHistory] = useState<PromptMessage[]>([]);
  const [isExecuting, setIsExecuting] = useState(false);
  const [currentTaskId, setCurrentTaskId] = useState<string | null>(null);
  const [messageStartTime, setMessageStartTime] = useState<number | null>(null);
  const [conversationStarted, setConversationStarted] = useState(false);
  const [hasAutoExecuted, setHasAutoExecuted] = useState(false);
  
  const timeToFirstTokenRef = useRef<number | undefined>(undefined);

  // AI Runs tracking
  const { run, createRun, createTask, updateTask, completeTask, addMessage } = useAiRun(initialRunId);
  const [pendingTaskId, setPendingTaskId] = useState<string | null>(null);
  const updateTaskTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Selectors for streaming
  const streamingText = useAppSelector((state) => 
    currentTaskId ? selectPrimaryResponseTextByTaskId(currentTaskId)(state) : ""
  );
  const isResponseEnded = useAppSelector((state) =>
    currentTaskId ? selectPrimaryResponseEndedByTaskId(currentTaskId)(state) : false
  );

  // Initialize variables
  useEffect(() => {
    if (variableDefaultsFromPrompt.length > 0) {
      const mergedVariables = variableDefaultsFromPrompt.map(v => ({
        ...v,
        defaultValue: initialVariables?.[v.name] || v.defaultValue || ""
      }));
      setVariableDefaults(mergedVariables);
    }
  }, [variableDefaultsFromPrompt, initialVariables]);

  // Variable values map
  const variableValues = useMemo(() => {
    const values: Record<string, string> = {};
    variableDefaults.forEach(({ name, defaultValue }) => {
      values[name] = defaultValue;
    });
    return values;
  }, [variableDefaults]);

  // Helper to replace variables
  const replaceVariables = useCallback((content: string): string => {
    return replaceVariablesInText(content, variableValues);
  }, [variableValues]);

  // Display messages (includes streaming)
  const displayMessages = useMemo(() => {
    if (currentTaskId && streamingText) {
      return [...conversationMessages, { role: "assistant", content: streamingText, taskId: currentTaskId }];
    }
    return conversationMessages;
  }, [conversationMessages, currentTaskId, streamingText]);

  // Handle streaming completion
  useEffect(() => {
    if (currentTaskId && isResponseEnded && isExecuting && messageStartTime && pendingTaskId) {
      const totalTime = Math.round(performance.now() - messageStartTime);
      const tokenCount = Math.round(streamingText.length / 4);
      
      const finalStats = {
        timeToFirstToken: timeToFirstTokenRef.current,
        totalTime,
        tokens: tokenCount
      };
      
      setConversationMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: streamingText,
          taskId: currentTaskId,
          metadata: finalStats
        }
      ]);

      setApiConversationHistory((prev) => [
        ...prev,
        { role: "assistant", content: streamingText }
      ]);
      
      (async () => {
        try {
          await completeTask(pendingTaskId, {
            response_text: streamingText,
            tokens_total: tokenCount,
            time_to_first_token: timeToFirstTokenRef.current,
            total_time: totalTime,
            cost: 0,
          });
          
          if (run) {
            await addMessage({
              role: 'assistant',
              content: streamingText,
              taskId: pendingTaskId,
              timestamp: new Date().toISOString(),
              metadata: { ...finalStats, cost: 0 }
            }, run.id);
          }
          
          if (onExecutionComplete && run) {
            onExecutionComplete({
              runId: run.id,
              response: streamingText,
              metadata: {
                tokens: tokenCount,
                cost: 0,
                timeToFirstToken: timeToFirstTokenRef.current,
                totalTime,
              }
            });
          }
        } catch (err) {
          console.error('Error completing task:', err);
        }
      })();

      setCurrentTaskId(null);
      setIsExecuting(false);
      setMessageStartTime(null);
      setPendingTaskId(null);
      timeToFirstTokenRef.current = undefined;
    }
  }, [isResponseEnded, currentTaskId, isExecuting, messageStartTime, streamingText, pendingTaskId, run, completeTask, addMessage, onExecutionComplete]);

  // Execute message
  const executeMessage = useCallback(async () => {
    if (isExecuting || !promptData) return;

    const isFirstMessage = apiConversationHistory.length === 0;
    let userMessageContent: string;
    let displayUserMessage: string;
    let shouldDisplayUserMessage = true;

    if (isFirstMessage) {
      setConversationStarted(true);
      
      const lastPromptMessage = conversationTemplate.length > 0 ? conversationTemplate[conversationTemplate.length - 1] : null;
      const isLastMessageUser = lastPromptMessage?.role === "user";

      if (!isLastMessageUser && !chatInput.trim()) return;

      if (isLastMessageUser) {
        const lastMessageContent = lastPromptMessage.content;
        const additionalInput = chatInput.trim();
        userMessageContent = additionalInput ? `${lastMessageContent}\n${additionalInput}` : lastMessageContent;
      } else {
        userMessageContent = chatInput;
      }

      displayUserMessage = userMessageContent;
      
      if (autoRun || (applyVariables && !showVariables)) {
        shouldDisplayUserMessage = false;
      }
    } else {
      if (!chatInput.trim()) return;
      userMessageContent = chatInput;
      displayUserMessage = chatInput;
    }

    const { formattedMessage, settingsAttachments, metadata } = await formatMessageWithResources(userMessageContent, resources);
    userMessageContent = formattedMessage;
    displayUserMessage = formattedMessage;

    setChatInput("");
    setResources([]);

    const displayMessageWithReplacedVariables = replaceVariables(displayUserMessage);

    if (shouldDisplayUserMessage) {
      setConversationMessages((prev) => [...prev, { role: "user", content: displayMessageWithReplacedVariables }]);
    }

    setIsExecuting(true);
    setMessageStartTime(performance.now());
    timeToFirstTokenRef.current = undefined;

    try {
      let currentRun = run;
      if (isFirstMessage && !run) {
        const runName = generateRunNameFromMessage(displayUserMessage);
        const variableValues: Record<string, string> = {};
        variableDefaults.forEach(v => {
          variableValues[v.name] = v.defaultValue;
        });
        
        currentRun = await createRun({
          source_type: 'prompt',
          source_id: promptData.id,
          name: runName,
          settings: settings,
          variable_values: variableValues,
        });
      }
      
      let messagesToSend: PromptMessage[];
      const userMessage: PromptMessage = {
        role: "user",
        content: userMessageContent,
        ...(Object.keys(metadata).length > 0 && { metadata })
      };

      if (isFirstMessage) {
        const lastPromptMessage = conversationTemplate.length > 0 ? conversationTemplate[conversationTemplate.length - 1] : null;
        const isLastMessageUser = lastPromptMessage?.role === "user";

        if (isLastMessageUser) {
          const messagesWithoutLast = conversationTemplate.slice(0, -1);
          messagesToSend = [...messagesWithoutLast, userMessage];
        } else {
          messagesToSend = [...conversationTemplate, userMessage];
        }
      } else {
        messagesToSend = [...apiConversationHistory, userMessage];
      }

      const allMessages = [{ role: "system", content: systemMessage }, ...messagesToSend];
      const messagesWithVariablesReplaced = allMessages.map(msg => ({
        ...msg,
        content: replaceVariables(msg.content)
      }));

      setApiConversationHistory((prev) => [...prev, userMessage]);

      const chatConfig: Record<string, any> = {
        model_id: modelId,
        messages: messagesWithVariablesReplaced,
        stream: true,
        ...modelConfig,
      };
      
      const taskId = uuidv4();
      
      if (currentRun) {
        try {
          await createTask({
            task_id: taskId,
            service: 'chat_service',
            task_name: 'direct_chat',
            model_id: modelId,
            request_data: chatConfig,
          }, currentRun.id);
          
          setPendingTaskId(taskId);
          
          await addMessage({
            role: 'user',
            content: displayMessageWithReplacedVariables,
            timestamp: new Date().toISOString(),
          }, currentRun.id);
        } catch (err) {
          console.error('Error creating task or adding message:', err);
        }
      }

      const result = await dispatch(createAndSubmitTask({
        service: "chat_service",
        taskName: "direct_chat",
        taskData: {
          chat_config: chatConfig
        },
        customTaskId: taskId,
      })).unwrap();

      setCurrentTaskId(result.taskId);
      
    } catch (error) {
      console.error("Error executing prompt:", error);
      setConversationMessages((prev) => [...prev, { role: "assistant", content: "Error: Failed to get response from AI" }]);
      setIsExecuting(false);
      setCurrentTaskId(null);
      setMessageStartTime(null);
      timeToFirstTokenRef.current = undefined;
    }
  }, [isExecuting, promptData, apiConversationHistory, chatInput, resources, conversationTemplate, autoRun, applyVariables, showVariables, replaceVariables, formatMessageWithResources, run, createRun, createTask, addMessage, dispatch, variableDefaults, settings, modelId, modelConfig, systemMessage]);

  // Auto-execute
  useEffect(() => {
    if (autoRun && !hasAutoExecuted && promptData && variableDefaults.length > 0) {
      const allVariablesFilled = variableDefaults.every(v => v.defaultValue);
      if (allVariablesFilled) {
        setHasAutoExecuted(true);
        setConversationStarted(true);
        setTimeout(() => executeMessage(), 100);
      }
    }
  }, [autoRun, hasAutoExecuted, promptData, variableDefaults, executeMessage]);

  const handleVariableChange = useCallback((variableName: string, value: string) => {
    setVariableDefaults((prev) => 
      prev.map(v => v.name === variableName ? { ...v, defaultValue: value } : v)
    );
  }, []);

  return {
    // State
    variableDefaults,
    chatInput,
    resources,
    displayMessages,
    conversationStarted,
    isExecuting,
    streamingText,
    currentTaskId,
    
    // Actions
    setChatInput,
    setResources,
    executeMessage,
    handleVariableChange,
    
    // Computed
    shouldShowVariables: !conversationStarted && showVariables,
    shouldShowInput: !(autoRun && !allowChat && conversationStarted),
  };
}
