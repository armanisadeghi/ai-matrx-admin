import {useAppDispatch} from "@/lib/redux/hooks";
import React from "react";
import {
    Button, Collapsible,
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuTrigger,
    Sheet,
    HoverCard,
    HoverCardContent,
    HoverCardTrigger,
    ContextMenu,
    ContextMenuContent,
    ContextMenuTrigger,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
    Tooltip,
    TooltipContent,
    TooltipTrigger,
     Switch,
    TooltipProvider
} from "@/components/ui";
import {Popover, PopoverContent, PopoverTrigger} from "@/components/ui/popover";
import {PRESENTATION_TYPES, TRIGGER_TYPES} from "../action-config";
import {Link} from "lucide-react";
import {BottomDrawer, CenterDrawer, SideDrawer} from "@/components/matrx/ArmaniForm/field-components/EntityDrawer";
import { EntityDropdownMenu } from "@/components/matrx/ArmaniForm/field-components/EntityDropdownMenu";
import {cn} from "@/utils/cn";

type TriggerVariant = "default" | "primary" | "destructive" | "outline" | "secondary" | "ghost" | "link";
type TooltipSide = "top" | "right" | "bottom" | "left";

const PresentationSystem = {
    [PRESENTATION_TYPES.MODAL]: ({trigger, content, containerProps}) => {
        const {onActionComplete, ...restContainerProps} = containerProps;

        return (
            <Dialog onOpenChange={(isOpen) => onActionComplete?.(isOpen)}>
                <DialogTrigger asChild>{trigger}</DialogTrigger>
                <DialogContent {...restContainerProps}>
                    {restContainerProps.title && (
                        <DialogHeader>
                            <DialogTitle>{restContainerProps.title}</DialogTitle>
                        </DialogHeader>
                    )}
                    {content}
                </DialogContent>
            </Dialog>
        );
    },
    [PRESENTATION_TYPES.SHEET]: ({trigger, content, containerProps}) => {
        const {onActionComplete, ...restContainerProps} = containerProps;

        return (
            <Sheet onOpenChange={(isOpen) => onActionComplete?.(isOpen)}>{/* Trigger on close */}
                <SheetTrigger asChild>{trigger}</SheetTrigger>
                <SheetContent {...restContainerProps}>
                    {restContainerProps.title && (
                        <SheetHeader>
                            <SheetTitle>{restContainerProps.title}</SheetTitle>
                        </SheetHeader>
                    )}
                    {content}
                </SheetContent>
            </Sheet>
        );
    },
    [PRESENTATION_TYPES.POPOVER]: ({trigger, content, containerProps}) => {
        const {onActionComplete, ...restContainerProps} = containerProps;

        return (
            <Popover>
                <PopoverTrigger asChild>{trigger}</PopoverTrigger>
                <PopoverContent
                    {...restContainerProps}
                    onClose={onActionComplete} // Trigger on close
                >
                    {content}
                </PopoverContent>
            </Popover>
        );
    },
    [PRESENTATION_TYPES.INLINE]: ({trigger, content, containerProps}) => {
        const {onActionComplete, ...restContainerProps} = containerProps;

        return (
            <div {...restContainerProps}>
                {trigger}
                <div className="mt-2">
                    {content}
                </div>
                {onActionComplete && (
                    <button
                        onClick={onActionComplete}
                        className="hidden"
                        aria-hidden="true"
                    />
                )}
            </div>
        );
    },
    [PRESENTATION_TYPES.DROPDOWN]: ({trigger, content, containerProps}) => (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
            <DropdownMenuContent {...containerProps}>
                {content}
            </DropdownMenuContent>
        </DropdownMenu>
    ),

    [PRESENTATION_TYPES.TOOLTIP]: ({trigger, content, containerProps}) => (
        <Tooltip>
            <TooltipTrigger asChild>{trigger}</TooltipTrigger>
            <TooltipContent {...containerProps}>
                {content}
            </TooltipContent>
        </Tooltip>
    ),

    [PRESENTATION_TYPES.DRAWER]: ({trigger, content, containerProps}) => {
        const {onActionComplete, ...rest} = containerProps;
        return (
            <SideDrawer
                trigger={trigger}
                onOpenChange={onActionComplete}
                {...rest}
            >
                {content}
            </SideDrawer>
        );
    },
    [PRESENTATION_TYPES.DRAWER_BOTTOM]: ({trigger, content, containerProps}) => {
        const {onActionComplete, ...rest} = containerProps;
        return (
            <BottomDrawer
                trigger={trigger}
                onOpenChange={onActionComplete}
                {...rest}
            >
                {content}
            </BottomDrawer>
        );
    },

    [PRESENTATION_TYPES.DRAWER_SIDE]: ({trigger, content, containerProps}) => {
        const {onActionComplete, ...rest} = containerProps;
        return (
            <SideDrawer
                trigger={trigger}
                onOpenChange={onActionComplete}
                {...rest}
            >
                {content}
            </SideDrawer>
        );
    },

    [PRESENTATION_TYPES.DRAWER_CENTER]: ({trigger, content, containerProps}) => {
        const {onActionComplete, ...rest} = containerProps;
        return (
            <CenterDrawer
                trigger={trigger}
                onOpenChange={onActionComplete}
                {...rest}
            >
                {content}
            </CenterDrawer>
        );
    },
    [PRESENTATION_TYPES.COLLAPSE]: ({trigger, content, containerProps}) => {
        const [isOpen, setIsOpen] = React.useState(false);
        return (
            <div {...containerProps}>
                <div onClick={() => setIsOpen(!isOpen)}>{trigger}</div>
                <Collapsible open={isOpen}>
                    {content}
                </Collapsible>
            </div>
        );
    },

    [PRESENTATION_TYPES.HOVER_CARD]: ({trigger, content, containerProps}) => (
        <HoverCard>
            <HoverCardTrigger asChild>{trigger}</HoverCardTrigger>
            <HoverCardContent {...containerProps}>
                {content}
            </HoverCardContent>
        </HoverCard>
    ),

    [PRESENTATION_TYPES.CONTEXT_MENU]: ({trigger, content, containerProps}) => (
        <ContextMenu>
            <ContextMenuTrigger asChild>{trigger}</ContextMenuTrigger>
            <ContextMenuContent {...containerProps}>
                {content}
            </ContextMenuContent>
        </ContextMenu>
    ),
};


