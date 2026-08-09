import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { useAppDispatch, useAppSelector } from '../app/hooks'
import { setUser } from '../features/auth/authSlice'
import { showToast } from '../features/ui/uiSlice'
import { Screen } from '../components/Screen'
import { BrandLockup } from '../components/Brand'
import { KycShieldArt } from '../components/Illustrations'
import {
  IconArrowLeft,
  IconArrowRight,
  IconBank,
  IconCheckCircle,
  IconDocument,
  IconIdCard,
  IconLock,
  IconShield,
  IconSparkles,
  IconUser,
  IconXCircle,
} from '../components/Icons'

const STEPS = [
  {
    id: 'profile',
    label: 'Your details',
    hint: 'Name and mobile number',
    icon: IconUser,
    title: 'Confirm your details',
    subtitle: 'This is how your account and contract notes will be addressed.',
  },
  {
    id: 'pan',
    label: 'PAN',
    hint: 'Income tax identity',
    icon: IconIdCard,
    title: 'Verify your PAN',
    subtitle: 'SEBI requires a PAN for every trading and demat account.',
  },
  {
    id: 'aadhaar',
    label: 'Aadhaar',
    hint: 'OTP verification',
    icon: IconLock,
    title: 'Aadhaar e-verification',
    subtitle: 'We send a one-time password to the mobile linked with your Aadhaar.',
  },
  {
    id: 'bank',
    label: 'Bank account',
    hint: 'Payouts and funding',
    icon: IconBank,
    title: 'Link your bank account',
    subtitle: 'Withdrawals are always paid back into this verified account.',
  },
  {
    id: 'disclosure',
    label: 'Risk disclosure',
    hint: 'Final confirmation',
    icon: IconDocument,
    title: 'Accept the risk disclosure',
    subtitle: 'One last confirmation and your account goes live.',
  },
]

const PAN_RE = /^[A-Z]{5}[0-9]{4}[A-Z]$/
const IFSC_RE = /^[A-Z]{4}0[A-Z0-9]{6}$/
const digitsOf = (value) => String(value || '').replace(/\D/g, '')

