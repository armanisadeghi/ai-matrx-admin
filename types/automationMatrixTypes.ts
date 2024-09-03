// File location: @/types/automationMatrixTypes

import { ActionType } from '@/types/actionTypes';
import { AutomationBoundaryBrokerType } from '@/types/automationBoundaryBrokerTypes';

export type CognitionMatricesType = "agent_crew" | "agent_mixture" | "workflow" | "conductor" | "monte_carlo" | "hypercluster" | "the_matrix" | "knowledge_matrix";

export type AutomationMatrixType = {
    id: string;
    name: string;
    description?: string;
    averageSeconds?: number;
    isAutomated?: boolean;
    cognitionMatrices?: CognitionMatricesType;
    action?: ActionType[];
    automationBoundaryBroker?: AutomationBoundaryBrokerType[];
};
