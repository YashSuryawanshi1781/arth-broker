import YahooFinance from 'yahoo-finance2'
import { matchOpenOrders } from './orderMatcher.js'
import { processDueSips } from './sipRunner.js'
import { processPriceAlerts } from './alertRunner.js'
import { processConditionalOrders } from './conditionalRunner.js'
import { processAutoSquareOff } from './squareOffRunner.js'

export const INSTRUMENTS = [
  { symbol: 'RELIANCE', name: 'Reliance Industries', sector: 'Energy', price: 2845.5, industry: 'Refineries & Petrochemicals', mcap: 1925000, pe: 28.4, pb: 2.1, eps: 100.2, divYield: 0.35, roe: 8.9, week52High: 3217, week52Low: 2220, faceValue: 10, about: 'India\'s largest conglomerate with operations spanning oil-to-chemicals, retail, digital services and new energy.' },
  { symbol: 'TCS', name: 'Tata Consultancy', sector: 'IT', price: 3920.2, industry: 'IT Consulting & Software', mcap: 1420000, pe: 30.1, pb: 15.2, eps: 130.2, divYield: 1.4, roe: 51.2, week52High: 4592, week52Low: 3311, faceValue: 1, about: 'The largest Indian IT services exporter, providing consulting, digital transformation and business solutions worldwide.' },
  { symbol: 'INFY', name: 'Infosys', sector: 'IT', price: 1568.4, industry: 'IT Consulting & Software', mcap: 651000, pe: 26.8, pb: 8.4, eps: 58.5, divYield: 2.1, roe: 31.8, week52High: 1975, week52Low: 1358, faceValue: 5, about: 'Global leader in next-generation digital services and consulting, serving clients across 50+ countries.' },
  { symbol: 'HDFCBANK', name: 'HDFC Bank', sector: 'Banking', price: 1672.1, industry: 'Private Sector Bank', mcap: 1272000, pe: 19.4, pb: 2.8, eps: 86.2, divYield: 1.2, roe: 17.1, week52High: 1880, week52Low: 1363, faceValue: 1, about: 'India\'s largest private sector bank by assets, offering retail banking, wholesale banking and treasury services.' },
  { symbol: 'ICICIBANK', name: 'ICICI Bank', sector: 'Banking', price: 1189.6, industry: 'Private Sector Bank', mcap: 837000, pe: 18.2, pb: 3.2, eps: 65.4, divYield: 0.9, roe: 18.7, week52High: 1362, week52Low: 970, faceValue: 2, about: 'Leading private bank with a diversified franchise across retail, SME, corporate banking and insurance subsidiaries.' },
  { symbol: 'SBIN', name: 'State Bank of India', sector: 'Banking', price: 812.35, industry: 'Public Sector Bank', mcap: 725000, pe: 10.1, pb: 1.7, eps: 80.4, divYield: 1.7, roe: 18.2, week52High: 912, week52Low: 680, faceValue: 1, about: 'India\'s largest public sector bank with the widest branch network and a dominant deposit franchise.' },
  { symbol: 'BHARTIARTL', name: 'Bharti Airtel', sector: 'Telecom', price: 1544.8, industry: 'Telecom Services', mcap: 925000, pe: 42.6, pb: 9.1, eps: 36.2, divYield: 0.6, roe: 21.4, week52High: 1779, week52Low: 1130, faceValue: 5, about: 'Second-largest telecom operator in India with a growing presence in Africa, enterprise and digital TV services.' },
  { symbol: 'ITC', name: 'ITC Limited', sector: 'FMCG', price: 468.9, industry: 'Diversified FMCG', mcap: 586000, pe: 25.4, pb: 7.2, eps: 18.4, divYield: 3.3, roe: 28.6, week52High: 528, week52Low: 390, faceValue: 1, about: 'Diversified conglomerate spanning cigarettes, packaged foods, hotels, paperboards and agri-business.' },
  { symbol: 'LT', name: 'Larsen & Toubro', sector: 'Infra', price: 3588.0, industry: 'Construction & Engineering', mcap: 493000, pe: 34.2, pb: 5.8, eps: 104.8, divYield: 0.9, roe: 17.4, week52High: 3963, week52Low: 3200, faceValue: 2, about: 'India\'s largest engineering and construction company, executing infrastructure projects across India and the Middle East.' },
  { symbol: 'AXISBANK', name: 'Axis Bank', sector: 'Banking', price: 1098.45, industry: 'Private Sector Bank', mcap: 340000, pe: 12.8, pb: 2.1, eps: 85.8, divYield: 0.1, roe: 16.9, week52High: 1340, week52Low: 930, faceValue: 2, about: 'Third-largest private sector bank in India with strengths in retail lending and digital banking.' },
  { symbol: 'KOTAKBANK', name: 'Kotak Mahindra Bank', sector: 'Banking', price: 1788.2, industry: 'Private Sector Bank', mcap: 355000, pe: 17.9, pb: 2.6, eps: 99.8, divYield: 0.1, roe: 15.2, week52High: 1953, week52Low: 1544, faceValue: 5, about: 'Private bank with a strong capital markets, asset management and insurance ecosystem alongside core banking.' },
  { symbol: 'BAJFINANCE', name: 'Bajaj Finance', sector: 'Finance', price: 7124.5, industry: 'Non-Banking Financial Company', mcap: 441000, pe: 30.4, pb: 5.6, eps: 234.2, divYield: 0.5, roe: 19.8, week52High: 8192, week52Low: 6188, faceValue: 2, about: 'India\'s largest retail NBFC by market value, focused on consumer durable, personal and SME lending.' },
  { symbol: 'HINDUNILVR', name: 'Hindustan Unilever', sector: 'FMCG', price: 2489.0, industry: 'Personal & Household Products', mcap: 585000, pe: 54.2, pb: 10.8, eps: 45.9, divYield: 1.8, roe: 20.1, week52High: 3035, week52Low: 2136, faceValue: 1, about: 'India\'s largest FMCG company with leading brands across home care, beauty, personal care and foods.' },
  { symbol: 'MARUTI', name: 'Maruti Suzuki', sector: 'Auto', price: 11840.0, industry: 'Passenger Vehicles', mcap: 372000, pe: 27.6, pb: 4.2, eps: 429.0, divYield: 1.1, roe: 16.4, week52High: 13675, week52Low: 10725, faceValue: 5, about: 'India\'s largest passenger vehicle manufacturer with roughly 40% market share and the widest service network.' },
  { symbol: 'SUNPHARMA', name: 'Sun Pharma', sector: 'Pharma', price: 1722.6, industry: 'Pharmaceuticals', mcap: 413000, pe: 36.8, pb: 5.6, eps: 46.8, divYield: 0.8, roe: 16.2, week52High: 1960, week52Low: 1420, faceValue: 1, about: 'India\'s largest pharmaceutical company and a global specialty generics player with a growing dermatology franchise.' },
  { symbol: 'TITAN', name: 'Titan Company', sector: 'Consumer', price: 3421.15, industry: 'Gems, Jewellery & Watches', mcap: 303000, pe: 88.4, pb: 26.2, eps: 38.7, divYield: 0.3, roe: 32.4, week52High: 3887, week52Low: 2925, faceValue: 1, about: 'Tata group lifestyle company operating Tanishq, Titan watches and Titan Eyeplus retail formats.' },
  { symbol: 'ASIANPAINT', name: 'Asian Paints', sector: 'Consumer', price: 2890.4, industry: 'Paints & Coatings', mcap: 277000, pe: 55.1, pb: 13.4, eps: 52.4, divYield: 1.2, roe: 25.8, week52High: 3395, week52Low: 2125, faceValue: 1, about: 'India\'s largest paint manufacturer with a dominant decorative coatings share and growing home décor business.' },
  { symbol: 'WIPRO', name: 'Wipro', sector: 'IT', price: 498.75, industry: 'IT Consulting & Software', mcap: 261000, pe: 22.4, pb: 3.4, eps: 22.3, divYield: 0.2, roe: 15.1, week52High: 580, week52Low: 415, faceValue: 2, about: 'Global information technology, consulting and business process services company headquartered in Bengaluru.' },
  { symbol: 'HCLTECH', name: 'HCL Technologies', sector: 'IT', price: 1688.9, industry: 'IT Consulting & Software', mcap: 458000, pe: 26.9, pb: 6.7, eps: 62.8, divYield: 3.4, roe: 24.8, week52High: 2012, week52Low: 1235, faceValue: 2, about: 'IT services major with a differentiated engineering, R&D services and software products portfolio.' },
  { symbol: 'NTPC', name: 'NTPC', sector: 'Energy', price: 356.2, industry: 'Power Generation', mcap: 345000, pe: 16.4, pb: 2.1, eps: 21.7, divYield: 2.2, roe: 13.4, week52High: 448, week52Low: 292, faceValue: 10, about: 'India\'s largest power utility with a rapidly expanding renewable energy generation portfolio.' },
  { symbol: 'TATAMOTORS', name: 'Tata Motors', sector: 'Auto', price: 784.55, industry: 'Automobiles', mcap: 288000, pe: 11.2, pb: 2.9, eps: 70.1, divYield: 0.8, roe: 26.4, week52High: 1179, week52Low: 606, faceValue: 2, about: 'Automotive major spanning commercial vehicles, passenger EVs in India and the Jaguar Land Rover business globally.' },
  { symbol: 'M&M', name: 'Mahindra & Mahindra', sector: 'Auto', price: 2788.0, industry: 'Automobiles & Tractors', mcap: 346000, pe: 29.4, pb: 5.1, eps: 94.8, divYield: 0.7, roe: 18.2, week52High: 3270, week52Low: 2160, faceValue: 5, about: 'Leader in Indian tractors and SUVs, with growing electric vehicle and farm equipment businesses.' },
  { symbol: 'ADANIENT', name: 'Adani Enterprises', sector: 'Conglomerate', price: 2894.3, industry: 'Trading & Diversified', mcap: 331000, pe: 84.2, pb: 7.1, eps: 34.4, divYield: 0.1, roe: 9.4, week52High: 3743, week52Low: 2200, faceValue: 1, about: 'Flagship incubator of the Adani group, developing airports, roads, data centres and green hydrogen ventures.' },
  { symbol: 'ZOMATO', name: 'Eternal (Zomato)', sector: 'Consumer', price: 248.9, industry: 'Internet & Food Delivery', mcap: 240000, pe: 312.4, pb: 12.1, eps: 0.8, divYield: 0, roe: 4.1, week52High: 304, week52Low: 146, faceValue: 1, about: 'Operates India\'s leading food delivery platform along with the Blinkit quick-commerce and dining-out businesses.' },
  { symbol: 'PAYTM', name: 'One97 Communications', sector: 'Fintech', price: 888.4, industry: 'Financial Technology', mcap: 56000, pe: 0, pb: 4.2, eps: -12.4, divYield: 0, roe: -6.2, week52High: 1063, week52Low: 310, faceValue: 1, about: 'Digital payments and financial services platform serving consumers and merchants across India.' },
  { symbol: 'DMART', name: 'Avenue Supermarts', sector: 'Retail', price: 3884.5, industry: 'Retail & Supermarkets', mcap: 252000, pe: 92.4, pb: 12.8, eps: 42.1, divYield: 0, roe: 14.2, week52High: 5484, week52Low: 3400, faceValue: 10, about: 'Operates the DMart chain of hypermarkets built on an everyday-low-cost, owned-store retail model.' },
  { symbol: 'IRCTC', name: 'IRCTC', sector: 'Travel', price: 788.25, industry: 'Travel & Tourism Services', mcap: 63000, pe: 48.2, pb: 15.4, eps: 16.4, divYield: 0.8, roe: 33.2, week52High: 1138, week52Low: 656, faceValue: 2, about: 'Monopoly operator of Indian Railways ticketing, catering, packaged drinking water and tourism services.' },
  { symbol: 'HAL', name: 'Hindustan Aeronautics', sector: 'Defence', price: 4288.0, industry: 'Aerospace & Defence', mcap: 287000, pe: 34.8, pb: 9.2, eps: 123.2, divYield: 0.8, roe: 27.4, week52High: 5675, week52Low: 3046, faceValue: 5, about: 'State-owned aerospace major manufacturing fighter aircraft, helicopters and aero-engines for the armed forces.' },
  { symbol: 'BEL', name: 'Bharat Electronics', sector: 'Defence', price: 288.4, industry: 'Defence Electronics', mcap: 210000, pe: 48.6, pb: 13.2, eps: 5.9, divYield: 0.8, roe: 27.9, week52High: 340, week52Low: 195, faceValue: 1, about: 'Navratna defence PSU supplying radars, electronic warfare systems and communication equipment.' },
  { symbol: 'INDIGO', name: 'InterGlobe Aviation', sector: 'Aviation', price: 4288.0, industry: 'Airlines', mcap: 165000, pe: 26.4, pb: 42.1, eps: 162.4, divYield: 0, roe: 152.4, week52High: 5035, week52Low: 3400, faceValue: 10, about: 'India\'s largest airline by market share, operating a low-cost, high-frequency domestic and international network.' },
]

