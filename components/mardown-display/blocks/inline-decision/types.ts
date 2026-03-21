export interface InlineDecisionOption {
    id: string;
    label: string;
    text: string;
  }
  
  export interface InlineDecision {
    id: string;
    prompt: string;
    options: InlineDecisionOption[];
  }