import type { DataBrokerData } from "@/types/AutomationSchemaTypes";

/** Was on data-flow-manager; leaf file breaks types/index ⟷ data-flow-manager cycle. */
export interface EnrichedBroker {
  id: string;
  name?: string;
  isKnown: boolean;
  knownBrokerData?: DataBrokerData;
  outputComponent?: string;
  fieldComponentId?: string;
  usageType: "source" | "target" | "both";
  sourceNodes: string[];
  targetNodes: string[];
  targetLabels: string[];
}