export { MUTUAL_FUNDS } from './mutualFunds.js'

export const IPOS = [
  { id: 'ipo-nova', name: 'NovaTech Industries', status: 'open', priceMin: 285, priceMax: 300, lotSize: 50, openDate: '2026-08-01', closeDate: '2026-08-08', gmp: 42 },
  { id: 'ipo-green', name: 'GreenGrid Energy', status: 'open', priceMin: 118, priceMax: 124, lotSize: 120, openDate: '2026-08-03', closeDate: '2026-08-07', gmp: 18 },
  { id: 'ipo-pulse', name: 'PulsePay Fintech', status: 'upcoming', priceMin: 450, priceMax: 475, lotSize: 30, openDate: '2026-08-12', closeDate: '2026-08-14', gmp: 0 },
  { id: 'ipo-orbit', name: 'Orbit Logistics', status: 'closed', priceMin: 210, priceMax: 220, lotSize: 65, openDate: '2026-07-20', closeDate: '2026-07-22', gmp: 55 },
]

function jitter(base, pct = 0.012) {
  return Math.max(0.01, +(base + base * pct * (Math.random() * 2 - 1)).toFixed(2))
}

const yahooFinance = new YahooFinance({ suppressNotices: ['yahooSurvey'] })
const POLL_INTERVAL_MS = Math.max(5000, Number(process.env.MARKET_POLL_MS) || 5000)
const YAHOO_SYMBOL_OVERRIDES = {
  TATAMOTORS: 'TMPV.NS',
  ZOMATO: 'ETERNAL.NS',
}
const INDEX_TICKERS = {
  NIFTY: '^NSEI',
  SENSEX: '^BSESN',
  BANKNIFTY: '^NSEBANK',
}

