import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getBrowserSupabaseClient } from '@/utils/supabase/getBrowserClient';
import type { SubmitScoreRequest, SubmitScoreResponse, CanvasScore } from '@/types/canvas-social';

export function useCanvasScore(canvasId: string) {
    const supabase = getBrowserSupabaseClient();
    const queryClient = useQueryClient();

    // Get user's best score
    const { data: bestScore } = useQuery({
        queryKey: ['canvas-best-score', canvasId],
        queryFn: async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return null;

            const { data } = await supabase
                .from('canvas_scores')
                .select('*')
                .eq('canvas_id', canvasId)
                .eq('user_id', user.id)
                .order('score', { ascending: false })
                .limit(1)
                .single();

            return data as CanvasScore | null;
        },
        enabled: !!canvasId
    });

    // Submit score mutation
    const submitScoreMutation = useMutation({
        mutationFn: async (request: Omit<SubmitScoreRequest, 'canvas_id'>) => {
            const { data: { user } } = await supabase.auth.getUser();

            // Get attempt number
            let attemptNumber = 1;
            if (user) {
                const { count } = await supabase
                    .from('canvas_scores')
                    .select('*', { count: 'exact', head: true })
                    .eq('canvas_id', canvasId)
                    .eq('user_id', user.id);
                
                attemptNumber = (count || 0) + 1;
            }

            // Insert score
            const { data: score, error } = await supabase
                .from('canvas_scores')
                .insert({
                    canvas_id: canvasId,
                    user_id: user?.id || null,
                    username: user?.user_metadata?.username || 'Anonymous',
                    display_name: user?.user_metadata?.full_name || user?.user_metadata?.name || 'Anonymous',
                    score: request.score,
                    max_score: request.max_score,
                    time_taken: request.time_taken,
                    completed: request.completed,
                    attempt_number: attemptNumber,
                    data: request.data || {}
                })
                .select()
                .single();

            if (error) throw error;

            // Get rank
            const { count } = await supabase
                .from('canvas_scores')
                .select('*', { count: 'exact', head: true })
                .eq('canvas_id', canvasId)
                .gt('score', request.score);

            const rank = (count || 0) + 1;

            // Check if high score
            const { data: canvas } = await supabase
                .from('shared_canvas_items')
                .select('high_score')
                .eq('id', canvasId)
                .single();

            const isHighScore = !canvas?.high_score || request.score > canvas.high_score;
            const isPersonalBest = !bestScore || request.score > bestScore.score;

            // Calculate XP (simplified)
            let xpEarned = 5; // Base XP for playing
            if (request.completed) xpEarned += 10;
            if (isHighScore) xpEarned += 50;
            if (rank <= 10) xpEarned += 25;

            return {
                score,
                rank,
                is_high_score: isHighScore,
                is_personal_best: isPersonalBest,
                xp_earned: xpEarned,
                achievements_unlocked: []
            } as SubmitScoreResponse;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['canvas-best-score', canvasId] });
            queryClient.invalidateQueries({ queryKey: ['canvas-leaderboard', canvasId] });
            queryClient.invalidateQueries({ queryKey: ['shared-canvas'] });
        }
    });

    return {
        bestScore,
        submitScore: submitScoreMutation.mutate,
        submitScoreAsync: submitScoreMutation.mutateAsync,
        isSubmitting: submitScoreMutation.isPending,
        scoreResult: submitScoreMutation.data
    };
}

