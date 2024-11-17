Looking at our plan, we've completed most of Phase 1 and created the containers. Now we need to finish Phase 2 with the base action components and make this usable with Redux integration from Phase 3. Let's create the core action components:

```typescript
// components/base/ActionButton.tsx
import React from 'react';
import { Button } from '@/components/ui/button';
import { ActionConfig } from '../../types/props';

interface ActionButtonProps {
  action: ActionConfig;
  onClick: () => void;
  loading?: boolean;
  disabled?: boolean;
}

export const ActionButton: React.FC<ActionButtonProps> = ({
  action,
  onClick,
  loading,
  disabled
}) => {
  const Icon = action.icon;
  const buttonClass = action.buttonStyle === 'icon'
    ? "h-8 w-8 p-0 text-muted-foreground hover:text-foreground hover:bg-accent/50 border border-border rounded-md flex items-center justify-center"
    : "h-8 px-3 text-muted-foreground hover:text-foreground hover:bg-accent/50 border border-border rounded-md flex items-center gap-2";

  return (
    <Button
      variant="ghost"
      size="sm"
      className={buttonClass}
      onClick={onClick}
      disabled={disabled || loading}
    >
      {loading ? (
        <div className="animate-spin">⏳</div>
      ) : (
        <>
          <Icon className="w-4 h-4"/>
          {action.buttonStyle === 'full' && action.label}
        </>
      )}
    </Button>
  );
};

// components/base/ActionContent.tsx
import React from 'react';
import { PrewiredComponentConfig } from '../../types/component-types';

interface ActionContentProps {
  component: React.ComponentType<any> | PrewiredComponentConfig;
  props: Record<string, any>;
}

export const ActionContent: React.FC<ActionContentProps> = ({ component, props }) => {
  if ('component' in component) { // PrewiredComponent
    const PrewiredComponent = component.component;
    return <PrewiredComponent {...component.props} {...props} />;
  }
  
  const Component = component;
  return <Component {...props} />;
};

// components/FieldAction.tsx
import React from 'react';
import { useDispatch } from 'react-redux';
import { ActionButton } from './base/ActionButton';
import { ActionContent } from './base/ActionContent';
import { ActionContainerManager } from '../containers/ActionContainerManager';
import { useFieldActionContext } from '../hooks/useFieldActionContext';
import { generateUniqueId } from '../utils/id-generator';

export const FieldAction: React.FC<{
  action: ActionConfig;
  field: FieldConfig;
  value: any;
  onChange: (e: { target: { value: any } }) => void;
}> = ({ action, field, value, onChange }) => {
  const dispatch = useDispatch();
  const [isOpen, setIsOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const { renderInSection } = useFieldActionContext();

  const handleAction = async () => {
    setError(null);
    setLoading(true);
    
    try {
      if (action.handleAction) {
        await action.handleAction(field, value);
      }
      
      setIsOpen(true);
      
      // If we have a target section, render there
      if (action.target?.location === 'section' && action.target.sectionId) {
        const contentId = generateUniqueId('content-');
        renderInSection(
          action.target.sectionId,
          <ActionContent
            key={contentId}
            component={action.component!}
            props={{ field, value, onChange }}
          />,
          action.target
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    if (action.target?.clearOnClose) {
      // Clear the section if needed
    }
  };

  // Don't render if shouldShow returns false
  if (action.shouldShow && !action.shouldShow(field)) {
    return null;
  }

  return (
    <>
      <ActionButton
        action={action}
        onClick={handleAction}
        loading={loading}
        disabled={!!error}
      />
      
      {error && (
        <div className="text-sm text-destructive mt-1">
          {error}
        </div>
      )}
      
      {isOpen && action.component && (
        <ActionContainerManager
          presentation={action.presentation}
          onClose={handleClose}
          {...action.containerProps}
        >
          <ActionContent
            component={action.component}
            props={{ field, value, onChange }}
          />
        </ActionContainerManager>
      )}
    </>
  );
};

// hooks/useFieldAction.ts
import { useDispatch } from 'react-redux';
import { ActionConfig, FieldConfig } from '../types/props';

export const useFieldAction = (action: ActionConfig, field: FieldConfig) => {
  const dispatch = useDispatch();
  
  const execute = async (value: any) => {
    try {
      if (action.handleAction) {
        await action.handleAction(field, value);
      }
      
      // Handle any Redux actions
      if ('requirements' in action.component!) {
        const { actions = [] } = action.component.requirements!;
        actions.forEach(actionType => {
          dispatch({ type: actionType, payload: { field, value } });
        });
      }
      
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Action failed' 
      };
    }
  };
  
  return { execute };
};

// creators/createFieldAction.ts
import { ActionType } from '../types/action-types';
import { PresentationType } from '../types/presentation-types';
import { ActionConfig, FieldConfig } from '../types/props';

export const createFieldAction = (
  type: ActionType,
  config: Partial<ActionConfig>
): ActionConfig => ({
  type,
  icon: config.icon!,
  label: config.label || type,
  presentation: config.presentation || PresentationType.MODAL,
  buttonStyle: config.buttonStyle || 'icon',
  component: config.component,
  props: config.props || {},
  handleAction: config.handleAction,
  shouldShow: config.shouldShow,
  containerProps: config.containerProps || {},
  renderContainer: config.renderContainer,
  target: config.target
});

```