const INDEX_META = {
  NIFTY: {
    name: 'NIFTY 50',
    exchange: 'NSE',
    lotSize: 25,
    strikeStep: 50,
    about: 'Benchmark index of the National Stock Exchange tracking 50 of the largest and most liquid Indian equities.',
  },
  SENSEX: {
    name: 'SENSEX',
    exchange: 'BSE',
    lotSize: 10,
    strikeStep: 100,
    about: 'BSE\'s flagship 30-stock index representing large, well-established Indian companies across key sectors.',
  },
  BANKNIFTY: {
    name: 'BANK NIFTY',
    exchange: 'NSE',
    lotSize: 15,
    strikeStep: 100,
    about: 'Sectoral index of the most liquid banking stocks on the NSE, widely used for weekly options trading.',
  },
}

function yahooTicker(symbol) {
  return YAHOO_SYMBOL_OVERRIDES[symbol] || `${symbol}.NS`
}

function finite(value, fallback) {
  return Number.isFinite(Number(value)) ? Number(value) : fallback
}

class MarketEngine {
  constructor() {
    this.instruments = new Map()
    this.clients = new Set()
    this.timer = null
    this.refreshing = false
    this.hasYahooData = false
    this.chartCache = new Map()
    this.status = {
      provider: 'Yahoo Finance',
      source: 'initialising',
      isDelayed: true,
      pollIntervalMs: POLL_INTERVAL_MS,
      lastUpdated: null,
      marketState: 'UNKNOWN',
      error: null,
    }

    for (const row of INSTRUMENTS) {
      const prevClose = row.price
      this.instruments.set(row.symbol, {
        ...row,
        price: row.price,
        prevClose,
        open: row.price,
        high: row.price,
        low: row.price,
        volume: 0,
        change: 0,
        changePct: 0,
        lastUpdate: null,
        dataSource: 'initialising',
        yahooSymbol: yahooTicker(row.symbol),
      })
    }

    this.indices = {
      NIFTY: {
        key: 'NIFTY',
        ...INDEX_META.NIFTY,
        value: 24850.4,
        change: 104.2,
        changePct: 0.42,
        open: 24780,
        high: 24910,
        low: 24720,
        prevClose: 24746.2,
        volume: 0,
      },
      SENSEX: {
        key: 'SENSEX',
        ...INDEX_META.SENSEX,
        value: 81520.1,
        change: 308.4,
        changePct: 0.38,
        open: 81280,
        high: 81640,
        low: 81150,
        prevClose: 81211.7,
        volume: 0,
      },
      BANKNIFTY: {
        key: 'BANKNIFTY',
        ...INDEX_META.BANKNIFTY,
        value: 51240.8,
        change: -76.9,
        changePct: -0.15,
        open: 51340,
        high: 51480,
        low: 51110,
        prevClose: 51317.7,
        volume: 0,
      },
    }
  }

