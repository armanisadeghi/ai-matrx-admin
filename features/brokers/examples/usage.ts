// Example: Using the service in a React component
import { BrokerService } from '../services/core-broker-crud';
import { BrokerContext } from '../types';
import { DataType } from '../types';
import { Color } from '../types';

// Example 1: Get all brokers
const brokers = await BrokerService.getBrokers();

// Example 2: Create a new broker
const newBroker = await BrokerService.createBroker({
  name: 'client_name',
  data_type: DataType.STR,
  description: 'Name of the client company',
  color: Color.BLUE,
});

// Example 3: Set a broker value at workspace level
await BrokerService.upsertBrokerValue({
  broker_id: 'broker-uuid',
  value: { companyName: 'Dr. Smith Plastic Surgery' },
  workspace_id: 'workspace-uuid',
  created_by: 'user-uuid',
});

// Example 4: Get resolved values for an AI task
const context: BrokerContext = {
  user_id: 'user-uuid',
  organization_id: 'org-uuid',
  workspace_id: 'workspace-uuid',
  project_id: 'project-uuid',
  task_id: 'task-uuid',
  ai_runs_id: 'ai-run-uuid',
  ai_tasks_id: 'ai-task-uuid',
};

const resolvedValues = await BrokerService.getBrokerValuesForContext(
  ['broker-id-1', 'broker-id-2', 'broker-id-3'],
  context
);

// Example 5: Get missing brokers that need user input
const missingBrokerIds = await BrokerService.getMissingBrokerIds(
  ['broker-id-1', 'broker-id-2', 'broker-id-3'],
  context
);

// Example 6: Get complete broker data with metadata
const completeBrokerData = await BrokerService.getCompleteBrokerDataForContext(
  ['broker-id-1', 'broker-id-2'],
  context
);

// Example 7: Bulk set multiple broker values
await BrokerService.bulkUpsertBrokerValues(
  [
    { broker_id: 'broker-1', value: 'Value 1' },
    { broker_id: 'broker-2', value: { nested: 'data' } },
    { broker_id: 'broker-3', value: 123 },
  ],
  {
    workspace_id: 'workspace-uuid',
    created_by: 'user-uuid',
  }
);

// Example 8: Convert resolved values to simple object for AI
const brokerObject = BrokerService.brokerValuesToObject(resolvedValues);
// Result: { 'broker-id-1': 'value1', 'broker-id-2': 'value2' }

// Example 9: Workspace operations
const workspace = await BrokerService.createWorkspace({
  organization_id: 'org-uuid',
  name: 'Dr. Smith Plastic Surgery',
  description: 'Client workspace for Dr. Smith',
  created_by: 'user-uuid',
});

const childWorkspaces = await BrokerService.getChildWorkspaces(workspace.id);
const hierarchy = await BrokerService.getWorkspaceHierarchy(workspace.id);