// "use client";
// import React, { useState } from "react";
// import { Button } from "@/components/ui/button";
// import { Settings2 } from "lucide-react";
// import { FieldSettingsOverlay } from "./FieldSettingsOverlay";

// interface FieldSettingsButtonProps {
//   fieldId: string;
//   variant?: "default" | "outline" | "ghost"; // Add more variants as needed
//   size?: "sm" | "md" | "lg";
//   label?: string;
//   showIcon?: boolean;
// }

// /**
//  * A button that opens the comprehensive field settings overlay
//  */
// const FieldSettingsButton: React.FC<FieldSettingsButtonProps> = ({
//   fieldId,
//   variant = "ghost",
//   size = "sm",
//   label = "Settings",
//   showIcon = true,
// }) => {
//   const [isOverlayOpen, setIsOverlayOpen] = useState(false);

//   // Determine the button size class
//   const sizeClass = 
//     size === "sm" ? "h-8 text-xs" : 
//     size === "lg" ? "h-10 text-base" : 
//     "h-9 text-sm";

//   return (
//     <>
//       <Button
//         variant={variant}
//         className={`${sizeClass} text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100`}
//         onClick={() => setIsOverlayOpen(true)}
//       >
//         {showIcon && <Settings2 className="w-4 h-4 mr-1" />}
//         {label}
//       </Button>

//       <FieldSettingsOverlay
//         isOpen={isOverlayOpen}
//         onClose={() => setIsOverlayOpen(false)}
//         fieldId={fieldId}
//       />
//     </>
//   );
// };

// export default FieldSettingsButton;