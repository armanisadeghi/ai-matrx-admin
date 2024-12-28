import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
    DialogTrigger,
} from "@/components/ui/dialog";

import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { AlertDialogConfig, DialogConfig, StandardDialogConfig } from "./types";

interface DialogTemplateProps {
    config: DialogConfig;
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
}

const StandardDialogTemplate: React.FC<DialogTemplateProps & { config: StandardDialogConfig }> = ({
    config,
    isOpen,
    onOpenChange,
}) => {
    const handleClose = () => onOpenChange(false);

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            {config.trigger && (
                <DialogTrigger asChild>
                    {typeof config.trigger === 'function' 
                        ? config.trigger(() => onOpenChange(true))
                        : config.trigger
                    }
                </DialogTrigger>
            )}
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{config.title}</DialogTitle>
                    {config.description && (
                        <DialogDescription>{config.description}</DialogDescription>
                    )}
                </DialogHeader>
                {config.content && (
                    <div className="py-4">
                        {typeof config.content === 'function'
                            ? config.content(handleClose)
                            : config.content
                        }
                    </div>
                )}
                {config.footer && (
                    <DialogFooter>
                        {typeof config.footer === 'function'
                            ? config.footer(handleClose)
                            : config.footer
                        }
                    </DialogFooter>
                )}
            </DialogContent>
        </Dialog>
    );
};

const AlertDialogTemplate: React.FC<DialogTemplateProps & { config: AlertDialogConfig }> = ({
    config,
    isOpen,
    onOpenChange,
}) => {
    const handleConfirm = async () => {
        if (config.onConfirm) {
            await config.onConfirm();
        }
        onOpenChange(false);
    };

    return (
        <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
            {config.trigger && (
                <AlertDialogTrigger asChild>
                    {typeof config.trigger === 'function'
                        ? config.trigger(() => onOpenChange(true))
                        : config.trigger
                    }
                </AlertDialogTrigger>
            )}
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>{config.title}</AlertDialogTitle>
                    {config.description && (
                        <AlertDialogDescription>{config.description}</AlertDialogDescription>
                    )}
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>
                        {config.cancelLabel || 'Cancel'}
                    </AlertDialogCancel>
                    <AlertDialogAction
                        onClick={handleConfirm}
                        className={cn(
                            config.confirmVariant === 'destructive' && "bg-red-600 hover:bg-red-700"
                        )}
                    >
                        {config.confirmLabel || 'Continue'}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
};

export const DialogTemplate: React.FC<DialogTemplateProps> = (props) => {
    return props.config.type === 'alert' 
        ? <AlertDialogTemplate {...props as any} />
        : <StandardDialogTemplate {...props as any} />;
};
