import React, { useEffect, useState } from "react";
import { ChevronDown, RotateCcw, RotateCw, Copy, Save } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { useHistoryState } from "@uidotdev/usehooks";
import { useToast } from "@/components/ui/use-toast";
import { BrokerInputProps, DataInputComponent } from "../types";

const colors = [
    "slate",
    "gray",
    "zinc",
    "neutral",
    "stone",
    "red",
    "orange",
    "amber",
    "yellow",
    "lime",
    "green",
    "emerald",
    "teal",
    "cyan",
    "sky",
    "blue",
    "indigo",
    "violet",
    "purple",
    "fuchsia",
    "pink",
    "rose",
];

const shades = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];

// Create a string of all possible color classes
// This ensures Tailwind includes all these variations in the bundle
const generateColorClasses = () => {
    const classes = [];

    for (const color of colors) {
        for (const shade of shades) {
            // Border variations
            classes.push(`border-${color}-${shade}`);
            // Background variations
            classes.push(`bg-${color}-${shade}`);
            classes.push(`hover:bg-${color}-${shade}`);
            classes.push(`dark:bg-${color}-${shade}`);
            classes.push(`dark:hover:bg-${color}-${shade}`);
            // Text variations
            classes.push(`text-${color}-${shade}`);
            classes.push(`dark:text-${color}-${shade}`);
        }
    }

    return classes.join(" ");
};

// This div will never be rendered, but its presence ensures
// that all color classes are included in the final bundle
const UnusedStylesContainer = () => <div className={generateColorClasses()} />;

