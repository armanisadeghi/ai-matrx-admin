// lib/redux/entity/useEntityMetrics.ts

import {useCallback, useEffect, useMemo, useState} from 'react';
import { useAppSelector, useAppDispatch } from '@/lib/redux/hooks';
import { EntityKeys } from '@/types/entityTypes';
import { getEntitySlice } from '@/lib/redux/entity/entitySlice';
import {createEntitySelectors} from '@/lib/redux/entity/selectors';

export const useEntityMetrics = <TEntity extends EntityKeys>(entityKey: TEntity) => {
    const dispatch = useAppDispatch();
    const selectors = useMemo(() => createEntitySelectors(entityKey), [entityKey]);
    const {actions} = React.useMemo(() => getEntitySlice(entityKey), [entityKey]);
    const [lastError, setLastError] = useState<any>(null);
    const [isRefreshing, setIsRefreshing] = useState(false);

    const safeDispatch = useCallback((action: any) => {
        try {
            dispatch(action);
        } catch (error) {
            console.error(`Error dispatching action for ${entityKey}:`, error);
            setLastError(error);
        }
    }, [dispatch, entityKey]);

    // Metrics Selectors
    const metrics = useAppSelector(selectors.selectMetrics);
    const operationCounts = useAppSelector(selectors.selectOperationCounts);
    const performanceMetrics = useAppSelector(selectors.selectPerformanceMetrics);
    const cacheStats = useAppSelector(selectors.selectCacheStats);
    const errorRates = useAppSelector(selectors.selectErrorRates);
    const lastUpdated = useAppSelector(selectors.selectMetricsLastUpdated);

    // Response Time Metrics
    const responseTimeMetrics = useAppSelector(selectors.selectResponseTimeMetrics);
    const throughputMetrics = useAppSelector(selectors.selectThroughputMetrics);

    // Cache Metrics
    const cacheHitRate = useAppSelector(selectors.selectCacheHitRate);
    const cacheSize = useAppSelector(selectors.selectCacheSize);

    // Error Metrics
    const errorTimeline = useAppSelector(selectors.selectErrorTimeline);
    const errorDistribution = useAppSelector(selectors.selectErrorDistribution);
    const recentErrors = useAppSelector(selectors.selectRecentErrors);

    // Fetch metrics with optional time range
    const fetchMetrics = useCallback(async (timeRange?: string) => {
        setIsRefreshing(true);
        try {
            await safeDispatch(actions.fetchMetrics({ timeRange })); // Now properly typed
        } catch (err) {
            setLastError(err);
            console.error('Error fetching metrics:', err);
        } finally {
            setIsRefreshing(false);
        }
    }, [safeDispatch, actions]);


    // Calculate derived metrics
    const calculateAverageResponseTime = useCallback(() => {
        if (!responseTimeMetrics?.length) return 0;
        const sum = responseTimeMetrics.reduce(
            (acc, curr) => acc + curr.avgResponseTime,
            0
        );
        return sum / responseTimeMetrics.length;
    }, [responseTimeMetrics]);

    const calculateErrorRate = useCallback(() => {
        if (!errorTimeline?.length) return 0;
        const latest = errorTimeline[errorTimeline.length - 1];
        return latest.errorRate;
    }, [errorTimeline]);

    const calculateCacheEfficiency = useCallback(() => {
        if (!cacheStats?.totalHits && !cacheStats?.totalMisses) return 0;
        const total = cacheStats.totalHits + cacheStats.totalMisses;
        return (cacheStats.totalHits / total) * 100;
    }, [cacheStats]);

    // Auto-refresh metrics on mount
    useEffect(() => {
        fetchMetrics();

        const refreshInterval = setInterval(() => {
            fetchMetrics();
        }, 5 * 60 * 1000); // Refresh every 5 minutes

        return () => clearInterval(refreshInterval);
    }, [fetchMetrics]);

    return {
        // Raw metrics data
        metrics,
        operationCounts,
        performanceMetrics,
        cacheStats,
        errorRates,
        lastUpdated,

        // Specific metric groups
        responseTimeMetrics,
        throughputMetrics,
        cacheHitRate,
        cacheSize,
        errorTimeline,
        errorDistribution,
        recentErrors,

        // Loading state
        isRefreshing,
        lastError,

        // Actions
        fetchMetrics,
        clearError: () => setLastError(null),

        // Derived metrics
        averageResponseTime: calculateAverageResponseTime(),
        currentErrorRate: calculateErrorRate(),
        cacheEfficiency: calculateCacheEfficiency(),

        // Helper functions
        formatMetricValue: (value: number) => value.toFixed(2),
        formatTimestamp: (timestamp: string) => new Date(timestamp).toLocaleString(),
    };
};
