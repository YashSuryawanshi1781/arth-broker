import { Link } from 'react-router-dom'
import { BrandLockup } from '../components/Brand'
import { GrowthHeroArt } from '../components/Illustrations'
import {
  IconCandles,
  IconCoins,
  IconRocket,
  IconShield,
  IconSparkles,
  IconTrendingUp,
  IconWallet,
} from '../components/Icons'

export function LandingPage() {
  return (
    <div className="min-h-full">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5">
        <BrandLockup size="md" />
        <div className="flex gap-2">
          <Link to="/login" className="btn btn-ghost">Login</Link>
          <Link to="/register" className="btn btn-primary">Open free demat</Link>
        </div>
      </header>

      <section className="relative mx-auto max-w-6xl overflow-hidden px-4 pb-8 pt-4 md:pt-8">
        <div className="hero-mesh relative overflow-hidden rounded-[28px] px-6 py-10 text-white md:px-12 md:py-14">
          <div
            className="pointer-events-none absolute inset-0 opacity-30"
            style={{
              backgroundImage:
                'linear-gradient(rgb(255 255 255 / 0.06) 1px, transparent 1px), linear-gradient(90deg, rgb(255 255 255 / 0.06) 1px, transparent 1px)',
              backgroundSize: '28px 28px',
            }}
          />
          <div className="relative grid gap-10 md:grid-cols-[1.15fr_0.85fr] md:items-center">
            <div>
              <p className="mb-3 text-xs font-bold tracking-[0.18em] text-[#7dffc8] uppercase">
                India&apos;s paper brokerage
              </p>
              <h1 className="max-w-xl text-4xl font-extrabold tracking-tight text-white md:text-5xl md:leading-[1.05]">
                Learn the markets
                <br />
                without risking <span className="text-[#7dffc8]">a rupee</span>
              </h1>
              <p className="mt-3 max-w-md text-lg text-white/75">
                Arth is a paper-trading brokerage — live NSE prices, real order flow, SIPs and
                IPOs, with none of the downside.
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <Link to="/register" className="btn btn-primary">Start investing</Link>
                <Link
                  to="/login"
                  className="btn border border-white/25 bg-white/10 text-white hover:bg-white/15"
                >
                  Demo login
                </Link>
              </div>
              <p className="mt-4 font-mono text-xs text-white/50">demo@arth.app · Demo@1234</p>
            </div>

            <div className="rounded-2xl border border-white/15 bg-white/10 p-5 shadow-[0_20px_50px_-24px_rgba(0,0,0,0.55)] backdrop-blur-sm">
              <div className="flex items-center gap-1.5 text-sm text-white/60">
                <IconTrendingUp size={16} className="text-[#7dffc8]" />
                Portfolio value
              </div>
              <div className="mt-1 font-mono text-3xl font-bold tracking-tight text-white">
                ₹4,82,450.20
              </div>
              <div className="mt-1 text-sm font-semibold text-[#7dffc8]">+₹12,840.50 (2.74%) today</div>
              <GrowthHeroArt accent="#7dffc8" className="mt-3 h-24 w-full" />
              <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                {[
                  { title: 'Stocks', sub: 'Live charts', Icon: IconCandles },
                  { title: 'Mutual funds', sub: 'SIP ready', Icon: IconCoins },
                  { title: 'IPOs', sub: 'UPI apply', Icon: IconRocket },
                  { title: 'Wallet', sub: 'Add money', Icon: IconWallet },
                ].map(({ title, sub, Icon }) => (
                  <div key={title} className="flex items-center gap-2.5 rounded-xl bg-black/20 px-3 py-2.5">
                    <Icon size={18} className="flex-none text-[#7dffc8]" />
                    <div className="min-w-0">
                      <div className="truncate font-bold text-white">{title}</div>
                      <div className="truncate text-xs text-white/55">{sub}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-3 px-4 pb-16 sm:grid-cols-3">
        {[
          {
            title: 'KYC in minutes',
            body: 'PAN, Aadhaar OTP & bank — then unlock trading.',
            Icon: IconShield,
            theme: 'kyc',
          },
          {
            title: 'Realtime ticks',
            body: 'Live market feed across 30+ NSE symbols.',
            Icon: IconSparkles,
            theme: 'explore',
          },
          {
            title: 'Full product surface',
            body: 'Orders, holdings, funds, MFs, IPOs & account.',
            Icon: IconCoins,
            theme: 'mf',
          },
        ].map(({ title, body, Icon, theme }) => (
          <div key={title} className={`card tile-accent theme-${theme} p-5`}>
            <span className="icon-chip icon-chip-lg mb-3">
              <Icon size={22} />
            </span>
            <h2 className="font-bold text-ink">{title}</h2>
            <p className="mt-1 text-sm text-muted">{body}</p>
          </div>
        ))}
      </section>
    </div>
  )
}
