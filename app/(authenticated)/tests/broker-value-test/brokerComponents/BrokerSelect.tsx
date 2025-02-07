import { Select, Label } from "@/components/ui";
import { withBrokerInput } from "../components/withBrokerInput";
import { cn } from "@/utils";

const BrokerSelect = withBrokerInput(({ 
    value, 
    onChange, 
    name, 
    description, 
    config 
  }) => {
    if (config.component !== 'select') throw new Error('Invalid config');
    
    return (
      <>
        <Label className={config.styles?.label}>{name}</Label>
        <Select
          value={value}
          onValueChange={onChange}
          options={config.options}
          isMulti={config.isMulti}
          isClearable={config.isClearable}
          className={cn("w-full", config.styles?.input)}
        />
        <p className={cn("text-sm text-muted-foreground", config.styles?.description)}>
          {description}
        </p>
      </>
    );
  });
  