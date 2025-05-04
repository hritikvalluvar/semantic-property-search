import React, { useState, useRef, useEffect } from 'react';

interface RangeSliderProps {
  min: number;
  max: number;
  step?: number;
  values: [number, number];
  onChange: (values: [number, number]) => void;
  formatValue?: (value: number) => string;
}

export function RangeSlider({
  min,
  max,
  step = 1,
  values: initialValues,
  onChange,
  formatValue = (value) => value.toString()
}: RangeSliderProps) {
  const [values, setValues] = useState<[number, number]>(initialValues);
  const [dragging, setDragging] = useState<null | 'min' | 'max'>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  // Update local state when prop values change
  useEffect(() => {
    setValues(initialValues);
  }, [initialValues]);

  // Calculate percentage for positioning
  const getPercentage = (value: number) => {
    return ((value - min) / (max - min)) * 100;
  };

  // Calculate value from percentage
  const getValueFromPercentage = (percentage: number) => {
    const rawValue = min + (percentage / 100) * (max - min);
    const steppedValue = Math.round(rawValue / step) * step;
    return Math.min(max, Math.max(min, steppedValue));
  };

  // Handle mouse/touch move
  const handleMove = (clientX: number) => {
    if (!trackRef.current || !dragging) return;

    const rect = trackRef.current.getBoundingClientRect();
    const percentage = ((clientX - rect.left) / rect.width) * 100;
    const newValue = getValueFromPercentage(percentage);

    // Update the appropriate thumb while preserving the other
    const newValues: [number, number] = [...values] as [number, number];

    if (dragging === 'min') {
      newValues[0] = Math.min(newValue, values[1] - step);
    } else {
      newValues[1] = Math.max(newValue, values[0] + step);
    }

    setValues(newValues);
    onChange(newValues);
  };

  // Handle mouse/touch down
  const handleMouseDown = (type: 'min' | 'max') => (e: React.MouseEvent) => {
    e.preventDefault();
    setDragging(type);
  };

  // Handle mouse/touch up and leave
  const handleMouseUp = () => {
    setDragging(null);
  };

  // Handle mouse move
  const handleMouseMove = (e: MouseEvent) => {
    handleMove(e.clientX);
  };

  // Add and remove event listeners
  useEffect(() => {
    if (dragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragging, values]);

  // Input change handlers
  const handleMinInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newMin = Math.min(Number(e.target.value), values[1] - step);
    if (newMin >= min) {
      const newValues: [number, number] = [newMin, values[1]];
      setValues(newValues);
      onChange(newValues);
    }
  };

  const handleMaxInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newMax = Math.max(Number(e.target.value), values[0] + step);
    if (newMax <= max) {
      const newValues: [number, number] = [values[0], newMax];
      setValues(newValues);
      onChange(newValues);
    }
  };

  return (
    <div className="w-full flex flex-col space-y-4">
      <div className="flex items-center space-x-2">
        <input
          type="number"
          value={values[0]}
          onChange={handleMinInputChange}
          min={min}
          max={values[1] - step}
          step={step}
          className="w-16 text-sm px-2 py-1 border rounded"
        />
        <span className="text-sm text-gray-500">to</span>
        <input
          type="number"
          value={values[1]}
          onChange={handleMaxInputChange}
          min={values[0] + step}
          max={max}
          step={step}
          className="w-16 text-sm px-2 py-1 border rounded"
        />
      </div>
      
      <div 
        className="relative h-4 w-full bg-gray-200 rounded-md cursor-pointer"
        ref={trackRef}
      >
        {/* Track filled area */}
        <div
          className="absolute h-full bg-primary rounded-md"
          style={{
            left: `${getPercentage(values[0])}%`,
            width: `${getPercentage(values[1]) - getPercentage(values[0])}%`
          }}
        />
        
        {/* Minimum thumb */}
        <div
          className={`absolute h-6 w-6 -mt-1 flex items-center justify-center bg-white border-2 border-primary rounded-full cursor-grab ${
            dragging === 'min' ? 'cursor-grabbing ring-2 ring-primary/20 scale-110' : ''
          }`}
          style={{ left: `${getPercentage(values[0])}%`, transform: 'translateX(-50%)' }}
          onMouseDown={handleMouseDown('min')}
          role="slider"
          aria-valuemin={min}
          aria-valuemax={values[1]}
          aria-valuenow={values[0]}
        >
          <div className="text-xs text-primary font-semibold">◀</div>
        </div>
        
        {/* Maximum thumb */}
        <div
          className={`absolute h-6 w-6 -mt-1 flex items-center justify-center bg-white border-2 border-primary rounded-full cursor-grab ${
            dragging === 'max' ? 'cursor-grabbing ring-2 ring-primary/20 scale-110' : ''
          }`}
          style={{ left: `${getPercentage(values[1])}%`, transform: 'translateX(-50%)' }}
          onMouseDown={handleMouseDown('max')}
          role="slider"
          aria-valuemin={values[0]}
          aria-valuemax={max}
          aria-valuenow={values[1]}
        >
          <div className="text-xs text-primary font-semibold">▶</div>
        </div>
      </div>
      
      <div className="flex justify-between text-xs text-gray-500">
        <span>{formatValue(min)}</span>
        <span>{formatValue(max)}</span>
      </div>
    </div>
  );
}