// Trigger System
// @ts-ignore
// @ts-ignore
// @ts-ignore
const TriggerSystem = {
    [TRIGGER_TYPES.BUTTON]: ({icon: Icon, label, onClick, className}) => (
        <Button
            variant="ghost"
            size="sm"
            className={className}
            onClick={onClick}
        >
            {Icon && <Icon className="w-4 h-4"/>}
            {label}
        </Button>
    ),

    [TRIGGER_TYPES.ICON]: ({icon: Icon, onClick, className}) => (
        <Button
            variant="ghost"
            size="sm"
            className={`h-8 w-8 p-0 ${className}`}
            onClick={onClick}
        >
            <Icon className="w-4 h-4"/>
        </Button>
    ),

    [TRIGGER_TYPES.LINK]: ({icon: Icon, label, onClick, className}) => (
        <Link
            className={`flex items-center gap-2 ${className}`}
            onClick={onClick}
        >
            {Icon && <Icon className="w-4 h-4"/>}
            {label}
        </Link>
    ),

    [TRIGGER_TYPES.TEXT]: ({icon: Icon, label, onClick, className}) => (
        <span
            className={`cursor-pointer ${className}`}
            onClick={onClick}
        >
            {Icon && <Icon className="w-4 h-4"/>}
            {label}
        </span>
    ),
    [TRIGGER_TYPES.CHIP]: ({icon: Icon, label, onClick, className}) => (
        <div
            className={`inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gray-100 hover:bg-gray-200 cursor-pointer ${className}`}
            onClick={onClick}
        >
            {Icon && <Icon className="w-4 h-4"/>}
            {label}
        </div>
    ),

    [TRIGGER_TYPES.BADGE]: ({icon: Icon, label, onClick, className}) => (
        <div
            className={`inline-flex items-center gap-1 px-2 py-1 text-xs rounded-md bg-primary-100 text-primary-800 cursor-pointer ${className}`}
            onClick={onClick}
        >
            {Icon && <Icon className="w-3 h-3"/>}
            {label}
        </div>
    ),

    [TRIGGER_TYPES.CARD]: ({icon: Icon, label, onClick, className, children}) => (
        <div
            className={`p-4 rounded-lg border hover:shadow-md transition-shadow cursor-pointer ${className}`}
            onClick={onClick}
        >
            <div className="flex items-center gap-2 mb-2">
                {Icon && <Icon className="w-5 h-5"/>}
                {label}
            </div>
            {children}
        </div>
    ),

    [TRIGGER_TYPES.FLOATING_BUTTON]: ({icon: Icon, label, onClick, className}) => (
        <Button
            className={`fixed bottom-4 right-4 rounded-full shadow-lg ${className}`}
            onClick={onClick}
        >
            {Icon && <Icon className="w-5 h-5"/>}
            {label}
        </Button>
    ),

    [TRIGGER_TYPES.TOGGLE]: ({icon: Icon, label, checked, onChange, className}) => (
        <div
            className={`flex items-center gap-2 ${className}`}
            onClick={() => onChange(!checked)}
        >
            <Switch checked={checked} onChange={onChange}/>
            {Icon && <Icon className="w-4 h-4"/>}
            {label}
        </div>
    ),

    [TRIGGER_TYPES.DROPDOWN]: (
        {
            icon: Icon,
            label = 'Menu',
            options = [],
            className,
            triggerVariant = 'ghost' as TriggerVariant,
            menuLabel,
        }) => (
        <EntityDropdownMenu
            triggerText={label}
            triggerVariant={triggerVariant}
            label={menuLabel}
            className={className}
            trigger={
                Icon && (
                    <Button variant={triggerVariant} className="flex items-center gap-2">
                        <Icon className="w-4 h-4"/>
                        {label}
                    </Button>
                )
            }
            items={options.map(option => ({
                label: option.label,
                onClick: () => option.onClick?.(option.value),
                disabled: option.disabled,
            }))}
        />
    ),
    [TRIGGER_TYPES.DROPDOWN_BASIC]: (
        {
            icon: Icon,
            label = 'Menu',
            options = [],
            className,
            triggerVariant = 'ghost' as TriggerVariant,
            menuLabel,
        }) => (
        <EntityDropdownMenu
            triggerText={label}
            triggerVariant={triggerVariant}
            label={menuLabel}
            className={className}
            trigger={
                Icon && (
                    <Button variant={triggerVariant} className="flex items-center gap-2">
                        <Icon className="w-4 h-4"/>
                        {label}
                    </Button>
                )
            }
            items={options.map(option => ({
                label: option.label,
                onClick: () => option.onClick?.(option.value),
                disabled: option.disabled,
            }))}
        />
    ),
    [TRIGGER_TYPES.DROPDOWN_CHECKBOX]: (
        {
            icon: Icon,
            label = 'Options',
            options = [],
            className,
            triggerVariant = 'ghost' as TriggerVariant,
            menuLabel,
        }) => (
        <EntityDropdownMenu
            triggerText={label}
            triggerVariant={triggerVariant}
            label={menuLabel}
            className={className}
            trigger={
                Icon && (
                    <Button variant={triggerVariant} className="flex items-center gap-2">
                        <Icon className="w-4 h-4"/>
                        {label}
                    </Button>
                )
            }
            checkboxItems={options.map(option => ({
                label: option.label,
                checked: option.checked || false,
                onCheckedChange: option.onCheckedChange,
                disabled: option.disabled,
            }))}
        />
    ),

    [TRIGGER_TYPES.DROPDOWN_RADIO]: (
        {
            icon: Icon,
            label = 'Select',
            options = [],
            value,
            onValueChange,
            className,
            triggerVariant = 'ghost' as TriggerVariant,
            menuLabel,
        }) => (
        <EntityDropdownMenu
            triggerText={label}
            triggerVariant={triggerVariant}
            label={menuLabel}
            className={className}
            trigger={
                Icon && (
                    <Button variant={triggerVariant} className="flex items-center gap-2">
                        <Icon className="w-4 h-4"/>
                        {label}
                    </Button>
                )
            }
            radioGroup={{
                name: label,
                value: value || options[0]?.value || '',
                onValueChange: onValueChange || (() => {
                }),
                options: options.map(option => ({
                    label: option.label,
                    value: option.value,
                    disabled: option.disabled,
                })),
            }}
        />
    ),

    [TRIGGER_TYPES.IMAGE]: ({src, alt, onClick, className}) => (
        <img
            src={src}
            alt={alt}
            className={`cursor-pointer ${className}`}
            onClick={onClick}
        />
    ),

    [TRIGGER_TYPES.TOOLTIP]: ({icon: Icon, label, tooltip, onClick, className, side = "top" as TooltipSide}) => (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <div
                        className={cn(
                            "cursor-pointer inline-flex items-center gap-2",
                            className
                        )}
                        onClick={onClick}
                    >
                        {Icon && <Icon className="w-4 h-4"/>}
                        {label}
                    </div>
                </TooltipTrigger>
                <TooltipContent
                    side={side}
                    sideOffset={4}
                >
                    {tooltip}
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    ),
    [TRIGGER_TYPES.TAB]: ({icon: Icon, label, active, onClick, className}) => (
        <div
            className={`px-4 py-2 cursor-pointer border-b-2 ${
                active ? 'border-primary-500 text-primary-500' : 'border-transparent'
            } ${className}`}
            onClick={onClick}
        >
            <div className="flex items-center gap-2">
                {Icon && <Icon className="w-4 h-4"/>}
                {label}
            </div>
        </div>
    ),

    [TRIGGER_TYPES.CUSTOM]: ({component}) => component,
};

