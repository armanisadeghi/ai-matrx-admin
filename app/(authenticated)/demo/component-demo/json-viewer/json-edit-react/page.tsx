'use client';

import JsonEditor from "./JsonEditor";

export default function JsonEditorDemo() {
  const testData = {
    string: "Hello",
    number: 42,
    null: null,
    undefined: undefined,
    emptyObject: {},
    emptyArray: [],
    nested: {
      a: 1,
      b: [1, 2, 3]
    }
  };

  return (
    <div className="container mx-auto p-4 min-h-screen bg-background text-foreground">
      <h1 className="text-2xl font-bold mb-4 text-foreground">JSON Editor Demo</h1>
      <div className="max-w-4xl">
        <JsonEditor
          data={testData}
          rootName="Test Data"
          collapse={1}
          onUpdate={({ newData }) => {
            console.log('Data updated:', newData);
          }}
        />
      </div>
    </div>
  );
}