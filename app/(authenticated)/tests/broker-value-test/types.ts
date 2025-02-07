// Core types matching our database schema
type DataType = 'list' | 'url' | 'str' | 'bool' | 'dict' | 'float' | 'int';
type DefaultComponent = 'BrokerInput' | 'BrokerTextarea' | 'BrokerSelect' | 'BrokerSlider' | 'BrokerSwitch' | 'BrokerCheckbox' | 'BrokerRadio';

export type DataBroker = {
    id: string;
    name: string;
    defaultValue: string;
    dataType: DataType;
    inputComponent: string;  // FK to DataInputComponent.id
    outputComponent: string; // FK to DataOutputComponent.id
};

export type DataInputComponent = {
    id: string;
    name: string;
    description: string | null;
    options: any[] | null;
    include_other: boolean | null;
    min: number | null;
    max: number | null;
    step: number | null;
    min_rows: number | null;
    max_rows: number | null;
    acceptable_filetypes: string[] | null;
    src: string | null;
    classes: string | null;
    color_overrides: Record<string, string> | null;
    additional_params: Record<string, any> | null;
    sub_component: string | null;
    component: DefaultComponent;
};

export type BrokerValue = {
  id: string; // UUID (Primary Key)
  user_id: string | null; // UUID (Foreign Key referencing auth.users)
  data_broker: string | null; // UUID (Foreign Key referencing data_broker)
  data: Record<string, unknown> | null; // JSONB field, default {"value": null}
  category: string | null; // VARCHAR (nullable)
  sub_category: string | null; // VARCHAR (nullable)
  tags: string[] | null; // Array of text
  comments: string | null; // Nullable text
  created_at: string; // TIMESTAMP WITH TIME ZONE (auto-generated)
};
