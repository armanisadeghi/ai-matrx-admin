/**
 * Type Definitions for Monaco Editor
 * Provides IntelliSense for commonly used libraries in Prompt Apps
 */

/**
 * React core type definitions
 */
export const reactTypes = `
declare module 'react' {
  export interface ReactElement<P = any, T = any> {
    type: T;
    props: P;
    key: string | number | null;
  }

  export interface ReactNode {}
  export type FC<P = {}> = (props: P) => ReactElement | null;
  export type ComponentType<P = {}> = FC<P>;

  export function useState<T>(initialState: T | (() => T)): [T, (newState: T | ((prevState: T) => T)) => void];
  export function useEffect(effect: () => void | (() => void), deps?: readonly any[]): void;
  export function useCallback<T extends Function>(callback: T, deps: readonly any[]): T;
  export function useMemo<T>(factory: () => T, deps: readonly any[]): T;
  export function useRef<T>(initialValue: T): { current: T };
  export function useContext<T>(context: Context<T>): T;
  export function useReducer<R extends Reducer<any, any>>(
    reducer: R,
    initialState: ReducerState<R>,
    initializer?: undefined
  ): [ReducerState<R>, Dispatch<ReducerAction<R>>];

  export interface Context<T> {
    Provider: ComponentType<{ value: T; children?: ReactNode }>;
    Consumer: ComponentType<{ children: (value: T) => ReactNode }>;
  }

  export interface FormEvent<T = Element> {
    preventDefault(): void;
    stopPropagation(): void;
    target: EventTarget & T;
    currentTarget: EventTarget & T;
  }

  export interface ChangeEvent<T = Element> extends FormEvent<T> {
    target: EventTarget & T;
  }

  export interface MouseEvent<T = Element> {
    preventDefault(): void;
    stopPropagation(): void;
    clientX: number;
    clientY: number;
    button: number;
  }

  export interface KeyboardEvent<T = Element> {
    key: string;
    keyCode: number;
    preventDefault(): void;
    stopPropagation(): void;
  }

  export interface CSSProperties {
    [key: string]: string | number | undefined;
  }

  export interface HTMLAttributes<T> {
    className?: string;
    style?: CSSProperties;
    children?: ReactNode;
    onClick?: (event: MouseEvent<T>) => void;
    onChange?: (event: ChangeEvent<T>) => void;
    onSubmit?: (event: FormEvent<T>) => void;
    id?: string;
    key?: string | number;
  }

  export type Dispatch<A> = (value: A) => void;
  export type Reducer<S, A> = (prevState: S, action: A) => S;
  export type ReducerState<R extends Reducer<any, any>> = R extends Reducer<infer S, any> ? S : never;
  export type ReducerAction<R extends Reducer<any, any>> = R extends Reducer<any, infer A> ? A : never;

  // Export React namespace for usage like React.FC, React.FormEvent, etc.
  namespace React {
    export type {
      ReactElement,
      ReactNode,
      FC,
      ComponentType,
      Context,
      FormEvent,
      ChangeEvent,
      MouseEvent,
      KeyboardEvent,
      CSSProperties,
      HTMLAttributes,
      Dispatch,
      Reducer,
      ReducerState,
      ReducerAction
    };
    export {
      useState,
      useEffect,
      useCallback,
      useMemo,
      useRef,
      useContext,
      useReducer
    };
  }

  export default React;
}
`;

/**
 * Lucide React icon type definitions
 */
