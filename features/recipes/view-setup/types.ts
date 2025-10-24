// types.ts
export interface DataBroker {
    id: string;
    name: string;
    data_type: string;
    default_value: string | null;
    color: string;
    input_component: string | null;
    output_component: string | null;
    field_component_id: string | null;
    default_scope: string | null;
    description: string | null;
    message_broker_id: string;
    default_component: string | null;
  }
  
  export interface Message {
    id: string;
    role: 'user' | 'assistant' | 'system';
    type: string;
    content: string | null;
    created_at: string;
    order: number;
    brokers: DataBroker[];
  }
  
  export interface AISettings {
    id: string;
    ai_endpoint: string;
    ai_provider: string;
    ai_model: string;
    temperature: number;
    max_tokens: number;
    top_p: number;
    frequency_penalty: number;
    presence_penalty: number;
    stream: boolean;
    response_format: string;
    size?: string;
    quality?: string;
    count: number;
    audio_voice?: string;
    audio_format?: string;
    modalities: any;
    tools: any;
    preset_name?: string;
  }
  
  export interface AIAgent {
    id: string;
    name: string;
    system_message_override: string | null;
    settings: AISettings;
  }
  
  export interface RecipeComplete {
    recipe_id: string;
    ai_agent: AIAgent | null;
    messages: Message[];
    // ... other recipe fields
  }