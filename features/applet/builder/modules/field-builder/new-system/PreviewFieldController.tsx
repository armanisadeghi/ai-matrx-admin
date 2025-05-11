'use client';

import React, { useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useAppDispatch } from '@/lib/redux';
import { fieldController } from '@/features/applet/runner/field-components/FieldController';
import { setBrokerMap } from '@/lib/redux/app-runner/slices/brokerSlice';
import { FieldDefinition } from '@/types/customAppTypes';

interface PreviewFieldControllerProps {
  field: FieldDefinition;
  isMobile?: boolean;
}

export const PreviewFieldController: React.FC<PreviewFieldControllerProps> = ({ 
  field,
  isMobile = false
}) => {
  const dispatch = useAppDispatch();
  const previewAppletId = 'preview-applet';
  
  // Set up broker map entries when field changes
  useEffect(() => {
    if (field && field.id) {
      const brokerId = `preview-broker-${field.id}`;
      
      // Create a broker map entry for this field
      dispatch(setBrokerMap([
        {
          source: 'applet',
          sourceId: previewAppletId,
          itemId: field.id,
          brokerId: brokerId
        }
      ]));
    }
  }, [field, dispatch]);
  
  // Use the existing field controller with our preview applet ID
  return fieldController({ field, appletId: previewAppletId, isMobile });
};

export default PreviewFieldController; 