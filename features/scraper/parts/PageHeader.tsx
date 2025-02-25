"use client";
import React from "react";
import { Badge } from "@/components/ui/badge";

/**
 * Component for displaying the page header with title, URL and status
 */
const PageHeader = ({ title, url, status }) => {
  return (
    <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700">
      <div>
        <h1 className="text-2xl font-bold truncate dark:text-white text-gray-800">
          {title || "Untitled Page"}
        </h1>
        <p className="text-gray-600 dark:text-gray-300">{url || "No URL"}</p>
      </div>
      <Badge className={status === "success" ? "bg-green-500 dark:bg-green-600" : "bg-red-500 dark:bg-red-600"}>
        {status}
      </Badge>
    </div>
  );
};

export default PageHeader;