import React, { useMemo } from 'react'
import { BinaryContract, CPMMNumericContract, Contract, contractPath } from 'common/contract'
import { Col } from 'web/components/layout/col'
import { Row } from 'web/components/layout/row'
import { useLiveContract } from 'web/hooks/use-contract'
import { getNumberExpectedValue } from 'common/src/number'
import { Clock } from 'web/components/clock/clock'
import { NumericBetPanel } from 'web/components/answers/numeric-bet-panel'
import Link from 'next/link'
import { LuLink } from 'react-icons/lu'
import { CapabilityCard } from './capability-card'
import { ModelReleasesTimeline } from './model-releases-timeline'
import { AI_CAPABILITY_CARDS } from './constants'
import { CARD_BG_PATTERN, getAccentColor } from './utils'
import { CardBase } from './card-components'

export interface AIForecastProps {
  whenAgi: CPMMNumericContract | null
  contracts: Contract[]
  hideTitle?: boolean
}

export function AIForecast({ whenAgi, contracts = [], hideTitle }: AIForecastProps) {
  const liveWhenAgi = whenAgi && whenAgi.id ? useLiveContract(whenAgi) : null
  const expectedValueAGI = liveWhenAgi ? getNumberExpectedValue(liveWhenAgi) : 2030
  const eventYear = Math.floor(expectedValueAGI)
  const eventMonth = Math.round((expectedValueAGI - eventYear) * 12)
  const expectedYear = new Date(eventYear, eventMonth, 1)
  
  const capabilityCardsByType = AI_CAPABILITY_CARDS.reduce((grouped, card) => {
    if (!grouped[card.type]) {
      grouped[card.type] = []
    }
    grouped[card.type].push(card)
    return grouped
  }, {} as Record<string, typeof AI_CAPABILITY_CARDS>)
  
  const typeInfo = { // controls sorting
    'monthly': {
      label: 'Best Model in March',
      description: 'What\'s the best model this month?'
    },
    'releases': {
      label: 'Model Releases',
      description: 'When will [insert lab here] release the next model?'
    },
    'benchmark': {
      label: 'Benchmarks',
      description: 'How smart will the LLMs be by the end of this year?'
    },
    'prize': {
      label: 'Prizes',
      description: 'Will any model claim this prize by the end of this year?'
    },
    'misuse': {
      label: 'AI Misuse',
      description: 'How misaligned are these models?'
    },
    'long-term': {
      label: 'Long-term Predictions',
      description: 'What happens in the long-run?'
    }
  }

  return (
    <Col className="mb-8 gap-4 px-1 sm:gap-6 sm:px-2">
      <Col className={hideTitle ? 'hidden' : ''}>
        <div className="text-primary-700 mt-4 text-2xl font-normal sm:mt-0 sm:text-3xl">
          Manifold AI Forecast
        </div>
        <div className="text-ink-500 text-md mt-2 flex font-normal">
          Manifold market odds on AI progress
        </div>
      </Col>
      
      {/* Card Categories */}
      {Object.entries(typeInfo).map(([type, info], index) => (
        <Col key={type} className={`${index > 0 ? 'mt-12 pt-8 border-t border-ink-200 dark:border-ink-800/50' : 'mt-6'}`} id={type}>
          <div className="mb-3">
            <Row className="items-center justify-between">
              <div>
                <h3 className={`items-center gap-1 font-semibold text-xl ${getAccentColor(type)}`}>
                  {info.label}
                </h3>
                <p className="text-ink-500 text-sm mt-1">
                  {info.description}
                </p>
              </div>
              <Link 
                href={`#${type}`} 
                className="flex items-center justify-center p-2 text-primary-500 hover:text-primary-700 hover:bg-primary-50 rounded-full transition-all duration-200"
                scroll={false}
                aria-label={`Link to ${info.label} section`}
              >
                <LuLink size={18} />
              </Link>
            </Row>
          </div>
          
          {type === 'releases' ? (
            // Display releases on a timeline
            <ModelReleasesTimeline 
              cards={capabilityCardsByType[type] || []}
              contracts={contracts}
            />
          ) : (
            // Display other card types in a grid
            <div className={`grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 gap-3 mt-2 relative rounded-lg ${CARD_BG_PATTERN}`}>
              {capabilityCardsByType[type]?.map((card, idx) => {
                // Special sizing for "monthly" type cards
                let cardClassName = ""
                
                // For "monthly" cards
                if (type === "monthly") {
                  // All monthly cards should be single column on mobile
                  cardClassName = "col-span-2 sm:col-span-1"
                  
                  // First monthly card gets additional width on medium+ screens
                  if (idx === 0) {
                    cardClassName += " md:col-span-2"
                  }
                }
                
                return (
                  <CapabilityCard 
                    key={idx}
                    title={card.title}
                    marketId={card.marketId}
                    type={card.type}
                    displayType={card.displayType}
                    contracts={contracts}
                    className={`${card.type} ${cardClassName}`}
                  />
                )
              })}
            </div>
          )}
        </Col>
      ))}
      
      {/* AGI Clock Card */}
      {liveWhenAgi && (
        <div className="mt-12 pt-8 border-t border-ink-200 dark:border-ink-800/50">
          <CardBase
            onClick={() => window.location.href = contractPath(liveWhenAgi)}
            className="fade-in group relative mx-auto"
            minHeight=""
        >
          <Row className="justify-between">
            <Link
              href={contractPath(liveWhenAgi)}
              className="hover:text-primary-700 grow items-start font-semibold transition-colors hover:underline sm:text-lg"
            >
              When will we achieve artificial general intelligence?
            </Link>
          </Row>
          
          <Row className="mt-4 justify-between flex-wrap md:flex-nowrap">
            <Col className="w-full gap-3">
              <div className="text-left mb-2">
                <p className="text-lg">
                  The market expects AGI by{' '}
                  <span className="font-semibold">{expectedYear.getFullYear()}</span>
                  {' '}. What do you think?
                </p>
              </div>
              <div className="w-full flex justify-center">
                <div className="w-full">
                  <Clock year={expectedValueAGI} className="w-full" />
                </div>
              </div>
              <NumericBetPanel
                contract={liveWhenAgi}
                labels={{
                  lower: 'sooner',
                  higher: 'later',
                }}
              />
            </Col>
          </Row>
        </CardBase>
        </div>
      )}
    </Col>
  )
}