  start() {
    if (this.timer) return
    this.refreshYahoo()
    this.timer = setInterval(() => this.refreshYahoo(), POLL_INTERVAL_MS)
  }

  async refreshYahoo() {
    if (this.refreshing) return
    this.refreshing = true

    try {
      const equityTickers = INSTRUMENTS.map((instrument) => yahooTicker(instrument.symbol))
      const requested = [...equityTickers, ...Object.values(INDEX_TICKERS)]
      const quotes = await yahooFinance.quote(requested)
      const byTicker = new Map(quotes.map((quote) => [quote.symbol, quote]))
      const batch = []
      let marketState = 'UNKNOWN'

      for (const instrument of INSTRUMENTS) {
        const row = this.instruments.get(instrument.symbol)
        const quote = byTicker.get(yahooTicker(instrument.symbol))
        if (!quote || !Number.isFinite(quote.regularMarketPrice)) continue

        const price = finite(quote.regularMarketPrice, row.price)
        const previousClose = finite(quote.regularMarketPreviousClose, row.prevClose)
        const quoteTime = quote.regularMarketTime instanceof Date
          ? quote.regularMarketTime.getTime()
          : Date.now()

        Object.assign(row, {
          price,
          prevClose: previousClose,
          open: finite(quote.regularMarketOpen, row.open),
          high: finite(quote.regularMarketDayHigh, row.high),
          low: finite(quote.regularMarketDayLow, row.low),
          volume: finite(quote.regularMarketVolume, row.volume),
          change: +finite(quote.regularMarketChange, price - previousClose).toFixed(2),
          changePct: +finite(
            quote.regularMarketChangePercent,
            previousClose ? ((price - previousClose) / previousClose) * 100 : 0,
          ).toFixed(2),
          week52High: finite(quote.fiftyTwoWeekHigh, row.week52High),
          week52Low: finite(quote.fiftyTwoWeekLow, row.week52Low),
          mcap: quote.marketCap ? +(quote.marketCap / 10000000).toFixed(2) : row.mcap,
          pe: finite(quote.trailingPE, row.pe),
          pb: finite(quote.priceToBook, row.pb),
          eps: finite(quote.epsTrailingTwelveMonths, row.eps),
          divYield: Number.isFinite(quote.trailingAnnualDividendYield)
            ? +(quote.trailingAnnualDividendYield * 100).toFixed(2)
            : row.divYield,
          lastUpdate: quoteTime,
          dataSource: 'yahoo',
          marketState: quote.marketState || 'UNKNOWN',
        })

        marketState = quote.marketState || marketState
        batch.push({
          symbol: row.symbol,
          price: row.price,
          volume: row.volume,
          change: +row.change.toFixed(2),
          changePct: +row.changePct.toFixed(2),
          high: row.high,
          low: row.low,
          ts: row.lastUpdate,
          dataSource: 'yahoo',
        })
      }

      for (const [key, ticker] of Object.entries(INDEX_TICKERS)) {
        const quote = byTicker.get(ticker)
        if (!quote || !Number.isFinite(quote.regularMarketPrice)) continue
        const value = quote.regularMarketPrice
        const prevClose = finite(quote.regularMarketPreviousClose, this.indices[key].prevClose || value)
        const change = finite(quote.regularMarketChange, value - prevClose)
        this.indices[key] = {
          ...this.indices[key],
          key,
          ...INDEX_META[key],
          value,
          change: +change.toFixed(2),
          changePct: +finite(quote.regularMarketChangePercent, (change / prevClose) * 100).toFixed(2),
          open: finite(quote.regularMarketOpen, this.indices[key].open || value),
          high: finite(quote.regularMarketDayHigh, this.indices[key].high || value),
          low: finite(quote.regularMarketDayLow, this.indices[key].low || value),
          prevClose,
          volume: finite(quote.regularMarketVolume, 0),
          lastUpdate: quote.regularMarketTime instanceof Date
            ? quote.regularMarketTime.getTime()
            : Date.now(),
        }
      }

      if (!batch.length) throw new Error('Yahoo returned no NSE quotes')

      this.hasYahooData = true
      this.status = {
        ...this.status,
        source: 'yahoo',
        lastUpdated: Date.now(),
        marketState,
        error: null,
      }
      this.broadcast({
        type: 'ticks',
        ticks: batch,
        indices: this.indices,
        marketStatus: this.status,
      })
    } catch (error) {
      console.warn('Yahoo Finance refresh failed:', error.message)
      this.status = {
        ...this.status,
        source: this.hasYahooData ? 'yahoo-stale' : 'simulated-fallback',
        error: error.message,
      }

      if (!this.hasYahooData) this.fallbackTick()
      else {
        this.broadcast({
          type: 'status',
          marketStatus: this.status,
        })
      }
    } finally {
      this.refreshing = false
    }
  }

