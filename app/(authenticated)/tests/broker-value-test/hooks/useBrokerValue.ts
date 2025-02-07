import { mockData } from "../constants";



// Enhanced hook that fetches both broker and input component data
export function useBrokerInput(brokerId: string) {
  const broker = mockData.brokers[brokerId];
  if (!broker) {
      throw new Error(`No broker found with id: ${brokerId}`);
  }

  const inputComponent = mockData.inputComponents[broker.inputComponent];
  if (!inputComponent) {
      throw new Error(`No input component found with id: ${broker.inputComponent}`);
  }

  // Get/Set value with type conversion
  const convertValue = (value: any): any => {
      switch (broker.dataType) {
          case 'bool': return Boolean(value);
          case 'int': return parseInt(value);
          case 'float': return parseFloat(value);
          case 'list': return Array.isArray(value) ? value : [value];
          case 'dict': return typeof value === 'object' ? value : {};
          default: return String(value);
      }
  };

  const getValue = () => {
      const brokerValue = mockData.brokerValues.get(brokerId);
      return brokerValue?.data.value ?? broker.defaultValue;
  };

  const setValue = (newValue: any) => {
      const convertedValue = convertValue(newValue);
          mockData.brokerValues.set(brokerId, {
          id: crypto.randomUUID(),
          data_broker: brokerId,
          user_id: "default",
          category: "default",
          sub_category: "default",
          tags: [],
          created_at: new Date().toISOString(),
          comments: "",
          data: { value: convertedValue }
      });
  };

  return {
      value: getValue(),
      setValue,
      broker,
      inputComponent
  };
}

