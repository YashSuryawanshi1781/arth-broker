import { Link } from 'react-router-dom'
import { SiteShell } from '../components/SiteShell'
import { GrowthHeroArt } from '../components/Illustrations'
import {
  IconArrowRight,
  IconCandles,
  IconCheckCircle,
  IconCoins,
  IconRocket,
  IconShield,
  IconSparkles,
  IconTrendingUp,
  IconWallet,
} from '../components/Icons'

export function LandingPage() {
  return (
    <SiteShell>
      <section className="land-hero">
        <div className="land-hero-mesh" />
        <div className="land-hero-grid" />
        <div className="site-wrap land-hero-inner">
          <div className="land-hero-copy land-fade">
            <p className="land-eyebrow">Arth · India&apos;s paper brokerage</p>
            <h1>
              Learn the markets
              <br />
              without risking <span>a rupee</span>
            </h1>
            <p className="land-lead">
              Live NSE prices, real order flow, SIPs and IPOs — practice like a broker client
              with paper capital only.
            </p>
            <div className="land-cta">
              <Link to="/register" className="btn btn-primary">
                Start investing
                <IconArrowRight size={16} />
              </Link>
              <Link to="/login" className="btn land-cta-ghost">
                Demo login
              </Link>
            </div>
          </div>

          <div className="land-hero-visual land-fade land-fade-delay" aria-hidden="true">
            <div className="land-terminal">
              <div className="land-terminal-head">
                <IconTrendingUp size={16} />
                Portfolio value
                <span className="land-live">Live</span>
              </div>
              <div className="land-terminal-value">₹4,82,450.20</div>
              <div className="land-terminal-delta">+₹12,840.50 (2.74%) today</div>
              <GrowthHeroArt accent="#7dffc8" className="land-terminal-chart" />
              <div className="land-terminal-tiles">
                {[
                  { title: 'Stocks', sub: 'Live charts', Icon: IconCandles },
                  { title: 'Mutual funds', sub: 'SIP ready', Icon: IconCoins },
                  { title: 'IPOs', sub: 'Apply flow', Icon: IconRocket },
                  { title: 'Wallet', sub: 'Add money', Icon: IconWallet },
                ].map(({ title, sub, Icon }) => (
                  <div key={title} className="land-terminal-tile">
                    <Icon size={17} />
                    <div>
                      <strong>{title}</strong>
                      <span>{sub}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="site-section">
        <div className="site-wrap">
          <h2 className="site-section-title">Everything a modern demat teaches — without the downside</h2>
          <p className="site-section-lead">
            One terminal for equities, funds, IPOs and cash. Built for first-time investors and curious traders.
          </p>
          <div className="land-product-grid">
            {[
              {
                title: 'Equities & charts',
                body: 'Browse NSE names, read candles, place paper orders, and track day P&L like a live book.',
                Icon: IconCandles,
              },
              {
                title: 'Mutual funds & SIPs',
                body: 'Explore funds, run a SIP calculator, and practice recurring investments with paper NAVs.',
                Icon: IconCoins,
              },
              {
                title: 'IPO apply flow',
                body: 'Walk through an IPO application experience end-to-end — without blocking real UPI money.',
                Icon: IconRocket,
              },
              {
                title: 'Wallet & funds',
                body: 'Add paper cash, watch margins, and understand how money moves before you trade live elsewhere.',
                Icon: IconWallet,
              },
              {
                title: 'Research tools',
                body: 'Screener, compare, heatmap and calendar sit next to the book so learning stays in context.',
                Icon: IconSparkles,
              },
              {
                title: 'KYC rehearsal',
                body: 'PAN, Aadhaar OTP and bank steps mirror a real onboarding path — then unlock the terminal.',
                Icon: IconShield,
              },
            ].map(({ title, body, Icon }) => (
              <article key={title} className="land-product">
                <span className="icon-chip icon-chip-lg">
                  <Icon size={22} />
                </span>
                <h3>{title}</h3>
                <p>{body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="site-section site-section-tint">
        <div className="site-wrap">
          <h2 className="site-section-title">From signup to first order in minutes</h2>
          <p className="site-section-lead">
            No paperwork maze. A short path from account → KYC demo → trading home.
          </p>
          <ol className="land-steps">
            {[
              ['Create account', 'Name, email, mobile and password — under two minutes.'],
              ['Finish demo KYC', 'PAN, Aadhaar OTP and bank verification unlock the book.'],
              ['Trade on paper', 'Fund the wallet, place orders, track holdings and learn as you go.'],
            ].map(([title, body], i) => (
              <li key={title}>
                <span className="land-step-num">{i + 1}</span>
                <h3>{title}</h3>
                <p>{body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="site-section">
        <div className="site-wrap land-split">
          <div>
            <h2 className="site-section-title">Built like a brokerage. Priced like a classroom.</h2>
            <p className="site-section-lead land-split-lead">
              The full Arth surface is free for every paper demat. Teams and classrooms can talk to us about cohort tooling.
            </p>
            <ul className="site-check-list">
              {[
                '₹0 brokerage on paper trades',
                'Demo login ready: demo@arth.app',
                'No real money movement — ever',
              ].map((item) => (
                <li key={item}>
                  <IconCheckCircle size={18} className="text-accent" />
                  {item}
                </li>
              ))}
            </ul>
            <div className="land-inline-cta">
              <Link to="/pricing" className="btn btn-primary">
                See pricing
                <IconArrowRight size={16} />
              </Link>
              <Link to="/about" className="btn btn-ghost">About Arth</Link>
            </div>
          </div>
          <aside className="land-price-card">
            <p className="land-price-eyebrow">Paper demat</p>
            <div className="land-price-amount">₹0 <span>/ forever</span></div>
            <p>Stocks, MFs, IPOs, wallet, reports and learn mode — included.</p>
            <Link to="/register" className="btn btn-dark w-full">Open free demat</Link>
          </aside>
        </div>
      </section>

      <section className="site-section site-section-tint">
        <div className="site-wrap site-narrow">
          <h2 className="site-section-title">Questions, answered</h2>
          <div className="land-faq">
            {[
              [
                'Is Arth a real stock broker?',
                'No. Arth is a paper-trading demo for learning. It is not SEBI-registered and does not custody funds or securities.',
              ],
              [
                'Do I need real money?',
                'No. You trade with paper balances. The wallet “add money” flow is simulated for practice.',
              ],
              [
                'Are prices live?',
                'The terminal uses live-style market data feeds for education. Treat numbers as learning aids, not as an execution venue.',
              ],
              [
                'How do I try it quickly?',
                'Use demo@arth.app / Demo@1234 on the login page, or open a free demat from Register.',
              ],
            ].map(([q, a]) => (
              <details key={q} className="land-faq-item">
                <summary>{q}</summary>
                <p>{a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="site-cta-band">
        <div className="site-wrap site-cta-inner">
          <div>
            <h2>Open your paper demat today</h2>
            <p>Practice the full investing surface — then graduate to a live broker when you’re ready.</p>
          </div>
          <div className="site-cta-actions">
            <Link to="/register" className="btn btn-primary">
              Get started
              <IconArrowRight size={16} />
            </Link>
            <Link to="/contact" className="btn border border-white/25 bg-white/10 text-white hover:bg-white/15">
              Contact us
            </Link>
          </div>
        </div>
      </section>
    </SiteShell>
  )
}
