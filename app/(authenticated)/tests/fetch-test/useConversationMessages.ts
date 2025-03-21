'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import { 
  FetchRecordsPayload, 
  RootState, 
  useAppDispatch,
  useEntityTools 
} from '@/lib/redux';
import { FilterCondition } from '@/lib/redux/entity/types/stateTypes';
import { useSelector } from 'react-redux';
import { buildFilterConditions, ConditionInput } from './filter-utils';
import { MessageRecordWithKey } from '@/types';


export function useConversationMessages(conversationId: string, initialPage = 1, initialPageSize = 10) {
  const [page, setPage] = useState(initialPage);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const dispatch = useAppDispatch();
  const { actions, selectors } = useEntityTools("message");
  
  const records = useSelector((state: RootState) => selectors.selectAllRecords(state));
  const loadingState = useSelector((state: RootState) => selectors.selectLoadingState(state));
  const paginationInfo = useSelector((state: RootState) => selectors.selectPaginationInfo(state));

  const currentMessages = useSelector((state: RootState) => selectors.selectRecordsByFieldValue(state, "conversationId", conversationId)) as MessageRecordWithKey[];
  
  const nextDisplayOrder = useMemo(() => Math.max(...currentMessages.map((m) => m.displayOrder)) + 1, [currentMessages]);

  const nextSystemOrder = useMemo(() => Math.max(...currentMessages.map((m) => m.systemOrder)) + 1, [currentMessages]);

  // Original conditions (kept for backwards compatibility)
  const createConditions = useCallback((): FilterCondition[] => {
    const conditions: FilterCondition[] = [];
    
    if (conversationId) {
      conditions.push({
        field: 'display_order',
        operator: 'neq',
        value: 0
      });
      
      conditions.push({
        field: 'conversation_id',
        operator: 'eq',
        value: conversationId
      });
    }
    
    return conditions;
  }, [conversationId]);
  
  // Fetch messages with default conditions
  const fetchMessages = useCallback(() => {
    if (!conversationId) return;
    
    const payload: FetchRecordsPayload = {
      page,
      pageSize,
      options: {
        filters: {
          conditions: createConditions(),
          replace: true
        },
        sort: {
          field: 'display_order',
          direction: 'asc'
        }
      }
    };
    
    dispatch(actions.fetchRecords(payload));
  }, [dispatch, actions, page, pageSize, conversationId, createConditions]);
  
  // New fully dynamic fetch method
  const fetchWithDynamicFilters = useCallback((conditions: ConditionInput | ConditionInput[]) => {
    const payload: FetchRecordsPayload = {
      page,
      pageSize,
      options: {
        filters: {
          conditions: buildFilterConditions(conditions),
          replace: true
        },
        // Keeping the default sort, but this could be made configurable too if needed
        sort: {
          field: 'display_order',
          direction: 'asc'
        }
      }
    };
    
    dispatch(actions.fetchRecords(payload));
  }, [dispatch, actions, page, pageSize]);
  
  // Navigate to next page
  const nextPage = useCallback(() => {
    if (paginationInfo?.hasNextPage) {
      setPage(prevPage => prevPage + 1);
    }
  }, [paginationInfo?.hasNextPage]);
  
  // Navigate to previous page
  const previousPage = useCallback(() => {
    if (paginationInfo?.hasPreviousPage) {
      setPage(prevPage => prevPage - 1);
    }
  }, [paginationInfo?.hasPreviousPage]);
  
  // Change the page size
  const changePageSize = useCallback((newPageSize: number) => {
    setPageSize(newPageSize);
    setPage(1);
  }, []);
  
  return {
    page,
    pageSize,
    records,
    currentMessages,
    loadingState,
    paginationInfo,
    nextPage,
    previousPage,
    changePageSize,
    fetchMessages,          // Original fetch with default conditions
    fetchWithDynamicFilters, // New fully dynamic fetch
    isLoading: loadingState?.loading || false,
    hasError: !!loadingState?.error,
    error: loadingState?.error,
    nextDisplayOrder,
    nextSystemOrder
  };
}

