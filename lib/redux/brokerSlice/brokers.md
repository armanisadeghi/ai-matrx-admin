# Broker System Documentation

## Table of Contents
1. [Introduction](#introduction)
2. [Core Concepts](#core-concepts)
3. [Why Brokers?](#why-brokers)
4. [Getting Started](#getting-started)
5. [Broker Lifecycle](#broker-lifecycle)
6. [Type-Specific Brokers](#type-specific-brokers)
7. [Component Integration](#component-integration)
8. [API Integration](#api-integration)
9. [Temporary Brokers](#temporary-brokers)
10. [Testing](#testing)
11. [Best Practices](#best-practices)
12. [Anti-Patterns](#anti-patterns)
13. [Advanced Topics](#advanced-topics)

## Introduction

The Broker System is a sophisticated state management framework designed to streamline data handling across a full-stack application, integrating React (frontend) and Python (backend) via Socket.IO for real-time synchronization. It replaces traditional state management approaches (e.g., Redux with local state or context) by introducing "brokers"—smart, globally accessible variables that automatically synchronize across components, APIs, and the backend. Below, I’ll break down the system’s core components, functionality, and benefits to ensure a comprehensive understanding before addressing potential updates.

The Broker System is the foundation of our application's state management, providing a unified way to handle all runtime values across React and Python. Think of brokers as "smart variables" that automatically sync between all components, APIs, and even across the network to our Python backend.

### What is a Broker?

A broker is any runtime value that serves as an argument, return value, or state for any API, component, utility, or workflow element. Whether it's a simple boolean or a complex data structure, if it needs to be shared or synchronized, it should be a broker.

### Key Features

- **Universal Synchronization**: Changes propagate instantly to all consumers
- **Cross-Platform**: Seamlessly syncs between React and Python via Socket.IO
- **Type-Safe**: Provides TypeScript support with type-specific operations
- **Scoped Layers**: Supports hierarchical data organization (user → client → application)
- **Zero Local State**: Eliminates prop drilling and state synchronization issues

## Core Concepts

### Broker Identity

Every broker MUST have a unique identity consisting of:

```typescript
interface BrokerIdentifier {
  // Either use a direct brokerId
  brokerId: string;
  // Or use a source + itemId combination
  source: string;
  itemId: string;
}
```

### Broker Mapping

Brokers are mapped in the system using a combination of source and itemId:

```typescript
interface BrokerMapEntry {
  source: string;    // e.g., "applet", "user", "client", "api", "preferences", etc...
  sourceId: string;  // e.g., "some-uuid", "user-123", "client-456"
  mappedItemId: string;    // e.g., "auth_token", "some-preference-name-or-id"
  brokerId: string;  // e.g., "550e8400-e29b-41d4-a716-446655440000" - defined in the database explicitly.
}
```

## Why Brokers?

### The Problem

Traditional state management leads to:
- Components tightly coupled to data sources
- Prop drilling through multiple component layers
- State synchronization nightmares
- Difficult testing due to interdependencies
- No real-time sync between frontend and backend
- Nearly impossible to dynamically connect 'unrelated' things, such as an api and a chat response

### The Solution

Brokers provide:
- **Complete Decoupling**: Components don't need to know where data comes from
- **Automatic Synchronization**: Update once, reflect everywhere
- **Real-time Backend Sync**: Python and React stay in perfect harmony
- **Scoped Data Layers**: Organize data hierarchically without complexity
- **Testability**: Easy to mock and test with temporary brokers

### Real-World Example

```typescript
// WITHOUT BROKERS - Components are tightly coupled
function UserProfile({ user, updateUser, apiToken }) {
  const handleUpdate = async (newData) => {
    const result = await api.updateProfile(apiToken, user.id, newData);
    updateUser(result);
  };
  // ... component logic
}

// WITH BROKERS - Complete decoupling
function UserProfile() {
  const userId = useAppSelector(state => 
    brokerSelectors.selectValue(state, { source: "user", itemId: "id" })
  );
  const dispatch = useAppDispatch();
  
  const handleUpdate = async (newData) => {
    // API automatically uses the auth token broker
    // Update automatically syncs to all consumers
    dispatch(brokerActions.updateValue({ 
      idArgs: { source: "user", itemId: "profile" }, 
      value: newData 
    }));
  };
  // ... component logic
}
```

## Getting Started

### 1. Register Broker Mappings

Before using brokers, their mappings must be registered in the system:

```typescript
// Register a single broker mapping
dispatch(brokerActions.updateMapEntry({
  source: "api",
  sourceId: "microsoft-office",
  itemId: "auth_token",
  brokerId: "550e8400-e29b-41d4-a716-446655440000"
}));

// Register multiple mappings at once
dispatch(brokerActions.setMap([
  {
    source: "user",
    sourceId: "user-123",
    itemId: "name",
    brokerId: "broker-id-1"
  },
  {
    source: "user",
    sourceId: "user-123",
    itemId: "email",
    brokerId: "broker-id-2"
  }
]));
```

### 2. Set Broker Values

```typescript
// Using source + itemId
dispatch(brokerActions.setValue({
  idArgs: { source: "api", itemId: "auth_token" },
  value: "Bearer xyz123..."
}));

// Using direct brokerId
dispatch(brokerActions.setValue({
  idArgs: { brokerId: "550e8400-e29b-41d4-a716-446655440000" },
  value: "Bearer xyz123..."
}));
```

### 3. Retrieve Broker Values

```typescript
// In a component
const authToken = useAppSelector(state => 
  brokerSelectors.selectValue(state, { source: "api", itemId: "auth_token" })
);

// In a selector
const selectAuthToken = createSelector(
  [state => state],
  state => brokerSelectors.selectValue(state, { source: "api", itemId: "auth_token" })
);
```

## Broker Lifecycle

### 1. Definition Phase
Brokers are defined in the database with specific IDs and purposes. This happens during system configuration.

```typescript
// Database definition example
{
  brokerId: "auth-token-broker",
  source: "api",
  itemId: "microsoft_auth_token",
  description: "Microsoft Office API authentication token",
  valueType: "string"
}
```

### 2. Registration Phase
On application startup or module initialization, broker mappings are loaded:

```typescript
// On app initialization
const loadBrokerMappings = async () => {
  const mappings = await api.getBrokerMappings();
  dispatch(brokerActions.setMap(mappings));
};
```

### 3. Value Assignment Phase
Brokers receive values from various sources:

```typescript
// From API response
const handleLogin = async () => {
  const { token } = await api.login(credentials);
  dispatch(brokerActions.setValue({
    idArgs: { source: "api", itemId: "auth_token" },
    value: token
  }));
};

// From user input
<input onChange={(e) => 
  dispatch(brokerActions.setText({
    idArgs: { source: "user", itemId: "search_query" },
    text: e.target.value
  }))
} />
```

### 4. Consumption Phase
Components and services consume broker values:

```typescript
// Component consumption
function SearchResults() {
  const query = useAppSelector(state => 
    brokerSelectors.selectText(state, { source: "user", itemId: "search_query" })
  );
  
  // Use query value
}

// API consumption
async function callAPI() {
  const token = store.getState().brokerConcept.brokers[tokenBrokerId];
  return fetch('/api/data', {
    headers: { Authorization: token }
  });
}
```

### 5. Synchronization Phase
Values sync between React and Python:

```typescript
// Socket.IO listener for Python updates
socket.on('broker:update', ({ brokerId, value }) => {
  dispatch(brokerActions.updateValue({
    idArgs: { brokerId },
    value
  }));
});

// Send updates to Python
const updateBroker = (idArgs, value) => {
  dispatch(brokerActions.updateValue({ idArgs, value }));
  socket.emit('broker:update', { idArgs, value });
};
```

## Type-Specific Brokers

### Text Brokers

```typescript
// Set text value
dispatch(brokerActions.setText({
  idArgs: { source: "user", itemId: "name" },
  text: "John Doe"
}));

// Get text value
const name = useAppSelector(state => 
  brokerSelectors.selectText(state, { source: "user", itemId: "name" })
);

// Append text
dispatch(brokerActions.appendText({
  idArgs: { source: "log", itemId: "messages" },
  text: "\nNew message"
}));
```

### Number Brokers

```typescript
// Set number
dispatch(brokerActions.setNumber({
  idArgs: { source: "cart", itemId: "total" },
  value: 99.99
}));

// Increment
dispatch(brokerActions.incrementNumber({
  idArgs: { source: "cart", itemId: "item_count" },
  amount: 1
}));

// Set bounded number
dispatch(brokerActions.setBoundedNumber({
  idArgs: { source: "settings", itemId: "volume" },
  value: 75,
  min: 0,
  max: 100
}));
```

### Boolean Brokers

```typescript
// Set boolean
dispatch(brokerActions.setBoolean({
  idArgs: { source: "ui", itemId: "is_loading" },
  value: true
}));

// Toggle
dispatch(brokerActions.toggleBoolean({
  idArgs: { source: "settings", itemId: "dark_mode" }
}));

// Check value
const isDarkMode = useAppSelector(state => 
  brokerSelectors.selectBoolean(state, { source: "settings", itemId: "dark_mode" })
);
```

### Options Brokers

```typescript
// Set options
dispatch(brokerActions.setOptions({
  idArgs: { source: "form", itemId: "country" },
  options: [
    { id: "us", label: "United States" },
    { id: "uk", label: "United Kingdom" },
    { id: "ca", label: "Canada" }
  ]
}));

// Select option
dispatch(brokerActions.updateOptionSelectionState({
  idArgs: { source: "form", itemId: "country" },
  optionId: "us",
  isSelected: true
}));

// Get selected options
const selectedCountry = useAppSelector(state => 
  brokerSelectors.selectSelectedOptions(state, { source: "form", itemId: "country" })
);
```

### Table Brokers

```typescript
// Set table structure
dispatch(brokerActions.setTable({
  idArgs: { source: "data", itemId: "users" },
  table: {
    columns: [
      { id: "name", name: "Name", type: "text" },
      { id: "email", name: "Email", type: "text" }
    ],
    rows: [
      { id: "row-1", cells: { name: "John", email: "john@example.com" } }
    ]
  }
}));

// Update cell
dispatch(brokerActions.updateCell({
  idArgs: { source: "data", itemId: "users" },
  rowId: "row-1",
  columnId: "name",
  value: "John Doe"
}));
```

## Component Integration

### Basic Input Component

```typescript
interface BrokerInputProps {
  idArgs: BrokerIdentifier;
  placeholder?: string;
  disabled?: boolean;
}

function BrokerInput({ idArgs, placeholder, disabled }: BrokerInputProps) {
  const dispatch = useAppDispatch();
  const value = useAppSelector(state => 
    brokerSelectors.selectText(state, idArgs)
  ) || '';

  return (
    <input
      value={value}
      onChange={(e) => dispatch(brokerActions.setText({
        idArgs,
        text: e.target.value
      }))}
      placeholder={placeholder}
      disabled={disabled}
    />
  );
}

// Usage
<BrokerInput 
  idArgs={{ source: "user", itemId: "email" }}
  placeholder="Enter email"
/>
```

### Select Component

```typescript
function BrokerSelect({ idArgs }: { idArgs: BrokerIdentifier }) {
  const dispatch = useAppDispatch();
  const options = useAppSelector(state => 
    brokerSelectors.selectBrokerOptions(state, idArgs)
  );
  const selected = useAppSelector(state => 
    brokerSelectors.selectSelectedOptions(state, idArgs)
  );

  return (
    <select
      value={selected[0]?.id || ''}
      onChange={(e) => {
        dispatch(brokerActions.updateOptionSelectionState({
          idArgs,
          optionId: e.target.value,
          isSelected: true
        }));
      }}
    >
      {options?.map(opt => (
        <option key={opt.id} value={opt.id}>{opt.label}</option>
      ))}
    </select>
  );
}
```

### Complex Form Component

```typescript
function UserProfileForm() {
  const dispatch = useAppDispatch();
  
  // Multiple brokers for different fields
  const name = useAppSelector(state => 
    brokerSelectors.selectText(state, { source: "user", itemId: "name" })
  );
  const email = useAppSelector(state => 
    brokerSelectors.selectText(state, { source: "user", itemId: "email" })
  );
  const notifications = useAppSelector(state => 
    brokerSelectors.selectBoolean(state, { source: "user", itemId: "notifications" })
  );

  const handleSubmit = async () => {
    // All values are automatically current
    await api.updateProfile({ name, email, notifications });
  };

  return (
    <form onSubmit={handleSubmit}>
      <BrokerInput idArgs={{ source: "user", itemId: "name" }} />
      <BrokerInput idArgs={{ source: "user", itemId: "email" }} />
      <label>
        <input
          type="checkbox"
          checked={notifications || false}
          onChange={(e) => dispatch(brokerActions.setBoolean({
            idArgs: { source: "user", itemId: "notifications" },
            value: e.target.checked
          }))}
        />
        Enable notifications
      </label>
      <button type="submit">Save</button>
    </form>
  );
}
```

## API Integration

### API Hook with Brokers

```typescript
function useAPIWithBrokers() {
  const authToken = useAppSelector(state => 
    brokerSelectors.selectText(state, { source: "api", itemId: "auth_token" })
  );
  const baseURL = useAppSelector(state => 
    brokerSelectors.selectText(state, { source: "api", itemId: "base_url" })
  );

  const callAPI = useCallback(async (endpoint: string, options?: RequestInit) => {
    if (!authToken) throw new Error('No auth token available');

    const response = await fetch(`${baseURL}${endpoint}`, {
      ...options,
      headers: {
        ...options?.headers,
        'Authorization': `Bearer ${authToken}`
      }
    });

    return response.json();
  }, [authToken, baseURL]);

  return { callAPI };
}
```

### Auto-Syncing API Results

```typescript
function useUserData() {
  const dispatch = useAppDispatch();
  const { callAPI } = useAPIWithBrokers();

  const fetchUserData = async () => {
    try {
      const userData = await callAPI('/api/user');
      
      // Automatically sync to brokers
      Object.entries(userData).forEach(([key, value]) => {
        dispatch(brokerActions.setValue({
          idArgs: { source: "user", itemId: key },
          value
        }));
      });
    } catch (error) {
      dispatch(brokerActions.setValue({
        idArgs: { source: "error", itemId: "user_fetch" },
        value: error.message
      }));
    }
  };

  return { fetchUserData };
}
```

## Temporary Brokers

For testing, previews, or temporary workflows, use the temporary broker system:

### Basic Temporary Broker

```typescript
function PreviewComponent() {
  const tempBroker = useTempBroker("preview");
  const dispatch = useAppDispatch();

  useEffect(() => {
    if (tempBroker) {
      dispatch(brokerActions.setText({
        idArgs: tempBroker,
        text: "Preview text"
      }));
    }
  }, [tempBroker]);

  if (!tempBroker) return <div>Loading...</div>;

  return <BrokerInput idArgs={tempBroker} />;
}
```

### Multiple Temporary Brokers

```typescript
function MultiPreviewComponent() {
  const result = useTempBrokers("test", 3, {
    itemIdPattern: (i) => `test-item-${i}`
  });

  if (!result) return <div>Loading...</div>;

  return (
    <div>
      {result.identifiers.map((id, index) => (
        <BrokerInput key={index} idArgs={id} />
      ))}
    </div>
  );
}
```

### Preview with Component Types

```typescript
function useFieldPreview(fieldId: string, componentTypes: string[]) {
  const result = usePreviewBrokers(fieldId, componentTypes);
  
  if (!result) return null;

  return {
    sourceId: result.sourceId,
    getIdentifier: (type?: string) => result.getIdentifier(type)
  };
}

// Usage
function FieldPreview({ fieldId }: { fieldId: string }) {
  const preview = useFieldPreview(fieldId, ["input", "select", "textarea"]);
  
  if (!preview) return <div>Loading...</div>;

  return (
    <div>
      <BrokerInput idArgs={preview.getIdentifier("input")} />
      <BrokerSelect idArgs={preview.getIdentifier("select")} />
      <BrokerTextarea idArgs={preview.getIdentifier("textarea")} />
    </div>
  );
}
```

## Testing

### Test Setup

```typescript
import { configureStore } from '@reduxjs/toolkit';
import brokerReducer from '@/lib/redux/brokerSlice';

function createTestStore() {
  return configureStore({
    reducer: {
      brokerConcept: brokerReducer
    }
  });
}
```

### Testing with Temporary Brokers

```typescript
describe('UserProfile', () => {
  it('should update user name', async () => {
    const store = createTestStore();
    
    // Create temp broker for testing
    await store.dispatch(createTempBroker({
      source: "test",
      itemId: "user-name"
    }));

    const { getByRole } = render(
      <Provider store={store}>
        <BrokerInput idArgs={{ source: "test", itemId: "user-name" }} />
      </Provider>
    );

    const input = getByRole('textbox');
    fireEvent.change(input, { target: { value: 'John Doe' } });

    const state = store.getState();
    const value = brokerSelectors.selectText(state, {
      source: "test",
      itemId: "user-name"
    });
    
    expect(value).toBe('John Doe');
  });
});
```

### Mocking Broker Values

```typescript
function mockBrokerValue(store: any, idArgs: BrokerIdentifier, value: any) {
  store.dispatch(brokerActions.setValue({ idArgs, value }));
}

// In tests
beforeEach(() => {
  const store = createTestStore();
  
  // Mock API token
  mockBrokerValue(store, 
    { source: "api", itemId: "auth_token" }, 
    "mock-token-123"
  );
  
  // Mock user data
  mockBrokerValue(store,
    { source: "user", itemId: "name" },
    "Test User"
  );
});
```

## Best Practices

### 1. **NEVER Use Local State for Broker Values**

```typescript
// ❌ BAD - Local state
function BadComponent() {
  const [value, setValue] = useState('');
  
  return <input value={value} onChange={e => setValue(e.target.value)} />;
}

// ✅ GOOD - Broker state
function GoodComponent({ idArgs }: { idArgs: BrokerIdentifier }) {
  const dispatch = useAppDispatch();
  const value = useAppSelector(state => 
    brokerSelectors.selectText(state, idArgs)
  );
  
  return (
    <input 
      value={value || ''} 
      onChange={e => dispatch(brokerActions.setText({
        idArgs,
        text: e.target.value
      }))}
    />
  );
}
```

### 2. **Use Type-Specific Actions and Selectors**

```typescript
// ❌ BAD - Generic value for specific type
dispatch(brokerActions.setValue({
  idArgs,
  value: true  // Boolean value with generic action
}));

// ✅ GOOD - Type-specific action
dispatch(brokerActions.setBoolean({
  idArgs,
  value: true
}));
```

### 3. **Define Clear Broker Scopes**

```typescript
// Define broker sources clearly
const BROKER_SOURCES = {
  AUTH: 'auth',
  USER: 'user',
  CLIENT: 'client',
  APP: 'app',
  TEMP: 'temp',
  TEST: 'test'
} as const;

// Use consistent naming
const userNameId = { source: BROKER_SOURCES.USER, itemId: 'name' };
const clientIdBroker = { source: BROKER_SOURCES.CLIENT, itemId: 'id' };
```

### 4. **Handle Undefined Values**

```typescript
// Always provide defaults
const value = useAppSelector(state => 
  brokerSelectors.selectText(state, idArgs)
) || '';

// Check existence before operations
const brokerExists = useAppSelector(state => 
  brokerSelectors.selectHasValue(state, idArgs)
);

if (brokerExists) {
  // Perform operations
}
```

### 5. **Use Selectors for Derived State**

```typescript
// Create derived selectors
const selectUserFullName = createSelector(
  [
    state => brokerSelectors.selectText(state, { source: "user", itemId: "firstName" }),
    state => brokerSelectors.selectText(state, { source: "user", itemId: "lastName" })
  ],
  (firstName, lastName) => `${firstName || ''} ${lastName || ''}`.trim()
);
```

### 6. **Batch Updates When Possible**

```typescript
// ❌ BAD - Multiple dispatches
dispatch(brokerActions.setText({ idArgs: name, text: 'John' }));
dispatch(brokerActions.setText({ idArgs: email, text: 'john@example.com' }));
dispatch(brokerActions.setNumber({ idArgs: age, value: 30 }));

// ✅ GOOD - Batch update (if implementing batch action)
dispatch(brokerActions.setMultiple([
  { idArgs: name, value: 'John', type: 'text' },
  { idArgs: email, value: 'john@example.com', type: 'text' },
  { idArgs: age, value: 30, type: 'number' }
]));
```

### 7. **Clean Up Temporary Brokers**

```typescript
// Always clean up in useEffect
useEffect(() => {
  const cleanup = createTempBroker(/* ... */);
  
  return () => {
    cleanup();  // Clean up on unmount
  };
}, []);
```

## Anti-Patterns

### 1. **Don't Mix Local and Broker State**

```typescript
// ❌ BAD - Mixing state systems
function BadComponent({ idArgs }) {
  const [localValue, setLocalValue] = useState('');
  const brokerValue = useAppSelector(state => 
    brokerSelectors.selectText(state, idArgs)
  );
  
  // Confusing: which value is the source of truth?
  const displayValue = localValue || brokerValue;
}
```

### 2. **Don't Create Ad-Hoc Broker IDs**

```typescript
// ❌ BAD - Random IDs
const brokerId = `broker-${Math.random()}`;
dispatch(brokerActions.setValue({ 
  idArgs: { brokerId }, 
  value: 'data' 
}));

// ✅ GOOD - Structured IDs from database
const idArgs = { source: "user", itemId: "preferences" };
```

### 3. **Don't Bypass the Broker System**

```typescript
// ❌ BAD - Direct API call without brokers
async function fetchData() {
  const token = localStorage.getItem('token');  // Bypassing broker
  const data = await api.get('/data', { token });
  setLocalState(data);  // Not sharing with other components
}

// ✅ GOOD - Use brokers throughout
async function fetchData() {
  const token = store.getState().brokerConcept.brokers[tokenBrokerId];
  const data = await api.get('/data', { token });
  dispatch(brokerActions.setValue({ idArgs: dataId, value: data }));
}
```

### 4. **Don't Ignore Type Safety**

```typescript
// ❌ BAD - Using wrong type
dispatch(brokerActions.setText({
  idArgs,
  text: 123  // TypeScript error: number is not string
}));

// ✅ GOOD - Correct type
dispatch(brokerActions.setNumber({
  idArgs,
  value: 123
}));
```

## Advanced Topics

### Socket.IO Integration

```typescript
// Setup Socket.IO broker sync
export function setupBrokerSync(socket: Socket, store: Store) {
  // Listen for broker updates from Python
  socket.on('broker:update', ({ idArgs, value, type }) => {
    const action = type === 'text' 
      ? brokerActions.setText({ idArgs, text: value })
      : brokerActions.setValue({ idArgs, value });
    
    store.dispatch(action);
  });

  // Send updates to Python
  let previousState = store.getState().brokerConcept;
  
  store.subscribe(() => {
    const currentState = store.getState().brokerConcept;
    if (currentState !== previousState) {
      const changes = findBrokerChanges(previousState, currentState);
      changes.forEach(change => {
        socket.emit('broker:update', change);
      });
      previousState = currentState;
    }
  });
}
```

### Scoped Broker Layers

```typescript
// Layer 1: Authentication
async function initAuthLayer() {
  const authData = await api.getAuth();
  dispatch(brokerActions.setMap([
    { source: "auth", itemId: "token", brokerId: authData.tokenBrokerId },
    { source: "auth", itemId: "userId", brokerId: authData.userIdBrokerId }
  ]));
}

// Layer 2: User Preferences
async function initUserLayer(userId: string) {
  const prefs = await api.getUserPreferences(userId);
  const mappings = Object.entries(prefs).map(([key, data]) => ({
    source: "user",
    sourceId: userId,
    itemId: key,
    brokerId: data.brokerId
  }));
  dispatch(brokerActions.setMap(mappings));
}

// Layer 3: Client Context
async function initClientLayer(clientId: string) {
  const clientData = await api.getClientData(clientId);
  const mappings = Object.entries(clientData).map(([key, data]) => ({
    source: "client",
    sourceId: clientId,
    itemId: key,
    brokerId: data.brokerId
  }));
  dispatch(brokerActions.setMap(mappings));
}

// Layer 4: Application State
function initAppLayer() {
  dispatch(brokerActions.setMap([
    { source: "app", itemId: "theme", brokerId: "theme-broker-id" },
    { source: "app", itemId: "language", brokerId: "lang-broker-id" }
  ]));
}
```

### Performance Optimization

```typescript
// Memoize complex selectors
const selectComplexData = createSelector(
  [
    state => brokerSelectors.selectTable(state, tableId),
    state => brokerSelectors.selectOptions(state, optionsId),
    state => brokerSelectors.selectText(state, searchId)
  ],
  (table, options, searchText) => {
    // Complex computation
    return processTableWithOptionsAndSearch(table, options, searchText);
  }
);

// Use shallowEqual for arrays
const options = useAppSelector(
  state => brokerSelectors.selectOptions(state, idArgs),
  shallowEqual
);
```

### Broker Middleware

```typescript
// Custom middleware for broker operations
const brokerMiddleware: Middleware = store => next => action => {
  // Pre-processing
  if (action.type.startsWith('brokerConcept/')) {
    console.log('Broker action:', action.type, action.payload);
  }

  const result = next(action);

  // Post-processing
  if (action.type === 'brokerConcept/setValue') {
    // Trigger side effects, validations, etc.
    validateBrokerValue(action.payload);
  }

  return result;
};
```

## Conclusion

The Broker System is the backbone of our application's state management. By following these guidelines:

1. **Always use brokers** for shared state
2. **Never use local state** for broker values
3. **Use type-specific actions** and selectors
4. **Properly scope** your brokers
5. **Clean up** temporary brokers
6. **Test** with temporary brokers

You'll create maintainable, scalable, and synchronized applications that seamlessly work across React and Python platforms.

Remember: If a value needs to be shared, synchronized, or persisted, it should be a broker. This ensures consistency, testability, and real-time synchronization across your entire application stack.