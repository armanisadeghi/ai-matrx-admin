'use client';

import React, { useState, useCallback, useMemo } from "react";
import { Clock } from "lucide-react";
import { format, parse } from "date-fns";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { EntityComponentBaseProps } from "../types";
import { Label } from "@/components/ui/label";

type MatrxVariant = 'default' | 'destructive' | 'success' | 'outline' | 'secondary' | 'ghost' | 'link' | 'primary';

interface EntityTimePickerProps extends EntityComponentBaseProps {
  className?: string;
}

const EntityTimePicker = React.forwardRef<HTMLInputElement, EntityTimePickerProps>(
  ({
    entityKey,
    dynamicFieldInfo,
    value = "",
    onChange,
    disabled = false,
    variant = "default",
    className,
    floatingLabel = false,
    size = "default",
  }, ref) => {
    const [time, setTime] = useState<string>(value as string);

    const customProps = dynamicFieldInfo.componentProps as Record<string, unknown>;
    const is24Hour = customProps?.is24Hour as boolean ?? false;
    const placeholder = customProps?.placeholder as string ?? "Pick a time";

    const handleTimeChange = useCallback((newTime: string) => {
      setTime(newTime);
      onChange(newTime);
    }, [onChange]);

    const formatTime = useCallback((timeString: string) => {
      if (!timeString) return "";
      try {
        const date = parse(
          timeString,
          is24Hour ? "HH:mm" : "hh:mm a",
          new Date()
        );
        return format(date, is24Hour ? "HH:mm" : "hh:mm a");
      } catch {
        return timeString;
      }
    }, [is24Hour]);

    const resolvedVariant = useMemo(() => {
      const validVariants: Record<string, MatrxVariant> = {
        destructive: 'destructive',
        success: 'outline',
        outline: 'outline',
        secondary: 'secondary',
        ghost: 'ghost',
        link: 'link',
        primary: 'primary',
        default: 'outline',
      };
      
      return validVariants[variant as string] || validVariants.default;
    }, [variant]);

    return (
      <div className="w-full">
        {dynamicFieldInfo.displayName && (
          <Label
            className={cn(
              "block text-sm font-medium mb-1",
              disabled ? "text-muted-foreground" : "text-foreground"
            )}
          >
            {dynamicFieldInfo.displayName}
          </Label>
        )}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant={resolvedVariant as 'link' | 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost'}
              className={cn(
                "w-full justify-start text-left font-normal",
                !time && "text-muted-foreground",
                className
              )}
              disabled={disabled}
            >
              <Clock className="mr-2 h-4 w-4" />
              {time ? formatTime(time) : <span>{placeholder}</span>}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-4" align="start">
            <div className="flex flex-col space-y-2">
              <Input
                type="time"
                value={time}
                onChange={(e) => handleTimeChange(e.target.value)}
                className="w-full"
                ref={ref}
                disabled={disabled}
              />
              {!is24Hour && (
                <div className="flex justify-between mt-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const date = parse(time, "HH:mm", new Date());
                      handleTimeChange(format(date, "hh:mm a"));
                    }}
                    disabled={disabled}
                  >
                    AM
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const date = parse(time, "HH:mm", new Date());
                      const pmDate = new Date(date.setHours(date.getHours() + 12));
                      handleTimeChange(format(pmDate, "hh:mm a"));
                    }}
                    disabled={disabled}
                  >
                    PM
                  </Button>
                </div>
              )}
            </div>
          </PopoverContent>
        </Popover>
      </div>
    );
  }
);

EntityTimePicker.displayName = "EntityTimePicker";

export default React.memo(EntityTimePicker);