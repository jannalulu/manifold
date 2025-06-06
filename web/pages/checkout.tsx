import { useEffect, useState } from 'react'
import { Page } from '../components/layout/page'
import { Col } from '../components/layout/col'
import { Row } from '../components/layout/row'
import { WebPriceInDollars } from 'common/economy'
import { FullscreenConfetti } from 'web/components/widgets/fullscreen-confetti'
import { useRouter } from 'next/router'
import { usePrices } from 'web/hooks/use-prices'
import { FundsSelector } from 'web/components/gidx/funds-selector'

const CheckoutPage = () => {
  const prices = usePrices()

  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const [showConfetti, setShowConfetti] = useState(false)
  const [loadingPrice, setLoadingPrice] = useState<WebPriceInDollars | null>(
    null
  )
  useEffect(() => {
    if (router.query.purchaseSuccess) {
      setShowConfetti(true)
    }
  }, [router])

  const { dollarAmount: dollarAmountFromQuery } = router.query
  useEffect(() => {
    if (!dollarAmountFromQuery) return
    if (
      !Array.isArray(dollarAmountFromQuery) &&
      prices.find((p) => p.priceInDollars === parseInt(dollarAmountFromQuery))
    ) {
      onSelectAmount(parseInt(dollarAmountFromQuery) as WebPriceInDollars)
    } else {
      console.error('Invalid dollar amount in query parameter')
      setError('Invalid dollar amount')
    }
  }, [dollarAmountFromQuery])

  const onSelectAmount = (dollarAmount: WebPriceInDollars) => {
    setShowConfetti(false)
    setError(null)
    setLoadingPrice(dollarAmount)
  }

  return (
    <Page className={'p-3'} trackPageView={'checkout page'} hideFooter>
      {showConfetti && <FullscreenConfetti />}
      <Col>
        <FundsSelector
          onSelectPriceInDollars={onSelectAmount}
          loadingPrice={loadingPrice}
        />
      </Col>
      <Row className="text-error mt-2">{error}</Row>
    </Page>
  )
}

export default CheckoutPage
