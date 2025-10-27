import { createClient } from "@/utils/supabase/client";
import type {
  AiRun,
  AiRunWithTasks,
  CreateAiRunInput,
  UpdateAiRunInput,
  AiRunsListFilters,
  AiRunsListResponse,
  RunMessage,
} from "../types";

/**
 * AI Runs Service - Client-side CRUD operations for ai_runs table
 * 
 * This service provides all operations needed to manage AI conversation runs.
 * All operations respect RLS policies and work with the current user's session.
 */

export const aiRunsService = {
  /**
   * Create a new AI run
   */
  async create(input: CreateAiRunInput): Promise<AiRun> {
    const supabase = createClient();
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated");

    const { data, error } = await supabase
      .from("ai_runs")
      .insert({
        user_id: user.id,
        source_type: input.source_type,
        source_id: input.source_id,
        name: input.name,
        description: input.description,
        tags: input.tags || [],
        settings: input.settings,
        variable_values: input.variable_values || {},
        broker_values: input.broker_values || {},
        attachments: input.attachments || [],
        metadata: input.metadata || {},
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Get a single run by ID
   */
  async get(runId: string): Promise<AiRun | null> {
    const supabase = createClient();

    const { data, error } = await supabase
      .from("ai_runs")
      .select("*")
      .eq("id", runId)
      .single();

    if (error) {
      if (error.code === "PGRST116") return null; // Not found
      throw error;
    }

    return data;
  },

  /**
   * Get a run with all its tasks
   */
  async getWithTasks(runId: string): Promise<AiRunWithTasks | null> {
    const supabase = createClient();

    // Get run
    const { data: run, error: runError } = await supabase
      .from("ai_runs")
      .select("*")
      .eq("id", runId)
      .single();

    if (runError) {
      if (runError.code === "PGRST116") return null;
      throw runError;
    }

    // Get tasks
    const { data: tasks, error: tasksError } = await supabase
      .from("ai_tasks")
      .select("*")
      .eq("run_id", runId)
      .order("created_at", { ascending: true });

    if (tasksError) throw tasksError;

    return {
      ...run,
      tasks: tasks || [],
    };
  },

  /**
   * List runs with optional filters
   */
  async list(filters: AiRunsListFilters = {}): Promise<AiRunsListResponse> {
    const supabase = createClient();
    
    const {
      source_type,
      source_id,
      status = "active",
      starred,
      search,
      limit = 20,
      offset = 0,
      order_by = "last_message_at",
      order_direction = "desc",
    } = filters;

    let query = supabase
      .from("ai_runs")
      .select("*", { count: "exact" });

    // Apply filters
    if (source_type) query = query.eq("source_type", source_type);
    if (source_id) query = query.eq("source_id", source_id);
    if (status) query = query.eq("status", status);
    if (starred !== undefined) query = query.eq("is_starred", starred);
    
    // Search in name and description
    if (search) {
      query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`);
    }

    // Order and pagination
    query = query.order(order_by, { ascending: order_direction === "asc" });
    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) throw error;

    return {
      runs: data || [],
      total: count || 0,
      hasMore: (count || 0) > offset + limit,
    };
  },

  /**
   * Update a run
   */
  async update(runId: string, input: UpdateAiRunInput): Promise<AiRun> {
    const supabase = createClient();

    const { data, error } = await supabase
      .from("ai_runs")
      .update(input)
      .eq("id", runId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Delete a run (soft delete by setting status to 'deleted')
   */
  async delete(runId: string): Promise<void> {
    const supabase = createClient();

    const { error } = await supabase
      .from("ai_runs")
      .update({ status: "deleted" })
      .eq("id", runId);

    if (error) throw error;
  },

  /**
   * Permanently delete a run (hard delete)
   */
  async hardDelete(runId: string): Promise<void> {
    const supabase = createClient();

    const { error } = await supabase
      .from("ai_runs")
      .delete()
      .eq("id", runId);

    if (error) throw error;
  },

  /**
   * Toggle star status
   */
  async toggleStar(runId: string): Promise<AiRun> {
    const supabase = createClient();

    // Get current state
    const { data: current, error: getError } = await supabase
      .from("ai_runs")
      .select("is_starred")
      .eq("id", runId)
      .single();

    if (getError) throw getError;

    // Toggle
    const { data, error } = await supabase
      .from("ai_runs")
      .update({ is_starred: !current.is_starred })
      .eq("id", runId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Add a message to a run
   */
  async addMessage(runId: string, message: RunMessage): Promise<AiRun> {
    const supabase = createClient();

    // Get current messages
    const { data: current, error: getError } = await supabase
      .from("ai_runs")
      .select("messages")
      .eq("id", runId)
      .single();

    if (getError) throw getError;

    // Append new message
    const updatedMessages = [...(current.messages || []), message];

    // Update
    const { data, error } = await supabase
      .from("ai_runs")
      .update({ messages: updatedMessages })
      .eq("id", runId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Archive a run
   */
  async archive(runId: string): Promise<AiRun> {
    const supabase = createClient();

    const { data, error } = await supabase
      .from("ai_runs")
      .update({ status: "archived" })
      .eq("id", runId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Restore an archived run
   */
  async restore(runId: string): Promise<AiRun> {
    const supabase = createClient();

    const { data, error } = await supabase
      .from("ai_runs")
      .update({ status: "active" })
      .eq("id", runId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Update messages array (replace all messages)
   */
  async updateMessages(runId: string, messages: RunMessage[]): Promise<AiRun> {
    const supabase = createClient();

    const { data, error } = await supabase
      .from("ai_runs")
      .update({ messages })
      .eq("id", runId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },
};

