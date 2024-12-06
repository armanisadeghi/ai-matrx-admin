import React from "react";

const TableWrapper = ({ children }: { children: React.ReactNode }) => {
    return (
        <div className="my-4 overflow-x-auto">
            <table className="min-w-full divide-y divide-border">
                {children}
            </table>
        </div>
    );
};

export default TableWrapper;
