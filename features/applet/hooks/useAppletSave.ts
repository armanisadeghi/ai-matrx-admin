import { useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '@/lib/redux/hooks';
import { saveAppletThunk, checkAppletSlugUniqueness } from '@/lib/redux/app-builder/thunks/appletBuilderThunks';
import { selectAppletById } from '@/lib/redux/app-builder/selectors/appletSelectors';

/**
 * Hook to manage saving applets with the unified save approach
 */
export const useAppletSave = (appletId: string | null) => {
  const dispatch = useAppDispatch();
  const applet = useAppSelector(state => appletId ? selectAppletById(state, appletId) : null);
  const isLoading = useAppSelector(state => state.appletBuilder.isLoading);
  
  /**
   * Save the applet and handle slug validation
   */
  const saveApplet = useCallback(async () => {
    if (!appletId || !applet) {
      console.error('Cannot save: No applet ID or applet not found');
      return null;
    }
    
    // First check if the slug is unique (if needed)
    if (applet.slugStatus !== 'unique') {
      const slugResult = await dispatch(checkAppletSlugUniqueness({ 
        slug: applet.slug, 
        appletId: applet.isLocal ? undefined : appletId 
      }));
      
      if (slugResult.payload !== true) {
        // Slug is not unique
        return { success: false, error: 'Slug is not unique' };
      }
    }
    
    // Save the applet
    const result = await dispatch(saveAppletThunk(appletId));
    if (result.meta.requestStatus === 'fulfilled') {
      return { success: true, data: result.payload };
    } else {
      return { success: false, error: result.payload || 'Failed to save applet' };
    }
  }, [appletId, applet, dispatch]);
  
  return {
    saveApplet,
    isLoading,
    applet
  };
}; 