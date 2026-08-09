/**
 * Arth executes all orders in-app against live-style prices.
 * The Learn section is the practice classroom (₹1L starter reset).
 * Trading surfaces use normal broker language — not a second ledger.
 */
export const PAPER_STARTING_CASH = 100_000

export const PAPER_COPY = {
  walletLabel: 'Cash',
  portfolioLabel: 'Portfolio',
  banner:
    'Practice classroom — reset to ₹1,00,000 fake currency anytime from Learn. Trading elsewhere uses your account cash.',
}

export function paperMeta(cash) {
  return {
    isPaperTrading: true,
    paperStartingCash: PAPER_STARTING_CASH,
    paperCash: Number(cash) || 0,
    walletLabel: PAPER_COPY.walletLabel,
    portfolioLabel: PAPER_COPY.portfolioLabel,
  }
}
