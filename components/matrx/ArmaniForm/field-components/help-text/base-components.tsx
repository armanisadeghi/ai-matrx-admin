import React, {useEffect, useState, useRef} from 'react';
import ReactDOM from 'react-dom';
import {HelpCircle, ChevronDown, ChevronUp, ArrowUpDown, Grip} from 'lucide-react';
import {motion, AnimatePresence, useDragControls} from 'framer-motion';
import {Card, CardContent} from '@/components/ui/card';
import {Button} from '@/components/ui/button';
import {cn} from '@/lib/utils';

interface HelpPanelBaseProps {
    title?: string;
    summary?: string;
    children?: React.ReactNode;
    className?: string;
    position?: 'inline' | 'fixed';
    variant?: 'default' | 'primary' | 'success' | 'warning';
}

interface HelpPanelProps extends HelpPanelBaseProps {
    sections?: React.ReactNode[];
    buttonLabels?: string[];
    draggable?: boolean;
}

const usePortal = () => {
    const [portal, setPortal] = useState<HTMLElement | null>(null);

    useEffect(() => {
        let portalElement = document.getElementById('help-panel-portal');
        if (!portalElement) {
            portalElement = document.createElement('div');
            portalElement.id = 'help-panel-portal';
            document.body.appendChild(portalElement);
        }
        setPortal(portalElement);

        return () => {
            if (portalElement?.parentElement) {
                portalElement.parentElement.removeChild(portalElement);
            }
        };
    }, []);

    return portal;
};

const variants = {
    default: {
        button: 'bg-background hover:bg-accent text-accent-foreground',
        panel: 'bg-background border-border',
        icon: 'text-foreground'
    },
    primary: {
        button: 'bg-primary hover:bg-primary/90 text-primary-foreground',
        panel: 'bg-primary border-primary-foreground/20 text-primary-foreground',
        icon: 'text-primary-foreground'
    },
    success: {
        button: 'bg-success hover:bg-success/90 text-success-foreground',
        panel: 'bg-success border-success-foreground/20 text-success-foreground',
        icon: 'text-success-foreground'
    },
    warning: {
        button: 'bg-warning hover:bg-warning/90 text-warning-foreground',
        panel: 'bg-warning border-warning-foreground/20 text-warning-foreground',
        icon: 'text-warning-foreground'
    }
};

const panelAnimation = {
    initial: {opacity: 0, scale: 0.95},
    animate: {opacity: 1, scale: 1},
    exit: {opacity: 0, scale: 0.95},
    transition: {duration: 0.2}
};

