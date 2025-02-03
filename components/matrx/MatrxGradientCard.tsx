import React from 'react';
import { cn } from "@/lib/utils";
import {
  BackgroundGradient,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent
} from "@/components/ui";

export interface GradientCardProps {
  // Content props
  title: string;
  subtitle?: string;
  description?: string;
  children?: React.ReactNode;
  
  // Styling props
  className?: string;
  containerClassName?: string;
  headerClassName?: string;
  titleClassName?: string;
  subtitleClassName?: string;
  contentClassName?: string;
  
  // Text wrapping controls
  allowTitleWrap?: boolean;
  allowDescriptionWrap?: boolean;
  
  // Sizing props (only used when wrapping is disabled)
  titleLineClamp?: number;
  descriptionLineClamp?: number;
  minTitleHeight?: string;
  minDescriptionHeight?: string;
}

export const MatrxGradientCard = ({
  // Content props
  title,
  subtitle,
  description,
  children,
  
  // Styling props
  className,
  containerClassName,
  headerClassName,
  titleClassName,
  subtitleClassName,
  contentClassName,
  
  // Text wrapping controls
  allowTitleWrap = false,
  allowDescriptionWrap = false,
  
  // Sizing props
  titleLineClamp = 2,
  descriptionLineClamp = 2,
  minTitleHeight = "3rem",
  minDescriptionHeight = "3rem",
}: GradientCardProps) => {
  return (
    <BackgroundGradient 
      className={containerClassName}
      containerClassName={cn("p-[2px] rounded-xl", containerClassName)}
    >
      <Card className={cn(
        "h-full bg-card group-hover:bg-background transition-colors rounded-xl",
        className
      )}>
        <CardHeader className={headerClassName}>
          <CardTitle 
            className={cn(
              {
                [`line-clamp-${titleLineClamp}`]: !allowTitleWrap,
                [`min-h-[${minTitleHeight}]`]: !allowTitleWrap && minTitleHeight,
                "whitespace-normal": allowTitleWrap
              },
              titleClassName
            )}
          >
            {title}
          </CardTitle>
          {subtitle && (
            <CardDescription className={cn(
              "whitespace-normal",
              subtitleClassName
            )}>
              {subtitle}
            </CardDescription>
          )}
        </CardHeader>
        <CardContent className={contentClassName}>
          {description && (
            <p className={cn(
              "text-md",
              {
                [`line-clamp-${descriptionLineClamp}`]: !allowDescriptionWrap,
                [`min-h-[${minDescriptionHeight}]`]: !allowDescriptionWrap && minDescriptionHeight,
                "whitespace-normal": allowDescriptionWrap
              }
            )}>
              {description}
            </p>
          )}
          {children}
        </CardContent>
      </Card>
    </BackgroundGradient>
  );
};

export default MatrxGradientCard;