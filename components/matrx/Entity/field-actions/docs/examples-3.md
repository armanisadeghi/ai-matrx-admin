Perfect! Let's first integrate Next.js App Router features and then create a plan for building real-world components. Here's the Next.js integration:

```typescript
// types/routing-types.ts
export interface RouteConfig {
  path: string;
  params?: Record<string, string | number>;
  query?: Record<string, string>;
  scroll?: boolean;
  prefetch?: boolean;
}

// hooks/useActionRouting.ts
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useCallback } from 'react';
import { RouteConfig } from '../types/routing-types';

export const useActionRouting = () => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const navigateToAction = useCallback(
    (config: RouteConfig) => {
      const url = new URL(config.path, window.location.origin);
      
      // Add query parameters
      if (config.query) {
        Object.entries(config.query).forEach(([key, value]) => {
          url.searchParams.set(key, value.toString());
        });
      }
      
      router.push(url.pathname + url.search, {
        scroll: config.scroll ?? true
      });
    },
    [router]
  );

  const getActionUrl = useCallback(
    (config: RouteConfig) => {
      const params = new URLSearchParams(searchParams);
      
      if (config.query) {
        Object.entries(config.query).forEach(([key, value]) => {
          params.set(key, value.toString());
        });
      }
      
      return `${config.path}?${params.toString()}`;
    },
    [searchParams]
  );

  return {
    navigateToAction,
    getActionUrl,
    currentPath: pathname,
    queryParams: searchParams
  };
};

// components/ActionLink.tsx
import Link from 'next/link';
import { useActionRouting } from '../hooks/useActionRouting';
import { RouteConfig } from '../types/routing-types';

interface ActionLinkProps {
  config: RouteConfig;
  children: React.ReactNode;
  className?: string;
}

export const ActionLink: React.FC<ActionLinkProps> = ({
  config,
  children,
  className
}) => {
  const { getActionUrl } = useActionRouting();
  
  return (
    <Link 
      href={getActionUrl(config)}
      className={className}
      prefetch={config.prefetch}
    >
      {children}
    </Link>
  );
};

// containers/RouteAwareContainer.tsx
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { ActionContainerManager } from './ActionContainerManager';

interface RouteAwareContainerProps extends React.ComponentProps<typeof ActionContainerManager> {
  routeConfig?: RouteConfig;
}

export const RouteAwareContainer: React.FC<RouteAwareContainerProps> = ({
  routeConfig,
  children,
  ...props
}) => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Handle route-based visibility
  const isVisible = routeConfig ? pathname === routeConfig.path : true;

  const handleClose = () => {
    if (routeConfig) {
      router.back();
    }
    props.onClose?.();
  };

  if (!isVisible) {
    return null;
  }

  return (
    <ActionContainerManager
      {...props}
      onClose={handleClose}
    >
      {children}
    </ActionContainerManager>
  );
};

// creators/createRouteAction.ts
import { ActionType } from '../types/action-types';
import { RouteConfig } from '../types/routing-types';
import { createFieldAction } from './createFieldAction';

export const createRouteAction = (
  type: ActionType,
  routeConfig: RouteConfig,
  actionConfig: any
) => {
  return createFieldAction(type, {
    ...actionConfig,
    handleAction: async (field, value) => {
      // Handle any pre-navigation logic
      if (actionConfig.handleAction) {
        await actionConfig.handleAction(field, value);
      }
      
      // Navigate to the route
      window.history.pushState({}, '', routeConfig.path);
    }
  });
};

```

Now, to create real-world components that integrate with your system, I need to understand:

1. **State Structure**:
    - What are your main Redux slices?
    - What selectors do you commonly use?
    - What are the key actions for CRUD operations?

2. **Entity Schema**:
    - Can you share an example of your entity schema?
    - How do you handle translations between frontend/backend?
    - What are the common field types?

3. **Component Requirements**:
    - What props do your prewired components typically need?
    - How do you handle loading states?
    - How do you manage permissions?

4. **Data Flow**:
    - How do you fetch quick reference info?
    - What's the structure of your table component?
    - How do you handle form submissions?

Here's a proposed test page structure to validate the system:

```typescript
interface TestPageProps {
  entityKey: EntityKey;
  initialView?: 'form' | 'accordion' | 'table';
}

const EntityTestPage: React.FC<TestPageProps> = ({
  entityKey,
  initialView = 'form'
}) => {
  // We'll need implementations for these
  const dispatch = useAppDispatch();
  const quickReference = useSelector(selectQuickReference(entityKey));
  const selectedItems = useSelector(selectSelectedItems(entityKey));
  const viewType = useSelector(selectViewType(entityKey));

  return (
    <div className="grid grid-cols-12 gap-4">
      {/* Selection Panel */}
      <div className="col-span-3">
        {/* Quick Reference Selection */}
      </div>

      {/* Main Content */}
      <div className="col-span-9">
        {/* Action Bar */}
        <div className="mb-4">
          {/* Action Buttons */}
        </div>

        {/* Content Area */}
        <div className="space-y-4">
          {/* Dynamic Content Based on View Type */}
        </div>

        {/* Action Results */}
        <RenderSection
          id="actionResults"
          className="mt-4"
        />
      </div>
    </div>
  );
};
```

To move forward, I need:

1. Example of your entity schema structure
2. Core Redux slice structure
3. Common selector patterns
4. Typical prewired component props
5. Authentication/authorization patterns

With this information, we can create:

1. Entity-aware action creators
2. Prewired containers
3. Smart selection components
4. Dynamic form generators
5. Table integration
6. CRUD operation handlers

Would you like to start by showing me some of this information so we can begin building the real components?
