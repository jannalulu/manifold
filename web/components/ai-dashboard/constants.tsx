// Define types for capability cards
export type AICapabilityCard = {
  title: string
  description: string
  marketId: string
  type: string
  displayType?: 'top-two-mcq' | 'top-one-mcq' | 'binary-odds' | 'date-numeric'
}

export const AI_CAPABILITY_CARDS: AICapabilityCard[] = [
  // Monthly markets
  {
    title: 'LMSYS',
    description: 'Highest ranked model on lmsys',
    marketId: '0t8A5ZA0zQ',
    type: 'monthly',
    displayType: 'top-two-mcq',
  },
  {
    title: 'AiderBench',
    description: 'Highest ranked model on Aider',
    marketId: 'LsZPyLPI82', // Top April LMSYS
    type: 'monthly',
    displayType: 'top-one-mcq',
  },
  
  // Releases
  {
    title: 'GPT-5',
    description: 'GPT-5 model released by EOY',
    marketId: 'XAsltiEcvy7KwJveXQ42',
    type: 'releases',
    displayType: 'top-one-mcq'
  },
  {
    title: 'Claude 3.7 Opus',
    description: '',
    marketId: 'REZNpc8dQO',
    type: 'releases',
    displayType: 'top-one-mcq',
  },
  {
    title: 'Gemini 3',
    description: '',
    marketId: 'placeholder-3',
    type: 'releases',
    displayType: 'date-numeric'
  },
  {
    title: 'Grok 4',
    description: '',
    marketId: 'QUyRsPRhgd',
    type: 'releases',
    displayType: 'top-one-mcq'
  },
  {
    title: 'Deepseek R2',
    description: '',
    marketId: 'hZ8ytzn9gh',
    type: 'releases',
    displayType: 'top-one-mcq'
  },
  {
    title: 'Deepseek V4',
    description: '',
    marketId: 'yLnQQZsc2E',
    type: 'releases',
    displayType: 'top-one-mcq'
  },

  // Benchmarks
  {
    title: 'IMO Gold',
    description: 'AI gets gold on IMO by EOY',
    marketId: 'tu2ouer9zq',
    type: 'benchmark',
    displayType: 'binary-odds'
  },
  {
    title: 'SWE Bench Top Score',
    description: 'Top SWE Bench score by EOY',
    marketId: 'placeholder-2',
    type: 'benchmark',
    displayType: 'binary-odds'
  },
  {
    title: 'Highest Humanity\'s Last Exam Top Score',
    description:'Highest score on Humanity\'s last exam by EOY',
    marketId: 'tzsZCn85RQ',
    type: 'benchmark',
    displayType: 'binary-odds'
  },
  {
    title: 'CodeForces Top Score',
    description: '>80% on Frontier Math by EOY',
    marketId: 'RSAcZtOZyl',
    type: 'benchmark',
    displayType: 'top-one-mcq'
  },
    {
    title: 'Frontier Math Top Score',
    description: 'top performance on frontier math',
    marketId: 'Uu5q0usuQg',
    type: 'benchmark',
    displayType: 'top-one-mcq'
  },
  
  // Prizes
  {
    title: 'Millennium Prize',
    description: 'AI Solve Millennium Problem by EOY',
    marketId: 'KmvP3Ggw5z7vFATu5urA',
    type: 'prize',
    displayType: 'binary-odds'
  },
  {
    title: 'Arc AGI',
    description: 'Arc AGI prize by EOY',
    marketId: 'W1KGdImLB5cb1p75M88e',
    type: 'prize',
    displayType: 'binary-odds'
  },
  {
    title: 'Turing Test (Long Bets)',
    description: 'Will AI pass long bets Turing Test by EOY?',
    marketId: 'nKyHon3IPOqJYzaWTHJB',
    type: 'prize',
    displayType: 'binary-odds'
  },
  
  // AI misuse
  {
    title: 'Hacking',
    description: 'AI independently hacks a system',
    marketId: 's82955uAnR',
    type: 'misuse',
    displayType: 'binary-odds'
  },
  
  // 2028 Predictions
  {
    title: 'AI Blackmail by 2028',
    description: 'AI Blackmails someone for >$1000',
    marketId: 'W1KGdImLB5cb1p75M88e',
    type: 'long-term',
    displayType: 'binary-odds'
  },
  {
    title: 'AI Romantic Companions',
    description: 'At least 1/1000 Americans be talking at least weekly to an AI they consider a romantic companion?',
    marketId: 'kpG0hv16d75ai3JcKZds',
    type: 'long-term',
    displayType: 'binary-odds'
  },
  {
    title: 'Discontinuous Change in Economic Variables',
    description: 'Visible break in trend line on US GDP, GDP per capita, unemployment, or productivity',
    marketId: 'zg7xJ5ZkJJ4wJPJDPjWO',
    type: 'long-term',
    displayType: 'binary-odds'
  },
  {
    title: 'Zero-shot Human-level Game Performance',
    description: 'AI plays computer games at human level',
    marketId: 'barjfHPUpHGNKSfhBhJx',
    type: 'long-term',
    displayType: 'binary-odds'
  },
  {
    title: 'Self-play Human-level Game Performance',
    description: 'AI plays computer games at human level',
    marketId: 'HS8ndzFminW0UN2kRDgq',
    type: 'long-term',
    displayType: 'binary-odds'
  }
]