  fallbackTick() {
    const batch = []
    for (const row of this.instruments.values()) {
      const next = jitter(row.price, 0.0008)
      row.price = next
      row.high = Math.max(row.high, next)
      row.low = Math.min(row.low, next)
      row.change = +(next - row.prevClose).toFixed(2)
      row.changePct = row.prevClose ? +((row.change / row.prevClose) * 100).toFixed(2) : 0
      row.lastUpdate = Date.now()
      row.dataSource = 'simulated-fallback'
      batch.push({
        symbol: row.symbol,
        price: row.price,
        volume: row.volume,
        change: row.change,
        changePct: row.changePct,
        high: row.high,
        low: row.low,
        ts: row.lastUpdate,
        dataSource: row.dataSource,
      })
    }
    this.broadcast({
      type: 'ticks',
      ticks: batch,
      indices: this.indices,
      marketStatus: this.status,
    })
  }

  broadcast(payload) {
    if (payload?.type === 'ticks' && Array.isArray(payload.ticks)) {
      const prices = new Map(payload.ticks.map((tick) => [tick.symbol, tick.price]))
      for (const [key, idx] of Object.entries(this.indices || {})) {
        if (idx?.value != null) prices.set(key.toUpperCase(), idx.value)
      }
      try {
        matchOpenOrders(prices)
      } catch (err) {
        console.warn('Order matcher error:', err.message)
      }
      try {
        processDueSips()
      } catch (err) {
        console.warn('SIP runner error:', err.message)
      }
      try {
        processPriceAlerts(prices)
      } catch (err) {
        console.warn('Alert runner error:', err.message)
      }
      try {
        processConditionalOrders(prices)
      } catch (err) {
        console.warn('Conditional runner error:', err.message)
      }
      try {
        processAutoSquareOff()
      } catch (err) {
        console.warn('Square-off runner error:', err.message)
      }
    }
    const data = `data: ${JSON.stringify(payload)}\n\n`
    for (const res of this.clients) {
      try {
        res.write(data)
      } catch {
        this.clients.delete(res)
      }
    }
    // Optional WS dual-support hook — see docs/WEBSOCKET.md
    try {
      this.wsSend?.(payload)
    } catch (err) {
      console.warn('wsSend hook error:', err.message)
    }
  }

