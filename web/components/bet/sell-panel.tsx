import clsx from 'clsx'
import { Answer } from 'common/answer'
import { APIError } from 'common/api/utils'
import { LimitBet } from 'common/bet'
import { getCpmmProbability } from 'common/calculate-cpmm'
import {
  CPMMContract,
  CPMMMultiContract,
  CPMMNumericContract,
  MultiContract,
} from 'common/contract'
import { TRADE_TERM } from 'common/envs/constants'
import { Fees, getFeeTotal } from 'common/fees'
import { getFormattedMappedValue, getMappedValue } from 'common/pseudo-numeric'
import { getSharesFromStonkShares, getStonkDisplayShares } from 'common/stonk'
import { User } from 'common/user'
import {
  formatLargeNumber,
  formatPercent,
  formatShares,
  formatWithToken,
} from 'common/util/format'
import { useState, useRef } from 'react'
import toast from 'react-hot-toast'
import { api } from 'web/lib/api/api'
import { track } from 'web/lib/service/analytics'
import { WarningConfirmationButton } from '../buttons/warning-confirmation-button'
import { Col } from '../layout/col'
import { Row } from '../layout/row'
import { Spacer } from '../layout/spacer'
import { AmountInput } from '../widgets/amount-input'
import { MoneyDisplay } from './money-display'
import { ContractMetric } from 'common/contract-metric'
import { uniq } from 'lodash'
import { useUnfilledBetsAndBalanceByUserId } from 'client-common/hooks/use-bets'
import { useIsPageVisible } from 'web/hooks/use-page-visible'
import { getSaleResult, getSaleResultMultiSumsToOne } from 'common/sell-bet'

