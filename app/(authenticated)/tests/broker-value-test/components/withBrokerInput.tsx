import { cn } from "@/utils";
import { useBrokerValue } from "../hooks/useBrokerValue";
import { ComponentConfig } from "../types";

export type BrokerInputProps = {
    brokerId: string;
    className?: string;
    // Add any other common props here
  };
  
export const withBrokerInput = <P extends object>(
    WrappedComponent: React.ComponentType<P & {
      value: any;
      onChange: (value: any) => void;
      name: string;
      description: string;
      config: ComponentConfig;
    }>
  ) => {
    return function BrokerInput({ 
      brokerId,
      className,
      ...props
    }: BrokerInputProps & Omit<P, 'value' | 'onChange' | 'name' | 'description' | 'config'>) {
      const { value, setValue, metadata } = useBrokerValue(brokerId);
  
      return (
        <div className={cn("space-y-2", metadata.config.styles?.container, className)}>
          <WrappedComponent
            value={value}
            onChange={setValue}
            name={metadata.name}
            description={metadata.description}
            config={metadata.config}
            {...props as P}
          />
        </div>
      );
    };
  };
  