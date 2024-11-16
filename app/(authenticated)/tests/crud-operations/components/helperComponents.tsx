import {Button, Tooltip, TooltipContent, TooltipProvider, TooltipTrigger} from "@/components/ui";
import {Info, Trash} from "lucide-react";
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel,
    AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger
} from "@/components/ui/alert-dialog";
import React from "react";

interface FieldTooltipProps {
    description: string;
}

export const FieldTooltip = ({description}: FieldTooltipProps) => (
    <TooltipProvider>
        <Tooltip>
            <TooltipTrigger>
                <Info className="h-5 w-5 text-muted-foreground"/>
            </TooltipTrigger>
            <TooltipContent>
                <p>{description}</p>
            </TooltipContent>
        </Tooltip>
    </TooltipProvider>
);

interface DeleteAlertProps {
    onDelete: () => void;
}

export const DeleteRecordAction = ({onDelete}: DeleteAlertProps) => (
    <AlertDialog>
        <AlertDialogTrigger asChild>
            <Button variant="destructive" size="sm">
                <Trash className="h-4 w-4 mr-1"/>
                Delete
            </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Delete Record</AlertDialogTitle>
                <AlertDialogDescription>
                    Are you sure? This cannot be undone.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={onDelete}>
                    Delete
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
);
