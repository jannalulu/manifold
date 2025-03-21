import React, { useMemo } from 'react'
import { BinaryContract, CPMMNumericContract, Contract } from 'common/contract'
import { Col } from 'web/components/layout/col'
import { useLiveContract } from 'web/hooks/use-contract'
import { getNumberExpectedValue } from 'common/src/number'
import { formatPercent } from 'common/util/format'
import { getDisplayProbability } from 'common/calculate'
import { CardBase, CardTitle, createContractClickHandler } from './card-base'
import { getGradient, getCompanyLogo } from '../common/ai-utils'

// Capability Card Component for the static cards with market data
export function CapabilityCard({ 
  title,
  marketId, 
  type, 
  displayType,
  contracts,
  className = ""
}: { 
  title: string
  marketId: string
  type: string
  displayType?: 'top-two-mcq' | 'top-one-mcq' | 'binary-odds' | 'date-numeric' | undefined
  contracts: Contract[]
  className?: string
}) {
  // Find the actual contract by ID
  const contract = useMemo(() => contracts.find(c => c.id === marketId), [contracts, marketId])
  
  // Always call hooks unconditionally
  const liveContract = contract ? useLiveContract(contract) : null
  
  // Get the expected value if it's a numeric contract
  const numericValue = liveContract && liveContract.outcomeType === 'NUMBER' 
    ? getNumberExpectedValue(liveContract as CPMMNumericContract) 
    : null
  
  // Get top two companies and their probabilities for "top-two-mcq" display type
  const getTopTwoOdds = () => {
    if (!liveContract || liveContract.outcomeType !== 'MULTIPLE_CHOICE') {
      return [{ text: '—', probability: 0 }, { text: '—', probability: 0 }]
    }
    
    const answers = liveContract.answers || []
    if (answers.length < 2) {
      return [{ text: '—', probability: 0 }, { text: '—', probability: 0 }]
    }
    
    // Sort answers by probability in descending order
    const sortedAnswers = [...answers].sort((a, b) => {
      const aProb = a.prob ?? 0
      const bProb = b.prob ?? 0
      return bProb - aProb
    })
    
    const result = [
      { 
        text: sortedAnswers[0].text || '—', 
        probability: sortedAnswers[0].prob ?? 0
      },
      { 
        text: sortedAnswers[1].text || '—', 
        probability: sortedAnswers[1].prob ?? 0 
      }
    ]
    return result
  }
  
  // Get top one model for "top-one-mcq" display type
  const getTopOneOdds = () => {
    if (!liveContract || 
        (liveContract.outcomeType !== 'MULTIPLE_CHOICE')) {
        return { text: '—', probability: 0 }
    }
    
    const answers = liveContract.answers || []
    if (answers.length < 1) {
      return { text: '—', probability: 0 }
    }
    
    // Sort answers by probability in descending order and get top one
    const sortedAnswers = [...answers].sort((a, b) => {
      const aProb = a.prob ?? 0
      const bProb = b.prob ?? 0
      return bProb - aProb
    })
    
    const result = { 
      text: sortedAnswers[0].text || '—', 
      probability: sortedAnswers[0].prob ?? 0 
    }
    
    return result
  }
  
  // Determine the value to display
  let displayValue = formatPercent(0.25) // '-'
  let topCompanies = [{ text: '—', probability: 0 }, { text: '—', probability: 0 }]
  let topModel = { text: '—', probability: 0 }
  
  if (displayType === 'top-two-mcq' && liveContract && liveContract.outcomeType === 'MULTIPLE_CHOICE') {
  topCompanies = getTopTwoOdds()
} else if (displayType === 'top-one-mcq') {
  topModel = getTopOneOdds()
} else if (displayType === 'binary-odds') {
  if (liveContract && liveContract.outcomeType === 'BINARY') {
    const prob = liveContract.prob !== undefined 
      ? liveContract.prob 
      : getDisplayProbability(liveContract as BinaryContract)
    displayValue = formatPercent(prob)
  } 
} else {
  // Default fallback
  displayValue = numericValue !== null 
    ? numericValue.toFixed(1)
    : formatPercent(0.25)
  }
  
  // Create click handler for the card
  const clickHandler = createContractClickHandler(contract ?? null, liveContract, title, marketId, displayType)
  
  if (displayType === 'top-two-mcq') {
    return (
      <CardBase onClick={clickHandler} className={className}>
        <Col className="h-full space-y-1 sm:space-y-2">
          <div className="w-full">
            <CardTitle 
              title={title} 
              type={type} 
              showModelIcon={type === 'releases'} 
              showTooltip={type === 'benchmark' || type === 'prize'}
            />
          </div>
          
          {/* VS Match Layout */}
          <div className="rounded-md p-2 sm:p-3 flex-1 flex flex-col justify-center">
            <div className="flex items-center justify-between px-1">

              {/* Left Company */}
              <div className="text-center w-[38%]">
                {getCompanyLogo(topCompanies[0].text) ? (
                  <div className="flex flex-col items-center">
                    <div className="h-14 w-14 sm:h-16 sm:w-16 mb-1 sm:mb-2 flex items-center justify-center text-primary-600">
                      {React.createElement(getCompanyLogo(topCompanies[0].text) as React.FC<{className?: string}>, { 
                        className: "w-12 h-12 sm:w-14 sm:h-14" 
                      })}
                    </div>
                    <div className="text-lg sm:text-xl font-bold text-ink-900">
                      {topCompanies[0].text}
                    </div>
                  </div>
                ) : (
                  <div className="text-2xl sm:text-3xl font-bold text-ink-900 truncate">
                    {topCompanies[0].text}
                  </div>
                )}
                <div className="text-xs sm:text-base text-ink-600 mt-1 font-medium">
                  {formatPercent(topCompanies[0].probability)}
                </div>
              </div>
              
              {/* VS Badge */}
              <div className="text-primary-800 text-med font-black mx-4">
                VS
              </div>
              
              {/* Right Company */}
              <div className="text-center w-[38%]">
                {getCompanyLogo(topCompanies[1].text) ? (
                  <div className="flex flex-col items-center">
                    <div className="h-14 w-14 mb-1 flex items-center justify-center text-primary-600">
                      {React.createElement(getCompanyLogo(topCompanies[1].text) as React.FC<{className?: string}>, { 
                        className: "w-12 h-12" 
                      })}
                    </div>
                    <div className="text-base sm:text-lg font-bold text-ink-900">
                      {topCompanies[1].text}
                    </div>
                  </div>
                ) : (
                  <div className="text-base sm:text-lg font-bold text-ink-900 truncate">
                    {topCompanies[1].text}
                  </div>
                )}
                <div className="text-xs sm:text-base text-ink-600 mt-1 font-medium">
                  {formatPercent(topCompanies[1].probability)}
                </div>
              </div>
            </div>
            
            {/* Probability Bar */}
            <div className="mt-2 sm:mt-4 h-1.5 w-full rounded-full bg-ink-200 dark:bg-ink-700 overflow-hidden">
              {/* Calculate the width percentage based on probabilities */}
              <div 
                className="h-full bg-primary-600 dark:bg-primary-500" 
                style={{
                  width: `${(topCompanies[0].probability / (topCompanies[0].probability + topCompanies[1].probability)) * 100}%` 
                }}
              />
            </div>
          </div>
        </Col>
      </CardBase>
    )
  }
  
  // For top-one-mcq display type
  if (displayType === 'top-one-mcq') {
    // For monthly type, display similar to top-two-mcq but with only one company
    if (type === 'monthly') {
      return (
        <CardBase onClick={clickHandler} className={className}>
          <Col className="h-full space-y-2">
            <div className="w-full">
              <CardTitle 
                title={title} 
                type={type} 
                showModelIcon
                showTooltip
              />
            </div>
            
            {/* Company Layout single company */}
            <div className="rounded-md p-2 sm:p-3 flex-1 flex flex-col justify-center">
              <div className="flex items-center justify-center">
                {/* Company Display */}
                <div className="text-center">
                  {getCompanyLogo(topModel.text) ? (
                    <div className="flex flex-col items-center">
                      <div className="h-14 w-14 mb-1 flex items-center justify-center text-primary-600">
                        {React.createElement(getCompanyLogo(topModel.text) as React.FC<{className?: string}>, { 
                          className: "w-12 h-12" 
                        })}
                      </div>
                      <div className="text-lg sm:text-xl font-bold text-ink-900">
                        {topModel.text}
                      </div>
                    </div>
                  ) : (
                    <div className="text-2xl sm:text-3xl font-bold text-ink-900 truncate">
                      {topModel.text}
                    </div>
                  )}
                  <div className="text-xs sm:text-base text-ink-600 mt-1 font-medium">
                    {formatPercent(topModel.probability)}
                  </div>
                </div>
              </div>
            </div>
          </Col>
        </CardBase>
      )
    }
    
    return (
      <CardBase onClick={clickHandler} className={className}>
        <Col className="h-full space-y-1 sm:space-y-2">
          <div className="w-full">
            <CardTitle 
              title={title} 
              type={type} 
              showModelIcon={type === 'releases'} 
              showTooltip={type === 'benchmark' || type === 'prize'}
            />
          </div>
          
          <div className="flex flex-col h-full justify-between">
            {/* Main content - centered model name */}
            <div className="rounded-md p-2 sm:p-3 flex-1 flex items-center justify-center">
              <div className={`font-medium text-center ${topModel.text.length > 15 ? 'text-2xl sm:text-3xl' : topModel.text.length > 10 ? 'text-3xl sm:text-4xl' : 'text-4xl sm:text-5xl'}`}>
                <span className={getGradient(type)}>
                  {topModel.text}
                </span>
              </div>
            </div>
            
            {/* Bottom-aligned probability display */}
            <div className="text-ink-600 text-xs sm:text-sm mt-1 sm:mt-3 text-left w-full px-1">
              Probability: <span className="font-medium">{formatPercent(topModel.probability)}</span>
            </div>
          </div>
        </Col>
      </CardBase>
    )
  }

  // Standard card layout for remaining display types
  return (
    <CardBase onClick={clickHandler} className={className}>
      <Col className="h-full">
        <div className="w-full mb-1">
          <CardTitle 
            title={title} 
            type={type} 
            showModelIcon={type === 'releases'} 
            showTooltip={type === 'benchmark' || type === 'prize'}
          />
        </div>
        
        <div className="flex flex-col items-center justify-center flex-grow mt-1 sm:mt-2">
          {displayType === 'binary-odds' ? (
            <div className="flex flex-col justify-between h-full w-full">
              <div className="flex-1 flex items-center justify-center">
                <div className={`font-medium text-center ${displayValue.length > 5 ? 'text-5xl sm:text-6xl' : 'text-5xl sm:text-6xl'}`}>
                  <span className={getGradient(type)}>
                    {displayValue}
                  </span>
                </div>
              </div>
              {/* Brief descriptive text under percentages */}
              {(type === 'benchmark' || type === 'prize' || type === 'misuse' || type === 'long-term') && (
                <p className="text-ink-600 text-xs sm:text-sm mt-1 sm:mt-3 text-left w-full px-1">
                  {type === 'benchmark' && title.includes('IMO Gold') && 'An LLM gets a IMO gold medal'}
                  {type === 'benchmark' && title.includes('Frontier Math') && 'An LLM gets 80%+'}
                  {type === 'benchmark' && title.includes('SWE Bench') && 'LLM Top Score'}
                  {type === 'benchmark' && title.includes('Last Exam') && 'LLM > Human'}
                  {type === 'prize' && title.includes('Millennium') && 'Chance of solving a million-dollar math problem by June 2025'}
                  {type === 'prize' && title.includes('Arc AGI') && 'Probability of claiming Arc-AGI prize by end of 2025'}
                  {type === 'prize' && title.includes('Turing Test') && 'Probability of passing this variation of the Turing Test by 2029'}
                  {type === 'misuse' && title.includes('Hacking') && 'Probability of AI compromising systems by end of 2025'}
                  {type === 'long-term' && title.includes('Romantic') && 'At least 1/1000 Americans talks weekly with one'}
                  {type === 'long-term' && title.includes('Blackmail') && 'Risk of AI being used for automated blackmail'}
                  {type === 'long-term' && title.includes('Economic') && 'Break in trend for GDP growth, GDP/capita, productivity, or unemployment'}
                  {type === 'long-term' && title.includes('Zero') && 'AI plays a random computer game as well as a human'}
                  {type === 'long-term' && title.includes('Self-play') && 'AI plays a random computer game as well as a human after self-play'}
                </p>
              )}
            </div>
          ) : displayType === 'date-numeric' ? (
            <div className="h-full flex-1 flex items-center justify-center">
              <div className={`font-medium text-center ${displayValue.length > 5 ? 'text-3xl sm:text-4xl' : displayValue.length > 3 ? 'text-4xl sm:text-5xl' : 'text-5xl sm:text-6xl'}`}>
                <span className={getGradient(type)}>
                  {displayValue}
                </span>
              </div>
            </div>
          ) : (
            <div className="h-full flex-1 flex items-center justify-center">
              <div className={`font-medium text-center ${displayValue.length > 5 ? 'text-3xl sm:text-4xl' : displayValue.length > 3 ? 'text-4xl sm:text-5xl' : 'text-5xl sm:text-6xl'}`}>
                <span className={getGradient(type)}>
                  {displayValue}
                </span>
              </div>
            </div>
          )}
        </div>
      </Col>
    </CardBase>
  )
}