  addClient(res) {
    this.clients.add(res)
    res.write(`data: ${JSON.stringify({
      type: 'snapshot',
      instruments: this.list(),
      indices: this.indices,
      marketStatus: this.status,
    })}\n\n`)
  }

  removeClient(res) {
    this.clients.delete(res)
  }

  list() {
    return [...this.instruments.values()]
  }

  get(symbol) {
    return this.instruments.get(symbol.toUpperCase()) || null
  }

  getIndex(key) {
    const normalised = String(key || '').toUpperCase()
    return this.indices[normalised] || null
  }

  price(symbol) {
    return this.get(symbol)?.price ?? null
  }

  /**
   * Resolves equity instruments or index keys (NIFTY / SENSEX / BANKNIFTY)
   * to a Yahoo ticker + synthetic instrument shape for charting.
   */
  resolveChartTarget(symbol) {
    const upper = String(symbol || '').toUpperCase()
    const instrument = this.get(upper)
    if (instrument) {
      return {
        key: instrument.symbol,
        yahooSymbol: instrument.yahooSymbol,
        price: instrument.price,
        prevClose: instrument.prevClose,
      }
    }
    const index = this.getIndex(upper)
    if (index && INDEX_TICKERS[upper]) {
      return {
        key: upper,
        yahooSymbol: INDEX_TICKERS[upper],
        price: index.value,
        prevClose: index.prevClose || index.value,
      }
    }
    return null
  }

  async candles(symbol, count = 120, intervalSec = 60) {
    const target = this.resolveChartTarget(symbol)
    if (!target) return []

    const cacheKey = `${target.key}:${intervalSec}:${count}`
    const cached = this.chartCache.get(cacheKey)
    if (cached && Date.now() - cached.time < 30000) return cached.candles

    try {
      const { interval, aggregate, lookbackMs } = this.yahooChartOptions(intervalSec, count)
      const result = await yahooFinance.chart(target.yahooSymbol, {
        period1: new Date(Date.now() - lookbackMs),
        interval,
        includePrePost: false,
      })
      let candles = result.quotes
        .filter((quote) =>
          quote.date &&
          Number.isFinite(quote.open) &&
          Number.isFinite(quote.high) &&
          Number.isFinite(quote.low) &&
          Number.isFinite(quote.close))
        .map((quote) => ({
          time: Math.floor(quote.date.getTime() / 1000),
          open: +quote.open.toFixed(2),
          high: +quote.high.toFixed(2),
          low: +quote.low.toFixed(2),
          close: +quote.close.toFixed(2),
          volume: finite(quote.volume, 0),
        }))

      if (aggregate > 1) candles = this.aggregateCandles(candles, aggregate)
      candles = candles.slice(-count)
      if (!candles.length) throw new Error('Yahoo returned no chart data')

      this.chartCache.set(cacheKey, { time: Date.now(), candles })
      return candles
    } catch (error) {
      console.warn(`Yahoo chart failed for ${symbol}:`, error.message)
      return this.simulatedCandles(symbol, count, intervalSec)
    }
  }