export function SellPanel(props: {
  contract: CPMMContract | MultiContract
  metric: ContractMetric | undefined
  shares: number
  sharesOutcome: 'YES' | 'NO'
  user: User
  onSellSuccess?: () => void
  answerId?: string
  binaryPseudonym?: {
    YES: {
      pseudonymName: string
      pseudonymColor: string
    }
    NO: {
      pseudonymName: string
      pseudonymColor: string
    }
  }
}) {
  const {
    contract,
    shares,
    sharesOutcome,
    metric,
    user,
    onSellSuccess,
    answerId,
  } = props
  const { outcomeType } = contract
  const isPseudoNumeric = outcomeType === 'PSEUDO_NUMERIC'
  const isStonk = outcomeType === 'STONK'
  const isMultiSumsToOne =
    contract.mechanism === 'cpmm-multi-1' && contract.shouldAnswersSumToOne
  const answer =
    answerId && 'answers' in contract
      ? contract.answers.find((a) => a.id === answerId)
      : undefined

  const { unfilledBets: allUnfilledBets, balanceByUserId } =
    useUnfilledBetsAndBalanceByUserId(
      contract.id,
      (params) => api('bets', params),
      (params) => api('users/by-id/balance', params),
      useIsPageVisible
    )

  const unfilledBets =
    answerId && !isMultiSumsToOne
      ? allUnfilledBets.filter((b) => b.answerId === answerId)
      : allUnfilledBets

  const [displayAmount, setDisplayAmount] = useState<number | undefined>(() => {
    const probChange = isMultiSumsToOne
      ? getSaleResultMultiSumsToOne(
          contract,
          answerId!,
          shares,
          sharesOutcome,
          unfilledBets,
          balanceByUserId
        ).probChange
      : getSaleResult(
          contract,
          shares,
          sharesOutcome,
          unfilledBets,
          balanceByUserId,
          answer
        ).probChange
    return probChange > 0.2
      ? undefined
      : isStonk
      ? getStonkDisplayShares(contract, shares)
      : shares
  })
  const [amount, setAmount] = useState<number | undefined>(
    isStonk
      ? getSharesFromStonkShares(contract, displayAmount ?? 0, shares)
      : displayAmount
  )

  // just for the input TODO: actually display somewhere
  const [error, setError] = useState<string | undefined>()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [wasSubmitted, setWasSubmitted] = useState(false)

  const betDisabled =
    isSubmitting || !amount || (error && error.includes('Maximum'))

  // Sell all shares if remaining shares would be < 1
  const isSellingAllShares = amount === Math.floor(shares)

  const sellQuantity = isSellingAllShares ? shares : amount ?? 0

  const loanAmount = metric?.loan ?? 0
  const soldShares = Math.min(sellQuantity, shares)
  const saleFrac = soldShares / shares
  const loanPaid = saleFrac * loanAmount
  const isLoadPaid = loanPaid === 0

  const invested = metric?.invested ?? 0
  const costBasis = invested * saleFrac
  const betDeps = useRef<LimitBet[]>()

  async function submitSell() {
    if (!user || !amount) return

    setError(undefined)
    setIsSubmitting(true)

    await api('market/:contractId/sell', {
      shares: isSellingAllShares ? undefined : amount,
      outcome: sharesOutcome,
      contractId: contract.id,
      answerId,
      deps: uniq(betDeps.current?.map((b) => b.userId)),
    })
      .then(() => {
        setIsSubmitting(false)
        setWasSubmitted(true)
        setAmount(undefined)
        if (onSellSuccess) onSellSuccess()
      })
      .catch((e: unknown) => {
        console.error(e)
        if (e instanceof APIError) {
          const message = e.message.toString()
          toast.error(
            message.includes('could not serialize access')
              ? 'Error placing bet'
              : message
          )
        } else {
          setError(`Error placing ${TRADE_TERM}`)
        }
        setIsSubmitting(false)
      })

    track('sell shares', {
      outcomeType: contract.outcomeType,
      slug: contract.slug,
      contractId: contract.id,
      shares: sellQuantity,
      outcome: sharesOutcome,
    })
  }

  let initialProb: number, saleValue: number
  let fees: Fees
  let cpmmState
  let makers: LimitBet[]
  if (isMultiSumsToOne) {
    ;({ initialProb, cpmmState, saleValue, fees, makers } =
      getSaleResultMultiSumsToOne(
        contract,
        answerId!,
        sellQuantity,
        sharesOutcome,
        unfilledBets,
        balanceByUserId
      ))
  } else {
    ;({ initialProb, cpmmState, saleValue, fees, makers } = getSaleResult(
      contract,
      sellQuantity,
      sharesOutcome,
      unfilledBets,
      balanceByUserId,
      answer
    ))
  }
  betDeps.current = makers
  const totalFees = getFeeTotal(fees)
  const netProceeds = saleValue - loanPaid
  const profit = saleValue - costBasis
  const resultProb = getCpmmProbability(cpmmState.pool, cpmmState.p)

  const rawDifference = Math.abs(
    getMappedValue(contract, resultProb) - getMappedValue(contract, initialProb)
  )
  const displayedDifference =
    contract.outcomeType === 'PSEUDO_NUMERIC'
      ? formatLargeNumber(rawDifference)
      : formatPercent(rawDifference)
  const probChange = Math.abs(resultProb - initialProb)

  const warning =
    probChange >= 0.3
      ? `Are you sure you want to move the probability by ${displayedDifference}?`
      : undefined

  const onAmountChange = (displayAmount: number | undefined) => {
    setDisplayAmount(displayAmount)
    const realAmount = isStonk
      ? getSharesFromStonkShares(contract, displayAmount ?? 0, shares)
      : displayAmount
    setAmount(realAmount)

    // Check for errors.
    if (realAmount !== undefined && realAmount > shares) {
      setError(
        `Maximum ${formatShares(Math.floor(shares), isCashContract)} shares`
      )
    } else {
      setError(undefined)
    }
  }
  const isCashContract = contract.token === 'CASH'

  return (
    <>
      <AmountInput
        amount={
          displayAmount === undefined
            ? undefined
            : isStonk
            ? displayAmount
            : Math.round(displayAmount) === 0
            ? 0
            : Math.floor(displayAmount)
        }
        allowFloat={isStonk || isCashContract}
        onChangeAmount={onAmountChange}
        label="Shares"
        error={!!error}
        disabled={isSubmitting}
        inputClassName="w-full !pl-[69px]"
        quickAddMoreButton={
          <button
            className={clsx(
              'text-ink-500 hover:bg-ink-200 border-ink-300 m-[1px] rounded-r-md px-2.5 transition-colors'
            )}
            onClick={() =>
              onAmountChange(
                isStonk ? getStonkDisplayShares(contract, shares) : shares
              )
            }
          >
            Max
          </button>
        }
      />
      <div className="text-error mb-2 mt-1 h-1 text-xs">{error}</div>

      <Col className="mt-3 w-full gap-3 text-sm">
        {!isStonk && (
          <Row className="text-ink-500 items-center justify-between gap-2">
            Sale value
            <span className="text-ink-700">
              <MoneyDisplay
                amount={saleValue + totalFees}
                isCashContract={isCashContract}
              />
            </span>
          </Row>
        )}
        {!isLoadPaid && (
          <Row className="text-ink-500  items-center justify-between gap-2">
            Loan repayment
            <span className="text-ink-700">
              <MoneyDisplay
                amount={Math.floor(-loanPaid)}
                isCashContract={isCashContract}
              />
            </span>
          </Row>
        )}
        {/* <Row className="text-ink-500 items-center justify-between gap-2">
          Fees
          <FeeDisplay totalFees={totalFees} amount={saleValue + totalFees} />
        </Row> */}

        <Row className="text-ink-500 items-center justify-between gap-2">
          Profit
          <span className="text-ink-700">
            <MoneyDisplay amount={profit} isCashContract={isCashContract} />
          </span>
        </Row>
        <Row className="items-center justify-between">
          <div className="text-ink-500">
            {isPseudoNumeric
              ? 'Estimated value'
              : isStonk
              ? 'Stock price'
              : 'Probability'}
          </div>
          <div>
            {getFormattedMappedValue(contract, initialProb)}
            <span className="mx-2">→</span>
            {getFormattedMappedValue(contract, resultProb)}
          </div>
        </Row>

        <Row className="text-ink-1000 mt-4 items-center justify-between gap-2 text-xl">
          Payout
          <span className="text-ink-700">
            <MoneyDisplay
              amount={netProceeds}
              isCashContract={isCashContract}
            />
          </span>
        </Row>
      </Col>

      <Spacer h={8} />

      <WarningConfirmationButton
        marketType="binary"
        amount={undefined}
        warning={warning}
        userOptedOutOfWarning={user.optOutBetWarnings}
        isSubmitting={isSubmitting}
        onSubmit={betDisabled ? undefined : submitSell}
        disabled={!!betDisabled}
        size="xl"
        color="indigo"
        actionLabel={
          isStonk
            ? `Sell ${formatWithToken({
                amount: saleValue,
                token: isCashContract ? 'CASH' : 'M$',
              })}`
            : `Sell ${formatShares(sellQuantity, isCashContract)} shares`
        }
        inModal={true}
      />

      {wasSubmitted && <div className="mt-4">Sell submitted!</div>}
    </>
  )
}

