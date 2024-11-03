import React, {useState} from "react";
import {AnimatePresence, motion} from "framer-motion";
import {ChevronDown, ChevronRight, File, Folder} from "lucide-react";
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui";

const SimpleDirectoryTree = ({structure, onSelect}) => {
    const [expanded, setExpanded] = useState({});

    const toggleDir = (path) => {
        setExpanded(prev => ({
            ...prev,
            [path]: !prev[path]
        }));
    };

    const renderTree = (node, path = '') => {
        if (!node || typeof node !== 'object') return null;

        return Object.entries(node).map(([key, value]) => {
            const currentPath = path ? `${path}/${key}` : key;
            const isDirectory = value !== null && typeof value === 'object';

            return (
                <motion.div
                    key={currentPath}
                    initial={{opacity: 0}}
                    animate={{opacity: 1}}
                    exit={{opacity: 0}}
                    className="ml-4"
                >
                    <div
                        className="flex items-center p-1 hover:bg-accent rounded cursor-pointer"
                        onClick={() => isDirectory ? toggleDir(currentPath) : onSelect(currentPath)}
                    >
                        {isDirectory ? (
                            <>
                                {expanded[currentPath] ?
                                 <ChevronDown className="w-4 h-4 mr-1"/> :
                                 <ChevronRight className="w-4 h-4 mr-1"/>
                                }
                                <Folder className="w-4 h-4 mr-2 text-primary"/>
                            </>
                        ) : (
                             <>
                                 <File className="w-4 h-4 mr-2 text-muted-foreground"/>
                             </>
                         )}
                        <span className="text-foreground">{key}</span>
                    </div>
                    <AnimatePresence>
                        {isDirectory && expanded[currentPath] && renderTree(value, currentPath)}
                    </AnimatePresence>
                </motion.div>
            );
        });
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>File Explorer</CardTitle>
            </CardHeader>
            <CardContent>
                {renderTree(structure)}
            </CardContent>
        </Card>
    );
};
