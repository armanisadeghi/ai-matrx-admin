import { Switch, Label } from "@/components/ui";
import { withBrokerInput } from "../components/withBrokerInput";
import { cn } from "@/utils";

const BrokerSwitch = withBrokerInput(({ 
    value, 
    onChange, 
    name, 
    description, 
    config 
  }) => {
    if (config.component !== 'switch') throw new Error('Invalid config');
  
    return (
      <div className="flex items-center justify-between">
        <div>
          <Label className={config.styles?.label}>{name}</Label>
          <p className={cn("text-sm text-muted-foreground", config.styles?.description)}>
            {description}
          </p>
        </div>
        <Switch
          checked={value ?? false}
          onCheckedChange={onChange}
          className={config.styles?.input}
        />
      </div>
    );
  });
  