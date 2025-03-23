import React, { useState, useRef, useEffect } from 'react'
import { LuInfo } from 'react-icons/lu'

interface TooltipProps {
  title: string
  description: string
  preferredPlacement?: 'top' | 'right' | 'bottom' | 'left'
}

function Tooltip({ title, description, preferredPlacement = 'top' }: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [placement, setPlacement] = useState(preferredPlacement)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const tooltipRef = useRef<HTMLDivElement>(null)
  
  // Handle positioning and visibility
  useEffect(() => {
    if (!isVisible || !triggerRef.current || !tooltipRef.current) return
    
    const triggerRect = triggerRef.current.getBoundingClientRect()
    const tooltipRect = tooltipRef.current.getBoundingClientRect()
    const viewportWidth = window.innerWidth
    const viewportHeight = window.innerHeight
    
    // Calculate available space in each direction
    const spaceAbove = triggerRect.top
    const spaceBelow = viewportHeight - triggerRect.bottom
    const spaceLeft = triggerRect.left
    const spaceRight = viewportWidth - triggerRect.right
    
    // Determine best placement based on available space
    let bestPlacement = preferredPlacement
    
    // For top/bottom placement, check if enough width
    if (preferredPlacement === 'top' || preferredPlacement === 'bottom') {
      const needWidth = tooltipRect.width
      const centerX = triggerRect.left + triggerRect.width / 2
      const wouldOverflowLeft = centerX - (needWidth / 2) < 0
      const wouldOverflowRight = centerX + (needWidth / 2) > viewportWidth
      
      if (wouldOverflowLeft || wouldOverflowRight) {
        // Try left or right instead
        bestPlacement = spaceRight > spaceLeft ? 'right' : 'left'
      }
      
      // Then check height for top/bottom
      if (bestPlacement === 'top' && tooltipRect.height > spaceAbove) {
        bestPlacement = 'bottom'
      } else if (bestPlacement === 'bottom' && tooltipRect.height > spaceBelow) {
        bestPlacement = 'top'
      }
    }
    
    // For left/right placement, check if enough height
    if (preferredPlacement === 'left' || preferredPlacement === 'right') {
      const needHeight = tooltipRect.height
      const centerY = triggerRect.top + triggerRect.height / 2
      const wouldOverflowTop = centerY - (needHeight / 2) < 0
      const wouldOverflowBottom = centerY + (needHeight / 2) > viewportHeight
      
      if (wouldOverflowTop || wouldOverflowBottom) {
        // Try top or bottom instead
        bestPlacement = spaceBelow > spaceAbove ? 'bottom' : 'top'
      }
      
      // Then check width for left/right
      if (bestPlacement === 'left' && tooltipRect.width > spaceLeft) {
        bestPlacement = 'right'
      } else if (bestPlacement === 'right' && tooltipRect.width > spaceRight) {
        bestPlacement = 'left'
      }
    }
    
    setPlacement(bestPlacement)
  }, [isVisible, preferredPlacement])

  // Get tooltip position styles based on placement
  const getTooltipStyles = () => {
    const baseStyles = {
      position: 'absolute',
      zIndex: 50,
    } as React.CSSProperties
    
    switch (placement) {
      case 'top':
        return {
          ...baseStyles,
          bottom: '100%',
          left: '50%',
          transform: 'translateX(-50%) translateY(-8px)',
        }
      case 'bottom':
        return {
          ...baseStyles,
          top: '100%',
          left: '50%',
          transform: 'translateX(-50%) translateY(8px)',
        }
      case 'left':
        return {
          ...baseStyles,
          right: '100%',
          top: '50%',
          transform: 'translateY(-50%) translateX(-8px)',
        }
      case 'right':
        return {
          ...baseStyles,
          left: '100%',
          top: '50%',
          transform: 'translateY(-50%) translateX(8px)',
        }
      default:
        return baseStyles
    }
  }

  // Get arrow styles based on placement
  const getArrowStyles = () => {
    const baseStyles = {
      position: 'absolute',
      width: '8px',
      height: '8px',
      background: 'white',
      transform: 'rotate(45deg)'
    } as React.CSSProperties
    
    switch (placement) {
      case 'top':
        return {
          ...baseStyles,
          bottom: '-4px',
          left: '50%',
          marginLeft: '-4px',
          borderTop: 'none',
          borderLeft: 'none',
        }
      case 'bottom':
        return {
          ...baseStyles,
          top: '-4px',
          left: '50%',
          marginLeft: '-4px',
          borderBottom: 'none',
          borderRight: 'none',
        }
      case 'left':
        return {
          ...baseStyles,
          right: '-4px',
          top: '50%',
          marginTop: '-4px',
          borderLeft: 'none',
          borderBottom: 'none',
        }
      case 'right':
        return {
          ...baseStyles,
          left: '-4px',
          top: '50%',
          marginTop: '-4px',
          borderRight: 'none',
          borderTop: 'none',
        }
      default:
        return baseStyles
    }
  }

  return (
    <div className="inline-flex items-center relative">
      <button
        ref={triggerRef}
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
        onClick={() => setIsVisible(!isVisible)}
        onFocus={() => setIsVisible(true)}
        onBlur={() => setIsVisible(false)}
        className="text-ink-500 hover:text-primary-600 transition-colors focus:outline-none"
        aria-label={`Info about ${title}`}
        aria-expanded={isVisible}
      >
        <LuInfo className="w-[12px] h-[12px] sm:w-[16px] sm:h-[16px]" />
      </button>
      
      {isVisible && (
        <div
          ref={tooltipRef}
          role="tooltip"
          style={getTooltipStyles()}
          className="w-64 max-w-xs bg-canvas-0 shadow-lg rounded-md border border-ink-200 p-3 text-sm text-ink-700"
        >
          <div style={getArrowStyles()} aria-hidden="true" />
          <h4 className="font-medium mb-1">{title}</h4>
          <p>{description}</p>
        </div>
      )}
    </div>
  )
}

export default Tooltip