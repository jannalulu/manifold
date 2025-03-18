import React, { useState } from 'react'
import { formatPercent } from 'common/util/format'
import { format as formatDateFn } from 'date-fns'
import { Row } from 'web/components/layout/row'
import { Col } from 'web/components/layout/col'
import Link from 'next/link'
import { MdChevronRight, MdChevronLeft } from "react-icons/md"
import { TimelineItem } from './timeline-item'

// Type for model data
export type TimelineItemData = {
  title: string
  path?: string // URL to market
  releaseDate: Date
  icon?: React.ReactNode
  probability?: number
}

export interface TimelineProps {
  items: TimelineItemData[]
  startDate?: Date
  endDate?: Date
  className?: string
  lineColor?: string
}

export const Timeline = ({ 
  items, 
  startDate: customStartDate,
  endDate: customEndDate,
  className = '',
  lineColor = 'bg-fuchsia-700 dark:bg-fuchsia-500'
}: TimelineProps) => {
  // Sort by release date
  const sortedItems = [...items].sort((a, b) => a.releaseDate.getTime() - b.releaseDate.getTime())
  
  // Timeline range
  const currentDate = new Date()
  const startDate = customStartDate || new Date(currentDate)
  startDate.setMonth(currentDate.getMonth())
  startDate.setDate(1)
  
  const endDate = customEndDate || new Date(startDate)
  endDate.setMonth(startDate.getMonth() + 5) // 6 months total
    
  const latestItemDate = sortedItems.length ? 
    sortedItems.reduce((latest, item) => 
      item.releaseDate > latest ? item.releaseDate : latest, 
      sortedItems[0].releaseDate
    ) : endDate
  
  // Track scroll position with state
  const [timelineScrollPosition, setTimelineScrollPosition] = useState(0)
  
  // Handle scrolling forward in time
  const scrollForward = () => {
    const newStartDate = new Date(viewEndDate)
    
    if (newStartDate <= latestItemDate) {
      setTimelineScrollPosition(timelineScrollPosition + 5)
    }
  }
  
  // Handle scrolling backward in time
  const scrollBackward = () => {
    if (timelineScrollPosition > 0) {
      setTimelineScrollPosition(timelineScrollPosition - 5)
    }
  }
  
  const viewStartDate = new Date(startDate)
  viewStartDate.setMonth(startDate.getMonth() + timelineScrollPosition)
  
  const viewEndDate = new Date(viewStartDate)
  viewEndDate.setMonth(viewStartDate.getMonth() + 5) // 6 months total
  
  // Generate evenly spaced month markers for the visible timeline
  const generateMonthMarkers = () => {
    const months = []
    const monthStart = new Date(viewStartDate)
    
    const lastDate = new Date(viewEndDate)
    
    // Go to the start of the month for earliest date
    while (monthStart <= lastDate) {
      months.push(new Date(monthStart))
      monthStart.setMonth(monthStart.getMonth() + 1)
    }
    
    return months
  }
  
  const monthMarkers = generateMonthMarkers()
  
  // Calculate position on timeline (0-100%) based on visible range
  const getTimelinePosition = (date: Date) => {
    const timeRange = viewEndDate.getTime() - viewStartDate.getTime()
    if (timeRange === 0) return 0
    
    // Calculate raw position as percentage
    const position = ((date.getTime() - viewStartDate.getTime()) / timeRange) * 100
    
    // If on second page, show items not previously shown
    if (timelineScrollPosition > 0) {
      // Calculate where this date would have been on the previous page
      const prevPageStartDate = new Date(startDate)
      prevPageStartDate.setMonth(prevPageStartDate.getMonth() + (timelineScrollPosition - 5))
      
      const prevPageEndDate = new Date(prevPageStartDate)
      prevPageEndDate.setMonth(prevPageStartDate.getMonth() + 5)
      
      const prevPageTimeRange = prevPageEndDate.getTime() - prevPageStartDate.getTime()
      const prevPagePosition = ((date.getTime() - prevPageStartDate.getTime()) / prevPageTimeRange) * 100
      
      // Move to beginning of page if previously shown
      if (prevPagePosition > 95 && prevPagePosition <= 100 && position < 0) {
        return 5 // Position at beginning of current page
      }
    }
    
    // Return position if it's within the visible range (0-100), otherwise return -1
    if (position >= 0 && position <= 100) {
      return position
    } else {
      return -1
    }
  }

  return (
    <div className={`rounded-lg p-4 mx-2 md:mx-4 ${className}`}>
      <div className="relative mb-10 mt-12">
        {/* Main container for timeline and item icons */}
        <div className="relative w-full px-8">
          {timelineScrollPosition > 0 && (
            <button 
              onClick={scrollBackward}
              className="absolute -left-6 top-[-20px] p-2 rounded-full text-primary-600 z-10"
              aria-label="Scroll backward in time"
            >
              <MdChevronLeft className="h-6 w-6" />
            </button>
          )}
          
          {viewEndDate < latestItemDate && (
            <button 
              onClick={scrollForward}
              className="absolute -right-6 top-[-20px] p-2 rounded-full text-primary-600 z-10"
              aria-label="Scroll forward in time"
            >
              <MdChevronRight className="h-6 w-6" />
            </button>
          )}
        
          {/* Item icons with collision detection */}
          <div className="absolute left-0 right-0 top-[-50px] w-full">
            {(() => {
              // First, get all items that would be visible
              const visibleItems = sortedItems
                .map(item => {
                  const position = getTimelinePosition(item.releaseDate)
                  
                  // Don't show items that are in the last 5% of any page
                  const isNearEndOfPage = position > 95 && position <= 100
                  if (position < 0 || position > 100 || isNearEndOfPage) return null
                  
                  return { item, position, verticalOffset: 0 }
                })
                .filter(item => item !== null)
                .sort((a, b) => a.position - b.position) // Sort by position
              
              // Detect and resolve collisions
              for (let i = 0; i < visibleItems.length - 1; i++) {
                const current = visibleItems[i]
                const next = visibleItems[i + 1]
                
                // If items are too close (less than 15% apart)
                if (next.position - current.position < 15) {
                  // Alternate vertical positions
                  next.verticalOffset = i % 2 === 0 ? 30 : -30
                }
              }
              
              // Now render the items with their adjusted positions
              return visibleItems.map(({ item, position, verticalOffset }) => (
                <TimelineItem
                  key={`${item.title}-${item.releaseDate.getTime()}`}
                  item={item}
                  position={position}
                  verticalOffset={verticalOffset}
                />
              ))
            })()}
          </div>
          
          {/* Timeline content */}
          <div className="relative w-full">
            {/* Month markers and labels */}
            <div className="absolute left-0 right-0 top-[15px]">
              {monthMarkers.map((date, index) => {
                const position = (index / (monthMarkers.length - 1)) * 100
                
                return (
                  <div 
                    key={formatDateFn(date, 'yyyy-MM')} 
                    className="absolute"
                    style={{ left: `${position}%`, transform: 'translateX(-50%)' }}
                  >
                    {/* Month label positioned above the timeline */}
                    <div className="text-xs text-gray-600 dark:text-gray-400 text-center whitespace-nowrap mb-2">
                      {formatDateFn(date, 'MMM yyyy')}
                    </div>
                  </div>
                )
              })}
            </div>
            
            {/* Timeline line */}
            <div className={`absolute left-0 right-0 h-1 ${lineColor} top-0`}></div>
            
            {/* Tick marks */}
            <div className="absolute left-0 right-0 top-0">
              {monthMarkers.map((date, index) => {
                const position = (index / (monthMarkers.length - 1)) * 100
                
                return (
                  <div 
                    key={`tick-${formatDateFn(date, 'yyyy-MM')}`} 
                    className="absolute"
                    style={{ left: `${position}%`, transform: 'translateX(-50%)' }}
                  >
                    {/* Tick marks */}
                    <div className={`h-3 w-0.5 ${lineColor} -mt-1`}></div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}