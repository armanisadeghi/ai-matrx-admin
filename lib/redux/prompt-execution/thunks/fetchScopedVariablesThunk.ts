/**
 * Fetch Scoped Variables Thunk
 * 
 * Fetches user/org/project-level variables from database.
 * These are automatic variables that users don't manually enter.
 * 
 * Examples:
 * - {{user_name}}, {{user_email}}
 * - {{org_name}}, {{org_id}}
 * - {{project_name}}, {{project_id}}
 * - {{current_date}}, {{current_time}}
 * 
 * Cached for the session - only fetched once.
 */

import { createAsyncThunk } from '@reduxjs/toolkit';
import type { RootState, AppDispatch } from '../../store';
import type { FetchScopedVariablesPayload } from '../types';
import {
  selectScopedVariables,
  setScopedVariablesStatus,
  setScopedVariables,
} from '../slice';
import { createClient } from '@/utils/supabase/client';

export const fetchScopedVariables = createAsyncThunk<
  void,
  FetchScopedVariablesPayload,
  {
    dispatch: AppDispatch;
    state: RootState;
  }
>(
  'promptExecution/fetchScopedVariables',
  async (payload, { dispatch, getState }) => {
    const { userId, orgId, projectId, force = false } = payload;

    try {
      const state = getState();
      const scopedVars = selectScopedVariables(state);

      // Skip if already loaded and not forcing refresh
      if (scopedVars.status === 'loaded' && !force) {
        const age = Date.now() - (scopedVars.fetchedAt || 0);
        const maxAge = 5 * 60 * 1000; // 5 minutes

        if (age < maxAge) {
          console.log('✅ Using cached scoped variables');
          return;
        }
      }

      dispatch(setScopedVariablesStatus('loading'));

      // Create fresh client to pick up current auth session
      const supabase = createClient();

      // Fetch user variables
      let userVariables: Record<string, string> = {};
      if (userId) {
        const { data: userData, error: userError } = await supabase
          .from('user_variables')
          .select('key, value')
          .eq('user_id', userId);

        if (userError) {
          console.error('Error fetching user variables:', userError);
        } else if (userData) {
          userVariables = userData.reduce((acc, { key, value }) => {
            acc[key] = value;
            return acc;
          }, {} as Record<string, string>);
        }
      }

      // Fetch org variables
      let orgVariables: Record<string, string> = {};
      if (orgId) {
        const { data: orgData, error: orgError } = await supabase
          .from('org_variables')
          .select('key, value')
          .eq('org_id', orgId);

        if (orgError) {
          console.error('Error fetching org variables:', orgError);
        } else if (orgData) {
          orgVariables = orgData.reduce((acc, { key, value }) => {
            acc[key] = value;
            return acc;
          }, {} as Record<string, string>);
        }
      }

      // Fetch project variables
      let projectVariables: Record<string, string> = {};
      if (projectId) {
        const { data: projectData, error: projectError } = await supabase
          .from('project_variables')
          .select('key, value')
          .eq('project_id', projectId);

        if (projectError) {
          console.error('Error fetching project variables:', projectError);
        } else if (projectData) {
          projectVariables = projectData.reduce((acc, { key, value }) => {
            acc[key] = value;
            return acc;
          }, {} as Record<string, string>);
        }
      }

      // Update Redux
      dispatch(setScopedVariables({
        user: userVariables,
        org: orgVariables,
        project: projectVariables,
      }));

      console.log('✅ Scoped variables loaded:', {
        user: Object.keys(userVariables).length,
        org: Object.keys(orgVariables).length,
        project: Object.keys(projectVariables).length,
      });

    } catch (error) {
      console.error('❌ Failed to fetch scoped variables:', error);
      dispatch(setScopedVariablesStatus('error'));
      throw error;
    }
  }
);

