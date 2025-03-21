import React, { useMemo } from 'react'
import { Contract, contractPath } from 'common/contract'
import { AICapabilityCard } from './constants'
import { TimelineCard, TimelineItemData } from 'web/components/timeline'
import { AIModelIcon, getEstimatedReleaseDate } from './utils'

// Timeline component for model releases
interface ModelReleasesTimelineProps {
  cards: AICapabilityCard[]
  contracts: Contract[]
}

export function ModelReleasesTimeline({ cards, contracts }: ModelReleasesTimelineProps) {
  // Prepare timeline items with release dates and model info
  const timelineItems = useMemo(() => {
    return cards.map((card, index) => {
      // Find the contract
      const contract = contracts.find(c => c.id === card.marketId) || null
      const releaseDate = getEstimatedReleaseDate(card.title, index)
      
      return {
        title: card.title,
        path: contract ? contractPath(contract) : `#${card.marketId}`,
        releaseDate,
        icon: <AIModelIcon title={card.title} className="w-4 h-4 sm:w-6 sm:h-6" />
      } as TimelineItemData
    })
  }, [cards, contracts])
  
  if (timelineItems.length === 0) {
    return <div className="text-ink-500 text-center py-4">No model releases to display</div>
  }

  return (
    <TimelineCard
      items={timelineItems}
      lineColor="bg-fuchsia-700 dark:bg-fuchsia-500"
      backgroundColor="bg-fuchsia-50 dark:bg-fuchsia-800/20"
    />
  )
}