export interface Broker {
    id: string;
    displayName: string;
    officialName: string;
    value: string;
    componentType: string;
    instructions: string;
    defaultSource: string;
    sourceDetails?: string;
    isConnected: boolean;
    isReady: boolean;
    isDeleted: boolean;
    color: {
      light: string;
      dark: string;
    };
  }
  
  