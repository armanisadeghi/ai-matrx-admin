import { mockBrokers, mockBrokerValues } from "../constants";


export function useBrokerValue(brokerId: string) {
    // Get broker metadata
    const broker = mockBrokers[brokerId];
    if (!broker) {
      throw new Error(`No broker found with id: ${brokerId}`);
    }
  
    // Get/Set value
    const getValue = () => {
      const brokerValue = mockBrokerValues.get(brokerId);
      return brokerValue?.data.value;
    };
  
    const setValue = (newValue: any) => {
      mockBrokerValues.set(brokerId, {
        id: crypto.randomUUID(), // In real system, this would be DB-generated
        data_broker: brokerId,
        data: { value: newValue }
      });
    };
  
    return {
      value: getValue(),
      setValue,
      metadata: broker
    };
  }