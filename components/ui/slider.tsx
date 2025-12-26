"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

export interface SliderProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'defaultValue' | 'onChange'> {
  defaultValue?: number[] | number
  value?: number[] | number
  onValueChange?: (value: number[]) => void
}

const Slider = React.forwardRef<HTMLInputElement, SliderProps>(
  ({ className, defaultValue, value, onValueChange, ...props }, ref) => {
    const val = Array.isArray(value) ? value[0] : value
    const defVal = Array.isArray(defaultValue) ? defaultValue[0] : defaultValue

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (onValueChange) {
        onValueChange([Number(e.target.value)])
      }
    }

    return (
      <input
        type="range"
        ref={ref}
        className={cn(
          "w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700 accent-primary",
          className
        )}
        defaultValue={defVal}
        value={val}
        onChange={handleChange}
        {...props}
      />
    )
  }
)
Slider.displayName = "Slider"

export { Slider }
