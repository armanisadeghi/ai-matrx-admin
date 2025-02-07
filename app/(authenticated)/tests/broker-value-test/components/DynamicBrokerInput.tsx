import { BrokerTextInput } from "../brokerComponents/BrokerTextInput";
import { mockBrokers } from "../constants";
import { BrokerInputProps } from "./withBrokerInput";


export const componentRegistry = {
    'text-input': BrokerTextInput,
    'number-input': NumberInput,
    'code-editor': CodeEditor,
    // Add more components as needed
  };
  
  // Dynamic broker input renderer
  export const DynamicBrokerInput: React.FC<BrokerInputProps> = ({ brokerId, ...props }) => {
    const broker = mockBrokers[brokerId];
    const Component = componentRegistry[broker.inputComponentId];
    
    if (!Component) {
      throw new Error(`No component registered for type: ${broker.inputComponentId}`);
    }
  
    return <Component brokerId={brokerId} {...props} />;
  };