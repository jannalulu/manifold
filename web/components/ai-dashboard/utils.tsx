import React from 'react'
import { SiOpenai, SiGooglegemini, SiAnthropic } from 'react-icons/si'
import { RiTwitterXLine } from 'react-icons/ri'
import { GiSpermWhale } from "react-icons/gi"
import { PiBirdBold } from "react-icons/pi"
import { LiaKiwiBirdSolid } from "react-icons/lia"

// Shared background pattern for all cards
export const BG_PATTERN_LIGHT = "bg-[url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23000000' fill-opacity='0.02' fill-rule='evenodd'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/svg%3E\")]"
export const BG_PATTERN_DARK = "dark:bg-[url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23FFFFFF' fill-opacity='0.05' fill-rule='evenodd'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/svg%3E\")]"
export const CARD_BG_PATTERN = `${BG_PATTERN_LIGHT} ${BG_PATTERN_DARK}`

export const ENDPOINT = 'ai'

// Function to get the appropriate description for tooltip based on card title
export function getTooltipDescription(cardTitle: string): string {
  const keyTerms: Record<string, string> = {
    'IMO Gold': 'The International Mathematical Olympiad (IMO) is the world championship mathematics competition for high school students. Getting a gold medal requires a high score on extremely challenging math problems.',
    'Frontier Math': 'Advanced mathematical problems at the cutting edge of research that have traditionally been very difficult for AI systems to solve.',
    'SWE Bench': 'A test of AI coding capabilities across real-world software engineering tasks from GitHub issues.',
    'Humanity\'s Last Exam': 'A collection of extremely difficult problems across various domains, designed to test the limits of AI capabilities compared to human experts.',
    'Millennium Prize': 'The Millennium Prize Problems are seven of the most difficult unsolved problems in mathematics, each with a $1 million prize for solution.',
    'Arc AGI': 'Anthropic\'s Rubric for AI Capability Evaluation - a comprehensive benchmark designed to evaluate artificial general intelligence capabilities.',
    'Turing Test': 'Each of the three human judges will conduct two hour long text-based interviews with each of the four candidates. The computer would have passed the Turing test if it fooled two of the three judges.',
    'CodeForces': 'CodeForces is a competitive programming platform with challenging algorithmic problems that test reasoning, efficiency, and mathematical thinking.'
  }
  
  // Find the first matching key term in the title
  for (const [term, description] of Object.entries(keyTerms)) {
    if (cardTitle.includes(term)) {
      return description
    }
  }
  
  // Default description if no match is found
  return `Please Google for more information about "${cardTitle}" benchmark.`
}

// Get accent color based on card type
export function getAccentColor(type: string) {
  switch(type) {
    case 'monthly': return 'text-primary-600 dark:text-primary-500'
    case 'releases': return 'text-fuchsia-700 dark:text-fuchsia-500'
    case 'benchmark': return 'text-teal-700 dark:text-teal-500'
    case 'prize': return 'text-amber-700 dark:text-amber-500'
    case 'misuse': return 'text-rose-700 dark:text-rose-500'
    case 'long-term': return 'text-sky-700 dark:text-sky-500'
    default: return 'text-primary-600 dark:text-primary-500'
  }
}

// Get gradient based on card type
export function getGradient(type: string, isText = true) {
  const textPrefix = isText ? 'text-transparent bg-clip-text ' : ''
  
  switch(type) {
    case 'releases':
      return `${textPrefix}bg-gradient-to-r from-fuchsia-500 via-fuchsia-600 to-fuchsia-700 dark:from-fuchsia-400 dark:via-fuchsia-500 dark:to-fuchsia-600`
    case 'benchmark':
      return `${textPrefix}bg-gradient-to-r from-teal-500 via-teal-600 to-teal-700 dark:from-teal-400 dark:via-teal-500 dark:to-teal-600`
    case 'prize':
      return `${textPrefix}bg-gradient-to-br from-amber-500 via-amber-600 to-amber-700 dark:from-amber-400 dark:via-amber-500 dark:to-amber-600`
    case 'misuse':
      return `${textPrefix}bg-gradient-to-br from-rose-500 via-rose-600 to-rose-700 dark:from-rose-400 dark:via-rose-500 dark:to-rose-600`
    case 'long-term':
      return `${textPrefix}bg-gradient-to-br from-cyan-500 via-cyan-600 to-cyan-700 dark:from-cyan-400 dark:via-cyan-500 dark:to-cyan-600`
    default:
      return `${textPrefix}bg-gradient-to-br from-primary-500 via-primary-600 to-primary-700 dark:from-primary-400 dark:via-primary-500 dark:to-primary-600`
  }
}

