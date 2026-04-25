export interface Row {
    id: string;
    depth: number;
    key: string;
    value: string;
    type: 'text' | 'number' | 'boolean' | 'object' | 'array' | null;
    isList: boolean;
    listValues: string[];
  }
  
