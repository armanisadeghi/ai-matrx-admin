"use client";

import { useState, useEffect, useCallback } from "react";
import { aiRunsService } from "../services/ai-runs-service";
import { aiTasksService } from "../services/ai-tasks-service";
import type {
  AiRun,
  AiTask,
  CreateAiRunInput,
  UpdateAiRunInput,
  CreateTaskInput,
  UpdateAiTaskInput,
  CompleteAiTaskInput,
  RunMessage,
  UseAiRunReturn,
} from "../types";

/**
 * Main hook for managing AI runs and their tasks
 * 
 * Usage:
 * ```tsx
 * const { run, createRun, createTask, updateTask, completeTask } = useAiRun(runId);
 * ```
 */
export function useAiRun(initialRunId?: string): UseAiRunReturn {
  const [runId, setRunId] = useState<string | undefined>(initialRunId);
  const [run, setRun] = useState<AiRun | null>(null);
  const [tasks, setTasks] = useState<AiTask[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Load run and tasks
  const loadRun = useCallback(async (id: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const data = await aiRunsService.getWithTasks(id);
      
      if (data) {
        setRun(data);
        setTasks(data.tasks);
      } else {
        setRun(null);
        setTasks([]);
        setError(new Error('Run not found'));
      }
    } catch (err) {
      setError(err as Error);
      setRun(null);
      setTasks([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load run when runId changes
  useEffect(() => {
    if (runId) {
      loadRun(runId);
    } else {
      setRun(null);
      setTasks([]);
    }
  }, [runId, loadRun]);

  // Create a new run
  const createRun = useCallback(async (input: CreateAiRunInput): Promise<AiRun> => {
    setIsSaving(true);
    setError(null);
    
    try {
      const newRun = await aiRunsService.create(input);
      setRun(newRun);
      setRunId(newRun.id);
      setTasks([]);
      return newRun;
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setIsSaving(false);
    }
  }, []);

  // Update run
  const updateRun = useCallback(async (input: UpdateAiRunInput): Promise<AiRun> => {
    if (!runId) throw new Error('No run ID set');
    
    setIsSaving(true);
    setError(null);
    
    try {
      const updated = await aiRunsService.update(runId, input);
      setRun(updated);
      return updated;
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setIsSaving(false);
    }
  }, [runId]);

  // Delete run
  const deleteRun = useCallback(async (): Promise<void> => {
    if (!runId) throw new Error('No run ID set');
    
    setIsSaving(true);
    setError(null);
    
    try {
      await aiRunsService.delete(runId);
      setRun(null);
      setTasks([]);
      setRunId(undefined);
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setIsSaving(false);
    }
  }, [runId]);

  // Toggle star
  const toggleStar = useCallback(async (): Promise<void> => {
    if (!runId) throw new Error('No run ID set');
    
    try {
      const updated = await aiRunsService.toggleStar(runId);
      setRun(updated);
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  }, [runId]);

  // Add message to run
  const addMessage = useCallback(async (message: RunMessage, overrideRunId?: string): Promise<AiRun> => {
    const effectiveRunId = overrideRunId || runId;
    if (!effectiveRunId) throw new Error('No run ID set');
    
    try {
      const updated = await aiRunsService.addMessage(effectiveRunId, message);
      setRun(updated);
      return updated;
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  }, [runId]);

  // Create task (run_id is added automatically)
  const createTask = useCallback(async (input: CreateTaskInput, overrideRunId?: string): Promise<AiTask> => {
    const effectiveRunId = overrideRunId || runId;
    if (!effectiveRunId) throw new Error('No run ID set');
    
    try {
      const task = await aiTasksService.create({
        ...input,
        run_id: effectiveRunId,
      });
      
      // Add to local tasks array
      setTasks(prev => [...prev, task]);
      
      return task;
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  }, [runId]);

  // Update task
  const updateTask = useCallback(async (
    taskId: string, 
    input: UpdateAiTaskInput
  ): Promise<AiTask> => {
    try {
      const updated = await aiTasksService.update(taskId, input);
      
      // Update in local tasks array
      setTasks(prev => prev.map(t => 
        t.task_id === taskId ? updated : t
      ));
      
      return updated;
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  }, []);

  // Complete task
  const completeTask = useCallback(async (
    taskId: string, 
    input: CompleteAiTaskInput
  ): Promise<AiTask> => {
    try {
      const completed = await aiTasksService.complete(taskId, input);
      
      // Update in local tasks array
      setTasks(prev => prev.map(t => 
        t.task_id === taskId ? completed : t
      ));
      
      // Reload run to get updated aggregates
      if (runId) {
        const updatedRun = await aiRunsService.get(runId);
        if (updatedRun) setRun(updatedRun);
      }
      
      return completed;
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  }, [runId]);

  return {
    run,
    tasks,
    isLoading,
    isSaving,
    error,
    
    // Run actions
    createRun,
    updateRun,
    deleteRun,
    toggleStar,
    addMessage,
    
    // Task actions
    createTask,
    updateTask,
    completeTask,
  };
}