// Get card background color based on card class or type
export function getCardBgColor(className: string) {
  // Extract card type from className if it exists
  let cardType = ''
  if (className.includes('monthly')) {
    cardType = 'monthly' // Special case for the large monthly card
  }
  
  // Card background colors
  switch(cardType) {
    case 'monthly':
      return 'bg-primary-50 dark:bg-primary-800/20'
    default:
      // If we don't know the type from className, use the card type patterns
      if (className.includes('prize')) {
        return 'bg-amber-50 dark:bg-amber-800/30'
      }
      if (className.includes('benchmark')) {
        return 'bg-teal-50 dark:bg-teal-800/38'
      }
      if (className.includes('releases')) {
        return 'bg-fuchsia-50 dark:bg-fuchsia-800/30'
      }
      if (className.includes('misuse')) {
        return 'bg-rose-50 dark:bg-rose-800/30'
      }
      if (className.includes('long-term')) {
        return 'bg-cyan-50 dark:bg-cyan-800/30'
      }
      // Default background
      return 'bg-gray-50 dark:bg-gray-700/20'
  }
}

// Helper function for model release timeline (dummy data)
export function getEstimatedReleaseDate(title: string, index: number): Date {
  // Hardcoded dates for specific model releases
  if (title.includes('GPT-5')) return new Date(2025, 5, 15)         // June 15, 2025
  if (title.includes('Claude 3.7')) return new Date(2025, 8, 8)      // August 1, 2025
  if (title.includes('Gemini 3')) return new Date(2025, 4, 1)        // May 1, 2025
  if (title.includes('Grok 4')) return new Date(2025, 10, 10)        // November 10, 2025
  if (title.includes('Deepseek R2')) return new Date(2025, 6, 5)     // July 5, 2025
  if (title.includes('Deepseek V4')) return new Date(2026, 0, 15)    // January 15, 2026
  
  // Default fallback with evenly spaced dates
  return new Date(2025, 3 + (index % 10), 15)
}

// Component for showing AI model icon
export function AIModelIcon({ title, className = "h-5 w-5" }: { title: string, className?: string }) {
  if (title.includes('GPT')) return <SiOpenai className={className} />
  if (title.includes('Claude')) return <SiAnthropic className={className} />
  if (title.includes('Gemini')) return <SiGooglegemini className={className} />
  if (title.includes('Grok')) return <RiTwitterXLine className={className} />
  if (title.includes('Deepseek')) return <GiSpermWhale className={className} />
  if (title.includes('Qwen')) return <PiBirdBold className={className} />
  return null
}

// Get company logo component based on company name
export function getCompanyLogo(companyName: string): React.ComponentType | null {
  // Strip any trailing whitespace or periods that might be in the company name
  const normalizedName = companyName.trim().replace(/\.$/, '')
  
  switch (normalizedName.toLowerCase()) {
    case 'openai':
    case 'gpt-5':
      return SiOpenai
    case 'anthropic':
    case 'claude':
      return SiAnthropic
    case 'gemini':
    case 'deepmind':
    case 'google':
      return SiGooglegemini
    case 'xai':
    case 'grok':
      return RiTwitterXLine // Using X icon for xAI
    default:
      return LiaKiwiBirdSolid // No specific icon for other companies
  }
}