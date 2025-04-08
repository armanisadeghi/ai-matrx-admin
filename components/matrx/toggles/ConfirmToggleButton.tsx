import React, { useState } from "react";
import ToggleButton from "./ToggleButton";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface ConfirmToggleButtonProps extends Omit<React.ComponentProps<typeof ToggleButton>, 'onClick'> {
  dialogTitle: string;
  dialogDescription?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel?: () => void;
}

const ConfirmToggleButton: React.FC<ConfirmToggleButtonProps> = ({
  dialogTitle,
  dialogDescription,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  onConfirm,
  onCancel,
  ...toggleButtonProps
}) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  const handleButtonClick = () => {
    setIsDialogOpen(true);
  };
  
  const handleConfirm = () => {
    setIsDialogOpen(false);
    onConfirm();
  };
  
  const handleCancel = () => {
    setIsDialogOpen(false);
    if (onCancel) onCancel();
  };

  return (
    <>
      <ToggleButton 
        {...toggleButtonProps} 
        onClick={handleButtonClick} 
      />
      
      <AlertDialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{dialogTitle}</AlertDialogTitle>
            {dialogDescription && (
              <AlertDialogDescription>
                {dialogDescription}
              </AlertDialogDescription>
            )}
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancel}>
              {cancelLabel}
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirm}>
              {confirmLabel}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default ConfirmToggleButton;