export type PortfolioMetrics = {
  investmentValue: number
  cashInvestmentValue: number
  balance: number
  cashBalance: number
  spiceBalance: number
  totalDeposits: number
  totalCashDeposits: number
  loanTotal: number
  timestamp: number
  profit?: number
  userId: string
}
export type LivePortfolioMetrics = PortfolioMetrics & {
  dailyProfit: number
}