export function KycPage() {
  const user = useAppSelector((s) => s.auth.user)
  const dispatch = useAppDispatch()
  const navigate = useNavigate()

  const [step, setStep] = useState(Math.min(user?.kycStep || 0, 4))
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [verified, setVerified] = useState(null)
  const [form, setForm] = useState({
    name: user?.name || '',
    phone: digitsOf(user?.phone).slice(-10),
    pan: '',
    aadhaar: '',
    otp: '',
    account: '',
    ifsc: '',
    bankName: '',
    accepted: false,
  })

  useEffect(() => {
    if (user?.kycComplete) navigate('/app', { replace: true })
  }, [user, navigate])

  useEffect(() => {
    api('/kyc').then(setVerified).catch(() => {})
  }, [step])

  const update = (patch) => setForm((prev) => ({ ...prev, ...patch }))

  const validity = useMemo(() => ({
    name: form.name.trim().length >= 2,
    phone: digitsOf(form.phone).length === 10,
    pan: PAN_RE.test(form.pan),
    aadhaar: digitsOf(form.aadhaar).length === 12,
    otp: digitsOf(form.otp).length === 6,
    account: digitsOf(form.account).length >= 9 && digitsOf(form.account).length <= 18,
    ifsc: IFSC_RE.test(form.ifsc),
    bankName: form.bankName.trim().length >= 3,
    accepted: form.accepted,
  }), [form])

  const stepReady = [
    validity.name && validity.phone,
    validity.pan,
    validity.aadhaar && validity.otp,
    validity.account && validity.ifsc && validity.bankName,
    validity.accepted,
  ][step]

  const applyUser = (updated) => {
    dispatch(setUser(updated))
  }

  const submit = async () => {
    if (!stepReady || busy) return
    setError('')
    setBusy(true)
    try {
      if (step === 0) {
        const data = await api('/kyc/profile', {
          method: 'POST',
          body: { name: form.name.trim(), phone: digitsOf(form.phone) },
        })
        applyUser(data.user)
        setStep(1)
      } else if (step === 1) {
        const data = await api('/kyc/verify-pan', { method: 'POST', body: { pan: form.pan } })
        applyUser(data.user)
        setStep(2)
      } else if (step === 2) {
        const data = await api('/kyc/verify-aadhaar', {
          method: 'POST',
          body: { aadhaar: digitsOf(form.aadhaar), otp: digitsOf(form.otp) },
        })
        applyUser(data.user)
        setStep(3)
      } else if (step === 3) {
        const data = await api('/kyc/link-bank', {
          method: 'POST',
          body: { account: digitsOf(form.account), ifsc: form.ifsc, bankName: form.bankName.trim() },
        })
        applyUser(data.user)
        setStep(4)
      } else {
        const data = await api('/kyc/complete', { method: 'POST', body: { accepted: form.accepted } })
        dispatch(setUser(data.user))
        dispatch(showToast({
          type: 'success',
          title: 'KYC approved',
          message: '₹1,00,000 demo capital credited. Happy investing!',
        }))
        navigate('/app')
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const active = STEPS[step]
  const ActiveIcon = active.icon
  const progress = ((step + (stepReady ? 0.5 : 0)) / STEPS.length) * 100

  return (
    <Screen theme="kyc" className="screen px-lg page-pad">
      <div className="page grid gap-lg">
        {/* Trust rail */}
        <aside className="kyc-rail hidden p-xl">
          <BrandLockup size="sm" tone="light" />

          <h2 className="mt-xl text-xl extrabold">
            Activate your investing account
          </h2>
          <p className="mt-1.5 text-sm">
            Five quick steps. Takes about two minutes.
          </p>

          <div className="mt-xl">
            {STEPS.map((item, index) => {
              const done = index < step
              const isActive = index === step
              return (
                <div
                  key={item.id}
                  className={`kyc-step ${done ? 'is-done' : ''} ${isActive ? 'is-active' : ''}`}
                >
                  <div className="kyc-step-marker">
                    <span className="kyc-step-dot">
                      {done ? <IconCheckCircle size={16} /> : <item.icon size={15} />}
                    </span>
                    {index < STEPS.length - 1 && <span className="kyc-step-line" />}
                  </div>
                  <div className={`${done || isActive ? '' : 'opacity-55'}`}>
                    <div className="text-sm bold">{item.label}</div>
                    <div className="text-xs">
                      {done ? verifiedHint(item.id, verified) || 'Verified' : item.hint}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          <div className="mt-sm rounded border p-1.5">
            <div className="row gap-sm text-xs bold text-[#7dffc8]">
              <IconLock size={14} />
              Your data stays on this device
            </div>
            <p className="mt-1.5 text-[11px] leading-relaxed">
              Arth is a simulated brokerage built for learning. No documents are sent to any
              regulator and no real money is involved.
            </p>
          </div>
        </aside>

        {/* Form column */}
        <div className="stack gap-md">
          <div className="row-between gap-md lg:hidden">
            <BrandLockup size="sm" />
            <button type="button" className="btn btn-ghost text-xs" onClick={() => navigate('/app')}>
              Skip for now
            </button>
          </div>

          <div className="card p-xl">
            <div className="mb-lg">
              <div className="mb-sm row-between gap-md">
                <span className="text-[11px] bold tracking-[0.12em] muted uppercase">
                  Step {step + 1} of {STEPS.length}
                </span>
                <span className="hidden text-xs bold text-page-accent">
                  {Math.round(progress)}% complete
                </span>
                <button
                  type="button"
                  className="text-xs bold muted lg:hidden"
                  onClick={() => navigate('/app')}
                >
                  Skip
                </button>
              </div>
              <div className="kyc-progress">
                <span style={{ width: `${Math.max(6, progress)}%` }} />
              </div>
            </div>

            <div className="row-start gap-md">
              <span className="icon-chip icon-chip-lg">
                <ActiveIcon size={21} />
              </span>
              <div className="min-w-0">
                <h1 className="text-lg extrabold">{active.title}</h1>
                <p className="mt-sm text-sm muted">{active.subtitle}</p>
              </div>
            </div>

            <div className="mt-5 stack gap-md">
              {step === 0 && (
                <>
                  <Field
                    label="Full name (as on PAN)"
                    value={form.name}
                    onChange={(v) => update({ name: v })}
                    placeholder="Yash Suryawanshi"
                    valid={validity.name}
                    invalid={form.name.length > 0 && !validity.name}
                    hint="Must match your PAN card exactly."
                    autoFocus
                  />
                  <Field
                    label="Mobile number"
                    value={form.phone}
                    onChange={(v) => update({ phone: digitsOf(v).slice(0, 10) })}
                    placeholder="9876543210"
                    prefix="+91"
                    inputMode="numeric"
                    valid={validity.phone}
                    invalid={form.phone.length > 0 && !validity.phone}
                    hint="Used for order alerts and Aadhaar OTP."
                  />
                </>
              )}

              {step === 1 && (
                <>
                  <Field
                    label="PAN number"
                    value={form.pan}
                    onChange={(v) => update({ pan: v.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10) })}
                    placeholder="ABCDE1234F"
                    maxLength={10}
                    mono
                    valid={validity.pan}
                    invalid={form.pan.length > 0 && !validity.pan}
                    hint="Ten characters — five letters, four digits, one letter."
                    autoFocus
                  />
                  <InfoNote>
                    Your PAN is checked against the income tax database and linked to your demat account.
                  </InfoNote>
                </>
              )}

              {step === 2 && (
                <>
                  <Field
                    label="Aadhaar number"
                    value={groupAadhaar(form.aadhaar)}
                    onChange={(v) => update({ aadhaar: digitsOf(v).slice(0, 12) })}
                    placeholder="1234 5678 9012"
                    inputMode="numeric"
                    mono
                    valid={validity.aadhaar}
                    invalid={form.aadhaar.length > 0 && !validity.aadhaar}
                    autoFocus
                  />

                  <div>
                    <div className="mb-sm row flex-wrap gap-sm">
                      <span className="label mb-0">One-time password</span>
                      <button
                        type="button"
                        className="rounded bg-page-tint py-md text-[11px] bold text-page-accent"
                        onClick={() => update({ otp: '123456' })}
                      >
                        Use demo OTP
                      </button>
                    </div>
                    <OtpInput value={form.otp} onChange={(v) => update({ otp: v })} />
                    <p className="mt-sm text-xs muted">
                      Sent to the mobile linked with your Aadhaar. Demo OTP is <strong>123456</strong>.
                    </p>
                  </div>
                </>
              )}

              {step === 3 && (
                <>
                  <Field
                    label="Account number"
                    value={form.account}
                    onChange={(v) => update({ account: digitsOf(v).slice(0, 18) })}
                    placeholder="50100123456789"
                    inputMode="numeric"
                    mono
                    valid={validity.account}
                    invalid={form.account.length > 0 && !validity.account}
                    autoFocus
                  />
                  <Field
                    label="IFSC code"
                    value={form.ifsc}
                    onChange={(v) => update({ ifsc: v.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 11) })}
                    placeholder="HDFC0001234"
                    maxLength={11}
                    mono
                    valid={validity.ifsc}
                    invalid={form.ifsc.length > 0 && !validity.ifsc}
                    hint="Eleven characters, with a zero in the fifth position."
                  />
                  <Field
                    label="Bank name"
                    value={form.bankName}
                    onChange={(v) => update({ bankName: v })}
                    placeholder="HDFC Bank"
                    valid={validity.bankName}
                    invalid={form.bankName.length > 0 && !validity.bankName}
                  />
                  <InfoNote>
                    Withdrawals are only ever paid into this account, so it must be in your own name.
                  </InfoNote>
                </>
              )}

              {step === 4 && (
                <>
                  <div className="rounded border /60 p-lg center">
                    <KycShieldArt accent="#00a878" className="page" width={158} height={118} />
                    <p className="mt-sm text-sm extrabold">You are one tap away</p>
                    <p className="mt-sm text-xs muted">
                      Activating unlocks the full trading terminal on live NSE prices.
                    </p>
                  </div>

                  <div className="grid gap-sm">
                    <Perk icon={IconSparkles} title="₹1,00,000" body="Demo capital credited instantly" />
                    <Perk icon={IconShield} title="Live prices" body="Real NSE quotes via Yahoo" />
                    <Perk icon={IconDocument} title="Full reports" body="Tradebook, P&L and statements" />
                  </div>

                  <label
                    className={`row pointer gap-md rounded border p-1.5 text-sm ${ form.accepted ? 'border-accent bg-page-tint' : 'border-line hover:border-accent' }`}
                  >
                    <input
                      type="checkbox"
                      checked={form.accepted}
                      onChange={(e) => update({ accepted: e.target.checked })}
                      className="mt-sm accent-[#00a878]"
                    />
                    <span className="leading-relaxed">
                      I understand equity investing carries market risk and that Arth is a{' '}
                      <strong>simulated demo platform</strong> — no real money or securities are involved.
                    </span>
                  </label>
                </>
              )}

              {error && (
                <p className="row-start gap-sm rounded px-lg py-md text-sm bold down">
                  <IconXCircle size={16} className="mt-sm shrink-0" />
                  {error}
                </p>
              )}

              <div className="row gap-sm">
                {step > 0 && (
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => {
                      setError('')
                      setStep((s) => Math.max(0, s - 1))
                    }}
                    disabled={busy}
                  >
                    <IconArrowLeft size={17} />
                    Back
                  </button>
                )}
                <button
                  type="button"
                  className="btn btn-primary grow py-md"
                  onClick={submit}
                  disabled={!stepReady || busy}
                >
                  {busy ? 'Verifying…' : step === 4 ? 'Activate account' : 'Continue'}
                  {!busy && (step === 4 ? <IconCheckCircle size={17} /> : <IconArrowRight size={17} />)}
                </button>
              </div>
            </div>
          </div>

          <p className="row-center gap-sm center text-[11px] muted">
            <IconLock size={12} />
            Simulated verification · nothing you enter leaves this device
          </p>
        </div>
      </div>
    </Screen>
  )
}

function verifiedHint(id, verified) {
  if (!verified) return null
  if (id === 'pan') return verified.pan
  if (id === 'aadhaar') return verified.aadhaar
  if (id === 'bank') return verified.bankAccount ? `${verified.bankName || 'Bank'} · ${verified.bankAccount}` : null
  return null
}

function groupAadhaar(value) {
  return String(value || '').replace(/(.{4})/g, '$1 ').trim()
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  hint,
  prefix,
  valid,
  invalid,
  mono,
  ...rest
}) {
  return (
    <div>
      <label className="label">{label}</label>
      <div className="relative">
        {prefix && (
          <span className="absolute top-1/2 left-3 -translate-y-1/2 text-sm font-bold text-muted">
            {prefix}
          </span>
        )}
        <input
          className={`field ${mono ? 'font-mono tracking-wide' : ''} ${valid ? 'field-ok' : ''} ${
            invalid ? 'field-bad' : ''
          }`}
          style={{
            paddingLeft: prefix ? '3rem' : undefined,
            paddingRight: valid ? '2.6rem' : undefined,
          }}
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          {...rest}
        />
        {valid && (
          <span className="absolute top-1/2 right-3 -translate-y-1/2 text-up">
            <IconCheckCircle size={18} />
          </span>
        )}
      </div>
      {hint && <p className="mt-1.5 text-xs muted">{hint}</p>}
    </div>
  )
}

/** Six boxed digits driven by one transparent input, so focus never fights us. */
function OtpInput({ value, onChange, length = 6 }) {
  const [focused, setFocused] = useState(false)
  return (
    <div className="relative">
      <input
        className="absolute h-full w-full cursor-text"
        value={value}
        inputMode="numeric"
        autoComplete="one-time-code"
        maxLength={length}
        aria-label="One-time password"
        onChange={(e) => onChange(digitsOf(e.target.value).slice(0, length))}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
      />
      <div className="grid grid-cols-6 gap-sm">
        {Array.from({ length }).map((_, index) => {
          const caret = focused && (index === value.length || (index === length - 1 && value.length === length))
          return (
            <div
              key={index}
              className={`otp-box ${value[index] ? 'is-filled' : ''} ${caret ? 'is-active' : ''}`}
            >
              {value[index] || ''}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function InfoNote({ children }) {
  return (
    <p className="row-start gap-sm rounded px-lg py-md text-xs leading-relaxed muted">
      <IconShield size={14} className="mt-sm shrink-0 text-page-accent" />
      {children}
    </p>
  )
}

function Perk({ icon: Icon, title, body }) {
  return (
    <div className="rounded border px-lg py-md">
      <span className="icon-chip icon-chip-sm">
        <Icon size={14} />
      </span>
      <div className="mt-1.5 text-sm extrabold">{title}</div>
      <div className="text-[11px] leading-snug muted">{body}</div>
    </div>
  )
}
