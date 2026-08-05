export const MUTUAL_FUNDS = [
  {
    id: 'mf-parag',
    name: 'Parag Parikh Flexi Cap Fund',
    amc: 'PPFAS Mutual Fund',
    amcShort: 'PPFAS',
    category: 'Equity',
    subCategory: 'Flexi Cap',
    plan: 'Direct',
    option: 'Growth',
    nav: 82.45,
    navChange: 0.38,
    rating: 5,
    crisilRank: 1,
    aum: 91300,
    expenseRatio: 0.63,
    categoryExpense: 0.89,
    risk: 'Very High',
    riskometer: 5,
    benchmark: 'NIFTY 500 TRI',
    minSip: 1000,
    minLumpsum: 1000,
    exitLoad: '2% if redeemed within 365 days, 1% between 366-730 days',
    lockIn: 'None',
    launchDate: '2013-05-24',
    turnoverRatio: 18,
    taxation: 'equity',
    returns: { '1m': 1.8, '3m': 5.4, '6m': 9.7, '1y': 18.2, '3y': 20.4, '5y': 21.6, all: 19.8 },
    benchmarkReturns: { '1y': 15.4, '3y': 17.1, '5y': 18.2 },
    categoryReturns: { '1y': 16.1, '3y': 17.8, '5y': 18.9 },
    riskMetrics: { alpha: 3.42, beta: 0.82, sharpe: 1.24, sortino: 1.86, stdDev: 11.8 },
    assetAllocation: { equity: 82.4, debt: 3.1, cash: 14.5 },
    marketCapAllocation: { large: 62.4, mid: 18.9, small: 18.7 },
    managers: [
      { name: 'Rajeev Thakkar', since: '2013', qualification: 'CFA, MMS Finance' },
      { name: 'Raunak Onkar', since: '2013', qualification: 'MMS Finance' },
    ],
    topHoldings: [
      { name: 'HDFC Bank', sector: 'Banking', pct: 7.8 },
      { name: 'Bajaj Holdings', sector: 'Finance', pct: 6.4 },
      { name: 'Power Grid Corp', sector: 'Energy', pct: 5.9 },
      { name: 'Coal India', sector: 'Energy', pct: 5.2 },
      { name: 'ITC Limited', sector: 'FMCG', pct: 4.7 },
      { name: 'Maruti Suzuki', sector: 'Auto', pct: 4.1 },
      { name: 'Microsoft Corp', sector: 'Technology', pct: 3.8 },
      { name: 'Alphabet Inc', sector: 'Technology', pct: 3.4 },
    ],
    sectorAllocation: [
      { sector: 'Financial Services', pct: 28.4 },
      { sector: 'Energy', pct: 16.2 },
      { sector: 'Technology', pct: 14.8 },
      { sector: 'Consumer Goods', pct: 12.1 },
      { sector: 'Automobile', pct: 8.6 },
      { sector: 'Others', pct: 19.9 },
    ],
    objective:
      'To generate long-term capital growth from an actively managed portfolio primarily of equity and equity-related securities, with the flexibility to invest across market capitalisations and in select overseas companies.',
  },
  {
    id: 'mf-quant',
    name: 'Quant Small Cap Fund',
    amc: 'Quant Mutual Fund',
    amcShort: 'Quant',
    category: 'Equity',
    subCategory: 'Small Cap',
    plan: 'Direct',
    option: 'Growth',
    nav: 245.1,
    navChange: -1.24,
    rating: 4,
    crisilRank: 2,
    aum: 28200,
    expenseRatio: 0.64,
    categoryExpense: 0.92,
    risk: 'Very High',
    riskometer: 6,
    benchmark: 'NIFTY Smallcap 250 TRI',
    minSip: 1000,
    minLumpsum: 5000,
    exitLoad: '1% if redeemed within 365 days',
    lockIn: 'None',
    launchDate: '1996-11-24',
    turnoverRatio: 142,
    taxation: 'equity',
    returns: { '1m': -2.4, '3m': 4.1, '6m': 12.8, '1y': 32.4, '3y': 28.7, '5y': 34.2, all: 16.4 },
    benchmarkReturns: { '1y': 28.1, '3y': 24.6, '5y': 29.8 },
    categoryReturns: { '1y': 27.4, '3y': 23.9, '5y': 28.1 },
    riskMetrics: { alpha: 6.18, beta: 1.14, sharpe: 1.42, sortino: 2.04, stdDev: 19.6 },
    assetAllocation: { equity: 94.2, debt: 0, cash: 5.8 },
    marketCapAllocation: { large: 8.2, mid: 14.4, small: 77.4 },
    managers: [
      { name: 'Ankit Pande', since: '2020', qualification: 'CFA, MBA' },
      { name: 'Sanjeev Sharma', since: '2022', qualification: 'MBA Finance' },
    ],
    topHoldings: [
      { name: 'Reliance Industries', sector: 'Energy', pct: 6.9 },
      { name: 'Jio Financial Services', sector: 'Finance', pct: 5.4 },
      { name: 'Aegis Logistics', sector: 'Logistics', pct: 4.8 },
      { name: 'HFCL Limited', sector: 'Telecom', pct: 4.2 },
      { name: 'Bikaji Foods', sector: 'FMCG', pct: 3.9 },
      { name: 'RBL Bank', sector: 'Banking', pct: 3.4 },
      { name: 'Care Ratings', sector: 'Finance', pct: 3.1 },
      { name: 'Steel Authority', sector: 'Metals', pct: 2.8 },
    ],
    sectorAllocation: [
      { sector: 'Financial Services', pct: 22.6 },
      { sector: 'Materials', pct: 17.4 },
      { sector: 'Consumer Goods', pct: 15.8 },
      { sector: 'Industrials', pct: 14.2 },
      { sector: 'Healthcare', pct: 9.7 },
      { sector: 'Others', pct: 20.3 },
    ],
    objective:
      'To generate capital appreciation by investing predominantly in a well-diversified portfolio of small cap companies using a dynamic, data-driven allocation framework.',
  },
  {
    id: 'mf-mirae',
    name: 'Mirae Asset Large Cap Fund',
    amc: 'Mirae Asset Mutual Fund',
    amcShort: 'Mirae',
    category: 'Equity',
    subCategory: 'Large Cap',
    plan: 'Direct',
    option: 'Growth',
    nav: 98.6,
    navChange: 0.52,
    rating: 4,
    crisilRank: 2,
    aum: 38900,
    expenseRatio: 0.53,
    categoryExpense: 0.81,
    risk: 'Very High',
    riskometer: 5,
    benchmark: 'NIFTY 100 TRI',
    minSip: 500,
    minLumpsum: 5000,
    exitLoad: '1% if redeemed within 365 days',
    lockIn: 'None',
    launchDate: '2008-04-04',
    turnoverRatio: 34,
    taxation: 'equity',
    returns: { '1m': 1.2, '3m': 3.9, '6m': 7.4, '1y': 14.8, '3y': 15.9, '5y': 17.2, all: 15.1 },
    benchmarkReturns: { '1y': 13.9, '3y': 14.8, '5y': 16.1 },
    categoryReturns: { '1y': 13.2, '3y': 14.1, '5y': 15.4 },
    riskMetrics: { alpha: 1.12, beta: 0.96, sharpe: 0.98, sortino: 1.42, stdDev: 12.9 },
    assetAllocation: { equity: 97.8, debt: 0, cash: 2.2 },
    marketCapAllocation: { large: 84.6, mid: 12.1, small: 3.3 },
    managers: [
      { name: 'Gaurav Misra', since: '2019', qualification: 'PGDM, IIM Lucknow' },
      { name: 'Neelesh Surana', since: '2008', qualification: 'MBA Finance' },
    ],
    topHoldings: [
      { name: 'HDFC Bank', sector: 'Banking', pct: 9.2 },
      { name: 'ICICI Bank', sector: 'Banking', pct: 7.6 },
      { name: 'Reliance Industries', sector: 'Energy', pct: 6.8 },
      { name: 'Infosys', sector: 'IT', pct: 5.4 },
      { name: 'Larsen & Toubro', sector: 'Infra', pct: 4.1 },
      { name: 'Bharti Airtel', sector: 'Telecom', pct: 3.8 },
      { name: 'Axis Bank', sector: 'Banking', pct: 3.2 },
      { name: 'State Bank of India', sector: 'Banking', pct: 3.0 },
    ],
    sectorAllocation: [
      { sector: 'Financial Services', pct: 34.8 },
      { sector: 'Information Technology', pct: 13.6 },
      { sector: 'Energy', pct: 11.2 },
      { sector: 'Consumer Goods', pct: 10.4 },
      { sector: 'Automobile', pct: 7.9 },
      { sector: 'Others', pct: 22.1 },
    ],
    objective:
      'To generate long-term capital appreciation by investing predominantly in large cap companies with sound fundamentals and sustainable earnings growth.',
  },
  {
    id: 'mf-uti',
    name: 'UTI Nifty 50 Index Fund',
    amc: 'UTI Mutual Fund',
    amcShort: 'UTI',
    category: 'Equity',
    subCategory: 'Index',
    plan: 'Direct',
    option: 'Growth',
    nav: 245.8,
    navChange: 0.44,
    rating: 4,
    crisilRank: 2,
    aum: 21900,
    expenseRatio: 0.18,
    categoryExpense: 0.32,
    risk: 'Very High',
    riskometer: 5,
    benchmark: 'NIFTY 50 TRI',
    minSip: 500,
    minLumpsum: 5000,
    exitLoad: 'Nil',
    lockIn: 'None',
    launchDate: '2000-03-06',
    turnoverRatio: 8,
    taxation: 'equity',
    returns: { '1m': 1.1, '3m': 3.4, '6m': 6.8, '1y': 12.1, '3y': 14.3, '5y': 15.4, all: 12.8 },
    benchmarkReturns: { '1y': 12.4, '3y': 14.6, '5y': 15.7 },
    categoryReturns: { '1y': 12.0, '3y': 14.2, '5y': 15.2 },
    riskMetrics: { alpha: -0.28, beta: 1.0, sharpe: 0.86, sortino: 1.24, stdDev: 13.1 },
    assetAllocation: { equity: 99.6, debt: 0, cash: 0.4 },
    marketCapAllocation: { large: 100, mid: 0, small: 0 },
    managers: [{ name: 'Sharwan Kumar Goyal', since: '2018', qualification: 'CFA, MMS' }],
    topHoldings: [
      { name: 'HDFC Bank', sector: 'Banking', pct: 11.4 },
      { name: 'Reliance Industries', sector: 'Energy', pct: 9.8 },
      { name: 'ICICI Bank', sector: 'Banking', pct: 7.9 },
      { name: 'Infosys', sector: 'IT', pct: 6.1 },
      { name: 'TCS', sector: 'IT', pct: 4.2 },
      { name: 'Bharti Airtel', sector: 'Telecom', pct: 3.9 },
      { name: 'ITC Limited', sector: 'FMCG', pct: 3.6 },
      { name: 'Larsen & Toubro', sector: 'Infra', pct: 3.4 },
    ],
    sectorAllocation: [
      { sector: 'Financial Services', pct: 36.2 },
      { sector: 'Information Technology', pct: 13.8 },
      { sector: 'Energy', pct: 11.4 },
      { sector: 'Consumer Goods', pct: 9.6 },
      { sector: 'Automobile', pct: 6.8 },
      { sector: 'Others', pct: 22.2 },
    ],
    objective:
      'To provide returns that closely correspond to the total return of securities represented by the NIFTY 50 index, subject to tracking error.',
  },
  {
    id: 'mf-axis',
    name: 'Axis Midcap Fund',
    amc: 'Axis Mutual Fund',
    amcShort: 'Axis',
    category: 'Equity',
    subCategory: 'Mid Cap',
    plan: 'Direct',
    option: 'Growth',
    nav: 112.3,
    navChange: -0.62,
    rating: 4,
    crisilRank: 3,
    aum: 32400,
    expenseRatio: 0.48,
    categoryExpense: 0.86,
    risk: 'Very High',
    riskometer: 6,
    benchmark: 'NIFTY Midcap 150 TRI',
    minSip: 500,
    minLumpsum: 5000,
    exitLoad: '1% if redeemed within 365 days',
    lockIn: 'None',
    launchDate: '2011-02-18',
    turnoverRatio: 52,
    taxation: 'equity',
    returns: { '1m': -1.1, '3m': 4.8, '6m': 10.2, '1y': 22.5, '3y': 19.1, '5y': 20.8, all: 18.4 },
    benchmarkReturns: { '1y': 24.1, '3y': 21.4, '5y': 22.6 },
    categoryReturns: { '1y': 23.2, '3y': 20.6, '5y': 21.8 },
    riskMetrics: { alpha: -1.24, beta: 0.88, sharpe: 1.06, sortino: 1.58, stdDev: 15.4 },
    assetAllocation: { equity: 92.6, debt: 1.2, cash: 6.2 },
    marketCapAllocation: { large: 18.4, mid: 68.2, small: 13.4 },
    managers: [
      { name: 'Shreyash Devalkar', since: '2018', qualification: 'MMS Finance' },
      { name: 'Nitin Arora', since: '2022', qualification: 'CA, CFA' },
    ],
    topHoldings: [
      { name: 'Coforge', sector: 'IT', pct: 4.9 },
      { name: 'Persistent Systems', sector: 'IT', pct: 4.4 },
      { name: 'Cholamandalam Inv', sector: 'Finance', pct: 4.1 },
      { name: 'Supreme Industries', sector: 'Industrials', pct: 3.7 },
      { name: 'Trent Limited', sector: 'Retail', pct: 3.5 },
      { name: 'Max Healthcare', sector: 'Healthcare', pct: 3.2 },
      { name: 'Indian Hotels', sector: 'Hospitality', pct: 3.0 },
      { name: 'Bharat Electronics', sector: 'Defence', pct: 2.8 },
    ],
    sectorAllocation: [
      { sector: 'Financial Services', pct: 21.4 },
      { sector: 'Information Technology', pct: 17.8 },
      { sector: 'Healthcare', pct: 12.6 },
      { sector: 'Industrials', pct: 12.1 },
      { sector: 'Consumer Services', pct: 10.8 },
      { sector: 'Others', pct: 25.3 },
    ],
    objective:
      'To achieve long-term capital appreciation by investing predominantly in equity of mid cap companies with strong competitive positioning and scalable business models.',
  },
  {
    id: 'mf-sbi',
    name: 'SBI Magnum Gilt Fund',
    amc: 'SBI Mutual Fund',
    amcShort: 'SBI',
    category: 'Debt',
    subCategory: 'Gilt',
    plan: 'Direct',
    option: 'Growth',
    nav: 58.9,
    navChange: 0.06,
    rating: 4,
    crisilRank: 2,
    aum: 9200,
    expenseRatio: 0.47,
    categoryExpense: 0.62,
    risk: 'Moderate',
    riskometer: 3,
    benchmark: 'CRISIL Dynamic Gilt Index',
    minSip: 500,
    minLumpsum: 5000,
    exitLoad: 'Nil',
    lockIn: 'None',
    launchDate: '2000-12-30',
    turnoverRatio: 96,
    taxation: 'debt',
    returns: { '1m': 0.6, '3m': 1.9, '6m': 4.1, '1y': 7.4, '3y': 7.1, '5y': 7.8, all: 8.2 },
    benchmarkReturns: { '1y': 7.1, '3y': 6.8, '5y': 7.4 },
    categoryReturns: { '1y': 7.0, '3y': 6.6, '5y': 7.2 },
    riskMetrics: { alpha: 0.42, beta: 0.94, sharpe: 0.62, sortino: 0.94, stdDev: 3.2 },
    assetAllocation: { equity: 0, debt: 96.4, cash: 3.6 },
    marketCapAllocation: { large: 0, mid: 0, small: 0 },
    managers: [{ name: 'Dinesh Ahuja', since: '2011', qualification: 'MBA Finance' }],
    topHoldings: [
      { name: '7.30% GOI 2053', sector: 'Sovereign', pct: 24.6 },
      { name: '7.18% GOI 2037', sector: 'Sovereign', pct: 18.4 },
      { name: '7.25% GOI 2063', sector: 'Sovereign', pct: 15.2 },
      { name: '7.10% GOI 2034', sector: 'Sovereign', pct: 12.8 },
      { name: '6.79% GOI 2034', sector: 'Sovereign', pct: 9.6 },
      { name: 'State Development Loans', sector: 'Sovereign', pct: 8.4 },
      { name: 'Treasury Bills', sector: 'Sovereign', pct: 4.2 },
    ],
    sectorAllocation: [
      { sector: 'Government Securities', pct: 88.2 },
      { sector: 'State Development Loans', pct: 8.2 },
      { sector: 'Cash & Equivalents', pct: 3.6 },
    ],
    objective:
      'To generate returns through investments in government securities across maturities, with an aim to provide reasonable returns and high liquidity with minimal credit risk.',
  },
  {
    id: 'mf-icici',
    name: 'ICICI Prudential Bluechip Fund',
    amc: 'ICICI Prudential Mutual Fund',
    amcShort: 'ICICI',
    category: 'Equity',
    subCategory: 'Large Cap',
    plan: 'Direct',
    option: 'Growth',
    nav: 88.2,
    navChange: 0.61,
    rating: 5,
    crisilRank: 1,
    aum: 63500,
    expenseRatio: 0.87,
    categoryExpense: 0.81,
    risk: 'Very High',
    riskometer: 5,
    benchmark: 'NIFTY 100 TRI',
    minSip: 500,
    minLumpsum: 5000,
    exitLoad: '1% if redeemed within 365 days',
    lockIn: 'None',
    launchDate: '2008-05-23',
    turnoverRatio: 42,
    taxation: 'equity',
    returns: { '1m': 1.4, '3m': 4.2, '6m': 8.1, '1y': 15.6, '3y': 17.2, '5y': 18.4, all: 15.8 },
    benchmarkReturns: { '1y': 13.9, '3y': 14.8, '5y': 16.1 },
    categoryReturns: { '1y': 13.2, '3y': 14.1, '5y': 15.4 },
    riskMetrics: { alpha: 2.64, beta: 0.92, sharpe: 1.18, sortino: 1.72, stdDev: 12.4 },
    assetAllocation: { equity: 91.8, debt: 2.4, cash: 5.8 },
    marketCapAllocation: { large: 88.2, mid: 9.4, small: 2.4 },
    managers: [
      { name: 'Anish Tawakley', since: '2018', qualification: 'PGDM, IIM Bangalore' },
      { name: 'Vaibhav Dusad', since: '2020', qualification: 'CFA, PGDM' },
    ],
    topHoldings: [
      { name: 'HDFC Bank', sector: 'Banking', pct: 8.9 },
      { name: 'ICICI Bank', sector: 'Banking', pct: 7.2 },
      { name: 'Reliance Industries', sector: 'Energy', pct: 6.4 },
      { name: 'Larsen & Toubro', sector: 'Infra', pct: 5.1 },
      { name: 'Infosys', sector: 'IT', pct: 4.6 },
      { name: 'Maruti Suzuki', sector: 'Auto', pct: 4.2 },
      { name: 'Axis Bank', sector: 'Banking', pct: 3.6 },
      { name: 'Sun Pharma', sector: 'Pharma', pct: 3.1 },
    ],
    sectorAllocation: [
      { sector: 'Financial Services', pct: 31.6 },
      { sector: 'Energy', pct: 12.8 },
      { sector: 'Information Technology', pct: 11.4 },
      { sector: 'Automobile', pct: 10.2 },
      { sector: 'Healthcare', pct: 8.4 },
      { sector: 'Others', pct: 25.6 },
    ],
    objective:
      'To generate long-term capital appreciation and income distribution by investing predominantly in equity and equity-related securities of large cap companies.',
  },
  {
    id: 'mf-hdfc',
    name: 'HDFC Balanced Advantage Fund',
    amc: 'HDFC Mutual Fund',
    amcShort: 'HDFC',
    category: 'Hybrid',
    subCategory: 'Dynamic Asset Allocation',
    plan: 'Direct',
    option: 'Growth',
    nav: 412.5,
    navChange: 0.94,
    rating: 5,
    crisilRank: 1,
    aum: 97000,
    expenseRatio: 0.74,
    categoryExpense: 0.94,
    risk: 'High',
    riskometer: 4,
    benchmark: 'NIFTY 50 Hybrid Composite Debt 65:35',
    minSip: 100,
    minLumpsum: 100,
    exitLoad: '1% if redeemed within 365 days (above 15% of units)',
    lockIn: 'None',
    launchDate: '1994-02-01',
    turnoverRatio: 64,
    taxation: 'equity',
    returns: { '1m': 1.6, '3m': 4.6, '6m': 8.9, '1y': 16.9, '3y': 16.1, '5y': 15.8, all: 14.2 },
    benchmarkReturns: { '1y': 12.8, '3y': 12.1, '5y': 12.9 },
    categoryReturns: { '1y': 13.4, '3y': 12.8, '5y': 13.2 },
    riskMetrics: { alpha: 3.86, beta: 0.74, sharpe: 1.34, sortino: 1.96, stdDev: 9.4 },
    assetAllocation: { equity: 68.4, debt: 24.2, cash: 7.4 },
    marketCapAllocation: { large: 74.6, mid: 15.2, small: 10.2 },
    managers: [
      { name: 'Gopal Agrawal', since: '2022', qualification: 'MBA, M.Sc' },
      { name: 'Anil Bamboli', since: '2019', qualification: 'CFA, MMS' },
    ],
    topHoldings: [
      { name: 'HDFC Bank', sector: 'Banking', pct: 6.2 },
      { name: 'ICICI Bank', sector: 'Banking', pct: 5.4 },
      { name: 'Reliance Industries', sector: 'Energy', pct: 4.8 },
      { name: 'NTPC', sector: 'Energy', pct: 4.1 },
      { name: 'Coal India', sector: 'Energy', pct: 3.6 },
      { name: 'State Bank of India', sector: 'Banking', pct: 3.2 },
      { name: 'GOI Securities 2033', sector: 'Sovereign', pct: 8.4 },
      { name: 'GOI Securities 2029', sector: 'Sovereign', pct: 6.1 },
    ],
    sectorAllocation: [
      { sector: 'Financial Services', pct: 24.8 },
      { sector: 'Government Securities', pct: 22.4 },
      { sector: 'Energy', pct: 16.2 },
      { sector: 'Information Technology', pct: 8.4 },
      { sector: 'Healthcare', pct: 6.8 },
      { sector: 'Others', pct: 21.4 },
    ],
    objective:
      'To provide long-term capital appreciation and income by dynamically managing allocation between equity and debt based on prevailing market valuations.',
  },
]