export function MultiSellerPosition(props: { metric: ContractMetric }) {
  const { metric } = props
  const { totalShares } = metric
  const yesWinnings = totalShares.YES ?? 0
  const noWinnings = totalShares.NO ?? 0
  const position = yesWinnings - noWinnings

  if (position > 1e-7) {
    return <>YES</>
  }
  return <>NO</>
}

export function MultiSellerProfit(props: {
  contract: CPMMMultiContract | CPMMNumericContract
  metric: ContractMetric
  answer: Answer
}) {
  const { contract, metric, answer } = props
  const { id: answerId } = answer
  const { outcomeType } = contract
  const isMultiSumsToOne =
    (outcomeType === 'MULTIPLE_CHOICE' && contract.shouldAnswersSumToOne) ||
    outcomeType === 'NUMBER'
  const sharesSum = metric.totalShares[metric.maxSharesOutcome ?? 'YES'] ?? 0
  const sharesOutcome = (metric.maxSharesOutcome ?? 'YES') as 'YES' | 'NO'

  const { unfilledBets: allUnfilledBets, balanceByUserId } =
    useUnfilledBetsAndBalanceByUserId(
      contract.id,
      (params) => api('bets', params),
      (params) => api('users/by-id/balance', params),
      useIsPageVisible
    )

  const unfilledBets = allUnfilledBets.filter((b) => b.answerId === answerId)
  const isCashContract = contract.token === 'CASH'

  let saleValue: number

  if (isMultiSumsToOne) {
    ;({ saleValue } = getSaleResultMultiSumsToOne(
      contract,
      answerId,
      Math.abs(sharesSum),
      sharesOutcome,
      unfilledBets,
      balanceByUserId
    ))
  } else {
    ;({ saleValue } = getSaleResult(
      contract,
      Math.abs(sharesSum),
      sharesOutcome,
      unfilledBets,
      balanceByUserId,
      answer
    ))
  }

  const invested = metric.invested

  return (
    <MoneyDisplay
      amount={saleValue - invested}
      isCashContract={isCashContract}
    />
  )
}