  yahooChartOptions(intervalSec, count) {
    if (intervalSec <= 60) {
      return { interval: '1m', aggregate: 1, lookbackMs: Math.max(2, Math.ceil(count / 350)) * 86400000 }
    }
    if (intervalSec <= 300) {
      return { interval: '5m', aggregate: 1, lookbackMs: Math.max(3, Math.ceil(count / 70) + 1) * 86400000 }
    }
    if (intervalSec <= 900) {
      return { interval: '15m', aggregate: 1, lookbackMs: Math.max(5, Math.ceil(count / 24) + 2) * 86400000 }
    }
    if (intervalSec <= 3600) {
      return { interval: '60m', aggregate: 1, lookbackMs: Math.max(12, Math.ceil(count / 6) * 2) * 86400000 }
    }
    if (intervalSec < 86400) {
      const aggregate = Math.max(2, Math.round(intervalSec / 3600))
      return { interval: '60m', aggregate, lookbackMs: Math.max(30, count * aggregate / 3) * 86400000 }
    }
    return { interval: '1d', aggregate: 1, lookbackMs: Math.max(150, count * 2) * 86400000 }
  }

  aggregateCandles(candles, size) {
    const aggregated = []
    for (let index = 0; index < candles.length; index += size) {
      const group = candles.slice(index, index + size)
      if (!group.length) continue
      aggregated.push({
        time: group[0].time,
        open: group[0].open,
        high: Math.max(...group.map((candle) => candle.high)),
        low: Math.min(...group.map((candle) => candle.low)),
        close: group[group.length - 1].close,
        volume: group.reduce((sum, candle) => sum + candle.volume, 0),
      })
    }
    return aggregated
  }

  simulatedCandles(symbol, count = 120, intervalSec = 60) {
    const target = this.resolveChartTarget(symbol)
    if (!target) return []
    const interval = Math.max(60, Number(intervalSec) || 60)
    const candles = []
    const volatility = interval >= 86400 ? 0.012 : interval >= 3600 ? 0.006 : 0.0035
    let price = target.prevClose * (0.97 + Math.random() * 0.04)
    const now = Math.floor(Date.now() / 1000)
    const aligned = Math.floor(now / interval) * interval

    for (let i = count; i > 0; i -= 1) {
      const open = price
      const close = Math.max(0.01, open + (Math.random() - 0.48) * target.price * volatility)
      const wick = target.price * volatility * 0.35
      candles.push({
        time: aligned - i * interval,
        open: +open.toFixed(2),
        high: +(Math.max(open, close) + Math.random() * wick).toFixed(2),
        low: +(Math.min(open, close) - Math.random() * wick).toFixed(2),
        close: +close.toFixed(2),
        volume: Math.floor(800 + Math.random() * (interval >= 3600 ? 80000 : 25000)),
      })
      price = close
    }
    candles[candles.length - 1].close = target.price
    candles[candles.length - 1].high = Math.max(candles[candles.length - 1].high, target.price)
    candles[candles.length - 1].low = Math.min(candles[candles.length - 1].low, target.price)
    return candles
  }

