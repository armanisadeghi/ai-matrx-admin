import { CanvasContent } from '@/lib/redux/slices/canvasSlice';
import { supabase } from '@/utils/supabase/client';

export interface CanvasItemRow {
  id: string;
  user_id: string;
  type: string;
  content: CanvasContent;
  title: string | null;
  description: string | null;
  is_favorited: boolean;
  is_archived: boolean;
  tags: string[];
  session_id: string | null;
  source_message_id: string | null;
  task_id: string | null;
  is_public: boolean;
  share_token: string | null;
  content_hash: string | null;
  created_at: string;
  updated_at: string;
  last_accessed_at: string;
}

export interface CreateCanvasItemInput {
  content: CanvasContent;
  title?: string;
  description?: string;
  session_id?: string;
  source_message_id?: string;
  task_id?: string;
  tags?: string[];
}

export interface UpdateCanvasItemInput {
  title?: string;
  description?: string;
  content?: CanvasContent;
  is_favorited?: boolean;
  is_archived?: boolean;
  tags?: string[];
}

export interface CanvasItemFilters {
  type?: string;
  is_favorited?: boolean;
  is_archived?: boolean;
  session_id?: string;
  task_id?: string;
  search?: string;
}

/**
 * Generate SHA-256 hash of canvas content for deduplication
 */
async function generateContentHash(content: CanvasContent): Promise<string> {
  // Hash the content data, excluding metadata like title which users might change
  const hashableContent = {
    type: content.type,
    data: content.data,
  };
  
  const msgUint8 = new TextEncoder().encode(JSON.stringify(hashableContent));
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  
  return hashHex;
}

/**
 * Extract title from content or generate default
 */
function extractTitle(content: CanvasContent, index?: number): string {
  if (content.metadata?.title) {
    return content.metadata.title;
  }
  
  const typeLabel = content.type.charAt(0).toUpperCase() + content.type.slice(1);
  return index !== undefined ? `${typeLabel} ${index}` : `${typeLabel}`;
}

/**
 * Canvas Items Service
 * Handles all database operations for canvas persistence
 */
