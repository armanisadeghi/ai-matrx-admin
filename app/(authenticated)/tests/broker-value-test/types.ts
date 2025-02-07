export type ComponentConfig = {
    // Base config all components might use
    styles?: {
      container?: string;
      label?: string;
      input?: string;
      description?: string;
    };
    validation?: {
      required?: boolean;
      pattern?: string;
      min?: number;
      max?: number;
      minLength?: number;
      maxLength?: number;
      custom?: (value: any) => boolean;
    };
  } & (
    // Component-specific configs using discriminated union
    | {
        component: 'select';
        options: Array<{ label: string; value: string | number }>;
        isMulti?: boolean;
        isClearable?: boolean;
      }
    | {
        component: 'slider';
        min: number;
        max: number;
        step: number;
        showMarks?: boolean;
      }
    | {
        component: 'number';
        min?: number;
        max?: number;
        step?: number;
        allowDecimal?: boolean;
      }
    | {
        component: 'textarea';
        rows?: number;
        maxRows?: number;
        resizable?: boolean;
      }
    | {
        component: 'radio';
        options: Array<{ label: string; value: string | number }>;
        layout?: 'horizontal' | 'vertical';
      }
    | {
        component: 'checkbox';
        label?: string;
        indeterminate?: boolean;
      }
    | {
        component: 'switch';
        label?: string;
        icons?: {
          checked?: React.ReactNode;
          unchecked?: React.ReactNode;
        };
      }
    | {
        component: 'input';
        type?: 'text' | 'email' | 'password' | 'url' | 'tel';
        placeholder?: string;
      }
  );
  
export type DataBroker = {
    id: string;
    name: string;
    description: string;
    dataType: string;
    config: ComponentConfig;
  };

  export type BrokerValue = {
    id: string;
    data_broker: string; // FK to DataBroker.id
    data: {
      value: any;  // Typed based on DataBroker.dataType
    };
  };
