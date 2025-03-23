import React, { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
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

  // Helper functions for fixed positioning
  const getTop = () => {
    if (!triggerRef.current) return 0
    const rect = triggerRef.current.getBoundingClientRect()
    
    switch(placement) {
      case 'top':
        return rect.top - 8
      case 'bottom':
        return rect.bottom + 8
      case 'left':
      case 'right':
        return rect.top + (rect.height / 2)
      default:
        return rect.top
    }
  }
  
  const getLeft = () => {
    if (!triggerRef.current) return 0
    const rect = triggerRef.current.getBoundingClientRect()
    
    switch(placement) {
      case 'left':
        return rect.left - 8
      case 'right':
        return rect.right + 8
      case 'top':
      case 'bottom':
        return rect.left + (rect.width / 2)
      default:
        return rect.left
    }
  }
  
  const getTransform = () => {
    switch(placement) {
      case 'top':
        return 'translate(-50%, -100%)'
      case 'bottom':
        return 'translate(-50%, 0)'
      case 'left':
        return 'translate(-100%, -50%)'
      case 'right':
        return 'translate(0, -50%)'
      default:
        return 'translate(0, 0)'
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
      
      {isVisible && typeof document !== 'undefined' && createPortal(
        <div
          ref={tooltipRef}
          role="tooltip"
          style={{
            position: 'fixed', // Ensure above all cards
            zIndex: 50,
            transform: getTransform(),
            top: getTop(),
            left: getLeft(),
          }}
          className="w-64 max-w-xs bg-canvas-0 shadow-lg rounded-md border border-ink-200 p-3 text-sm text-ink-700"
        >
          <div style={getArrowStyles()} aria-hidden="true" />
          <h4 className="font-medium mb-1">{title}</h4>
          <p>{description}</p>
        </div>,
        document.body
      )}
    </div>
  )
}

export default Tooltip