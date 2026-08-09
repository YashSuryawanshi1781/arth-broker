import { useState } from 'react'
import { Link } from 'react-router-dom'
import { SiteShell } from '../components/SiteShell'
import {
  IconArrowRight,
  IconCheckCircle,
  IconMail,
  IconShield,
  IconSparkles,
} from '../components/Icons'

export function AboutPage() {
  return (
    <SiteShell>
      <PageHero
        eyebrow="About Arth"
        title="Built so anyone can learn the markets without paying tuition to the market."
        subtitle="Arth is a paper-trading brokerage experience — live NSE prices, full order flow, mutual funds, IPOs and a wallet — with none of the downside of real capital."
      />

      <section className="site-section">
        <div className="site-wrap site-prose-grid">
          <div>
            <h2>Why we built it</h2>
            <p>
              Most people start investing with a spreadsheet, a YouTube video, and a leap of faith.
              Broker UIs are powerful — and intimidating — so mistakes get expensive before intuition forms.
            </p>
            <p>
              Arth mirrors a modern Indian brokerage so you can practice KYC, orders, SIPs, funds,
              and portfolio tracking the way you would at a real broker — with paper balances only.
            </p>
          </div>
          <div>
            <h2>What Arth is</h2>
            <ul className="site-check-list">
              {[
                'A learning product with live market data feel',
                'A full product surface: stocks, MFs, IPOs, wallet, reports',
                'Session-secured demo accounts — cookies only, no real money movement',
                'Explicitly not a SEBI-registered broker or investment advisor',
              ].map((item) => (
                <li key={item}>
                  <IconCheckCircle size={18} className="text-accent" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="site-section site-section-tint">
        <div className="site-wrap">
          <h2 className="site-section-title">How we think about product</h2>
          <p className="site-section-lead">
            Clarity first. Dense where traders need density. Honest about being a demo.
          </p>
          <div className="site-value-grid">
            {[
              {
                title: 'Realism without risk',
                body: 'Order tickets, holdings, day P&L and fund flows should feel familiar — so skills transfer.',
              },
              {
                title: 'Education baked in',
                body: 'Learn mode, research tools and calculators sit next to the trading surface, not in a separate app.',
              },
              {
                title: 'Honest demo',
                body: 'We label paper trading clearly. No dark patterns that pretend capital is real.',
              },
            ].map((item) => (
              <article key={item.title} className="site-value">
                <h3>{item.title}</h3>
                <p>{item.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <CtaBand
        title="Ready to open a paper demat?"
        body="Create an account in under two minutes and explore the full terminal."
      />
    </SiteShell>
  )
}

export function ContactPage() {
  const [form, setForm] = useState({ name: '', email: '', topic: 'general', message: '' })
  const [sent, setSent] = useState(false)

  const onSubmit = (e) => {
    e.preventDefault()
    setSent(true)
  }

  return (
    <SiteShell>
      <PageHero
        eyebrow="Contact us"
        title="Questions, feedback, or partnership ideas — we’re listening."
        subtitle="This is a demo product inbox. Messages stay in your browser session for now; use email for anything time-sensitive."
      />

      <section className="site-section">
        <div className="site-wrap site-contact-grid">
          <div className="site-contact-aside">
            <h2>Reach Arth</h2>
            <p>For demo support, product feedback, or press — start here.</p>
            <ul className="site-contact-meta">
              <li>
                <IconMail size={18} className="text-accent" />
                <div>
                  <strong>Email</strong>
                  <a href="mailto:hello@arth.app">hello@arth.app</a>
                </div>
              </li>
              <li>
                <IconSparkles size={18} className="text-accent" />
                <div>
                  <strong>Demo help</strong>
                  <span>Use demo@arth.app / Demo@1234 on login</span>
                </div>
              </li>
              <li>
                <IconShield size={18} className="text-accent" />
                <div>
                  <strong>Response window</strong>
                  <span>We aim to reply within 2 business days</span>
                </div>
              </li>
            </ul>
          </div>

          <form className="site-contact-form" onSubmit={onSubmit}>
            {sent ? (
              <div className="site-contact-success">
                <IconCheckCircle size={28} className="text-accent" />
                <h3>Message captured</h3>
                <p>
                  Thanks {form.name || 'there'}. In this demo build we don’t relay mail yet —
                  email <a href="mailto:hello@arth.app">hello@arth.app</a> if you need a human reply.
                </p>
                <button type="button" className="btn btn-ghost" onClick={() => setSent(false)}>
                  Send another
                </button>
              </div>
            ) : (
              <>
                <div className="site-contact-fields">
                  <div>
                    <label className="label" htmlFor="contact-name">Name</label>
                    <input
                      id="contact-name"
                      className="field"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <label className="label" htmlFor="contact-email">Email</label>
                    <input
                      id="contact-email"
                      className="field"
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="label" htmlFor="contact-topic">Topic</label>
                  <select
                    id="contact-topic"
                    className="field"
                    value={form.topic}
                    onChange={(e) => setForm({ ...form, topic: e.target.value })}
                  >
                    <option value="general">General question</option>
                    <option value="product">Product feedback</option>
                    <option value="bug">Bug report</option>
                    <option value="press">Press / partnership</option>
                  </select>
                </div>
                <div>
                  <label className="label" htmlFor="contact-message">Message</label>
                  <textarea
                    id="contact-message"
                    className="field site-textarea"
                    rows={5}
                    value={form.message}
                    onChange={(e) => setForm({ ...form, message: e.target.value })}
                    required
                  />
                </div>
                <button type="submit" className="btn btn-primary auth-submit">
                  Send message
                  <IconArrowRight size={16} />
                </button>
              </>
            )}
          </form>
        </div>
      </section>
    </SiteShell>
  )
}

export function PricingPage() {
  return (
    <SiteShell>
      <PageHero
        eyebrow="Pricing"
        title="Paper trading stays free. Always."
        subtitle="Arth is a learning brokerage. Every account gets the full terminal — stocks, mutual funds, IPOs, wallet, and research — at ₹0."
      />

      <section className="site-section">
        <div className="site-wrap site-price-grid">
          <article className="site-price is-featured">
            <p className="site-price-eyebrow">Everyone</p>
            <h2>Paper demat</h2>
            <div className="site-price-amount">
              <span>₹0</span>
              <small>/ forever</small>
            </div>
            <p className="site-price-note">No brokerage. No AMC. No surprise fees — because there’s no real money.</p>
            <ul className="site-check-list">
              {[
                'Live NSE-style market feed',
                'Equity orders, holdings & day P&L',
                'Mutual funds, SIPs & IPO apply flow',
                'Wallet, reports, screener & learn mode',
                'Demo credentials included',
              ].map((item) => (
                <li key={item}>
                  <IconCheckCircle size={18} className="text-accent" />
                  {item}
                </li>
              ))}
            </ul>
            <Link to="/register" className="btn btn-primary w-full auth-submit mt-6">
              Open free demat
              <IconArrowRight size={16} />
            </Link>
          </article>

          <article className="site-price">
            <p className="site-price-eyebrow">Coming later</p>
            <h2>Classroom / teams</h2>
            <div className="site-price-amount">
              <span>Talk to us</span>
            </div>
            <p className="site-price-note">
              Cohort dashboards, shared watchlists, and educator controls for colleges and fintech clubs.
            </p>
            <ul className="site-check-list">
              {[
                'Multi-seat paper portfolios',
                'Activity review for mentors',
                'Custom starting cash',
                'Priority feedback channel',
              ].map((item) => (
                <li key={item}>
                  <IconCheckCircle size={18} className="text-accent" />
                  {item}
                </li>
              ))}
            </ul>
            <Link to="/contact" className="btn btn-ghost w-full auth-submit mt-6">
              Contact for teams
            </Link>
          </article>
        </div>
      </section>

      <section className="site-section site-section-tint">
        <div className="site-wrap site-narrow">
          <h2 className="site-section-title">What’s not included</h2>
          <p className="site-section-lead">
            Arth does not move real funds, custody securities, or execute exchange orders.
            It is not investment advice and not a substitute for a SEBI-registered intermediary.
          </p>
        </div>
      </section>
    </SiteShell>
  )
}

export function PrivacyPage() {
  return (
    <SiteShell>
      <LegalDoc
        eyebrow="Legal"
        title="Privacy policy"
        updated="9 August 2026"
        sections={[
          [
            'Overview',
            'Arth is a paper-trading demo. We collect only what is needed to run demo accounts — typically name, email, phone, and session cookies — so you can sign in and use the terminal.',
          ],
          [
            'What we store',
            'Account profile fields, KYC demo inputs, paper portfolio state (orders, holdings, wallet), and basic activity logs needed for the product to function. Passwords are handled by the auth service and are never shown in the client.',
          ],
          [
            'Cookies & sessions',
            'We use session cookies to keep you signed in. Clearing cookies or signing out ends the session. There is no advertising tracker network in this demo build.',
          ],
          [
            'Market data',
            'Quotes and market snapshots may be fetched from third-party market data providers for educational display. That usage is for the demo experience, not for real trading.',
          ],
          [
            'Sharing',
            'We do not sell personal data. Hosting and infrastructure providers may process data as needed to run the app (for example, the API host and the web host).',
          ],
          [
            'Your choices',
            'You can stop using the demo at any time. For deletion or access requests related to a demo account, email hello@arth.app with the address on the account.',
          ],
          [
            'Contact',
            'Privacy questions: hello@arth.app. This policy may be updated as the demo evolves; the “Updated” date at the top will change when it does.',
          ],
        ]}
      />
    </SiteShell>
  )
}

export function TermsPage() {
  return (
    <SiteShell>
      <LegalDoc
        eyebrow="Legal"
        title="Terms of use"
        updated="9 August 2026"
        sections={[
          [
            'Paper trading only',
            'Arth is an educational paper-trading product. Balances, orders, holdings, SIPs and IPO applications are simulated. No real money is deposited, withdrawn, or invested through Arth.',
          ],
          [
            'Not a broker or advisor',
            'Arth is not a SEBI-registered stock broker, depository participant, or investment adviser. Nothing on the site is a recommendation to buy or sell securities.',
          ],
          [
            'Accounts',
            'You are responsible for keeping demo credentials secure. We may reset or remove demo accounts that abuse the service or disrupt other users.',
          ],
          [
            'Market data accuracy',
            'Prices and corporate actions shown may be delayed, incomplete, or illustrative. Do not rely on Arth for live trading decisions.',
          ],
          [
            'Acceptable use',
            'Do not attempt to attack, scrape abusively, or misrepresent Arth as a live brokerage. Do not use the product for unlawful activity.',
          ],
          [
            'Liability',
            'The service is provided “as is” for learning. To the extent permitted by law, Arth is not liable for decisions you make based on demo data or for outages of third-party data feeds.',
          ],
          [
            'Contact',
            'Questions about these terms: hello@arth.app or the Contact page.',
          ],
        ]}
      />
    </SiteShell>
  )
}

function PageHero({ eyebrow, title, subtitle }) {
  return (
    <section className="page-hero">
      <div className="site-wrap page-hero-inner">
        <p className="page-hero-eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>
    </section>
  )
}

function LegalDoc({ eyebrow, title, updated, sections }) {
  return (
    <>
      <PageHero eyebrow={eyebrow} title={title} subtitle={`Updated ${updated}`} />
      <section className="site-section">
        <div className="site-wrap site-legal">
          {sections.map(([heading, body]) => (
            <article key={heading}>
              <h2>{heading}</h2>
              <p>{body}</p>
            </article>
          ))}
        </div>
      </section>
    </>
  )
}

function CtaBand({ title, body }) {
  return (
    <section className="site-cta-band">
      <div className="site-wrap site-cta-inner">
        <div>
          <h2>{title}</h2>
          <p>{body}</p>
        </div>
        <div className="site-cta-actions">
          <Link to="/register" className="btn btn-primary">
            Start investing
            <IconArrowRight size={16} />
          </Link>
          <Link to="/login" className="btn border border-white/25 bg-white/10 text-white hover:bg-white/15">
            Demo login
          </Link>
        </div>
      </div>
    </section>
  )
}