Now let's add Redux integration:

```typescript
// redux/actionTypes.ts
export const FIELD_ACTION_TYPES = {
  EXECUTE_ACTION: 'fieldActions/execute',
  ACTION_SUCCESS: 'fieldActions/success',
  ACTION_FAILURE: 'fieldActions/failure',
  UPDATE_SECTION: 'fieldActions/updateSection',
  CLEAR_SECTION: 'fieldActions/clearSection',
} as const;

// redux/actions.ts
import { ActionConfig, FieldConfig } from '../types/props';

export const executeFieldAction = (
  action: ActionConfig,
  field: FieldConfig,
  value: any
) => ({
  type: FIELD_ACTION_TYPES.EXECUTE_ACTION,
  payload: { action, field, value }
});

export const fieldActionSuccess = (
  actionType: string,
  result: any
) => ({
  type: FIELD_ACTION_TYPES.ACTION_SUCCESS,
  payload: { actionType, result }
});

export const fieldActionFailure = (
  actionType: string,
  error: string
) => ({
  type: FIELD_ACTION_TYPES.ACTION_FAILURE,
  payload: { actionType, error }
});

// redux/middleware.ts
import { Middleware } from 'redux';
import { FIELD_ACTION_TYPES } from './actionTypes';
import { fieldActionSuccess, fieldActionFailure } from './actions';

export const fieldActionMiddleware: Middleware = store => next => async action => {
  if (action.type !== FIELD_ACTION_TYPES.EXECUTE_ACTION) {
    return next(action);
  }

  const { action: fieldAction, field, value } = action.payload;

  try {
    // Execute the action
    if (fieldAction.handleAction) {
      const result = await fieldAction.handleAction(field, value);
      
      // Dispatch success
      store.dispatch(fieldActionSuccess(fieldAction.type, result));
      
      // Handle any required Redux actions from prewired components
      if ('requirements' in fieldAction.component!) {
        const { actions = [] } = fieldAction.component.requirements!;
        actions.forEach(actionType => {
          store.dispatch({ type: actionType, payload: { field, value, result } });
        });
      }
    }
  } catch (error) {
    store.dispatch(
      fieldActionFailure(
        fieldAction.type,
        error instanceof Error ? error.message : 'Action failed'
      )
    );
  }
};

// redux/reducer.ts
import { FIELD_ACTION_TYPES } from './actionTypes';

interface FieldActionState {
  loading: Record<string, boolean>;
  errors: Record<string, string | null>;
  results: Record<string, any>;
  sections: Record<string, any[]>;
}

const initialState: FieldActionState = {
  loading: {},
  errors: {},
  results: {},
  sections: {}
};

export const fieldActionReducer = (state = initialState, action: any) => {
  switch (action.type) {
    case FIELD_ACTION_TYPES.EXECUTE_ACTION:
      return {
        ...state,
        loading: {
          ...state.loading,
          [action.payload.action.type]: true
        },
        errors: {
          ...state.errors,
          [action.payload.action.type]: null
        }
      };

    case FIELD_ACTION_TYPES.ACTION_SUCCESS:
      return {
        ...state,
        loading: {
          ...state.loading,
          [action.payload.actionType]: false
        },
        results: {
          ...state.results,
          [action.payload.actionType]: action.payload.result
        }
      };

    case FIELD_ACTION_TYPES.ACTION_FAILURE:
      return {
        ...state,
        loading: {
          ...state.loading,
          [action.payload.actionType]: false
        },
        errors: {
          ...state.errors,
          [action.payload.actionType]: action.payload.error
        }
      };

    default:
      return state;
  }
};

```

Now you can use it like this:

```tsx
// Example usage with a prewired component
const customActions = {
  selectRecords: createFieldAction(ActionType.LINK, {
    icon: Link,
    label: 'Select Records',
    presentation: PresentationType.SHEET,
    buttonStyle: 'full',
    component: {
      component: QuickReferenceSidebar,
      props: {
        entityKey: 'registeredFunction',
        multiSelect: true
      },
      requirements: {
        state: ['entities', 'selectedRecords'],
        actions: ['selectRecord', 'deselectRecord']
      }
    },
    target: {
      location: RenderLocation.SECTION,
      sectionId: 'selectedRecords',
      position: 'append'
    }
  }),
  
  showDetails: createFieldAction(ActionType.CUSTOM, {
    icon: Eye,
    label: 'View Details',
    presentation: PresentationType.SHEET,
    component: EntityShowSelectedAccordion,
    props: {
      entityKey: 'registeredFunction'
    }
  })
};

// In your component
const MyComponent = () => {
  return (
    <div className="grid grid-cols-2 gap-4">
      <div>
        <FieldAction
          action={customActions.selectRecords}
          field={field}
          value={value}
          onChange={handleChange}
        />
      </div>
      
      <RenderSection
        id="selectedRecords"
        className="space-y-4"
        fallback={<p>No records selected</p>}
      />
    </div>
  );
};
```

Would you like me to:
1. Add more example implementations with your prewired components?
2. Show how to create custom action types?
3. Add the advanced features like action chaining?
4. Create more documentation?

Let me know what would be most helpful next!
