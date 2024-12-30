import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
    DialogTrigger,
    DialogPortal,
    DialogOverlay,
    DialogClose,
} from "@/components/ui/dialog";

import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogOverlay,
    AlertDialogPortal,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

import { cn } from "@/lib/utils";
import { AlertDialogConfig, StandardDialogConfig, DialogTemplateConfig } from "./types";

interface DialogTemplateProps {
    config: DialogTemplateConfig;
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
}

const StandardDialogTemplate: React.FC<Omit<DialogTemplateProps, 'config'> & { config: StandardDialogConfig }> = ({
    config,
    isOpen,
    onOpenChange,
}) => {
    const handleClose = () => onOpenChange(false);

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogPortal>
                <DialogOverlay />
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
            </DialogPortal>
        </Dialog>
    );
};

const AlertDialogTemplate: React.FC<Omit<DialogTemplateProps, 'config'> & { config: AlertDialogConfig }> = ({
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
            <AlertDialogPortal>
                <AlertDialogOverlay />
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{config.title}</AlertDialogTitle>
                        {config.description && (
                            <AlertDialogDescription>{config.description}</AlertDialogDescription>
                        )}
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => onOpenChange(false)}>
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
            </AlertDialogPortal>
        </AlertDialog>
    );
};

export const DialogTemplate: React.FC<DialogTemplateProps> = (props) => {
    if (props.config.type === 'alert') {
        return <AlertDialogTemplate {...props as any} config={props.config as AlertDialogConfig} />;
    }
    return <StandardDialogTemplate {...props as any} config={props.config as StandardDialogConfig} />;
};