const safelistClasses = {
    border: [
        "border-slate-100",
        "border-slate-200",
        "border-slate-300",
        "border-slate-400",
        "border-slate-500",
        "border-gray-100",
        "border-gray-200",
        "border-gray-300",
        "border-gray-400",
        "border-gray-500",
        "border-zinc-100",
        "border-zinc-200",
        "border-zinc-300",
        "border-zinc-400",
        "border-zinc-500",
        "border-neutral-100",
        "border-neutral-200",
        "border-neutral-300",
        "border-neutral-400",
        "border-neutral-500",
        "border-stone-100",
        "border-stone-200",
        "border-stone-300",
        "border-stone-400",
        "border-stone-500",
        "border-red-100",
        "border-red-200",
        "border-red-300",
        "border-red-400",
        "border-red-500",
        "border-orange-100",
        "border-orange-200",
        "border-orange-300",
        "border-orange-400",
        "border-orange-500",
        "border-amber-100",
        "border-amber-200",
        "border-amber-300",
        "border-amber-400",
        "border-amber-500",
        "border-yellow-100",
        "border-yellow-200",
        "border-yellow-300",
        "border-yellow-400",
        "border-yellow-500",
        "border-lime-100",
        "border-lime-200",
        "border-lime-300",
        "border-lime-400",
        "border-lime-500",
        "border-green-100",
        "border-green-200",
        "border-green-300",
        "border-green-400",
        "border-green-500",
        "border-emerald-100",
        "border-emerald-200",
        "border-emerald-300",
        "border-emerald-400",
        "border-emerald-500",
        "border-teal-100",
        "border-teal-200",
        "border-teal-300",
        "border-teal-400",
        "border-teal-500",
        "border-cyan-100",
        "border-cyan-200",
        "border-cyan-300",
        "border-cyan-400",
        "border-cyan-500",
        "border-sky-100",
        "border-sky-200",
        "border-sky-300",
        "border-sky-400",
        "border-sky-500",
        "border-blue-100",
        "border-blue-200",
        "border-blue-300",
        "border-blue-400",
        "border-blue-500",
        "border-indigo-100",
        "border-indigo-200",
        "border-indigo-300",
        "border-indigo-400",
        "border-indigo-500",
        "border-violet-100",
        "border-violet-200",
        "border-violet-300",
        "border-violet-400",
        "border-violet-500",
        "border-purple-100",
        "border-purple-200",
        "border-purple-300",
        "border-purple-400",
        "border-purple-500",
        "border-fuchsia-100",
        "border-fuchsia-200",
        "border-fuchsia-300",
        "border-fuchsia-400",
        "border-fuchsia-500",
        "border-pink-100",
        "border-pink-200",
        "border-pink-300",
        "border-pink-400",
        "border-pink-500",
        "border-rose-100",
        "border-rose-200",
        "border-rose-300",
        "border-rose-400",
        "border-rose-500",
    ],
    background: [
        "bg-slate-100",
        "bg-slate-200",
        "bg-slate-300",
        "bg-slate-400",
        "bg-slate-500",
        "bg-gray-100",
        "bg-gray-200",
        "bg-gray-300",
        "bg-gray-400",
        "bg-gray-500",
        "bg-zinc-100",
        "bg-zinc-200",
        "bg-zinc-300",
        "bg-zinc-400",
        "bg-zinc-500",
        "bg-neutral-100",
        "bg-neutral-200",
        "bg-neutral-300",
        "bg-neutral-400",
        "bg-neutral-500",
        "bg-stone-100",
        "bg-stone-200",
        "bg-stone-300",
        "bg-stone-400",
        "bg-stone-500",
        "bg-red-100",
        "bg-red-200",
        "bg-red-300",
        "bg-red-400",
        "bg-red-500",
        "bg-orange-100",
        "bg-orange-200",
        "bg-orange-300",
        "bg-orange-400",
        "bg-orange-500",
        "bg-amber-100",
        "bg-amber-200",
        "bg-amber-300",
        "bg-amber-400",
        "bg-amber-500",
        "bg-yellow-100",
        "bg-yellow-200",
        "bg-yellow-300",
        "bg-yellow-400",
        "bg-yellow-500",
        "bg-lime-100",
        "bg-lime-200",
        "bg-lime-300",
        "bg-lime-400",
        "bg-lime-500",
        "bg-green-100",
        "bg-green-200",
        "bg-green-300",
        "bg-green-400",
        "bg-green-500",
        "bg-emerald-100",
        "bg-emerald-200",
        "bg-emerald-300",
        "bg-emerald-400",
        "bg-emerald-500",
        "bg-teal-100",
        "bg-teal-200",
        "bg-teal-300",
        "bg-teal-400",
        "bg-teal-500",
        "bg-cyan-100",
        "bg-cyan-200",
        "bg-cyan-300",
        "bg-cyan-400",
        "bg-cyan-500",
        "bg-sky-100",
        "bg-sky-200",
        "bg-sky-300",
        "bg-sky-400",
        "bg-sky-500",
        "bg-blue-100",
        "bg-blue-200",
        "bg-blue-300",
        "bg-blue-400",
        "bg-blue-500",
        "bg-indigo-100",
        "bg-indigo-200",
        "bg-indigo-300",
        "bg-indigo-400",
        "bg-indigo-500",
        "bg-violet-100",
        "bg-violet-200",
        "bg-violet-300",
        "bg-violet-400",
        "bg-violet-500",
        "bg-purple-100",
        "bg-purple-200",
        "bg-purple-300",
        "bg-purple-400",
        "bg-purple-500",
        "bg-fuchsia-100",
        "bg-fuchsia-200",
        "bg-fuchsia-300",
        "bg-fuchsia-400",
        "bg-fuchsia-500",
        "bg-pink-100",
        "bg-pink-200",
        "bg-pink-300",
        "bg-pink-400",
        "bg-pink-500",
        "bg-rose-100",
        "bg-rose-200",
        "bg-rose-300",
        "bg-rose-400",
        "bg-rose-500",
    ],
    hover: [
        "hover:bg-slate-100",
        "hover:bg-slate-200",
        "hover:bg-slate-300",
        "hover:bg-slate-400",
        "hover:bg-slate-500",
        "hover:bg-gray-100",
        "hover:bg-gray-200",
        "hover:bg-gray-300",
        "hover:bg-gray-400",
        "hover:bg-gray-500",
        "hover:bg-zinc-100",
        "hover:bg-zinc-200",
        "hover:bg-zinc-300",
        "hover:bg-zinc-400",
        "hover:bg-zinc-500",
        "hover:bg-neutral-100",
        "hover:bg-neutral-200",
        "hover:bg-neutral-300",
        "hover:bg-neutral-400",
        "hover:bg-neutral-500",
        "hover:bg-stone-100",
        "hover:bg-stone-200",
        "hover:bg-stone-300",
        "hover:bg-stone-400",
        "hover:bg-stone-500",
        "hover:bg-red-100",
        "hover:bg-red-200",
        "hover:bg-red-300",
        "hover:bg-red-400",
        "hover:bg-red-500",
        "hover:bg-orange-100",
        "hover:bg-orange-200",
        "hover:bg-orange-300",
        "hover:bg-orange-400",
        "hover:bg-orange-500",
        "hover:bg-amber-100",
        "hover:bg-amber-200",
        "hover:bg-amber-300",
        "hover:bg-amber-400",
        "hover:bg-amber-500",
        "hover:bg-yellow-100",
        "hover:bg-yellow-200",
        "hover:bg-yellow-300",
        "hover:bg-yellow-400",
        "hover:bg-yellow-500",
        "hover:bg-lime-100",
        "hover:bg-lime-200",
        "hover:bg-lime-300",
        "hover:bg-lime-400",
        "hover:bg-lime-500",
        "hover:bg-green-100",
        "hover:bg-green-200",
        "hover:bg-green-300",
        "hover:bg-green-400",
        "hover:bg-green-500",
        "hover:bg-emerald-100",
        "hover:bg-emerald-200",
        "hover:bg-emerald-300",
        "hover:bg-emerald-400",
        "hover:bg-emerald-500",
        "hover:bg-teal-100",
        "hover:bg-teal-200",
        "hover:bg-teal-300",
        "hover:bg-teal-400",
        "hover:bg-teal-500",
        "hover:bg-cyan-100",
        "hover:bg-cyan-200",
        "hover:bg-cyan-300",
        "hover:bg-cyan-400",
        "hover:bg-cyan-500",
        "hover:bg-sky-100",
        "hover:bg-sky-200",
        "hover:bg-sky-300",
        "hover:bg-sky-400",
        "hover:bg-sky-500",
        "hover:bg-blue-100",
        "hover:bg-blue-200",
        "hover:bg-blue-300",
        "hover:bg-blue-400",
        "hover:bg-blue-500",
        "hover:bg-indigo-100",
        "hover:bg-indigo-200",
        "hover:bg-indigo-300",
        "hover:bg-indigo-400",
        "hover:bg-indigo-500",
        "hover:bg-violet-100",
        "hover:bg-violet-200",
        "hover:bg-violet-300",
        "hover:bg-violet-400",
        "hover:bg-violet-500",
        "hover:bg-purple-100",
        "hover:bg-purple-200",
        "hover:bg-purple-300",
        "hover:bg-purple-400",
        "hover:bg-purple-500",
        "hover:bg-fuchsia-100",
        "hover:bg-fuchsia-200",
        "hover:bg-fuchsia-300",
        "hover:bg-fuchsia-400",
        "hover:bg-fuchsia-500",
        "hover:bg-pink-100",
        "hover:bg-pink-200",
        "hover:bg-pink-300",
        "hover:bg-pink-400",
        "hover:bg-pink-500",
        "hover:bg-rose-100",
        "hover:bg-rose-200",
        "hover:bg-rose-300",
        "hover:bg-rose-400",
        "hover:bg-rose-500",
    ],
    text: [
        "text-slate-100",
        "text-slate-200",
        "text-slate-300",
        "text-slate-400",
        "text-slate-500",
        "text-gray-100",
        "text-gray-200",
        "text-gray-300",
        "text-gray-400",
        "text-gray-500",
        "text-zinc-100",
        "text-zinc-200",
        "text-zinc-300",
        "text-zinc-400",
        "text-zinc-500",
        "text-neutral-100",
        "text-neutral-200",
        "text-neutral-300",
        "text-neutral-400",
        "text-neutral-500",
        "text-stone-100",
        "text-stone-200",
        "text-stone-300",
        "text-stone-400",
        "text-stone-500",
        "text-red-100",
        "text-red-200",
        "text-red-300",
        "text-red-400",
        "text-red-500",
        "text-orange-100",
        "text-orange-200",
        "text-orange-300",
        "text-orange-400",
        "text-orange-500",
        "text-amber-100",
        "text-amber-200",
        "text-amber-300",
        "text-amber-400",
        "text-amber-500",
        "text-yellow-100",
        "text-yellow-200",
        "text-yellow-300",
        "text-yellow-400",
        "text-yellow-500",
        "text-lime-100",
        "text-lime-200",
        "text-lime-300",
        "text-lime-400",
        "text-lime-500",
        "text-green-100",
        "text-green-200",
        "text-green-300",
        "text-green-400",
        "text-green-500",
        "text-emerald-100",
        "text-emerald-200",
        "text-emerald-300",
        "text-emerald-400",
        "text-emerald-500",
        "text-teal-100",
        "text-teal-200",
        "text-teal-300",
        "text-teal-400",
        "text-teal-500",
        "text-cyan-100",
        "text-cyan-200",
        "text-cyan-300",
        "text-cyan-400",
        "text-cyan-500",
        "text-sky-100",
        "text-sky-200",
        "text-sky-300",
        "text-sky-400",
        "text-sky-500",
        "text-blue-100",
        "text-blue-200",
        "text-blue-300",
        "text-blue-400",
        "text-blue-500",
        "text-indigo-100",
        "text-indigo-200",
        "text-indigo-300",
        "text-indigo-400",
        "text-indigo-500",
        "text-violet-100",
        "text-violet-200",
        "text-violet-300",
        "text-violet-400",
        "text-violet-500",
        "text-purple-100",
        "text-purple-200",
        "text-purple-300",
        "text-purple-400",
        "text-purple-500",
        "text-fuchsia-100",
        "text-fuchsia-200",
        "text-fuchsia-300",
        "text-fuchsia-400",
        "text-fuchsia-500",
        "text-pink-100",
        "text-pink-200",
        "text-pink-300",
        "text-pink-400",
        "text-pink-500",
        "text-rose-100",
        "text-rose-200",
        "text-rose-300",
        "text-rose-400",
        "text-rose-500",
    ],
    dark: [
        "dark:border-slate-100",
        "dark:border-slate-200",
        "dark:border-slate-300",
        "dark:border-slate-400",
        "dark:border-slate-500",
        "dark:border-red-500",
        "dark:border-red-600",
        "dark:border-red-700",
        "dark:border-red-800",
        "dark:border-red-900",
        "dark:border-red-1000",
        
        "dark:bg-slate-100",
        "dark:bg-slate-200",
        "dark:bg-slate-300",
        "dark:bg-slate-400",
        "dark:bg-slate-500",
        "dark:bg-red-500",
        "dark:bg-red-600",
        "dark:bg-red-700",
        "dark:bg-red-800",
        "dark:bg-red-900",
        "dark:bg-red-1000",
        "dark:text-slate-100",
        "dark:text-slate-200",
        "dark:text-slate-300",
        "dark:text-slate-400",
        "dark:text-slate-500",
        "dark:hover:bg-slate-100",
        "dark:hover:bg-slate-200",
        "dark:hover:bg-slate-300",
        "dark:hover:bg-slate-400",
        "dark:hover:bg-slate-500",
        "dark:text-gray-100",
        "dark:text-gray-200",
        "dark:text-gray-300",
        "dark:text-gray-400",
        "dark:text-gray-500",
        "dark:hover:bg-gray-100",
        "dark:hover:bg-gray-200",
        "dark:hover:bg-gray-300",
        "dark:hover:bg-gray-400",
        "dark:hover:bg-gray-500",
        "dark:text-zinc-100",
        "dark:text-zinc-200",
        "dark:text-zinc-300",
        "dark:text-zinc-400",
        "dark:text-zinc-500",
        "dark:hover:bg-zinc-100",
        "dark:hover:bg-zinc-200",
        "dark:hover:bg-zinc-300",
        "dark:hover:bg-zinc-400",
        "dark:hover:bg-zinc-500",
        "dark:text-neutral-100",
        "dark:text-neutral-200",
        "dark:text-neutral-300",
        "dark:text-neutral-400",
        "dark:text-neutral-500",
        "dark:hover:bg-neutral-100",
        "dark:hover:bg-neutral-200",
        "dark:hover:bg-neutral-300",
        "dark:hover:bg-neutral-400",
        "dark:hover:bg-neutral-500",
        "dark:text-stone-100",
        "dark:text-stone-200",
        "dark:text-stone-300",
        "dark:text-stone-400",
        "dark:text-stone-500",
        "dark:hover:bg-stone-100",
        "dark:hover:bg-stone-200",
        "dark:hover:bg-stone-300",
        "dark:hover:bg-stone-400",
        "dark:hover:bg-stone-500",
    ],
};