const ActionPresentation = ({action, field, value, onChange, actionProps, onActionComplete}) => {
    const dispatch = useAppDispatch();
    const Trigger = TriggerSystem[action.triggerType];
    const Presentation = PresentationSystem[action.presentation];

  const handleActionResult = (result) => {
    if (action.props.setFieldValue) {
      action.props.setFieldValue(result);
    }
  };

    const triggerProps = {
        icon: action.icon,
        label: action.label,
    onClick: () => {
      // Pass current field value to action handler
      const currentValue = action.props.getFieldValue?.();
      action.handleAction?.(field, currentValue);
    },
        className: "h-8 px-2 text-muted-foreground hover:text-foreground hover:bg-accent/50 border border-border rounded-md flex items-center gap-1",
    };

    const ActionComponent = action.component;

    const componentProps = {
        field,
        value,
        onChange,
    onResult: handleActionResult,
    initialSearch: action.props.getFieldValue?.(),
    ...action.props,
    ...actionProps
    };

    const containerProps = {
        ...action.containerProps,
    // Wrap onActionComplete to handle results
    onActionComplete: (isOpen, result) => {
      if (!isOpen && result) {
        handleActionResult(result);
      }
      onActionComplete?.(isOpen, result);
    }
    };

    return (
        <Presentation
            trigger={<Trigger {...triggerProps} />}
            content={ActionComponent ? <ActionComponent {...componentProps} /> : null}
            containerProps={containerProps}
        />
    );
};

export default ActionPresentation;
