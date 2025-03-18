import React from 'react'
import Link from 'next/link'
import { TimelineItemData } from './timeline'

interface TimelineItemProps {
  item: TimelineItemData
  position: number
  verticalOffset: number
}

export const TimelineItem = ({ item, position, verticalOffset }: TimelineItemProps) => {
  const itemContent = (
    <div className="flex items-center rounded-full py-1 px-2.5 hover:shadow-md transition-all">
      {item.icon && <div className="mr-1.5 text-primary-600 dark:text-primary-500">{item.icon}</div>}
      <span className="text-sm font-medium whitespace-nowrap text-gray-900 dark:text-gray-100">{item.title}</span>
      {item.probability !== undefined && (
        <span className="ml-1.5 text-xs text-gray-600 dark:text-gray-400">
          ({Math.round(item.probability * 100)}%)
        </span>
      )}
    </div>
  )

  const itemStyle = {
    left: `${position}%`,
    transform: `translateX(-50%) translateY(${verticalOffset}px)`,
    transition: 'transform 0.2s ease-out'
  }

  // If path is provided, make it a link
  if (item.path) {
    return (
      <Link href={item.path} className="absolute" style={itemStyle}>
        {itemContent}
      </Link>
    )
  }

  // Otherwise render as a simple div
  return (
    <div className="absolute" style={itemStyle}>
      {itemContent}
    </div>
  )
}