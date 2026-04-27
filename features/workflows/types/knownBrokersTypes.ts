import type { FunctionNode } from "./functionNodeTypes";

export interface KnownBroker {
  id: string;
  label: string;
  description?: string;
  dataType?: string;
  guaranteed: boolean;
  metadata?: Record<string, any>;
}

export interface NodeKnownBrokers {
  version: "1.0";
  computedAt: string;
  runtimeBrokers: KnownBroker[];
  globalBrokers?: KnownBroker[];
  computationContext?: Record<string, any>;
}

export interface KnownBrokerComputer {
  nodeType: string;
  functionType?: string;
  computeKnownBrokers: (node: FunctionNode) => NodeKnownBrokers | null;
}
