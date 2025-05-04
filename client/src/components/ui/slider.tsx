import * as React from "react"
import * as SliderPrimitive from "@radix-ui/react-slider"

import { cn } from "@/lib/utils"

const Slider = React.forwardRef<
  React.ElementRef<typeof SliderPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root>
>(({ className, ...props }, ref) => {
  // Ensure the number of thumbs in SliderPrimitive.Thumb matches the
  // length of the value array passed to the slider
  const numThumbs = Array.isArray(props.value) ? props.value.length : 1;
  
  return (
    <SliderPrimitive.Root
      ref={ref}
      className={cn(
        "relative flex w-full touch-none select-none items-center",
        className
      )}
      {...props}
    >
      <SliderPrimitive.Track className="relative h-3 w-full grow overflow-hidden rounded-full bg-gray-200 cursor-pointer">
        <SliderPrimitive.Range className="absolute h-full bg-primary" />
      </SliderPrimitive.Track>
      
      {/* Render the correct number of thumbs based on the value array */}
      {Array.from({ length: numThumbs }).map((_, i) => (
        <SliderPrimitive.Thumb 
          key={i}
          aria-label={`Thumb ${i + 1}`}
          className={`
            block h-6 w-6 rounded-full border-2 border-primary bg-white shadow-md 
            cursor-grab active:cursor-grabbing hover:scale-110 active:scale-110 
            transition-all focus-visible:outline-none focus-visible:ring-2 
            focus-visible:ring-ring focus-visible:ring-offset-2 
            disabled:pointer-events-none disabled:opacity-50
            ${i === 0 ? 'data-first-thumb' : 'data-last-thumb'}
          `}
        >
          <div className="flex items-center justify-center w-full h-full">
            {i === 0 ? (
              // Show left arrow symbol for minimum thumb
              <div className="text-xs font-semibold text-primary">◀</div>
            ) : (
              // Show right arrow symbol for maximum thumb
              <div className="text-xs font-semibold text-primary">▶</div>
            )}
          </div>
        </SliderPrimitive.Thumb>
      ))}
    </SliderPrimitive.Root>
  );
})
Slider.displayName = SliderPrimitive.Root.displayName

export { Slider }