  /**
   * Synthetic NSE-style option chain around ATM. Premiums follow a simple
   * Black-Scholes-ish surface so CE/PE values look realistic for demos.
   */
  optionChain(key) {
    const index = this.getIndex(key)
    if (!index) return null

    const spot = index.value
    const step = index.strikeStep || 50
    const atm = Math.round(spot / step) * step
    const expiry = nextWeeklyExpiry()
    const daysToExpiry = Math.max(1, Math.round((expiry.getTime() - Date.now()) / 86400000))
    const t = daysToExpiry / 365
    const r = 0.065
    const baseIv = key === 'BANKNIFTY' ? 0.18 : 0.14

    const rows = []
    for (let i = -10; i <= 10; i += 1) {
      const strike = atm + i * step
      const moneyness = Math.abs(spot - strike) / spot
      const iv = +(baseIv + moneyness * 0.55).toFixed(4)
      const ce = blackScholes(spot, strike, t, r, iv, 'call')
      const pe = blackScholes(spot, strike, t, r, iv, 'put')
      // Deterministic synthetic OI so PCR / max-pain stay stable across refreshes.
      const seed = Math.abs(Math.sin(strike * 12.9898 + atm * 0.17))
      const seed2 = Math.abs(Math.cos(strike * 9.13 + atm * 0.11))
      const callOpenInterest = Math.max(5000, Math.floor(180000 + seed * 1600000 * (1 - moneyness * 2)))
      const putOpenInterest = Math.max(5000, Math.floor(160000 + seed2 * 1700000 * (1 - moneyness * 2)))
      const chgSeed = Math.sin(strike + daysToExpiry)
      rows.push({
        strike,
        atm: strike === atm,
        callOi: callOpenInterest,
        putOi: putOpenInterest,
        oi: callOpenInterest + putOpenInterest,
        call: {
          ltp: +ce.toFixed(2),
          change: +((chgSeed * 0.08) * ce).toFixed(2),
          iv: +(iv * 100).toFixed(2),
          oi: callOpenInterest,
          volume: Math.floor(callOpenInterest * (0.08 + seed * 0.2)),
          bid: +(ce * 0.985).toFixed(2),
          ask: +(ce * 1.015).toFixed(2),
        },
        put: {
          ltp: +pe.toFixed(2),
          change: +((chgSeed * -0.06) * pe).toFixed(2),
          iv: +(iv * 100).toFixed(2),
          oi: putOpenInterest,
          volume: Math.floor(putOpenInterest * (0.08 + seed2 * 0.2)),
          bid: +(pe * 0.985).toFixed(2),
          ask: +(pe * 1.015).toFixed(2),
        },
      })
    }

    const callOi = rows.reduce((s, r) => s + r.call.oi, 0)
    const putOi = rows.reduce((s, r) => s + r.put.oi, 0)

    // Max pain: strike where option writers' total payoff is minimized.
    let maxPain = atm
    let minPain = Infinity
    for (const candidate of rows) {
      let pain = 0
      for (const row of rows) {
        if (candidate.strike > row.strike) pain += (candidate.strike - row.strike) * row.call.oi
        if (candidate.strike < row.strike) pain += (row.strike - candidate.strike) * row.put.oi
      }
      if (pain < minPain) {
        minPain = pain
        maxPain = candidate.strike
      }
    }

    return {
      underlying: index.key,
      name: index.name,
      spot,
      atm,
      strikeStep: step,
      lotSize: index.lotSize,
      expiry: expiry.toISOString().slice(0, 10),
      daysToExpiry,
      pcr: +(putOi / callOi).toFixed(2),
      callOi,
      putOi,
      maxPain,
      rows,
      note: 'Demo option chain modelled from the live index spot. Premiums are indicative, not exchange quotes.',
    }
  }

  depth(symbol) {
    const price = this.price(symbol) || this.getIndex(symbol)?.value || 100
    const bids = Array.from({ length: 10 }, (_, i) => ({
      price: +(price * (1 - (i + 1) * 0.00035)).toFixed(2),
      size: Math.floor(80 + Math.random() * 2000),
    }))
    const asks = Array.from({ length: 10 }, (_, i) => ({
      price: +(price * (1 + (i + 1) * 0.00035)).toFixed(2),
      size: Math.floor(80 + Math.random() * 2000),
    }))
    return { bids, asks }
  }
}

function nextWeeklyExpiry(from = new Date()) {
  const d = new Date(from)
  d.setHours(15, 30, 0, 0)
  const day = d.getDay()
  // NSE weekly index options expire on Thursday (4)
  const add = day <= 4 ? 4 - day : 11 - day
  if (add === 0 && from.getHours() * 60 + from.getMinutes() >= 15 * 60 + 30) {
    d.setDate(d.getDate() + 7)
  } else {
    d.setDate(d.getDate() + add)
  }
  return d
}

function normCdf(x) {
  const t = 1 / (1 + 0.2316419 * Math.abs(x))
  const d = 0.3989423 * Math.exp((-x * x) / 2)
  const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))))
  return x > 0 ? 1 - p : p
}

function blackScholes(spot, strike, t, r, iv, type) {
  if (t <= 0 || iv <= 0) return Math.max(0, type === 'call' ? spot - strike : strike - spot)
  const d1 = (Math.log(spot / strike) + (r + (iv * iv) / 2) * t) / (iv * Math.sqrt(t))
  const d2 = d1 - iv * Math.sqrt(t)
  if (type === 'call') return spot * normCdf(d1) - strike * Math.exp(-r * t) * normCdf(d2)
  return strike * Math.exp(-r * t) * normCdf(-d2) - spot * normCdf(-d1)
}

export const market = new MarketEngine()
export { INDEX_TICKERS, INDEX_META }
