import { Switch, Label } from "@/components/ui";
import { withBrokerComponentWrapper } from "../wrappers/withBrokerComponentWrapper";
import { cn } from "@/utils";

export const BrokerSwitch = withBrokerComponentWrapper(({ 
    value, 
    onChange, 
    inputComponent,
    isDemo,
    ...rest
}) => {
    const options = inputComponent.options ?? ['Off', 'On'];
    const [offLabel, onLabel] = options;
    const checked = value === true || value === 'true';

    return (
        <div className={cn('flex items-center gap-2', inputComponent.componentClassName)}>
            <Label className="text-sm font-medium text-muted-foreground">
                {offLabel}
            </Label>
            <Switch
                checked={checked}
                onCheckedChange={onChange}
            />
            <Label className="text-sm font-medium text-muted-foreground">
                {onLabel}
            </Label>
        </div>
    );
});

export default BrokerSwitch;
