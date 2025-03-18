import React from 'react'
import { ClickFrame } from 'web/components/widgets/click-frame'
import { Timeline, TimelineItemData } from './timeline'

export interface TimelineCardProps {
  items: TimelineItemData[]
  path?: string
  className?: string
  lineColor?: string
  backgroundColor?: string
}

export function TimelineCard({
  items,
  path,
  className = '',
  lineColor,
  backgroundColor = 'bg-gradient-to-br from-fuchsia-50 to-fuchsia-100 dark:from-fuchsia-800/40 dark:to-fuchsia-700/50'
}: TimelineCardProps) {
  const cardContent = (
    <>
      {/* Padding at the top to match the original component with title and description */}
      <div className="pt-4"></div>

      {/* Timeline with padding to ensure items don't overflow the card */}
      <div className="mb-4 pb-16">
        <Timeline 
          items={items} 
          lineColor={lineColor} 
          className="px-6 py-2"
        />
      </div>
    </>
  )

  const cardClassName = `group rounded-lg p-4 border border-ink-200 dark:border-ink-300
    transition-all hover:shadow-md shadow-[2px_2px_4px_rgba(0,0,0,0.05)] dark:shadow-[2px_2px_4px_rgba(0,0,0,0.15)] 
    relative overflow-hidden ${backgroundColor} ${className}`

  if (path) {
    return (
      <ClickFrame
        className={cardClassName}
        onClick={() => path && window.open(path, '_blank')}
      >
        {cardContent}
      </ClickFrame>
    )
  }

  return (
    <div className={cardClassName}>
      {cardContent}
    </div>
  )
}