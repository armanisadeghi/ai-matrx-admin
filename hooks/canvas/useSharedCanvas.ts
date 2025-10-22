import { useQuery } from '@tanstack/react-query';
import { getBrowserSupabaseClient } from '@/utils/supabase/getBrowserClient';
import type { SharedCanvasItem } from '@/types/canvas-social';

export function useSharedCanvas(shareToken: string | null) {
    const supabase = getBrowserSupabaseClient();

    return useQuery({
        queryKey: ['shared-canvas', shareToken],
        queryFn: async () => {
            if (!shareToken) throw new Error('No share token provided');

            const { data, error } = await supabase
                .from('shared_canvas_items')
                .select('*')
                .eq('share_token', shareToken)
                .single();

            if (error) throw error;

            // Increment view count (don't wait for it)
            trackView(shareToken);

            return data as SharedCanvasItem;
        },
        enabled: !!shareToken,
        staleTime: 1000 * 60 * 5, // 5 minutes
    });
}

async function trackView(shareToken: string) {
    try {
        const supabase = getBrowserSupabaseClient();
        const { data: { user } } = await supabase.auth.getUser();
        
        // Get or create session ID
        let sessionId = sessionStorage.getItem('canvas_session_id');
        if (!sessionId) {
            sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            sessionStorage.setItem('canvas_session_id', sessionId);
        }

        // Get canvas ID first
        const { data: canvas } = await supabase
            .from('shared_canvas_items')
            .select('id')
            .eq('share_token', shareToken)
            .single();

        if (!canvas) return;

        // Insert view
        await supabase
            .from('canvas_views')
            .insert({
                canvas_id: canvas.id,
                user_id: user?.id || null,
                session_id: sessionId,
                referrer: typeof document !== 'undefined' ? document.referrer : null,
                viewed_at: new Date().toISOString()
            });
    } catch (err) {
        console.error('Error tracking view:', err);
    }
}

