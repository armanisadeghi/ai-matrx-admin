import { Slider, Label } from "@/components/ui";
import { withBrokerInput } from "../components/withBrokerInput";
import { cn } from "@/utils";

const BrokerSlider = withBrokerInput(({ 
    value, 
    onChange, 
    name, 
    description, 
    config 
  }) => {
    if (config.component !== 'slider') throw new Error('Invalid config');
  
    return (
      <>
        <Label className={config.styles?.label}>{name}</Label>
        <Slider
          value={[value ?? config.min]}
          onValueChange={([val]) => onChange(val)}
          min={config.min}
          max={config.max}
          step={config.step}
          className={cn("my-4", config.styles?.input)}
        />
        <p className={cn("text-sm text-muted-foreground", config.styles?.description)}>
          {description}
        </p>
      </>
    );
  });
  