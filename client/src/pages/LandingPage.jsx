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
    <div className="full">
      <header className="page row px-lg py-md">
        <BrandLockup size="md" />
        <div className="row gap-sm">
          <Link to="/login" className="btn btn-ghost">Login</Link>
          <Link to="/register" className="btn btn-primary">Open free demat</Link>
        </div>
      </header>

      <section className="relative page overflow-hidden px-lg">
        <div className="hero-mesh relative overflow-hidden rounded-[28px] px-lg py-md">
          <div
            className="absolute"
            style={{
              backgroundImage:
                'linear-gradient(rgb(255 255 255 / 0.06) 1px, transparent 1px), linear-gradient(90deg, rgb(255 255 255 / 0.06) 1px, transparent 1px)',
              backgroundSize: '28px 28px',
            }}
          />
          <div className="relative grid gap-10 ]">
            <div>
              <p className="mb-md text-xs bold tracking-[0.18em] text-[#7dffc8] uppercase">
                India&apos;s paper brokerage
              </p>
              <h1 className="text-4xl extrabold ]">
                Learn the markets
                <br />
                without risking <span className="text-[#7dffc8]">a rupee</span>
              </h1>
              <p className="mt-md text-lg">
                Arth is a paper-trading brokerage — live NSE prices, real order flow, SIPs and
                IPOs, with none of the downside.
              </p>
              <div className="mt-7 row wrap gap-md">
                <Link to="/register" className="btn btn-primary">Start investing</Link>
                <Link to="/login" className="btn border">
                  Demo login
                </Link>
              </div>
              <p className="mt-lg mono text-xs">demo@arth.app · Demo@1234</p>
            </div>

            <div className="rounded border p-lg">
              <div className="row gap-sm text-sm">
                <IconTrendingUp size={16} className="text-[#7dffc8]" />
                Portfolio value
              </div>
              <div className="mt-sm mono text-3xl bold">₹4,82,450.20</div>
              <div className="mt-sm text-sm bold text-[#7dffc8]">+₹12,840.50 (2.74%) today</div>
              <GrowthHeroArt accent="#7dffc8" className="mt-md w-full" />
              <div className="mt-lg grid-2 gap-sm text-sm">
                {[
                  { title: 'Stocks', sub: 'Live charts', Icon: IconCandles },
                  { title: 'Mutual funds', sub: 'SIP ready', Icon: IconCoins },
                  { title: 'IPOs', sub: 'UPI apply', Icon: IconRocket },
                  { title: 'Wallet', sub: 'Add money', Icon: IconWallet },
                ].map(({ title, sub, Icon }) => (
                  <div key={title} className="row gap-md rounded px-lg py-md">
                    <Icon size={18} className="shrink-0 text-[#7dffc8]" />
                    <div className="min-">
                      <div className="truncate bold">{title}</div>
                      <div className="truncate text-xs">{sub}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="page grid gap-md px-lg">
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
          <div key={title} className={`card tile-accent theme- ${theme} p-xl`}>
            <span className="icon-chip icon-chip-lg mb-md">
              <Icon size={22} />
            </span>
            <h2 className="bold ink">{title}</h2>
            <p className="mt-sm text-sm muted">{body}</p>
          </div>
        ))}
      </section>
    </div>
  )
}
