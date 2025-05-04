"use client";

import React, { ReactNode } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";

interface SectionCardProps {
  title: string;
  description: string;
  children: ReactNode;
  footer?: ReactNode;
}

const SectionCard: React.FC<SectionCardProps> = ({ title, description, children, footer }) => {
  return (
    <Card className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm rounded-xl">
      <CardHeader className="bg-gray-100 dark:bg-gray-700 p-4 border-b border-gray-200 dark:border-gray-600 rounded-t-xl">
        <CardTitle className="text-rose-500 dark:text-rose-600">{title}</CardTitle>
        <CardDescription className="text-gray-600 dark:text-gray-300 text-sm">
          {description}
        </CardDescription>
      </CardHeader>

      <CardContent>{children}</CardContent>

      {footer && <CardFooter className="flex justify-end gap-3 pt-0 border-t border-gray-200 dark:border-gray-800">{footer}</CardFooter>}
    </Card>
  );
};

export default SectionCard; 