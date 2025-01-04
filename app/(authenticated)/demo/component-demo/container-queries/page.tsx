import React from 'react';

// The reusable grid component that uses container queries
const GridComponent = () => {
  return (
    <div className="@container border-2 border-blue-500">
      <div className="grid grid-cols-1 @[400px]:grid-cols-2 @[800px]:grid-cols-3 gap-2">
        <div className="bg-blue-100 p-2 border border-blue-300">Item 1</div>
        <div className="bg-blue-100 p-2 border border-blue-300">Item 2</div>
        <div className="bg-blue-100 p-2 border border-blue-300">Item 3</div>
        <div className="bg-blue-100 p-2 border border-blue-300">Item 4</div>
        <div className="bg-blue-100 p-2 border border-blue-300">Item 5</div>
        <div className="bg-blue-100 p-2 border border-blue-300">Item 6</div>
      </div>
    </div>
  );
};

const ContainerQueryTest = () => {
  return (
    <div className="space-y-8">
      {/* Full width container */}
      <section>
        <h2 className="text-lg font-bold mb-2 bg-gray-100 p-2">Full Width Container</h2>
        <div className="w-full border-2 border-red-500">
          <GridComponent />
        </div>
      </section>

      {/* Half width container */}
      <section>
        <h2 className="text-lg font-bold mb-2 bg-gray-100 p-2">Half Width Container</h2>
        <div className="w-1/2 border-2 border-red-500">
          <GridComponent />
        </div>
      </section>

      {/* Quarter width container */}
      <section>
        <h2 className="text-lg font-bold mb-2 bg-gray-100 p-2">Quarter Width Container</h2>
        <div className="w-1/4 border-2 border-red-500">
          <GridComponent />
        </div>
      </section>

      {/* One-sixth width container */}
      <section>
        <h2 className="text-lg font-bold mb-2 bg-gray-100 p-2">One-sixth Width Container</h2>
        <div className="w-1/6 border-2 border-red-500">
          <GridComponent />
        </div>
      </section>

      {/* All sizes side by side for comparison */}
      <section>
        <h2 className="text-lg font-bold mb-2 bg-gray-100 p-2">All Sizes Side by Side</h2>
        <div className="flex gap-4">
          <div className="w-full border-2 border-red-500">
            <p className="text-sm p-1 bg-red-100">Full width</p>
            <GridComponent />
          </div>
          <div className="w-1/2 border-2 border-red-500">
            <p className="text-sm p-1 bg-red-100">1/2 width</p>
            <GridComponent />
          </div>
          <div className="w-1/4 border-2 border-red-500">
            <p className="text-sm p-1 bg-red-100">1/4 width</p>
            <GridComponent />
          </div>
          <div className="w-1/6 border-2 border-red-500">
            <p className="text-sm p-1 bg-red-100">1/6 width</p>
            <GridComponent />
          </div>
        </div>
      </section>
    </div>
  );
};

export default ContainerQueryTest;