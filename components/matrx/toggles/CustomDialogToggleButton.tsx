import React, { useState } from "react";
import ToggleButton from "./ToggleButton";
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface CustomDialogToggleButtonProps extends Omit<React.ComponentProps<typeof ToggleButton>, 'onClick'> {
  dialogTitle: string;
  dialogContent: React.ReactNode;
  onDialogOpen?: () => void;
  onDialogClose?: () => void;
}

const CustomDialogToggleButton: React.FC<CustomDialogToggleButtonProps> = ({
  dialogTitle,
  dialogContent,
  onDialogOpen,
  onDialogClose,
  ...toggleButtonProps
}) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  const handleButtonClick = () => {
    setIsDialogOpen(true);
    if (onDialogOpen) onDialogOpen();
  };
  
  const handleDialogClose = (open: boolean) => {
    if (!open && onDialogClose) onDialogClose();
    setIsDialogOpen(open);
  };

  return (
    <>
      <ToggleButton 
        {...toggleButtonProps} 
        onClick={handleButtonClick} 
      />
      
      <Dialog open={isDialogOpen} onOpenChange={handleDialogClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{dialogTitle}</DialogTitle>
          </DialogHeader>
          {dialogContent}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default CustomDialogToggleButton;