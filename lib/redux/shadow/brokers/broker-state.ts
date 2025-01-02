import { EntityState, MatrxRecordId } from "../../entity/types/stateTypes";

export interface EditorInstance {
  id: string;
  brokers: Set<string>;
  ref: React.RefObject<HTMLDivElement>;
}

// types/broker-state.ts
export interface BrokerLocalState {
  // Only contains the additional local-only fields
  linkedEditors: Record<string, EditorInstance>;
  isConnected: boolean;
  componentType: string;
  color: {
    light: string;
    dark: string;
  };
}

export interface BrokerShadowState {
  localState: Record<MatrxRecordId, BrokerLocalState>;
  // Reference to maintain sync
  entityStateRef: EntityState<"broker">; // Type comes from your entity system
}