export const canvasItemsService = {
  /**
   * Save canvas item with automatic deduplication
   * If duplicate exists (same content hash), returns existing item and updates last_accessed_at
   */
  async save(input: CreateCanvasItemInput): Promise<{ data: CanvasItemRow | null; isDuplicate: boolean; error: any }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { data: null, isDuplicate: false, error: { message: 'Not authenticated' } };
      }

      const contentHash = await generateContentHash(input.content);
      
      // Check for existing item with same hash
      const { data: existing } = await supabase
        .from('canvas_items')
        .select('*')
        .eq('user_id', user.id)
        .eq('content_hash', contentHash)
        .single();

      if (existing) {
        // Update last_accessed_at on existing item
        const { data: updated, error } = await supabase
          .from('canvas_items')
          .update({ last_accessed_at: new Date().toISOString() })
          .eq('id', existing.id)
          .select()
          .single();

        return { data: updated, isDuplicate: true, error };
      }

      // Create new item
      const { data, error } = await supabase
        .from('canvas_items')
        .insert({
          user_id: user.id,
          type: input.content.type,
          content: input.content as any,
          content_hash: contentHash,
          title: input.title || extractTitle(input.content),
          description: input.description,
          session_id: input.session_id,
          source_message_id: input.source_message_id,
          task_id: input.task_id,
          tags: input.tags || [],
        })
        .select()
        .single();

      return { data, isDuplicate: false, error };
    } catch (error) {
      return { data: null, isDuplicate: false, error };
    }
  },

  /**
   * Update existing canvas item
   */
  async update(id: string, input: UpdateCanvasItemInput): Promise<{ data: CanvasItemRow | null; error: any }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { data: null, error: { message: 'Not authenticated' } };
      }

      const updateData: any = {
        ...input,
      };

      // If content is being updated, regenerate hash
      if (input.content) {
        updateData.content_hash = await generateContentHash(input.content);
      }

      const { data, error } = await supabase
        .from('canvas_items')
        .update(updateData)
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single();

      return { data, error };
    } catch (error) {
      return { data: null, error };
    }
  },

  /**
   * Get all canvas items for current user with optional filters
   */
  async list(filters?: CanvasItemFilters): Promise<{ data: CanvasItemRow[] | null; error: any }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { data: null, error: { message: 'Not authenticated' } };
      }

      let query = supabase
        .from('canvas_items')
        .select('*')
        .eq('user_id', user.id);

      // Apply filters
      if (filters?.type) {
        query = query.eq('type', filters.type);
      }
      if (filters?.is_favorited !== undefined) {
        query = query.eq('is_favorited', filters.is_favorited);
      }
      if (filters?.is_archived !== undefined) {
        query = query.eq('is_archived', filters.is_archived);
      }
      if (filters?.session_id) {
        query = query.eq('session_id', filters.session_id);
      }
      if (filters?.task_id) {
        query = query.eq('task_id', filters.task_id);
      }
      if (filters?.search) {
        query = query.ilike('title', `%${filters.search}%`);
      }

      // Default order: recent first
      query = query.order('last_accessed_at', { ascending: false });

      const { data, error } = await query;
      return { data, error };
    } catch (error) {
      return { data: null, error };
    }
  },

  /**
   * Get single canvas item by ID
   */
  async getById(id: string): Promise<{ data: CanvasItemRow | null; error: any }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { data: null, error: { message: 'Not authenticated' } };
      }

      const { data, error } = await supabase
        .from('canvas_items')
        .select('*')
        .eq('id', id)
        .eq('user_id', user.id)
        .single();

      // Update last_accessed_at
      if (data) {
        await supabase
          .from('canvas_items')
          .update({ last_accessed_at: new Date().toISOString() })
          .eq('id', id);
      }

      return { data, error };
    } catch (error) {
      return { data: null, error };
    }
  },

  /**
   * Get canvas item by task_id (useful when AI creates content)
   */
  async getByTaskId(taskId: string): Promise<{ data: CanvasItemRow | null; error: any }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { data: null, error: { message: 'Not authenticated' } };
      }

      const { data, error } = await supabase
        .from('canvas_items')
        .select('*')
        .eq('user_id', user.id)
        .eq('task_id', taskId)
        .single();

      return { data, error };
    } catch (error) {
      return { data: null, error };
    }
  },

  /**
   * Delete canvas item
   */
  async delete(id: string): Promise<{ error: any }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { error: { message: 'Not authenticated' } };
      }

      const { error } = await supabase
        .from('canvas_items')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      return { error };
    } catch (error) {
      return { error };
    }
  },

  /**
   * Toggle favorite status
   */
  async toggleFavorite(id: string, isFavorited: boolean): Promise<{ data: CanvasItemRow | null; error: any }> {
    return this.update(id, { is_favorited: isFavorited });
  },

  /**
   * Toggle archive status
   */
  async toggleArchive(id: string, isArchived: boolean): Promise<{ data: CanvasItemRow | null; error: any }> {
    return this.update(id, { is_archived: isArchived });
  },

  /**
   * Generate share token and make item public
   */
  async share(id: string): Promise<{ shareUrl: string | null; error: any }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { shareUrl: null, error: { message: 'Not authenticated' } };
      }

      // Generate unique share token
      const shareToken = `share-${crypto.randomUUID().split('-')[0]}-${Date.now().toString(36)}`;

      const { data, error } = await supabase
        .from('canvas_items')
        .update({
          is_public: true,
          share_token: shareToken,
        })
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) {
        return { shareUrl: null, error };
      }

      const shareUrl = `${window.location.origin}/canvas/shared/${shareToken}`;
      return { shareUrl, error: null };
    } catch (error) {
      return { shareUrl: null, error };
    }
  },

  /**
   * Unshare item (make private)
   */
  async unshare(id: string): Promise<{ error: any }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { error: { message: 'Not authenticated' } };
      }

      const { error } = await supabase
        .from('canvas_items')
        .update({
          is_public: false,
          share_token: null,
        })
        .eq('id', id)
        .eq('user_id', user.id);

      return { error };
    } catch (error) {
      return { error };
    }
  },

  /**
   * Get shared canvas item (public access)
   */
  async getShared(shareToken: string): Promise<{ data: CanvasItemRow | null; error: any }> {
    try {
      const { data, error } = await supabase
        .from('canvas_items')
        .select('*')
        .eq('share_token', shareToken)
        .eq('is_public', true)
        .single();

      return { data, error };
    } catch (error) {
      return { data: null, error };
    }
  },

  /**
   * Batch delete multiple items
   */
  async batchDelete(ids: string[]): Promise<{ error: any }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { error: { message: 'Not authenticated' } };
      }

      const { error } = await supabase
        .from('canvas_items')
        .delete()
        .in('id', ids)
        .eq('user_id', user.id);

      return { error };
    } catch (error) {
      return { error };
    }
  },

  /**
   * Batch archive multiple items
   */
  async batchArchive(ids: string[], isArchived: boolean): Promise<{ error: any }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { error: { message: 'Not authenticated' } };
      }

      const { error } = await supabase
        .from('canvas_items')
        .update({ is_archived: isArchived })
        .in('id', ids)
        .eq('user_id', user.id);

      return { error };
    } catch (error) {
      return { error };
    }
  },

  /**
   * Get statistics for user's canvas items
   */
  async getStats(): Promise<{
    total: number;
    byType: Record<string, number>;
    favorited: number;
    archived: number;
    error: any;
  }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { total: 0, byType: {}, favorited: 0, archived: 0, error: { message: 'Not authenticated' } };
      }

      const { data, error } = await supabase
        .from('canvas_items')
        .select('type, is_favorited, is_archived')
        .eq('user_id', user.id);

      if (error || !data) {
        return { total: 0, byType: {}, favorited: 0, archived: 0, error };
      }

      const stats = {
        total: data.length,
        byType: data.reduce((acc, item) => {
          acc[item.type] = (acc[item.type] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
        favorited: data.filter(item => item.is_favorited).length,
        archived: data.filter(item => item.is_archived).length,
        error: null,
      };

      return stats;
    } catch (error) {
      return { total: 0, byType: {}, favorited: 0, archived: 0, error };
    }
  },
};

