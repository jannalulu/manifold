import { scaleLinear, scaleTime } from 'd3-scale'
import { curveLinear } from 'd3-shape'
import dayjs from 'dayjs'
import { useLayoutEffect, useMemo } from 'react'
import { SingleValueHistoryChart } from 'web/components/charts/generic-charts'
import { Period } from 'common/period'
import { PortfolioSnapshot } from 'web/lib/supabase/portfolio-history'
import { ZoomParams } from '../charts/helpers'
import { Col } from '../layout/col'
import { GraphValueType, emptyGraphValues } from './portfolio-value-section'
import { findMinMax } from 'web/lib/util/minMax'
import { HistoryPoint } from 'common/chart'
import { PortfolioMetrics } from 'common/portfolio-metrics'
import { SPICE_TO_MANA_CONVERSION_RATE } from 'common/envs/constants'

export type GraphMode = 'portfolio' | 'profit'
export type PortfolioMode =
  | 'balance'
  | 'investment'
  | 'all'
  | 'spice'
  | 'profit'
export const MANA_COLOR = '#7c3aed'
export const CASH_COLOR = '#f59e0b'

export const PortfolioTooltip = (props: { date: Date }) => {
  const d = dayjs(props.date)
  return (
    <Col className="text-xs font-semibold sm:text-sm">
      <div>{d.format('MMM/D/YY')}</div>
      <div className="text-2xs text-ink-600 font-normal sm:text-xs">
        {d.format('h:mm A')}
      </div>
    </Col>
  )
}

export const PortfolioGraph = (props: {
  duration?: Period
  portfolioHistory: PortfolioSnapshot[]
  width: number
  height: number
  zoomParams?: ZoomParams
  negativeThreshold?: number
  hideXAxis?: boolean
  firstProfit: number
  firstCashProfit: number
  updateGraphValues: (newGraphValues: GraphValueType) => void
  portfolioFocus: PortfolioMode
  setPortfolioFocus: (mode: PortfolioMode) => void
  prefersPlay: boolean
}) => {
  const {
    duration,
    firstProfit,
    firstCashProfit,
    portfolioHistory,
    width,
    height,
    zoomParams,
    negativeThreshold = 0,
    hideXAxis,
    updateGraphValues,
    portfolioFocus,
    setPortfolioFocus,
    prefersPlay,
  } = props

  const {
    profitPoints,
    investmentPoints,
    balancePoints,
    networthPoints,
    cashProfitPoints,
    cashInvestmentPoints,
    cashBalancePoints,
    cashNetworthPoints,
  } = usePortfolioPointsFromHistory(
    portfolioHistory,
    firstProfit,
    firstCashProfit
  )

  const { minDate, maxDate, minValue, maxValue } = useMemo(() => {
    const minMaxBalancePoints = prefersPlay ? balancePoints : cashBalancePoints
    const minMaxInvestmentPoints = prefersPlay
      ? investmentPoints
      : cashInvestmentPoints
    const minMaxNetworthPoints = prefersPlay
      ? networthPoints
      : cashNetworthPoints

    const balanceXPoints = minMaxBalancePoints.map((d) => d.x)!
    const { min: balanceXMin, max: balanceXMax } = findMinMax(balanceXPoints)
    const balanceYPoints = minMaxBalancePoints.map((d) => d.y)!
    const { min: balanceYMin, max: balanceYMax } = findMinMax(balanceYPoints)

    const investmentXPoints = minMaxInvestmentPoints.map((d) => d.x)!
    const { min: investmentXMin, max: investmentXMax } =
      findMinMax(investmentXPoints)
    const investmentYPoints = minMaxInvestmentPoints.map((d) => d.y)!
    const { min: investmentYMin, max: investmentYMax } =
      findMinMax(investmentYPoints)

    const networthXPoints = minMaxNetworthPoints.map((d) => d.x)!
    const { min: networthXMin, max: networthXMax } = findMinMax(networthXPoints)
    const networthYPoints = minMaxNetworthPoints.map((d) => d.y)!
    const { min: networthYMin, max: networthYMax } = findMinMax(networthYPoints)

    const minMaxProfitPoints = prefersPlay ? profitPoints : cashProfitPoints
    const profitXPoints = minMaxProfitPoints.map((d) => d.x)!
    const { min: profitXMin, max: profitXMax } = findMinMax(profitXPoints)
    const profitYPoints = minMaxProfitPoints.map((d) => d.y)!
    const { min: profitYMin, max: profitYMax } = findMinMax(profitYPoints)

    let minDate = 0,
      maxDate = Date.now(),
      minValue = 0,
      maxValue = 0
    if (portfolioFocus === 'all') {
      minDate = networthXMin ?? 0
      maxDate = networthXMax ?? Date.now()
      minValue = networthYMin ?? 0
      maxValue = networthYMax ?? 0
    } else if (portfolioFocus === 'balance') {
      minDate = balanceXMin ?? 0
      maxDate = balanceXMax ?? Date.now()
      minValue = balanceYMin ?? 0
      maxValue = balanceYMax ?? 0
    } else if (portfolioFocus === 'investment') {
      minDate = investmentXMin ?? 0
      maxDate = investmentXMax ?? Date.now()
      minValue = investmentYMin ?? 0
      maxValue = investmentYMax ?? 0
    } else if (portfolioFocus === 'profit') {
      minDate = profitXMin ?? 0
      maxDate = profitXMax ?? Date.now()
      minValue = profitYMin ?? 0
      maxValue = profitYMax ?? 0
    } else if (portfolioFocus === 'spice') {
      minDate = balanceXMin ?? 0
      maxDate = balanceXMax ?? Date.now()
      minValue = balanceYMin ?? 0
      maxValue = balanceYMax ?? 0
    }
    return { minDate, maxDate, minValue, maxValue }
  }, [duration, portfolioFocus, prefersPlay])

  const tinyDiff = Math.abs(maxValue - minValue) < 20
  const xScale = scaleTime([minDate, maxDate], [0, width])
  const yScale = scaleLinear(
    [tinyDiff ? minValue - 50 : minValue, tinyDiff ? maxValue + 50 : maxValue],
    [height, 0]
  )
  const spiceYScale = scaleLinear()
    .domain(yScale.domain().map((d) => d / SPICE_TO_MANA_CONVERSION_RATE))
    .range([height, 0])

  useLayoutEffect(() => {
    zoomParams?.setXScale(xScale)
  }, [duration, portfolioFocus, prefersPlay])

  return (
    <SingleValueHistoryChart
      w={width}
      h={height}
      xScale={xScale}
      yScale={portfolioFocus == 'spice' ? spiceYScale : yScale}
      zoomParams={zoomParams}
      yKind={prefersPlay ? 'Ṁ' : 'sweepies'}
      data={
        portfolioFocus === 'all'
          ? prefersPlay
            ? networthPoints
            : cashNetworthPoints
          : portfolioFocus === 'balance'
          ? prefersPlay
            ? balancePoints
            : cashBalancePoints
          : portfolioFocus === 'investment'
          ? prefersPlay
            ? investmentPoints
            : cashInvestmentPoints
          : prefersPlay
          ? profitPoints
          : cashProfitPoints
      }
      color={prefersPlay ? MANA_COLOR : CASH_COLOR}
      Tooltip={(props) => <PortfolioTooltip date={xScale.invert(props.x)} />}
      onMouseOver={(p) => {
        if (portfolioFocus == 'all') {
          updateGraphValues({ net: p ? p.y : null })
        } else if (portfolioFocus == 'balance') {
          updateGraphValues({ balance: p ? p.y : null })
        } else if (portfolioFocus == 'investment') {
          updateGraphValues({ invested: p ? p.y : null })
        } else if (portfolioFocus == 'profit') {
          updateGraphValues({ profit: p ? p.y : null })
        }
      }}
      onMouseLeave={() => {
        updateGraphValues(emptyGraphValues)
      }}
      curve={curveLinear}
      negativeThreshold={negativeThreshold}
      hideXAxis={hideXAxis}
      onGraphClick={() => {
        setPortfolioFocus('all')
      }}
      areaClassName="hover:opacity-50 opacity-[0.2] transition-opacity"
      noWatermark
    />
  )
}