export const lucideReactTypes = `
declare module 'lucide-react' {
  import { FC } from 'react';

  export interface LucideProps {
    color?: string;
    size?: string | number;
    strokeWidth?: string | number;
    className?: string;
    absoluteStrokeWidth?: boolean;
  }

  export type LucideIcon = FC<LucideProps>;

  // Common icons used in prompt apps
  export const Loader2: LucideIcon;
  export const Sparkles: LucideIcon;
  export const AlertCircle: LucideIcon;
  export const CheckCircle: LucideIcon;
  export const CheckCircle2: LucideIcon;
  export const Info: LucideIcon;
  export const AlertTriangle: LucideIcon;
  export const X: LucideIcon;
  export const Check: LucideIcon;
  export const ChevronDown: LucideIcon;
  export const ChevronUp: LucideIcon;
  export const ChevronLeft: LucideIcon;
  export const ChevronRight: LucideIcon;
  export const Search: LucideIcon;
  export const Settings: LucideIcon;
  export const User: LucideIcon;
  export const Mail: LucideIcon;
  export const Lock: LucideIcon;
  export const Eye: LucideIcon;
  export const EyeOff: LucideIcon;
  export const Menu: LucideIcon;
  export const MoreVertical: LucideIcon;
  export const MoreHorizontal: LucideIcon;
  export const Plus: LucideIcon;
  export const Minus: LucideIcon;
  export const Edit: LucideIcon;
  export const Trash: LucideIcon;
  export const Download: LucideIcon;
  export const Upload: LucideIcon;
  export const Send: LucideIcon;
  export const Save: LucideIcon;
  export const Copy: LucideIcon;
  export const ExternalLink: LucideIcon;
  export const RefreshCw: LucideIcon;
  export const Calendar: LucideIcon;
  export const Clock: LucideIcon;
  export const Heart: LucideIcon;
  export const Star: LucideIcon;
  export const Home: LucideIcon;
  export const FileText: LucideIcon;
  export const Image: LucideIcon;
  export const Video: LucideIcon;
  export const Music: LucideIcon;
  export const Folder: LucideIcon;
  export const File: LucideIcon;
  export const Zap: LucideIcon;
  export const TrendingUp: LucideIcon;
  export const TrendingDown: LucideIcon;
  export const DollarSign: LucideIcon;
  export const BarChart: LucideIcon;
  export const PieChart: LucideIcon;
  export const Activity: LucideIcon;
  export const Users: LucideIcon;
  export const UserPlus: LucideIcon;
  export const UserMinus: LucideIcon;
  export const UserCheck: LucideIcon;
  export const Bell: LucideIcon;
  export const BellOff: LucideIcon;
  export const MessageSquare: LucideIcon;
  export const MessageCircle: LucideIcon;
  export const ArrowRight: LucideIcon;
  export const ArrowLeft: LucideIcon;
  export const ArrowUp: LucideIcon;
  export const ArrowDown: LucideIcon;
  export const BookOpen: LucideIcon;
  export const Brain: LucidIcon;
  export const GraduationCap: LucideIcon;
}
`;

/**
 * ShadCN UI Component type definitions
 */
