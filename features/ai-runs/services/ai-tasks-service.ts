import { createClient } from "@/utils/supabase/client";
import type {
  AiTask,
  CreateAiTaskInput,
  UpdateAiTaskInput,
  CompleteAiTaskInput,
} from "../types";

/**
 * AI Tasks Service - Client-side CRUD operations for ai_tasks table
 * 
 * This service provides all operations needed to manage individual AI tasks.
 * Each task represents a single request/response cycle in a conversation.
 * Task IDs must match socket.io task IDs for proper tracking.
 */

export const aiTasksService = {
  /**
   * Create a new task (before submitting to socket.io)
   */
  async create(input: CreateAiTaskInput): Promise<AiTask> {
    const supabase = createClient();
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated");

    const { data, error } = await supabase
      .from("ai_tasks")
      .insert({
        user_id: user.id,
        run_id: input.run_id,
        task_id: input.task_id, // Must match socket.io taskId
        service: input.service,
        task_name: input.task_name,
        provider: input.provider,
        endpoint: input.endpoint,
        model: input.model,
        model_id: input.model_id,
        request_data: input.request_data,
        status: "pending",
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Get a task by database ID
   */
  async get(id: string): Promise<AiTask | null> {
    const supabase = createClient();

    const { data, error } = await supabase
      .from("ai_tasks")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116") return null; // Not found
      throw error;
    }

    return data;
  },

  /**
   * Get a task by socket.io task_id (most common lookup)
   */
  async getByTaskId(taskId: string): Promise<AiTask | null> {
    const supabase = createClient();

    const { data, error } = await supabase
      .from("ai_tasks")
      .select("*")
      .eq("task_id", taskId)
      .single();

    if (error) {
      if (error.code === "PGRST116") return null;
      throw error;
    }

    return data;
  },

  /**
   * List all tasks for a run
   */
  async listForRun(runId: string): Promise<AiTask[]> {
    const supabase = createClient();

    const { data, error } = await supabase
      .from("ai_tasks")
      .select("*")
      .eq("run_id", runId)
      .order("created_at", { ascending: true });

    if (error) throw error;
    return data || [];
  },

  /**
   * Update a task (used during streaming)
   */
  async update(taskId: string, input: UpdateAiTaskInput): Promise<AiTask> {
    const supabase = createClient();

    const { data, error } = await supabase
      .from("ai_tasks")
      .update(input)
      .eq("task_id", taskId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Update a task by database ID
   */
  async updateById(id: string, input: UpdateAiTaskInput): Promise<AiTask> {
    const supabase = createClient();

    const { data, error } = await supabase
      .from("ai_tasks")
      .update(input)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Complete a task with final data
   * This will trigger database aggregations to update the parent run
   */
  async complete(taskId: string, input: CompleteAiTaskInput): Promise<AiTask> {
    const supabase = createClient();

    const updateData: UpdateAiTaskInput = {
      response_text: input.response_text,
      response_data: input.response_data,
      response_metadata: input.response_metadata || {},
      response_complete: true,
      tokens_input: input.tokens_input,
      tokens_output: input.tokens_output,
      tokens_total: input.tokens_total,
      cost: input.cost,
      time_to_first_token: input.time_to_first_token,
      total_time: input.total_time,
      status: "completed",
    };

    const { data, error } = await supabase
      .from("ai_tasks")
      .update(updateData)
      .eq("task_id", taskId)
      .select()
      .single();

    if (error) throw error;
    
    // Database triggers will automatically update the parent run's aggregates
    return data;
  },

  /**
   * Mark a task as failed
   */
  async fail(taskId: string, errorData?: Record<string, any>): Promise<AiTask> {
    const supabase = createClient();

    const { data, error } = await supabase
      .from("ai_tasks")
      .update({
        status: "failed",
        response_errors: errorData,
        response_complete: true,
      })
      .eq("task_id", taskId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Cancel a task
   */
  async cancel(taskId: string): Promise<AiTask> {
    const supabase = createClient();

    const { data, error } = await supabase
      .from("ai_tasks")
      .update({
        status: "cancelled",
        response_complete: true,
      })
      .eq("task_id", taskId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Update streaming status (convenience method)
   */
  async updateStreaming(
    taskId: string, 
    responseText: string,
    additionalData?: {
      response_data?: Record<string, any>;
      response_info?: Record<string, any>;
      tool_updates?: Record<string, any>;
    }
  ): Promise<AiTask> {
    const supabase = createClient();

    const updateData: UpdateAiTaskInput = {
      response_text: responseText,
      status: "streaming",
      ...additionalData,
    };

    const { data, error } = await supabase
      .from("ai_tasks")
      .update(updateData)
      .eq("task_id", taskId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Delete a task (cascade will handle if run is deleted)
   */
  async delete(taskId: string): Promise<void> {
    const supabase = createClient();

    const { error } = await supabase
      .from("ai_tasks")
      .delete()
      .eq("task_id", taskId);

    if (error) throw error;
  },

  /**
   * Get the latest task for a run
   */
  async getLatestForRun(runId: string): Promise<AiTask | null> {
    const supabase = createClient();

    const { data, error } = await supabase
      .from("ai_tasks")
      .select("*")
      .eq("run_id", runId)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (error) {
      if (error.code === "PGRST116") return null;
      throw error;
    }

    return data;
  },
};

