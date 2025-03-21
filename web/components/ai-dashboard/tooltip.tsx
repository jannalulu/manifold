import React, { useState } from 'react'
import { LuInfo } from 'react-icons/lu'

// Tooltip Component for benchmark terms
export function Tooltip({ title, description }: { title: string, description: string }) {
  const [isVisible, setIsVisible] = useState(false)
  
  return (
    <div className="inline-flex items-center">
      <button
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
        onClick={() => setIsVisible(!isVisible)}
        className="text-ink-500 hover:text-primary-600 transition-colors focus:outline-none"
        aria-label={`Info about ${title}`}
      >
        <LuInfo className="w-[12px] h-[12px] sm:w-[16px] sm:h-[16px]" />
      </button>
      
      {isVisible && (
        <div className="absolute left-full -top-2 transform -translate-x-8 -translate-y-full z-50 w-64 bg-canvas-0 shadow-lg rounded-md border border-ink-200 p-3 text-sm text-ink-700">
          <h4 className="font-medium mb-1">{title}</h4>
          <p>{description}</p>
        </div>
      )}
    </div>
  )
}