export const FUND_MAP = Object.fromEntries(MUTUAL_FUNDS.map((f) => [f.id, f]))

function seeded(seed) {
  let value = seed
  return () => {
    value = (value * 1664525 + 1013904223) % 4294967296
    return value / 4294967296
  }
}

function hashCode(text) {
  let h = 0
  for (let i = 0; i < text.length; i += 1) {
    h = (h * 31 + text.charCodeAt(i)) % 4294967296
  }
  return h
}

const RANGE_DAYS = { '1m': 30, '3m': 91, '6m': 182, '1y': 365, '3y': 1095, '5y': 1825 }

/**
 * Deterministic NAV series ending at the fund's current NAV, back-calculated from
 * its published annualised return so the chart stays stable across reloads.
 */
export function navHistory(fund, range = '1y') {
  const days = RANGE_DAYS[range] || 365
  const step = days > 400 ? Math.ceil(days / 300) : 1
  const points = Math.floor(days / step)
  const years = days / 365
  // Returns beyond a year are quoted as CAGR, so compound them over the period.
  const quoted = (fund.returns[range] ?? fund.returns['1y'] ?? 10) / 100
  const totalGrowth = years > 1 ? (1 + quoted) ** years : 1 + quoted * years
  const stepVol = (fund.riskMetrics.stdDev / 100 / Math.sqrt(252)) * Math.sqrt(step)
  const random = seeded(hashCode(fund.id) + days)

  // Random walk first, then detrend it so the endpoints land exactly on the
  // quoted return instead of drifting with the accumulated noise.
  const walk = [1]
  for (let i = 1; i <= points; i += 1) {
    walk.push(walk[i - 1] * (1 + (random() - 0.5) * 2 * stepVol))
  }
  const walkDrift = walk[points]
  const startNav = fund.nav / totalGrowth

  const todayMs = Date.now()
  const dayMs = 86400000
  return walk.map((w, i) => {
    const progress = i / points
    const detrended = w / walkDrift ** progress
    const nav = startNav * totalGrowth ** progress * detrended
    const daysAgo = days - i * step
    return {
      date: new Date(todayMs - daysAgo * dayMs).toISOString().slice(0, 10),
      nav: +nav.toFixed(4),
    }
  })
}

/** Growth of a ₹10,000 lumpsum and of a ₹10,000/month SIP over the given period. */
export function fundGrowth(fund, years) {
  const annual = (fund.returns[`${years}y`] ?? fund.returns['1y']) / 100
  const lumpsum = 10000 * (1 + annual) ** years
  const months = years * 12
  const monthly = (1 + annual) ** (1 / 12) - 1
  const sipValue = 10000 * (((1 + monthly) ** months - 1) / monthly) * (1 + monthly)
  return {
    lumpsumInvested: 10000,
    lumpsumValue: +lumpsum.toFixed(2),
    sipInvested: 10000 * months,
    sipValue: +sipValue.toFixed(2),
  }
}
