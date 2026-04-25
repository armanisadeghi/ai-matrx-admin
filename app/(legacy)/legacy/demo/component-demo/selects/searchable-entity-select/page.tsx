"use client";

import QuickRefSearchableSelect from "@/app/entities/quick-reference/dynamic-quick-ref/QuickRefSearchableSelect";
import QuickRefSelect from "@/app/entities/quick-reference/dynamic-quick-ref/QuickRefSelect";
import React from "react";

const TestSelectPage = () => {
  const handleRecordChange = (record: any) => {
    console.log("Selected record:", record);
  };

  return (
    <div className="p-4 max-w-md space-y-8">
      <div>
        <h2 className="mb-2 font-semibold">Regular Select:</h2>
        <QuickRefSelect
          entityKey="aiModel"
          onRecordChange={handleRecordChange}
        />
      </div>

      <div>
        <h2 className="mb-2 font-semibold">Searchable Select:</h2>
        <QuickRefSearchableSelect
          entityKey="aiModel"
          onRecordChange={handleRecordChange}
        />
      </div>
    </div>
  );
};

export default TestSelectPage;