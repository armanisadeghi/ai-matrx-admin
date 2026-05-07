"use client"

import * as React from "react"
import { DayPicker } from "react-day-picker"
import { ChevronLeftIcon, ChevronRightIcon } from "@radix-ui/react-icons"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"

export type CalendarProps = React.ComponentProps<typeof DayPicker>

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-3", className)}
      classNames={{
        months: "relative flex flex-col sm:flex-row gap-4",
        month: "flex flex-col gap-4 w-full",
        month_caption: "flex justify-center pt-1 relative items-center h-9 px-8",
        caption_label:
          "px-1 text-sm font-medium inline-flex items-center gap-1",
        nav: "absolute inset-x-1 top-1 flex items-center justify-between z-10",
        button_previous: cn(
          buttonVariants({ variant: "outline" }),
          "h-7 w-7 bg-transparent p-0 opacity-60 hover:opacity-100",
        ),
        button_next: cn(
          buttonVariants({ variant: "outline" }),
          "h-7 w-7 bg-transparent p-0 opacity-60 hover:opacity-100",
        ),
        month_grid: "w-full border-collapse",
        weekdays: "flex",
        weekday:
          "text-muted-foreground rounded-md w-9 h-8 font-normal text-[0.8rem] flex items-center justify-center",
        week: "flex w-full mt-1",
        day: cn(
          "relative p-0 h-9 w-9 text-center text-sm focus-within:relative focus-within:z-20",
          "[&:has([aria-selected])]:bg-accent",
          "[&:has([aria-selected].day-outside)]:bg-accent/50",
          props.mode === "range"
            ? "[&:has(>.day-range-end)]:rounded-r-md [&:has(>.day-range-start)]:rounded-l-md first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md"
            : "[&:has([aria-selected])]:rounded-md",
        ),
        day_button: cn(
          buttonVariants({ variant: "ghost" }),
          "h-9 w-9 p-0 font-normal aria-selected:opacity-100",
        ),
        range_start: "day-range-start",
        range_end: "day-range-end",
        selected:
          "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground rounded-md",
        today: "bg-accent text-accent-foreground rounded-md",
        outside:
          "day-outside text-muted-foreground aria-selected:bg-accent/50 aria-selected:text-muted-foreground",
        disabled: "text-muted-foreground opacity-40",
        range_middle:
          "aria-selected:bg-accent aria-selected:text-accent-foreground",
        hidden: "invisible",
        dropdowns: "flex items-center gap-1.5",
        dropdown_root:
          "relative inline-flex items-center rounded-md border border-input bg-background px-2.5 py-1 text-sm font-medium hover:bg-accent has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring",
        dropdown:
          "absolute inset-0 cursor-pointer appearance-none border-0 bg-transparent text-transparent outline-none",
        years_dropdown: "",
        months_dropdown: "",
        chevron: "h-4 w-4 fill-foreground",
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation, className: chevronClassName }) => {
          if (orientation === "left") {
            return (
              <ChevronLeftIcon
                className={cn("h-4 w-4", chevronClassName)}
              />
            )
          }
          if (orientation === "right") {
            return (
              <ChevronRightIcon
                className={cn("h-4 w-4", chevronClassName)}
              />
            )
          }
          return (
            <svg
              className={cn("h-4 w-4 fill-current", chevronClassName)}
              viewBox="0 0 16 16"
              aria-hidden
            >
              <path d="M8 11L3 6h10z" />
            </svg>
          )
        },
      }}
      {...props}
    />
  )
}
Calendar.displayName = "Calendar"

export { Calendar }
