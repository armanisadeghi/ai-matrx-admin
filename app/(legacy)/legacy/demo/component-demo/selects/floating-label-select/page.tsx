'use client';

import MatrxSelectFloatinglabel from '@/components/matrx/MatrxSelectFloatingLabel';
import React, { useState } from 'react';


const TestMatrxSelect = () => {
  const [selectedValue1, setSelectedValue1] = useState('');
  const [selectedValue2, setSelectedValue2] = useState('');

  const options = [
    { value: 'option1', label: 'Option 1' },
    { value: 'option2', label: 'Option 2' },
    { value: 'option3', label: 'Option 3' },
  ];

  return (
    <div className="p-6 space-y-6">
      <div>
        <MatrxSelectFloatinglabel
          label="Select an option"
          options={options}
          value={selectedValue1}
          onChange={setSelectedValue1}
          placeholder="Choose an option"
          className="w-64"
        />
      </div>

      <div>
        <MatrxSelectFloatinglabel
          label="Select an option"
          options={options}
          value={selectedValue2}
          onChange={setSelectedValue2}
          floatingLabel={true}
          className="w-64"
        />
      </div>
    </div>
  );
};

export default TestMatrxSelect;
