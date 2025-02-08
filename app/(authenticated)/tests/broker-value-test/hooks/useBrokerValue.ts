import { mockData } from "../constants";

export function useBrokerInput(brokerId: string) {
  const broker = mockData.brokers[brokerId];
  if (!broker) {
      throw new Error(`No broker found with id: ${brokerId}`);
  }

  const inputComponent = mockData.inputComponents[broker.inputComponent];
  if (!inputComponent) {
      throw new Error(`No input component found with id: ${broker.inputComponent}`);
  }

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
          dataBroker: brokerId,
          userId: "default",
          category: "default",
          subCategory: "default",
          tags: [],
          createdAt: new Date().toISOString(),
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

