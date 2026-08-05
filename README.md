# Arth — Paper Broking Platform

Groww / Zerodha–inspired **paper brokerage** web app in JavaScript.

## Features

- Landing, register, login, forgot/reset password (JWT)
- Multi-step KYC (PAN, Aadhaar OTP, bank, disclosure)
- Live NSE prices from Yahoo Finance streamed over SSE (simulated fallback)
- Explore universe, stock terminal with chart, fundamentals & order book
- Buy/sell market & limit orders, holdings, order blotter
- Wallet add/withdraw (Razorpay mock) + ledger
- Mutual funds (lumpsum + SIP), IPO applications
- Account, notifications, FAQ

## Stack

- **Client:** React 19, Redux Toolkit, React Router, Vite, Tailwind CSS v4, lightweight-charts
- **Server:** Express, better-sqlite3, JWT, bcrypt
- Payments are **simulated**; market data is live but delayed

## Quick start

```bash
npm run install:all
npm run seed --prefix server
npm run dev
```

- App: http://127.0.0.1:5173  
- API: http://127.0.0.1:4000  

### Demo login

```
email: demo@arth.app
password: Demo@1234
```

KYC OTP (for new accounts): `123456`

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | API + Vite together |
| `npm run seed --prefix server` | Create demo user |
| `npm run build` | Production client build |

## Project layout

```
client/   React SPA
server/   Express API + SQLite (server/data/arth.db)
```

## Interview talking points

1. Full auth + protected routes + KYC gates before trading  
2. SSE live market feed + virtualized explore list  
3. Transactional order/funds flows with SQLite  
4. Product-complete broker UX (stocks, MF, IPO, wallet)