export const BaseHelpPanelSimple: React.FC<HelpPanelBaseProps> = (
    {
        title = "Help & Information",
        summary = "Quick overview of key features and usage",
        children,
        className = "",
        variant = "default"
    }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [isFullyExpanded, setIsFullyExpanded] = useState(false);
    const portal = usePortal();
    const panelRef = useRef<HTMLDivElement>(null);

    const toggleExpand = () => {
        if (!isExpanded) {
            setIsExpanded(true);
        } else {
            setIsFullyExpanded(!isFullyExpanded);
        }
    };

    const handleClose = () => {
        if (isFullyExpanded) {
            setIsFullyExpanded(false);
        } else {
            setIsExpanded(false);
        }
    };

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
                handleClose();
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const content = (
        <div className={cn("fixed bottom-4 right-4 z-50", className)}>
            <AnimatePresence mode="sync">
                {!isExpanded ? (
                    <motion.div {...panelAnimation}>
                        <Button
                            variant="outline"
                            size="icon"
                            className={cn(
                                "rounded-full w-10 h-10 shadow-lg hover:shadow-xl transition-shadow",
                                variants[variant].button
                            )}
                            onClick={() => setIsExpanded(true)}
                        >
                            <HelpCircle className={cn("w-5 h-5", variants[variant].icon)}/>
                        </Button>
                    </motion.div>
                ) : (
                     <motion.div
                         ref={panelRef}
                         {...panelAnimation}
                         className="pointer-events-auto"
                     >
                         <Card className={cn(
                             "shadow-lg transition-all duration-300 ease-in-out",
                             variants[variant].panel,
                             isFullyExpanded ? "w-96" : "w-72"
                         )}>
                             <CardContent className="p-4">
                                 <div className="flex justify-between items-center mb-2">
                                     <h3 className="font-semibold text-lg">{title}</h3>
                                     <div className="flex gap-2">
                                         <Button
                                             variant="ghost"
                                             size="icon"
                                             className="h-8 w-8"
                                             onClick={toggleExpand}
                                         >
                                             {isFullyExpanded ?
                                              <ChevronUp className="h-4 w-4"/> :
                                              <ChevronDown className="h-4 w-4"/>
                                             }
                                         </Button>
                                         <Button
                                             variant="ghost"
                                             size="icon"
                                             className="h-8 w-8"
                                             onClick={handleClose}
                                         >
                                             <span className="text-lg">&times;</span>
                                         </Button>
                                     </div>
                                 </div>

                                 <motion.div
                                     initial={{height: 0}}
                                     animate={{height: "auto"}}
                                     transition={{duration: 0.3}}
                                     className="overflow-hidden"
                                 >
                                     <p className="text-sm text-muted-foreground mb-3">{summary}</p>

                                     <AnimatePresence>
                                         {isFullyExpanded && (
                                             <motion.div
                                                 initial={{opacity: 0}}
                                                 animate={{opacity: 1}}
                                                 exit={{opacity: 0}}
                                                 transition={{duration: 0.2}}
                                                 className="border-t border-border pt-3"
                                             >
                                                 {children}
                                             </motion.div>
                                         )}
                                     </AnimatePresence>
                                 </motion.div>
                             </CardContent>
                         </Card>
                     </motion.div>
                 )}
            </AnimatePresence>
        </div>
    );

    return portal ? ReactDOM.createPortal(content, portal) : null;
};

