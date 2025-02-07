import { cn } from "@/utils";
import { useBrokerInput } from "../hooks/useBrokerValue";
import { DataBroker, DataInputComponent } from "../types";

export type BrokerInputProps = {
    brokerId: string;
    className?: string;
    // Add any other common props here
  };
  

export const withBrokerInput = <P extends object>(
  WrappedComponent: React.ComponentType<P & {
      value: any;
      onChange: (value: any) => void;
      broker: DataBroker;
      inputComponent: DataInputComponent;
  }>
) => {
  return function BrokerInput({ 
      brokerId,
      className,
      ...props
  }: BrokerInputProps & Omit<P, 'value' | 'onChange' | 'broker' | 'inputComponent'>) {
      const { value, setValue, broker, inputComponent } = useBrokerInput(brokerId);

      return (
          <div className={cn(
              "space-y-2",
              inputComponent.classes,
              className
          )}>
              <WrappedComponent
                  value={value}
                  onChange={setValue}
                  broker={broker}
                  inputComponent={inputComponent}
                  {...props as P}
              />
          </div>
      );
  };
};