export const ProfitGraph = (props: {
  duration?: Period
  portfolioHistory: PortfolioSnapshot[]
  width: number
  height: number
  zoomParams?: ZoomParams
  negativeThreshold?: number
  hideXAxis?: boolean
  firstProfit: number
  firstCashProfit: number
  updateGraphValues: (newGraphValues: GraphValueType) => void
  prefersPlay: boolean
}) => {
  const {
    duration,
    firstProfit,
    firstCashProfit,
    portfolioHistory,
    width,
    height,
    zoomParams,
    negativeThreshold = 0,
    hideXAxis,
    updateGraphValues,
    prefersPlay,
  } = props

  const { profitPoints, cashProfitPoints } = usePortfolioPointsFromHistory(
    portfolioHistory,
    firstProfit,
    firstCashProfit
  )

  const { minDate, maxDate, minValue, maxValue } = useMemo(() => {
    const minMaxProfitPoints = prefersPlay ? profitPoints : cashProfitPoints

    const profitXPoints = minMaxProfitPoints.map((d) => d.x)!
    const { min: profitXMin, max: profitXMax } = findMinMax(profitXPoints)
    const profitYPoints = minMaxProfitPoints.map((d) => d.y)!
    const { min: profitYMin, max: profitYMax } = findMinMax(profitYPoints)
    return {
      minDate: profitXMin,
      maxDate: profitXMax,
      minValue: profitYMin,
      maxValue: profitYMax,
    }
  }, [duration, prefersPlay])

  const tinyDiff = Math.abs(maxValue - minValue) < 20
  const xScale = scaleTime([minDate, maxDate], [0, width])
  const yScale = scaleLinear(
    [tinyDiff ? minValue - 50 : minValue, tinyDiff ? maxValue + 50 : maxValue],
    [height, 0]
  )

  useLayoutEffect(() => {
    zoomParams?.setXScale(xScale)
  }, [duration])

  return (
    <SingleValueHistoryChart
      w={width}
      h={height}
      xScale={xScale}
      yScale={yScale}
      zoomParams={zoomParams}
      yKind={prefersPlay ? 'Ṁ' : 'sweepies'}
      data={prefersPlay ? profitPoints : cashProfitPoints}
      // eslint-disable-next-line react/prop-types
      Tooltip={(props) => <PortfolioTooltip date={xScale.invert(props.x)} />}
      onMouseOver={(p) => {
        updateGraphValues({ profit: p ? p.y : undefined })
      }}
      curve={curveLinear}
      color={['#14b8a6', '#F75836']}
      negativeThreshold={negativeThreshold}
      hideXAxis={hideXAxis}
      noWatermark
    />
  )
}

