import { BrokerInput } from "../brokerComponents/BrokerInput";
import { BrokerSelect } from "../brokerComponents/BrokerSelect";
import { BrokerSlider } from "../brokerComponents/BrokerSlider";
import { BrokerSwitch } from "../brokerComponents/BrokerSwitch";
import { mockData } from "../constants";
import { BrokerInputProps } from "./withBrokerInput";


export const componentRegistry = {
    'text-input': BrokerInput,
    'select': BrokerSelect,
    'slider': BrokerSlider,
    'switch': BrokerSwitch,
  };
  
  // Dynamic broker input renderer
  export const DynamicBrokerInput: React.FC<BrokerInputProps> = ({ brokerId, ...props }) => {
    const broker = mockData.brokerValues[brokerId];
    const Component = componentRegistry[broker.inputComponentId];
    
    if (!Component) {
      throw new Error(`No component registered for type: ${broker.inputComponentId}`);
    }
  
    return <Component brokerId={brokerId} {...props} />;
  };