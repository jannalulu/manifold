import React from 'react'
import { ClickFrame } from 'web/components/widgets/click-frame'
import { Tooltip } from '../common/tooltip'
import { getCardBgColor, getTooltipDescription, AIModelIcon } from '../common/ai-utils'
import { Contract, contractPath } from 'common/contract'

// Base card component with shared styling
export function CardBase({ 
  onClick, 
  children, 
  className = "",
  minHeight = "min-h-[200px] sm:min-h-[240px]"
}: { 
  onClick: () => void, 
  children: React.ReactNode, 
  className?: string,
  minHeight?: string
}) {
  return (
    <ClickFrame
      className={`group cursor-pointer rounded-lg p-3 sm:p-4 border border-ink-200 dark:border-ink-300
      transition-all hover:shadow-md hover:translate-y-[-2px] ${minHeight}
      shadow-[2px_2px_4px_rgba(0,0,0,0.05)] dark:shadow-[2px_2px_4px_rgba(0,0,0,0.15)] 
      relative ${getCardBgColor(className)} ${className}`}
      onClick={onClick}
    >
      {children}
    </ClickFrame>
  )
}

// Component for card title with tooltip for benchmarks and prizes
export function CardTitle({ 
  title,
  showModelIcon = false,
  showTooltip = false,
  type
}: { 
  title: string, 
  type: string, 
  showModelIcon?: boolean,
  showTooltip?: boolean 
}) {
  return (
    <div className="relative w-full mb-1">
      <div className="flex items-center">
        {showModelIcon && (
          <div className="mr-2 text-ink-600">
            <AIModelIcon title={title} />
          </div>
        )}
        <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-sm sm:text-lg">{title}</h3>
      </div>
      
      {showTooltip && (
        <div className="absolute top-0 sm:top-1 right-0">
          <Tooltip title={title} description={getTooltipDescription(title)} />
        </div>
      )}
    </div>
  )
}

// Create contract click handler
export function createContractClickHandler(contract: Contract | null, liveContract: Contract | null, title: string, marketId: string, displayType?: string) {
  return () => {
    if (liveContract) {
      try {
        // Get the path directly from liveContract
        const path = contractPath(liveContract)
        window.open(path, '_blank')
      } catch {
        // If we have the original contract, try using that as fallback
        if (contract) {
          const path = contractPath(contract)
          window.open(path, '_blank')
        }
      }
    }
  }
}