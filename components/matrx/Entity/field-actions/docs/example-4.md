Perfect! This gives us a great foundation to create some powerful actions. Let's create two specialized actions: one for single record fetch and display, and one for multiple records. I'll set them up to work seamlessly with your data structures:

```typescript
// actions/record-fetch/types.ts
import { EntityKeys, EntityStateField, EntityStateFieldWithValue, MatrxRecordId } from '@/types/entityTypes';
import { PresentationType } from '../../types/presentation-types';

export interface RecordDisplayConfig {
  presentation: PresentationType;
  title?: string;
  layout?: 'form' | 'grid' | 'table' | 'custom';
  showFields?: string[];
  hideFields?: string[];
  groupFields?: Record<string, string[]>;
  customComponents?: Record<string, React.ComponentType<any>>;
  actions?: Record<string, ActionConfig>;
}

// actions/record-fetch/single-record.ts
export const createSingleRecordAction = (
  config: RecordDisplayConfig
) => {
  return createFieldAction('fetchSingleRecord', {
    icon: Eye,
    label: 'View Record',
    presentation: config.presentation,
    buttonStyle: 'full',
    component: SingleRecordViewer,
    props: {
      displayConfig: config,
    },
    containerProps: {
      title: config.title || 'View Record',
      className: 'min-w-[600px]',
    },
  });
};

// actions/record-fetch/multi-record.ts
export const createMultiRecordAction = (
  config: RecordDisplayConfig
) => {
  return createFieldAction('fetchMultiRecord', {
    icon: List,
    label: 'View Records',
    presentation: config.presentation,
    buttonStyle: 'full',
    component: MultiRecordViewer,
    props: {
      displayConfig: config,
    },
    containerProps: {
      title: config.title || 'View Records',
      className: 'min-w-[800px]',
    },
  });
};

// components/record-display/SingleRecordViewer.tsx
interface SingleRecordViewerProps {
  entityKey: EntityKeys;
  recordId: MatrxRecordId;
  displayConfig: RecordDisplayConfig;
}

export const SingleRecordViewer: React.FC<SingleRecordViewerProps> = ({
  entityKey,
  recordId,
  displayConfig
}) => {
  const { fetchRecords, getFetchedRecords } = useFetchRecords();
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<Error | null>(null);

  React.useEffect(() => {
    const cleanup = fetchRecords({
      entityKey,
      recordIds: [recordId],
      onComplete: () => setLoading(false),
      onError: setError
    });

    return cleanup;
  }, [entityKey, recordId]);

  const recordData = getFetchedRecords(entityKey, [recordId]);

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorDisplay error={error} />;
  if (!recordData) return <EmptyState />;

  const fields = recordData.fields[0];
  
  // Filter and group fields based on config
  const visibleFields = fields.filter(field => {
    if (displayConfig.showFields) {
      return displayConfig.showFields.includes(field.name);
    }
    if (displayConfig.hideFields) {
      return !displayConfig.hideFields.includes(field.name);
    }
    return true;
  });

  switch (displayConfig.layout) {
    case 'grid':
      return <GridLayout fields={visibleFields} config={displayConfig} />;
    case 'table':
      return <TableLayout fields={visibleFields} config={displayConfig} />;
    case 'custom':
      return <CustomLayout fields={visibleFields} config={displayConfig} />;
    case 'form':
    default:
      return <FormLayout fields={visibleFields} config={displayConfig} />;
  }
};

// components/record-display/layouts/FormLayout.tsx
interface FormLayoutProps {
  fields: EntityStateFieldWithValue[];
  config: RecordDisplayConfig;
}

const FormLayout: React.FC<FormLayoutProps> = ({ fields, config }) => {
  // Group fields if grouping is configured
  const groupedFields = React.useMemo(() => {
    if (!config.groupFields) {
      return { default: fields };
    }

    const groups: Record<string, EntityStateFieldWithValue[]> = {};
    const assigned = new Set<string>();

    // First, handle explicitly grouped fields
    Object.entries(config.groupFields).forEach(([groupName, fieldNames]) => {
      groups[groupName] = fields.filter(field => fieldNames.includes(field.name));
      fieldNames.forEach(name => assigned.add(name));
    });

    // Then, add ungrouped fields to default group
    groups.default = fields.filter(field => !assigned.has(field.name));

    return groups;
  }, [fields, config.groupFields]);

  return (
    <div className="space-y-6">
      {Object.entries(groupedFields).map(([groupName, groupFields]) => (
        <div key={groupName} className="space-y-4">
          {groupName !== 'default' && (
            <h3 className="text-lg font-medium text-foreground">{groupName}</h3>
          )}
          <div className="grid grid-cols-2 gap-4">
            {groupFields.map(field => (
              <FieldDisplay
                key={field.name}
                field={field}
                customComponent={config.customComponents?.[field.name]}
                actions={config.actions?.[field.name]}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

// components/record-display/FieldDisplay.tsx
interface FieldDisplayProps {
  field: EntityStateFieldWithValue;
  customComponent?: React.ComponentType<any>;
  actions?: ActionConfig;
}

const FieldDisplay: React.FC<FieldDisplayProps> = ({
  field,
  customComponent: CustomComponent,
  actions
}) => {
  if (CustomComponent) {
    return <CustomComponent field={field} />;
  }

  const fieldProps = {
    label: field.displayName,
    value: field.value,
    type: field.dataType,
    required: field.isRequired,
    ...field.componentProps
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium text-muted-foreground">
          {field.displayName}
        </Label>
        {actions && (
          <div className="flex gap-2">
            {Object.entries(actions).map(([key, action]) => (
              <FieldAction
                key={key}
                action={action}
                field={field}
                value={field.value}
              />
            ))}
          </div>
        )}
      </div>
      <FormattedValue {...fieldProps} />
    </div>
  );
};

```

Usage example:

```typescript
// Create action configurations
const singleRecordAction = createSingleRecordAction({
  presentation: PresentationType.SHEET,
  layout: 'form',
  groupFields: {
    'Basic Info': ['name', 'description', 'status'],
    'Details': ['createdAt', 'updatedAt', 'createdBy']
  },
  customComponents: {
    status: StatusBadge,
    createdAt: DateTimeDisplay
  },
  actions: {
    relatedRecords: createRelatedRecordsAction({
      presentation: PresentationType.MODAL
    })
  }
});

// Use in a component
const MyComponent = () => {
  return (
    <FieldAction
      action={singleRecordAction}
      field={field}
      value={recordId}
    />
  );
};
```

This gives us:
1. Flexible display configurations
2. Support for custom components per field
3. Field grouping
4. Action chaining (actions on fields)
5. Multiple layout options
6. Automatic data fetching and error handling

Would you like me to:
1. Add the multi-record viewer component?
2. Add more layout options?
3. Create specialized field type renderers?
4. Add more action configurations?

Let me know what would be most helpful to implement next!
