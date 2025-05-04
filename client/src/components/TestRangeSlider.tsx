import React, { useState } from 'react';
import { RangeSlider } from '@/components/ui/range-slider';

export function TestRangeSlider() {
  const [values, setValues] = useState<[number, number]>([20, 80]);
  
  return (
    <div className="p-8 bg-white">
      <h2 className="text-xl font-bold mb-4">Range Slider Test</h2>
      
      <div className="mb-8">
        <p className="mb-2">Current values: {values[0]} - {values[1]}</p>
        <RangeSlider
          min={0}
          max={100}
          step={1}
          values={values}
          onChange={(newValues) => setValues(newValues)}
        />
      </div>
      
      <div className="mb-8">
        <p className="mb-2">Price Range Test</p>
        <RangeSlider
          min={100000}
          max={1000000}
          step={50000}
          values={[200000, 750000]}
          onChange={(newValues) => console.log('Price changed:', newValues)}
          formatValue={(value) => `£${value.toLocaleString()}`}
        />
      </div>
      
      <div>
        <button 
          className="bg-blue-500 text-white px-4 py-2 rounded" 
          onClick={() => setValues([30, 70])}
        >
          Reset to 30-70
        </button>
      </div>
    </div>
  );
}