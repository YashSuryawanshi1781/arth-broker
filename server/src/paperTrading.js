/**
 * Arth is a paper-trading sandbox. Every learner gets the same starting
 * fake capital; nothing here is real money or a SEBI brokerage balance.
 */
export const PAPER_STARTING_CASH = 100_000

export const PAPER_COPY = {
  walletLabel: 'Paper cash',
  portfolioLabel: 'Paper portfolio',
  banner:
    'Practice wallet — ₹1,00,000 fake currency. Buy & sell freely to learn. Not real money.',
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
