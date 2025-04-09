import React from "react";
import { motion } from "framer-motion";
import { Play, Music, Video, FileText, Film, Headphones, File, Volume2, MousePointer, FileCode, FileImage } from "lucide-react";
import { EnhancedFileDetails } from "@/utils/file-operations/constants";

const EnhancedInteractivePreview = ({ fileDetails, fileName }: { fileDetails: EnhancedFileDetails, fileName: string }) => {
  // Get the preview type from fileDetails
  const previewType = fileDetails?.quickPreviewType || "unknown";

  console.log(fileDetails);
  console.log("previewType",previewType);
  
  // Get color from fileDetails or use a default
  const color = fileDetails?.color || "text-blue-500";
  
  // Define icon and message based on preview type
  const getPreviewConfig = () => {
    switch(previewType) {
      case "audio":
        return {
          mainIcon: Music,
          actionIcon: Volume2,
          message: "Click Chip to Preview Audio",
          gradient: "from-blue-400 to-purple-500",
          description: "Listen to audio"
        };
      case "advancedImage":
        return {
          mainIcon: FileImage,
          actionIcon: MousePointer,
          message: "Click Chip to Preview Image",
          gradient: "from-blue-400 to-purple-500",
          description: "View image"
        };

      case "video":
        return {
          mainIcon: Film,
          actionIcon: Play,
          message: "Click Chip to Preview Video",
          gradient: "from-red-400 to-pink-500",
          description: "Watch video"
        };
      case "document":
        return {
          mainIcon: FileText,
          actionIcon: MousePointer,
          message: "Click Chip to Preview Document",
          gradient: "from-green-400 to-teal-500",
          description: "View document"
        };
      case "data":
        return {
          mainIcon: File,
          actionIcon: MousePointer,
          message: "Click Chip to Preview Data",
          gradient: "from-amber-400 to-yellow-500",
          description: "Explore data"
        };
      case "archive":
        return {
          mainIcon: File,
          actionIcon: MousePointer,
          message: "Click Chip to Preview Archive",
          gradient: "from-gray-400 to-gray-600",
          description: "Browse archive"
        };
      case "config":
        return {
          mainIcon: FileCode,
          actionIcon: MousePointer,
          message: "Click Chip to Preview Config",
          gradient: "from-gray-400 to-gray-600",
          description: "View config"
        };
      case "code":
        return {
          mainIcon: FileCode,
          actionIcon: MousePointer,
          message: "Click Chip to Preview Code",
          gradient: "from-gray-400 to-gray-600",
          description: "View code"
        };
      default:
        return {
          mainIcon: File,
          actionIcon: MousePointer,
          message: "Click Chip to Interact",
          gradient: "from-gray-400 to-gray-600",
          description: "View file"
        };
    }
  };
  
  const config = getPreviewConfig();
  const MainIcon = config.mainIcon;
  const ActionIcon = config.actionIcon;
  
  // Animation variants
  const containerVariants = {
    initial: { scale: 1 },
    animate: { 
      scale: 1,
      transition: { staggerChildren: 0.1 }
    }
  };
  
  const iconVariants = {
    initial: { y: 0 },
    animate: { 
      y: [0, -3, 0],
      transition: { 
        duration: 2,
        repeat: Infinity,
        ease: "easeInOut"
      }
    }
  };
  
  const pulseVariants = {
    initial: { scale: 1, opacity: 0.8 },
    animate: { 
      scale: [1, 1.2, 1],
      opacity: [0.8, 1, 0.8],
      transition: { 
        duration: 2,
        repeat: Infinity,
        ease: "easeInOut"
      }
    }
  };
  
  return (
    <div className="flex flex-col items-center w-full">
      <motion.div 
        className={`w-full aspect-square flex items-center justify-center rounded overflow-hidden relative bg-gradient-to-br ${config.gradient}`}
        variants={containerVariants}
        initial="initial"
        animate="animate"
      >
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-20 bg-repeat" style={{ 
          backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'20\' height=\'20\' viewBox=\'0 0 20 20\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'0.2\' fill-rule=\'evenodd\'%3E%3Ccircle cx=\'3\' cy=\'3\' r=\'3\'/%3E%3Ccircle cx=\'13\' cy=\'13\' r=\'3\'/%3E%3C/g%3E%3C/svg%3E")',
          backgroundSize: '20px 20px'
        }}></div>
        
        <div className="absolute inset-0 flex flex-col items-center justify-center p-2">
          <motion.div className="relative" variants={iconVariants}>
            <MainIcon size={32} className="text-white" />
            <motion.div 
              className="absolute -bottom-1 -right-1 bg-white bg-opacity-20 rounded-full p-1"
              variants={pulseVariants}
            >
              <ActionIcon size={12} className="text-white" />
            </motion.div>
          </motion.div>
          
          <motion.p 
            className="mt-2 text-white font-medium text-center text-xs"
            initial={{ opacity: 0.8 }}
            animate={{ 
              opacity: [0.8, 1, 0.8],
              transition: { duration: 2, repeat: Infinity, ease: "easeInOut" }
            }}
          >
            {config.message}
          </motion.p>
          
          <motion.p 
            className="text-white text-opacity-80 text-xs mt-1"
            initial={{ opacity: 0.6 }}
            animate={{ 
              opacity: [0.6, 0.9, 0.6],
              transition: { duration: 2, repeat: Infinity, ease: "easeInOut", delay: 0.5 }
            }}
          >
            {config.description}
          </motion.p>
        </div>
      </motion.div>
      <p className="mt-2 text-xs text-center text-gray-600 dark:text-gray-400 break-words max-w-full px-2 line-clamp-2 hover:line-clamp-none">
        {fileName || "Interactive File"}
      </p>
    </div>
  );
};

export default EnhancedInteractivePreview;