// import { BrokerInput } from "../../../../../components/brokers/value-components/BrokerInput";
// import { BrokerSelect } from "../../../../../components/brokers/value-components/BrokerSelect";
// import { BrokerSlider } from "../../../../../components/brokers/value-components/BrokerSlider";
// import { BrokerSwitch } from "../../../../../components/brokers/value-components/BrokerSwitch";
// import { mockData } from "../../../../../components/brokers/constants/mock-data";
// import { BrokerInputProps } from "../../../../../components/brokers/wrappers/withBrokerInput";


// export const componentRegistry = {
//     'text-input': BrokerInput,
//     'select': BrokerSelect,
//     'slider': BrokerSlider,
//     'switch': BrokerSwitch,
//   };
  
//   // Dynamic broker input renderer
//   export const DynamicBrokerInput: React.FC<BrokerInputProps> = ({ brokerId, ...props }) => {
//     const broker = mockData.brokerValues[brokerId];
//     const Component = componentRegistry[broker.inputComponentId];
    
//     if (!Component) {
//       throw new Error(`No component registered for type: ${broker.inputComponentId}`);
//     }
  
//     return <Component brokerId={brokerId} {...props} />;
//   };