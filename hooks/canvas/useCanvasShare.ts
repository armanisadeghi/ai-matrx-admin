import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/utils/supabase/client';
import type { CreateShareRequest, CreateShareResponse } from '@/types/canvas-social';

export function useCanvasShare() {
    const [shareUrl, setShareUrl] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const queryClient = useQueryClient();
    const supabase = createClient();

    const generateShareToken = () => {
        // Generate URL-safe token
        return Math.random().toString(36).substring(2, 15) + 
               Math.random().toString(36).substring(2, 15);
    };

    const shareMutation = useMutation({
        mutationFn: async (request: CreateShareRequest) => {
            console.log('🚀 Starting share creation...', { request });
            console.log('📝 Canvas Type:', request.canvas_type);
            console.log('📦 Canvas Data Type:', typeof request.canvas_data);
            
            const { data: { user } } = await supabase.auth.getUser();
            console.log('👤 User:', user?.id || 'Anonymous');
            
            const shareToken = generateShareToken();
            // Always use production domain for share links
            const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.aimatrx.com';
            const url = `${baseUrl}/canvas/shared/${shareToken}`;

            console.log('🔗 Generated share URL:', url);
            console.log('📦 Canvas data:', request.canvas_data);

            // Insert into database
            const insertData = {
                share_token: shareToken,
                title: request.title,
                description: request.description,
                canvas_type: request.canvas_type,
                canvas_data: request.canvas_data,
                visibility: request.visibility || 'public',
                allow_remixes: request.allow_remixes !== false,
                require_attribution: request.require_attribution !== false,
                has_scoring: request.has_scoring || false,
                tags: request.tags || [],
                categories: request.categories || [],
                created_by: user?.id || null,
                creator_username: user?.user_metadata?.username || null,
                creator_display_name: user?.user_metadata?.full_name || user?.user_metadata?.name || null,
                published_at: new Date().toISOString()
            };

            console.log('💾 Inserting to database:', insertData);

            const { data, error } = await supabase
                .from('shared_canvas_items')
                .insert(insertData)
                .select()
                .single();

            if (error) {
                console.error('❌ Database error:', error);
                throw new Error(`Failed to create share: ${error.message}`);
            }

            console.log('✅ Share created successfully:', data);

            return {
                canvas: data,
                share_url: url,
                share_token: shareToken
            } as CreateShareResponse;
        },
        onSuccess: (response) => {
            console.log('🎉 Share mutation success:', response);
            setShareUrl(response.share_url);
            setError(null);
            queryClient.invalidateQueries({ queryKey: ['user-canvases'] });
            queryClient.invalidateQueries({ queryKey: ['discover-canvases'] });
        },
        onError: (err: any) => {
            console.error('💥 Share mutation error:', err);
            const errorMessage = err?.message || 'Failed to create share';
            setError(errorMessage);
            setShareUrl(null);
        }
    });

    const copyToClipboard = async (url: string) => {
        try {
            await navigator.clipboard.writeText(url);
            return true;
        } catch (err) {
            console.error('Failed to copy:', err);
            return false;
        }
    };

    return {
        share: shareMutation.mutate,
        shareAsync: shareMutation.mutateAsync,
        isSharing: shareMutation.isPending,
        shareUrl,
        error,
        copyToClipboard,
        reset: () => {
            setShareUrl(null);
            setError(null);
            shareMutation.reset();
        }
    };
}