const SafelistComponent = () => <div className={Object.values(safelistClasses).flat().join(" ")} />;

export const withComponentWrapperForCreation = <P extends object>(
    WrappedComponent: React.ComponentType<
        P & {
            value: any;
            onChange: (value: any) => void;
            inputComponent: DataInputComponent;
        }
    >
) => {
    return function BrokerInput({
        className,
        inputComponent,
        ...props
    }: BrokerInputProps & Omit<P, "value" | "onChange" | "broker" | "inputComponent">) {
        const [originalValue, setOriginalValue] = useState<any>(null);
        const allclassnames = generateColorClasses() + SafelistComponent();

        const { toast } = useToast();
        const hasDescription = inputComponent?.description && inputComponent.description.length > 0;

        const showCopy = inputComponent?.additionalParams?.copy !== false;
        const showHistory = inputComponent?.additionalParams?.history !== false;
        const showSave = inputComponent?.additionalParams?.save !== false;

        const { state: value, set: setValue, undo, redo, canUndo, canRedo } = useHistoryState(originalValue);

        useEffect(() => {
            setOriginalValue(value);
        }, [value, setOriginalValue]);

        useEffect(() => {
            const handleKeyDown = (e: KeyboardEvent) => {
                if ((e.metaKey || e.ctrlKey) && e.key === "z") {
                    if (e.shiftKey && canRedo) {
                        e.preventDefault();
                        redo();
                    } else if (canUndo) {
                        e.preventDefault();
                        undo();
                    }
                }
            };

            window.addEventListener("keydown", handleKeyDown);
            return () => window.removeEventListener("keydown", handleKeyDown);
        }, [undo, redo, canUndo, canRedo]);

        const handleCopy = async () => {
            try {
                const textToCopy = typeof value === "string" ? value : JSON.stringify(value, null, 2);

                await navigator.clipboard.writeText(textToCopy);
                toast({
                    title: "Copied!",
                    description: "Value copied to clipboard",
                    duration: 2000,
                });
            } catch (err) {
                toast({
                    title: "Error",
                    description: "Failed to copy to clipboard",
                    variant: "destructive",
                    duration: 2000,
                });
            }
        };

        const handleSave = () => {
            console.log("handleSave");
        };

        const containerBaseClasses =
            "grid flex flex-col w-full h-full pb-2 space-y-1 rounded-t-2xl rounded-b-lg border border-blue-100 dark:border-blue-600";
        const collapsibleBaseClasses = "w-full pr-2 bg-blue-100 dark:bg-blue-600 hover:bg-blue-200 dark:hover:bg-blue-700 rounded-t-xl";
        const labelBaseClasses = "text-base pt-1 min-h-6 cursor-pointer select-none ";
        const descriptionBaseClasses = "pt-2 pb-2 px-7 text-md text-accent-foreground bg-blue-500";
        const mainComponentBaseClasses = "w-full h-full px-4";
        const headerClasses = "flex items-center w-full";
        const clickableAreaClasses =
            "flex-1 flex items-center justify-between hover:text-accent-foreground rounded-sm cursor-pointer pr-2 pl-3 py-1";
        const controlsClasses = "flex items-center space-x-2 ml-2";
        const iconClasses = "h-4 w-4 shrink-0 text-muted-foreground cursor-pointer hover:text-foreground transition-colors";
        const disabledIconClasses = "opacity-40 cursor-not-allowed hover:text-muted-foreground";

        if (!inputComponent) {
            return null;
        }

        return (
            <div className={cn(containerBaseClasses, inputComponent?.containerClassName || "", className)}>
                <Collapsible className={cn(collapsibleBaseClasses, inputComponent?.collapsibleClassName || "")}>
                    <div className={headerClasses}>
                        {hasDescription ? (
                            <CollapsibleTrigger className="flex-1">
                                <div className={clickableAreaClasses}>
                                    <Label className={cn(labelBaseClasses, inputComponent?.labelClassName || "")}>
                                        Broker Name Displayed Here
                                    </Label>
                                    <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 [data-state=open]:rotate-180" />
                                </div>
                            </CollapsibleTrigger>
                        ) : (
                            <div className={clickableAreaClasses}>
                                <Label className={cn(labelBaseClasses, inputComponent?.labelClassName || "")}>{inputComponent.name}</Label>
                            </div>
                        )}

                        <div className={controlsClasses}>
                            {showSave && <Save className={iconClasses} onClick={handleSave} />}
                            {showCopy && <Copy className={iconClasses} onClick={handleCopy} />}
                            {showHistory && (
                                <>
                                    <RotateCcw
                                        className={cn(iconClasses, !canUndo && disabledIconClasses)}
                                        onClick={() => canUndo && undo()}
                                    />
                                    <RotateCw
                                        className={cn(iconClasses, !canRedo && disabledIconClasses)}
                                        onClick={() => canRedo && redo()}
                                    />
                                </>
                            )}
                        </div>
                    </div>

                    {hasDescription && (
                        <CollapsibleContent className="w-full overflow-hidden data-[state=open]:animate-slide-down data-[state=closed]:animate-slide-up">
                            <div className={cn(descriptionBaseClasses, inputComponent?.descriptionClassName || "")}>
                                {inputComponent.description}
                            </div>
                        </CollapsibleContent>
                    )}
                </Collapsible>

                <WrappedComponent
                    className={cn(mainComponentBaseClasses, inputComponent?.componentClassName || "")}
                    value={value}
                    onChange={setValue}
                    inputComponent={inputComponent}
                    {...(props as P)}
                />
                <div className={Object.values(allclassnames).flat().join(" ")} />
                <div className={Object.values(generateColorClasses).flat().join(" ")} />
                <div className={Object.values(SafelistComponent).flat().join(" ")} />
                <UnusedStylesContainer />
            </div>
        );
    };
};