export const BaseHelpPanel: React.FC<HelpPanelProps> = (
    {
        title = "Help & Information",
        summary = "Quick overview of key features and usage",
        children,
        className = "",
        position = "inline",
        sections = [],
        buttonLabels = [],
        draggable = false,
        variant = "default"
    }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [expansionLevel, setExpansionLevel] = useState(0);
    const [activeSection, setActiveSection] = useState<number | null>(null);
    const [dragPosition, setDragPosition] = useState({x: 0, y: 0});
    const dragControls = useDragControls();
    const panelRef = useRef<HTMLDivElement>(null);
    const portal = usePortal();

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen]);

    const content = (
        <div className={cn(
            position === 'fixed' ? 'fixed bottom-4 right-4 z-50' : 'relative inline-block',
            className
        )}>
            <AnimatePresence mode="sync">
                {!isOpen ? (
                    <motion.div {...panelAnimation}>
                        <Button
                            variant="outline"
                            size="icon"
                            className={cn(
                                "rounded-full w-8 h-8 shadow-lg hover:shadow-xl transition-shadow",
                                variants[variant].button
                            )}
                            onClick={() => {
                                setIsOpen(true);
                                setExpansionLevel(1);
                            }}
                        >
                            <HelpCircle className={cn("w-4 h-4", variants[variant].icon)}/>
                        </Button>
                    </motion.div>
                ) : (
                     <motion.div
                         ref={panelRef}
                         {...panelAnimation}
                         drag={draggable && position === 'fixed'}
                         dragControls={dragControls}
                         dragMomentum={false}
                         dragElastic={0}
                         onDragEnd={(event, info) => {
                             setDragPosition(prevPos => ({
                                 x: prevPos.x + info.offset.x,
                                 y: prevPos.y + info.offset.y
                             }));
                         }}
                         style={{
                             position: position === 'fixed' ? 'fixed' : 'absolute',
                             x: dragPosition.x,
                             y: dragPosition.y,
                             zIndex: 50
                         }}
                         className="pointer-events-auto"
                     >
                         <Card className={cn(
                             "shadow-lg transition-all duration-300 ease-in-out",
                             variants[variant].panel,
                             expansionLevel === 2 ? "w-96" : "w-72"
                         )}>
                             <CardContent className="p-4">
                                 <div className={cn(
                                     "flex justify-between items-center mb-2",
                                     draggable && position === 'fixed' ? "cursor-move" : ""
                                 )}
                                      onPointerDown={(e) => {
                                          if (draggable && position === 'fixed') {
                                              dragControls.start(e);
                                          }
                                      }}
                                 >
                                     <div className="flex items-center gap-2">
                                         {draggable && position === 'fixed' && (
                                             <Grip className="h-4 w-4 text-muted-foreground"/>
                                         )}
                                         <h3 className="font-semibold text-lg">{title}</h3>
                                     </div>
                                     <div className="flex gap-2">
                                         {isOpen && (
                                             <Button
                                                 variant="ghost"
                                                 size="icon"
                                                 className="h-8 w-8"
                                                 onClick={() => setExpansionLevel(prev => prev === 1 ? 2 : 1)}
                                             >
                                                 <ArrowUpDown className="h-4 w-4"/>
                                             </Button>
                                         )}
                                         <Button
                                             variant="ghost"
                                             size="icon"
                                             className="h-8 w-8"
                                             onClick={() => setIsOpen(false)}
                                         >
                                             <span className="text-lg">&times;</span>
                                         </Button>
                                     </div>
                                 </div>

                                 <motion.div
                                     initial={{height: 0}}
                                     animate={{height: "auto"}}
                                     transition={{duration: 0.3}}
                                     className="overflow-hidden"
                                 >
                                     <p className="text-sm text-muted-foreground mb-3">{summary}</p>

                                     <AnimatePresence>
                                         {expansionLevel === 2 && (
                                             <motion.div
                                                 initial={{opacity: 0}}
                                                 animate={{opacity: 1}}
                                                 exit={{opacity: 0}}
                                                 transition={{duration: 0.2}}
                                                 className="border-t border-border pt-3"
                                             >
                                                 <div>{children}</div>

                                                 {sections.length > 0 && (
                                                     <div className="mt-4 space-y-2">
                                                         <div className="flex flex-wrap gap-2">
                                                             {sections.map((_, index) => (
                                                                 <Button
                                                                     key={index}
                                                                     variant="outline"
                                                                     size="sm"
                                                                     onClick={() => setActiveSection(
                                                                         activeSection === index ? null : index
                                                                     )}
                                                                     className={cn(
                                                                         activeSection === index && "bg-accent"
                                                                     )}
                                                                 >
                                                                     {buttonLabels[index] || `Section ${index + 1}`}
                                                                 </Button>
                                                             ))}
                                                         </div>

                                                         <AnimatePresence>
                                                             {activeSection !== null && (
                                                                 <motion.div
                                                                     initial={{height: 0, opacity: 0}}
                                                                     animate={{height: "auto", opacity: 1}}
                                                                     exit={{height: 0, opacity: 0}}
                                                                     className="overflow-hidden"
                                                                 >
                                                                     <div className="mt-3 pt-3 border-t border-border">
                                                                         {sections[activeSection]}
                                                                     </div>
                                                                 </motion.div>
                                                             )}
                                                         </AnimatePresence>
                                                     </div>
                                                 )}
                                             </motion.div>
                                         )}
                                     </AnimatePresence>
                                 </motion.div>
                             </CardContent>
                         </Card>
                     </motion.div>
                 )}
            </AnimatePresence>
        </div>
    );

    return position === 'fixed' && portal
           ? ReactDOM.createPortal(content, portal)
           : content;
};