export const uiComponentTypes = `
declare module '@/components/ui/button' {
  import { FC, ReactNode } from 'react';

  export interface ButtonProps {
    variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
    size?: 'default' | 'sm' | 'lg' | 'icon';
    asChild?: boolean;
    className?: string;
    children?: ReactNode;
    disabled?: boolean;
    onClick?: (event: any) => void;
    type?: 'button' | 'submit' | 'reset';
    id?: string;
    form?: string;
    name?: string;
    value?: string;
    autoFocus?: boolean;
    tabIndex?: number;
    'aria-label'?: string;
    'aria-labelledby'?: string;
    'aria-describedby'?: string;
  }

  export const Button: FC<ButtonProps>;
}

declare module '@/components/ui/input' {
  import { FC } from 'react';

  export interface InputProps {
    className?: string;
    type?: 'text' | 'password' | 'email' | 'number' | 'tel' | 'url' | 'search' | 'date' | 'time' | 'datetime-local' | 'month' | 'week' | 'color' | string;
    placeholder?: string;
    value?: string | number;
    onChange?: (event: any) => void;
    onBlur?: (event: any) => void;
    onFocus?: (event: any) => void;
    disabled?: boolean;
    readOnly?: boolean;
    required?: boolean;
    id?: string;
    name?: string;
    autoComplete?: string;
    autoFocus?: boolean;
    maxLength?: number;
    minLength?: number;
    pattern?: string;
    min?: number | string;
    max?: number | string;
    step?: number | string;
    'aria-label'?: string;
    'aria-labelledby'?: string;
    'aria-describedby'?: string;
  }

  export const Input: FC<InputProps>;
}

declare module '@/components/ui/textarea' {
  import { FC } from 'react';

  export interface TextareaProps {
    className?: string;
    placeholder?: string;
    value?: string;
    onChange?: (event: any) => void;
    onBlur?: (event: any) => void;
    onFocus?: (event: any) => void;
    disabled?: boolean;
    readOnly?: boolean;
    required?: boolean;
    rows?: number;
    cols?: number;
    id?: string;
    name?: string;
    autoComplete?: string;
    autoFocus?: boolean;
    maxLength?: number;
    minLength?: number;
    wrap?: 'soft' | 'hard' | 'off';
    'aria-label'?: string;
    'aria-labelledby'?: string;
    'aria-describedby'?: string;
  }

  export const Textarea: FC<TextareaProps>;
}

declare module '@/components/ui/card' {
  import { FC, ReactNode, HTMLAttributes } from 'react';

  export interface CardProps extends HTMLAttributes<HTMLDivElement> {
    className?: string;
    children?: ReactNode;
  }

  export const Card: FC<CardProps>;
  export const CardHeader: FC<CardProps>;
  export const CardTitle: FC<CardProps>;
  export const CardDescription: FC<CardProps>;
  export const CardContent: FC<CardProps>;
  export const CardFooter: FC<CardProps>;
}

declare module '@/components/ui/label' {
  import { FC, ReactNode, LabelHTMLAttributes } from 'react';

  export interface LabelProps extends LabelHTMLAttributes<HTMLLabelElement> {
    className?: string;
    htmlFor?: string;
    children?: ReactNode;
  }

  export const Label: FC<LabelProps>;
}

declare module '@/components/ui/select' {
  import { FC, ReactNode } from 'react';

  export interface SelectProps {
    value?: string;
    onValueChange?: (value: string) => void;
    disabled?: boolean;
    children?: ReactNode;
  }

  export interface SelectTriggerProps {
    className?: string;
    id?: string;
    children?: ReactNode;
  }

  export interface SelectContentProps {
    children?: ReactNode;
    className?: string;
  }

  export interface SelectItemProps {
    value: string;
    children?: ReactNode;
    className?: string;
  }

  export interface SelectValueProps {
    placeholder?: string;
  }

  export const Select: FC<SelectProps>;
  export const SelectTrigger: FC<SelectTriggerProps>;
  export const SelectValue: FC<SelectValueProps>;
  export const SelectContent: FC<SelectContentProps>;
  export const SelectItem: FC<SelectItemProps>;
  export const SelectGroup: FC<{ children?: ReactNode }>;
  export const SelectLabel: FC<{ children?: ReactNode }>;
}

declare module '@/components/ui/slider' {
  import { FC } from 'react';

  export interface SliderProps {
    value?: number[];
    onValueChange?: (value: number[]) => void;
    min?: number;
    max?: number;
    step?: number;
    disabled?: boolean;
    className?: string;
  }

  export const Slider: FC<SliderProps>;
}

declare module '@/components/ui/alert' {
  import { FC, ReactNode, HTMLAttributes } from 'react';

  export interface AlertProps extends HTMLAttributes<HTMLDivElement> {
    className?: string;
    variant?: 'default' | 'destructive';
    children?: ReactNode;
  }

  export const Alert: FC<AlertProps>;
  export const AlertTitle: FC<{ children?: ReactNode; className?: string }>;
  export const AlertDescription: FC<{ children?: ReactNode; className?: string }>;
}

declare module '@/components/ui/badge' {
  import { FC, ReactNode, HTMLAttributes } from 'react';

  export interface BadgeProps extends HTMLAttributes<HTMLDivElement> {
    className?: string;
    variant?: 'default' | 'secondary' | 'destructive' | 'outline';
    children?: ReactNode;
  }

  export const Badge: FC<BadgeProps>;
}

declare module '@/components/ui/checkbox' {
  import { FC } from 'react';

  export interface CheckboxProps {
    checked?: boolean;
    onCheckedChange?: (checked: boolean) => void;
    disabled?: boolean;
    id?: string;
    className?: string;
  }

  export const Checkbox: FC<CheckboxProps>;
}

declare module '@/components/ui/switch' {
  import { FC } from 'react';

  export interface SwitchProps {
    checked?: boolean;
    onCheckedChange?: (checked: boolean) => void;
    disabled?: boolean;
    id?: string;
    className?: string;
  }

  export const Switch: FC<SwitchProps>;
}

declare module '@/components/ui/tabs' {
  import { FC, ReactNode } from 'react';

  export interface TabsProps {
    value?: string;
    onValueChange?: (value: string) => void;
    defaultValue?: string;
    className?: string;
    children?: ReactNode;
  }

  export interface TabsListProps {
    className?: string;
    children?: ReactNode;
  }

  export interface TabsTriggerProps {
    value: string;
    className?: string;
    children?: ReactNode;
    disabled?: boolean;
  }

  export interface TabsContentProps {
    value: string;
    className?: string;
    children?: ReactNode;
  }

  export const Tabs: FC<TabsProps>;
  export const TabsList: FC<TabsListProps>;
  export const TabsTrigger: FC<TabsTriggerProps>;
  export const TabsContent: FC<TabsContentProps>;
}

declare module '@/components/ui/dialog' {
  import { FC, ReactNode } from 'react';

  export interface DialogProps {
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    children?: ReactNode;
  }

  export const Dialog: FC<DialogProps>;
  export const DialogTrigger: FC<{ children?: ReactNode; asChild?: boolean }>;
  export const DialogContent: FC<{ children?: ReactNode; className?: string }>;
  export const DialogHeader: FC<{ children?: ReactNode; className?: string }>;
  export const DialogTitle: FC<{ children?: ReactNode; className?: string }>;
  export const DialogDescription: FC<{ children?: ReactNode; className?: string }>;
  export const DialogFooter: FC<{ children?: ReactNode; className?: string }>;
}

declare module '@/components/ui/tooltip' {
  import { FC, ReactNode } from 'react';

  export interface TooltipProps {
    children?: ReactNode;
  }

  export const TooltipProvider: FC<{ children?: ReactNode }>;
  export const Tooltip: FC<TooltipProps>;
  export const TooltipTrigger: FC<{ children?: ReactNode; asChild?: boolean }>;
  export const TooltipContent: FC<{ children?: ReactNode; className?: string }>;
}

declare module '@/components/ui/dropdown-menu' {
  import { FC, ReactNode } from 'react';

  export interface DropdownMenuProps {
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    children?: ReactNode;
  }

  export const DropdownMenu: FC<DropdownMenuProps>;
  export const DropdownMenuTrigger: FC<{ children?: ReactNode; asChild?: boolean }>;
  export const DropdownMenuContent: FC<{ children?: ReactNode; className?: string }>;
  export const DropdownMenuItem: FC<{ children?: ReactNode; className?: string; onClick?: () => void }>;
  export const DropdownMenuLabel: FC<{ children?: ReactNode }>;
  export const DropdownMenuSeparator: FC<{ className?: string }>;
  export const DropdownMenuGroup: FC<{ children?: ReactNode }>;
}

declare module '@/components/ui/progress' {
  import { FC } from 'react';

  export interface ProgressProps {
    value?: number;
    className?: string;
  }

  export const Progress: FC<ProgressProps>;
}

declare module '@/components/ui/separator' {
  import { FC } from 'react';

  export interface SeparatorProps {
    orientation?: 'horizontal' | 'vertical';
    className?: string;
  }

  export const Separator: FC<SeparatorProps>;
}

declare module '@/components/ui/radio-group' {
  import { FC, ReactNode } from 'react';

  export interface RadioGroupProps {
    value?: string;
    onValueChange?: (value: string) => void;
    className?: string;
    children?: ReactNode;
  }

  export interface RadioGroupItemProps {
    value: string;
    id?: string;
    className?: string;
  }

  export const RadioGroup: FC<RadioGroupProps>;
  export const RadioGroupItem: FC<RadioGroupItemProps>;
}
`;

/**
 * Custom component type definitions
 */
export const customComponentTypes = `
declare module '@/components/MarkdownStream' {
  export { default, type MarkdownStreamProps } from '@/components/MarkdownStream';
}

declare module '@/components/Markdown' {
  export { default, type MarkdownStreamProps } from '@/components/MarkdownStream';
}
`;

/**
 * All type definitions combined
 */
export const getAllTypeDefinitions = () => {
  return [
    { content: reactTypes, filePath: 'file:///node_modules/@types/react/index.d.ts' },
    { content: lucideReactTypes, filePath: 'file:///node_modules/@types/lucide-react/index.d.ts' },
    { content: uiComponentTypes, filePath: 'file:///node_modules/@types/ui-components/index.d.ts' },
    { content: customComponentTypes, filePath: 'file:///node_modules/@types/custom-components/index.d.ts' },
  ];
};

