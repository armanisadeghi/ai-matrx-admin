import React from "react";
import MatrxTooltip from "@/components/matrx/MatrxTooltip";
import {Button} from "@/components/ui/button";
import {ChevronLeft, ChevronRight} from "lucide-react";
import {motion} from "framer-motion";

interface TableBottomSectionProps {
    currentPage: number;
    pageNumbers: number[];
    canPreviousPage: boolean;
    canNextPage: boolean;
    previousPage: () => void;
    nextPage: () => void;
    gotoPage: (page: number) => void;
}

const TableBottomSection: React.FC<TableBottomSectionProps> = (
    {
        currentPage,
        pageNumbers,
        canPreviousPage,
        canNextPage,
        previousPage,
        nextPage,
        gotoPage,
    }) => {
    return (
        <div className="flex justify-between items-center mt-4">
            <MatrxTooltip content="Go to previous page">
                <Button
                    onClick={() => previousPage()}
                    disabled={!canPreviousPage}
                    variant="outline"
                    className="bg-primary text-primary-foreground hover:bg-primary/80 transition-all duration-300 hover:scale-105"
                >
                    <ChevronLeft className="mr-2 h-4 w-4"/> Previous
                </Button>
            </MatrxTooltip>

            <div className="flex space-x-2">
                {pageNumbers.map((number) => (
                    <motion.button
                        key={number}
                        onClick={() => gotoPage(number - 1)}
                        className={`px-3 py-1 rounded ${
                            currentPage === number
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-primary text-primary-foreground'
                        }`}
                        whileHover={{scale: 1.1, rotateY: 15}}
                        whileTap={{scale: 0.9}}
                        style={{transformStyle: 'preserve-3d'}}
                    >
                        {number}
                    </motion.button>
                ))}
            </div>

            <MatrxTooltip content="Go to next page" placement="left">
                <Button
                    onClick={() => nextPage()}
                    disabled={!canNextPage}
                    variant="outline"
                    className="bg-primary text-primary-foreground hover:bg-primary/80 transition-all duration-300 hover:scale-105"
                >
                    Next <ChevronRight className="ml-2 h-4 w-4"/>
                </Button>
            </MatrxTooltip>
        </div>
    );
};

export default TableBottomSection;
