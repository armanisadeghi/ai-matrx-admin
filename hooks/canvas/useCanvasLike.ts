import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/utils/supabase/client';
import { useToast } from '@/components/ui/use-toast';

export function useCanvasLike(canvasId: string) {
    const supabase = createClient();
    const queryClient = useQueryClient();
    const { toast } = useToast();

    // Check if user has liked
    const { data: hasLiked = false } = useQuery({
        queryKey: ['canvas-like', canvasId],
        queryFn: async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return false;

            const { data } = await supabase
                .from('canvas_likes')
                .select('id')
                .eq('canvas_id', canvasId)
                .eq('user_id', user.id)
                .single();

            return !!data;
        },
        enabled: !!canvasId
    });

    // Like mutation
    const likeMutation = useMutation({
        mutationFn: async () => {
            const { data: { user } } = await supabase.auth.getUser();
            
            if (!user) {
                throw new Error('Must be logged in to like');
            }

            const { error } = await supabase
                .from('canvas_likes')
                .insert({
                    canvas_id: canvasId,
                    user_id: user.id
                });

            if (error) throw error;
        },
        onMutate: async () => {
            // Cancel outgoing refetches
            await queryClient.cancelQueries({ queryKey: ['shared-canvas'] });
            await queryClient.cancelQueries({ queryKey: ['canvas-like', canvasId] });

            // Snapshot previous values
            const previousCanvas = queryClient.getQueryData(['shared-canvas', canvasId]);
            const previousLiked = queryClient.getQueryData(['canvas-like', canvasId]);

            // Optimistically update
            queryClient.setQueryData(['canvas-like', canvasId], true);
            queryClient.setQueryData(['shared-canvas'], (old: any) => {
                if (old?.share_token) {
                    return { ...old, like_count: (old.like_count || 0) + 1 };
                }
                return old;
            });

            return { previousCanvas, previousLiked };
        },
        onError: (err, variables, context) => {
            // Rollback on error
            if (context) {
                queryClient.setQueryData(['shared-canvas'], context.previousCanvas);
                queryClient.setQueryData(['canvas-like', canvasId], context.previousLiked);
            }
            toast({
                title: 'Error',
                description: 'Failed to like canvas',
                variant: 'destructive'
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['shared-canvas'] });
        }
    });

    // Unlike mutation
    const unlikeMutation = useMutation({
        mutationFn: async () => {
            const { data: { user } } = await supabase.auth.getUser();
            
            if (!user) {
                throw new Error('Must be logged in to unlike');
            }

            const { error } = await supabase
                .from('canvas_likes')
                .delete()
                .eq('canvas_id', canvasId)
                .eq('user_id', user.id);

            if (error) throw error;
        },
        onMutate: async () => {
            await queryClient.cancelQueries({ queryKey: ['shared-canvas'] });
            await queryClient.cancelQueries({ queryKey: ['canvas-like', canvasId] });

            const previousCanvas = queryClient.getQueryData(['shared-canvas', canvasId]);
            const previousLiked = queryClient.getQueryData(['canvas-like', canvasId]);

            queryClient.setQueryData(['canvas-like', canvasId], false);
            queryClient.setQueryData(['shared-canvas'], (old: any) => {
                if (old?.share_token) {
                    return { ...old, like_count: Math.max((old.like_count || 0) - 1, 0) };
                }
                return old;
            });

            return { previousCanvas, previousLiked };
        },
        onError: (err, variables, context) => {
            if (context) {
                queryClient.setQueryData(['shared-canvas'], context.previousCanvas);
                queryClient.setQueryData(['canvas-like', canvasId], context.previousLiked);
            }
            toast({
                title: 'Error',
                description: 'Failed to unlike canvas',
                variant: 'destructive'
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['shared-canvas'] });
        }
    });

    const toggleLike = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
            toast({
                title: 'Sign in required',
                description: 'Please sign in to like content',
            });
            return;
        }

        if (hasLiked) {
            unlikeMutation.mutate();
        } else {
            likeMutation.mutate();
        }
    };

    return {
        hasLiked,
        toggleLike,
        isLoading: likeMutation.isPending || unlikeMutation.isPending
    };
}

