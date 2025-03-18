import React from 'react'
import { Col } from 'web/components/layout/col'
import { Row } from 'web/components/layout/row'
import { ClickFrame } from 'web/components/widgets/click-frame'
import Link from 'next/link'
import { Timeline, TimelineItemData } from './timeline'
import { CopyLinkOrShareButton } from 'web/components/buttons/copy-link-button'

export interface TimelineCardProps {
  title: string
  description?: string
  items: TimelineItemData[]
  path?: string
  className?: string
  lineColor?: string
  shareUrl?: string
  shareEventName?: string
  backgroundColor?: string
}

export function TimelineCard({
  title,
  description,
  items,
  path,
  className = '',
  lineColor,
  backgroundColor = 'bg-gradient-to-br from-fuchsia-50 to-fuchsia-100 dark:from-fuchsia-800/40 dark:to-fuchsia-700/50'
}: TimelineCardProps) {
  const cardContent = (
    <>
      <Row className="justify-between">
        {path ? (
          <Link
            href={path}
            className="hover:text-primary-700 grow items-start font-semibold transition-colors hover:underline sm:text-lg"
          >
            {title}
          </Link>
        ) : (
          <div className="grow items-start font-semibold sm:text-lg">
            {title}
          </div>
        )}
      </Row>
      
      {description && (
        <div className="text-ink-500 text-sm mt-1">
          {description}
        </div>
      )}

      {/* Timeline with padding to ensure items don't overflow the card */}
      <div className="mt-4 mb-4 pb-16">
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