function usePortfolioPointsFromHistory(
  portfolioHistory: PortfolioSnapshot[],
  firstProfit: number,
  firstCashProfit: number
) {
  const {
    profitPoints,
    investmentPoints,
    balancePoints,
    networthPoints,
    cashProfitPoints,
    cashInvestmentPoints,
    cashBalancePoints,
    cashNetworthPoints,
  } = useMemo(() => {
    if (!portfolioHistory?.length) {
      return {
        profitPoints: [],
        investmentPoints: [],
        balancePoints: [],
        networthPoints: [],
        spicePoints: [],
        cashProfitPoints: [],
        cashInvestmentPoints: [],
        cashBalancePoints: [],
        cashNetworthPoints: [],
      }
    }

    const profitPoints: HistoryPoint<Partial<PortfolioMetrics>>[] = []
    const investmentPoints: HistoryPoint<Partial<PortfolioMetrics>>[] = []
    const balancePoints: HistoryPoint<Partial<PortfolioMetrics>>[] = []
    const networthPoints: HistoryPoint<Partial<PortfolioMetrics>>[] = []

    const cashProfitPoints: HistoryPoint<Partial<PortfolioMetrics>>[] = []
    const cashInvestmentPoints: HistoryPoint<Partial<PortfolioMetrics>>[] = []
    const cashBalancePoints: HistoryPoint<Partial<PortfolioMetrics>>[] = []
    const cashNetworthPoints: HistoryPoint<Partial<PortfolioMetrics>>[] = []

    function getProfit(
      balance: number,
      investment: number,
      totalDeposits: number,
      firstProfit: number
    ) {
      return balance + investment - totalDeposits - firstProfit
    }

    function getNetworth(
      balance: number,
      investment: number,
      spiceBalance?: number
    ) {
      return (
        balance +
        investment +
        (spiceBalance ?? 0) * SPICE_TO_MANA_CONVERSION_RATE
      )
    }

    portfolioHistory.forEach((p) => {
      profitPoints.push({
        x: p.timestamp,
        y: getProfit(
          p.balance + (p.spiceBalance ?? 0) * SPICE_TO_MANA_CONVERSION_RATE,
          p.investmentValue,
          p.totalDeposits,
          firstProfit
        ),
        obj: p,
      })
      investmentPoints.push({
        x: p.timestamp,
        y: p.investmentValue,
        obj: p,
      })
      balancePoints.push({
        x: p.timestamp,
        y: p.balance,
        obj: p,
      })
      networthPoints.push({
        x: p.timestamp,
        y: getNetworth(p.balance, p.investmentValue, p.spiceBalance),
        obj: p,
      })
      cashProfitPoints.push({
        x: p.timestamp,
        y: getProfit(
          p.cashBalance,
          p.cashInvestmentValue,
          p.totalCashDeposits,
          firstCashProfit
        ),
        obj: p,
      })
      cashInvestmentPoints.push({
        x: p.timestamp,
        y: p.cashInvestmentValue,
        obj: p,
      })
      cashBalancePoints.push({
        x: p.timestamp,
        y: p.cashBalance,
        obj: p,
      })
      cashNetworthPoints.push({
        x: p.timestamp,
        y: getNetworth(p.cashBalance, p.cashInvestmentValue),
        obj: p,
      })
    })
    return {
      profitPoints,
      investmentPoints,
      balancePoints,
      networthPoints,
      cashProfitPoints,
      cashInvestmentPoints,
      cashBalancePoints,
      cashNetworthPoints,
    }
  }, [portfolioHistory])

  return {
    profitPoints,
    investmentPoints,
    balancePoints,
    networthPoints,
    cashProfitPoints,
    cashInvestmentPoints,
    cashBalancePoints,
    cashNetworthPoints,
  }
}
